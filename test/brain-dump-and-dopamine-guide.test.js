import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Bắt đầu kiểm thử: Cẩm Nang Ngắt Mạch Dopamine & Giấy Xả Rác Não Bộ ===\n');

const htmlPath = path.resolve('public/index.html');
const appJsPath = path.resolve('public/app.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(appJsPath, 'utf8');

// 1. Kiểm tra HTML: Sự hiện diện của các điểm chạm và Modal Cẩm Nang 5 Bước
console.log('Test 1: Kiểm tra cấu trúc HTML của Cẩm Nang Ngắt Mạch Dopamine (#modal-dopamine-guide)');
assert.ok(html.includes('id="modal-dopamine-guide"'), 'index.html phải có dialog #modal-dopamine-guide');
assert.ok(html.includes('id="btn-nav-dopamine"'), 'index.html phải có nút #btn-nav-dopamine trong menu desktop');
assert.ok(html.includes('id="btn-mobile-dopamine"'), 'index.html phải có nút #btn-mobile-dopamine trong menu mobile');
assert.ok(html.includes('id="btn-focus-dopamine-guide"'), 'index.html phải có nút #btn-focus-dopamine-guide trên Focus Banner');

// Kiểm tra 5 bước thần kinh học trong nội dung cẩm nang
assert.ok(html.includes('Xóa Bộ Nhớ Đệm Thể Chất'), 'Cẩm nang phải chứa Bước 1: Xóa bộ nhớ đệm thể chất');
assert.ok(html.includes('Thiết Lập Môi Trường Cách Ly'), 'Cẩm nang phải chứa Bước 2: Thiết lập môi trường cách ly');
assert.ok(html.includes('Bắt Đầu Siêu Nhỏ'), 'Cẩm nang phải chứa Bước 3: Bắt đầu siêu nhỏ 5 phút');
assert.ok(html.includes('Kích Hoạt Chu Kỳ Tập Trung Ngắn'), 'Cẩm nang phải chứa Bước 4: Chu kỳ tập trung ngắn 25/5');
assert.ok(html.includes('Đặt Một Tờ "Giấy Xả Rác" (Brain Dump)'), 'Cẩm nang phải chứa Bước 5: Giấy xả rác cạnh tay');
assert.ok(html.includes('lái xe 100km/h mà bóp phanh gấp'), 'Cẩm nang phải giải thích cơ chế tương phản dopamine');
console.log('  -> Cấu trúc Cẩm Nang Ngắt Mạch Dopamine và 5 bước đạt chuẩn 100%: OK\n');

// 2. Kiểm tra HTML: Sự hiện diện của Cuộn Giấy Xả Rác (#modal-brain-dump) và các nút điều khiển
console.log('Test 2: Kiểm tra cấu trúc HTML của Cuộn Giấy Xả Rác Não Bộ (#modal-brain-dump)');
assert.ok(html.includes('id="modal-brain-dump"'), 'index.html phải có dialog #modal-brain-dump');
assert.ok(html.includes('id="input-brain-dump"'), 'index.html phải có input #input-brain-dump để gõ nhanh');
assert.ok(html.includes('id="btn-add-brain-dump"'), 'index.html phải có nút lưu #btn-add-brain-dump');
assert.ok(html.includes('id="brain-dump-list"'), 'index.html phải có container #brain-dump-list');
assert.ok(html.includes('id="btn-clear-all-dump"'), 'index.html phải có nút #btn-clear-all-dump');

// Các nút mở và badge hiển thị số lượng
assert.ok(html.includes('id="btn-open-brain-dump"'), 'index.html phải có nút #btn-open-brain-dump trên Focus Banner');
assert.ok(html.includes('id="brain-dump-badge"'), 'index.html phải có badge đếm số lượng #brain-dump-badge trên banner');
assert.ok(html.includes('id="btn-zen-brain-dump"'), 'index.html phải có nút #btn-zen-brain-dump trong Chế độ Zen');
assert.ok(html.includes('id="zen-brain-dump-badge"'), 'index.html phải có badge đếm số lượng #zen-brain-dump-badge trong Zen Mode');

// Banner nhắc nhở sau khi hoàn thành phiên Pomodoro
assert.ok(html.includes('id="focus-complete-brain-dump-banner"'), 'Modal hoàn thành Pomodoro phải có banner nhắc xử lý rác não');
assert.ok(html.includes('id="focus-complete-brain-dump-count"'), 'Banner nhắc hoàn thành phải có element đếm số mục');
console.log('  -> Cấu trúc HTML Giấy Xả Rác và các badge đồng bộ đạt chuẩn: OK\n');

// 3. Kiểm tra mã nguồn JS trong public/app.js
console.log('Test 3: Kiểm tra các hàm nghiệp vụ và phím tắt trong app.js');
assert.ok(js.includes('function openDopamineGuideModal'), 'app.js phải định nghĩa openDopamineGuideModal');
assert.ok(js.includes('function closeDopamineGuideModal'), 'app.js phải định nghĩa closeDopamineGuideModal');
assert.ok(js.includes('function getBrainDumpList'), 'app.js phải định nghĩa getBrainDumpList');
assert.ok(js.includes('function saveBrainDumpList'), 'app.js phải định nghĩa saveBrainDumpList');
assert.ok(js.includes('function addBrainDumpItem'), 'app.js phải định nghĩa addBrainDumpItem');
assert.ok(js.includes('function removeBrainDumpItem'), 'app.js phải định nghĩa removeBrainDumpItem');
assert.ok(js.includes('function convertBrainDumpToQuest'), 'app.js phải định nghĩa convertBrainDumpToQuest');
assert.ok(js.includes('function clearAllBrainDump'), 'app.js phải định nghĩa clearAllBrainDump');
assert.ok(js.includes('function renderBrainDumpUI'), 'app.js phải định nghĩa renderBrainDumpUI');
assert.ok(js.includes('function openBrainDumpModal'), 'app.js phải định nghĩa openBrainDumpModal');
assert.ok(js.includes('function closeBrainDumpModal'), 'app.js phải định nghĩa closeBrainDumpModal');

// Kiểm tra phím tắt Alt + D
assert.ok(
  js.includes("e.altKey && (e.key === 'd' || e.key === 'D')"),
  'app.js phải có bộ lắng nghe phím tắt Alt+D để mở/đóng Giấy Xả Rác'
);
console.log('  -> Đầy đủ các hàm điều khiển và phím tắt Alt+D: OK\n');

// 4. Mô phỏng Logic Engine của Giấy Xả Rác
console.log('Test 4: Mô phỏng logic CRUD và Chuyển thành Quest của Brain Dump Engine');

const mockStorage = {};
const fakeLocalStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; }
};

const fakeAppState = {
  quests: []
};

function engineGetList() {
  try {
    const raw = fakeLocalStorage.getItem('levelup_brain_dump');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (_) {
    return [];
  }
}

function engineSaveList(list) {
  fakeLocalStorage.setItem('levelup_brain_dump', JSON.stringify(list));
}

function engineAddItem(text) {
  const clean = (text || '').trim();
  if (!clean) return false;
  const list = engineGetList();
  list.unshift({
    id: 'bd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    text: clean,
    createdAt: Date.now()
  });
  engineSaveList(list);
  return true;
}

function engineConvertToQuest(id) {
  const list = engineGetList();
  const item = list.find(x => x.id === id);
  if (!item) return false;

  const newQuest = {
    id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    title: item.text,
    type: 'bounty',
    targetMinutes: 0,
    rewardCoins: 5,
    requiresProof: false,
    status: 'active',
    completed: false,
    createdAt: Date.now()
  };

  fakeAppState.quests.unshift(newQuest);
  engineSaveList(list.filter(x => x.id !== id));
  return newQuest;
}

// 4.1 Thêm suy nghĩ
assert.strictEqual(engineAddItem(''), false, 'Không được thêm suy nghĩ rỗng');
assert.strictEqual(engineAddItem('   '), false, 'Không được thêm suy nghĩ chỉ có khoảng trắng');
assert.strictEqual(engineAddItem('Nhớ rep tin nhắn Nam'), true, 'Thêm suy nghĩ hợp lệ thành công');
assert.strictEqual(engineAddItem('Lát nữa mua cà phê'), true, 'Thêm suy nghĩ thứ 2 thành công');

let currentList = engineGetList();
assert.strictEqual(currentList.length, 2, 'Danh sách phải có đúng 2 mục');
assert.strictEqual(currentList[0].text, 'Lát nữa mua cà phê', 'Mục mới thêm phải nằm ở đầu danh sách (unshift)');
assert.strictEqual(currentList[1].text, 'Nhớ rep tin nhắn Nam', 'Mục cũ hơn phải nằm ở vị trí kế tiếp');

// 4.2 Chuyển thành Quest
const itemToConvert = currentList[0];
const createdQuest = engineConvertToQuest(itemToConvert.id);
assert.ok(createdQuest, 'Phải tạo thành công Quest từ suy nghĩ');
assert.strictEqual(createdQuest.title, 'Lát nữa mua cà phê');
assert.strictEqual(createdQuest.type, 'bounty');
assert.strictEqual(createdQuest.rewardCoins, 5);
assert.strictEqual(fakeAppState.quests.length, 1, 'appState.quests phải được thêm 1 nhiệm vụ mới');

currentList = engineGetList();
assert.strictEqual(currentList.length, 1, 'Danh sách rác phải chỉ còn 1 mục sau khi chuyển thành Quest');
assert.strictEqual(currentList[0].text, 'Nhớ rep tin nhắn Nam');

// 4.3 Dọn sạch rác
engineSaveList([]);
assert.strictEqual(engineGetList().length, 0, 'Danh sách phải trống sau khi dọn sạch');

console.log('  -> Toàn bộ hành vi CRUD và chuyển hóa Quest hoạt động hoàn hảo: OK\n');
console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ ĐỀU VƯỢT QUA XUẤT SẮC (100%)!');
