import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import sharp from 'sharp';
import { resolveReferences, studioImageById } from '@/lib/studio/manifest';

export const runtime = 'nodejs';
export const maxDuration = 300;

// INTERNAL TOOL — never reachable in production.
//
// This route writes files into the repo and spends real money per call, so it refuses to run
// outside development. If you ever want it on a deployed preview, put it behind real auth
// first; do not just delete this guard.
function forbidden(): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available.' }, { status: 404 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const blocked = forbidden();
  if (blocked) return blocked;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server is missing OPENAI_API_KEY.' }, { status: 500 });
  }

  let body: { id?: string; quality?: 'low' | 'medium' | 'high' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const image = body.id ? studioImageById(body.id) : undefined;
  if (!image) {
    return NextResponse.json({ error: 'Unknown image id.' }, { status: 404 });
  }

  // A missing dependency is the one failure worth catching before spending anything: without the
  // root shot, a "before" photo is generated from nothing and comes back as a different item in a
  // different room, which is precisely the bug the chain exists to prevent.
  const missingDeps: string[] = [];
  for (const depId of image.dependsOn) {
    const dep = studioImageById(depId);
    if (!dep) continue;
    const abs = path.join(process.cwd(), 'public', dep.path.replace(/^\//, ''));
    try {
      await fs.access(abs);
    } catch {
      missingDeps.push(depId);
    }
  }
  if (missingDeps.length) {
    return NextResponse.json(
      {
        error: `Generate ${missingDeps.join(', ')} first — this shot is derived from it.`,
        missingDependencies: missingDeps,
      },
      { status: 409 },
    );
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
  const quality = body.quality ?? 'high';

  try {
    // References are what keep one chair, one mower, one washer running through the whole site.
    // Without them the same item drifts into a different item section by section.
    const refs = await Promise.all(
      resolveReferences(image).map(async (p) => {
        const abs = path.join(process.cwd(), 'public', p.replace(/^\//, ''));
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
    if (!b64) {
      return NextResponse.json({ error: 'No image returned by the API.' }, { status: 502 });
    }

    // Convert to WebP and cap the long edge before writing -- raw output is ~1.5MB per image and
    // nothing on the site displays larger than ~760px.
    const optimised = await sharp(Buffer.from(b64, 'base64'))
      .resize({ width: 1100, height: 1100, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const dest = path.join(process.cwd(), 'public', image.path.replace(/^\//, ''));
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, optimised);

    return NextResponse.json({
      ok: true,
      id: image.id,
      path: image.path,
      bytes: optimised.length,
      usedReferences: refs.length,
    });
  } catch (err) {
    console.error('Studio generation failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed.' },
      { status: 500 },
    );
  }
}
