'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Quest, ShopItem } from '@/types/levelup';
import { useLevelUp } from '@/hooks/useLevelUp';
import {
  buildTrackerHistory,
  getFrequencyGridData,
  type FrequencyDay,
  type TrackerPeriod,
} from './tracker-utils';

type TrackerCategory = 'quests' | 'rewards';
type TrackerItem = { item: Quest | ShopItem; isQuest: boolean };

const PERIODS: { id: TrackerPeriod; label: string }[] = [
  { id: 'weekly', label: 'Tuần' },
  { id: 'monthly', label: 'Tháng' },
  { id: 'yearly', label: 'Năm' },
];

function formatDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function daySummary(day: FrequencyDay, isQuest: boolean): { icon: string; status: string; badge: string; badgeClass: string } {
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
      badgeClass: isQuest
        ? 'bg-emerald-500 text-slate-950 font-bold'
        : 'bg-sky-500 text-slate-950 font-bold',
    };
  }
  return {
    icon: '⚪',
    status: isQuest ? 'Chưa thực hiện' : 'Chưa đổi thưởng',
    badge: '0 lần',
    badgeClass: 'bg-slate-200/80 dark:bg-slate-800 text-slate-500',
  };
}

export function Heatmap({
  item,
  isQuest,
  period,
  initialSelectedDate,
  onSelectedDayChange,
  showDaySummary = true,
}: {
  item: Quest | ShopItem;
  isQuest: boolean;
  period: TrackerPeriod;
  initialSelectedDate?: string;
  onSelectedDayChange?: (day: FrequencyDay | null) => void;
  showDaySummary?: boolean;
}) {
  const data = getFrequencyGridData(item.history || {}, period);
  const [selectedDay, setSelectedDay] = useState<FrequencyDay | null>(null);
  const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  const selectedSummary = selectedDay ? daySummary(selectedDay, isQuest) : null;
  useEffect(() => {
    const day = data.days.find(entry => entry.dateStr === initialSelectedDate) || null;
    setSelectedDay(day);
    onSelectedDayChange?.(day);
  }, [period, initialSelectedDate, item.id]);

  const selectDay = (day: FrequencyDay) => {
    setSelectedDay(day);
    onSelectedDayChange?.(day);
  };

  return (
    <>
      {period === 'yearly' ? (
        <div className="overflow-x-auto custom-scrollbar pb-1 pt-1 -mx-1 px-1">
          <div className="inline-grid grid-rows-7 grid-flow-col gap-1 auto-cols-max min-w-[480px] sm:min-w-0">
            {Array.from({ length: data.padStart }, (_, index) => (
              <span key={`pad-${index}`} className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            ))}
            {data.days.map(day => {
              const color = day.count > 1
                ? isQuest ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-sky-600 dark:bg-sky-400'
                : day.count === 1
                  ? isQuest ? 'bg-emerald-500' : 'bg-sky-500'
                  : day.isFuture
                    ? 'bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/30'
                    : 'bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700';
              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onMouseEnter={() => selectDay(day)}
                  onFocus={() => selectDay(day)}
                  onClick={() => selectDay(day)}
                  title={`${dayLabels[day.dayOfWeek]}, ${day.dateStr}: ${day.count ? `${day.count} lần` : day.isFuture ? 'Chưa tới' : 'Chưa thực hiện'}`}
                  aria-label={`${dayLabels[day.dayOfWeek]}, ${day.dateStr}: ${day.count} lần`}
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] ${color} ${
                    day.isToday ? 'ring-1.5 ring-amber-400 dark:ring-amber-300 ring-offset-1 dark:ring-offset-slate-950 z-10' : ''
                  } ${selectedDay?.dateStr === day.dateStr ? 'outline outline-2 outline-amber-400 scale-125' : ''} transition-transform hover:scale-150 active:scale-95`}
                />
              );
            })}
          </div>
        </div>
      ) : period === 'monthly' ? (
        <div className="max-w-xs mx-auto w-full">
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => (
              <div key={label} className="text-[10px] sm:text-xs font-bold text-slate-400 text-center py-1">{label}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: data.padStart }, (_, index) => (
              <span key={`pad-${index}`} className="aspect-square" />
            ))}
            {data.days.map(day => {
              const color = day.count > 0
                ? isQuest
                  ? 'bg-emerald-500 text-slate-950 border border-emerald-400/80 shadow-xs'
                  : 'bg-sky-500 text-slate-950 border border-sky-400/80 shadow-xs'
                : day.isFuture
                  ? 'bg-slate-50/40 dark:bg-slate-950/30 text-slate-300 dark:text-slate-700 border border-dashed border-slate-200/40 dark:border-slate-800/40'
                  : 'bg-slate-100/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-200/60 dark:hover:bg-slate-800/60';
              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onMouseEnter={() => selectDay(day)}
                  onFocus={() => selectDay(day)}
                  onClick={() => selectDay(day)}
                  title={`${dayLabels[day.dayOfWeek]}, ${day.dateStr}: ${day.count ? `${day.count} lần` : day.isFuture ? 'Chưa tới' : 'Chưa thực hiện'}`}
                  aria-label={`${dayLabels[day.dayOfWeek]}, ${day.dateStr}: ${day.count} lần`}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs ${color} ${
                    day.isToday ? 'ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-slate-950 font-black z-10' : ''
                  } ${selectedDay?.dateStr === day.dateStr ? 'ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-slate-900 scale-110' : ''} transition-all hover:scale-105 active:scale-95 relative select-none`}
                >
                  <span className={day.count > 1 ? 'text-[11px] sm:text-xs font-bold leading-none' : 'text-xs sm:text-sm font-semibold leading-none'}>
                    {day.date.getDate()}
                  </span>
                  {day.count > 1 && <span className="text-[8px] sm:text-[9px] font-black leading-none mt-0.5 px-1 rounded-full bg-slate-950/20 text-slate-950">×{day.count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {data.days.map(day => {
            const color = day.count > 0
              ? isQuest
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300'
              : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400';
            return (
              <button
                key={day.dateStr}
                type="button"
                onMouseEnter={() => selectDay(day)}
                onFocus={() => selectDay(day)}
                onClick={() => selectDay(day)}
                title={`${dayLabels[day.dayOfWeek]}, ${day.dateStr}: ${day.count ? `${day.count} lần` : day.isFuture ? 'Chưa tới' : 'Chưa thực hiện'}`}
                aria-label={`${dayLabels[day.dayOfWeek]}, ${day.dateStr}: ${day.count} lần`}
                className={`heatmap-cell flex-1 min-w-[42px] p-2 sm:p-2.5 rounded-xl border flex flex-col items-center justify-between text-center cursor-pointer transition-all hover:scale-105 active:scale-95 select-none ${color} ${
                  day.isToday ? 'ring-2 ring-amber-400 font-bold' : ''
                } ${selectedDay?.dateStr === day.dateStr ? 'ring-2 ring-amber-400 scale-105' : ''}`}
              >
                <span className="text-[10px] font-semibold uppercase">{dayLabels[day.dayOfWeek]}</span>
                <span className="text-sm sm:text-base font-black my-1">{day.date.getDate()}</span>
                <span className="text-[10px] font-bold">{day.count > 0 ? (day.count > 1 ? `✓ ×${day.count}` : '✓') : day.isFuture ? '—' : '✕'}</span>
              </button>
            );
          })}
        </div>
      )}

      {showDaySummary && (
        <div className="tracker-card-day-status mt-2.5 pt-2 border-t border-slate-100/80 dark:border-slate-800/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="day-icon text-xs shrink-0">{selectedSummary?.icon || '💡'}</span>
            <span className="day-text truncate">
              {selectedDay && selectedSummary
                ? `${dayLabels[selectedDay.dayOfWeek]}, ${formatDate(selectedDay.date)}${selectedDay.isToday ? ' (Hôm nay)' : ''}: ${selectedSummary.status}`
                : 'Rê chuột hoặc bấm vào ô ngày để xem chi tiết'}
            </span>
          </div>
          {selectedSummary && (
            <span className={`day-count-badge px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0 ${selectedSummary.badgeClass}`}>
              {selectedSummary.badge}
            </span>
          )}
        </div>
      )}
    </>
  );
}

export function Tracker() {
  const { activeTab, state } = useLevelUp();
  const [period, setPeriod] = useState<TrackerPeriod>('monthly');
  const [category, setCategory] = useState<TrackerCategory>('quests');

  const items = useMemo<TrackerItem[]>(() => {
    const list: TrackerItem[] = category === 'quests'
      ? state.quests.map(item => ({ item, isQuest: true }))
      : state.shopItems.map(item => ({ item, isQuest: false }));
    return list.sort((a, b) => {
      const valueA = a.isQuest ? (a.item as Quest).rewardCoins : (a.item as ShopItem).price;
      const valueB = b.isQuest ? (b.item as Quest).rewardCoins : (b.item as ShopItem).price;
      return (Number(valueB) || 0) - (Number(valueA) || 0);
    });
  }, [
    category,
    state.quests,
    state.shopItems,
    state.ledger,
    state.proofPhotos,
    state.inventory,
    state.completedQuestIds,
  ]);

  const openFrequencyModal = (item: Quest | ShopItem, isQuest: boolean) => {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent('levelup:open-frequency-detail', {
        detail: { item, isQuest },
      }));
    });
  };

  const isVisible = activeTab === 'tracker';

  return (
    <section id="tab-tracker" className={`tab-pane ${isVisible ? 'block' : 'hidden'}`}>
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">☀️</span>
            <h2 className="font-rpg-title font-black text-xl sm:text-2xl tracking-wide bg-gradient-to-r from-amber-500 via-rose-400 to-amber-300 bg-clip-text text-transparent">HABIT TRACKER</h2>
            <span className="text-xl">🌙</span>
            <span className="px-2.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 text-[11px] font-mono font-black">
              {new Date().getFullYear()}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Biểu đồ ma trận tần suất hoàn thành nhiệm vụ &amp; đổi quà của bạn.</p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shrink-0 self-start sm:self-auto">
          {PERIODS.map(option => (
            <button
              key={option.id}
              type="button"
              aria-pressed={period === option.id}
              onClick={() => setPeriod(option.id)}
              className={`tracker-period-btn px-3 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                period === option.id
                  ? 'font-bold bg-amber-500 text-slate-950 shadow-xs shadow-amber-500/20'
                  : 'font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <button
            type="button"
            aria-pressed={category === 'quests'}
            onClick={() => setCategory('quests')}
            className={`tracker-cat-btn px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
              category === 'quests'
                ? 'font-bold bg-emerald-500 text-slate-950 shadow-xs'
                : 'font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
            }`}
          >
            📜 Nhiệm Vụ
          </button>
          <button
            type="button"
            aria-pressed={category === 'rewards'}
            onClick={() => setCategory('rewards')}
            className={`tracker-cat-btn px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
              category === 'rewards'
                ? 'font-bold bg-purple-500 text-white shadow-xs'
                : 'font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
            }`}
          >
            🎁 Phần Thưởng
          </button>
        </div>
        <div className="text-[11px] text-slate-400 font-mono hidden sm:block">💡 Sắp xếp: Nhiều Vàng nhất ➔ Ít Vàng nhất</div>
      </div>

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map(({ item, isQuest }) => {
            const itemWithHistory = {
              ...item,
              history: buildTrackerHistory(item, isQuest, state),
            };
            const title = isQuest ? (item as Quest).title : (item as ShopItem).name;
            const coins = isQuest ? (item as Quest).rewardCoins : (item as ShopItem).price;
            const rank = isQuest ? `HẠNG ${(item as Quest).rank}` : (item as ShopItem).tier.toUpperCase();
            const grid = getFrequencyGridData(itemWithHistory.history, period);
            return (
              <article key={item.id} className="rpg-card rpg-panel rounded-2xl p-4 sm:p-5 transition-all hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl sm:text-2xl shrink-0">{item.icon || (isQuest ? '📜' : '🎁')}</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">{title}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded font-semibold ${
                          isQuest ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                        }`}>{isQuest ? 'Nhiệm vụ' : 'Phần thưởng'}</span>
                        <span className="font-mono text-slate-400">{rank}</span>
                        <span className={`font-mono font-bold inline-flex items-center gap-0.5 ${
                          isQuest ? 'text-amber-600 dark:text-amber-400' : 'text-purple-600 dark:text-purple-400'
                        }`}>
                          <img src="/coin.svg" alt="" className="w-3.5 h-3.5" />
                          {isQuest ? '+' : ''}{coins} Vàng
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    <div className={`flex items-center gap-1 text-xs font-mono font-bold ${
                      isQuest ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'
                    }`} title="Tỷ lệ hoàn thành trong kỳ">
                      <span aria-hidden="true">◷</span>
                      <span>{grid.percentage.toFixed(2).replace('.', ',')}%</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-600 dark:text-amber-400" title="Tổng số ngày đã thực hiện">
                      <span aria-hidden="true">▦</span>
                      <span>{grid.activeDaysCount}d</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openFrequencyModal(itemWithHistory, isQuest)}
                      className="tracker-open-detail-btn p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Xem chi tiết biểu đồ"
                      aria-label={`Xem chi tiết tần suất: ${title}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <Heatmap item={itemWithHistory} isQuest={isQuest} period={period} />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 px-4">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-500/10 flex items-center justify-center text-3xl">📊</div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">Chưa Có Dữ Liệu Hoạt Động!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Hãy bắt đầu hoàn thành các nhiệm vụ hoặc đổi phần thưởng để thắp sáng biểu đồ tần suất nhé.</p>
        </div>
      )}
    </section>
  );
}
