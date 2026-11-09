declare namespace NodeJS {
    interface ProcessEnv {
        PORT: string;
        JWT_SECRET: string;
        POSTGRES_USER: string;
        POSTGRES_PASSWORD: string;
        POSTGRES_DB: string;
        DATABASE_URL: string;
        STORAGE_API: string;
    }
}