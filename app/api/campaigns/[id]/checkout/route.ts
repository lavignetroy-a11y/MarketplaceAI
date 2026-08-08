import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/campaign/store';
import { stripe, stripeConfigured, siteUrl } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * Starts checkout. Returns a Stripe-hosted payment page to redirect to.
 *
 * The price is computed here from the job the server already holds -- never taken from the
 * request. A client that can name its own price can name zero.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!stripeConfigured()) {
    // Both variables are required, and a half-configured server is the confusing case: checkout
    // silently falls through to the development bypass and the seller gets the full set without
    // ever seeing a payment page. Naming the missing variable turns a mystery into a one-line fix.
    // Development only -- a production deploy should not be enumerating its own env for callers.
    const missing = (
      [
        ['STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY],
        ['STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET],
      ] as const
    )
      .filter(([, v]) => !v)
      .map(([name]) => name);

    console.warn(
      `[checkout] Stripe is not configured (missing: ${missing.join(', ')}). ` +
        'Falling back to the development bypass -- no payment will be taken.',
    );

    return NextResponse.json(
      {
        error: 'Payments are not configured on this server.',
        ...(process.env.NODE_ENV === 'production' ? {} : { missing }),
      },
      { status: 503 },
    );
  }

  const job = getJob(id);
  if (!job) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  if (job.paid) return NextResponse.json({ error: 'Already paid.' }, { status: 409 });
  if (job.status !== 'preview_ready') {
    return NextResponse.json({ error: 'Not ready for checkout yet.' }, { status: 409 });
  }

  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: job.priceCents,
          product_data: {
            name: `${job.requestedCount} finished listing images`,
            description: 'A complete, coordinated set generated from your own photos.',
          },
        },
      },
    ],
    // The campaign id travels with the session so the webhook knows what was bought without
    // trusting anything the browser sends back.
    metadata: { campaignId: id },
    success_url: `${siteUrl()}/upload?campaign=${id}&paid=1`,
    cancel_url: `${siteUrl()}/upload?campaign=${id}&canceled=1`,
  });

  if (!session.url) {
    return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 502 });
  }
  return NextResponse.json({ url: session.url });
}
