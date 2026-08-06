import { NextRequest, NextResponse } from 'next/server';
import { getJob, markPaid } from '@/lib/campaign/store';
import { runFullCampaign } from '@/lib/campaign/pipeline';

export const runtime = 'nodejs';

// PLACEHOLDER CHECKOUT.
//
// This endpoint stands in for a real payment confirmation. Today it simply marks the campaign
// paid and starts phase 2. When Stripe is wired up, this should be replaced by a webhook
// handler that verifies the event signature before calling markPaid() -- a client-callable
// endpoint that grants paid access is obviously not acceptable in production.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id);

  if (!job) {
    return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  }

  if (job.status !== 'preview_ready' && !job.paid) {
    return NextResponse.json(
      { error: 'This campaign is not ready for checkout yet.' },
      { status: 409 },
    );
  }

  if (job.paid) {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  markPaid(id);
  void runFullCampaign(id);

  return NextResponse.json({ ok: true, priceCents: job.priceCents });
}
