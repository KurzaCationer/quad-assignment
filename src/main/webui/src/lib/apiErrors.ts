export class ApiError extends Error {}

export function requireSuccess<T extends {status: number; data: unknown}>(response: T): T['data'] {
    if (response.status < 200 || response.status >= 300) {
        const body: unknown = response.data;
        const message = body && typeof body === 'object' && 'message' in body
            && typeof body.message === 'string' ? body.message : 'The request failed. Please try again.';
        throw new ApiError(message);
    }
    return response.data;
}

export function errorMessage(error: unknown, fallback: string): string {
    return error instanceof ApiError ? error.message : fallback;
}
