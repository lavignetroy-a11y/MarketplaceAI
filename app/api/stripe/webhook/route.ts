import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getJob, markPaid } from '@/lib/campaign/store';
import { runFullCampaign } from '@/lib/campaign/pipeline';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * The only thing that may mark a campaign paid.
 *
 * Every byte of this request is attacker-controlled until the signature checks out, so nothing is
 * read from the body before verification -- not the id, not the amount, not the status. Stripe
 * signs the raw bytes, so the body must be read as text; parsing it first would change the bytes
 * and the signature would never match.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    // A failed signature check is the expected shape of an attack, so it is a 400 and nothing
    // else happens. Never fall through to "well, process it anyway".
    console.warn('Stripe signature verification failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    // Acknowledge everything else so Stripe stops retrying it.
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const campaignId = session.metadata?.campaignId;

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ received: true, ignored: 'not paid' });
  }
  if (!campaignId) {
    console.error('checkout.session.completed with no campaignId in metadata:', session.id);
    return NextResponse.json({ received: true, ignored: 'no campaign id' });
  }

  const job = getJob(campaignId);
  if (!job) {
    console.error('Paid session for unknown campaign:', campaignId);
    return NextResponse.json({ received: true, ignored: 'unknown campaign' });
  }

  // Stripe retries until it gets a 2xx, and may deliver the same event more than once. Marking
  // an already-paid job paid again would kick off a second full generation run and bill the
  // image API twice, so this is a no-op rather than a repeat.
  if (job.paid) {
    return NextResponse.json({ received: true, alreadyPaid: true });
  }

  // What was actually charged must match what this campaign costs. A session could otherwise be
  // created elsewhere, for any amount, and still unlock the set.
  if (session.amount_total !== job.priceCents) {
    console.error(
      `Amount mismatch for ${campaignId}: charged ${session.amount_total}, expected ${job.priceCents}`,
    );
    return NextResponse.json({ received: true, ignored: 'amount mismatch' });
  }

  markPaid(campaignId);
  void runFullCampaign(campaignId);

  return NextResponse.json({ received: true, campaignId });
}
