import { NextRequest, NextResponse } from 'next/server';
import { studioImageById } from '@/lib/studio/manifest';
import {
  generateStudioImage,
  MissingDependencyError,
  type StudioQuality,
} from '@/lib/studio/generate';

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

  let body: { id?: string; quality?: StudioQuality };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const image = body.id ? studioImageById(body.id) : undefined;
  if (!image) {
    return NextResponse.json({ error: 'Unknown image id.' }, { status: 404 });
  }

  try {
    const { bytes, usedReferences } = await generateStudioImage(
      image,
      body.quality ?? 'high',
      apiKey,
    );
    return NextResponse.json({ ok: true, id: image.id, path: image.path, bytes, usedReferences });
  } catch (err) {
    if (err instanceof MissingDependencyError) {
      return NextResponse.json({ error: err.message, missingDependencies: err.missing }, { status: 409 });
    }
    console.error('Studio generation failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed.' },
      { status: 500 },
    );
  }
}
