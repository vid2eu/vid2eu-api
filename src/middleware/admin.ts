import type { FastifyReply, FastifyRequest } from 'fastify';
import { db } from '@vid2eu/db/client';
import { user } from '@vid2eu/db/schema';
import { eq } from 'drizzle-orm';
import { first } from '../helpers/db.ts';

export async function adminGuard(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const userId = request.user?.userId;

    const admin = first(await db.select().from(user).where(eq(user.id, userId)));

    if (!admin || !admin.isAdmin) {
        return reply.status(403).send({
            message: 'Admin access required'
        });
    }
}