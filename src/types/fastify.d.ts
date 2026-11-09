import 'fastify';

declare module 'fastify' {
    interface FastifyRequest {
        user: {
            userId: string;
            isAdmin: boolean;
            exp: number;
        };
    }
}
