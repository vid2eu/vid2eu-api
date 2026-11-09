import { randomBytes } from 'node:crypto';

export const generateSlug = () => {
    return randomBytes(3).toString('hex');
};