import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const srcJsDir = path.join(rootDir, 'src', 'js');
const targetFile = path.join(rootDir, 'public', 'app.js');

export function buildClient() {
  const startTime = Date.now();

  if (!fs.existsSync(srcJsDir)) {
    throw new Error(`Directory not found: ${srcJsDir}`);
  }

  const files = fs.readdirSync(srcJsDir)
    .filter(f => f.endsWith('.js') && !f.endsWith('.test.js'))
    .sort();

  if (files.length === 0) {
    throw new Error(`No JavaScript modules found in ${srcJsDir}`);
  }

  const parts = [];
  for (const file of files) {
    const filePath = path.join(srcJsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    parts.push(content);
  }

  const bundledCode = parts.join('\n');
  fs.writeFileSync(targetFile, bundledCode, 'utf8');

  // Verify syntax with node -c
  try {
    execSync(`node -c "${targetFile}"`, { stdio: 'pipe' });
  } catch (err) {
    console.error(`❌ Syntax Error detected in bundled client code!`);
    throw err;
  }

  const elapsed = Date.now() - startTime;
  const sizeKb = (Buffer.byteLength(bundledCode, 'utf8') / 1024).toFixed(1);
  console.log(`⚡ [LevelUp Build] Packaged ${files.length} modules -> public/app.js (${sizeKb} KB) in ${elapsed}ms`);
  return { filesCount: files.length, sizeKb, elapsed };
}

// Check CLI arguments
const isWatch = process.argv.includes('--watch') || process.argv.includes('-w');

try {
  buildClient();
} catch (err) {
  console.error(err);
  process.exit(1);
}

if (isWatch) {
  console.log(`👀 Watching ${srcJsDir} for changes... (Press Ctrl+C to stop)`);
  let debounceTimer = null;
  fs.watch(srcJsDir, (eventType, filename) => {
    if (filename && filename.endsWith('.js')) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        try {
          console.log(`\n🔄 Change detected in ${filename}, rebuilding...`);
          buildClient();
        } catch (err) {
          console.error(`Build failed:`, err.message);
        }
      }, 50);
    }
  });
}
