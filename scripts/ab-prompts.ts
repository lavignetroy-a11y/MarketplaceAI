/**
 * Run the same item through every prompt strategy and put the results side by side.
 *
 *   npm run ab -- ./test-photos/chairs
 *   npm run ab -- ./test-photos/chairs --count 4
 *   npm run ab -- ./test-photos/chairs --arms current,accident,habitat
 *   npm run ab -- ./test-photos/chairs --notes "Two dining chairs, some staining on the seats"
 *   npm run ab -- ./test-photos/chairs --plan-only
 *
 * EXPERIMENTAL DESIGN
 *
 * The analysis model runs ONCE and its shot plan is reused by every arm. That is the whole point:
 * if each arm planned its own shots, the images would differ because the planner had different
 * ideas, and nothing could be attributed to the briefing strategy. Same plan, same reference
 * photographs, same model, same quality -- the wrapper around each prompt is the only variable.
 *
 * WHAT IT WRITES
 *
 *   studio-output/ab/<run>/plan.json          the shared shot plan and product analysis
 *   studio-output/ab/<run>/prompts/           the exact text sent, per arm per shot
 *   studio-output/ab/<run>/<arm>/NN-role.png  the images
 *   studio-output/ab/<run>/<arm>.jpg          one arm's shots in a row
 *   studio-output/ab/<run>/COMPARE.jpg        every arm as a row, every shot as a column
 *
 * COMPARE.jpg is the deliverable. Judging strategies by opening folders does not work -- the
 * differences are in texture and light, and they only become obvious when the same shot from six
 * strategies sits on one line.
 */
import { loadEnvConfig } from '@next/env';
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import sharp from 'sharp';
import type { OverlayOptions } from 'sharp';
import { analyzeCampaign } from '../lib/campaign/analyze';
import {
  dataUrlToSourcePhoto,
  editHeroImage,
  editSourceImage,
  generateShotImage,
} from '../lib/campaign/generateImages';
import { STRATEGIES, strategyById, type PromptStrategy } from '../lib/campaign/strategies';
import type { AnalysisResult, ShotPlan, SourcePhoto } from '../lib/campaign/types';

loadEnvConfig(process.cwd());

// ---------------------------------------------------------------------------
// arguments
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const dir = argv.find((a) => !a.startsWith('--'));
const flag = (n: string) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? undefined : argv[i + 1];
};
const has = (n: string) => argv.includes(`--${n}`);

if (!dir) {
  console.error(`
  Usage: npm run ab -- <folder-of-photos> [options]

    --count N         shots per arm (default 4)
    --arms a,b,c      which strategies to run (default: all)
    --notes "..."     seller notes passed to the analysis
    --plan-only       plan and write prompts, generate nothing (free)

  Strategies:
${STRATEGIES.map((s) => `    ${s.id.padEnd(11)} ${s.name}`).join('\n')}
`);
  process.exit(1);
}

const count = Number(flag('count') ?? 4);
const notes = flag('notes') ?? '';
const planOnly = has('plan-only');
const arms: PromptStrategy[] = (flag('arms')?.split(',') ?? STRATEGIES.map((s) => s.id)).map(
  (id) => {
    const s = strategyById(id.trim());
    if (!s) {
      console.error(`Unknown arm "${id.trim()}". Known: ${STRATEGIES.map((x) => x.id).join(', ')}`);
      process.exit(1);
    }
    return s;
  },
);

// ---------------------------------------------------------------------------
// sources
// ---------------------------------------------------------------------------

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

async function loadSources(from: string): Promise<SourcePhoto[]> {
  const entries = (await fs.readdir(from)).filter((f) => MIME[path.extname(f).toLowerCase()]).sort();
  if (!entries.length) throw new Error(`No .png/.jpg/.webp files in ${from}`);
  return Promise.all(
    entries.map(async (fileName) => ({
      fileName,
      mimeType: MIME[path.extname(fileName).toLowerCase()],
      data: await fs.readFile(path.join(from, fileName)),
    })),
  );
}

// ---------------------------------------------------------------------------
// generation
// ---------------------------------------------------------------------------

/**
 * Generates one shot under one strategy.
 *
 * Mirrors the production pipeline's mode routing exactly, so what the experiment measures is the
 * prompt wrapper and not some other difference between the harness and the real thing.
 */
async function generate(
  client: OpenAI,
  shot: ShotPlan,
  sources: SourcePhoto[],
  hero: SourcePhoto | null,
  heroOrientation: ShotPlan['orientation'] | null,
  strategy: PromptStrategy,
): Promise<string> {
  if (shot.productionMode === 'source_edit' && shot.sourcePhotoIndex !== null) {
    return editSourceImage(client, shot, sources[shot.sourcePhotoIndex], strategy.compose);
  }
  if (shot.productionMode === 'hero_edit' && hero && heroOrientation) {
    return editHeroImage(client, shot, hero, heroOrientation, strategy.compose);
  }
  return generateShotImage(
    client,
    shot,
    sources,
    shot.productionMode === 'hero_reference' ? hero : null,
    strategy.compose,
  );
}

/** What each arm would actually send, so a plan-only run is still worth reading. */
function composedPrompt(shot: ShotPlan, strategy: PromptStrategy): string {
  const preserveSetting =
    shot.productionMode === 'source_edit' || shot.productionMode === 'hero_edit';
  return strategy.compose(shot.prompt, shot.classification, preserveSetting);
}

// ---------------------------------------------------------------------------
// contact sheets
// ---------------------------------------------------------------------------

// Cells are portrait because listing images usually are (1024x1536). Square cells letterbox a
// portrait shot into roughly half its area, and these are being compared on texture and light --
// detail you cannot see is detail you cannot judge.
const CELL_W = 440;
const CELL_H = 580;
const PAD = 12;
const LABEL = 34;
const STRIP_W = 190;

/** Left-hand caption strip, so a row in COMPARE.jpg is identifiable without counting. */
async function labelStrip(text: string, height: number): Promise<Buffer> {
  const svg = `<svg width="${STRIP_W}" height="${height}">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <text x="14" y="${height / 2}" font-family="Helvetica,Arial,sans-serif" font-size="19"
          font-weight="600" fill="#1a1a1a" dominant-baseline="middle">${text}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function cell(file: string | null): Promise<Buffer> {
  if (!file) {
    const svg = `<svg width="${CELL_W}" height="${CELL_H}">
      <rect width="100%" height="100%" fill="#f4f4f5"/>
      <text x="50%" y="50%" font-family="Helvetica,Arial,sans-serif" font-size="18" fill="#9b9b9f"
            text-anchor="middle" dominant-baseline="middle">failed</text></svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
  return sharp(file)
    .resize(CELL_W, CELL_H, { fit: 'contain', background: '#ffffff' })
    .png()
    .toBuffer();
}

/** One row per arm, one column per shot. The thing you actually look at. */
async function buildCompareSheet(
  runDir: string,
  rows: { strategy: PromptStrategy; files: (string | null)[] }[],
  headers: string[],
): Promise<string> {
  const cols = headers.length;
  const width = STRIP_W + cols * CELL_W + (cols + 1) * PAD;
  const rowH = CELL_H + PAD;
  const height = LABEL + PAD + rows.length * rowH + PAD;

  const composite: OverlayOptions[] = [];

  for (let c = 0; c < cols; c++) {
    const svg = `<svg width="${CELL_W}" height="${LABEL}">
      <text x="${CELL_W / 2}" y="${LABEL / 2}" font-family="Helvetica,Arial,sans-serif" font-size="17"
            font-weight="600" fill="#4a4a52" text-anchor="middle"
            dominant-baseline="middle">${headers[c]}</text></svg>`;
    composite.push({
      input: await sharp(Buffer.from(svg)).png().toBuffer(),
      left: STRIP_W + PAD + c * (CELL_W + PAD),
      top: 6,
    });
  }

  for (let r = 0; r < rows.length; r++) {
    const top = LABEL + PAD + r * rowH;
    composite.push({ input: await labelStrip(rows[r].strategy.id, CELL_H), left: 0, top });
    for (let c = 0; c < cols; c++) {
      composite.push({
        input: await cell(rows[r].files[c] ?? null),
        left: STRIP_W + PAD + c * (CELL_W + PAD),
        top,
      });
    }
  }

  const out = path.join(runDir, 'COMPARE.jpg');
  await sharp({
    create: { width, height, channels: 3, background: '#ffffff' },
  })
    .composite(composite)
    .jpeg({ quality: 90 })
    .toFile(out);
  return out;
}

/** One arm's shots in a row, for looking at a single strategy closely. */
async function buildArmSheet(runDir: string, arm: string, files: (string | null)[]): Promise<void> {
  const width = files.length * CELL_W + (files.length + 1) * PAD;
  const height = CELL_H + 2 * PAD;
  const composite: OverlayOptions[] = [];
  for (let i = 0; i < files.length; i++) {
    composite.push({ input: await cell(files[i] ?? null), left: PAD + i * (CELL_W + PAD), top: PAD });
  }
  await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
    .composite(composite)
    .jpeg({ quality: 90 })
    .toFile(path.join(runDir, `${arm}.jpg`));
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('\n  OPENAI_API_KEY is not set. Add it to .env.local and try again.\n');
    process.exit(1);
  }

  const sources = await loadSources(dir!);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runDir = path.join(process.cwd(), 'studio-output', 'ab', stamp);
  await fs.mkdir(path.join(runDir, 'prompts'), { recursive: true });

  console.log(`\n  ${sources.length} source photos from ${dir}`);
  console.log(`  ${arms.length} arms x ${count} shots = ${arms.length * count} images`);
  console.log(`  approx $${(arms.length * count * 0.25).toFixed(2)} at high quality\n`);

  // --- one plan, shared by every arm -------------------------------------
  console.log('  Analysing (one plan, reused by every arm)...');
  const analysis: AnalysisResult = await analyzeCampaign(client, sources, count, notes);

  await fs.writeFile(path.join(runDir, 'plan.json'), JSON.stringify(analysis, null, 2));

  if (!analysis.readyForGeneration) {
    console.log(`\n  The analysis says it cannot proceed truthfully: ${analysis.reasonNotReady}`);
    analysis.minimumAdditionalEvidenceNeeded.forEach((m) => console.log(`    - ${m}`));
    console.log(`\n  Plan written to ${runDir}/plan.json\n`);
    return;
  }

  console.log(`  Identified: ${analysis.productIdentity.itemType} (${analysis.productIdentity.category})`);
  analysis.shots.forEach((s) =>
    console.log(`    ${s.sequenceNumber}. ${s.imageRole} [${s.classification}/${s.productionMode}]`),
  );

  // --- write every arm's prompts, whether or not we generate --------------
  for (const arm of arms) {
    const text = analysis.shots
      .map(
        (s) =>
          `${'='.repeat(70)}\nSHOT ${s.sequenceNumber} -- ${s.imageRole} ` +
          `[${s.classification} / ${s.productionMode}]\n${'='.repeat(70)}\n\n${composedPrompt(s, arm)}`,
      )
      .join('\n\n\n');
    await fs.writeFile(
      path.join(runDir, 'prompts', `${arm.id}.txt`),
      `${arm.name}\n\nHYPOTHESIS: ${arm.hypothesis}\n\n\n${text}`,
    );
  }
  console.log(`\n  Prompts written to ${runDir}/prompts/`);

  if (planOnly) {
    console.log(`\n  --plan-only: nothing generated.\n`);
    return;
  }

  // --- generate ----------------------------------------------------------
  const rows: { strategy: PromptStrategy; files: (string | null)[] }[] = [];

  for (const arm of arms) {
    console.log(`\n  ${arm.name}`);
    const armDir = path.join(runDir, arm.id);
    await fs.mkdir(armDir, { recursive: true });

    const files: (string | null)[] = [];
    // Each arm builds its OWN hero and chains its own dependent shots to it. Sharing one hero
    // across arms would mean every arm inherited the hero of whichever strategy made it, which is
    // precisely the effect being measured.
    let hero: SourcePhoto | null = null;
    let heroOrientation: ShotPlan['orientation'] | null = null;

    for (const shot of analysis.shots) {
      const label = `${String(shot.sequenceNumber).padStart(2, '0')}-${shot.imageRole}`;
      process.stdout.write(`    ${label} ... `);
      try {
        const image = await generate(client, shot, sources, hero, heroOrientation, arm);
        const file = path.join(armDir, `${label}.png`);
        await fs.writeFile(file, dataUrlToSourcePhoto(image, `${label}.png`).data);
        files.push(file);
        if (shot.sequenceNumber === 1) {
          hero = dataUrlToSourcePhoto(image, 'hero.png');
          heroOrientation = shot.orientation;
        }
        console.log('ok');
      } catch (err) {
        files.push(null);
        console.log(err instanceof Error ? err.message : 'failed');
      }
    }

    await buildArmSheet(runDir, arm.id, files);
    rows.push({ strategy: arm, files });
  }

  const headers = analysis.shots.map((s) => `${s.sequenceNumber}. ${s.imageRole}`);
  const compare = await buildCompareSheet(runDir, rows, headers);

  console.log(`\n  Done.\n`);
  console.log(`  Compare all arms:  ${compare}`);
  console.log(`  Per-arm sheets:    ${runDir}/<arm>.jpg`);
  console.log(`  Full-size images:  ${runDir}/<arm>/`);
  console.log(`  Exact prompts:     ${runDir}/prompts/\n`);
  console.log('  Arms in COMPARE.jpg, top to bottom:');
  rows.forEach((r) => console.log(`    ${r.strategy.id.padEnd(11)} ${r.strategy.name}`));
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
