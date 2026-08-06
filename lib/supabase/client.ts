'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Browser-side Supabase client, used for auth (sign in / sign up / session) and for reading
// the signed-in user's own rows through row-level security.
//
// Both values are public by design -- the anon key is safe to ship to the browser; RLS is what
// actually protects data. Add them to .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>

let cached: SupabaseClient | null = null;

/** Returns null when Supabase isn't configured, so the UI can degrade instead of crashing. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  cached = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
