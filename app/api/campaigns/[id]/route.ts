import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/campaign/store';
import { CUSTOMER_STATUS_LABELS } from '@/lib/campaign/types';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id);

  if (!job) {
    return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    statusLabel: CUSTOMER_STATUS_LABELS[job.status],
    statusMessage: job.statusMessage,
    requestedCount: job.requestedCount,
    productSummary: job.analysis
      ? {
          category: job.analysis.productIdentity.category,
          itemType: job.analysis.productIdentity.itemType,
          quantity: job.analysis.productIdentity.quantity,
          campaignThesis: job.analysis.campaignThesis,
        }
      : null,
    minimumAdditionalEvidenceNeeded: job.minimumAdditionalEvidenceNeeded ?? [],
    results: job.results ?? [],
    listingTitle: job.listingTitle ?? null,
    listingDescription: job.listingDescription ?? null,
    error: job.error ?? null,
  });
}
