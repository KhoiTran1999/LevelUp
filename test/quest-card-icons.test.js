import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { sanitizeEvaluatedQuest } from '../api/ai.js';

console.log('=== Kiểm thử Hệ Thống Icon Trực Quan Cho Thẻ Nhiệm Vụ (Quest Card Icons) ===\n');

const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8').replace(/\r\n/g, '\n');
const indexHtml = fs.readFileSync(path.resolve('public/index.html'), 'utf8').replace(/\r\n/g, '\n');
const aiJs = fs.readFileSync(path.resolve('api/ai.js'), 'utf8').replace(/\r\n/g, '\n');

// 1. Kiểm tra hàm getQuestIcon tồn tại và được export/gắn window
assert.ok(appJs.includes('function getQuestIcon('), 'public/app.js phải chứa hàm getQuestIcon');
assert.ok(appJs.includes('window.getQuestIcon = getQuestIcon;'), 'getQuestIcon phải được gắn vào window');
console.log('✓ Test 1: Hàm getQuestIcon đã được khai báo và gắn global thành công.');

// 2. Kiểm tra bộ dữ liệu mẫu DEFAULT_STATE.quests đã có icon
assert.ok(appJs.includes("icon: '📖'"), 'Nhiệm vụ mẫu đọc sách phải có icon 📖');
assert.ok(appJs.includes("icon: '🧹'"), 'Nhiệm vụ mẫu dọn dẹp phải có icon 🧹');
console.log('✓ Test 2: Các nhiệm vụ khởi tạo (seed quests) được cấp icon trực quan.');

// 3. Kiểm tra logic suy luận emoji từ khóa (Keyword inference)
// Trích xuất hàm getQuestIcon từ appJs để test độc lập
const getQuestIconFn = new Function(`
  ${appJs.slice(appJs.indexOf('function getQuestIcon('), appJs.indexOf('window.getQuestIcon = getQuestIcon;'))}
  return getQuestIcon;
`)();

// Test explicit icon priority
assert.strictEqual(getQuestIconFn({ icon: '🔥', title: 'Đọc sách' }), '🔥', 'Icon được chỉ định phải được ưu tiên');

// Test study / reading keywords (có dấu & không dấu)
assert.strictEqual(getQuestIconFn({ title: 'Đọc sách lập trình' }), '📚');
assert.strictEqual(getQuestIconFn({ title: 'Ôn thi đại học chương 1' }), '📚');
assert.strictEqual(getQuestIconFn({ title: 'doc giao trinh triet hoc' }), '📚');

// Test coding / IT keywords
assert.strictEqual(getQuestIconFn({ title: 'Fix bug thanh toán' }), '💻');
assert.strictEqual(getQuestIconFn({ title: 'Lập trình tính năng mới' }), '💻');
assert.strictEqual(getQuestIconFn({ title: 'Deploy production v2' }), '💻');

// Test fitness / sports keywords
assert.strictEqual(getQuestIconFn({ title: 'Chạy bộ công viên 5km' }), '🏃');
assert.strictEqual(getQuestIconFn({ title: 'Tập gym ngực và tay sau' }), '🏃');
assert.strictEqual(getQuestIconFn({ title: 'Plank va squat tai nha' }), '🏃');

// Test chore / housework keywords
assert.strictEqual(getQuestIconFn({ title: 'Rửa chén và lau bếp' }), '🧹');
assert.strictEqual(getQuestIconFn({ title: 'Dọn dẹp phòng ngủ ngăn nắp' }), '🧹');

// Test cooking / food keywords
assert.strictEqual(getQuestIconFn({ title: 'Nấu bữa tối cho gia đình' }), '🍳');

// Test language keywords
assert.strictEqual(getQuestIconFn({ title: 'Học 20 từ vựng tiếng Anh' }), '🗣️');

// Test work / meeting keywords
assert.strictEqual(getQuestIconFn({ title: 'Họp giao ban đầu tuần' }), '💼');

// Test creative / arts keywords
assert.strictEqual(getQuestIconFn({ title: 'Vẽ phác thảo thiết kế' }), '🎨');

// Test fallback by category / type
assert.strictEqual(getQuestIconFn({ category: 'study', title: 'Một việc gì đó' }), '📚');
assert.strictEqual(getQuestIconFn({ category: 'work', title: 'Xử lý tồn đọng' }), '💻');
assert.strictEqual(getQuestIconFn({ type: 'focus', title: 'Làm việc gì đó' }), '⏳');
assert.strictEqual(getQuestIconFn({ type: 'bounty', title: 'Nhanh gọn' }), '🎯');
console.log('✓ Test 3: Thuật toán suy luận icon đa ngữ (diacritic-agnostic) hoạt động chuẩn xác 100%.');

// 4. Kiểm tra Zone 2 trong renderQuests có container icon giống renderShop
assert.ok(
  appJs.includes("w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-2xl shadow-xs shrink-0 ${isCompleted ? 'opacity-60 grayscale' : ''}") &&
  appJs.includes('${escapeHtml(getQuestIcon(q))}'),
  'renderQuests Zone 2 phải có icon box w-11 h-11 đồng bộ với renderShop'
);
console.log('✓ Test 4: Giao diện thẻ nhiệm vụ đồng bộ hoàn toàn với thẻ phần thưởng Cửa Hàng.');

// 5. Kiểm tra modal-quest Step 3 có verdict-locked-icon
assert.ok(indexHtml.includes('id="verdict-locked-icon" class="text-xl shrink-0">🎯</span>'), 'modal-quest phải có id="verdict-locked-icon"');
assert.ok(appJs.includes("document.getElementById('verdict-locked-icon')"), 'updateVerdictDisplay phải cập nhật verdict-locked-icon');
console.log('✓ Test 5: Hộp thông số khóa AI trong Modal Tạo/Sửa nhiệm vụ tích hợp icon trực quan.');

// 6. Kiểm tra backend api/ai.js tích hợp icon trong evaluate_quest & debate_quest
assert.ok(aiJs.includes('"icon": "1 emoji đại diện phù hợp nhất cho nhiệm vụ này'), 'Prompt evaluate_quest phải yêu cầu trả về icon emoji');
assert.ok(aiJs.includes('result.newIcon = clean.icon || quest.icon;'), 'debate_quest phải bảo toàn hoặc cập nhật icon mới');

const cleanTest = sanitizeEvaluatedQuest({
  title: 'Test quest',
  rewardCoins: 10,
  targetMinutes: 25,
  icon: '<span>🔥</span>'
});
assert.strictEqual(cleanTest.icon, '🔥', 'sanitizeEvaluatedQuest phải lọc sạch thẻ HTML trong icon để chống XSS');
console.log('✓ Test 6: Backend AI định giá & bảo vệ XSS cho icon hoạt động hoàn hảo.');

console.log('\n🎉 TẤT CẢ 6/6 KIỂM THỬ HỆ THỐNG ICON THẺ NHIỆM VỤ ĐÃ VƯỢT QUA XUẤT SẮC!');
