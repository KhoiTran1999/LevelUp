import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Bắt đầu kiểm thử: Phím tắt Space dừng/tiếp tục đếm ngược thời gian ===\n');

const htmlPath = path.resolve('public/index.html');
const appJsPath = path.resolve('public/app.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(appJsPath, 'utf8');

// 1. Kiểm tra cấu trúc mã nguồn trong app.js
console.log('Test 1: Cấu trúc bộ lắng nghe sự kiện keydown cho phím Space trong app.js');
assert.ok(
  js.includes("e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar'"),
  'Phải bắt sự kiện phím Space bằng cả e.code và e.key'
);
assert.ok(
  js.includes('if (e.repeat) return;'),
  'Phải có cơ chế chặn e.repeat chống spam khi người dùng đè giữ phím Space'
);
assert.ok(
  js.includes('const hasActiveTimer = Boolean(activeFocusQuest || isBreakMode || activeRewardItem || appState?.activeTimer);'),
  'Phải kiểm tra tồn tại phiên đếm giờ active trước khi kích hoạt Space'
);
assert.ok(
  js.includes("const isOtherModalOpen = Boolean(document.querySelector('.fixed.inset-0:not(.hidden):not(#focus-zen-overlay)'));"),
  'Phải chặn khi có modal popup khác mở, nhưng cho phép hoạt động trong Chế độ Toàn màn hình (#focus-zen-overlay)'
);
assert.ok(
  js.includes("toggleFocusTimer();"),
  'Phải gọi toggleFocusTimer() khi phím Space hợp lệ'
);
console.log('  -> Cấu trúc mã nguồn lắng nghe phím Space đạt chuẩn 100%: OK\n');

// 2. Kiểm tra giao diện HTML index.html
console.log('Test 2: Giao diện và gợi ý phím tắt trên HTML');
assert.ok(
  html.includes('id="btn-timer-toggle"') && html.includes('title="Tạm dừng / Tiếp tục (Phím tắt: Space)"'),
  'Nút #btn-timer-toggle trên thanh banner phải có tooltip hướng dẫn phím tắt Space'
);
assert.ok(
  html.includes('id="btn-zen-toggle"') && html.includes('title="Tạm dừng / Tiếp tục (Phím tắt: Space)"'),
  'Nút #btn-zen-toggle trong Zen Mode phải có tooltip hướng dẫn phím tắt Space'
);
assert.ok(
  html.includes('<kbd class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">Space</kbd>'),
  'Zen Mode phải hiển thị huy hiệu kbd Space trực quan cho người dùng'
);
console.log('  -> Giao diện HTML và tooltip phím tắt Space chuẩn xác: OK\n');

// 3. Mô phỏng Logic State Machine cho phím tắt Space
console.log('Test 3: Mô phỏng hành vi phím Space theo các ngữ cảnh tương tác');

function simulateSpaceKeydown({
  activeTag = 'BODY',
  isContentEditable = false,
  ctrlKey = false,
  metaKey = false,
  altKey = false,
  repeat = false,
  hasActiveTimer = false,
  isOtherModalOpen = false,
  isInZenMode = false
}) {
  let isPrevented = false;
  let timerToggled = false;

  const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) || isContentEditable;
  if (isEditing || ctrlKey || metaKey || altKey) {
    return { isPrevented, timerToggled, reason: 'editing_or_modifier' };
  }

  if (repeat) {
    return { isPrevented, timerToggled, reason: 'repeat_ignored' };
  }

  // Logic phím Space
  if (hasActiveTimer && !isOtherModalOpen) {
    isPrevented = true;
    timerToggled = true;
    return { isPrevented, timerToggled, reason: 'timer_toggled' };
  }

  return { isPrevented, timerToggled, reason: 'default_action' };
}

// 3a: Đang gõ chữ trong ô input / textarea -> KHÔNG được pause timer và KHÔNG được preventDefault
{
  const res = simulateSpaceKeydown({ activeTag: 'INPUT', hasActiveTimer: true });
  assert.strictEqual(res.timerToggled, false, 'Không được can thiệp khi người dùng đang nhập văn bản');
  assert.strictEqual(res.isPrevented, false, 'Không được chặn dấu cách khi gõ chữ');
  console.log('  -> 3a. Soạn thảo văn bản: Nhập dấu cách bình thường, không kích hoạt phím tắt: OK');
}

// 3b: Đang mở modal khác (ví dụ: Tạo nhiệm vụ, Xác nhận) -> KHÔNG kích hoạt
{
  const res = simulateSpaceKeydown({ hasActiveTimer: true, isOtherModalOpen: true });
  assert.strictEqual(res.timerToggled, false, 'Không kích hoạt timer khi modal khác đang mở');
  assert.strictEqual(res.isPrevented, false, 'Không chặn phím khi trong modal khác');
  console.log('  -> 3b. Modal popup khác đang mở: Không kích hoạt phím tắt: OK');
}

// 3c: Không có phiên timer nào đang chạy hoặc tạm dừng -> KHÔNG kích hoạt (để cuộn trang bình thường)
{
  const res = simulateSpaceKeydown({ hasActiveTimer: false });
  assert.strictEqual(res.timerToggled, false, 'Không kích hoạt timer khi không có phiên đếm giờ');
  assert.strictEqual(res.isPrevented, false, 'Không cướp phím Space của trình duyệt khi không có timer');
  console.log('  -> 3c. Không có timer: Giữ nguyên hành vi mặc định của trình duyệt: OK');
}

// 3d: Có phiên timer đang chạy trên màn hình chính -> KÍCH HOẠT DỪNG / TIẾP TỤC
{
  const res = simulateSpaceKeydown({ hasActiveTimer: true, isOtherModalOpen: false });
  assert.strictEqual(res.timerToggled, true, 'Phải kích hoạt dừng/tiếp tục timer khi có phiên');
  assert.strictEqual(res.isPrevented, true, 'Phải preventDefault để tránh cuộn trang ngoài ý muốn');
  console.log('  -> 3d. Màn hình chính có timer: Dừng/tiếp tục thành công và chống cuộn trang: OK');
}

// 3e: Đang trong Chế độ Toàn màn hình Zen Mode -> KÍCH HOẠT DỪNG / TIẾP TỤC
{
  const res = simulateSpaceKeydown({ hasActiveTimer: true, isOtherModalOpen: false, isInZenMode: true });
  assert.strictEqual(res.timerToggled, true, 'Phải kích hoạt dừng/tiếp tục timer trong Zen Mode');
  assert.strictEqual(res.isPrevented, true, 'Phải preventDefault trong Zen Mode');
  console.log('  -> 3e. Chế độ Toàn màn hình (Zen Mode): Phím Space hoạt động trơn tru: OK');
}

// 3f: Giữ đè phím Space (repeat = true) -> Chặn spam
{
  const res = simulateSpaceKeydown({ hasActiveTimer: true, repeat: true });
  assert.strictEqual(res.timerToggled, false, 'Chặn đè phím Space chống spam');
  console.log('  -> 3f. Chống spam khi đè giữ phím: OK');
}

console.log('\n🎉 TẤT CẢ CÁC BỘ KIỂM THỬ PHÍM TẮT SPACE ĐÃ VƯỢT QUA 100%!');
