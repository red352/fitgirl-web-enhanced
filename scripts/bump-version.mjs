import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';

const rootDir = resolve(import.meta.dirname, '..');
const pkgPath = resolve(rootDir, 'package.json');
const lockPath = resolve(rootDir, 'package-lock.json');
const readmePath = resolve(rootDir, 'README.md');
const readmeZhPath = resolve(rootDir, 'README.zh-CN.md');

// 1. Read current package.json
const pkgRaw = readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgRaw);
const currentVersion = pkg.version;

// 2. Parse target version argument
const targetArg = process.argv[2];
if (!targetArg) {
  console.error('❌ Please provide target version or release type!');
  console.error('Usage: npm run bump <patch | minor | major | x.y.z>');
  console.error(`Current version: ${currentVersion}`);
  process.exit(1);
}

function computeNextVersion(current, type) {
  const parts = current.split('.').map((n) => Number.parseInt(n, 10));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error(`Invalid current version format: ${current}`);
  }
  let [major, minor, patch] = parts;
  if (type === 'patch') {
    patch += 1;
  } else if (type === 'minor') {
    minor += 1;
    patch = 0;
  } else if (type === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(type)) {
    return type;
  } else {
    throw new Error(
      `Unknown release type or invalid version: ${type} (expected patch, minor, major, or x.y.z)`,
    );
  }
  return `${major}.${minor}.${patch}`;
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

console.log(`🚀 Starting unified version bump: v${currentVersion} -> v${nextVersion}`);

// 3. Update package.json
pkg.version = nextVersion;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
console.log('  ✓ Updated package.json');

// 4. Update package-lock.json
try {
  const lockRaw = readFileSync(lockPath, 'utf8');
  const lock = JSON.parse(lockRaw);
  lock.version = nextVersion;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = nextVersion;
  }
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  console.log('  ✓ Updated package-lock.json');
} catch (err) {
  console.warn('  ! Warning: failed to update package-lock.json:', err.message);
}

// 5. Update version badges in README.md and README.zh-CN.md
const readmeFiles = [
  { path: readmePath, name: 'README.md' },
  { path: readmeZhPath, name: 'README.zh-CN.md' },
];

for (const { path, name } of readmeFiles) {
  try {
    const readme = readFileSync(path, 'utf8');
    const updatedReadme = readme.replace(
      /badge\/Userscript-v\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?-blue\.svg/g,
      `badge/Userscript-v${nextVersion}-blue.svg`,
    );
    if (updatedReadme !== readme) {
      writeFileSync(path, updatedReadme, 'utf8');
      console.log(`  ✓ Updated version badge in ${name}`);
    }
  } catch (err) {
    console.warn(`  ! Failed to update ${name}:`, err.message);
  }
}

// 6. Rebuild to produce Userscript artifact with updated version header
console.log('🔨 Rebuilding Userscript bundle (dist/fitgirl-enhanced.user.js)...');
try {
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
  console.log('  ✓ Successfully rebuilt dist/fitgirl-enhanced.user.js');
} catch (err) {
  console.error('❌ Rebuild failed:', err.message);
  process.exit(1);
}

console.log(`\n🎉 Version successfully updated to v${nextVersion}!`);
console.log('Synchronized files:');
console.log(`  - package.json (version: ${nextVersion})`);
console.log(`  - package-lock.json (version: ${nextVersion})`);
console.log(`  - vite.config.ts (dynamically reads package.json)`);
console.log(`  - README.md (Userscript-v${nextVersion}-blue.svg)`);
console.log(`  - README.zh-CN.md (Userscript-v${nextVersion}-blue.svg)`);
console.log(`  - dist/fitgirl-enhanced.user.js (Userscript header @version ${nextVersion})`);
