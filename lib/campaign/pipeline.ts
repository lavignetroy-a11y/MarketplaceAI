import OpenAI from 'openai';
import { analyzeCampaign } from './analyze';
import {
  dataUrlToSourcePhoto,
  editHeroImage,
  editSourceImage,
  generateShotImage,
} from './generateImages';
import { getJob, persistImageResult, setProgress, setStatus, updateJob } from './store';
import { applyPreviewWatermark, bufferToDataUrl, dataUrlToBuffer } from './watermark';
import { storeCampaignImage } from './storage';
import { readSceneFromHero, sceneClause, type SceneLock } from './sceneLock';
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

async function generateOneShot(
  client: OpenAI,
  shot: ShotPlan,
  sources: SourcePhoto[],
  heroReference: SourcePhoto | null,
  heroOrientation: ShotOrientation | null,
  scene: SceneLock | null = null,
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

  // The locked scene is prepended to the shot text so it carries the shot's precedence. Passing
  // the hero as a reference image was supposed to hold the room together and does not -- an edit
  // model handed several references averages them rather than matching one, which is how a dining
  // table ended up present in one frame of a set and absent from the next.
  const staged: ShotPlan = scene
    ? { ...shot, prompt: `${sceneClause(scene)}\n\n${shot.prompt}` }
    : shot;

  try {
    let image: string;
    if (staged.productionMode === 'source_edit') {
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
    const heroResult = await generateOneShot(client, heroShot, job.sources, null, null);

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
          scene,
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
  } catch (err) {
    setStatus(jobId, 'failed');
    updateJob(jobId, { error: err instanceof Error ? err.message : 'Campaign generation failed.' });
  }
}
