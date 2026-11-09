import { db } from '@vid2eu/db/client';
import { user, video, videoAsset, uploadSession, processingJob } from '@vid2eu/db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { first } from '../../helpers/db.ts';

const getUserById = async (userId: string) => {
    return first(await db.select().from(user).where(eq(user.id, userId)));
};

const updatePassword = async (userId: string, password: string) => {
    return await db.update(user)
        .set({ password, defaultPassword: false, updated_at: new Date().toISOString() })
        .where(eq(user.id, userId));
};

const getVideosByUserId = async (userId: string) => {
    return await db.select().from(video).where(eq(video.userId, userId)).orderBy(desc(video.createdAt));
};

const getAssets = async (videoIds: string[]) => {
    if (videoIds.length === 0) return [];
    return await db.select({
        videoId: videoAsset.videoId,
        type: videoAsset.type,
        size: videoAsset.size,
    }).from(videoAsset).where(inArray(videoAsset.videoId, videoIds));
};

const getUploadSessions = async (videoIds: string[]) => {
    if (videoIds.length === 0) return [];
    return await db.select({
        videoId: uploadSession.videoId,
        status: uploadSession.status,
        expectedSize: uploadSession.expectedSize,
        receivedSize: uploadSession.receivedSize,
        updatedAt: uploadSession.updatedAt,
    }).from(uploadSession)
        .where(inArray(uploadSession.videoId, videoIds))
        .orderBy(desc(uploadSession.createdAt));
};

const getProcessingJobs = async (videoIds: string[]) => {
    if (videoIds.length === 0) return [];
    return await db.select({
        videoId: processingJob.videoId,
        status: processingJob.status,
        progress: processingJob.progress,
        stage: processingJob.stage,
        attempts: processingJob.attempts,
        maxAttempts: processingJob.maxAttempts,
        lastError: processingJob.lastError,
    }).from(processingJob)
        .where(inArray(processingJob.videoId, videoIds))
        .orderBy(desc(processingJob.createdAt));
};

export default {
    getUserById,
    updatePassword,
    getVideosByUserId,
    getAssets,
    getUploadSessions,
    getProcessingJobs
};
