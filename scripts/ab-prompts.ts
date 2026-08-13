/**
 * Run the same item through every prompt strategy and put the results side by side.
 *
 *   npm run ab -- ./test-photos/chairs
 *   npm run ab -- ./test-photos/chairs --count 4
 *   npm run ab -- ./test-photos/chairs --arms current,accident,habitat
 *   npm run ab -- ./test-photos/chairs --quality low,high    (default is low only)
 *   npm run ab -- ./test-photos/chairs --notes "Two dining chairs, some staining on the seats"
 *   npm run ab -- ./test-photos/chairs --plan-only
 *
 * EXPERIMENTAL DESIGN
 *
 * The analysis model runs ONCE and its shot plan is reused by every arm. That is the whole point:
 * if each arm planned its own shots, the images would differ because the planner had different
 * ideas, and nothing could be attributed to the briefing strategy. Same plan, same reference
 * photographs, same model -- the wrapper around each prompt is the only variable within a tier.
 *
 * Both quality tiers run in one pass, low first. Low is ~35x cheaper, so the cheap pass doubles as
 * a smoke test: if the plan is wrong or an arm is broken, that shows up for pennies before the
 * expensive pass starts. It also answers a question worth having an answer to -- how much of the
 * result is the briefing and how much is just spend.
 *
 * WHAT IT WRITES
 *
 *   studio-output/ab/<run>/plan.json                    the shot plan and product analysis
 *   studio-output/ab/<run>/prompts/                     the exact text sent, per arm per shot
 *   studio-output/ab/<run>/<quality>/<arm>/NN-role.png  the images
 *   studio-output/ab/<run>/<quality>/<arm>.jpg          one arm's shots in a row
 *   studio-output/ab/<run>/COMPARE-<quality>.jpg        every arm a row, every shot a column
 *
 * The COMPARE sheets are the deliverable. Judging strategies by opening folders does not work --
 * the differences are in texture and light, and they only become obvious when the same shot from
 * six strategies sits on one line. The two sheets share an identical layout deliberately, so
 * flipping between them in a viewer shows exactly what the quality tier changed and nothing else.
 */
import { loadEnvConfig } from '@next/env';
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import sharp from 'sharp';
import type { OverlayOptions } from 'sharp';
import { analyzeCampaign, type PlanningLogic } from '../lib/campaign/analyze';
import {
  dataUrlToSourcePhoto,
  editHeroImage,
  editSourceImage,
  generateFromKnowledge,
  generateShotImage,
} from '../lib/campaign/generateImages';
import {
  plannedSettingClause,
  readSceneFromHero,
  sceneClause,
  type SceneLock,
} from '../lib/campaign/sceneLock';
import { presentationClause } from '../lib/campaign/presentation';
import { productClause, productLockWeaknesses } from '../lib/campaign/productLock';
import { STRATEGIES, strategyById, type PromptStrategy } from '../lib/campaign/strategies';
import { MAX_IMAGES } from '../lib/config/pricing';
import type { AnalysisResult, ImageQuality, ShotPlan, SourcePhoto } from '../lib/campaign/types';

loadEnvConfig(process.cwd());

// ---------------------------------------------------------------------------
// arguments
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);

/**
 * Everything between a flag and the next one, rejoined.
 *
 * `npm run ab -- ... --notes "two grey chairs"` loses its quotes on the way through PowerShell and
 * npm, so the script receives `--notes two grey chairs` as four separate arguments. Reading only
 * argv[i+1] silently takes the word "two" and drops the rest -- which is worse than failing,
 * because the run proceeds on a truncated description and the plan comes back wrong.
 */
const flag = (n: string): string | undefined => {
  const i = argv.indexOf(`--${n}`);
  if (i === -1) return undefined;
  const rest: string[] = [];
  for (let j = i + 1; j < argv.length && !argv[j].startsWith('--'); j++) rest.push(argv[j]);
  return rest.length ? rest.join(' ') : undefined;
};
const has = (n: string) => argv.includes(`--${n}`);

// The folder is the only bare argument, and it has to be found before any flag consumes it.
const flagStarts = argv.reduce<number[]>((acc, a, i) => (a.startsWith('--') ? [...acc, i] : acc), []);
const firstFlag = flagStarts.length ? flagStarts[0] : argv.length;
const dir = argv.slice(0, firstFlag).find((a) => !a.startsWith('--'));

if (!dir) {
  console.error(`
  Usage: npm run ab -- <folder-of-photos> [options]

    --count N         shots per arm (default 4)
    --arms a,b,c      which strategies to run (default: all)
    --quality a,b     tiers to run, in order (default: low)
    --only marketing  compare only shots the arms actually differ on (recommended)
    --notes "..."     seller notes passed to the analysis
    --plan-only       plan and write prompts, generate nothing (free)
    --force           generate even if the analysis says the photos are too thin (test only)
    --logic v4|v5     planning logic (default v5: allows inference, marks what it inferred)

  Strategies:
${STRATEGIES.map((s) => `    ${s.id.padEnd(11)} ${s.name}`).join('\n')}
`);
  process.exit(1);
}

const count = Number(flag('count') ?? 4);

// Low first, deliberately: it costs pennies, so a broken plan or a broken arm surfaces before the
// expensive pass has spent anything.
const QUALITIES: ImageQuality[] = ['low', 'medium', 'high'];
// Low only by default. Iterating on prompt architecture at 35x the price buys nothing: the
// problems worth fixing right now -- scene continuity, shot coverage, staging -- are all visible
// at low quality. Pass --quality high explicitly once the structure is right.
const qualities = (flag('quality')?.split(',') ?? ['low']).map((q) => {
  const t = q.trim() as ImageQuality;
  if (!QUALITIES.includes(t)) {
    console.error(`Unknown quality "${t}". Known: ${QUALITIES.join(', ')}`);
    process.exit(1);
  }
  return t;
});
const notes = flag('notes') ?? '';
const planOnly = has('plan-only');

// Proceed even when the analysis judges the photo set too thin to be truthful. Experiments only:
// the point here is to render the same shots several ways, not to produce a listing.
const force = has('force');

// Which planning logic to use. v4 refuses to produce any view the photographs do not cover; v5
// allows continuity, interpolation, and completion of identified mass-produced products.
const logic = (flag('logic') ?? 'v5') as PlanningLogic;
if (logic !== 'v4' && logic !== 'v5') {
  console.error(`Unknown logic "${logic}". Use v4 or v5.`);
  process.exit(1);
}

// Evidence shots deliberately share one documentary contract across every arm, so including them
// spends real money on columns that come back near-identical in all six rows. --only marketing
// keeps the comparison on the shots the strategies actually differ on.
const only = flag('only') as 'marketing' | 'evidence' | undefined;
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
  quality: ImageQuality,
  scene: SceneLock | null,
  analysis: AnalysisResult,
): Promise<string> {
  // The scene lock is prepended to the SHOT text rather than folded into the style contract, so it
  // inherits the shot's precedence. A contract that suggests "an ordinary well-kept home" and a
  // lock that names one specific room cannot both be advisory -- the lock has to win. Same for the
  // preparation: this staging has to match lib/campaign/pipeline.ts exactly, or the harness stops
  // measuring the thing that actually ships.
  // Must match lib/campaign/pipeline.ts stage() exactly. A shot that edits a real photograph
  // already has its room from a camera, and handing it "BUILD THIS ROOM" replaces the photograph
  // with an invented render -- which is what happened to five source_edit detail shots at once.
  const preserveSetting =
    shot.productionMode === 'source_edit' || shot.productionMode === 'hero_edit';

  const parts: string[] = [];
  if (analysis.productLock) {
    parts.push(productClause(analysis.productLock, shot.classification, preserveSetting));
  }
  if (!preserveSetting) {
    if (scene) parts.push(sceneClause(scene, !analysis.productLock));
    else if (analysis.environmentDescription) {
      parts.push(plannedSettingClause(analysis.environmentDescription));
    }
  }
  if (analysis.presentation) {
    const clause = presentationClause(analysis.presentation, shot.classification);
    if (clause) parts.push(clause);
  }
  const staged: ShotPlan = parts.length
    ? { ...shot, prompt: `${parts.join('\n\n')}\n\n${shot.prompt}` }
    : shot;

  if (staged.productionMode === 'known_product') {
    return generateFromKnowledge(client, staged, strategy.compose, quality);
  }
  if (staged.productionMode === 'source_edit' && staged.sourcePhotoIndex !== null) {
    return editSourceImage(
      client,
      staged,
      sources[staged.sourcePhotoIndex],
      strategy.compose,
      quality,
    );
  }
  if (staged.productionMode === 'hero_edit' && hero && heroOrientation) {
    return editHeroImage(client, staged, hero, heroOrientation, strategy.compose, quality);
  }
  return generateShotImage(
    client,
    staged,
    sources,
    staged.productionMode === 'hero_reference' ? hero : null,
    strategy.compose,
    quality,
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

/**
 * One row per arm, one column per shot, with the seller's own photographs on the first row.
 *
 * The sources belong in the same picture. Judging a generated set means asking whether it is the
 * same object, whether the wear survived, whether the proportions hold -- and that is impossible
 * from the output alone. Keeping them in one file also means the whole thing can be handed to
 * somebody else as a single image without a folder of context.
 */
async function buildCompareSheet(
  runDir: string,
  quality: ImageQuality,
  rows: { strategy: PromptStrategy; files: (string | null)[] }[],
  headers: string[],
  sourceFiles: string[] = [],
): Promise<string> {
  const cols = headers.length;
  const width = STRIP_W + cols * CELL_W + (cols + 1) * PAD;
  const rowH = CELL_H + PAD;
  // The originals get their own row above the arms, plus a rule to separate them -- they are
  // evidence, not another candidate, and the sheet should not invite comparing them like one.
  const sourceRows = sourceFiles.length ? 1 : 0;
  const height = LABEL + PAD + (rows.length + sourceRows) * rowH + PAD + (sourceRows ? PAD * 2 : 0);

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

  let cursorTop = LABEL + PAD;

  if (sourceFiles.length) {
    composite.push({ input: await labelStrip('ORIGINALS', CELL_H), left: 0, top: cursorTop });
    for (let c = 0; c < cols; c++) {
      composite.push({
        input: await cell(sourceFiles[c] ?? null),
        left: STRIP_W + PAD + c * (CELL_W + PAD),
        top: cursorTop,
      });
    }
    cursorTop += rowH + PAD * 2;
  }

  for (let r = 0; r < rows.length; r++) {
    const top = cursorTop + r * rowH;
    composite.push({ input: await labelStrip(rows[r].strategy.id, CELL_H), left: 0, top });
    for (let c = 0; c < cols; c++) {
      composite.push({
        input: await cell(rows[r].files[c] ?? null),
        left: STRIP_W + PAD + c * (CELL_W + PAD),
        top,
      });
    }
  }

  const out = path.join(runDir, `COMPARE-${quality}.jpg`);
  await sharp({
    create: { width, height, channels: 3, background: '#ffffff' },
  })
    .composite(composite)
    .jpeg({ quality: 90 })
    .toFile(out);
  return out;
}

/** One arm's shots in a row, for looking at a single strategy closely. */
async function buildArmSheet(dir: string, arm: string, files: (string | null)[]): Promise<void> {
  const width = files.length * CELL_W + (files.length + 1) * PAD;
  const height = CELL_H + 2 * PAD;
  const composite: OverlayOptions[] = [];
  for (let i = 0; i < files.length; i++) {
    composite.push({ input: await cell(files[i] ?? null), left: PAD + i * (CELL_W + PAD), top: PAD });
  }
  await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
    .composite(composite)
    .jpeg({ quality: 90 })
    .toFile(path.join(dir, `${arm}.jpg`));
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

  // The source folder's name goes in the run directory, not just a timestamp. Two runs launched
  // in different windows within the same second would otherwise share a directory and quietly
  // overwrite each other's images -- and running several items side by side is the normal way to
  // use this, since a strategy that wins on upholstery may lose badly on metal.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const slug = path.basename(path.resolve(dir!)).replace(/[^a-zA-Z0-9._-]/g, '-') || 'run';
  const runDir = path.join(process.cwd(), 'studio-output', 'ab', `${stamp}-${slug}-${logic}`);
  await fs.mkdir(path.join(runDir, 'prompts'), { recursive: true });

  console.log(`\n  ${sources.length} source photos from ${dir}`);
  // Output-token rates only. Every images.edit call also bills for the reference photos it sends,
  // so treat these as a floor rather than a quote -- roughly 15-30% light on a set this size.
  //
  // Keyed by model because the two generations are priced very differently, and the estimate was
  // quietly reporting gpt-image-2 prices after generation was pinned to gpt-image-1 -- which
  // understated a low-quality run by about half. A cost estimate nobody can trust is worse than
  // none, since it is read precisely when deciding whether a run is affordable.
  const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
  const RATES: Record<string, Record<ImageQuality, number>> = {
    // Landscape and portrait cost about half again as much as square; these sit between the two.
    'gpt-image-1': { low: 0.013, medium: 0.05, high: 0.2 },
    'gpt-image-2': { low: 0.006, medium: 0.05, high: 0.21 },
  };
  const RATE = RATES[IMAGE_MODEL] ?? RATES['gpt-image-1'];
  const perTier = arms.length * count;
  const total = qualities.reduce((sum, q) => sum + perTier * RATE[q], 0);

  console.log(`  planning logic: ${logic}`);
  console.log(`  text model: ${process.env.OPENAI_TEXT_MODEL || 'gpt-4o (default)'}`);
  console.log(`  image model: ${IMAGE_MODEL}`);
  console.log(`  ${arms.length} arms x ${count} shots = ${perTier} images per quality tier`);
  console.log(`  tiers: ${qualities.join(', ')}  ->  ${perTier * qualities.length} images total`);
  qualities.forEach((q) =>
    console.log(`    ${q.padEnd(7)} ~$${(perTier * RATE[q]).toFixed(2)}`),
  );
  console.log(`  approx $${total.toFixed(2)} before reference-photo input tokens\n`);

  // --- one plan, shared by every arm -------------------------------------
  // When filtering, ask for more shots than are needed so there are enough of the wanted kind to
  // choose from. The planner decides its own marketing/evidence mix, so requesting exactly four
  // and then discarding the evidence ones would leave the comparison short.
  const planCount = only ? Math.min(count * 2 + 2, MAX_IMAGES) : count;

  console.log(`  Analysing (one plan, reused by every arm)...`);
  if (notes) console.log(`  Notes: "${notes}"`);
  const analysis: AnalysisResult = await analyzeCampaign(client, sources, planCount, notes, logic);

  await fs.writeFile(path.join(runDir, 'plan.json'), JSON.stringify(analysis, null, 2));

  if (!analysis.readyForGeneration) {
    console.log(`\n  The analysis will not proceed truthfully: ${analysis.reasonNotReady}`);
    analysis.minimumAdditionalEvidenceNeeded.forEach((m) => console.log(`    - ${m}`));

    // The gate is correct behaviour and production must always respect it -- an incomplete photo
    // set is exactly when a generated listing starts inventing. But this harness exists to compare
    // briefing strategies, and for that the plan only has to be good enough to render the same
    // shots six ways. --force takes the best-effort plan the analysis returns anyway.
    if (!force) {
      console.log(
        `\n  Add the photos above and rerun, or pass --force to compare strategies on the\n` +
          `  best-effort plan anyway. Force is for experiments only -- the images it makes are\n` +
          `  not fit to put in front of a buyer.\n`,
      );
      console.log(`  Plan written to ${runDir}/plan.json\n`);
      return;
    }
    if (!analysis.shots?.length) {
      console.log(`\n  --force given, but the analysis returned no shots to work from.\n`);
      return;
    }
    console.log(`\n  --force: continuing on the best-effort plan. NOT fit for a real listing.`);
  }

  const id = analysis.productIdentity;
  console.log(`\n  Identified: ${id.itemType} (${id.category})`);
  console.log(`  Quantity:   ${id.quantity}${id.isMatchingSet ? ' (matching set)' : ''}`);

  // Filter AFTER planning, so the plan itself stays the planner's own coherent campaign and only
  // the subset we pay to compare is narrowed.
  const all = analysis.shots;
  // Shot 1 is always kept, whatever the filter says. Later shots in hero_edit and hero_reference
  // mode are generated against it, so dropping it would strand them -- and it is the single most
  // interesting shot to compare anyway, being the only one composed entirely from scratch.
  const hero = all.find((s) => s.sequenceNumber === 1);
  const rest = (only ? all.filter((s) => s.classification === only) : all).filter(
    (s) => s !== hero,
  );
  const chosen = [...(hero ? [hero] : []), ...rest].slice(0, count);

  if (only && chosen.length < count) {
    console.log(
      `\n  Note: asked for ${count} ${only} shots but the plan only contains ${chosen.length}.`,
    );
    // A run that compares one shot against another run's eight is not a comparison, and quietly
    // proceeding produced exactly that. Half the requested count is the line: below it, say so and
    // stop rather than spend money on a result nobody can read anything into.
    if (chosen.length < Math.ceil(count / 2)) {
      console.log(
        `\n  That is too few to compare against a full run. This usually means the analysis\n` +
          `  refused and the best-effort plan is mostly evidence shots. Either add the photos it\n` +
          `  asked for, drop --only marketing, or lower --count.\n`,
      );
      if (!planOnly) return;
    }
  }

  console.log('\n  Plan:');
  all.forEach((s) => {
    const used = chosen.includes(s);
    console.log(
      `    ${used ? '*' : ' '} ${String(s.sequenceNumber).padStart(2)}. ${s.imageRole.padEnd(26)} ` +
        `[${s.subjectScope ?? '?'}/${s.productionMode}] ` +
        `${(s.inferenceLevel ?? 'photographed') === 'photographed' ? '   ' : ' ~ '}` +
        `${(s.inferenceLevel ?? '').padEnd(16)} ${s.cameraPose ?? ''}`,
    );
  });
  const inferred = all.filter((s) => (s.inferenceLevel ?? 'photographed') !== 'photographed');
  if (inferred.length) {
    console.log(`\n  ~ marks ${inferred.length} shot(s) completed beyond what the photos show.`);
  }
  if (analysis.coverageNotes?.length) {
    console.log('\n  Coverage notes (told to the seller):');
    analysis.coverageNotes.forEach((n) => console.log(`    - ${n}`));
  }

  // Printed because this is the one part of the plan that deliberately changes how the item looks,
  // so it is the part worth reading before spending money -- and the two halves are only safe read
  // together. A long groom list beside a short leave list is the shape of a set that tidies the
  // faults away, and that is visible here in a way it is not in the finished images.
  // The single most useful thing to read before spending money. Every drift complaint so far --
  // wrong section count, wrong colour, a control panel that changes between frames, a top-loader
  // rendered with a front door -- is visible here as a vague or wrong line, minutes before it is
  // visible as eight bad images.
  if (analysis.productLock) {
    const p = analysis.productLock;
    console.log('\n  PRODUCT LOCK -- check this first; every image is held to it');
    console.log(`    what      ${p.identity}`);
    console.log(`    product   ${p.identifiedProduct ?? '(not identified)'}${p.productionYears ? `, made ${p.productionYears}` : ''}`);
    console.log(`    units     ${p.unitCount} -- ${p.layout}`);
    (p.countableParts ?? []).forEach((c, i) => console.log(`    ${i ? '     ' : 'count'}     ${c}`));
    console.log(`    form      ${p.form}`);
    console.log(`    colour    ${p.colorAndMaterial}`);
    (p.features ?? []).forEach((f, i) => console.log(`    ${i ? '     ' : 'feat '}     ${f}`));
    (p.marks ?? []).forEach((m, i) =>
      console.log(
        `    ${i ? '     ' : 'marks'}     ${m.what} -- ${m.where}` +
          (m.sourcePhotoIndex === null ? '  [NO PHOTO -- will be imagined]' : `  [copy from source ${m.sourcePhotoIndex}]`),
      ),
    );
    (p.neverShow ?? []).forEach((n, i) => console.log(`    ${i ? '     ' : 'never'}     ${n}`));

    // Surfaced here rather than buried in a console.warn, because the whole value of printing the
    // lock is catching a limp one in the seconds before eight images are paid for.
    const weak = productLockWeaknesses(p);
    if (weak.length) {
      console.log('\n  ** THIS LOCK IS WEAK -- expect drift:');
      weak.forEach((w) => console.log(`     - ${w}`));
    }
  }

  if (analysis.environmentDescription) {
    console.log(`\n  Room chosen for the shoot:\n    ${analysis.environmentDescription}`);
  }
  if (analysis.presentation) {
    console.log('\n  Prepared before the shutter:');
    (analysis.presentation.groom ?? []).forEach((g) => console.log(`    + ${g}`));
    console.log('\n  Faults that survive it:');
    const leave = analysis.presentation.leave ?? [];
    if (leave.length) leave.forEach((l) => console.log(`    ! ${l}`));
    else console.log('    (none recorded -- check this is really a flawless item)');
  }
  if (only) console.log(`\n  (* = compared; the rest are planned but not generated)`);

  // Every arm generates this same subset.
  analysis.shots = chosen;

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
  const headers = analysis.shots.map((s) => `${s.sequenceNumber}. ${s.imageRole}`);
  const sheets: { quality: ImageQuality; file: string; done: number; failed: number }[] = [];

  for (const quality of qualities) {
    console.log(`\n${'='.repeat(64)}\n  ${quality.toUpperCase()} QUALITY PASS\n${'='.repeat(64)}`);
    const qualityDir = path.join(runDir, quality);
    const rows: { strategy: PromptStrategy; files: (string | null)[] }[] = [];
    let done = 0;
    let failed = 0;

    for (const arm of arms) {
      console.log(`\n  ${arm.name}`);
      const armDir = path.join(qualityDir, arm.id);
      await fs.mkdir(armDir, { recursive: true });

      const files: (string | null)[] = [];
      // Each arm builds its OWN hero and chains its own dependent shots to it, per quality tier.
      // Sharing one hero across arms would mean every arm inherited the hero of whichever strategy
      // made it, which is precisely the effect being measured; sharing one across tiers would hide
      // what the tier does to the shot the whole set is anchored on.
      let hero: SourcePhoto | null = null;
      let heroOrientation: ShotPlan['orientation'] | null = null;
      // Read out of this arm's OWN hero, not shared. Each arm builds a different room, and telling
      // one arm to match another arm's room would destroy the thing being compared.
      let scene: SceneLock | null = null;

      for (const shot of analysis.shots) {
        const label = `${String(shot.sequenceNumber).padStart(2, '0')}-${shot.imageRole}`;
        process.stdout.write(`    ${label} ... `);
        try {
          const image = await generate(
            client,
            shot,
            sources,
            hero,
            heroOrientation,
            arm,
            quality,
            scene,
            analysis,
          );
          const file = path.join(armDir, `${label}.png`);
          const png = dataUrlToSourcePhoto(image, `${label}.png`).data;
          await fs.writeFile(file, png);
          files.push(file);
          if (shot.sequenceNumber === 1) {
            hero = dataUrlToSourcePhoto(image, 'hero.png');
            heroOrientation = shot.orientation;
            // One extra text call per arm, and it is what makes the remaining shots belong to the
            // same shoot. Derived from the hero that actually exists rather than from the plan,
            // because the plan describes a room somebody intended and the hero is the room that
            // got built.
            process.stdout.write('reading scene... ');
            scene = await readSceneFromHero(client, png, analysis);
            await fs.writeFile(
              path.join(armDir, 'scene-lock.json'),
              JSON.stringify(scene, null, 2),
            );
          }
          done += 1;
          console.log('ok');
        } catch (err) {
          files.push(null);
          failed += 1;
          console.log(err instanceof Error ? err.message : 'failed');
        }
      }

      await buildArmSheet(qualityDir, arm.id, files);
      rows.push({ strategy: arm, files });
    }

    const file = await buildCompareSheet(
      runDir,
      quality,
      rows,
      headers,
      sources.map((src) => path.join(dir!, src.fileName)),
    );
    sheets.push({ quality, file, done, failed });
    console.log(`\n  ${quality} pass complete: ${done} generated, ${failed} failed`);
    console.log(`  ${file}`);
  }

  console.log(`\n  Done.\n`);
  sheets.forEach((s) =>
    console.log(`  ${s.quality.padEnd(7)} ${s.file}${s.failed ? `  (${s.failed} failed)` : ''}`),
  );
  console.log(`\n  Per-arm sheets:    ${runDir}/<quality>/<arm>.jpg`);
  console.log(`  Full-size images:  ${runDir}/<quality>/<arm>/`);
  console.log(`  Exact prompts:     ${runDir}/prompts/\n`);
  console.log('  Arms, top to bottom in every COMPARE sheet:');
  arms.forEach((a) => console.log(`    ${a.id.padEnd(11)} ${a.name}`));
  console.log(
    '\n  The sheets share a layout on purpose -- open them in one viewer and flip between\n' +
      '  them, and the only thing that moves is what the quality tier changed.\n',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
