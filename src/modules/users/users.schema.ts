import { z } from 'zod';

// query strings arrive as text, so numbers have to be coerced
export const usersRequest = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
});

export const userIdParams = z.object({
    id: z.uuid(),
});

const username = z.string().trim().toLowerCase()
    .min(2).max(32)
    .regex(/^[a-z0-9._-]+$/, 'Use letters, numbers, dots, dashes or underscores');

// storage limit in GB
const storageLimit = z.number().min(0).max(99_999_999);

export const usersCreateRequest = z.object({
    name: z.string().trim().min(1).max(100),
    username,
    limit: storageLimit,
    isAdmin: z.boolean().optional(),
});

export const usersPatchRequest = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    username: username.optional(),
    limit: storageLimit.optional(),
    isAdmin: z.boolean().optional(),
});

export const adminUser = z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    limit: z.number(),
    used: z.number(),
    videos: z.number(),
    isAdmin: z.boolean(),
    defaultPassword: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
});

export type AdminUser = z.infer<typeof adminUser>;

export const usersResponse = z.object({
    users: z.array(adminUser),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
});

export const deleteUserResponse = z.object({
    deletedVideos: z.number(),
    // files storage couldn't remove; the videos are gone either way
    failedFiles: z.number(),
});

export const userWithPasswordResponse = z.object({
    user: adminUser,
    password: z.string(),
});
