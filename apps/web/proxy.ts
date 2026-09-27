// Next.js 16 renamed the middleware.js convention to proxy.js (same runtime,
// same file position at the app root); see node_modules/next/dist/docs/01-app
// /03-api-reference/03-file-conventions/proxy.md. This is that file.
//
// Without this, the studio has no door: every route under app/api/** answers
// anyone who knows the Vercel URL, which also makes RF-012's human-approval
// gate meaningless - the gate exists, but anyone can walk through it. This
// runs before every request and turns "no session" into a 401 for API calls
// and a redirect for pages.
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseProxyClient } from './lib/supabase-server';

// The login page and the auth endpoints themselves are the only way in while
// signed out - block them and nobody could ever log in. Everything else,
// page or API, needs a session. There is deliberately no signup route to
// exempt: accounts are created by the operator in the Supabase dashboard.
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout', '/api/auth/session'];

function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATHS.includes(pathname);
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (isPublicPath(pathname)) return NextResponse.next();

    const isApiRequest = pathname.startsWith('/api/');
    const client = createSupabaseProxyClient(request);

    // No Supabase configuration means no way to check anyone's identity:
    // fail closed instead of letting every request through unchecked.
    if (!client) {
        console.error('Supabase no esta configurado: no se puede verificar la sesion.');
        return isApiRequest
            ? NextResponse.json({ error: 'El servicio de autenticacion no esta disponible.' }, { status: 401 })
            : NextResponse.redirect(new URL('/login', request.url));
    }

    const { supabase, getResponse } = client;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return isApiRequest
            ? NextResponse.json({ error: 'No autenticado. Inicia sesion para continuar.' }, { status: 401 })
            : NextResponse.redirect(new URL('/login', request.url));
    }

    // Carries any refreshed session cookie the getUser() call above wrote.
    return getResponse();
}

export const config = {
    matcher: [
        // Everything except Next's own static/image pipeline and the static
        // files under public/ (icons, the manifest, the service worker,
        // svgs, generated audio). Redirecting those to /login would not be a
        // security hole - only signed-in requests carry the cookie that lets
        // real pages through anyway - but it does break the service worker
        // registration and the icons on the signed-out /login page itself.
        '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav)$).*)',
    ],
};
