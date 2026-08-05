import { NextRequest, NextResponse } from 'next/server';
import { createJob } from '@/lib/campaign/store';
import { runCampaign } from '@/lib/campaign/pipeline';
import type { RequestedImageCount, SourcePhoto } from '@/lib/campaign/types';

export const runtime = 'nodejs';

const VALID_COUNTS: RequestedImageCount[] = [4, 6, 8, 10];
const MAX_SOURCE_PHOTOS = 30;

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

  const photoEntries = formData.getAll('photos').filter((v): v is File => v instanceof File && v.size > 0);
  if (photoEntries.length === 0) {
    return NextResponse.json({ error: 'Please upload at least one photo.' }, { status: 400 });
  }
  if (photoEntries.length > MAX_SOURCE_PHOTOS) {
    return NextResponse.json(
      { error: `Please upload at most ${MAX_SOURCE_PHOTOS} photos.` },
      { status: 400 },
    );
  }

  const countRaw = Number(formData.get('count'));
  if (!VALID_COUNTS.includes(countRaw as RequestedImageCount)) {
    return NextResponse.json({ error: 'count must be 4, 6, 8, or 10.' }, { status: 400 });
  }
  const requestedCount = countRaw as RequestedImageCount;

  const sellerNotesRaw = formData.get('notes');
  const sellerNotes = typeof sellerNotesRaw === 'string' ? sellerNotesRaw : '';

  const sources: SourcePhoto[] = [];
  for (const file of photoEntries) {
    const buffer = Buffer.from(await file.arrayBuffer());
    sources.push({
      fileName: file.name,
      mimeType: file.type || 'image/jpeg',
      data: buffer,
    });
  }

  const job = createJob(requestedCount, sellerNotes, sources);

  // Fire-and-forget: the pipeline runs after this response is sent. This relies on the Node
  // process staying alive (fine for `next dev` / `next start`), and won't work unmodified on a
  // serverless platform where the function exits once the response is returned.
  void runCampaign(job.id);

  return NextResponse.json({ jobId: job.id });
}
