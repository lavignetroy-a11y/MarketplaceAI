/**
 * Generate, critique, rewrite the brief, generate again. Repeat until it stops improving.
 *
 *   npm run refine -- ./test-photos/chairs ./test-photos/car
 *   npm run refine -- ./test-photos/chairs ./test-photos/car --rounds 8
 *   npm run refine -- ./test-photos/* --arm forensic --shots 2
 *   npm run refine -- ./test-photos/chairs --resume studio-output/refine/<run>
 *
 * HOW IT WORKS
 *
 * Each round generates one image per item at LOW quality, shows each to a critic alongside that
 * seller's original photographs, and feeds the whole batch of critiques to a refiner that rewrites
 * the correction block appended to the base contract. Next round uses the new block.
 *
 * SEVERAL ITEMS, ONE BRIEF
 *
 * The point of passing more than one folder is that a brief tuned against a single object learns
 * that object. Defects are ranked by how many DIFFERENT objects showed them, so the refiner chases
 * what generalises instead of what happens to be in front of it.
 *
 * WHY LOW QUALITY
 *
 * At roughly a thirty-fifth of the cost, a round across three items is pennies, which is what makes
 * eight rounds affordable. The critic is told to ignore softness and missing fine texture at this
 * tier, because those come from the render budget and no wording can fix them -- so the loop spends
 * its iterations on composition, framing, truth, and staging, which is where wording actually bites.
 * Confirm the winning block at high quality afterwards with `npm run ab`.
 *
 * WHEN IT STOPS
 *
 *   - every item passes, or
 *   - the mean score has not improved for two consecutive rounds (a plateau costs money and
 *     teaches nothing), or
 *   - --rounds is reached.
 *
 * WHAT YOU KEEP
 *
 * The images are throwaway. The deliverable is CORRECTION.txt -- the block that survived -- plus
 * HISTORY.md showing what changed each round and what it was aiming at, and PROGRESS.jpg, a grid
 * of every item across every round so improvement (or drift) is visible rather than asserted.
 */
import { loadEnvConfig } from '@next/env';
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import sharp from 'sharp';
import type { OverlayOptions } from 'sharp';
import { analyzeCampaign } from '../lib/campaign/analyze';
import { critiqueImage, overallScore, type Critique } from '../lib/campaign/critique';
import {
  dataUrlToSourcePhoto,
  editHeroImage,
  editSourceImage,
  generateShotImage,
} from '../lib/campaign/generateImages';
import { findBeautifyRisks, refineCorrection, type RoundResult } from '../lib/campaign/refine';
import { strategyById } from '../lib/campaign/strategies';
import type { AnalysisResult, ShotPlan, SourcePhoto } from '../lib/campaign/types';

loadEnvConfig(process.cwd());

// ---------------------------------------------------------------------------
// arguments
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (n: string): string | undefined => {
  const i = argv.indexOf(`--${n}`);
  if (i === -1) return undefined;
  const rest: string[] = [];
  for (let j = i + 1; j < argv.length && !argv[j].startsWith('--'); j++) rest.push(argv[j]);
  return rest.length ? rest.join(' ') : undefined;
};
const has = (n: string) => argv.includes(`--${n}`);

const firstFlag = argv.findIndex((a) => a.startsWith('--'));
const folders = (firstFlag === -1 ? argv : argv.slice(0, firstFlag)).filter(Boolean);

if (!folders.length) {
  console.error(`
  Usage: npm run refine -- <folder> [<folder> ...] [options]

    --rounds N        maximum rounds (default 6)
    --shots N         images per item per round (default 1, the hero)
    --arm <id>        base strategy to refine on top of (default forensic)
    --notes-<name>    seller notes for the folder called <name>
    --force           proceed even if a photo set is judged too thin

  Pass more than one folder. A brief refined against one object learns that object.
`);
  process.exit(1);
}

const maxRounds = Number(flag('rounds') ?? 6);
const shotsPerItem = Number(flag('shots') ?? 1);
const armId = flag('arm') ?? 'forensic';
const force = has('force');

const arm = strategyById(armId);
if (!arm) {
  console.error(`Unknown arm "${armId}".`);
  process.exit(1);
}

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
  if (!entries.length) throw new Error(`No image files in ${from}`);
  return Promise.all(
    entries.map(async (fileName) => ({
      fileName,
      mimeType: MIME[path.extname(fileName).toLowerCase()],
      data: await fs.readFile(path.join(from, fileName)),
    })),
  );
}

type Item = {
  name: string;
  dir: string;
  sources: SourcePhoto[];
  shots: ShotPlan[];
};

// ---------------------------------------------------------------------------
// progress grid
// ---------------------------------------------------------------------------

const CELL_W = 300;
const CELL_H = 400;
const PAD = 10;
const LABEL = 30;
const STRIP_W = 150;

async function cell(file: string | null): Promise<Buffer> {
  if (!file) {
    const svg = `<svg width="${CELL_W}" height="${CELL_H}"><rect width="100%" height="100%" fill="#f4f4f5"/>
      <text x="50%" y="50%" font-family="Helvetica,Arial,sans-serif" font-size="15" fill="#9b9b9f"
      text-anchor="middle" dominant-baseline="middle">-</text></svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
  return sharp(file).resize(CELL_W, CELL_H, { fit: 'contain', background: '#ffffff' }).png().toBuffer();
}

async function text(s: string, w: number, h: number, size = 16, weight = 600): Promise<Buffer> {
  const svg = `<svg width="${w}" height="${h}"><rect width="100%" height="100%" fill="#ffffff"/>
    <text x="10" y="${h / 2}" font-family="Helvetica,Arial,sans-serif" font-size="${size}"
    font-weight="${weight}" fill="#1a1a1a" dominant-baseline="middle">${s}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Rows are items, columns are rounds. Improvement should be visible left to right. */
async function buildProgressGrid(
  runDir: string,
  items: Item[],
  grid: Map<string, (string | null)[]>,
  roundScores: number[],
): Promise<string> {
  const cols = roundScores.length;
  const width = STRIP_W + cols * CELL_W + (cols + 1) * PAD;
  const height = LABEL + PAD + items.length * (CELL_H + PAD) + PAD;
  const composite: OverlayOptions[] = [];

  for (let c = 0; c < cols; c++) {
    composite.push({
      input: await text(`round ${c + 1}  (${roundScores[c].toFixed(1)})`, CELL_W, LABEL, 15),
      left: STRIP_W + PAD + c * (CELL_W + PAD),
      top: 4,
    });
  }
  for (let r = 0; r < items.length; r++) {
    const top = LABEL + PAD + r * (CELL_H + PAD);
    composite.push({ input: await text(items[r].name, STRIP_W, CELL_H, 16), left: 0, top });
    const row = grid.get(items[r].name) ?? [];
    for (let c = 0; c < cols; c++) {
      composite.push({
        input: await cell(row[c] ?? null),
        left: STRIP_W + PAD + c * (CELL_W + PAD),
        top,
      });
    }
  }

  const out = path.join(runDir, 'PROGRESS.jpg');
  await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
    .composite(composite)
    .jpeg({ quality: 88 })
    .toFile(out);
  return out;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('\n  OPENAI_API_KEY is not set. Add it to .env.local and try again.\n');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runDir = path.join(process.cwd(), 'studio-output', 'refine', stamp);
  await fs.mkdir(runDir, { recursive: true });

  console.log(`\n  Refining on top of: ${arm!.name}`);
  console.log(`  ${folders.length} item(s), ${shotsPerItem} shot(s) each, up to ${maxRounds} rounds`);
  console.log(`  low quality throughout -- confirm at high quality afterwards with npm run ab\n`);

  // --- plan every item once; the plan is fixed for the whole run -----------
  const items: Item[] = [];
  for (const folder of folders) {
    const name = path.basename(path.resolve(folder));
    const sources = await loadSources(folder);
    const notes = flag(`notes-${name}`) ?? '';
    process.stdout.write(`  Planning ${name} (${sources.length} photos)... `);
    const analysis: AnalysisResult = await analyzeCampaign(
      client,
      sources,
      Math.max(shotsPerItem, 4),
      notes,
    );
    if (!analysis.readyForGeneration && !force) {
      console.log('needs more evidence');
      console.log(`    ${analysis.reasonNotReady}`);
      analysis.minimumAdditionalEvidenceNeeded.forEach((m) => console.log(`      - ${m}`));
      console.log('    (pass --force to include it anyway)\n');
      continue;
    }
    const shots = analysis.shots.slice(0, shotsPerItem);
    if (!shots.length) {
      console.log('no shots planned, skipping');
      continue;
    }
    console.log(`${analysis.productIdentity.itemType}, ${shots.length} shot(s)`);
    items.push({ name, dir: folder, sources, shots });
  }

  if (!items.length) {
    console.log('\n  Nothing to refine on.\n');
    return;
  }

  // --- the loop -----------------------------------------------------------
  let correction = '';
  const scoreHistory: number[] = [];
  const grid = new Map<string, (string | null)[]>(items.map((i) => [i.name, []]));
  const historyLines: string[] = [];
  let best = { round: 0, score: -1, correction: '' };

  for (let round = 1; round <= maxRounds; round++) {
    console.log(`\n${'='.repeat(64)}\n  ROUND ${round}\n${'='.repeat(64)}`);
    const roundDir = path.join(runDir, `round-${String(round).padStart(2, '0')}`);
    await fs.mkdir(roundDir, { recursive: true });
    await fs.writeFile(path.join(roundDir, 'correction.txt'), correction || '(none)');

    const compose = (p: string, c: 'marketing' | 'evidence', preserve: boolean) => {
      const base = arm!.compose(p, c, preserve);
      if (!correction) return base;

      const block = `\n\nCORRECTIONS FROM PREVIOUS ROUNDS -- apply these carefully\n${correction}\n`;
      const marker = '\n======================================================================\nTHE SHOT';

      // The correction belongs ahead of the shot, so the shot's truth lock still has the last word.
      // But an arm need not have that marker at all -- `control` deliberately adds no scaffolding --
      // and a replace that matches nothing would drop the entire correction without a word, making
      // the loop look like it was refining while it measured the same brief over and over.
      if (base.includes(marker)) return base.replace(marker, `${block}${marker}`);
      return `${block.trim()}\n\n${base}`;
    };

    const results: RoundResult[] = [];

    for (const item of items) {
      let hero: SourcePhoto | null = null;
      let heroOrientation: ShotPlan['orientation'] | null = null;
      const itemDir = path.join(roundDir, item.name);
      await fs.mkdir(itemDir, { recursive: true });

      for (const shot of item.shots) {
        const label = `${String(shot.sequenceNumber).padStart(2, '0')}-${shot.imageRole}`;
        process.stdout.write(`  ${item.name}/${label} ... `);
        try {
          let dataUrl: string;
          if (shot.productionMode === 'source_edit' && shot.sourcePhotoIndex !== null) {
            dataUrl = await editSourceImage(
              client, shot, item.sources[shot.sourcePhotoIndex], compose, 'low',
            );
          } else if (shot.productionMode === 'hero_edit' && hero && heroOrientation) {
            dataUrl = await editHeroImage(client, shot, hero, heroOrientation, compose, 'low');
          } else {
            dataUrl = await generateShotImage(
              client, shot, item.sources,
              shot.productionMode === 'hero_reference' ? hero : null, compose, 'low',
            );
          }

          const png = dataUrlToSourcePhoto(dataUrl, `${label}.png`).data;
          const file = path.join(itemDir, `${label}.png`);
          await fs.writeFile(file, png);
          if (shot.sequenceNumber === 1) {
            hero = dataUrlToSourcePhoto(dataUrl, 'hero.png');
            heroOrientation = shot.orientation;
          }
          if (shot === item.shots[0]) grid.get(item.name)!.push(file);

          process.stdout.write('generated, critiquing... ');
          const critique: Critique = await critiqueImage(client, shot, item.sources, png, 'low');
          await fs.writeFile(
            path.join(itemDir, `${label}.critique.json`),
            JSON.stringify(critique, null, 2),
          );
          results.push({ item: item.name, critique });
          console.log(
            `${critique.verdict} (${overallScore(critique).toFixed(1)}) -- ` +
              `${critique.truthDefects.length} truth, ${critique.craftDefects.length} craft`,
          );
        } catch (err) {
          if (shot === item.shots[0]) grid.get(item.name)!.push(null);
          console.log(err instanceof Error ? err.message : 'failed');
        }
      }
    }

    if (!results.length) {
      console.log('\n  Every image failed this round. Stopping.\n');
      break;
    }

    const mean = results.reduce((s, r) => s + overallScore(r.critique), 0) / results.length;
    scoreHistory.push(mean);
    console.log(`\n  Mean score: ${mean.toFixed(2)}`);
    results.forEach((r) =>
      console.log(`    ${r.item.padEnd(14)} ${overallScore(r.critique).toFixed(1)}  ${r.critique.summary}`),
    );

    if (mean > best.score) best = { round, score: mean, correction };

    await fs.writeFile(
      path.join(roundDir, 'summary.json'),
      JSON.stringify({ round, mean, results }, null, 2),
    );

    // --- stop conditions ---------------------------------------------------
    if (results.every((r) => r.critique.verdict === 'pass')) {
      console.log('\n  Every item passed. Stopping.');
      historyLines.push(`## Round ${round} -- mean ${mean.toFixed(2)} -- ALL PASS`);
      break;
    }
    if (round === maxRounds) {
      historyLines.push(`## Round ${round} -- mean ${mean.toFixed(2)} -- round limit reached`);
      break;
    }
    if (
      scoreHistory.length >= 3 &&
      mean <= scoreHistory[scoreHistory.length - 2] &&
      scoreHistory[scoreHistory.length - 2] <= scoreHistory[scoreHistory.length - 3]
    ) {
      console.log('\n  No improvement for two consecutive rounds. Stopping.');
      historyLines.push(`## Round ${round} -- mean ${mean.toFixed(2)} -- plateau, stopped`);
      break;
    }

    // --- refine ------------------------------------------------------------
    process.stdout.write('\n  Rewriting the brief... ');
    const baseContract = arm!.compose('(the shot goes here)', 'marketing', false);
    const refinement = await refineCorrection(
      client, baseContract, correction, results, scoreHistory,
    );

    const risks = findBeautifyRisks(refinement.correction);
    if (risks.length) {
      // Not silently repaired. A refiner that has started optimising toward a prettier item is
      // something a person needs to see, because the fix is a wording change in refine.ts, not a
      // filter applied after the fact.
      console.log('REJECTED');
      console.log('\n  The proposed correction would improve the ITEM, not the photograph:');
      risks.forEach((r) => console.log(`    - ${r}`));
      console.log('  Keeping the previous block and stopping.\n');
      await fs.writeFile(path.join(roundDir, 'REJECTED-correction.txt'), refinement.correction);
      historyLines.push(`## Round ${round} -- mean ${mean.toFixed(2)} -- refinement REJECTED (${risks.join('; ')})`);
      break;
    }

    console.log('done');
    console.log(`  Targeting: ${refinement.targeting.join('; ') || '(nothing named)'}`);
    if (refinement.dropped.length) console.log(`  Dropped:   ${refinement.dropped.join('; ')}`);

    historyLines.push(
      `## Round ${round} -- mean ${mean.toFixed(2)}\n\n` +
        `**Targeting:** ${refinement.targeting.join('; ') || '-'}\n\n` +
        `**Dropped:** ${refinement.dropped.join('; ') || '-'}\n\n` +
        `**Reasoning:** ${refinement.reasoning}\n\n` +
        `\`\`\`\n${refinement.correction}\n\`\`\`\n`,
    );
    correction = refinement.correction;
  }

  // --- outputs ------------------------------------------------------------
  // The best round is kept, not the last: the loop can and does end on a worse block, either by
  // hitting the round limit mid-experiment or by plateauing after a regression.
  await fs.writeFile(path.join(runDir, 'CORRECTION.txt'), best.correction || '(none)');
  await fs.writeFile(
    path.join(runDir, 'HISTORY.md'),
    `# Refinement run ${stamp}\n\nBase strategy: ${arm!.name}\n` +
      `Items: ${items.map((i) => i.name).join(', ')}\n\n` +
      `Best round: ${best.round} (mean ${best.score.toFixed(2)})\n\n` +
      historyLines.join('\n'),
  );
  const gridFile = await buildProgressGrid(runDir, items, grid, scoreHistory);

  console.log(`\n${'='.repeat(64)}`);
  console.log(`  Scores by round: ${scoreHistory.map((s, i) => `r${i + 1}=${s.toFixed(2)}`).join('  ')}`);
  console.log(`  Best: round ${best.round} at ${best.score.toFixed(2)}`);
  console.log(`\n  Winning brief:  ${path.join(runDir, 'CORRECTION.txt')}`);
  console.log(`  What changed:   ${path.join(runDir, 'HISTORY.md')}`);
  console.log(`  Visual progress:${gridFile}`);
  console.log(`\n  Confirm it at high quality before trusting it.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
