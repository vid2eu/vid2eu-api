import { z } from 'zod';

export const getMeResponse = z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    isAdmin: z.boolean(),
    defaultPassword: z.boolean(),
    limit: z.number(),
    used: z.number(),
});

export const changePasswordRequest = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'Use at least 8 characters').max(256),
});

export const meVideo = z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    views: z.number(),
    length: z.number(),
    width: z.number().nullable(),
    height: z.number().nullable(),
    createdAt: z.string(),
    status: z.enum(['uploading', 'processing', 'ready', 'failed']),
    qualities: z.array(z.enum(['480p', '720p', 'thumbnail'])),
    hasThumbnail: z.boolean(),
    size: z.number(),
    upload: z.object({
        receivedBytes: z.number(),
        totalBytes: z.number(),
        stalled: z.boolean(),
    }).nullable(),
    transcode: z.object({
        state: z.enum(['queued', 'processing', 'completed', 'failed']),
        progress: z.number(),
        stage: z.string().nullable(),
        attempt: z.number(),
        maxAttempts: z.number(),
        error: z.string().nullable(),
    }).nullable(),
});

export type MeVideo = z.infer<typeof meVideo>;

export const getMeVideosResponse = z.array(meVideo);
