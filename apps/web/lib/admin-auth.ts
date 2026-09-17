import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas
export const ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

function getSecret(): string | null {
    return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? null;
}

function sign(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
}

export function createAdminSessionToken(): string | null {
    const secret = getSecret();
    if (!secret) return null;
    const payload = String(Date.now() + SESSION_TTL_MS);
    return `${payload}.${sign(payload, secret)}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
    if (!token) return false;
    const secret = getSecret();
    if (!secret) return false;

    const [payload, signature] = token.split('.');
    if (!payload || !signature) return false;

    const expected = sign(payload, secret);
    const expectedBuffer = Buffer.from(expected, 'hex');
    const providedBuffer = Buffer.from(signature, 'hex');
    if (expectedBuffer.length !== providedBuffer.length) return false;
    if (!timingSafeEqual(expectedBuffer, providedBuffer)) return false;

    const expiresAt = Number(payload);
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export function checkAdminPassword(password: string): boolean {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected || !password) return false;
    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(password);
    if (expectedBuffer.length !== providedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function isAdminRequest(request: NextRequest): boolean {
    return verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}
