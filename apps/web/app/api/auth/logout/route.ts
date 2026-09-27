import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '../../../../lib/supabase-server';

export async function POST() {
    const supabase = await createSupabaseRouteClient();
    // No Supabase configured means no session cookie to clear either; either
    // way the caller ends up signed out, so this never fails the request.
    if (supabase) {
        await supabase.auth.signOut();
    }
    return new NextResponse(null, { status: 204 });
}
