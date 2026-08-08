import type OpenAI from 'openai';
import { withPhotoContract } from './photoContract';
import type { ShotOrientation, ShotPlan, SourcePhoto } from './types';

const MAX_REFERENCE_IMAGES = 12;

function toFile(source: SourcePhoto): File {
  return new File([new Uint8Array(source.data)], source.fileName, { type: source.mimeType });
}

function pickReferenceSources(sources: SourcePhoto[], max: number): SourcePhoto[] {
  if (sources.length <= max) return sources;
  const step = sources.length / max;
  const picked: SourcePhoto[] = [];
  for (let i = 0; i < max; i++) {
    picked.push(sources[Math.floor(i * step)]);
  }
  return picked;
}

function sizeForOrientation(orientation: ShotOrientation): '1024x1024' | '1024x1536' | '1536x1024' {
  if (orientation === 'portrait') return '1024x1536';
  if (orientation === 'landscape') return '1536x1024';
  return '1024x1024';
}

// Used for productionMode "independent" (no hero involved) and "hero_reference" (hero attached
// alongside the original sources as a soft style/material/lighting reference -- not pixel-exact).
export async function generateShotImage(
  client: OpenAI,
  shot: ShotPlan,
  sources: SourcePhoto[],
  heroReference: SourcePhoto | null,
): Promise<string> {
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

  const referenceBudget = heroReference ? MAX_REFERENCE_IMAGES - 1 : MAX_REFERENCE_IMAGES;
  const references = pickReferenceSources(sources, referenceBudget).map(toFile);
  if (heroReference) references.push(toFile(heroReference));

  const result = await client.images.edit({
    model,
    image: references,
    // The camera moves in these modes, so the shot is composed fresh and the SETTING clause applies.
    prompt: withPhotoContract(shot.prompt, shot.classification, false),
    n: 1,
    size: sizeForOrientation(shot.orientation),
    quality: 'high',
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('Image generation returned no image data.');
  }
  return `data:image/png;base64,${b64}`;
}

// Used for productionMode "hero_edit": the hero image is the SOLE input being edited, which is
// what makes the background genuinely pixel-consistent (edit mode preserves whatever the prompt
// doesn't describe changing). Only valid when the shot keeps the hero's exact camera framing --
// the output size is forced to match the hero's own size rather than the shot's own orientation
// field, since resizing the canvas would risk the model filling in new background area.
export async function editHeroImage(
  client: OpenAI,
  shot: ShotPlan,
  heroReference: SourcePhoto,
  heroOrientation: ShotOrientation,
): Promise<string> {
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

  const result = await client.images.edit({
    model,
    image: toFile(heroReference),
    prompt: withPhotoContract(shot.prompt, shot.classification, true),
    n: 1,
    size: sizeForOrientation(heroOrientation),
    quality: 'high',
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('Image generation returned no image data.');
  }
  return `data:image/png;base64,${b64}`;
}

// Used for productionMode "source_edit": a specific original source photo is the SOLE input
// being edited (same guarantee as editHeroImage, but anchored to a real photo instead of the
// generated hero). This is the strongest defense against geometry errors -- since the model
// never has to reconstruct structure, it can't mirror or flip an asymmetric feature it's simply
// preserving. Output size matches the shot's own orientation, since there's no prior generated
// canvas size to stay locked to.
export async function editSourceImage(
  client: OpenAI,
  shot: ShotPlan,
  sourcePhoto: SourcePhoto,
): Promise<string> {
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

  const result = await client.images.edit({
    model,
    image: toFile(sourcePhoto),
    prompt: withPhotoContract(shot.prompt, shot.classification, true),
    n: 1,
    size: sizeForOrientation(shot.orientation),
    quality: 'high',
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('Image generation returned no image data.');
  }
  return `data:image/png;base64,${b64}`;
}

export function dataUrlToSourcePhoto(dataUrl: string, fileName: string): SourcePhoto {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) {
    throw new Error('Invalid data URL.');
  }
  return {
    fileName,
    mimeType: match[1],
    data: Buffer.from(match[2], 'base64'),
  };
}
