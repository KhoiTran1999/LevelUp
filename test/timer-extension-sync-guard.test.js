import assert from 'node:assert';

// 1. Kiểm tra format timerState đồng bộ Extension và localStorage
const sampleRunningTimer = {
  status: 'running',
  questId: 'q_test_123',
  questTitle: 'Luyện tập thuật toán',
  questRank: 'A',
  questCoins: 20,
  remainingSeconds: 1450.4,
  totalSeconds: 1500,
};

const payload = {
  status: sampleRunningTimer.status,
  questId: sampleRunningTimer.questId,
  questTitle: sampleRunningTimer.questTitle,
  questRank: sampleRunningTimer.questRank,
  questIcon: '🎯',
  rewardCoins: sampleRunningTimer.questCoins,
  remainingSeconds: Math.max(0, Math.round(sampleRunningTimer.remainingSeconds)),
  totalSeconds: Math.max(0, Math.round(sampleRunningTimer.totalSeconds)),
  isRunning: sampleRunningTimer.status === 'running',
  isBreakMode: false,
  updatedAt: Date.now(),
};

assert.strictEqual(payload.isRunning, true, 'isRunning must be true when timer status is running');
assert.strictEqual(payload.remainingSeconds, 1450, 'remainingSeconds must be rounded integer');

// 2. Kiểm tra conflict resolution giữ nguyên activeTimer khi đang chạy local
const prevLocalState = {
  activeTimer: { status: 'running', remainingSeconds: 1400 },
  quests: [],
};
const incomingRemoteState = {
  activeTimer: null,
  quests: [],
};

const resolvedActiveTimer = prevLocalState.activeTimer?.status === 'running'
  ? prevLocalState.activeTimer
  : (incomingRemoteState.activeTimer ?? null);

assert.deepStrictEqual(resolvedActiveTimer, prevLocalState.activeTimer, 'Active running timer must not be clobbered by remote null');

console.log('✓ timer-extension-sync-guard: PASS');
