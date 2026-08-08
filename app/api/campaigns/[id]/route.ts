import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/campaign/store';
import { loadPersistedCampaign } from '@/lib/campaign/storage';
import { CUSTOMER_STATUS_LABELS, etaSeconds, type CampaignStatus } from '@/lib/campaign/types';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id);

  if (!job) {
    // Not in this process -- a later visit, another device, or a restart. Rebuild it from the
    // database so a shared or bookmarked campaign link keeps working.
    const persisted = await loadPersistedCampaign(id);
    if (!persisted) {
      return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    }
    return NextResponse.json({
      id: persisted.id,
      status: persisted.status,
      statusLabel:
        CUSTOMER_STATUS_LABELS[persisted.status as CampaignStatus] ?? persisted.status,
      statusMessage: persisted.statusMessage ?? undefined,
      requestedCount: persisted.requestedCount,
      paid: persisted.paid,
      priceCents: persisted.priceCents,
      productSummary: null,
      minimumAdditionalEvidenceNeeded: [],
      // Progress is in-process working state, so a campaign rebuilt from the database has none.
      progress: null,
      results: persisted.results,
      listingTitle: persisted.listingTitle,
      listingDescription: persisted.listingDescription,
      error: persisted.error,
      restored: true,
    });
  }

  // The payment gate lives here, not in the UI: unpaid campaigns only ever receive the
  // watermarked preview, so the clean file can't be pulled straight from the API response.
  const results = (job.results ?? []).map((r) => ({
    sequenceNumber: r.sequenceNumber,
    imageRole: r.imageRole,
    imageJob: r.imageJob,
    status: r.status,
    error: r.error,
    isPreview: Boolean(r.isPreview),
    image: job.paid ? r.image : r.previewImage,
  }));

  return NextResponse.json({
    id: job.id,
    status: job.status,
    statusLabel: CUSTOMER_STATUS_LABELS[job.status],
    statusMessage: job.statusMessage,
    requestedCount: job.requestedCount,
    paid: job.paid,
    priceCents: job.priceCents,
    productSummary: job.analysis
      ? {
          category: job.analysis.productIdentity.category,
          itemType: job.analysis.productIdentity.itemType,
          quantity: job.analysis.productIdentity.quantity,
          campaignThesis: job.analysis.campaignThesis,
        }
      : null,
    minimumAdditionalEvidenceNeeded: job.minimumAdditionalEvidenceNeeded ?? [],
    // Only meaningful during the paid phase; null before it starts so the UI can tell the
    // difference between "no estimate yet" and "nothing to estimate".
    progress: job.progress
      ? {
          total: job.progress.total,
          done: job.progress.done,
          failed: job.progress.failed,
          etaSeconds: etaSeconds(job.progress),
        }
      : null,
    results,
    // listing copy is part of the paid deliverable
    listingTitle: job.paid ? job.listingTitle ?? null : null,
    listingDescription: job.paid ? job.listingDescription ?? null : null,
    error: job.error ?? null,
  });
}
