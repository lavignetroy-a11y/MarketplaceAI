import sharp from 'sharp';

// The free preview image is watermarked so a seller can judge real quality on their own item
// before paying, without the unwatermarked file being usable in a listing.
//
// Deliberately a tiled diagonal wordmark rather than a single centre stamp: a corner stamp is
// trivially cropped out, and a single large stamp hides the very detail the preview exists to
// demonstrate. Tiling keeps the item legible while making the file unusable as-is.

const WORDMARK = 'MARKETPLACE / AI  ·  PREVIEW';

/**
 * Diagonal bars, drawn as plain rectangles.
 *
 * The wordmark below is SVG TEXT, and sharp renders SVG through librsvg, which needs system fonts.
 * A container without them renders the text as nothing at all -- silently. The preview would look
 * perfect in development and ship completely clean in production, giving away the one file the
 * payment gate exists to protect, with no error anywhere to notice.
 *
 * Rectangles need no font and cannot fail that way. They are the floor: even in the worst case the
 * preview is visibly marked and unusable as a listing image.
 */
function barsSvg(width: number, height: number): string {
  const band = Math.max(10, Math.round(width / 90));
  const gap = band * 9;
  const bars: string[] = [];
  for (let x = -height; x < width + height; x += gap) {
    bars.push(
      `<rect x="${x}" y="${-height}" width="${band}" height="${height * 3}" ` +
        `fill="#ffffff" fill-opacity="0.16"/>`,
    );
  }
  return `<g transform="rotate(-30 ${width / 2} ${height / 2})">${bars.join('')}</g>`;
}

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
      ${barsSvg(width, height)}
      <g transform="rotate(-30 ${width / 2} ${height / 2})">
        ${rows.join('')}
      </g>
    </svg>`,
  );
}

/**
 * Applies the preview watermark to a PNG/JPEG/WebP buffer, returning a WebP buffer.
 *
 * Throws rather than returning the original if compositing fails. A caller that quietly fell back
 * to the clean image on error would hand out the unwatermarked file precisely when something was
 * wrong -- the preview being marked is a revenue control, not a decoration, so failing loudly is
 * the safe direction.
 */
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

/**
 * Whether the running environment can render SVG text.
 *
 * Reported by /api/health so a fontless container is discovered from a status check rather than
 * from a seller noticing their free preview was perfectly usable.
 */
export async function canRenderWatermarkText(): Promise<boolean> {
  try {
    const size = 200;
    const withText = await sharp({
      create: { width: size, height: size, channels: 3, background: '#000000' },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
               <text x="8" y="120" font-family="Helvetica, Arial, sans-serif" font-size="72"
                     fill="#ffffff">ABC</text></svg>`,
          ),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();
    // Nothing drawn leaves the canvas pure black.
    const { channels } = await sharp(withText).stats();
    return channels[0].max > 10;
  } catch {
    return false;
  }
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
