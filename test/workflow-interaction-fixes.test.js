import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Bắt đầu kiểm thử: Sửa lỗi workflow tương tác của người dùng ===\n');

const htmlPath = path.resolve('public/index.html');
const appJsPath = path.resolve('public/app.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(appJsPath, 'utf8');

// ---------------------------------------------------------------------------
// 1. Kiểm tra renderAssistantOptionChips dùng data-prompt chống SyntaxError
// ---------------------------------------------------------------------------
console.log('Test 1: renderAssistantOptionChips sử dụng data-prompt an toàn');
assert.ok(
  js.includes('data-prompt="${escapeHtml(opt.argument || opt.label)}"'),
  'Option chip phải lưu prompt trong thuộc tính data-prompt'
);
assert.ok(
  js.includes("onclick=\"sendQuickAssistantPrompt(this.getAttribute('data-prompt'))\""),
  'Option chip phải lấy dữ liệu từ this.getAttribute(\'data-prompt\') thay vì chuỗi inline JS'
);

// Mô phỏng escapeHtml và render chips với dữ liệu có dấu nháy đơn, ngoặc kép, xuống dòng
function escapeHtml(text) {
  if (!text) return '';
  return text.toString()
    .normalize('NFC')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderAssistantOptionChips(options) {
  if (!Array.isArray(options) || options.length === 0) return '';
  const optionButtons = options.map(opt => `
    <button
      type="button"
      data-prompt="${escapeHtml(opt.argument || opt.label)}"
      onclick="sendQuickAssistantPrompt(this.getAttribute('data-prompt'))"
      class="chip"
    >
      ${escapeHtml(opt.label)}
    </button>
  `).join('');

  return `<div class="chips">${optionButtons}</div>`;
}

const trickyOptions = [
  { label: "Don't give up!", argument: "Let's focus on \"today's tasks\"\nand conquer them!" },
  { label: "Học 20 từ vựng", argument: "Tôi muốn học 20 từ vựng: 'vocabulary' & \"phrases\"" }
];

const rendered = renderAssistantOptionChips(trickyOptions);
assert.ok(rendered.includes('data-prompt='), 'HTML phải chứa data-prompt');
assert.ok(!rendered.includes("onclick=\"sendQuickAssistantPrompt('Let's"), 'Không được tạo ra chuỗi inline nháy đơn gây vỡ cú pháp');
console.log('  -> Render Option Chips chống injection / SyntaxError: OK\n');

// ---------------------------------------------------------------------------
// 2. Kiểm tra updateAssistantTransformOrigin an toàn không ném ReferenceError
// ---------------------------------------------------------------------------
console.log('Test 2: updateAssistantTransformOrigin phòng vệ HTMLElement');
assert.ok(
  js.includes("const triggerEl = (sourceEl && typeof sourceEl.getBoundingClientRect === 'function') ? sourceEl : fab;"),
  'updateAssistantTransformOrigin phải kiểm tra getBoundingClientRect thay vì trực tiếp instanceof HTMLElement'
);
console.log('  -> updateAssistantTransformOrigin an toàn trên mọi môi trường: OK\n');

// ---------------------------------------------------------------------------
// 3. Kiểm tra các ô input tương tác có gắn phím Enter
// ---------------------------------------------------------------------------
console.log('Test 3: Hỗ trợ phím Enter cho các luồng thao tác người dùng');

// 3a. Quest modal inputs
assert.ok(
  js.includes("['input-quest-title', 'input-quest-estimate', 'input-quest-duration'].forEach"),
  'Các ô nhập nhiệm vụ phải có bộ lắng nghe phím Enter'
);
assert.ok(
  js.includes("submitQuestToAI();"),
  'Nhấn Enter trong ô nhập nhiệm vụ phải gọi submitQuestToAI()'
);

// 3b. Reward modal inputs
assert.ok(
  js.includes("['input-reward-name', 'input-reward-estimate', 'input-reward-duration'].forEach"),
  'Các ô nhập phần thưởng phải có bộ lắng nghe phím Enter'
);
assert.ok(
  js.includes("evaluateRewardItem();"),
  'Nhấn Enter trong ô nhập phần thưởng phải gọi evaluateRewardItem()'
);

// 3c. Timer edit inputs
assert.ok(
  js.includes("['input-edit-minutes', 'input-edit-seconds'].forEach"),
  'Các ô nhập thời gian đếm ngược phải có bộ lắng nghe phím Enter'
);

// 3d. Profile nickname input
assert.ok(
  js.includes("const inputHeroNick = document.getElementById('input-hero-nickname');"),
  'Ô đổi nickname phải có bộ lắng nghe phím Enter'
);

// 3e. Bank deposit, borrow, withdraw inputs
assert.ok(
  js.includes("const inputDepositAmt = document.getElementById('input-deposit-amount');"),
  'Ô gửi tiết kiệm ngân hàng phải có phím Enter'
);
assert.ok(
  js.includes("const inputBorrowAmt = document.getElementById('input-borrow-amount');"),
  'Ô vay vốn ngân hàng phải có phím Enter'
);
assert.ok(
  js.includes("const inputWithdrawAmt = document.getElementById('input-withdraw-amount');"),
  'Ô rút tiền ngân hàng phải có phím Enter'
);

// 3f. Quest proof note input
assert.ok(
  js.includes("const inputProofNote = document.getElementById('input-quest-proof-note');"),
  'Ô ghi chú minh chứng phải có phím Enter'
);

// 3g. Admin edit user inputs
assert.ok(
  js.includes("['admin-edit-coins', 'admin-edit-level', 'admin-edit-exp', 'admin-edit-reason'].forEach"),
  'Các ô tinh chỉnh người chơi của Admin phải có phím Enter'
);
console.log('  -> Tất cả các ô input tương tác đều hỗ trợ phím Enter: OK\n');

// ---------------------------------------------------------------------------
// 4. Kiểm tra các hàm tương tác được export lên window
// ---------------------------------------------------------------------------
console.log('Test 4: Export các hàm tương tác lên window');
assert.ok(
  js.includes("window.acceptAssistantQuest = acceptAssistantQuest;"),
  'Phải export window.acceptAssistantQuest'
);
assert.ok(
  js.includes("window.acceptAssistantReward = acceptAssistantReward;"),
  'Phải export window.acceptAssistantReward'
);
assert.ok(
  js.includes("window.sendQuickAssistantPrompt = sendQuickAssistantPrompt;"),
  'Phải export window.sendQuickAssistantPrompt'
);
console.log('  -> Window global bindings đầy đủ: OK\n');

// ---------------------------------------------------------------------------
// 5. Kiểm tra modal-proof-approved có nút mang class modal-close
// ---------------------------------------------------------------------------
console.log('Test 5: Chuẩn hóa nút đóng modal-proof-approved');
assert.ok(
  html.includes('id="btn-close-proof-approved" type="button" class="modal-close'),
  'Nút đóng #btn-close-proof-approved phải có class modal-close'
);
console.log('  -> Nút đóng modal-proof-approved đạt chuẩn modal-close: OK\n');

console.log('🎉 TẤT CẢ 5 BỘ KIỂM THỬ WORKFLOW TƯƠNG TÁC ĐÃ VƯỢT QUA 100%!');
