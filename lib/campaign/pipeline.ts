import OpenAI from 'openai';
import { analyzeCampaign } from './analyze';
import {
  dataUrlToSourcePhoto,
  editHeroImage,
  editSourceImage,
  generateShotImage,
} from './generateImages';
import { getJob, persistImageResult, setStatus, updateJob } from './store';
import { applyPreviewWatermark, bufferToDataUrl, dataUrlToBuffer } from './watermark';
import { storeCampaignImage } from './storage';
import type { GeneratedShotResult, ShotOrientation, ShotPlan, SourcePhoto } from './types';

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

  try {
    let image: string;
    if (shot.productionMode === 'source_edit') {
      image = await editSourceImage(client, shot, sources[shot.sourcePhotoIndex as number]);
    } else if (shot.productionMode === 'hero_edit') {
      image = await editHeroImage(
        client,
        shot,
        heroReference as SourcePhoto,
        heroOrientation as ShotOrientation,
      );
    } else {
      image = await generateShotImage(
        client,
        shot,
        sources,
        shot.productionMode === 'hero_reference' ? heroReference : null,
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
 * Phase 2 -- paid. Generates every remaining shot in parallel and releases the clean hero.
 * Refuses to run unless the campaign has been marked paid.
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

    setStatus(jobId, 'generating');
    const remaining = await Promise.all(
      analysis.shots
        .slice(1)
        .map((shot) => generateOneShot(client, shot, job.sources, heroReference, heroOrientation)),
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
