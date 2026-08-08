/**
 * Pull the latest work without the usual papercuts.
 *
 *   npm run sync
 *
 * Two generated files are perpetually modified and block a rebase every time: next-env.d.ts,
 * which Next rewrites whenever you switch between `dev` and `build`, and package-lock.json,
 * which npm rewrites on install. Both are regenerated, so discarding them is always safe --
 * but doing it by hand every time is how a two-second pull turns into a five-minute detour.
 *
 * Leaves `npm run dev` alone. The dev server hot-reloads, so a pull lands in the browser on its
 * own; there is no need to stop and restart it.
 */
import { execSync } from 'child_process';

const run = (cmd, quiet = false) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: quiet ? 'pipe' : 'inherit' }) ?? '';
  } catch (err) {
    if (!quiet) process.exit(err.status ?? 1);
    return '';
  }
};

const branch = run('git rev-parse --abbrev-ref HEAD', true).trim();
const before = run('git rev-parse HEAD', true).trim();

// Discard the two known-generated files so the rebase can start.
for (const f of ['next-env.d.ts', 'package-lock.json']) {
  run(`git checkout -- ${f}`, true);
}

// Only MODIFIED TRACKED files block a rebase. Untracked ones are none of git's business and
// stopping for them just blocks the pull over things like a downloaded CLI sitting in the folder.
const dirty = run('git status --porcelain', true)
  .split('\n')
  .filter((l) => l.trim() && !l.startsWith('??'));

if (dirty.length) {
  console.error('\n  You have uncommitted changes to tracked files:\n');
  console.error(dirty.map((l) => `    ${l}`).join('\n'));
  console.error('\n  Commit or stash them first — sync will not touch your own work.\n');
  process.exit(1);
}

console.log(`\n  Pulling ${branch}...\n`);
run(`git pull --rebase origin ${branch}`);

const after = run('git rev-parse HEAD', true).trim();
if (before === after) {
  console.log('\n  Already up to date.\n');
  process.exit(0);
}

// Only worth reinstalling when dependencies actually moved.
const changed = run(`git diff --name-only ${before} ${after}`, true);
const needsInstall = changed.includes('package.json');

console.log('\n  Updated:');
console.log(run(`git log --oneline ${before}..${after}`, true).split('\n').filter(Boolean).map((l) => `    ${l}`).join('\n'));
console.log(
  needsInstall
    ? '\n  Dependencies changed — run `npm install`, then restart the dev server.\n'
    : '\n  Dev server will hot-reload. No restart needed.\n',
);
