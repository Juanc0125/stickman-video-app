// Session-aware Supabase clients, built on top of @supabase/ssr's cookie
// storage. These carry the signed-in user's own access token, unlike the
// service-role client in video-persistence.ts, which deliberately bypasses
// RLS and has nothing to do with who is logged in - keep the two apart.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { supabasePublishableKey, supabaseUrl } from './supabaseClient';

function hasConfig(): boolean {
    return Boolean(supabaseUrl && supabasePublishableKey);
}

// For Route Handlers (app/api/auth/**). `cookies()` from `next/headers` is
// mutable in this context - Next.js merges the writes into the outgoing
// response - so one client both reads the session cookie and persists a new
// or refreshed one after sign-in, sign-out or token refresh.
export async function createSupabaseRouteClient() {
    if (!hasConfig()) return null;
    const cookieStore = await cookies();
    return createServerClient(supabaseUrl!, supabasePublishableKey!, {
        cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: (cookiesToSet) => {
                cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            },
        },
    });
}

// For proxy.ts. Request cookies and response cookies are separate objects
// here, so a token refresh has to be mirrored onto both: the request, so the
// rest of this invocation sees the new value, and the response, so the
// browser keeps it. `getResponse()` reads the latest one - `setAll` can
// replace it after `getUser()` triggers a refresh, so capturing `response` by
// value before that call would return a stale object with no Set-Cookie.
export function createSupabaseProxyClient(request: NextRequest) {
    if (!hasConfig()) return null;
    let response = NextResponse.next({ request });
    const supabase = createServerClient(supabaseUrl!, supabasePublishableKey!, {
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (cookiesToSet) => {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
            },
        },
    });
    return { supabase, getResponse: () => response };
}
