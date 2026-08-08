import { NextRequest, NextResponse } from 'next/server';
import { getJob, markPaid } from '@/lib/campaign/store';
import { runFullCampaign } from '@/lib/campaign/pipeline';
import { stripeConfigured } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * DEVELOPMENT BYPASS. Marks a campaign paid without taking payment.
 *
 * This used to be the only checkout path, which meant anyone who could POST to it could unlock a
 * full set for nothing. Real payment now runs through Stripe: /checkout creates a session, and
 * /api/stripe/webhook -- which verifies Stripe's signature before it trusts a single field -- is
 * the only thing that marks a job paid in production.
 *
 * This route survives so the flow can be exercised without a card, and refuses in two cases:
 * outside development, and whenever Stripe IS configured. The second matters more than it looks:
 * it means the bypass cannot quietly stay reachable on a machine that has real keys.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === 'production' || stripeConfigured()) {
    return NextResponse.json({ error: 'Not available.' }, { status: 404 });
  }

  const { id } = await params;
  const job = getJob(id);

  if (!job) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  if (job.paid) return NextResponse.json({ ok: true, alreadyPaid: true });
  if (job.status !== 'preview_ready') {
    return NextResponse.json({ error: 'This campaign is not ready for checkout yet.' }, { status: 409 });
  }

  markPaid(id);
  void runFullCampaign(id);
  return NextResponse.json({ ok: true, devBypass: true, priceCents: job.priceCents });
}
