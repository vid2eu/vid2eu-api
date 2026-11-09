import { HttpError } from './errors.ts';

export const deleteStoredVideos = async (token: string, videoIds: string[]) => {
    if (videoIds.length === 0) return { deleted: 0, files: 0, failedFiles: 0 };

    const res = await fetch(`${process.env.STORAGE_API}/videos/delete`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ videoIds }),
        signal: AbortSignal.timeout(60_000)
    }).catch(() => null);

    if (!res?.ok) {
        throw new HttpError(502, 'Storage could not delete the videos, nothing was removed from the account');
    }

    return await res.json() as { deleted: number; files: number; failedFiles: number };
};
