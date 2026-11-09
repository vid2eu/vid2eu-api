import { SignJWT, jwtVerify } from 'jose';
import { randomBytes } from 'node:crypto';
import { hashRefreshToken } from './security.ts';

export const ACCESS_TOKEN_TTL_SECONDS = 20 * 60;
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

const generateToken = async (
    userId: string,
    isAdmin: boolean
) => {
    return await new SignJWT({ userId, admin: isAdmin })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
        .sign(secret());
};

export const verifyToken = async (token: string) => {
    try {
        const { payload } = await jwtVerify(token, secret());

        return {
            userId: payload.userId as string,
            isAdmin: payload.admin as boolean,
            exp: payload.exp as number
        };
    } catch {
        return null;
    }
};

const generateRefreshToken = () => {
    return randomBytes(64).toString('hex');
};

export const generateTokens = async (
    userId: string,
    isAdmin: boolean
) => {
    const token = await generateToken(userId, isAdmin);
    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = await hashRefreshToken(refreshToken);

    return { token, refreshToken, hashedRefreshToken };
};
