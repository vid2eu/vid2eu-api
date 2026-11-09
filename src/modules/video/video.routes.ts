import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import videoService from './video.service.ts';
import {
    videoMetadataSchema,
    videoPatchRequest,
    videoPatchResponse,
    videoIdParams,
    slugParams,
    startUploadResponse
} from './video.schema.ts';
import { authenticate } from '../../middleware/authenticate.ts';
import { HttpError } from '../../helpers/errors.ts';

const videoRoutes: FastifyPluginAsyncZod = async (app) => {
    app.post('/', {
        schema: {
            body: videoMetadataSchema,
            response: { 201: startUploadResponse }
        },
        preHandler: authenticate,
    }, async (request, reply) => {
        const token = request.headers.authorization!.slice(7);
        const session = await videoService.startSession(token, request.user.userId, request.body);

        return reply.code(201).send(session);
    });

    app.get('/:slug', {
        schema: { params: slugParams }
    }, async (request) => {
        const video = await videoService.getPublicVideo(request.params.slug);

        if (!video) {
            throw new HttpError(404, 'Video not found');
        }

        return video;
    });

    app.post('/:slug/views', {
        schema: { params: slugParams },
        config: { rateLimit: { max: 30, timeWindow: '1 minute' } }
    }, async (request) => {
        return videoService.recordView(request.params.slug);
    });

    app.patch('/:videoId', {
        schema: {
            params: videoIdParams,
            body: videoPatchRequest,
            response: { 200: videoPatchResponse }
        },
        preHandler: authenticate,
    }, async (request) => {
        return videoService.updateVideoTitle(request.user.userId, request.params.videoId, request.body.title);
    });
};

export default videoRoutes;
