import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== KIỂM THỬ ANIMATION BUNG LÊN TỪ PHÙ THỦY CHO MODAL CHAT ===\n');

const cssPath = path.resolve('public/style.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

const htmlPath = path.resolve('public/index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const appJsPath = path.resolve('public/app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Kiểm tra CSS keyframes và classes trong style.css
{
  assert.ok(cssContent.includes('@keyframes assistantBurstIn'), 'Phải có keyframe assistantBurstIn (bung lên từ phù thủy)');
  assert.ok(cssContent.includes('@keyframes assistantBurstOut'), 'Phải có keyframe assistantBurstOut (thu nhỏ về phù thủy)');
  assert.ok(cssContent.includes('@keyframes assistantBackdropIn'), 'Phải có keyframe assistantBackdropIn (làm mờ nền)');
  assert.ok(cssContent.includes('@keyframes assistantBackdropOut'), 'Phải có keyframe assistantBackdropOut (tan biến nền)');
  assert.ok(cssContent.includes('@keyframes assistantFabPulse'), 'Phải có keyframe assistantFabPulse (nhịp ma thuật trên icon FAB)');

  assert.ok(cssContent.includes('.assistant-modal-opening'), 'Phải có class .assistant-modal-opening');
  assert.ok(cssContent.includes('.assistant-modal-closing'), 'Phải có class .assistant-modal-closing');
  assert.ok(cssContent.includes('.assistant-panel-opening'), 'Phải có class .assistant-panel-opening');
  assert.ok(cssContent.includes('.assistant-panel-closing'), 'Phải có class .assistant-panel-closing');
  assert.ok(cssContent.includes('.assistant-fab-burst'), 'Phải có class .assistant-fab-burst');

  // Kiểm tra transform-origin mặc định hướng về icon phù thủy ở góc dưới phải
  assert.ok(cssContent.includes('transform-origin: calc(100% - 2rem) calc(100% - 2rem)'), 'Phải có transform-origin fallback hướng về vị trí icon Phù Thủy');
  assert.ok(cssContent.includes('will-change: transform, opacity, filter'), 'Phải có will-change để tăng tốc phần cứng GPU');

  console.log('✓ Test 1: Toàn bộ CSS keyframes và styling cho animation bung lên/thu nhỏ đã đầy đủ.');
}

// 2. Kiểm tra HTML markup trong index.html
{
  assert.ok(htmlContent.includes('id="modal-ai-assistant"'), 'Phải có modal-ai-assistant');
  assert.ok(htmlContent.includes('id="assistant-panel"'), 'Phải có assistant-panel');
  assert.ok(!htmlContent.includes('assistant-panel" class="rpg-panel rounded-none sm:rounded-2xl w-full max-w-2xl border-0 sm:border border-violet-500/40 overflow-hidden modal-fade'), 'Khung panel trợ lý không được dùng modal-fade gây xung đột animation');

  console.log('✓ Test 2: HTML markup thiết lập id assistant-panel và loại bỏ modal-fade chống xung đột.');
}

// 3. Kiểm tra JavaScript logic trong app.js
{
  assert.ok(appJsContent.includes('function updateAssistantTransformOrigin'), 'Phải có hàm updateAssistantTransformOrigin tính toán tâm bung nở');
  assert.ok(appJsContent.includes('triggerRect.left + triggerRect.width / 2 - panelRect.left'), 'Phải tính chính xác tâm X của icon Phù Thủy so với panel');
  assert.ok(appJsContent.includes('triggerRect.top + triggerRect.height / 2 - panelRect.top'), 'Phải tính chính xác tâm Y của icon Phù Thủy so với panel');

  assert.ok(appJsContent.includes("modal.classList.add('assistant-modal-opening')"), 'openAssistantModal phải kích hoạt assistant-modal-opening');
  assert.ok(appJsContent.includes("panel.classList.add('assistant-panel-opening')"), 'openAssistantModal phải kích hoạt assistant-panel-opening');
  assert.ok(appJsContent.includes("fabIcon.classList.add('assistant-fab-burst')"), 'openAssistantModal phải tạo hiệu ứng ma thuật trên icon FAB');

  assert.ok(appJsContent.includes("modal.classList.add('assistant-modal-closing')"), 'closeAssistantModal phải kích hoạt assistant-modal-closing');
  assert.ok(appJsContent.includes("panel.classList.add('assistant-panel-closing')"), 'closeAssistantModal phải kích hoạt assistant-panel-closing');

  // Kiểm tra xử lý sự kiện đóng modal: Chỉ cho phép thoát khi nhấn dấu x (.modal-close)
  assert.ok(appJsContent.includes("if (modal.id === 'modal-ai-assistant') {\n          closeAssistantModal();"), 'Nút đóng modal-close (dấu x) phải gọi closeAssistantModal() để kích hoạt animation');

  // Backdrop click listener không được chứa closeAssistantModal
  const backdropBlockMatch = appJsContent.match(/document\.querySelectorAll\('\.fixed'\)\.forEach\(modal => \{[\s\S]*?if \(e\.target === modal\) \{([\s\S]*?)\}\s*\}\);/);
  assert.ok(backdropBlockMatch, 'Phải tìm thấy backdrop click handler');
  assert.ok(!backdropBlockMatch[1].includes('closeAssistantModal'), 'Click ra backdrop không được đóng modal Phù Thủy');

  // Escape key handler không được chứa closeAssistantModal
  const escapeBlockMatch = appJsContent.match(/if \(e\.key === 'Escape'\) \{([\s\S]*?)\n  \}\);/);
  assert.ok(escapeBlockMatch, 'Phải tìm thấy Escape key handler');
  assert.ok(!escapeBlockMatch[1].includes('closeAssistantModal'), 'Phím Escape không được đóng modal Phù Thủy');

  console.log('✓ Test 3: JavaScript quản lý hoàn hảo vòng đời mở/đóng: Chỉ thoát khi nhấn dấu x (.modal-close).');
}

console.log('\n🎉 TẤT CẢ CÁC BỘ KIỂM THỬ ANIMATION PHÙ THỦY ĐÃ VƯỢT QUA 100%!');
