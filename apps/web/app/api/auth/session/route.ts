import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '../../../../lib/supabase-server';

export async function GET() {
    const supabase = await createSupabaseRouteClient();
    if (!supabase) {
        return NextResponse.json({ email: null });
    }
    const { data: { user } } = await supabase.auth.getUser();
    return NextResponse.json({ email: user?.email ?? null });
}
