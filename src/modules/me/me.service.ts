import repository from './me.repository.ts';
import authRepository from '../auth/auth.repository.ts';
import { toSessionUser } from '../auth/auth.service.ts';
import { HttpError } from '../../helpers/errors.ts';
import { hashPassword, hashRefreshToken, verifyPassword } from '../../helpers/security.ts';
import { BYTES_PER_GB, getUserStorageUsage } from '../../helpers/usage.ts';
import type { MeVideo } from './me.schema.ts';

const UPLOAD_STALLED_MS = 60_000;

const requireUser = async (userId: string) => {
    const user = await repository.getUserById(userId);

    if (!user) {
        throw new HttpError(404, 'User not found');
    }

    return user;
};

const getProfile = async (userId: string) => {
    const user = await requireUser(userId);
    const used = await getUserStorageUsage(userId);

    return {
        ...toSessionUser(user),
        limit: user.limit,
        used: used / BYTES_PER_GB,
    };
};

const changePassword = async (userId: string, currentPassword: string, newPassword: string, currentRefreshToken?: string) => {
    const user = await requireUser(userId);

    if (!await verifyPassword(currentPassword, user.password)) {
        throw new HttpError(400, 'Current password is incorrect');
    }

    if (currentPassword === newPassword) {
        throw new HttpError(400, 'Choose a password different from the current one');
    }

    await repository.updatePassword(userId, await hashPassword(newPassword));

    const keep = currentRefreshToken ? await hashRefreshToken(currentRefreshToken) : undefined;
    await authRepository.revokeUserRefreshTokens(userId, keep);
};

const firstBy = <T extends { videoId: string }>(rows: T[]) => {
    const map = new Map<string, T>();
    for (const row of rows) {
        if (!map.has(row.videoId)) map.set(row.videoId, row);
    }
    return map;
};

const getVideosByUserId = async (userId: string): Promise<MeVideo[]> => {
    await requireUser(userId);

    const videos = await repository.getVideosByUserId(userId);
    const ids = videos.map(v => v.id);

    const [assets, sessions, jobs] = await Promise.all([
        repository.getAssets(ids),
        repository.getUploadSessions(ids),
        repository.getProcessingJobs(ids),
    ]);

    const sessionByVideo = firstBy(sessions);
    const jobByVideo = firstBy(jobs);

    return videos.map((video) => {
        const own = assets.filter(a => a.videoId === video.id);
        const qualities = own.filter(a => a.type !== 'thumbnail').map(a => a.type);
        const session = sessionByVideo.get(video.id);
        const job = jobByVideo.get(video.id);

        let status: MeVideo['status'];
        if (video.status === 'ready' || qualities.includes('720p')) status = 'ready';
        else if (video.status === 'failed' || job?.status === 'failed') status = 'failed';
        else if (job) status = 'processing';
        else if (!session || session.status !== 'completed') status = 'uploading';
        else status = 'processing';

        return {
            id: video.id,
            slug: video.slug,
            title: video.title,
            views: video.views,
            length: video.length,
            width: video.width,
            height: video.height,
            createdAt: video.createdAt.toISOString(),
            status,
            qualities,
            hasThumbnail: own.some(a => a.type === 'thumbnail'),
            size: own.reduce((sum, a) => sum + (a.size ?? 0), 0),
            upload: status === 'uploading' && session ? {
                receivedBytes: session.receivedSize,
                totalBytes: session.expectedSize,
                stalled: Date.now() - session.updatedAt.getTime() > UPLOAD_STALLED_MS,
            } : null,
            transcode: job ? {
                state: job.status === 'pending' ? 'queued' : job.status,
                progress: job.status === 'completed' ? 100 : job.progress,
                stage: job.stage,
                attempt: job.attempts,
                maxAttempts: job.maxAttempts,
                error: job.status === 'failed' ? job.lastError : null,
            } : null,
        };
    });
};

export default {
    getProfile,
    changePassword,
    getVideosByUserId
};
