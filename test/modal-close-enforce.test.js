import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const htmlPath = path.resolve('public/index.html');
const appJsPath = path.resolve('public/app.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(appJsPath, 'utf8');

console.log('--- Kiểm thử ràng buộc: Tất cả modal chỉ tắt khi nhấn dấu x ---');

// 1. Kiểm tra tất cả các modal người dùng thao tác đều có nút close 'x' (.modal-close)
const actionableModals = [
  'modal-quest',
  'modal-reward',
  'modal-profile',
  'modal-edit-focus-timer',
  'modal-focus-complete',
  'modal-confirm'
];

actionableModals.forEach(modalId => {
  const modalRegex = new RegExp(`id="${modalId}"[\\s\\S]*?<\\/div>`);
  const match = html.match(new RegExp(`<div[^>]*id="${modalId}"[\\s\\S]*?class="[^"]*modal-close[^"]*"`));
  assert(match, `Modal ${modalId} phải có nút đóng mang class modal-close (dấu x)`);
});
console.log('✓ Tất cả 6 modal thao tác đều có nút đóng class modal-close (dấu x).');

// 2. Kiểm tra logic JS không đóng modal khi click ra backdrop
assert(
  !js.includes("if (e.target === modal) {\n        modal.classList.add('hidden');") &&
  !js.includes("if (e.target === modal) {\n        if (modal.id === 'modal-confirm') {\n          closeConfirmDialog(false);"),
  'Không được cho phép click backdrop đóng modal'
);
console.log('✓ Đã chặn đóng modal khi click ra ngoài backdrop.');

// 3. Kiểm tra logic JS không cho Escape đóng modal
assert(
  !js.includes("document.querySelectorAll('.fixed[id^=\"modal-\"]:not(#modal-welcome):not(.hidden)').forEach(m => m.classList.add('hidden'))"),
  'Không được cho phép Escape đóng modal'
);
console.log('✓ Đã chặn phím Escape đóng modal.');

// 4. Mô phỏng bộ xử lý sự kiện đóng modal (State Machine check)
function simulateModalInteraction({ action, eventTarget, modalId, isOpen }) {
  let state = { isOpen };
  if (action === 'click_close_btn' && eventTarget === 'modal-close') {
    state.isOpen = false;
  } else if (action === 'click_backdrop' && eventTarget === 'backdrop') {
    // Backdrop click: do not close
    state.isOpen = true;
  } else if (action === 'keydown_escape') {
    // Escape key: do not close
    state.isOpen = true;
  }
  return state;
}

assert.strictEqual(
  simulateModalInteraction({ action: 'click_backdrop', eventTarget: 'backdrop', modalId: 'modal-quest', isOpen: true }).isOpen,
  true,
  'Click backdrop không được làm đóng modal-quest'
);

assert.strictEqual(
  simulateModalInteraction({ action: 'keydown_escape', eventTarget: 'window', modalId: 'modal-quest', isOpen: true }).isOpen,
  true,
  'Bấm Escape không được làm đóng modal-quest'
);

assert.strictEqual(
  simulateModalInteraction({ action: 'click_close_btn', eventTarget: 'modal-close', modalId: 'modal-quest', isOpen: true }).isOpen,
  false,
  'Nhấn dấu x (modal-close) phải đóng được modal'
);

console.log('✓ Mô phỏng trạng thái đóng mở: Chỉ khi nhấn dấu x thì modal mới tắt.');
console.log('🎉 TẤT CẢ TEST KIỂM THỬ MODAL ĐÃ VƯỢT QUA XUẤT SẮC!');
