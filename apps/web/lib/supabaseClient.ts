import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseClient(options?: { serviceRole?: boolean }) {
    const url = supabaseUrl;
    const key = options?.serviceRole ? process.env.SUPABASE_SERVICE_ROLE_KEY : supabasePublishableKey;

    if (!url || !key) return null;

    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });
}

export const supabase = getSupabaseClient();
