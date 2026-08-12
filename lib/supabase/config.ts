// Is Supabase actually configured, or does it just have something in the variables?
//
// The distinction is not pedantic. The example env file ships placeholders --
// `https://your-project.supabase.co`, `your-anon-key` -- and pasting that file wholesale into a
// hosting dashboard is the normal way to fill in variables. Every truthiness check then passes, a
// client is built against a hostname that does not resolve, and the health endpoint cheerfully
// reports Supabase as configured.
//
// The failure that follows is nasty out of proportion to its cause: writes reject on a domain that
// does not exist, and because persistence is best-effort the errors surface as unexplained
// slowness and log noise rather than as anything pointing at the real problem.
//
// Treating a placeholder as "not configured" puts the app back on its documented path -- runs fine,
// forgets campaigns on restart -- which is a good state, unlike the half-configured one.

const PLACEHOLDERS = [
  'your-project',
  'your-anon-key',
  'your-service-role-key',
  'example.supabase.co',
];

function real(value: string | undefined): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  const lower = v.toLowerCase();
  return PLACEHOLDERS.some((p) => lower.includes(p)) ? null : v;
}

/** The Supabase URL, or null if unset or still a placeholder. */
export const supabaseUrl = () => real(process.env.NEXT_PUBLIC_SUPABASE_URL);

/** The anon key, or null if unset or still a placeholder. */
export const supabaseAnonKey = () => real(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** The service-role key, or null if unset or still a placeholder. Server only. */
export const supabaseServiceKey = () => real(process.env.SUPABASE_SERVICE_ROLE_KEY);
