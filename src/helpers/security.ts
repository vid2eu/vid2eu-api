import argon from '@node-rs/argon2';
import { createHash, randomInt } from 'node:crypto';

export const hashPassword = async (password: string) => {
    return await argon.hash(password);
}

export const verifyPassword = async (password: string, hash: string) => {
    return await argon.verify(hash, password);
}

const dummyHash = hashPassword('vid2eu-timing-equaliser');

export const verifyPasswordOrDummy = async (password: string, hash: string | undefined) => {
    const valid = await verifyPassword(password, hash ?? await dummyHash);
    return hash !== undefined && valid;
}

export const hashRefreshToken = async (refreshToken: string) => {
    return createHash('sha256').update(refreshToken).digest('hex');
}

export function generateRandomPassword(length: number = 12) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*?';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars[randomInt(chars.length)];
    }
    return password;
}
