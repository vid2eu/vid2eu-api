import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { loginSchema, authSchema } from './auth.schema.ts';
import service from './auth.service.ts';
import { REFRESH_COOKIE, clearRefreshCookie, readCookie, setRefreshCookie } from '../../helpers/cookies.ts';
import { HttpError } from '../../helpers/errors.ts';

type Session = Awaited<ReturnType<typeof service.loginUser>>;

const sendSession = (request: FastifyRequest, reply: FastifyReply, session: Session, viaCookie: boolean) => {
    setRefreshCookie(request, reply, session.tokens.refreshToken);

    if (viaCookie) {
        const { refreshToken: _, ...tokens } = session.tokens;
        return reply.send({ ...session, tokens });
    }

    return reply.send(session);
};

const authRoutes: FastifyPluginAsyncZod = async (app) => {
    app.post('/login', {
        schema: {
            body: loginSchema
        }
    }, async (request, reply) => {
        const { username, password } = request.body;
        const userAgent = request.headers['user-agent'] || '';

        const session = await service.loginUser(username, password, request.ip, userAgent);
        return sendSession(request, reply, session, false);
    });

    app.post('/refresh', {
        schema: {
            body: authSchema
        }
    }, async (request, reply) => {
        const fromBody = request.body?.refreshToken;
        const token = fromBody ?? readCookie(request, REFRESH_COOKIE);
        const userAgent = request.headers['user-agent'] || '';

        if (!token) {
            throw new HttpError(401, 'Missing refresh token');
        }

        try {
            const session = await service.refreshToken(token, request.ip, userAgent);
            return sendSession(request, reply, session, !fromBody);
        } catch (error) {
            clearRefreshCookie(request, reply);
            throw error;
        }
    });

    app.post('/logout', {
        schema: {
            body: authSchema
        }
    }, async (request, reply) => {
        const token = request.body?.refreshToken ?? readCookie(request, REFRESH_COOKIE);

        if (token) {
            await service.logout(token);
        }

        clearRefreshCookie(request, reply);
        return reply.code(204).send();
    });
};

export default authRoutes;
