import { NextRequest, NextResponse } from 'next/server';
import { stripeConfigured, siteUrl } from '@/lib/stripe';
import { CONTACT_CONFIGURED } from '@/lib/config/contact';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * What the RUNNING app can see of its own configuration.
 *
 * `npm run preflight` reads a local .env file, which says nothing about what a deployed instance
 * was actually given -- a variable typed into a hosting dashboard can be missing, misspelled, or
 * saved without a redeploy, and every page still renders perfectly. This answers the only question
 * that matters after a deploy: does the process have what it needs?
 *
 * SAFE TO EXPOSE. It reports booleans and derived facts, never a value, never a prefix, never a
 * length. Knowing that Stripe is configured tells an attacker nothing they can use, and knowing it
 * is NOT configured tells them nothing either -- the development payment bypass refuses outright
 * whenever NODE_ENV is production, regardless of Stripe's state.
 */
export async function GET(req: NextRequest) {
  const has = (k: string) => Boolean((process.env[k] ?? '').trim());

  // The host the request actually arrived on, versus the one configured for Stripe redirects.
  // A mismatch here is the quiet killer: checkout completes and returns the buyer to a domain that
  // is not this one, so they land on a dead page holding a receipt.
  const requestHost = req.headers.get('host') ?? '';
  const configuredHost = (() => {
    try {
      return new URL(siteUrl()).host;
    } catch {
      return '';
    }
  })();

  const checks = [
    { name: 'openai_key', ok: has('OPENAI_API_KEY') },
    { name: 'stripe_secret_key', ok: has('STRIPE_SECRET_KEY') },
    { name: 'stripe_webhook_secret', ok: has('STRIPE_WEBHOOK_SECRET') },
    { name: 'stripe_fully_configured', ok: stripeConfigured() },
    { name: 'stripe_mode_live', ok: (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_live_') },
    { name: 'site_url_set', ok: Boolean(configuredHost) },
    { name: 'site_url_matches_this_host', ok: Boolean(configuredHost) && configuredHost === requestHost },
    { name: 'contact_addresses_real', ok: CONTACT_CONFIGURED },
    { name: 'supabase_configured', ok: Boolean(getSupabaseAdminClient()) },
    {
      name: 'service_role_key_not_public',
      ok: !Object.keys(process.env).some(
        (k) => k.startsWith('NEXT_PUBLIC_') && k.includes('SERVICE_ROLE'),
      ),
    },
  ];

  // Only the things that would stop a paying customer getting their images.
  const critical = ['openai_key', 'stripe_fully_configured', 'site_url_matches_this_host'];
  const missing = checks.filter((c) => !c.ok).map((c) => c.name);
  const ready = critical.every((n) => checks.find((c) => c.name === n)?.ok);

  return NextResponse.json(
    {
      ready,
      environment: process.env.NODE_ENV,
      requestHost,
      configuredHost,
      checks: Object.fromEntries(checks.map((c) => [c.name, c.ok])),
      missing,
      note:
        'A present webhook secret is not a correct one. The secret from `stripe listen` and the ' +
        'one from a Dashboard endpoint look identical and cannot be told apart here -- only a ' +
        'real checkout proves which you have.',
    },
    { status: ready ? 200 : 503 },
  );
}
