/**
 * Run the A/B harness across several items and several planning logics in one command.
 *
 *   npm run ab:all -- ./test-photos/chairs ./test-photos/car --logic v4,v5 --count 8 \
 *     --arms forensic --notes-chairs "..." --notes-car "..."
 *
 * This is a runner, not a second harness. It shells out to scripts/ab-prompts.ts once per
 * combination and passes everything else straight through, so there is exactly one implementation
 * of the experiment and no chance of the matrix version drifting from the single-run version.
 *
 * Runs are sequential on purpose. Four concurrent runs would interleave their output into an
 * unreadable stream and quadruple the request rate for no wall-clock gain worth having.
 */
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const argv = process.argv.slice(2);

const flag = (n: string): string | undefined => {
  const i = argv.indexOf(`--${n}`);
  if (i === -1) return undefined;
  const rest: string[] = [];
  for (let j = i + 1; j < argv.length && !argv[j].startsWith('--'); j++) rest.push(argv[j]);
  return rest.length ? rest.join(' ') : undefined;
};

const firstFlag = argv.findIndex((a) => a.startsWith('--'));
const folders = (firstFlag === -1 ? argv : argv.slice(0, firstFlag)).filter(Boolean);

if (!folders.length) {
  console.error(`
  Usage: npm run ab:all -- <folder> [<folder> ...] [options]

    --logic v4,v5     planning logics to run (default: v4,v5)
    --count N         shots per run (default 8)
    --arms a,b        strategies (default: forensic)
    --quality a,b     tiers (default: low)
    --only marketing  restrict the comparison to marketing shots
    --notes-<name>    seller notes for the folder called <name>
    --plan-only       plan everything, generate nothing (free)

  Every other flag is passed through to the single-run harness unchanged.
`);
  process.exit(1);
}

const logics = (flag('logic') ?? 'v4,v5').split(',').map((l) => l.trim());
const count = flag('count') ?? '8';
const arms = flag('arms') ?? 'forensic';

/** Flags this runner owns. Everything else is forwarded verbatim. */
const OWNED = new Set(['logic', 'count', 'arms']);

function passthrough(): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const name = a.slice(2);
    // Per-folder notes are resolved below, and the runner's own flags are re-emitted explicitly.
    if (OWNED.has(name) || name.startsWith('notes-')) {
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) i++;
      continue;
    }
    out.push(a);
    while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) out.push(argv[++i]);
  }
  return out;
}

function run(args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', 'scripts/ab-prompts.ts', ...args], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

async function main() {
  const jobs: { folder: string; logic: string; name: string }[] = [];
  for (const folder of folders) {
    for (const logic of logics) {
      jobs.push({ folder, logic, name: path.basename(path.resolve(folder)) });
    }
  }

  console.log(`\n  ${jobs.length} runs: ${folders.length} item(s) x ${logics.length} logic(s)`);
  jobs.forEach((j, i) => console.log(`    ${i + 1}. ${j.name} @ ${j.logic}`));

  const results: { label: string; code: number }[] = [];

  for (const [i, job] of jobs.entries()) {
    const label = `${job.name} @ ${job.logic}`;
    console.log(`\n\n${'#'.repeat(70)}`);
    console.log(`#  RUN ${i + 1} of ${jobs.length}:  ${label}`);
    console.log(`${'#'.repeat(70)}`);

    const notes = flag(`notes-${job.name}`);
    const args = [
      job.folder,
      '--logic', job.logic,
      '--count', count,
      '--arms', arms,
      ...(notes ? ['--notes', notes] : []),
      ...passthrough(),
    ];

    const code = await run(args);
    results.push({ label, code });
    if (code !== 0) console.log(`\n  (${label} exited ${code})`);
  }

  console.log(`\n\n${'='.repeat(70)}`);
  console.log('  ALL RUNS COMPLETE');
  console.log(`${'='.repeat(70)}`);
  results.forEach((r) => console.log(`    ${r.code === 0 ? 'ok  ' : 'FAIL'} ${r.label}`));

  // Reviewing several items means opening several sheets, and hunting for them among timestamped
  // folders is exactly the friction that stops anyone actually looking.
  const abRoot = path.join(process.cwd(), 'studio-output', 'ab');
  const sheets: string[] = [];
  try {
    const dirs = (await fs.readdir(abRoot, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
      .slice(-jobs.length);
    for (const d of dirs) {
      for (const f of await fs.readdir(path.join(abRoot, d))) {
        if (f.startsWith('COMPARE-')) sheets.push(path.join(abRoot, d, f));
      }
    }
  } catch {
    // Listing is a convenience; a failure here should not look like the run failed.
  }

  if (sheets.length) {
    console.log('\n  Sheets to review:');
    sheets.forEach((f) => console.log(`    ${f}`));
    console.log('\n  Each one now carries the seller\'s original photographs on its top row, so a');
    console.log('  sheet can be judged -- or handed to somebody else -- without a folder of context.');
  }
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
