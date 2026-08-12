'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from './config';

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

  // Placeholder values count as unconfigured -- see ./config. Otherwise the browser builds a
  // client against your-project.supabase.co and every sign-in attempt fails on DNS.
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  if (!url || !anonKey) return null;

  cached = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl() && supabaseAnonKey(),
  );
}
