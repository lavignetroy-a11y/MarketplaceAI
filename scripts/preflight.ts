/**
 * Everything that has to be true before this site takes real money.
 *
 *   npm run preflight
 *
 * A checklist in a document is a checklist nobody reads on the day they deploy. These are the
 * failures that are invisible in testing -- every page renders, nothing throws, and the problem
 * only appears once a stranger has paid you.
 *
 * Exits non-zero when a BLOCKER is unresolved, so it can gate a deploy.
 */
import { loadEnvConfig } from '@next/env';
import fs from 'fs';
import path from 'path';

loadEnvConfig(process.cwd());

type Level = 'blocker' | 'warn';
type Check = { level: Level; name: string; ok: boolean; detail: string };

const checks: Check[] = [];
const add = (level: Level, name: string, ok: boolean, detail: string) =>
  checks.push({ level, name, ok, detail });

const env = (k: string) => (process.env[k] ?? '').trim();
const read = (p: string) => {
  try {
    return fs.readFileSync(path.join(process.cwd(), p), 'utf-8');
  } catch {
    return '';
  }
};

// --- payment ---------------------------------------------------------------
// Both are required, and a half-configured server is the dangerous state: checkout falls through
// to the development bypass and hands over the full set without charging.
add(
  'blocker',
  'Stripe secret key',
  Boolean(env('STRIPE_SECRET_KEY')),
  'Without it checkout returns 503 and the dev bypass gives the set away free.',
);
add(
  'blocker',
  'Stripe webhook secret',
  Boolean(env('STRIPE_WEBHOOK_SECRET')),
  'Without it the webhook cannot verify signatures, so nothing marks a campaign paid.',
);
add(
  'warn',
  'Stripe keys are live, not test',
  env('STRIPE_SECRET_KEY').startsWith('sk_live_'),
  'Currently a test key. Real cards will not work.',
);

// --- the model -------------------------------------------------------------
add('blocker', 'OpenAI key', Boolean(env('OPENAI_API_KEY')), 'Nothing generates without it.');

// --- where the site lives --------------------------------------------------
const siteUrl = env('NEXT_PUBLIC_SITE_URL');
add(
  'blocker',
  'Public site URL',
  Boolean(siteUrl) && !siteUrl.includes('localhost'),
  `Stripe returns the buyer here after paying. Currently "${siteUrl || 'unset'}".`,
);

// --- reachability ----------------------------------------------------------
// The refund policy, terms and acceptable-use page all point at these addresses.
const support = env('NEXT_PUBLIC_SUPPORT_EMAIL');
const abuse = env('NEXT_PUBLIC_ABUSE_EMAIL');
add(
  'blocker',
  'Support address',
  Boolean(support) && !support.includes('example.com'),
  'Falls back to example.com, so refund requests go to a domain nobody owns.',
);
add(
  'blocker',
  'Abuse address',
  Boolean(abuse) && !abuse.includes('example.com'),
  'Referenced by the acceptable-use policy.',
);

// --- persistence -----------------------------------------------------------
// Optional by design: the app runs without it and simply forgets campaigns on restart. Worth
// knowing you are launching that way rather than discovering it from a customer.
const supabase = Boolean(env('NEXT_PUBLIC_SUPABASE_URL') && env('SUPABASE_SERVICE_ROLE_KEY'));
add(
  'warn',
  'Supabase configured',
  supabase,
  'Without it campaigns vanish on restart and account history is empty.',
);
add(
  'blocker',
  'Service role key is not public',
  !Object.keys(process.env).some(
    (k) => k.startsWith('NEXT_PUBLIC_') && k.includes('SERVICE_ROLE'),
  ),
  'A NEXT_PUBLIC_ service role key is shipped to every browser and bypasses row-level security.',
);

// --- claims ----------------------------------------------------------------
const claims = read('lib/config/claims.ts');
add(
  'blocker',
  'No fabricated testimonial',
  /TESTIMONIALS[^=]*=\s*\[\s*\]/.test(claims),
  'A named endorsement nobody gave is the FTC fake-endorsement rule directly.',
);
add(
  'warn',
  'Performance claims have a cited source',
  !claims.includes('NEEDS A CITED SOURCE'),
  'HERO_STATS assert outcomes. Cite the photography research behind the figures, and make the ' +
    'wording match what that research measured.',
);

// --- internal tooling ------------------------------------------------------
add(
  'blocker',
  'Studio is gated in production',
  read('app/studio/layout.tsx').includes('notFound'),
  'The studio spends money against the OpenAI key on every run.',
);

// --- report ----------------------------------------------------------------
const blockers = checks.filter((c) => c.level === 'blocker' && !c.ok);
const warnings = checks.filter((c) => c.level === 'warn' && !c.ok);
const passed = checks.filter((c) => c.ok);

console.log('\n  PREFLIGHT\n');
for (const c of checks) {
  const mark = c.ok ? ' ok ' : c.level === 'blocker' ? 'STOP' : 'warn';
  console.log(`  [${mark}] ${c.name}`);
  if (!c.ok) console.log(`         ${c.detail}`);
}

console.log(
  `\n  ${passed.length} passed, ${warnings.length} warning(s), ${blockers.length} blocker(s)\n`,
);

if (blockers.length) {
  console.log('  Not ready to take money. Resolve the STOP items above.\n');
  process.exit(1);
}
console.log(
  warnings.length
    ? '  No blockers. Read the warnings before you announce it.\n'
    : '  Ready.\n',
);
