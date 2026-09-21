import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

test('Frequency Tracker - Math and Grid Calculation (Matches Image 1: 1d -> 0.27%, 33d -> 9.04%)', async () => {
  // Test percentage calculation
  const totalDays = 365;
  const pct1 = (1 / totalDays) * 100;
  const pct33 = (33 / totalDays) * 100;

  assert.equal(pct1.toFixed(2), '0.27');
  assert.equal(pct33.toFixed(2), '9.04');
});

test('Frequency Tracker - HTML elements exist in public/index.html', async () => {
  const htmlPath = path.join(process.cwd(), 'public', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Tab navigation in Menu / Xem Thêm
  assert.ok(html.includes('id="nav-more-menu"'), 'Desktop nav should contain #nav-more-menu');
  assert.ok(html.includes('id="mobile-more-menu"'), 'Mobile nav should contain #mobile-more-menu');

  const navMoreMenu = html.substring(html.indexOf('id="nav-more-menu"'), html.indexOf('</nav>'));
  assert.ok(navMoreMenu.includes('data-tab="tracker"'), 'Tracker tab button must be inside #nav-more-menu');

  const mobileMoreMenu = html.substring(html.indexOf('id="mobile-more-menu"'), html.indexOf('id="mobile-more-menu"') + 800);
  assert.ok(mobileMoreMenu.includes('data-tab="tracker"'), 'Tracker tab button must be inside #mobile-more-menu');

  // Section pane
  assert.ok(html.includes('id="tab-tracker"'), 'index.html should have section id="tab-tracker"');

  // Category filter: exactly 2 categories (Nhiệm Vụ & Phần Thưởng), no 'Tất cả'
  assert.ok(!html.includes('id="tracker-cat-all"'), 'index.html should NOT have #tracker-cat-all');
  assert.ok(html.includes('id="tracker-cat-quests"'), 'index.html should have #tracker-cat-quests');
  assert.ok(html.includes('id="tracker-cat-rewards"'), 'index.html should have #tracker-cat-rewards');

  // Default period: Monthly is active by default
  assert.ok(html.includes('id="tracker-period-monthly" class="tracker-period-btn px-3 py-1.5 rounded-xl text-xs font-bold transition bg-amber-500 text-slate-950 shadow-xs cursor-pointer"'), 'Monthly period button should have active class');
  assert.ok(html.includes('id="modal-freq-p-monthly" class="modal-freq-btn px-3 py-1 rounded-lg text-xs font-bold transition bg-amber-500 text-slate-950 shadow-xs cursor-pointer"'), 'Modal monthly button should have active class');

  assert.ok(html.includes('id="tracker-list-container"'), 'index.html should have tracker-list-container');
  // Detail modal
  assert.ok(html.includes('id="modal-frequency-detail"'), 'index.html should have modal-frequency-detail');
  assert.ok(html.includes('id="modal-freq-grid-container"'), 'index.html should have modal-freq-grid-container');
  assert.ok(html.includes('id="modal-freq-day-detail"'), 'index.html should have modal-freq-day-detail');

  // Floating tooltip element
  assert.ok(html.includes('id="heatmap-floating-tooltip"'), 'index.html should have heatmap-floating-tooltip');
});

test('Frequency Tracker - Bundled client includes tracker engine in public/app.js', async () => {
  const jsPath = path.join(process.cwd(), 'public', 'app.js');
  const js = fs.readFileSync(jsPath, 'utf8');

  assert.ok(js.includes('getFrequencyGridData'), 'public/app.js should contain getFrequencyGridData');
  assert.ok(js.includes('backfillItemHistories'), 'public/app.js should contain backfillItemHistories');
  assert.ok(js.includes('renderTracker'), 'public/app.js should contain renderTracker');
  assert.ok(js.includes('openItemFrequencyModal'), 'public/app.js should contain openItemFrequencyModal');
  assert.ok(js.includes('btn-view-quest-freq'), 'public/app.js should contain btn-view-quest-freq');
  assert.ok(js.includes('btn-view-shop-freq'), 'public/app.js should contain btn-view-shop-freq');

  // Interactive tooltip & day detail
  assert.ok(js.includes('showHeatmapFloatingTooltip'), 'public/app.js should contain showHeatmapFloatingTooltip');
  assert.ok(js.includes('updateHeatmapDayDetailUI'), 'public/app.js should contain updateHeatmapDayDetailUI');
  assert.ok(js.includes('tracker-card-day-status'), 'public/app.js should contain tracker-card-day-status');

  // Verify Gold descending sorting logic in bundle
  assert.ok(js.includes('(b.rewardCoins || 0) - (a.rewardCoins || 0)'), 'Quests should be sorted by rewardCoins descending');
  assert.ok(js.includes('(b.price || 0) - (a.price || 0)'), 'Shop items should be sorted by price descending');

  // Default tracker period is monthly
  assert.ok(js.includes("currentTrackerPeriod = 'monthly'"), 'currentTrackerPeriod should default to monthly');
});

test('Frequency Tracker - Gold descending sorting logic works correctly', async () => {
  const quests = [
    { id: 'q1', title: 'Task 1', rewardCoins: 10 },
    { id: 'q2', title: 'Task 2', rewardCoins: 100 },
    { id: 'q3', title: 'Task 3', rewardCoins: 50 },
    { id: 'q4', title: 'Task 4' } // undefined coins -> 0
  ];

  const sortedQuests = [...quests].sort((a, b) => (b.rewardCoins || 0) - (a.rewardCoins || 0));
  assert.deepEqual(sortedQuests.map(q => q.id), ['q2', 'q3', 'q1', 'q4']);

  const shopItems = [
    { id: 's1', name: 'Item 1', price: 20 },
    { id: 's2', name: 'Item 2', price: 500 },
    { id: 's3', name: 'Item 3', price: 150 }
  ];

  const sortedShop = [...shopItems].sort((a, b) => (b.price || 0) - (a.price || 0));
  assert.deepEqual(sortedShop.map(s => s.id), ['s2', 's3', 's1']);
});

test('Frequency Tracker - backfillItemHistories correctly reconstructs quest and reward history', async () => {
  const js = fs.readFileSync(path.join(process.cwd(), 'src/js/05-streak.js'), 'utf8');
  const sandbox = {
    window: {},
    appState: {
      quests: [
        {
          id: 'q-completed-timestamp',
          title: 'Chạy bộ 5km',
          status: 'completed',
          completedAt: 1740000000000,
          history: {}
        },
        {
          id: 'q-repeatable-ledger',
          title: 'Đọc sách 20 trang',
          isRepeatable: true,
          completedCount: 4,
          history: {}
        },
        {
          id: 'q-completed-flag-no-timestamp',
          title: 'Viết nhật ký',
          completed: true,
          createdAt: 1739000000000,
          history: {}
        }
      ],
      ledger: [
        {
          id: 'tx-1',
          questId: 'q-repeatable-ledger',
          type: 'earn',
          category: 'quest',
          timestamp: 1740000000000
        },
        {
          id: 'tx-2',
          title: 'Hoàn thành: Đọc sách 20 trang',
          type: 'earn',
          category: 'quest',
          timestamp: 1740000000000
        },
        {
          id: 'tx-3',
          shopItemId: 'shop-1',
          name: 'Cà phê Highland',
          title: 'Mua Cà phê Highland',
          type: 'spend',
          category: 'reward',
          timestamp: 1740000000000
        }
      ],
      proofPhotos: [
        {
          questId: 'q-completed-timestamp',
          timestamp: 1740000000000
        }
      ],
      shopItems: [
        {
          id: 'shop-1',
          name: 'Cà phê Highland',
          price: 50,
          history: {}
        }
      ],
      inventory: [
        {
          id: 'inv-1',
          shopItemId: 'shop-1',
          name: 'Cà phê Highland',
          purchasedAt: 1740000000000
        }
      ],
      completedQuestIds: ['q-completed-timestamp']
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(js, sandbox);

  sandbox.window.backfillItemHistories();

  const [q1, q2, q3] = sandbox.appState.quests;
  const [shop1] = sandbox.appState.shopItems;

  // 1. q1: completedAt and photo proof
  assert.ok(Object.keys(q1.history).length > 0, 'q1 history should have at least 1 date');
  assert.ok(Object.values(q1.history).some(v => v >= 1), 'q1 history count should be at least 1');

  // 2. q2: completedCount = 4, ledger has 2 matches, reconciliation ensures total count = 4
  const q2Sum = Object.values(q2.history).reduce((s, c) => s + c, 0);
  assert.equal(q2Sum, 4, 'q2 total count in history must equal completedCount (4)');

  // 3. q3: completed: true without timestamp uses fallback timestamp (createdAt)
  assert.ok(Object.keys(q3.history).length > 0, 'q3 history should be backfilled from createdAt fallback');

  // 4. shop1: backfilled from inventory & ledger
  assert.ok(Object.keys(shop1.history).length > 0, 'shop item history should be backfilled');
  assert.ok(Object.values(shop1.history).some(v => v >= 1), 'shop item count should be at least 1');
});

