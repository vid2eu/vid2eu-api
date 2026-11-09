import { inArray, sql } from 'drizzle-orm';
import { db } from '@vid2eu/db/client';
import { video, videoAsset, storedVideo } from '@vid2eu/db/schema';

export const BYTES_PER_GB = 1024 ** 3;

export const getStorageUsage = async (userIds: string[]) => {
    const usage = new Map<string, number>();
    if (userIds.length === 0) return usage;

    const rows = await db
        .select({
            userId: video.userId,
            bytes: sql<string>`
                coalesce((select sum(${videoAsset.size}) from ${videoAsset} where ${videoAsset.videoId} = ${video.id}), 0)
                + coalesce((select sum(${storedVideo.size}) from ${storedVideo} where ${storedVideo.videoId} = ${video.id}), 0)
            `.as('bytes'),
        })
        .from(video)
        .where(inArray(video.userId, userIds));

    for (const row of rows) {
        if (!row.userId) continue;
        usage.set(row.userId, (usage.get(row.userId) ?? 0) + Number(row.bytes));
    }

    return usage;
};

export const getUserStorageUsage = async (userId: string) =>
    (await getStorageUsage([userId])).get(userId) ?? 0;
