import repository from './users.repository.ts';
import authRepository from '../auth/auth.repository.ts';
import type { AdminUser } from './users.schema.ts';
import { generateRandomPassword, hashPassword } from '../../helpers/security.ts';
import { BYTES_PER_GB, getStorageUsage } from '../../helpers/usage.ts';
import { HttpError } from '../../helpers/errors.ts';
import { deleteStoredVideos } from '../../helpers/storage.ts';

type UserRow = NonNullable<Awaited<ReturnType<typeof repository.getUserById>>>;

const withUsage = async (users: UserRow[]): Promise<AdminUser[]> => {
    const ids = users.map(u => u.id);
    const [usage, videos] = await Promise.all([getStorageUsage(ids), repository.countVideos(ids)]);

    return users.map(u => ({
        ...u,
        used: (usage.get(u.id) ?? 0) / BYTES_PER_GB,
        videos: videos.get(u.id) ?? 0,
    }));
};

const requireUser = async (id: string) => {
    const user = await repository.getUserById(id);
    if (!user) {
        throw new HttpError(404, 'User not found');
    }
    return user;
};

const getUsers = async (page: number, limit: number, search?: string) => {
    const offset = (page - 1) * limit;
    const [users, total] = await Promise.all([
        repository.getUsers(limit, offset, search),
        repository.countUsers(search),
    ]);

    return { users: await withUsage(users), total, page, limit };
};

const createUser = async (name: string, username: string, limit: number, isAdmin = false) => {
    if (await repository.usernameTaken(username)) {
        throw new HttpError(409, 'That username is already taken');
    }

    const password = generateRandomPassword();
    const user = await repository.createUser(name, username, limit, await hashPassword(password), isAdmin);

    if (!user) {
        throw new HttpError(500, 'Could not create user');
    }

    const [withStats] = await withUsage([user]);
    return { user: withStats!, password };
};

const updateUser = async (actorId: string, id: string, values: { name?: string; username?: string; limit?: number; isAdmin?: boolean }) => {
    await requireUser(id);

    if (id === actorId && values.isAdmin === false) {
        throw new HttpError(400, 'You cannot remove your own admin access');
    }

    if (values.username && await repository.usernameTaken(values.username, id)) {
        throw new HttpError(409, 'That username is already taken');
    }

    const user = await repository.updateUser(id, values);
    if (!user) {
        throw new HttpError(404, 'User not found');
    }

    // admin rights are baked into access tokens, so make the user sign in again
    if (values.isAdmin !== undefined) {
        await authRepository.revokeUserRefreshTokens(id);
    }

    const [withStats] = await withUsage([user]);
    return withStats!;
};

const resetPassword = async (id: string) => {
    await requireUser(id);

    const password = generateRandomPassword();
    const user = await repository.setPassword(id, await hashPassword(password));
    await authRepository.revokeUserRefreshTokens(id);

    const [withStats] = await withUsage([user!]);
    return { user: withStats!, password };
};

/** Deletes the account and every video it owns, files included. */
const deleteUser = async (actorId: string, actorToken: string, id: string) => {
    if (id === actorId) {
        throw new HttpError(400, 'You cannot delete your own account');
    }

    await requireUser(id);

    // sign them out first so no new uploads start while their videos are removed
    await authRepository.revokeUserRefreshTokens(id);

    let deletedVideos = 0;
    let failedFiles = 0;

    // an upload that was already starting can still add a video; sweep until none are left
    for (let pass = 0; pass < 3; pass++) {
        const videoIds = await repository.getVideoIds(id);
        if (videoIds.length === 0) break;

        const result = await deleteStoredVideos(actorToken, videoIds);
        deletedVideos += result.deleted;
        failedFiles += result.failedFiles;
    }

    if ((await repository.getVideoIds(id)).length > 0) {
        throw new HttpError(409, 'New videos keep appearing for this user; try again');
    }

    await repository.deleteUser(id);

    return { deletedVideos, failedFiles };
};

export default {
    getUsers,
    createUser,
    updateUser,
    resetPassword,
    deleteUser
};
