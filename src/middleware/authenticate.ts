import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyToken } from '../helpers/token.ts';

export async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
        return reply.status(401).send({
            message: 'Missing authorization token'
        });
    }

    const token = authorization.slice(7);
    const payload = await verifyToken(token);

    if (!payload) {
        return reply.status(401).send({
            message: 'Invalid or expired token'
        });
    }

    request.user = payload;
}