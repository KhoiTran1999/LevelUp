import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== KIỂM THỬ HỆ THỐNG MATERIAL DESIGN 3 LOADING & PROGRESS INDICATORS ===\n');

const htmlPath = path.resolve('public/index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const cssPath = path.resolve('public/style.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

const appJsPath = path.resolve('test/fixtures/legacy-client/app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// 1. Kiểm tra Global Linear Progress Bar trong index.html
console.log('1. Kiểm tra M3 Global Linear Progress Bar...');
assert.ok(htmlContent.includes('id="global-progress-bar"'), 'Phải có phần tử #global-progress-bar');
assert.ok(htmlContent.includes('class="m3-linear-progress is-indeterminate hidden opacity-0"'), 'Global progress bar phải có class m3-linear-progress và is-indeterminate');
assert.ok(htmlContent.includes('m3-linear-progress-bar-primary'), 'Phải có primary bar cho 2-phase indeterminate animation');
assert.ok(htmlContent.includes('m3-linear-progress-bar-secondary'), 'Phải có secondary bar cho 2-phase indeterminate animation');
assert.ok(htmlContent.includes('m3-linear-progress-stop'), 'Phải có M3 stop indicator');
console.log('  ✅ Global Linear Progress Bar hợp lệ chuẩn M3!');

// 2. Kiểm tra Daily Quests Group Progress Indicator trong index.html
console.log('2. Kiểm tra M3 Daily Quests Group Progress Indicator...');
assert.ok(htmlContent.includes('id="quests-daily-progress"'), 'Phải có thẻ tiến độ ngày #quests-daily-progress');
assert.ok(htmlContent.includes('id="quests-daily-progress-text"'), 'Phải có nhãn tiến độ ngày #quests-daily-progress-text');
assert.ok(htmlContent.includes('id="quests-daily-progress-bar"'), 'Phải có thanh tiến độ ngày #quests-daily-progress-bar');
assert.ok(htmlContent.includes('id="quests-daily-progress-status"'), 'Phải có huy hiệu trạng thái #quests-daily-progress-status');
console.log('  ✅ Daily Quests Group Progress hợp lệ chuẩn M3!');

// 3. Kiểm tra các modal AI Evaluating Indicators
console.log('3. Kiểm tra M3 Indicators trong Quest, Reward & Proof Modals...');
assert.ok(htmlContent.includes('id="quest-evaluating-progress-bar"'), 'Phải có M3 progress bar trong quest-evaluating-step');
assert.ok(htmlContent.includes('id="reward-evaluating-progress-bar"'), 'Phải có M3 progress bar trong reward-evaluating-step');
assert.ok(htmlContent.includes('id="proof-evaluating-progress-bar"'), 'Phải có M3 progress bar trong proof-evaluating-zone');
assert.ok(htmlContent.includes('m3-loading-indicator contained mx-auto text-amber-500'), 'Phải có M3 Expressive Contained Loading Indicator');
assert.ok(htmlContent.includes('m3-loading-indicator-shape large'), 'Phải có large morphing shape indicator');
console.log('  ✅ AI Modals Indicator hợp lệ chuẩn M3!');

// 4. Kiểm tra Assistant Realtime Step Progress
console.log('4. Kiểm tra M3 Indicator trong Trợ Lý Phù Thủy...');
assert.ok(htmlContent.includes('id="assistant-step-container"'), 'Phải có assistant-step-container');
assert.ok(htmlContent.includes('id="assistant-step-bar"'), 'Phải có assistant-step-bar');
console.log('  ✅ Assistant thinking progress bar hợp lệ chuẩn M3!');

// 5. Kiểm tra CSS Tokens, Keyframes và Classes trong style.css
console.log('5. Kiểm tra CSS Rules trong style.css...');
assert.ok(cssContent.includes('.m3-linear-progress'), 'style.css phải chứa .m3-linear-progress');
assert.ok(cssContent.includes('.m3-linear-progress-stop'), 'style.css phải chứa .m3-linear-progress-stop');
assert.ok(cssContent.includes('m3LinearIndeterminate1'), 'style.css phải chứa @keyframes m3LinearIndeterminate1');
assert.ok(cssContent.includes('m3LinearIndeterminate2'), 'style.css phải chứa @keyframes m3LinearIndeterminate2');
assert.ok(cssContent.includes('.m3-loading-indicator'), 'style.css phải chứa .m3-loading-indicator');
assert.ok(cssContent.includes('m3ShapeMorph'), 'style.css phải chứa @keyframes m3ShapeMorph');
assert.ok(cssContent.includes('.btn-m3-loading'), 'style.css phải chứa .btn-m3-loading');
assert.ok(cssContent.includes('.m3-skeleton-row'), 'style.css phải chứa .m3-skeleton-row');
assert.ok(cssContent.includes('m3ShimmerWave'), 'style.css phải chứa @keyframes m3ShimmerWave');
console.log('  ✅ M3 CSS System hoàn chỉnh!');

// 6. Kiểm tra JavaScript Helpers trong app.js
console.log('6. Kiểm tra JavaScript Helpers trong app.js...');
assert.ok(appJsContent.includes('function setGlobalProgress'), 'app.js phải chứa setGlobalProgress');
assert.ok(appJsContent.includes('function setButtonLoading'), 'app.js phải chứa setButtonLoading');
assert.ok(appJsContent.includes('function renderM3TableLoading'), 'app.js phải chứa renderM3TableLoading');
assert.ok(appJsContent.includes('function renderQuestsDailyProgress'), 'app.js phải chứa renderQuestsDailyProgress');
assert.ok(appJsContent.includes('function startM3EvaluationProgress'), 'app.js phải chứa startM3EvaluationProgress');
console.log('  ✅ JavaScript Helpers đầy đủ và đã được đóng gói!');

console.log('\n🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ M3 LOADING & PROGRESS INDICATOR ĐỀU THÀNH CÔNG (100%)!\n');
