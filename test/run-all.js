import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDir = __dirname;
const files = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.js'))
  .sort();

console.log(`\n========================================================`);
console.log(`⚔️  LevelUp RPG — Running Complete Test Suite (${files.length} test files)`);
console.log(`========================================================\n`);

const startTime = Date.now();
const passed = [];
const failed = [];

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  const filePath = path.join(testDir, file);
  const prefix = `[${String(i + 1).padStart(2, '0')}/${files.length}]`;
  
  process.stdout.write(`${prefix} Running ${file}... `);
  const startFile = Date.now();
  
  const res = spawnSync(process.execPath, [filePath], {
    timeout: 15000,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' }
  });
  
  const elapsed = ((Date.now() - startFile) / 1000).toFixed(2);
  
  if (res.error && res.error.code === 'ETIMEDOUT') {
    console.log(`❌ TIMEOUT (${elapsed}s)`);
    failed.push({ file, error: `Test exceeded 15s timeout.` });
  } else if (res.status !== 0) {
    console.log(`❌ FAILED (${elapsed}s)`);
    failed.push({ file, error: res.stderr || res.stdout });
  } else {
    console.log(`✅ PASS (${elapsed}s)`);
    passed.push(file);
  }
}

const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`\n========================================================`);
console.log(`🏁 TEST SUITE SUMMARY (Duration: ${totalTime}s)`);
console.log(`========================================================`);
console.log(`✅ Passed: ${passed.length} / ${files.length}`);
console.log(`❌ Failed: ${failed.length} / ${files.length}`);

if (failed.length > 0) {
  console.log(`\n--- FAILED TESTS DETAILS ---`);
  for (const f of failed) {
    console.log(`\n[FAIL] ${f.file}:`);
    console.log(f.error);
  }
  process.exit(1);
} else {
  console.log(`\n🎉 ALL ${files.length} TEST SUITES PASSED SUCCESSFULLY (100%)!\n`);
  process.exit(0);
}
