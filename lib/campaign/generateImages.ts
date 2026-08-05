import type OpenAI from 'openai';
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
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';

  const referenceBudget = heroReference ? MAX_REFERENCE_IMAGES - 1 : MAX_REFERENCE_IMAGES;
  const references = pickReferenceSources(sources, referenceBudget).map(toFile);
  if (heroReference) references.push(toFile(heroReference));

  const result = await client.images.edit({
    model,
    image: references,
    prompt: shot.prompt,
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
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';

  const result = await client.images.edit({
    model,
    image: toFile(heroReference),
    prompt: shot.prompt,
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
