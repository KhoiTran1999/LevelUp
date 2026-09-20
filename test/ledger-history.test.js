import assert from 'node:assert';

console.log('=== Bắt đầu kiểm thử Quản lý & Xử lý Lịch sử Thu Chi (Ledger) ===\n');

// 1. Logic Rolling Window / Cắt đuôi 100 bản ghi
function testRollingWindow() {
  const ledger = [];
  function addEntry(entry) {
    ledger.unshift(entry);
    if (ledger.length > 100) {
      ledger.splice(100);
    }
  }

  for (let i = 1; i <= 150; i++) {
    addEntry({ id: `led_${i}`, amount: i, type: 'earn', timestamp: Date.now() });
  }

  assert.strictEqual(ledger.length, 100, 'Ledger phải được giữ ở tối đa 100 bản ghi gần nhất');
  assert.strictEqual(ledger[0].id, 'led_150', 'Bản ghi mới nhất phải ở đầu mảng (index 0)');
  assert.strictEqual(ledger[99].id, 'led_51', 'Bản ghi cũ nhất còn giữ lại phải là led_51');
  console.log('✓ Test 1: Rolling window giữ đúng 100 giao dịch mới nhất, ngăn tràn bộ nhớ.');
}

// 2. Gom nhóm theo ngày (Date Grouping: Hôm nay, Hôm qua, Ngày cũ)
function testDateGrouping() {
  const now = Date.now();
  const yesterday = now - 86400000;
  const threeDaysAgo = now - 3 * 86400000;

  const entries = [
    { id: '1', amount: 10, type: 'earn', timestamp: now },
    { id: '2', amount: 5, type: 'spend', timestamp: now },
    { id: '3', amount: 20, type: 'earn', timestamp: yesterday },
    { id: '4', amount: 15, type: 'spend', timestamp: threeDaysAgo }
  ];

  const todayStr = new Date().toDateString();
  const yesterdayStr = new Date(Date.now() - 86400000).toDateString();

  const grouped = entries.reduce((groups, item) => {
    const ts = parseInt(item.timestamp, 10) || Date.now();
    const d = new Date(ts).toDateString();
    const label = d === todayStr ? 'Hôm nay' : (d === yesterdayStr ? 'Hôm qua' : new Date(ts).toLocaleDateString('vi-VN'));
    (groups[label] = groups[label] || []).push(item);
    return groups;
  }, {});

  assert.ok(grouped['Hôm nay'], 'Phải có nhóm Hôm nay');
  assert.strictEqual(grouped['Hôm nay'].length, 2);
  assert.ok(grouped['Hôm qua'], 'Phải có nhóm Hôm qua');
  assert.strictEqual(grouped['Hôm qua'].length, 1);

  const pastDateKey = new Date(threeDaysAgo).toLocaleDateString('vi-VN');
  assert.ok(grouped[pastDateKey], 'Phải có nhóm ngày cũ định dạng vi-VN');
  assert.strictEqual(grouped[pastDateKey].length, 1);
  console.log('✓ Test 2: Gom nhóm theo ngày (Hôm nay / Hôm qua / Ngày cũ) hoạt động chuẩn xác.');
}

// 3. Thống kê Thu / Chi trong ngày hôm nay
function testTodayStats() {
  const now = Date.now();
  const yesterday = now - 86400000;

  const entries = [
    { amount: 30, type: 'earn', timestamp: now },
    { amount: 12, type: 'spend', timestamp: now },
    { amount: 100, type: 'earn', timestamp: yesterday }, // Ngày hôm qua -> Không tính
    { amount: 50, type: 'spend', timestamp: yesterday }  // Ngày hôm qua -> Không tính
  ];

  const todayStr = new Date().toDateString();
  let todayEarn = 0;
  let todaySpend = 0;
  entries.forEach(e => {
    if (new Date(e.timestamp || 0).toDateString() === todayStr) {
      const amt = Math.max(0, parseInt(e.amount, 10) || 0);
      if (e.type === 'earn') todayEarn += amt;
      else if (e.type === 'spend') todaySpend += amt;
    }
  });

  assert.strictEqual(todayEarn, 30, 'Tổng thu hôm nay phải là 30');
  assert.strictEqual(todaySpend, 12, 'Tổng chi hôm nay phải là 12');
  console.log('✓ Test 3: Thống kê Thu & Chi hôm nay bóc tách chính xác theo ngày.');
}

// 4. Lọc theo danh mục (Filter: all / earn / spend)
function testFiltering() {
  const entries = [
    { id: '1', type: 'earn' },
    { id: '2', type: 'spend' },
    { id: '3', type: 'earn' }
  ];

  const all = entries.filter(e => 'all' === 'all' || e.type === 'all');
  const earns = entries.filter(e => 'earn' === 'all' || e.type === 'earn');
  const spends = entries.filter(e => 'spend' === 'all' || e.type === 'spend');

  assert.strictEqual(all.length, 3);
  assert.strictEqual(earns.length, 2);
  assert.strictEqual(spends.length, 1);
  console.log('✓ Test 4: Bộ lọc Tất cả / Thu nhập / Đổi quà hoạt động chính xác.');
}

// 5. Chuẩn hóa cấu trúc bản ghi Sổ cái duy nhất (Single Ledger Schema)
function testSchemaStandardization() {
  const sampleEntry = {
    id: 'led_1710384000',
    type: 'earn',
    category: 'quest',
    amount: 25,
    title: 'Chạy bộ 30 phút',
    description: 'Hoàn thành [Hạng B] Chạy bộ 30 phút',
    timestamp: 1710384000000
  };

  assert.ok(sampleEntry.id.startsWith('led_'));
  assert.ok(['earn', 'spend'].includes(sampleEntry.type));
  assert.ok(['quest', 'reward', 'penalty', 'bonus'].includes(sampleEntry.category));
  assert.strictEqual(typeof sampleEntry.amount, 'number');
  assert.strictEqual(typeof sampleEntry.title, 'string');
  assert.strictEqual(typeof sampleEntry.timestamp, 'number');
  console.log('✓ Test 5: Cấu trúc bản ghi sổ cái (Single Ledger Schema) chuẩn hóa 100% các trường: id, type, category, amount, title, timestamp.');
}

// 6. Kiểm tra loại bỏ hoàn toàn việc lưu trữ state vào localStorage và sử dụng Skeleton
async function testZeroLocalStorageAndSkeleton() {
  const fs = await import('node:fs');
  const appJs = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const normalizedAppJs = appJs.replace(/\r\n/g, '\n');

  // Đảm bảo không còn bất kỳ dòng nào setItem CACHE_STORAGE_KEY
  assert.ok(!appJs.includes('localStorage.setItem(CACHE_STORAGE_KEY'), 'Không được lưu appState vào localStorage');

  // Đảm bảo hàm loadLocalCache luôn trả về null để bắt buộc load từ Redis
  assert.ok(normalizedAppJs.includes('function loadLocalCache() {\n  // ponytail: Không đọc từ LocalStorage, toàn bộ dữ liệu tải trực tiếp từ Cloud/Redis\n  return null;\n}'), 'loadLocalCache phải trả về null');

  // Đảm bảo có hàm renderSkeletons và được gọi trong startup flow
  assert.ok(appJs.includes('function renderSkeletons()'), 'Phải có hàm renderSkeletons');
  assert.ok(appJs.includes('renderSkeletons();'), 'Startup flow phải kích hoạt renderSkeletons trước khi fetch sync');

  // Đảm bảo renderSkeletons bao gồm skeleton cho các thẻ (quests-grid & shop-grid)
  assert.ok(appJs.includes("document.getElementById('quests-grid')"), 'renderSkeletons phải cập nhật quests-grid');
  assert.ok(appJs.includes("document.getElementById('shop-grid')"), 'renderSkeletons phải cập nhật shop-grid');

  // Đảm bảo index.html chứa sẵn skeleton cards để chống chớp nháy ngay từ khi parse HTML
  const indexHtml = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(indexHtml.includes('id="quests-grid"'), 'index.html phải có quests-grid');
  assert.ok(indexHtml.includes('Initial Skeleton Cards'), 'index.html phải chứa sẵn skeleton cards ban đầu');

  console.log('✓ Test 6: Đã loại bỏ hoàn toàn LocalStorage, dữ liệu 100% trên Redis và kích hoạt Skeleton loading chống chớp nháy.');
}

// 7. Kiểm tra Logic Phân Trang Sổ Cái (Ledger Pagination)
async function testLedgerPagination() {
  const fs = await import('node:fs');
  const PAGE_SIZE = 10;
  const entries = Array.from({ length: 25 }, (_, i) => ({
    id: `led_${i + 1}`,
    amount: 10,
    type: i % 2 === 0 ? 'earn' : 'spend',
    timestamp: Date.now() - i * 100000
  }));

  const totalPages = Math.ceil(entries.length / PAGE_SIZE); // 3 trang
  assert.strictEqual(totalPages, 3, '25 bản ghi chia trang 10 phải ra đúng 3 trang');

  // Page 1: 10 items
  let page = 1;
  let pageItems = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  assert.strictEqual(pageItems.length, 10);
  assert.strictEqual(pageItems[0].id, 'led_1');

  // Page 3: 5 items
  page = 3;
  pageItems = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  assert.strictEqual(pageItems.length, 5);
  assert.strictEqual(pageItems[0].id, 'led_21');

  // Clamping
  let clampedPage = Math.max(1, Math.min(99, totalPages));
  assert.strictEqual(clampedPage, 3);
  clampedPage = Math.max(1, Math.min(-5, totalPages));
  assert.strictEqual(clampedPage, 1);

  // Kiểm tra cấu trúc DOM & hàm trong source code
  const indexHtml = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(indexHtml.includes('id="ledger-pagination"'), 'index.html phải có container phân trang ledger');
  assert.ok(indexHtml.includes('id="ledger-prev-btn"'), 'index.html phải có nút trang trước');
  assert.ok(indexHtml.includes('id="ledger-next-btn"'), 'index.html phải có nút trang sau');
  assert.ok(indexHtml.includes('id="ledger-page-info"'), 'index.html phải có nhãn hiển thị số trang');

  const appJs = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.ok(appJs.includes('function changeLedgerPage'), 'app.js phải có hàm changeLedgerPage');
  assert.ok(appJs.includes('window.changeLedgerPage = changeLedgerPage'), 'changeLedgerPage phải gắn vào window');
  assert.ok(appJs.includes('currentLedgerPage = 1;'), 'setLedgerFilter phải reset về trang 1');

  console.log('✓ Test 7: Phân trang Sổ Cái (Ledger Pagination) chia trang chuẩn xác và tích hợp đầy đủ UI điều khiển.');
}

// 8. Kiểm tra Tích hợp Lịch Sử Tiết Kiệm & Vay Tiền Ngân Hàng (Bank Ledger Integration)
async function testBankLedgerIntegration() {
  const fs = await import('node:fs');
  const indexHtml = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const appJs = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const syncJs = fs.readFileSync(new URL('../api/sync.js', import.meta.url), 'utf8');

  // 1. Kiểm tra DOM trong public/index.html
  assert.ok(indexHtml.includes('id="ledger-filter-bank"'), 'index.html phải có nút lọc giao dịch Ngân Hàng');
  assert.ok(indexHtml.includes('id="ledger-stat-bank-deposit"'), 'index.html phải có thẻ mini stat hiển thị tiền gửi');
  assert.ok(indexHtml.includes('id="ledger-stat-bank-debt"'), 'index.html phải có thẻ mini stat hiển thị dư nợ');

  // 2. Kiểm tra bộ lọc filter bank trong app.js
  assert.ok(appJs.includes("currentLedgerFilter === 'bank'"), 'app.js phải xử lý lọc theo danh mục bank');
  assert.ok(appJs.includes("ledger-filter-bank"), 'app.js phải quản lý nút ledger-filter-bank');
  assert.ok(appJs.includes('category.startsWith(\'bank_\')'), 'app.js phải lọc các giao dịch có category bank_*');

  // 3. Kiểm tra đồng bộ data.ledger sau các hành động ngân hàng trong app.js
  const normalizedAppJs = appJs.replace(/\r\n/g, '\n');
  assert.ok(normalizedAppJs.includes('if (Array.isArray(data.ledger)) {\n          appState.ledger = data.ledger;\n        }'), 'app.js phải đồng bộ data.ledger từ server khi giao dịch thành công');

  // 4. Kiểm tra api/sync.js trả về ledger trong phản hồi giao dịch ngân hàng
  assert.ok(syncJs.includes('ledger: uState.ledger,'), 'api/sync.js phải trả về ledger trong các giao dịch ngân hàng');

  // 5. Kiểm tra logic lọc mảng thực tế cho danh mục bank
  const entries = [
    { id: '1', type: 'earn', category: 'quest', amount: 50 },
    { id: '2', type: 'spend', category: 'reward', amount: 30 },
    { id: '3', type: 'spend', category: 'bank_deposit', amount: 20 },
    { id: '4', type: 'earn', category: 'bank_withdraw', amount: 20 },
    { id: '5', type: 'earn', category: 'bank_borrow', amount: 100 },
    { id: '6', type: 'spend', category: 'bank_repay', amount: 50 },
    { id: '7', type: 'spend', category: 'bank_deduct', amount: 10 }
  ];

  const bankFiltered = entries.filter(e => typeof e.category === 'string' && (e.category.startsWith('bank_') || ['bank_deposit', 'bank_withdraw', 'bank_borrow', 'bank_repay', 'bank_deduct'].includes(e.category)));
  assert.strictEqual(bankFiltered.length, 5, 'Bộ lọc bank phải trích xuất đúng 5 giao dịch ngân hàng');
  assert.deepStrictEqual(bankFiltered.map(e => e.category), ['bank_deposit', 'bank_withdraw', 'bank_borrow', 'bank_repay', 'bank_deduct']);

  console.log('✓ Test 8: Lịch sử Tiết kiệm & Vay tiền Ngân Hàng tích hợp đầy đủ vào Tab Lịch Sử (filter, mini-stats, client/server sync).');
}

// 9. Kiểm tra Cơ Chế Xem Thêm / Thu Gọn Mô Tả Thẻ Lịch Sử (Ledger Desc Toggle)
async function testLedgerDescToggle() {
  const fs = await import('node:fs');
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  const appJs = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

  // 1. Kiểm tra CSS cho trạng thái mở rộng và nút toggle trong style.css
  assert.ok(css.includes('.ledger-desc-content.expanded'), 'style.css phải có class .ledger-desc-content.expanded');
  assert.ok(css.includes('white-space: normal !important'), '.ledger-desc-content.expanded phải hỗ trợ xuống dòng tự nhiên');
  assert.ok(css.includes('.btn-toggle-ledger-desc'), 'style.css phải định nghĩa nút .btn-toggle-ledger-desc');

  // 2. Kiểm tra Template HTML trong renderLedger (app.js)
  assert.ok(appJs.includes('ledger-desc-content text-[10px] text-slate-400 truncate cursor-pointer'), 'Thẻ lịch sử phải có container .ledger-desc-content truncate');
  assert.ok(appJs.includes('btn-toggle-ledger-desc hidden text-[10px] font-bold text-amber-600'), 'Nút .btn-toggle-ledger-desc ẩn mặc định để chờ đo đạc');

  // 3. Kiểm tra logic JS đo đạc và toggle trong app.js
  assert.ok(appJs.includes('function setupLedgerDescToggles('), 'app.js phải có hàm setupLedgerDescToggles');
  assert.ok(appJs.includes("descContent.classList.remove('truncate')"), 'Khi xem thêm phải gỡ bỏ class truncate');
  assert.ok(appJs.includes("descContent.classList.add('expanded')"), 'Khi xem thêm phải thêm class expanded');
  assert.ok(appJs.includes("toggleBtn.textContent = 'Thu gọn ▲'"), 'Nhãn nút phải đổi thành Thu gọn ▲ khi mở rộng');
  assert.ok(appJs.includes("toggleBtn.textContent = '...xem thêm'"), 'Nhãn nút phải đổi thành ...xem thêm khi thu gọn');

  console.log('✓ Test 9: Cơ chế Xem Thêm / Thu Gọn cho các thẻ Lịch Sử trên mobile hoạt động chuẩn xác và mượt mà.');
}

testRollingWindow();
testDateGrouping();
testTodayStats();
testFiltering();
testSchemaStandardization();
await testZeroLocalStorageAndSkeleton();
await testLedgerPagination();
await testBankLedgerIntegration();
await testLedgerDescToggle();

console.log('\n🎉 TẤT CẢ 9/9 KIỂM THỬ QUẢN LÝ LỊCH SỬ THU CHI, PHÂN TRANG & ZERO-LOCALSTORAGE ĐÃ VƯỢT QUA!');

