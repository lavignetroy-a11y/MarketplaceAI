import OpenAI from 'openai';
import { analyzeCampaign } from './analyze';
import {
  dataUrlToSourcePhoto,
  editHeroImage,
  editSourceImage,
  generateFromKnowledge,
  generateShotImage,
} from './generateImages';
import { getJob, persistImageResult, setProgress, setStatus, updateJob } from './store';
import { applyPreviewWatermark, bufferToDataUrl, dataUrlToBuffer } from './watermark';
import { storeCampaignImage } from './storage';
import {
  plannedSettingClause,
  readSceneFromHero,
  sceneClause,
  type SceneLock,
} from './sceneLock';
import { presentationClause, type PresentationPlan } from './presentation';
import { productClause, type ProductLock } from './productLock';
import { sendEmail } from '@/lib/email/send';
import { setFailedEmail, setReadyEmail } from '@/lib/email/templates';
import { siteUrl } from '@/lib/stripe';
import {
  GENERATION_CONCURRENCY,
  type CampaignProgress,
  type GeneratedShotResult,
  type ShotOrientation,
  type ShotPlan,
  type SourcePhoto,
} from './types';

// The pipeline runs in two phases around the payment gate:
//
//   Phase 1 (free)  -- analyse the set, generate the hero, watermark it. This is the proof a
//                      seller sees on their own item before spending anything.
//   Phase 2 (paid)  -- generate every remaining shot and release the hero unwatermarked.
//
// Splitting it this way means exactly one image is generated for a visitor who never pays,
// which is what keeps the economics viable at $1/image.

/**
 * Everything prepended to a shot's own prompt before it reaches the image model.
 *
 * All of it lives in the SHOT half rather than the photographic contract, because the contract is
 * explicitly subordinate to the shot text -- a general standard sitting above a per-shot prompt
 * loses every argument with it. Anything that must actually happen has to be down here.
 */
type Staging = {
  /** What the object actually is. Goes first, and applies to every shot including the hero. */
  product?: ProductLock | null;
  /** The room read out of the finished hero. Used by every shot after the hero. */
  scene?: SceneLock | null;
  /** The room the planner chose. Used by the hero, which has no earlier shot to match. */
  plannedSetting?: string;
  /** The ten minutes before the shutter, decided for this item. */
  presentation?: PresentationPlan | null;
};

export function stage(shot: ShotPlan, staging: Staging): ShotPlan {
  // A shot whose input IS the photograph -- source_edit editing a real upload, hero_edit editing
  // the approved hero -- already has its room, and its whole value is that the room came from a
  // camera rather than from a description.
  //
  // Handing one of those a paragraph headed "THE SET -- BUILD THIS ROOM" destroys it. That is not
  // a theory: a set of five source_edit shots -- a washer drum, a dryer drum, a control panel, a
  // model label, a condition close-up, every one of them anchored to a real photograph -- all came
  // back as fresh wide renders of an invented laundry room, because each was told to build one.
  // The single most useful images in the set were overwritten by the instruction meant to make the
  // OTHER images consistent.
  const preserveSetting =
    shot.productionMode === 'source_edit' || shot.productionMode === 'hero_edit';

  const parts: string[] = [];
  // Order is precedence. The object comes before the room, which comes before its preparation,
  // which comes before the framing -- a beautiful photograph of the wrong item is worth less than
  // a plain photograph of the right one, so that is the order they should win arguments in.
  if (staging.product) parts.push(productClause(staging.product, shot.classification, preserveSetting));

  if (!preserveSetting) {
    // The scene lock's own description of the item is suppressed when a product lock is present:
    // it is read from the generated hero and would otherwise be a second, contradictory spec.
    if (staging.scene) parts.push(sceneClause(staging.scene, !staging.product));
    else if (staging.plannedSetting) parts.push(plannedSettingClause(staging.plannedSetting));
  }

  if (staging.presentation) {
    const clause = presentationClause(staging.presentation, shot.classification);
    if (clause) parts.push(clause);
  }
  if (!parts.length) return shot;
  return { ...shot, prompt: `${parts.join('\n\n')}\n\n${shot.prompt}` };
}

async function generateOneShot(
  client: OpenAI,
  shot: ShotPlan,
  sources: SourcePhoto[],
  heroReference: SourcePhoto | null,
  heroOrientation: ShotOrientation | null,
  staging: Staging = {},
): Promise<GeneratedShotResult> {
  const needsHero = shot.productionMode === 'hero_edit' || shot.productionMode === 'hero_reference';
  if (needsHero && (!heroReference || !heroOrientation)) {
    return {
      sequenceNumber: shot.sequenceNumber,
      imageRole: shot.imageRole,
      imageJob: shot.imageJob,
      status: 'error',
      error: 'Skipped because the hero image failed to generate.',
    };
  }

  if (
    shot.productionMode === 'source_edit' &&
    (shot.sourcePhotoIndex === null || !sources[shot.sourcePhotoIndex])
  ) {
    return {
      sequenceNumber: shot.sequenceNumber,
      imageRole: shot.imageRole,
      imageJob: shot.imageJob,
      status: 'error',
      error: 'Skipped because the shot plan referenced an invalid source photo.',
    };
  }

  // The room and the preparation are prepended to the shot text so they carry the shot's
  // precedence. Passing the hero as a reference image was supposed to hold the room together and
  // does not -- an edit model handed several references averages them rather than matching one,
  // which is how a dining table ended up present in one frame of a set and absent from the next.
  const staged = stage(shot, staging);

  try {
    let image: string;
    if (staged.productionMode === 'known_product') {
      // No reference image at all -- see generateFromKnowledge for why that is the point.
      image = await generateFromKnowledge(client, staged);
    } else if (staged.productionMode === 'source_edit') {
      image = await editSourceImage(client, staged, sources[staged.sourcePhotoIndex as number]);
    } else if (staged.productionMode === 'hero_edit') {
      image = await editHeroImage(
        client,
        staged,
        heroReference as SourcePhoto,
        heroOrientation as ShotOrientation,
      );
    } else {
      image = await generateShotImage(
        client,
        staged,
        sources,
        staged.productionMode === 'hero_reference' ? heroReference : null,
      );
    }
    return {
      sequenceNumber: shot.sequenceNumber,
      imageRole: shot.imageRole,
      imageJob: shot.imageJob,
      status: 'done',
      image,
    };
  } catch (err) {
    return {
      sequenceNumber: shot.sequenceNumber,
      imageRole: shot.imageRole,
      imageJob: shot.imageJob,
      status: 'error',
      error: err instanceof Error ? err.message : 'Image generation failed.',
    };
  }
}

/**
 * Runs `work` over every item with at most `limit` in flight, calling `onSettled` as each one
 * lands. Results come back in input order regardless of the order they finished in.
 *
 * Written out rather than pulled in as a dependency because it is a dozen lines and the shape of
 * it matters here: the shared cursor is what makes a worker pick up the next shot the instant it
 * frees up, so the pool stays full instead of proceeding in lockstep waves.
 */
async function pool<T, R>(
  items: T[],
  limit: number,
  work: (item: T) => Promise<R>,
  onSettled: (result: R) => void,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      const result = await work(items[i]);
      results[i] = result;
      onSettled(result);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

/**
 * Tells the buyer their set is finished, or that it failed.
 *
 * Silence after a payment is the worst outcome available: the seller has paid, has nothing, and
 * has no reason to think anybody knows. Saying so first, unprompted, is the difference between a
 * refund and a chargeback.
 */
async function notify(jobId: string, done: number, failed: number): Promise<void> {
  const job = getJob(jobId);
  if (!job?.buyerEmail) return;

  const campaignUrl = `${siteUrl()}/upload?campaign=${jobId}`;
  const message =
    done === 0
      ? setFailedEmail({ to: job.buyerEmail, campaignUrl })
      : setReadyEmail({
          to: job.buyerEmail,
          campaignUrl,
          imageCount: done,
          failedCount: failed,
          itemDescription: job.analysis?.productIdentity.itemType ?? null,
        });

  const sent = await sendEmail(message);
  if (!sent) console.error(`[email] Could not notify ${job.buyerEmail} about campaign ${jobId}`);
}

function openAiClient(jobId: string): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    setStatus(jobId, 'failed');
    updateJob(jobId, { error: 'Server is missing OPENAI_API_KEY.' });
    return null;
  }
  return new OpenAI({ apiKey });
}

/**
 * Phase 1 -- free. Analyses the uploaded set and generates a single watermarked hero image.
 * Stops at `preview_ready`; nothing further is generated until the campaign is paid for.
 */
export async function runPreview(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) return;

  const client = openAiClient(jobId);
  if (!client) return;

  try {
    setStatus(jobId, 'analyzing');
    const analysis = await analyzeCampaign(client, job.sources, job.requestedCount, job.sellerNotes);
    updateJob(jobId, { analysis });

    if (!analysis.readyForGeneration) {
      setStatus(jobId, 'needs_more_evidence', analysis.reasonNotReady);
      updateJob(jobId, {
        minimumAdditionalEvidenceNeeded: analysis.minimumAdditionalEvidenceNeeded,
      });
      return;
    }

    setStatus(jobId, 'generating_preview');
    const heroShot = analysis.shots[0];
    // The hero decides the whole set. It is the image the scene lock is later read out of, so a
    // hero that inherited the seller's garage propagates that garage into every shot behind it,
    // and a hero photographed with the cushions shoved sideways propagates that too. Both get
    // fixed here or not at all.
    const heroResult = await generateOneShot(client, heroShot, job.sources, null, null, {
      product: analysis.productLock,
      plannedSetting: analysis.environmentDescription,
      presentation: analysis.presentation,
    });

    if (heroResult.status !== 'done' || !heroResult.image) {
      setStatus(jobId, 'failed');
      updateJob(jobId, { error: heroResult.error ?? 'The preview image could not be generated.' });
      return;
    }

    // Keep the clean hero server-side; release only the watermarked copy until payment.
    const watermarked = bufferToDataUrl(
      await applyPreviewWatermark(dataUrlToBuffer(heroResult.image)),
    );

    const results: GeneratedShotResult[] = [
      { ...heroResult, previewImage: watermarked, isPreview: true },
    ];

    updateJob(jobId, {
      results,
      listingTitle: analysis.listingTitle,
      listingDescription: analysis.listingDescription,
    });
    const previewPath = await storeCampaignImage(
      jobId,
      job.userId,
      heroShot.sequenceNumber,
      `${heroShot.imageRole}-preview`,
      watermarked,
    );
    void persistImageResult(jobId, {
      sequenceNumber: heroShot.sequenceNumber,
      imageRole: heroShot.imageRole,
      imageJob: heroShot.imageJob,
      status: 'done',
      isPreview: true,
      watermarked: true,
      storagePath: previewPath,
    });

    setStatus(jobId, 'preview_ready');
  } catch (err) {
    setStatus(jobId, 'failed');
    updateJob(jobId, { error: err instanceof Error ? err.message : 'Preview generation failed.' });
  }
}

/**
 * Phase 2 -- paid. Generates every remaining shot through a bounded pool, reporting progress as
 * each lands, and releases the clean hero. Refuses to run unless the campaign has been marked paid.
 */
export async function runFullCampaign(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) return;

  if (!job.paid) {
    setStatus(jobId, 'failed');
    updateJob(jobId, { error: 'Campaign is not paid for.' });
    return;
  }

  const analysis = job.analysis;
  if (!analysis?.readyForGeneration || !job.results?.length) {
    setStatus(jobId, 'failed');
    updateJob(jobId, { error: 'No approved preview to build on.' });
    return;
  }

  const client = openAiClient(jobId);
  if (!client) return;

  try {
    const heroResult = job.results[0];
    const heroShot = analysis.shots[0];
    const heroReference = heroResult.image
      ? dataUrlToSourcePhoto(heroResult.image, 'approved_hero.png')
      : null;
    const heroOrientation = heroReference ? heroShot.orientation : null;

    // Read the room out of the approved hero once, then hand the same text to every remaining
    // shot. This is what makes the set look like one afternoon's work rather than five houses.
    let scene: SceneLock | null = null;
    if (heroReference) {
      try {
        scene = await readSceneFromHero(client, heroReference.data, analysis);
      } catch (err) {
        // Continuity is a large improvement, not a precondition. If the reader fails, the set is
        // still generated -- it just goes back to being as loose as it was before.
        console.error('Scene lock failed; continuing without it:', err);
      }
    }

    const pending = analysis.shots.slice(1);

    // The hero is already finished and paid for, so it counts as done from the outset -- otherwise
    // the bar would open at zero on a set that is genuinely one image in.
    const progress: CampaignProgress = {
      total: pending.length + 1,
      done: 1,
      failed: 0,
      startedAt: Date.now(),
      avgSeconds: null,
    };
    setProgress(jobId, progress);
    setStatus(jobId, 'generating');

    // Measured from real generations. A running mean beats a hardcoded guess, because how long a
    // shot takes depends on size, load, and how many retries it ate.
    //
    // Samples under this floor are thrown away: a shot rejected by the guards at the top of
    // generateOneShot returns in microseconds without ever calling the API, and averaging those
    // in would report a few seconds remaining on a set with fifteen real images still to make.
    const MIN_SAMPLE_SECONDS = 2;
    let sampleCount = 0;
    let sampleSeconds = 0;

    const remaining = await pool(
      pending,
      GENERATION_CONCURRENCY,
      async (shot) => {
        const startedAt = Date.now();
        const result = await generateOneShot(
          client,
          shot,
          job.sources,
          heroReference,
          heroOrientation,
          // plannedSetting is the fallback for a failed scene reader: without it, a set whose
          // continuity notes could not be written would go back to inheriting the seller's garage
          // one shot at a time.
          {
            product: analysis.productLock,
            scene,
            plannedSetting: analysis.environmentDescription,
            presentation: analysis.presentation,
          },
        );
        const elapsed = (Date.now() - startedAt) / 1000;
        if (elapsed >= MIN_SAMPLE_SECONDS) {
          sampleSeconds += elapsed;
          sampleCount += 1;
        }
        return result;
      },
      (result) => {
        if (result.status === 'done') progress.done += 1;
        else progress.failed += 1;
        progress.avgSeconds = sampleCount ? sampleSeconds / sampleCount : null;
        setProgress(jobId, progress);
      },
    );

    // The hero is no longer a preview -- payment releases the unwatermarked file.
    const releasedHero: GeneratedShotResult = {
      ...heroResult,
      previewImage: undefined,
      isPreview: false,
    };

    await Promise.all(
      [releasedHero, ...remaining].map(async (r) => {
        const path =
          r.status === 'done' && r.image
            ? await storeCampaignImage(jobId, job.userId, r.sequenceNumber, r.imageRole, r.image)
            : null;
        await persistImageResult(jobId, {
          sequenceNumber: r.sequenceNumber,
          imageRole: r.imageRole,
          imageJob: r.imageJob,
          status: r.status,
          isPreview: false,
          watermarked: false,
          storagePath: path,
          error: r.error,
        });
      }),
    );

    const results = [releasedHero, ...remaining].sort(
      (a, b) => a.sequenceNumber - b.sequenceNumber,
    );

    setStatus(jobId, 'packaging');
    updateJob(jobId, { results });

    const done = results.filter((r) => r.status === 'done').length;
    if (done === results.length) {
      setStatus(jobId, 'completed');
    } else if (done > 0) {
      setStatus(jobId, 'incomplete', `${done} of ${results.length} images generated successfully.`);
    } else {
      setStatus(jobId, 'failed');
      updateJob(jobId, { error: 'All image generation attempts failed.' });
    }

    // Told now, on completion, rather than on payment -- an email sent when the money cleared would
    // arrive while there is still nothing to collect, and its link would open a page mid-generation.
    // Awaited rather than fired and forgotten, so a provider failure appears in this run's logs
    // next to the campaign it belongs to; sendEmail never throws, so it cannot break delivery.
    await notify(jobId, done, results.length - done);
  } catch (err) {
    setStatus(jobId, 'failed');
    updateJob(jobId, { error: err instanceof Error ? err.message : 'Campaign generation failed.' });
  }
}
