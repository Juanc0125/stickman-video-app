import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '../../../../lib/supabase-server';

// One message for every failure - missing fields, unknown email, wrong
// password. Confirming which of those it was tells an attacker which emails
// have accounts; the contract only promises 200 or 401 anyway.
const INVALID_CREDENTIALS_MESSAGE = 'Correo o contraseña incorrectos.';

export async function POST(request: Request) {
    const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
        return NextResponse.json({ error: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
    }

    const supabase = await createSupabaseRouteClient();
    if (!supabase) {
        return NextResponse.json({ error: 'El servicio de autenticacion no esta disponible.' }, { status: 500 });
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        return NextResponse.json({ error: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
    }

    // The session cookies are already attached by the client's setAll above;
    // the body only has to confirm success.
    return NextResponse.json({});
}
