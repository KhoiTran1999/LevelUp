import type { LevelUpAppState, Quest, ShopItem } from '@/types/levelup';

export type TrackerPeriod = 'weekly' | 'monthly' | 'yearly';
export type TrackerHistory = Record<string, unknown>;

export interface FrequencyDay {
  date: Date;
  dateStr: string;
  count: number;
  isFuture: boolean;
  isToday: boolean;
  dayOfWeek: number;
}

export interface FrequencyGridData {
  period: TrackerPeriod;
  year: number;
  month: number;
  padStart: number;
  days: FrequencyDay[];
  activeDaysCount: number;
  totalPeriodDays: number;
  daysPassed: number;
  percentage: number;
}

export function getLocalDayString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getFrequencyGridData(
  history: TrackerHistory = {},
  period: TrackerPeriod = 'yearly',
  targetDate = new Date(),
): FrequencyGridData {
  const now = new Date(targetDate);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const today = getLocalDayString(now);
  const days: FrequencyDay[] = [];
  let totalPeriodDays: number;
  let daysPassed = 0;
  let padStart = 0;

  const addDay = (date: Date) => {
    const dateStr = getLocalDayString(date);
    const rawCount = Number(history[dateStr]);
    const count = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 0;
    if (dateStr <= today) daysPassed++;
    days.push({
      date,
      dateStr,
      count,
      isFuture: dateStr > today,
      isToday: dateStr === today,
      dayOfWeek: (date.getDay() + 6) % 7,
    });
  };

  if (period === 'weekly') {
    const weekday = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - weekday);
    monday.setHours(0, 0, 0, 0);
    totalPeriodDays = 7;
    for (let index = 0; index < 7; index++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      addDay(date);
    }
  } else if (period === 'monthly') {
    const firstDay = new Date(currentYear, currentMonth, 1);
    totalPeriodDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    padStart = (firstDay.getDay() + 6) % 7;
    for (let day = 1; day <= totalPeriodDays; day++) {
      addDay(new Date(currentYear, currentMonth, day));
    }
  } else {
    const firstDay = new Date(currentYear, 0, 1);
    const lastDay = new Date(currentYear, 11, 31);
    totalPeriodDays = (lastDay.getTime() - firstDay.getTime()) / 86_400_000 + 1;
    padStart = (firstDay.getDay() + 6) % 7;
    for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
      addDay(new Date(date));
    }
  }

  const activeDaysCount = days.filter(day => day.count > 0).length;
  const denominator = Math.max(1, daysPassed || totalPeriodDays);
  return {
    period,
    year: currentYear,
    month: currentMonth + 1,
    padStart,
    days,
    activeDaysCount,
    totalPeriodDays,
    daysPassed,
    percentage: Math.round((activeDaysCount / denominator) * 10_000) / 100,
  };
}

type TrackerState = Pick<LevelUpAppState, 'ledger' | 'proofPhotos' | 'inventory' | 'completedQuestIds'>;

function addAtLeast(history: TrackerHistory, date: string, count: number) {
  history[date] = Math.max(Number(history[date]) || 0, count);
}

function addCount(history: TrackerHistory, date: string, count: number) {
  history[date] = (Number(history[date]) || 0) + count;
}

function completionDate(timestamp?: number): string | null {
  return timestamp ? getLocalDayString(new Date(timestamp)) : null;
}

export function buildTrackerHistory(
  item: Quest | ShopItem,
  isQuest: boolean,
  state: TrackerState,
): TrackerHistory {
  const history: TrackerHistory = { ...(item.history || {}) };
  const title = isQuest ? (item as Quest).title : (item as ShopItem).name;

  if (isQuest) {
    const quest = item as Quest;
    const deductionCounts: Record<string, number> = {};
    for (const deduction of quest.loanDeductions || []) {
      const date = deduction.completedDate || completionDate(deduction.timestamp);
      if (date) deductionCounts[date] = (deductionCounts[date] || 0) + 1;
    }
    for (const [date, count] of Object.entries(deductionCounts)) addAtLeast(history, date, count);

    const ledgerCounts: Record<string, number> = {};
    for (const entry of state.ledger) {
      const matches = entry.questId === quest.id ||
        entry.title === title ||
        entry.title === `Hoàn thành: ${title}` ||
        Boolean(entry.description?.includes(title));
      const isEarn = entry.type === 'earn' || entry.category === 'quest';
      const isUndo = entry.category === 'quest_undo' || Boolean(entry.title?.startsWith('Hoàn tác'));
      if (!matches || !isEarn || isUndo || !entry.timestamp) continue;
      const date = completionDate(entry.timestamp);
      if (date) ledgerCounts[date] = (ledgerCounts[date] || 0) + 1;
    }
    for (const [date, count] of Object.entries(ledgerCounts)) addAtLeast(history, date, count);

    for (const proof of state.proofPhotos) {
      if (proof.questId !== quest.id && proof.questTitle !== title) continue;
      const date = completionDate(proof.timestamp || proof.createdAt);
      if (date) addAtLeast(history, date, 1);
    }
    for (const timestamp of [quest.completedAt, quest.lastCompletedAt]) {
      const date = completionDate(timestamp);
      if (date) addAtLeast(history, date, 1);
    }

    const wasCompleted = state.completedQuestIds.includes(quest.id) ||
      quest.status === 'completed' ||
      quest.completed === true;
    const fallbackTimestamp = quest.completedAt || quest.lastCompletedAt || quest.updatedAt || quest.createdAt || Date.now();
    if (wasCompleted && Object.keys(history).length === 0) {
      const date = completionDate(fallbackTimestamp);
      if (date) addAtLeast(history, date, Number(quest.completedCount) || 1);
    }

    const completionTotal = Object.values(history).reduce<number>((sum, count) => sum + (Number(count) || 0), 0);
    const missingCompletions = (Number(quest.completedCount) || 0) - completionTotal;
    if (missingCompletions > 0) {
      const date = completionDate(quest.lastCompletedAt || quest.completedAt || quest.updatedAt || quest.createdAt || Date.now());
      if (date) addCount(history, date, missingCompletions);
    }
  } else {
    const reward = item as ShopItem;
    for (const inventoryItem of state.inventory) {
      if (inventoryItem.shopItemId !== reward.id && inventoryItem.name !== reward.name) continue;
      const date = completionDate(inventoryItem.purchasedAt || inventoryItem.usedAt || inventoryItem.createdAt);
      if (date) addAtLeast(history, date, 1);
    }
    for (const entry of state.ledger) {
      const matches = entry.shopItemId === reward.id ||
        Boolean(entry.title?.includes(reward.name)) ||
        Boolean(entry.description?.includes(reward.name));
      const isSpend = entry.type === 'spend' || entry.category === 'reward';
      const isRefund = entry.category === 'reward_refund' || Boolean(entry.title?.startsWith('Hoàn trả'));
      if (!matches || !isSpend || isRefund) continue;
      const date = completionDate(entry.timestamp);
      if (date) addAtLeast(history, date, 1);
    }
  }

  return history;
}
