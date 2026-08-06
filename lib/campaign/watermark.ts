import sharp from 'sharp';

// The free preview image is watermarked so a seller can judge real quality on their own item
// before paying, without the unwatermarked file being usable in a listing.
//
// Deliberately a tiled diagonal wordmark rather than a single centre stamp: a corner stamp is
// trivially cropped out, and a single large stamp hides the very detail the preview exists to
// demonstrate. Tiling keeps the item legible while making the file unusable as-is.

const WORDMARK = 'MARKETPLACE / AI  ·  PREVIEW';

function watermarkSvg(width: number, height: number): Buffer {
  // Scale the type to the image so the mark reads the same at any output size.
  const fontSize = Math.max(14, Math.round(width / 26));
  const stepX = fontSize * 22;
  const stepY = fontSize * 7;

  const rows: string[] = [];
  for (let y = -height; y < height * 2; y += stepY) {
    for (let x = -width; x < width * 2; x += stepX) {
      rows.push(
        `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}" ` +
          `font-weight="600" letter-spacing="${fontSize * 0.08}" fill="#ffffff" fill-opacity="0.42">${WORDMARK}</text>`,
      );
    }
  }

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <g transform="rotate(-30 ${width / 2} ${height / 2})">
        ${rows.join('')}
      </g>
    </svg>`,
  );
}

/** Applies the preview watermark to a PNG/JPEG/WebP buffer, returning a WebP buffer. */
export async function applyPreviewWatermark(input: Buffer): Promise<Buffer> {
  const image = sharp(input);
  const meta = await image.metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;

  return image
    .composite([{ input: watermarkSvg(width, height), top: 0, left: 0 }])
    .webp({ quality: 82 })
    .toBuffer();
}

/** Strips a data URL prefix and returns the raw bytes. */
export function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) throw new Error('Invalid data URL.');
  return Buffer.from(match[2], 'base64');
}

export function bufferToDataUrl(buffer: Buffer, mimeType = 'image/webp'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}
