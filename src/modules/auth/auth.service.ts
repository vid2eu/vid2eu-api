import { hashRefreshToken, verifyPasswordOrDummy } from '../../helpers/security.ts';
import repository from './auth.repository.ts';
import { ACCESS_TOKEN_TTL_SECONDS, generateTokens } from '../../helpers/token.ts';
import { HttpError } from '../../helpers/errors.ts';
import type { user as userTable } from '@vid2eu/db/schema';

type User = typeof userTable.$inferSelect;

export const toSessionUser = (user: User) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    isAdmin: user.isAdmin,
    defaultPassword: user.defaultPassword,
});

const issueTokens = async (user: User, ip: string, userAgent: string) => {
    const tokens = await generateTokens(user.id, user.isAdmin);
    await repository.saveRefreshToken(tokens.hashedRefreshToken, user.id, ip, userAgent);

    return {
        accessToken: tokens.token,
        refreshToken: tokens.refreshToken,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS
    };
};

const loginUser = async (username: string, password: string, ip: string, userAgent: string) => {
    const user = await repository.getUserByUsername(username);

    if (!await verifyPasswordOrDummy(password, user?.password) || !user) {
        throw new HttpError(401, 'Invalid username or password');
    }

    await repository.deleteStaleRefreshTokens(user.id);

    return {
        tokens: await issueTokens(user, ip, userAgent),
        user: toSessionUser(user)
    };
}

const refreshToken = async (refreshToken: string, ip: string, userAgent: string) => {
    const hashedRefreshToken = await hashRefreshToken(refreshToken);

    const storedToken = await repository.consumeRefreshToken(hashedRefreshToken);
    if (!storedToken) {
        throw new HttpError(401, 'Invalid or expired refresh token');
    }

    const user = await repository.getUserById(storedToken.user_id);
    if (!user) {
        throw new HttpError(401, 'Invalid or expired refresh token');
    }

    return {
        tokens: await issueTokens(user, ip, userAgent),
        user: toSessionUser(user)
    };
};

const logout = async (refreshToken: string) => {
    await repository.revokeRefreshToken(await hashRefreshToken(refreshToken));
};

export default {
    loginUser,
    refreshToken,
    logout
};
