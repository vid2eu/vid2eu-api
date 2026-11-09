import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { eq, sql } from 'drizzle-orm';
import {
    serializerCompiler,
    validatorCompiler,
} from 'fastify-type-provider-zod';
dotenv.config();
import videoRoutes from './modules/video/video.routes.ts';
import authRoutes from './modules/auth/auth.routes.ts';
import meRoutes from './modules/me/me.routes.ts';
import usersRoutes from './modules/users/users.routes.ts';

import { db } from '@vid2eu/db/client';
import { user } from '@vid2eu/db/schema';
import { hashPassword } from './helpers/security.ts';

const parseTrustProxy = (value = 'loopback') => {
    if (value === 'true' || value === 'false') return value === 'true';
    return value;
};

const fastify = Fastify({
    logger: true,
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
});

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

await fastify.register(rateLimit, { global: false });

fastify.register(videoRoutes, { prefix: '/videos' });
fastify.register(authRoutes, { prefix: '/auth' });
fastify.register(meRoutes, { prefix: '/me' });
fastify.register(usersRoutes, { prefix: '/users' });

fastify.get('/health', async () => {
    await db.execute(sql`select 1`);
    return { ok: true };
});

const admins = await db.select({ id: user.id }).from(user).where(eq(user.isAdmin, true)).limit(1);

if (admins.length === 0) {
    const username = (process.env.ADMIN_USERNAME || 'storm').toLowerCase();
    const existing = await db.select({ id: user.id }).from(user).where(eq(user.username, username));

    if (existing.length === 0) {
        await db.insert(user).values({
            name: process.env.ADMIN_NAME || 'Storm',
            limit: Number(process.env.ADMIN_STORAGE_GB) || 20,
            username,
            password: await hashPassword(process.env.ADMIN_PASSWORD || '123'),
            isAdmin: true
        });
        fastify.log.info(`Created first admin account "${username}"`);
    }
}

fastify.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' }).then(() => {
    console.log(`Server is running on http://localhost:${process.env.PORT || 3000}`);
});

export default fastify;
