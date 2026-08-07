import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { dataUrlToBuffer } from './watermark';

// Generated images live in a private Supabase Storage bucket. Without this, campaign rows
// record that a set was made but hold none of it -- account history would list sets whose
// images vanished with the server process.
//
// Paths are `{userId|anonymous}/{campaignId}/{NN}-{role}.webp`. Downloads always go through a
// short-lived signed URL minted server-side, so the bucket stays private.

const BUCKET = 'campaign-images';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function objectPath(
  userId: string | null | undefined,
  campaignId: string,
  sequenceNumber: number,
  role: string,
): string {
  const safeRole = role.replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'image';
  const seq = String(sequenceNumber).padStart(2, '0');
  return `${userId ?? 'anonymous'}/${campaignId}/${seq}-${safeRole}.webp`;
}

/**
 * Stores one generated image. Returns its storage path, or null when Supabase isn't configured
 * or the upload fails -- persistence is best-effort and never breaks generation.
 */
export async function storeCampaignImage(
  campaignId: string,
  userId: string | null | undefined,
  sequenceNumber: number,
  role: string,
  dataUrl: string,
): Promise<string | null> {
  const db = getSupabaseAdminClient();
  if (!db) return null;

  const path = objectPath(userId, campaignId, sequenceNumber, role);
  try {
    const { error } = await db.storage
      .from(BUCKET)
      .upload(path, dataUrlToBuffer(dataUrl), { contentType: 'image/webp', upsert: true });
    if (error) throw error;
    return path;
  } catch (err) {
    console.error('Campaign image upload failed:', err);
    return null;
  }
}

/** Mints a short-lived signed URL for a stored image. */
export async function signedUrlFor(path: string): Promise<string | null> {
  const db = getSupabaseAdminClient();
  if (!db) return null;
  try {
    const { data, error } = await db.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error) throw error;
    return data?.signedUrl ?? null;
  } catch (err) {
    console.error('Signed URL creation failed:', err);
    return null;
  }
}

/**
 * Rebuilds a campaign from the database for a browser that no longer has the in-process job --
 * a later visit, another device, or after a server restart.
 */
export async function loadPersistedCampaign(campaignId: string): Promise<{
  id: string;
  status: string;
  requestedCount: number;
  paid: boolean;
  priceCents: number;
  listingTitle: string | null;
  listingDescription: string | null;
  statusMessage: string | null;
  error: string | null;
  results: {
    sequenceNumber: number;
    imageRole: string;
    imageJob: string;
    status: 'done' | 'error';
    isPreview: boolean;
    image?: string;
    error?: string;
  }[];
} | null> {
  const db = getSupabaseAdminClient();
  if (!db) return null;

  try {
    const { data: campaign, error } = await db
      .from('campaigns')
      .select(
        'id,status,requested_count,paid,price_cents,listing_title,listing_description,status_message,error',
      )
      .eq('id', campaignId)
      .single();
    if (error || !campaign) return null;

    const { data: images } = await db
      .from('campaign_images')
      .select('sequence_number,image_role,image_job,status,storage_path,is_preview,error')
      .eq('campaign_id', campaignId)
      .order('sequence_number');

    const results = await Promise.all(
      (images ?? []).map(async (row) => {
        // The payment gate applies to persisted images too: an unpaid campaign only ever
        // returns its watermarked preview.
        const releasable = campaign.paid || row.is_preview;
        const image =
          releasable && row.storage_path ? ((await signedUrlFor(row.storage_path)) ?? undefined) : undefined;
        return {
          sequenceNumber: row.sequence_number as number,
          imageRole: (row.image_role as string) ?? '',
          imageJob: (row.image_job as string) ?? '',
          status: (row.status as 'done' | 'error') ?? 'error',
          isPreview: Boolean(row.is_preview),
          image,
          error: (row.error as string) ?? undefined,
        };
      }),
    );

    return {
      id: campaign.id as string,
      status: campaign.status as string,
      requestedCount: campaign.requested_count as number,
      paid: Boolean(campaign.paid),
      priceCents: campaign.price_cents as number,
      listingTitle: campaign.paid ? ((campaign.listing_title as string) ?? null) : null,
      listingDescription: campaign.paid ? ((campaign.listing_description as string) ?? null) : null,
      statusMessage: (campaign.status_message as string) ?? null,
      error: (campaign.error as string) ?? null,
      results,
    };
  } catch (err) {
    console.error('Loading persisted campaign failed:', err);
    return null;
  }
}
