import { randomUUID } from 'crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { priceCents } from '@/lib/config/pricing';
import type { CampaignJob, CampaignStatus, RequestedImageCount, SourcePhoto } from './types';

// Campaign state lives in two places, deliberately:
//
//  - In-process memory holds the *working* job, including the raw source photo buffers. Those
//    are large and only needed while the pipeline runs, so they never go to the database.
//  - Supabase holds the *durable* record -- status, plan, listing copy, payment state -- so a
//    signed-in user's history survives restarts and is visible across devices.
//
// Supabase is optional: with no credentials configured the app still works end to end, it just
// forgets campaigns when the server restarts. Every persistence call below no-ops in that case.

const jobs = new Map<string, CampaignJob>();

export function createJob(
  requestedCount: RequestedImageCount,
  sellerNotes: string,
  sources: SourcePhoto[],
  userId?: string | null,
): CampaignJob {
  const job: CampaignJob = {
    id: randomUUID(),
    status: 'queued',
    requestedCount,
    sellerNotes,
    sources,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    paid: false,
    priceCents: priceCents(requestedCount),
    userId: userId ?? null,
  };
  jobs.set(job.id, job);
  void persistCreate(job);
  return job;
}

export function getJob(id: string): CampaignJob | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<CampaignJob>): void {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, patch, { updatedAt: Date.now() });
  void persistUpdate(job);
}

export function setStatus(id: string, status: CampaignStatus, statusMessage?: string): void {
  updateJob(id, { status, statusMessage });
}

/** Marks a campaign paid. Returns false if the campaign is unknown. */
export function markPaid(id: string): boolean {
  const job = jobs.get(id);
  if (!job) return false;
  job.paid = true;
  job.updatedAt = Date.now();
  void persistUpdate(job);
  return true;
}

// ---------------------------------------------------------------------------
// Supabase persistence (best-effort -- never blocks or fails the pipeline)
// ---------------------------------------------------------------------------

async function persistCreate(job: CampaignJob): Promise<void> {
  const db = getSupabaseAdminClient();
  if (!db) return;
  try {
    await db.from('campaigns').insert({
      id: job.id,
      user_id: job.userId ?? null,
      status: job.status,
      requested_count: job.requestedCount,
      seller_notes: job.sellerNotes || null,
      paid: job.paid,
      price_cents: job.priceCents,
    });
  } catch (err) {
    console.error('Campaign persistence (create) failed:', err);
  }
}

async function persistUpdate(job: CampaignJob): Promise<void> {
  const db = getSupabaseAdminClient();
  if (!db) return;
  try {
    await db
      .from('campaigns')
      .update({
        status: job.status,
        status_message: job.statusMessage ?? null,
        analysis: job.analysis ?? null,
        listing_title: job.listingTitle ?? null,
        listing_description: job.listingDescription ?? null,
        paid: job.paid,
        price_cents: job.priceCents,
        error: job.error ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);
  } catch (err) {
    console.error('Campaign persistence (update) failed:', err);
  }
}

/** Records one generated image's outcome against the campaign. */
export async function persistImageResult(
  campaignId: string,
  result: {
    sequenceNumber: number;
    imageRole: string;
    imageJob: string;
    status: 'done' | 'error';
    isPreview?: boolean;
    watermarked?: boolean;
    storagePath?: string | null;
    error?: string;
  },
): Promise<void> {
  const db = getSupabaseAdminClient();
  if (!db) return;
  try {
    await db.from('campaign_images').upsert(
      {
        campaign_id: campaignId,
        sequence_number: result.sequenceNumber,
        image_role: result.imageRole,
        image_job: result.imageJob,
        status: result.status,
        is_preview: result.isPreview ?? false,
        watermarked: result.watermarked ?? false,
        storage_path: result.storagePath ?? null,
        error: result.error ?? null,
      },
      { onConflict: 'campaign_id,sequence_number' },
    );
  } catch (err) {
    console.error('Campaign persistence (image) failed:', err);
  }
}
