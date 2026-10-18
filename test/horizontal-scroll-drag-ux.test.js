import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== KIỂM THỬ TRẢI NGHIỆM LƯỚT CUỘN GỢI Ý NGANG TRÊN MÁY TÍNH (DESKTOP DRAG & WHEEL SCROLL UX) ===\n');

const htmlContent = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
const cssContent = fs.readFileSync(path.resolve('public/style.css'), 'utf8');
const appJsContent = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

// -----------------------------------------------------------------------------
// TEST 1: Kiểm tra cấu trúc HTML của tất cả các thanh gợi ý và danh sách tab ngang
// -----------------------------------------------------------------------------
console.log('--- TEST 1: Kiểm tra các container gợi ý trong HTML ---');
assert.ok(htmlContent.includes('id="quest-suggest-chips"'), 'Phải có id="quest-suggest-chips" cho hàng gợi ý thương lượng nhiệm vụ');
assert.ok(htmlContent.includes('id="reward-suggest-chips"'), 'Phải có id="reward-suggest-chips" cho hàng gợi ý thương lượng phần thưởng');
assert.ok(htmlContent.includes('id="bank-suggest-chips"'), 'Phải có id="bank-suggest-chips" cho hàng gợi ý thương lượng ngân hàng');
assert.ok(htmlContent.includes('id="assistant-suggest-chips"'), 'Phải có id="assistant-suggest-chips" cho hàng gợi ý phù thủy AI');

// Kiểm tra class horizontal-scroll-drag và select-none
const questChipsMatch = htmlContent.match(/<div id="quest-suggest-chips"[^>]*class="([^"]*)"/);
assert.ok(questChipsMatch, 'Tìm thấy container quest-suggest-chips');
assert.ok(questChipsMatch[1].includes('horizontal-scroll-drag'), 'quest-suggest-chips phải có class horizontal-scroll-drag');
assert.ok(questChipsMatch[1].includes('select-none'), 'quest-suggest-chips phải có class select-none để chống bôi đen chữ khi kéo rê');

const rewardChipsMatch = htmlContent.match(/<div id="reward-suggest-chips"[^>]*class="([^"]*)"/);
assert.ok(rewardChipsMatch, 'Tìm thấy container reward-suggest-chips');
assert.ok(rewardChipsMatch[1].includes('horizontal-scroll-drag'), 'reward-suggest-chips phải có class horizontal-scroll-drag');

const bankChipsMatch = htmlContent.match(/<div id="bank-suggest-chips"[^>]*class="([^"]*)"/);
assert.ok(bankChipsMatch, 'Tìm thấy container bank-suggest-chips');
assert.ok(bankChipsMatch[1].includes('horizontal-scroll-drag'), 'bank-suggest-chips phải có class horizontal-scroll-drag');

const assistChipsMatch = htmlContent.match(/<div id="assistant-suggest-chips"[^>]*class="([^"]*)"/);
assert.ok(assistChipsMatch, 'Tìm thấy container assistant-suggest-chips');
assert.ok(assistChipsMatch[1].includes('horizontal-scroll-drag'), 'assistant-suggest-chips phải có class horizontal-scroll-drag');

console.log('✓ Test 1: HTML đầy đủ ID, class horizontal-scroll-drag và chống bôi đen văn bản khi kéo rê.\n');

// -----------------------------------------------------------------------------
// TEST 2: Kiểm tra CSS Styling cho trải nghiệm kéo chuột (Grab/Grabbing)
// -----------------------------------------------------------------------------
console.log('--- TEST 2: Kiểm tra CSS Styling cho drag & scroll ---');
assert.ok(cssContent.includes('.horizontal-scroll-drag'), 'CSS phải có quy tắc cho .horizontal-scroll-drag');
assert.ok(cssContent.includes('cursor: grab'), '.horizontal-scroll-drag phải có cursor: grab để báo hiệu kéo được');
assert.ok(cssContent.includes('.horizontal-scroll-drag.is-dragging'), 'CSS phải có trạng thái .is-dragging');
assert.ok(cssContent.includes('cursor: grabbing !important'), 'Khi đang kéo rê phải chuyển sang con trỏ grabbing');
assert.ok(cssContent.includes('pointer-events: none !important'), 'Các phần tử con khi kéo phải tắt pointer-events để tránh giật lag');
console.log('✓ Test 2: CSS hỗ trợ con trỏ grab/grabbing và chống cản trở tương tác khi kéo rê.\n');

// -----------------------------------------------------------------------------
// TEST 3: Kiểm tra định nghĩa hàm trong JS Bundle (public/app.js)
// -----------------------------------------------------------------------------
console.log('--- TEST 3: Kiểm tra định nghĩa JS trong public/app.js ---');
assert.ok(appJsContent.includes('function makeHorizontalScrollable(container)'), 'Phải có hàm makeHorizontalScrollable');
assert.ok(appJsContent.includes('function initHorizontalScrollContainers()'), 'Phải có hàm initHorizontalScrollContainers');
assert.ok(appJsContent.includes('container.scrollLeft += e.deltaY'), 'Phải chuyển đổi deltaY của con lăn chuột sang scrollLeft');
assert.ok(appJsContent.includes("container.classList.add('is-dragging')"), 'Phải gắn class is-dragging khi kéo rê chuột');
assert.ok(appJsContent.includes('stopImmediatePropagation()'), 'Phải nuốt sự kiện click khi kéo rê');
assert.ok(appJsContent.includes("window.makeHorizontalScrollable = makeHorizontalScrollable"), 'Phải export makeHorizontalScrollable ra window');
console.log('✓ Test 3: Mã nguồn JS chứa đầy đủ logic wheel-to-horizontal và drag-to-scroll.\n');

// -----------------------------------------------------------------------------
// TEST 4: Mô phỏng hành vi (Functional Simulation) với Mock DOM
// -----------------------------------------------------------------------------
console.log('--- TEST 4: Mô phỏng hành vi lăn chuột và kéo rê chuột ---');

function createMockElement(initialScrollWidth = 600, initialClientWidth = 300) {
  const listeners = {};
  const classes = new Set();
  return {
    dataset: {},
    scrollWidth: initialScrollWidth,
    clientWidth: initialClientWidth,
    scrollLeft: 0,
    classList: {
      add: (cls) => classes.add(cls),
      remove: (cls) => classes.delete(cls),
      contains: (cls) => classes.has(cls)
    },
    addEventListener: (type, fn, opts) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push({ fn, opts });
    },
    dispatchEvent: (event) => {
      const typeList = listeners[event.type] || [];
      for (const { fn } of typeList) {
        fn(event);
      }
    },
    getListeners: (type) => listeners[type] || []
  };
}

// Giả lập môi trường window cơ bản
const mockWindowListeners = {};
globalThis.window = {
  addEventListener: (type, fn) => {
    if (!mockWindowListeners[type]) mockWindowListeners[type] = [];
    mockWindowListeners[type].push(fn);
  },
  removeEventListener: (type, fn) => {
    if (!mockWindowListeners[type]) return;
    mockWindowListeners[type] = mockWindowListeners[type].filter(f => f !== fn);
  }
};

// Trích xuất và chạy hàm makeHorizontalScrollable từ code thực tế
const startIdx = appJsContent.indexOf('function makeHorizontalScrollable(container) {');
const endIdx = appJsContent.indexOf('function initHorizontalScrollContainers() {');
assert.ok(startIdx !== -1 && endIdx !== -1, 'Tìm thấy đoạn mã makeHorizontalScrollable trong app.js');

const makeScrollableCode = appJsContent.slice(startIdx, endIdx);
const evalFn = new Function(`
  ${makeScrollableCode}
  return makeHorizontalScrollable;
`);
const makeScrollable = evalFn();

const mockEl = createMockElement(800, 350);
makeScrollable(mockEl);

assert.strictEqual(mockEl.dataset.scrollInited, 'true', 'Container phải được đánh dấu đã init');
assert.ok(mockEl.classList.contains('horizontal-scroll-drag'), 'Phải được gắn class horizontal-scroll-drag');

// A. Test Wheel Event
let preventedWheel = false;
mockEl.dispatchEvent({
  type: 'wheel',
  deltaY: 120,
  deltaX: 0,
  preventDefault: () => { preventedWheel = true; }
});
assert.strictEqual(preventedWheel, true, 'Lăn chuột dọc phải preventDefault để không cuộn trang');
assert.strictEqual(mockEl.scrollLeft, 120, 'scrollLeft phải tăng 120px theo deltaY của con lăn chuột');

// B. Test Mouse Drag (Kéo rê lướt như trên điện thoại)
let mousedownHandlers = mockEl.getListeners('mousedown');
assert.ok(mousedownHandlers.length > 0, 'Phải gắn listener mousedown');

// 1. Nhấn chuột xuống tại tọa độ X = 200
mousedownHandlers[0].fn({
  button: 0,
  clientX: 200,
  preventDefault: () => {}
});

// 2. Rê chuột sang trái (clientX = 150 -> dx = -50)
assert.ok(mockWindowListeners['mousemove'].length > 0, 'Phải gắn window mousemove khi đang mousedown');
mockWindowListeners['mousemove'][0]({ clientX: 150 });

assert.ok(mockEl.classList.contains('is-dragging'), 'Phải gắn class is-dragging khi kéo vượt ngưỡng 5px');
assert.strictEqual(mockEl.scrollLeft, 170, 'scrollLeft phải là 120 - (-50) = 170px');

// 3. Nhả chuột
assert.ok(mockWindowListeners['mouseup'].length > 0, 'Phải gắn window mouseup');
mockWindowListeners['mouseup'][0]();
assert.strictEqual(mockEl.classList.contains('is-dragging'), false, 'Phải gỡ bỏ class is-dragging khi nhả chuột');

// 4. Click event ngay sau khi kéo rê phải bị chặn
let preventedClick = false;
let stoppedImmediate = false;
mockEl.dispatchEvent({
  type: 'click',
  preventDefault: () => { preventedClick = true; },
  stopPropagation: () => {},
  stopImmediatePropagation: () => { stoppedImmediate = true; }
});
assert.strictEqual(preventedClick, true, 'Sự kiện click sau khi kéo rê phải bị chặn để không kích hoạt nút gợi ý nhầm');
assert.strictEqual(stoppedImmediate, true, 'Phải stopImmediatePropagation để nút con không nhận click');

// C. Test Clean Click (Nhấn chuột rồi nhả tại chỗ, không kéo rê)
mousedownHandlers[0].fn({
  button: 0,
  clientX: 200,
  preventDefault: () => {}
});
// Nhả chuột ngay tại chỗ
mockWindowListeners['mouseup'][0]();

let cleanClickPrevented = false;
mockEl.dispatchEvent({
  type: 'click',
  preventDefault: () => { cleanClickPrevented = true; },
  stopPropagation: () => {},
  stopImmediatePropagation: () => {}
});
assert.strictEqual(cleanClickPrevented, false, 'Click thông thường không được bị chặn để người dùng chọn gợi ý');

console.log('✓ Test 4: Mô phỏng hành vi lăn chuột và kéo rê chuột hoàn toàn chính xác.\n');

console.log('🎉 TẤT CẢ CÁC BỘ KIỂM THỬ TRẢI NGHIỆM CUỘN NGANG GỢI Ý ĐÃ VƯỢT QUA 100%!');
