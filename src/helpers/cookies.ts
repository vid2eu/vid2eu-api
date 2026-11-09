import type { FastifyReply, FastifyRequest } from 'fastify';
import { REFRESH_TOKEN_TTL_MS } from './token.ts';

export const REFRESH_COOKIE = 'vid2eu_rt';

export const readCookie = (request: FastifyRequest, name: string) => {
    const header = request.headers.cookie;
    if (!header) return undefined;

    for (const part of header.split(';')) {
        const index = part.indexOf('=');
        if (index === -1) continue;
        if (part.slice(0, index).trim() === name) {
            return decodeURIComponent(part.slice(index + 1).trim());
        }
    }

    return undefined;
};

const isSecure = (request: FastifyRequest) =>
    process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : request.protocol === 'https';

const serialize = (request: FastifyRequest, value: string, maxAgeSeconds: number) => [
    `${REFRESH_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`,
    isSecure(request) && 'Secure',
].filter(Boolean).join('; ');

export const setRefreshCookie = (request: FastifyRequest, reply: FastifyReply, token: string) => {
    reply.header('Set-Cookie', serialize(request, token, Math.floor(REFRESH_TOKEN_TTL_MS / 1000)));
};

export const clearRefreshCookie = (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Set-Cookie', serialize(request, '', 0));
};
