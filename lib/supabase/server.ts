import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseServiceKey, supabaseUrl } from './config';

// Server-side Supabase client using the service-role key, for the generation pipeline: it
// writes campaign rows and uploads generated images on behalf of a user, bypassing RLS.
//
// SUPABASE_SERVICE_ROLE_KEY must never be exposed to the browser -- no NEXT_PUBLIC_ prefix,
// and this module must only ever be imported from server code (route handlers, server actions).

let cached: SupabaseClient | null = null;

/** Returns null when Supabase isn't configured, so the app can run without persistence. */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (cached) return cached;

  // Placeholder values count as unconfigured -- see lib/supabase/config.ts. A client built
  // against your-project.supabase.co fails every write on a hostname that does not resolve.
  const url = supabaseUrl();
  const serviceKey = supabaseServiceKey();
  if (!url || !serviceKey) return null;

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function isSupabaseServerConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseServiceKey());
}
