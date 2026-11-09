import { db } from '@vid2eu/db/client';
import { user, refreshToken } from '@vid2eu/db/schema';
import { and, eq, gt, isNull, lt, ne, or } from 'drizzle-orm';
import { first } from '../../helpers/db.ts';
import { REFRESH_TOKEN_TTL_MS } from '../../helpers/token.ts';

const getUserById = async (id: string) => {
    return first(await db.select().from(user).where(eq(user.id, id)));
};

const getUserByUsername = async (username: string) => {
    return first(await db.select().from(user).where(eq(user.username, username)).limit(1));
};

const consumeRefreshToken = async (token: string) => {
    return first(await db.update(refreshToken)
        .set({ revoked_at: new Date(), updated_at: new Date() })
        .where(and(
            eq(refreshToken.token, token),
            isNull(refreshToken.revoked_at),
            gt(refreshToken.expires_at, new Date())
        ))
        .returning());
};

const revokeRefreshToken = async (token: string) => {
    return await db.update(refreshToken)
        .set({ revoked_at: new Date(), updated_at: new Date() })
        .where(and(eq(refreshToken.token, token), isNull(refreshToken.revoked_at)));
};

const revokeUserRefreshTokens = async (userId: string, exceptToken?: string) => {
    return await db.update(refreshToken)
        .set({ revoked_at: new Date(), updated_at: new Date() })
        .where(and(
            eq(refreshToken.user_id, userId),
            isNull(refreshToken.revoked_at),
            exceptToken ? ne(refreshToken.token, exceptToken) : undefined
        ));
};

const deleteStaleRefreshTokens = async (userId: string) => {
    return await db.delete(refreshToken).where(and(
        eq(refreshToken.user_id, userId),
        or(
            lt(refreshToken.expires_at, new Date()),
            lt(refreshToken.revoked_at, new Date(Date.now() - REFRESH_TOKEN_TTL_MS))
        )
    ));
};

const saveRefreshToken = async (token: string, userId: string, ip: string, userAgent: string) => {
    return await db.insert(refreshToken).values({
        token,
        user_id: userId,
        ip,
        user_agent: userAgent,
        expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
    });
};

export default {
    getUserById,
    getUserByUsername,
    consumeRefreshToken,
    revokeRefreshToken,
    revokeUserRefreshTokens,
    deleteStaleRefreshTokens,
    saveRefreshToken
};
