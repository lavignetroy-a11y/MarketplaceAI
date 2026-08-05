import OpenAI from 'openai';
import { analyzeCampaign } from './analyze';
import { dataUrlToSourcePhoto, editHeroImage, generateShotImage } from './generateImages';
import { getJob, setStatus, updateJob } from './store';
import type { GeneratedShotResult, ShotOrientation, ShotPlan, SourcePhoto } from './types';

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

  try {
    const image =
      shot.productionMode === 'hero_edit'
        ? await editHeroImage(client, shot, heroReference as SourcePhoto, heroOrientation as ShotOrientation)
        : await generateShotImage(
            client,
            shot,
            sources,
            shot.productionMode === 'hero_reference' ? heroReference : null,
          );
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

export async function runCampaign(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) return;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    setStatus(jobId, 'failed');
    updateJob(jobId, { error: 'Server is missing OPENAI_API_KEY.' });
    return;
  }

  const client = new OpenAI({ apiKey });

  try {
    setStatus(jobId, 'analyzing');
    const analysis = await analyzeCampaign(client, job.sources, job.requestedCount, job.sellerNotes);
    updateJob(jobId, { analysis });

    if (!analysis.readyForGeneration) {
      setStatus(jobId, 'needs_more_evidence', analysis.reasonNotReady);
      updateJob(jobId, { minimumAdditionalEvidenceNeeded: analysis.minimumAdditionalEvidenceNeeded });
      return;
    }

    const [heroShot, ...remainingShots] = analysis.shots;

    setStatus(jobId, 'generating_hero');
    const heroResult = await generateOneShot(client, heroShot, job.sources, null, null);
    const heroReference =
      heroResult.status === 'done' && heroResult.image
        ? dataUrlToSourcePhoto(heroResult.image, 'approved_hero.png')
        : null;
    const heroOrientation = heroReference ? heroShot.orientation : null;

    setStatus(jobId, 'generating');
    const remainingResults = await Promise.all(
      remainingShots.map((shot) =>
        generateOneShot(client, shot, job.sources, heroReference, heroOrientation),
      ),
    );

    const results: GeneratedShotResult[] = [heroResult, ...remainingResults].sort(
      (a, b) => a.sequenceNumber - b.sequenceNumber,
    );

    setStatus(jobId, 'packaging');
    updateJob(jobId, {
      results,
      listingTitle: analysis.listingTitle,
      listingDescription: analysis.listingDescription,
    });

    const allSucceeded = results.every((r) => r.status === 'done');
    const anySucceeded = results.some((r) => r.status === 'done');

    if (allSucceeded) {
      setStatus(jobId, 'completed');
    } else if (anySucceeded) {
      setStatus(
        jobId,
        'incomplete',
        `${results.filter((r) => r.status === 'done').length} of ${results.length} images generated successfully.`,
      );
    } else {
      setStatus(jobId, 'failed');
      updateJob(jobId, { error: 'All image generation attempts failed.' });
    }
  } catch (err) {
    setStatus(jobId, 'failed');
    updateJob(jobId, { error: err instanceof Error ? err.message : 'Campaign generation failed.' });
  }
}
