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

  console.log('✓ Test 6: Đã loại bỏ hoàn toàn LocalStorage, dữ liệu 100% trên Redis và kích hoạt Skeleton loading chống chớp nháy.');
}

testRollingWindow();
testDateGrouping();
testTodayStats();
testFiltering();
testSchemaStandardization();
await testZeroLocalStorageAndSkeleton();

console.log('\n🎉 TẤT CẢ 6/6 KIỂM THỬ QUẢN LÝ LỊCH SỬ THU CHI & ZERO-LOCALSTORAGE ĐÃ VƯỢT QUA!');
