// The one message every guarded action answers with when nobody is signed in.
// The studio is open to anyone; only rendering, approving, deleting and
// uploading need a session - see proxy.ts for the full list and why.
import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from './supabase-server';

export const SIGN_IN_REQUIRED_ERROR = 'Inicia sesion para generar, aprobar, borrar o subir archivos.';

/**
 * For the guarded actions the proxy cannot see - the ones told apart only by
 * the request body. Returns a 401 response to send back, or null when there
 * is a signed-in user. Fails closed when Supabase is not configured.
 */
export async function requireSession(): Promise<NextResponse | null> {
    const supabase = await createSupabaseRouteClient();
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;
    return user ? null : NextResponse.json({ error: SIGN_IN_REQUIRED_ERROR }, { status: 401 });
}
