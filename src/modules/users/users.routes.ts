import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
    usersRequest,
    usersResponse,
    usersCreateRequest,
    usersPatchRequest,
    userIdParams,
    adminUser,
    userWithPasswordResponse,
    deleteUserResponse
} from './users.schema.ts';
import service from './users.service.ts';
import { adminGuard } from '../../middleware/admin.ts';
import { authenticate } from '../../middleware/authenticate.ts';

const usersRoutes: FastifyPluginAsyncZod = async (fastify) => {
    fastify.addHook('preHandler', authenticate);
    fastify.addHook('preHandler', adminGuard);

    fastify.get('/', {
        schema: {
            querystring: usersRequest,
            response: { 200: usersResponse }
        }
    }, async (request) => {
        const { page, limit, search } = request.query;
        return service.getUsers(page, limit, search);
    });

    fastify.post('/', {
        schema: {
            body: usersCreateRequest,
            response: { 201: userWithPasswordResponse }
        }
    }, async (request, reply) => {
        const { name, username, limit, isAdmin } = request.body;
        const result = await service.createUser(name, username, limit, isAdmin);

        return reply.code(201).send(result);
    });

    fastify.patch('/:id', {
        schema: {
            params: userIdParams,
            body: usersPatchRequest,
            response: { 200: adminUser }
        }
    }, async (request) => {
        return service.updateUser(request.user.userId, request.params.id, request.body);
    });

    fastify.post('/:id/reset-password', {
        schema: {
            params: userIdParams,
            response: { 200: userWithPasswordResponse }
        }
    }, async (request) => {
        return service.resetPassword(request.params.id);
    });

    fastify.delete('/:id', {
        schema: {
            params: userIdParams,
            response: { 200: deleteUserResponse }
        }
    }, async (request) => {
        const token = request.headers.authorization!.slice(7);
        return service.deleteUser(request.user.userId, token, request.params.id);
    });
};

export default usersRoutes;
