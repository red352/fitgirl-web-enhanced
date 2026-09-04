import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';

const rootDir = resolve(import.meta.dirname, '..');
const pkgPath = resolve(rootDir, 'package.json');
const lockPath = resolve(rootDir, 'package-lock.json');
const readmePath = resolve(rootDir, 'README.md');

// 1. 读取当前 package.json
const pkgRaw = readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgRaw);
const currentVersion = pkg.version;

// 2. 解析目标版本参数
const targetArg = process.argv[2];
if (!targetArg) {
  console.error('❌ 请提供目标版本或升级类型！');
  console.error('用法: npm run bump <patch | minor | major | x.y.z>');
  console.error(`当前版本: ${currentVersion}`);
  process.exit(1);
}

function computeNextVersion(current, type) {
  const parts = current.split('.').map((n) => Number.parseInt(n, 10));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error(`当前版本号格式不合法: ${current}`);
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
      `未知的版本升级类型或不合法的版本号: ${type}（仅支持 patch, minor, major 或 x.y.z 格式）`,
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
  console.warn(`⚠️ 目标版本与当前版本一致 (${currentVersion})，无需更新。`);
  process.exit(0);
}

console.log(`🚀 开始版本统一更新: v${currentVersion} -> v${nextVersion}`);

// 3. 更新 package.json
pkg.version = nextVersion;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
console.log('  ✓ 已更新 package.json');

// 4. 更新 package-lock.json
try {
  const lockRaw = readFileSync(lockPath, 'utf8');
  const lock = JSON.parse(lockRaw);
  lock.version = nextVersion;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = nextVersion;
  }
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  console.log('  ✓ 已更新 package-lock.json');
} catch (err) {
  console.warn('  ! 未找到或更新 package-lock.json 失败:', err.message);
}

// 5. 更新 README.md 中的版本徽章
try {
  const readme = readFileSync(readmePath, 'utf8');
  const updatedReadme = readme.replace(
    /badge\/Userscript-v\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?-blue\.svg/g,
    `badge/Userscript-v${nextVersion}-blue.svg`,
  );
  if (updatedReadme !== readme) {
    writeFileSync(readmePath, updatedReadme, 'utf8');
    console.log('  ✓ 已更新 README.md 版本徽章');
  }
} catch (err) {
  console.warn('  ! 更新 README.md 失败:', err.message);
}

// 6. 重新执行编译以生成带新版本头信息的 Userscript 产物
console.log('🔨 正在重新编译 Userscript (dist/fitgirl-enhanced.user.js)...');
try {
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
  console.log('  ✓ 已编译最新 dist/fitgirl-enhanced.user.js');
} catch (err) {
  console.error('❌ 重新构建失败:', err.message);
  process.exit(1);
}

console.log(`\n🎉 版本已成功统一更新为 v${nextVersion}！`);
console.log('涉及同步更新的文件:');
console.log(`  - package.json (version: ${nextVersion})`);
console.log(`  - package-lock.json (version: ${nextVersion})`);
console.log(`  - vite.config.ts (自动读取 package.json)`);
console.log(`  - README.md (Userscript-v${nextVersion}-blue.svg)`);
console.log(`  - dist/fitgirl-enhanced.user.js (Userscript header @version ${nextVersion})`);
