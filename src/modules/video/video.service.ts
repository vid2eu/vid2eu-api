import { videoMetadataSchema } from './video.schema.ts';
import { z } from 'zod';
import repository from './video.repository.ts';
import { generateSlug } from '../../helpers/slug.ts';
import { HttpError } from '../../helpers/errors.ts';
import { BYTES_PER_GB, getUserStorageUsage } from '../../helpers/usage.ts';

const titleFromFileName = (fileName: string) =>
    fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 200) || 'Untitled video';

const startSession = async (token: string, userId: string, metadata: z.infer<typeof videoMetadataSchema>) => {
    const existingUser = await repository.getUserById(userId);
    if (!existingUser) {
        throw new HttpError(404, 'User not found');
    }

    const maxUploadGb = Number(process.env.MAX_UPLOAD_SIZE_GB) || 10;
    if (metadata.fileSize > maxUploadGb * BYTES_PER_GB) {
        throw new HttpError(413, `Videos can be at most ${maxUploadGb} GB`);
    }

    const used = await getUserStorageUsage(userId);
    if (used + metadata.fileSize > Number(existingUser.limit) * BYTES_PER_GB) {
        throw new HttpError(413, 'This upload would go over your storage limit');
    }

    const title = titleFromFileName(metadata.fileName);

    let video;
    for (let attempt = 0; attempt < 5 && !video; attempt++) {
        video = await repository.saveVideo(existingUser.id, title, generateSlug());
    }
    if (!video) {
        throw new HttpError(500, 'Could not allocate a video link');
    }

    const res = await fetch(`${process.env.STORAGE_API}/upload/${video.id}/prepare`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expectedSize: metadata.fileSize }),
        signal: AbortSignal.timeout(10_000)
    }).catch(() => null);

    if (!res?.ok) {
        await repository.deleteVideo(video.id).catch(() => { });
        throw new HttpError(502, 'Storage is unavailable, try again shortly');
    }

    const { token: uploadToken } = await res.json() as { token: string };

    return {
        videoId: video.id,
        slug: video.slug,
        title: video.title,
        uploadToken
    };
}

const getPublicVideo = async (slug: string) => {
    const video = await repository.getVideoBySlug(slug);
    if (!video) {
        return null;
    }

    const assets = await repository.getVideoAssets(video.id);
    const qualities = assets.filter(a => a.type !== 'thumbnail').map(a => a.type);

    return {
        id: video.id,
        slug: video.slug,
        title: video.title,
        views: video.views,
        length: video.length,
        width: video.width,
        height: video.height,
        status: video.status,
        createdAt: video.createdAt.toISOString(),
        ready: video.status === 'ready' || qualities.includes('720p'),
        qualities,
        hasThumbnail: assets.some(a => a.type === 'thumbnail'),
    };
}

const updateVideoTitle = async (userId: string, videoId: string, title: string) => {
    const video = await repository.updateVideoTitle(userId, videoId, title);
    if (!video) {
        throw new HttpError(404, 'Video not found');
    }

    return video;
}

const recordView = async (slug: string) => {
    const result = await repository.incrementViews(slug);
    if (!result) {
        throw new HttpError(404, 'Video not found');
    }

    return result;
}

export default {
    startSession,
    getPublicVideo,
    updateVideoTitle,
    recordView
};
