import { z } from 'zod';

export const videoMetadataSchema = z.object({
    fileName: z.string().min(1).max(255),
    fileSize: z.number().int().min(1),
    mimeType: z.string().regex(/^video\//, 'Only video files can be uploaded')
});

export const startUploadResponse = z.object({
    videoId: z.string(),
    slug: z.string(),
    title: z.string(),
    uploadToken: z.string()
});

export const videoIdParams = z.object({
    videoId: z.uuid()
});

export const slugParams = z.object({
    slug: z.string().min(1).max(64)
});

export const videoPatchRequest = z.object({
    title: z.string().trim().min(1).max(200)
});

export const videoPatchResponse = z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string()
});
