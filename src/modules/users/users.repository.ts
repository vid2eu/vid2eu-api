import { db } from '@vid2eu/db/client';
import { user, video, refreshToken } from '@vid2eu/db/schema';
import { and, asc, count, eq, ilike, inArray, ne, or } from 'drizzle-orm';
import { first } from '../../helpers/db.ts';

const publicColumns = {
    id: user.id,
    name: user.name,
    username: user.username,
    limit: user.limit,
    isAdmin: user.isAdmin,
    defaultPassword: user.defaultPassword,
    created_at: user.created_at,
    updated_at: user.updated_at
};

const searchFilter = (search?: string) => {
    if (!search) return undefined;
    const pattern = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    return or(ilike(user.name, pattern), ilike(user.username, pattern));
};

const getUsers = async (limit: number, offset: number, search?: string) => {
    return await db.select(publicColumns).from(user)
        .where(searchFilter(search))
        .orderBy(asc(user.username))
        .limit(limit)
        .offset(offset);
};

const countUsers = async (search?: string) => {
    const row = first(await db.select({ total: count() }).from(user).where(searchFilter(search)));
    return row?.total ?? 0;
};

const getUserById = async (id: string) => {
    return first(await db.select(publicColumns).from(user).where(eq(user.id, id)));
};

const usernameTaken = async (username: string, exceptId?: string) => {
    const row = first(await db.select({ id: user.id }).from(user)
        .where(and(eq(user.username, username), exceptId ? ne(user.id, exceptId) : undefined)));
    return !!row;
};

const createUser = async (name: string, username: string, limit: number, password: string, isAdmin: boolean) => {
    return first(await db.insert(user).values({
        name,
        username,
        password,
        limit,
        isAdmin
    }).returning(publicColumns));
};

const updateUser = async (id: string, values: Partial<{ name: string; username: string; limit: number; isAdmin: boolean }>) => {
    return first(await db.update(user)
        .set({ ...values, updated_at: new Date().toISOString() })
        .where(eq(user.id, id))
        .returning(publicColumns));
};

const setPassword = async (id: string, password: string) => {
    return first(await db.update(user)
        .set({ password, defaultPassword: true, updated_at: new Date().toISOString() })
        .where(eq(user.id, id))
        .returning(publicColumns));
};

const countVideos = async (userIds: string[]) => {
    const counts = new Map<string, number>();
    if (userIds.length === 0) return counts;

    const rows = await db.select({ userId: video.userId, total: count() })
        .from(video)
        .where(inArray(video.userId, userIds))
        .groupBy(video.userId);

    for (const row of rows) {
        if (row.userId) counts.set(row.userId, row.total);
    }
    return counts;
};

const getVideoIds = async (userId: string) => {
    const rows = await db.select({ id: video.id }).from(video).where(eq(video.userId, userId));
    return rows.map(row => row.id);
};

const deleteUser = async (id: string) => {
    return await db.transaction(async (tx) => {
        await tx.delete(refreshToken).where(eq(refreshToken.user_id, id));
        return first(await tx.delete(user).where(eq(user.id, id)).returning({ id: user.id }));
    });
};

export default {
    getUsers,
    countUsers,
    getUserById,
    usernameTaken,
    createUser,
    updateUser,
    setPassword,
    countVideos,
    getVideoIds,
    deleteUser
};
