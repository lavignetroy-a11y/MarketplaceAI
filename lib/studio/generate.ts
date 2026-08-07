import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import sharp from 'sharp';
import { resolveReferences, studioImageById, type StudioImage } from './manifest';
import type { StudioQuality } from './cost';

// The one place an image actually gets generated. Both the /studio UI route and the batch CLI
// call this, so a fix to prompting, sizing, or file handling lands in both at once.
//
// StudioQuality is defined in ./cost because that module has no node-only imports and can be
// pulled into the client bundle; this one drags in sharp and openai and cannot.

export type { StudioQuality };

export class MissingDependencyError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Generate ${missing.join(', ')} first — this shot is derived from it.`);
    this.name = 'MissingDependencyError';
  }
}

const publicPath = (p: string) => path.join(process.cwd(), 'public', p.replace(/^\//, ''));

/** Ids this image is derived from whose output isn't on disk yet. */
export async function missingDependencies(image: StudioImage): Promise<string[]> {
  const missing: string[] = [];
  for (const depId of image.dependsOn) {
    const dep = studioImageById(depId);
    if (!dep) continue;
    try {
      await fs.access(publicPath(dep.path));
    } catch {
      missing.push(depId);
    }
  }
  return missing;
}

export async function imageExists(image: StudioImage): Promise<boolean> {
  try {
    await fs.access(publicPath(image.path));
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates one image and writes it into public/. Throws MissingDependencyError if the shot is
 * derived from a root that hasn't been generated -- without that reference the model invents a
 * different item in a different room, which is the exact failure the chain exists to prevent.
 */
export async function generateStudioImage(
  image: StudioImage,
  quality: StudioQuality,
  apiKey: string,
): Promise<{ bytes: number; usedReferences: number }> {
  const missing = await missingDependencies(image);
  if (missing.length) throw new MissingDependencyError(missing);

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

  const refs = await Promise.all(
    resolveReferences(image).map(async (p) => {
      const abs = publicPath(p);
      const buf = await fs.readFile(abs);
      return new File([new Uint8Array(buf)], path.basename(abs), { type: 'image/webp' });
    }),
  );

  const result = refs.length
    ? await client.images.edit({
        model,
        image: refs,
        prompt: image.prompt,
        n: 1,
        size: image.size,
        quality,
      })
    : await client.images.generate({
        model,
        prompt: image.prompt,
        n: 1,
        size: image.size,
        quality,
      });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image returned by the API.');

  // Convert to WebP and cap the long edge before writing -- raw output is ~1.5MB per image and
  // nothing on the site displays larger than ~760px.
  const optimised = await sharp(Buffer.from(b64, 'base64'))
    .resize({ width: 1100, height: 1100, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const dest = publicPath(image.path);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, optimised);

  return { bytes: optimised.length, usedReferences: refs.length };
}
