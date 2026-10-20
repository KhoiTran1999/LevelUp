'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FrequencyDay, TrackerPeriod } from '@/components/tracker/tracker-utils';
import { buildTrackerHistory, getFrequencyGridData, getLocalDayString } from '@/components/tracker/tracker-utils';
import type { Quest, ShopItem } from '@/types/levelup';
import { useLevelUp } from '@/hooks/useLevelUp';
import { Heatmap } from '@/components/tracker/Tracker';

interface FrequencyOpenDetail {
  item: Quest | ShopItem;
  isQuest: boolean;
}

interface FrequencyWindow extends Window {
  parentDetailQuestId?: string | null;
  openQuestDetailModal?: (questId: string) => void;
  sfx?: { playClick?: () => void };
}

const periods: { id: TrackerPeriod; label: string }[] = [
  { id: 'weekly', label: 'Tuần' },
  { id: 'monthly', label: 'Tháng' },
  { id: 'yearly', label: 'Năm' },
];

function formatDate(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function getDaySummary(day: FrequencyDay, isQuest: boolean) {
  if (day.isFuture) {
    return {
      icon: '⏳',
      status: 'Chưa tới ngày này',
      badge: 'Chưa tới',
      badgeClass: 'bg-slate-200/80 dark:bg-slate-800 text-slate-400',
    };
  }
  if (day.count > 0) {
    return {
      icon: '✨',
      status: isQuest ? `Đã hoàn thành ${day.count} lần` : `Đã đổi thưởng ${day.count} lần`,
      badge: `${day.count} lần`,
      badgeClass: isQuest ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-sky-500 text-slate-950 font-bold',
    };
  }
  return {
    icon: '⚪',
    status: isQuest ? 'Chưa thực hiện' : 'Chưa đổi thưởng',
    badge: '0 lần',
    badgeClass: 'bg-slate-200/80 dark:bg-slate-800 text-slate-500',
  };
}

export function FrequencyDetailModal() {
  const { state } = useLevelUp();
  const [target, setTarget] = useState<{ id: string; isQuest: boolean; fallback: Quest | ShopItem } | null>(null);
  const [period, setPeriod] = useState<TrackerPeriod>('monthly');
  const [selectedDay, setSelectedDay] = useState<FrequencyDay | null>(null);
  const today = new Date();
  const todayString = getLocalDayString(today);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<FrequencyOpenDetail>).detail;
      if (!detail?.item?.id || typeof detail.isQuest !== 'boolean') {
        console.error('[FrequencyDetailModal] Invalid item supplied to frequency dialog.');
        return;
      }
      const item = detail.isQuest
        ? state.quests.find(quest => quest.id === detail.item.id) || detail.item
        : state.shopItems.find(reward => reward.id === detail.item.id) || detail.item;
      const history = buildTrackerHistory(item, detail.isQuest, state);
      const monthData = getFrequencyGridData(history, 'monthly');
      const total = Object.values(history).reduce<number>((sum, count) => sum + (Number(count) || 0), 0);
      setTarget({ id: item.id, isQuest: detail.isQuest, fallback: item });
      setPeriod(monthData.activeDaysCount > 0 || total === 0 ? 'monthly' : 'yearly');
      setSelectedDay(null);
    };
    window.addEventListener('levelup:open-frequency-detail', handleOpen);
    return () => window.removeEventListener('levelup:open-frequency-detail', handleOpen);
  }, [state]);

  const item = target
    ? target.isQuest
      ? state.quests.find(quest => quest.id === target.id) || target.fallback as Quest
      : state.shopItems.find(reward => reward.id === target.id) || target.fallback as ShopItem
    : null;
  const history = useMemo(
    () => item && target ? buildTrackerHistory(item, target.isQuest, state) : {},
    [item, target, state.ledger, state.proofPhotos, state.inventory, state.completedQuestIds],
  );
  const displayItem = item ? { ...item, history } : null;
  const gridData = getFrequencyGridData(history, period);
  const totalCompletions = Object.values(history).reduce<number>((sum, count) => sum + (Number(count) || 0), 0);
  const totalForItem = target?.isQuest && item && 'completedCount' in item
    ? Math.max(totalCompletions, Number(item.completedCount) || 0)
    : totalCompletions;
  const summary = selectedDay && target ? getDaySummary(selectedDay, target.isQuest) : null;

  const close = () => {
    (window as FrequencyWindow).sfx?.playClick?.();
    setTarget(null);
    const legacyWindow = window as FrequencyWindow;
    const parentQuestId = legacyWindow.parentDetailQuestId;
    if (parentQuestId) {
      legacyWindow.parentDetailQuestId = null;
      window.setTimeout(() => legacyWindow.openQuestDetailModal?.(parentQuestId), 50);
    }
  };

  if (!target || !item || !displayItem) return null;

  return (
    <div id="modal-frequency-detail" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-4">
      <section className="rpg-panel flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-2xl dark:border-slate-800 sm:max-w-xl" role="dialog" aria-modal="true" aria-labelledby="modal-freq-title">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="shrink-0 text-2xl">{item.icon || (target.isQuest ? '📜' : '🎁')}</span>
            <div className="min-w-0">
              <h2 id="modal-freq-title" className="font-rpg-title truncate text-sm font-extrabold text-slate-900 dark:text-slate-100 sm:text-base">{'title' in item ? item.title : item.name}</h2>
              <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${target.isQuest ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-purple-500/15 text-purple-700 dark:text-purple-300'}`}>{target.isQuest ? 'NHIỆM VỤ' : 'PHẦN THƯỞNG'}</span>
            </div>
          </div>
          <button type="button" onClick={close} className="modal-close flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-200/60 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700" aria-label="Đóng">
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto p-5 text-xs text-slate-700 dark:text-slate-300 sm:p-6">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/60 bg-slate-100/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-[10px] font-bold uppercase text-slate-400">Tỷ Lệ Hoàn Thành</div>
              <div className="mt-1 font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">{gridData.percentage.toFixed(2).replace('.', ',')}%</div>
              <div className="mt-0.5 text-[9px] text-slate-400">Trong chu kỳ đã chọn</div>
            </div>
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/60 bg-slate-100/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-[10px] font-bold uppercase text-slate-400">Tổng Ngày Đã Làm</div>
              <div className="mt-1 font-mono text-xl font-black text-amber-600 dark:text-amber-400">{gridData.activeDaysCount}d</div>
              <div className="mt-0.5 text-[9px] text-slate-400">Số ngày có hoạt động</div>
            </div>
            <div className="col-span-2 flex flex-col justify-between rounded-xl border border-slate-200/60 bg-slate-100/80 p-3 dark:border-slate-800 dark:bg-slate-900/60 sm:col-span-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">Tổng Lượt Hoàn Thành</div>
              <div className="mt-1 text-xl text-sky-600 dark:text-sky-400"><span className="font-mono">{totalForItem}</span> lần</div>
              <div className="mt-0.5 text-[9px] text-slate-400">Cộng dồn tất cả các lần</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 pt-1 dark:border-slate-800/60">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Xem theo chu kỳ:</span>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-800 dark:bg-slate-900">
              {periods.map(option => (
                <button
                  key={option.id}
                  id={`modal-freq-p-${option.id}`}
                  type="button"
                  aria-pressed={period === option.id}
                  onClick={() => {
                    (window as FrequencyWindow).sfx?.playClick?.();
                    setPeriod(option.id);
                  }}
                  className={`cursor-pointer rounded-lg px-3 py-1 text-xs transition ${period === option.id ? 'bg-amber-500 font-bold text-slate-950 shadow-xs' : 'font-semibold text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div id="modal-freq-grid-container" className="flex min-h-[120px] items-center justify-center rounded-2xl border border-slate-200/70 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <Heatmap
              key={`${target.isQuest}-${target.id}`}
              item={displayItem}
              isQuest={target.isQuest}
              period={period}
              initialSelectedDate={todayString}
              onSelectedDayChange={setSelectedDay}
              showDaySummary={false}
            />
          </div>

          <div id="modal-freq-day-detail" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-100/90 p-3 text-xs transition-all dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex min-w-0 items-center gap-2.5">
              <span id="modal-freq-detail-icon" className="shrink-0 text-xl">{summary?.icon || '📅'}</span>
              <div className="min-w-0">
                <div id="modal-freq-detail-date" className="truncate text-xs font-bold text-slate-800 dark:text-slate-200 sm:text-sm">
                  {selectedDay ? `${formatDate(selectedDay.date)}${selectedDay.isToday ? ' (Hôm nay)' : ''}` : 'Chạm hoặc rê chuột vào ô ngày'}
                </div>
                <div id="modal-freq-detail-status" className="mt-0.5 truncate text-[11px] text-slate-500">
                  {summary?.status || 'Để xem chi tiết số lần hoàn thành'}
                </div>
              </div>
            </div>
            <span id="modal-freq-detail-badge" className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${summary?.badgeClass || 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
              {summary?.badge || '--'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
