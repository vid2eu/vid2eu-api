import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authenticate } from '../../middleware/authenticate.ts';
import { REFRESH_COOKIE, readCookie } from '../../helpers/cookies.ts';
import { changePasswordRequest, getMeResponse, getMeVideosResponse } from './me.schema.ts';
import service from './me.service.ts';

const meRoutes: FastifyPluginAsyncZod = async (fastify) => {
    fastify.addHook('preHandler', authenticate);

    fastify.get('/', {
        schema: { response: { 200: getMeResponse } }
    }, async (request) => {
        return service.getProfile(request.user.userId);
    });

    fastify.patch('/password', {
        schema: { body: changePasswordRequest }
    }, async (request, reply) => {
        const { currentPassword, newPassword } = request.body;

        await service.changePassword(
            request.user.userId,
            currentPassword,
            newPassword,
            readCookie(request, REFRESH_COOKIE)
        );

        return reply.code(204).send();
    });

    fastify.get('/videos', {
        schema: { response: { 200: getMeVideosResponse } }
    }, async (request) => {
        return service.getVideosByUserId(request.user.userId);
    });
};

export default meRoutes;
