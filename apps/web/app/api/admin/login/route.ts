import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS, checkAdminPassword, createAdminSessionToken } from '../../../../lib/admin-auth';

export async function POST(request: NextRequest) {
    if (!process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'ADMIN_PASSWORD no esta configurada en el servidor.' }, { status: 500 });
    }

    const body = await request.json().catch(() => null) as { password?: unknown } | null;
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!checkAdminPassword(password)) {
        return NextResponse.json({ error: 'Contrasena incorrecta.' }, { status: 401 });
    }

    const token = createAdminSessionToken();
    if (!token) {
        return NextResponse.json({ error: 'No se pudo crear la sesion.' }, { status: 500 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
        path: '/',
    });
    return response;
}
