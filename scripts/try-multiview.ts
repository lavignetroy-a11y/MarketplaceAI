/**
 * Generate four viewpoints of one item in a SINGLE image, then slice them apart.
 *
 *   npm run studio:multiview -- riding-mower
 *
 * Four separate text-to-image calls are four independent rolls of the dice: the item drifts
 * between them because nothing forces the model to reconcile them. Four panels inside one frame
 * have to be reconciled -- the model composes them together, so the object stays the same object
 * and the location stays the same location. It is how consistent character sheets are made, and
 * the same reasoning applies to photographing one mower from four bearings.
 *
 * Deliberately a standalone experiment rather than wired into the manifest. The manifest maps one
 * id to one file, and multi-view breaks that assumption; there is no point restructuring it
 * before knowing whether the technique works.
 */
import { loadEnvConfig } from '@next/env';
import fs from 'fs/promises';
import OpenAI from 'openai';
import sharp from 'sharp';
import { itemByKey, ITEMS } from '../lib/studio/items';
import { describePlace, CONTINUITY_CONTRACT } from '../lib/studio/place';
import { STYLE_CONTRACT } from '../lib/studio/styleContract';

loadEnvConfig(process.cwd());

const argv = process.argv.slice(2);
const key = argv.find((a) => !a.startsWith('--'));
const quality = (argv.includes('--high') ? 'high' : argv.includes('--medium') ? 'medium' : 'low') as
  'low' | 'medium' | 'high';

if (!key) {
  console.error('\n  Usage: npm run studio:multiview -- <item-key> [--medium|--high]\n');
  console.error(ITEMS.map((i) => `    ${i.key}`).join('\n') + '\n');
  process.exit(1);
}
const item = itemByKey(key);
if (!item) {
  console.error(`\n  No item "${key}".\n`);
  process.exit(1);
}

// Panels are named by clock bearing so the model places the camera rather than turning the item.
const PANELS = [
  { at: '10:30', label: 'front-left', looking: 'back across the item toward 4:30' },
  { at: '1:30', label: 'front-right', looking: 'back across the item toward 7:30' },
  { at: '4:30', label: 'rear-right', looking: 'forward across the item toward 10:30' },
  { at: '7:30', label: 'rear-left', looking: 'forward across the item toward 1:30' },
];

const prompt = `
${STYLE_CONTRACT}

THIS IMAGE
A single square image divided into a clean 2x2 grid of four separate photographs, with a thin
white gutter between them and no labels, captions, numbers, or borders of any kind.

All four are photographs of THE SAME ONE physical object, standing in THE SAME ONE place, taken
minutes apart by a person walking around it. The object never moves. Only the photographer moves.

  TOP LEFT      camera at ${PANELS[0].at} o'clock, looking ${PANELS[0].looking}
  TOP RIGHT     camera at ${PANELS[1].at} o'clock, looking ${PANELS[1].looking}
  BOTTOM LEFT   camera at ${PANELS[3].at} o'clock, looking ${PANELS[3].looking}
  BOTTOM RIGHT  camera at ${PANELS[2].at} o'clock, looking ${PANELS[2].looking}

Each panel is a full, properly composed photograph in its own right: the whole object in frame at
chest height, level, with room around it. The four must be visibly different views -- a person
who walked a full circle. None may be another mirrored, and none may show the object turned round
to face the camera.

THE OBJECT
${item.description}
Its real condition stays plainly visible in every panel: ${item.condition}.

${item.place ? describePlace(item.place) : ''}

${CONTINUITY_CONTRACT}

8. THE FOUR PANELS MUST AGREE. Every panel shows the same object with the same paint, the same
   wear in the same places, the same tyres, the same seat. The ground, the walls, the light and
   the weather are identical across all four, because all four were taken in one place within a
   few minutes. Any difference between panels other than camera position is an error.
`.trim();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('  OPENAI_API_KEY not found in .env.local\n');
  process.exit(1);
}

async function main() {
  console.log(`\n  ${item!.label} — four viewpoints in one image, ${quality} quality\n`);
  const client = new OpenAI({ apiKey });
  const began = Date.now();

  const res = await client.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2',
    prompt,
    n: 1,
    size: '1024x1024',
    quality,
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image returned.');

  await fs.mkdir('.shots', { recursive: true });
  const whole = `.shots/multiview-${item!.key}.png`;
  const buf = Buffer.from(b64, 'base64');
  await fs.writeFile(whole, buf);

  // Slice the grid so each panel can be judged, and used, on its own.
  const { width = 1024, height = 1024 } = await sharp(buf).metadata();
  const half = { w: Math.floor(width / 2), h: Math.floor(height / 2) };
  const order = [PANELS[0], PANELS[1], PANELS[3], PANELS[2]]; // TL, TR, BL, BR
  for (const [i, panel] of order.entries()) {
    await sharp(buf)
      .extract({
        left: (i % 2) * half.w,
        top: Math.floor(i / 2) * half.h,
        width: half.w,
        height: half.h,
      })
      .toFile(`.shots/multiview-${item!.key}-${panel.label}.png`);
  }

  console.log(`  done in ${((Date.now() - began) / 1000).toFixed(1)}s`);
  console.log(`\n  Whole grid:  ${whole}`);
  console.log(`  Panels:      ${order.map((p) => p.label).join(', ')}\n`);
}

main().catch((e) => {
  console.error('\n  Failed:', e instanceof Error ? e.message : e, '\n');
  process.exit(1);
});
