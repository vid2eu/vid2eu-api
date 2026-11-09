import { db } from '@vid2eu/db/client';
import { first } from '../../helpers/db.ts';
import { video, videoAsset, user } from '@vid2eu/db/schema';
import { and, eq, sql } from 'drizzle-orm';

const saveVideo = async (userId: string, title: string, slug: string) => {
    const result = await db.insert(video)
        .values({ userId: userId, title: title, slug: slug, status: 'uploading' })
        .onConflictDoNothing({ target: video.slug })
        .returning();
    return first(result);
}

const deleteVideo = async (videoId: string) => {
    return await db.delete(video).where(eq(video.id, videoId));
}

const getUserById = async (userId: string) => {
    const result = await db.select().from(user).where(eq(user.id, userId));
    return first(result);
}

const getVideoBySlug = async (slug: string) => {
    const result = await db.select().from(video).where(eq(video.slug, slug));
    return first(result);
}

const getVideoAssets = async (videoId: string) => {
    return await db.select().from(videoAsset).where(eq(videoAsset.videoId, videoId));
}

const updateVideoTitle = async (userId: string, videoId: string, title: string) => {
    const result = await db.update(video)
        .set({ title: title })
        .where(and(eq(video.id, videoId), eq(video.userId, userId)))
        .returning({ id: video.id, slug: video.slug, title: video.title });
    return first(result);
}

const incrementViews = async (slug: string) => {
    const result = await db.update(video)
        .set({ views: sql`${video.views} + 1` })
        .where(and(eq(video.slug, slug), eq(video.status, 'ready')))
        .returning({ views: video.views });
    return first(result);
}

export default {
    saveVideo,
    deleteVideo,
    getUserById,
    getVideoBySlug,
    getVideoAssets,
    updateVideoTitle,
    incrementViews
};
