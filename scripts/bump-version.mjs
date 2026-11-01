import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';

// Paths (relative to repo root) of every generated/versioned file.
const PKG_FILE = 'package.json';
const LOCK_FILE = 'package-lock.json';
const DIST_FILE = 'dist/fitgirl-enhanced.user.js';
const ROLLBACK_FILES = [PKG_FILE, LOCK_FILE, DIST_FILE];

const rootDir = resolve(import.meta.dirname, '..');
const pkgPath = resolve(rootDir, PKG_FILE);
const distPath = resolve(rootDir, DIST_FILE);

/**
 * Run git and return trimmed stdout. Throws when git exits non-zero.
 */
function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    ...options,
  }).trim();
}

function gitTagExists(tag) {
  try {
    git(['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`]);
    return true;
  } catch {
    return false;
  }
}

function workingTreeIsClean() {
  return git(['status', '--porcelain']) === '';
}

function isTracked(file) {
  try {
    git(['ls-files', '--error-unmatch', file]);
    return true;
  } catch {
    return false;
  }
}

function rollback() {
  let warned = false;
  for (const file of ROLLBACK_FILES) {
    if (!isTracked(file)) {
      continue;
    }
    try {
      execFileSync('git', ['checkout', '--', file], { cwd: rootDir, stdio: 'ignore' });
      console.warn(`  ↩ Restored ${file}`);
    } catch {
      warned = true;
      console.warn(`  ! Could not restore ${file} (restore manually if needed)`);
    }
  }
  if (warned) {
    console.warn(`  ! Manual rollback: git checkout -- ${ROLLBACK_FILES.join(' ')}`);
  }
}

/**
 * npm rewrites JSON with the platform EOL on some setups; force LF so
 * `prettier --check` (endOfLine: lf) stays green on Windows.
 */
function normalizeEol(paths) {
  for (const path of paths) {
    const absolute = resolve(rootDir, path);
    if (!existsSync(absolute)) {
      continue;
    }
    const content = readFileSync(absolute, 'utf8');
    const normalized = content.replace(/\r\n/g, '\n');
    if (normalized !== content) {
      writeFileSync(absolute, normalized, 'utf8');
    }
  }
}

function resolveDistVersion() {
  const content = readFileSync(distPath, 'utf8');
  const match = content.match(/^\/\/ @version\s+(\S+)\s*$/m);
  return match ? match[1] : null;
}

// --- 1. Read current version from the SSOT -------------------------------
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version;

// --- 2. Parse arguments --------------------------------------------------
const argv = process.argv.slice(2);
const releaseMode = argv.includes('--release');
const targetArg = argv.find((arg) => !arg.startsWith('--'));

if (!targetArg) {
  console.error('❌ Please provide target version or release type!');
  console.error('Usage: npm run bump <patch | minor | major | x.y.z>');
  console.error('       npm run release <patch | minor | major | x.y.z>');
  console.error(`Current version: ${currentVersion}`);
  process.exit(1);
}

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?$/;

function computeNextVersion(current, type) {
  const match = SEMVER_RE.exec(current);
  if (!match) {
    throw new Error(`Invalid current version format: ${current}`);
  }
  const [major, minor, patch] = [match[1], match[2], match[3]].map((n) => Number.parseInt(n, 10));
  const hasPrerelease = Boolean(match[4]);

  if (type === 'patch') {
    // 1.7.0-beta.1 -> 1.7.0 (promote the pending release)
    return hasPrerelease ? `${major}.${minor}.${patch}` : `${major}.${minor}.${patch + 1}`;
  }
  if (type === 'minor') {
    return `${major}.${minor + 1}.0`;
  }
  if (type === 'major') {
    return `${major + 1}.0.0`;
  }
  if (SEMVER_RE.test(type)) {
    return type;
  }
  throw new Error(
    `Unknown release type or invalid version: ${type} (expected patch, minor, major, or x.y.z)`,
  );
}

let nextVersion;
try {
  nextVersion = computeNextVersion(currentVersion, targetArg);
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exit(1);
}

if (nextVersion === currentVersion) {
  console.warn(`⚠️ Target version matches current version (${currentVersion}), no update needed.`);
  process.exit(0);
}

const nextTag = `v${nextVersion}`;
const mode = releaseMode ? 'release' : 'bump';

console.log(`🚀 Starting ${mode}: v${currentVersion} -> v${nextVersion}`);

// --- 3. Pre-flight guards ------------------------------------------------
if (gitTagExists(nextTag)) {
  console.error(`❌ Tag ${nextTag} already exists. Pick another version or delete the tag first.`);
  process.exit(1);
}

if (releaseMode && !workingTreeIsClean()) {
  console.error('❌ Release mode requires a clean working tree. Commit or stash first:');
  console.error(git(['status', '--short']).replace(/^/gm, '   '));
  process.exit(1);
}

// --- 4. Bump package.json + package-lock.json via npm --------------------
try {
  execSync(`npm version ${nextVersion} --no-git-tag-version`, {
    cwd: rootDir,
    stdio: 'inherit',
  });
  console.log('  ✓ package.json + package-lock.json updated by npm');
} catch (err) {
  console.error('❌ npm version failed:', err.message);
  process.exit(1);
}

const bumpedVersion = JSON.parse(readFileSync(pkgPath, 'utf8')).version;
if (bumpedVersion !== nextVersion) {
  console.error(`❌ package.json version is ${bumpedVersion}, expected ${nextVersion}`);
  rollback();
  process.exit(1);
}

// --- 5. Rebuild the Userscript artifact ----------------------------------
const verifyCommand = releaseMode ? 'npm run check' : 'npm run build';
console.log(`🔨 Running ${verifyCommand}...`);
try {
  normalizeEol(['package.json', 'package-lock.json']);
  execSync(verifyCommand, { cwd: rootDir, stdio: 'inherit' });
} catch (err) {
  console.error(`❌ ${verifyCommand} failed:`, err.message);
  rollback();
  process.exit(1);
}

// --- 6. Assert the artifact carries the SSOT version ---------------------
const distVersion = resolveDistVersion();
if (distVersion !== nextVersion) {
  console.error(
    `❌ dist/fitgirl-enhanced.user.js @version is ${distVersion ?? '(missing)'}, expected ${nextVersion}`,
  );
  rollback();
  process.exit(1);
}
console.log(`  ✓ dist/fitgirl-enhanced.user.js @version ${distVersion}`);

// --- 7. Optional commit + annotated tag ----------------------------------
if (releaseMode) {
  try {
    const filesToCommit = ROLLBACK_FILES.filter((file) => existsSync(resolve(rootDir, file)));
    git(['add', ...filesToCommit]);
    git(['commit', '-m', `chore: release ${nextTag}`]);
    git(['tag', '-a', nextTag, '-m', nextTag]);
    console.log(`  ✓ Commit created: chore: release ${nextTag}`);
    console.log(`  ✓ Annotated tag created: ${nextTag}`);
  } catch (err) {
    console.error('❌ Commit/tag failed:', err.message);
    console.error('   Version files are bumped; inspect `git status` before retrying.');
    process.exit(1);
  }
}

// --- 8. Summary ----------------------------------------------------------
console.log(`\n🎉 Version successfully updated to v${nextVersion}!`);
console.log('Synchronized files (SSOT: package.json):');
console.log(`  - package.json (version: ${nextVersion})`);
console.log(`  - package-lock.json (version: ${nextVersion})`);
console.log(`  - dist/fitgirl-enhanced.user.js (@version ${nextVersion})`);
console.log('  - README badges are dynamic (shields.io github/package-json) — no edit needed');
if (releaseMode) {
  console.log(`\nNext step (not run automatically):\n  git push --follow-tags`);
} else {
  console.log(
    '\nFiles changed but not committed. Review, then commit/tag or run `npm run release`.',
  );
}
