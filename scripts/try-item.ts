/**
 * Iterate on one item's prompts until they're right.
 *
 *   npm run studio:try -- riding-mower
 *   npm run studio:try -- riding-mower --shots front-right,rear-left
 *   npm run studio:try -- riding-mower --prompt-only
 *
 * Regenerating 610 images to find out whether a wording change worked is the wrong feedback
 * loop -- it costs an afternoon and buries the one answer you wanted. This regenerates a single
 * item's set, forcing over what's already on disk, and writes a side-by-side contact sheet so
 * the whole set can be judged in one look rather than by opening files individually.
 *
 * A full six-shot set is roughly 4 cents at low quality, so a wording change can be tested,
 * looked at, and tested again in about two minutes.
 */
import { loadEnvConfig } from '@next/env';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { ITEMS, itemByKey } from '../lib/studio/items';
import { VOCABULARIES } from '../lib/studio/vocabularies';
import { STUDIO_MANIFEST, studioImageById } from '../lib/studio/manifest';
import { generateStudioImage } from '../lib/studio/generate';
import type { StudioQuality } from '../lib/studio/cost';

loadEnvConfig(process.cwd());

const argv = process.argv.slice(2);
const key = argv.find((a) => !a.startsWith('--'));
const flag = (n: string) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? undefined : argv[i + 1];
};

if (!key) {
  console.error('\n  Usage: npm run studio:try -- <item-key> [--shots a,b] [--prompt-only]\n');
  console.error('  Items:\n' + ITEMS.map((i) => `    ${i.key.padEnd(18)} ${i.label} (${i.vocabulary})`).join('\n') + '\n');
  process.exit(1);
}

const item = itemByKey(key)!;
if (!item) {
  console.error(`\n  No item "${key}". Run without arguments to list them.\n`);
  process.exit(1);
}

const only = flag('shots')?.split(',').map((s) => s.trim());
const quality = (flag('quality') ?? 'low') as StudioQuality;
const shots = VOCABULARIES[item.vocabulary].filter((s) => !only || only.includes(s.key));

// Every image on the site for this item, so the chain root is regenerated first.
const ids = STUDIO_MANIFEST
  .filter((i) => i.item === item.key && i.id.startsWith('item/'))
  .map((i) => i.id)
  .concat(
    STUDIO_MANIFEST
      .filter((i) => i.item === item.key && i.id.startsWith('reveal/'))
      .filter((i) => !only || only.some((k) => i.id.endsWith(`/${k}`)))
      .map((i) => i.id),
  );

console.log(`\n  ${item.label}  [${item.vocabulary}]  ${shots.length} shot${shots.length === 1 ? '' : 's'}\n`);

if (argv.includes('--prompt-only')) {
  for (const s of shots) {
    console.log(`${'─'.repeat(76)}\n${s.label}  (${s.size})\n${'─'.repeat(76)}`);
    console.log(s.brief(item) + '\n');
  }
  process.exit(0);
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('  OPENAI_API_KEY not found in .env.local\n');
  process.exit(1);
}

async function main() {
  const produced: { label: string; file: string }[] = [];
  for (const [n, id] of ids.entries()) {
    const image = studioImageById(id)!;
    const began = Date.now();
    try {
      const { bytes } = await generateStudioImage(image, quality, apiKey!);
      console.log(`  [${n + 1}/${ids.length}] ${image.label}  ok  ${(bytes / 1024).toFixed(0)}KB  ${((Date.now() - began) / 1000).toFixed(1)}s`);
      produced.push({ label: image.label, file: path.join('public', image.path.replace(/^\//, '')) });
    } catch (err) {
      console.log(`  [${n + 1}/${ids.length}] ${image.label}  FAILED  ${err instanceof Error ? err.message : err}`);
    }
  }

  // Contact sheet: the whole set in one image, so it can be judged as a set.
  if (produced.length) {
    const CELL = 460;
    const cols = Math.min(3, produced.length);
    const rows = Math.ceil(produced.length / cols);
    const cells = await Promise.all(
      produced.map(async (p) =>
        sharp(await fs.readFile(p.file))
          .resize(CELL, CELL, { fit: 'contain', background: '#f4f5f9' })
          .toBuffer(),
      ),
    );
    const out = `.shots/try-${item.key}.png`;
    await fs.mkdir('.shots', { recursive: true });
    await sharp({
      create: { width: cols * CELL, height: rows * CELL, channels: 3, background: '#f4f5f9' },
    })
      .composite(cells.map((input, i) => ({ input, left: (i % cols) * CELL, top: Math.floor(i / cols) * CELL })))
      .toFile(out);
    console.log(`\n  Contact sheet: ${out}`);
    console.log('  ' + produced.map((p) => p.label).join('\n  ') + '\n');
  }

}

main();
