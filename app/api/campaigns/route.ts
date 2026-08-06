import { NextRequest, NextResponse } from 'next/server';
import { createJob } from '@/lib/campaign/store';
import { runPreview } from '@/lib/campaign/pipeline';
import { MAX_IMAGES, MAX_SOURCE_PHOTOS, MIN_IMAGES } from '@/lib/config/pricing';
import type { SourcePhoto } from '@/lib/campaign/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Server is missing OPENAI_API_KEY. Set it in .env.local and restart the server.' },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form submission.' }, { status: 400 });
  }

  const photoEntries = formData
    .getAll('photos')
    .filter((v): v is File => v instanceof File && v.size > 0);

  if (photoEntries.length === 0) {
    return NextResponse.json({ error: 'Please upload at least one photo.' }, { status: 400 });
  }
  if (photoEntries.length > MAX_SOURCE_PHOTOS) {
    return NextResponse.json(
      { error: `Please upload at most ${MAX_SOURCE_PHOTOS} photos of one item.` },
      { status: 400 },
    );
  }

  const countRaw = Number(formData.get('count'));
  if (!Number.isInteger(countRaw) || countRaw < MIN_IMAGES || countRaw > MAX_IMAGES) {
    return NextResponse.json(
      { error: `Image count must be a whole number between ${MIN_IMAGES} and ${MAX_IMAGES}.` },
      { status: 400 },
    );
  }

  const sellerNotesRaw = formData.get('notes');
  const sellerNotes = typeof sellerNotesRaw === 'string' ? sellerNotesRaw : '';

  const userIdRaw = formData.get('userId');
  const userId = typeof userIdRaw === 'string' && userIdRaw ? userIdRaw : null;

  const sources: SourcePhoto[] = [];
  for (const file of photoEntries) {
    sources.push({
      fileName: file.name,
      mimeType: file.type || 'image/jpeg',
      data: Buffer.from(await file.arrayBuffer()),
    });
  }

  const job = createJob(countRaw, sellerNotes, sources, userId);

  // Fire-and-forget: phase 1 (analysis + free watermarked preview) runs after this response.
  // Relies on the Node process staying alive -- fine for `next dev` / `next start`, and would
  // need a queue (the master prompt names Inngest) on a serverless deployment.
  void runPreview(job.id);

  return NextResponse.json({ jobId: job.id, priceCents: job.priceCents });
}
