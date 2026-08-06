import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase client using the service-role key, for the generation pipeline: it
// writes campaign rows and uploads generated images on behalf of a user, bypassing RLS.
//
// SUPABASE_SERVICE_ROLE_KEY must never be exposed to the browser -- no NEXT_PUBLIC_ prefix,
// and this module must only ever be imported from server code (route handlers, server actions).

let cached: SupabaseClient | null = null;

/** Returns null when Supabase isn't configured, so the app can run without persistence. */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function isSupabaseServerConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
