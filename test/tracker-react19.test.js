import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { buildTrackerHistory, getFrequencyGridData } from '../components/tracker/tracker-utils.ts';

const emptyState = {
  ledger: [],
  proofPhotos: [],
  inventory: [],
  completedQuestIds: [],
};

test('Tracker React replaces legacy tab and renders category/period controls', () => {
  const page = fs.readFileSync(path.join(process.cwd(), 'app', 'page.tsx'), 'utf8');
  const tracker = fs.readFileSync(path.join(process.cwd(), 'components', 'tracker', 'Tracker.tsx'), 'utf8');
  assert.ok(page.includes('<Tracker />'));
  assert.ok(page.includes("rawHtml.indexOf('<section id=\"tab-admin\"')"));
  assert.ok(page.includes('tab-tracker'), 'the legacy tracker section must be removed from the bridge');
  assert.ok(tracker.includes('id="tab-tracker"'));
  assert.ok(tracker.includes("useState<TrackerPeriod>('monthly')"));
  assert.ok(tracker.includes("useState<TrackerCategory>('quests')"));
  assert.ok(tracker.includes('openItemFrequencyModal'), 'the existing frequency detail modal remains wired');
  assert.ok(tracker.includes('buildTrackerHistory'), 'legacy history backfill behavior is represented in React');
});

test('frequency grid retains Monday-first week, month padding, leap-year and percentage behavior', () => {
  const monday = new Date(2024, 1, 28, 12);
  const week = getFrequencyGridData({ '2024-02-26': 2 }, 'weekly', monday);
  assert.equal(week.days[0].dateStr, '2024-02-26');
  assert.equal(week.days[0].dayOfWeek, 0);
  assert.equal(week.days[0].count, 2);
  assert.equal(week.days.length, 7);

  const month = getFrequencyGridData({ '2024-02-01': 1 }, 'monthly', new Date(2024, 1, 28, 12));
  assert.equal(month.totalPeriodDays, 29);
  assert.equal(month.padStart, 3);
  assert.equal(month.days.length, 29);
  assert.equal(month.activeDaysCount, 1);
  assert.equal(month.percentage, 3.57);

  const year = getFrequencyGridData({}, 'yearly', new Date(2024, 1, 28, 12));
  assert.equal(year.totalPeriodDays, 366);
  assert.equal(year.days.length, 366);
});

test('quest history rebuilds from ledger, proof, and completion count without mutating source', () => {
  const quest = {
    id: 'q-1',
    title: 'Read',
    history: {},
    completedCount: 4,
    createdAt: new Date(2024, 1, 20, 12).getTime(),
    isRepeatable: true,
    rank: 'E',
    status: 'active',
  };
  const state = {
    ...emptyState,
    ledger: [
      { id: 'e1', questId: 'q-1', type: 'earn', category: 'quest', title: 'Read', description: '', amount: 1, timestamp: new Date(2024, 1, 21, 12).getTime() },
      { id: 'e2', questId: 'q-1', type: 'earn', category: 'quest', title: 'Read', description: '', amount: 1, timestamp: new Date(2024, 1, 21, 13).getTime() },
      { id: 'undo', questId: 'q-1', type: 'earn', category: 'quest_undo', title: 'Hoàn tác Read', description: '', amount: 1, timestamp: new Date(2024, 1, 22, 12).getTime() },
    ],
    proofPhotos: [{ id: 'p1', questId: 'q-1', timestamp: new Date(2024, 1, 22, 12).getTime() }],
  };

  const history = buildTrackerHistory(quest, true, state);
  assert.deepEqual(history, {
    '2024-02-21': 2,
    '2024-02-22': 1,
    '2024-02-20': 1,
  });
  assert.deepEqual(quest.history, {}, 'history rebuild should not mutate provider state');
});

test('reward history rebuilds from inventory and filters refunded purchases', () => {
  const reward = {
    id: 'r-1',
    name: 'Coffee',
    history: {},
    price: 10,
    tier: 'common',
    icon: '☕',
    description: '',
    targetMinutes: 0,
  };
  const state = {
    ...emptyState,
    inventory: [{ id: 'i1', shopItemId: 'r-1', name: 'Coffee', purchasedAt: new Date(2024, 1, 20, 12).getTime(), price: 10, tier: 'common', icon: '☕', isUsed: false }],
    ledger: [
      { id: 'spend', shopItemId: 'r-1', type: 'spend', category: 'reward', title: 'Coffee', description: '', amount: 10, timestamp: new Date(2024, 1, 20, 13).getTime() },
      { id: 'refund', shopItemId: 'r-1', type: 'earn', category: 'reward_refund', title: 'Hoàn trả Coffee', description: '', amount: 10, timestamp: new Date(2024, 1, 21, 12).getTime() },
    ],
  };

  assert.deepEqual(buildTrackerHistory(reward, false, state), { '2024-02-20': 1 });
});
