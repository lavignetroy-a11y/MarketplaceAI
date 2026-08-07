/**
 * Batch-generates the site's images from the command line.
 *
 *   npm run studio:generate -- --quality low
 *
 * Built for a long unattended run, so the three things that actually go wrong over 117 sequential
 * API calls are handled rather than left to chance:
 *
 *   - Rate limits. 429s and 5xx are retried with backoff instead of killing the run.
 *   - Interruption. Finished images are skipped on the next run, so a crash at image 90 costs
 *     the 27 that were left, not all 117.
 *   - Silent partial failure. Anything that fails is listed by id at the end with its reason,
 *     so a follow-up run can target exactly those.
 *
 * Roots are always generated before the shots derived from them; without that ordering every
 * derived image would fail on a fresh checkout.
 */
import { loadEnvConfig } from '@next/env';
import { STUDIO_MANIFEST, studioBatchOrder, studioImageById } from '../lib/studio/manifest';
import { estimateCost, formatCost, type StudioQuality } from '../lib/studio/cost';
import { generateStudioImage, imageExists, MissingDependencyError } from '../lib/studio/generate';

loadEnvConfig(process.cwd());

const MAX_ATTEMPTS = 4;
const BACKOFF_MS = [5_000, 15_000, 45_000];

type Args = {
  quality: StudioQuality;
  only?: string;
  force: boolean;
  dryRun: boolean;
  limit?: number;
};

function parseArgs(argv: string[]): Args {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i === -1 ? undefined : argv[i + 1];
  };
  const quality = (get('--quality') ?? 'low') as StudioQuality;
  if (!['low', 'medium', 'high'].includes(quality)) {
    throw new Error(`--quality must be low, medium, or high (got "${quality}")`);
  }
  const limitRaw = get('--limit');
  return {
    quality,
    only: get('--only'),
    force: argv.includes('--force'),
    dryRun: argv.includes('--dry-run'),
    limit: limitRaw ? Number(limitRaw) : undefined,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 429s and 5xx are transient; a bad prompt or a missing dependency is not. */
function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 429) return true;
  if (typeof status === 'number' && status >= 500) return true;
  const code = (err as { code?: string })?.code;
  return code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey && !args.dryRun) {
    console.error(
      '\n  OPENAI_API_KEY not found.\n\n' +
        '  Put it in .env.local at the repo root:\n' +
        '    OPENAI_API_KEY=sk-...\n',
    );
    process.exit(1);
  }

  let candidates = STUDIO_MANIFEST;
  if (args.only) candidates = candidates.filter((i) => i.id.startsWith(args.only!));
  if (!candidates.length) {
    console.error(`No images match --only "${args.only}".`);
    process.exit(1);
  }

  // Skip what's already on disk so an interrupted run resumes instead of restarting.
  const todo: typeof candidates = [];
  for (const image of candidates) {
    if (!args.force && (await imageExists(image))) continue;
    todo.push(image);
  }

  let ids = studioBatchOrder(todo.map((i) => i.id));
  if (args.limit) ids = ids.slice(0, args.limit);

  const skipped = candidates.length - todo.length;
  const cost = estimateCost(
    ids.map((id) => studioImageById(id)!.size),
    args.quality,
  );

  console.log(`\n  Model      ${process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2'}`);
  console.log(`  Quality    ${args.quality}`);
  console.log(`  To do      ${ids.length} image${ids.length === 1 ? '' : 's'}${skipped ? ` (${skipped} already on disk, skipped)` : ''}`);
  console.log(`  Est. cost  ~${formatCost(cost)} of output, before reference-image input tokens\n`);

  if (args.dryRun) {
    ids.forEach((id, n) => {
      const i = studioImageById(id)!;
      console.log(`  ${String(n + 1).padStart(3)}. ${id}  ${i.size}${i.dependsOn.length ? `  <- ${i.dependsOn.join(', ')}` : ''}`);
    });
    console.log('\n  Dry run — nothing generated.\n');
    return;
  }

  if (!ids.length) {
    console.log('  Nothing to do.\n');
    return;
  }

  const failures: { id: string; reason: string }[] = [];
  let done = 0;
  const startedAt = Date.now();

  const summary = () => {
    const mins = ((Date.now() - startedAt) / 60_000).toFixed(1);
    console.log(`\n  Generated ${done}/${ids.length} in ${mins} min.`);
    if (failures.length) {
      console.log(`\n  ${failures.length} failed:`);
      for (const f of failures) console.log(`    ${f.id}\n      ${f.reason}`);
      console.log('\n  Re-run the same command to retry only these — finished images are skipped.\n');
    } else {
      console.log('  No failures.\n');
    }
  };

  process.on('SIGINT', () => {
    console.log('\n\n  Interrupted.');
    summary();
    process.exit(130);
  });

  for (const [index, id] of ids.entries()) {
    const image = studioImageById(id)!;
    const label = `[${String(index + 1).padStart(3)}/${ids.length}] ${id}`;
    const began = Date.now();

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const { bytes } = await generateStudioImage(image, args.quality, apiKey!);
        const secs = ((Date.now() - began) / 1000).toFixed(1);
        console.log(`  ${label}  ok  ${(bytes / 1024).toFixed(0)}KB  ${secs}s`);
        done++;
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err;
        // A derived shot whose root failed can never succeed by retrying -- fail it immediately
        // so the run doesn't spend three backoffs discovering that.
        if (err instanceof MissingDependencyError) break;
        if (attempt < MAX_ATTEMPTS && isRetryable(err)) {
          const wait = BACKOFF_MS[attempt - 1];
          console.log(`  ${label}  retrying in ${wait / 1000}s (attempt ${attempt} of ${MAX_ATTEMPTS - 1})`);
          await sleep(wait);
          continue;
        }
        break;
      }
    }

    if (lastError) {
      const reason = lastError instanceof Error ? lastError.message : String(lastError);
      console.log(`  ${label}  FAILED  ${reason}`);
      failures.push({ id, reason });
    }
  }

  summary();
  process.exit(failures.length ? 1 : 0);
}

main().catch((err) => {
  console.error('\n  Fatal:', err instanceof Error ? err.message : err, '\n');
  process.exit(1);
});
