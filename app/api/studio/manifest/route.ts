import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { resolveReferences, STUDIO_MANIFEST } from '@/lib/studio/manifest';

export const runtime = 'nodejs';

/** Lists every image the site needs, flagging which already exist on disk. Dev only. */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available.' }, { status: 404 });
  }

  const images = await Promise.all(
    STUDIO_MANIFEST.map(async (image) => {
      const abs = path.join(process.cwd(), 'public', image.path.replace(/^\//, ''));
      let exists = false;
      let bytes = 0;
      try {
        const stat = await fs.stat(abs);
        exists = true;
        bytes = stat.size;
      } catch {
        // not generated yet
      }
      return {
        id: image.id,
        path: image.path,
        group: image.group,
        label: image.label,
        size: image.size,
        references: resolveReferences(image).length,
        dependsOn: image.dependsOn,
        prompt: image.prompt,
        exists,
        bytes,
      };
    }),
  );

  return NextResponse.json({ images });
}
