import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const DEFAULT_PROMPT =
  'Enhance this photo for an online marketplace listing: improve lighting, sharpness, color balance, and background, while keeping the subject accurate and unaltered.';

const MIN_COUNT = 1;
const MAX_COUNT = 4;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
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

  const photo = formData.get('photo');
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: 'Please upload a photo.' }, { status: 400 });
  }

  const countRaw = Number(formData.get('count'));
  const count = Number.isFinite(countRaw)
    ? Math.min(Math.max(Math.round(countRaw), MIN_COUNT), MAX_COUNT)
    : 1;

  const promptRaw = formData.get('prompt');
  const prompt =
    typeof promptRaw === 'string' && promptRaw.trim().length > 0 ? promptRaw.trim() : DEFAULT_PROMPT;

  const client = new OpenAI({ apiKey });

  try {
    const result = await client.images.edit({
      model: 'gpt-image-1',
      image: photo,
      prompt,
      n: count,
      size: 'auto',
    });

    const images = (result.data ?? [])
      .map((item) => item.b64_json)
      .filter((b64): b64 is string => Boolean(b64))
      .map((b64) => `data:image/png;base64,${b64}`);

    if (images.length === 0) {
      return NextResponse.json({ error: 'The API did not return any images.' }, { status: 502 });
    }

    return NextResponse.json({ images });
  } catch (err: unknown) {
    console.error('Image generation failed:', err);
    const message = err instanceof Error ? err.message : 'Image generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
