'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { InventoryItem, Quest, ShopItem } from '@/types/levelup';
import { useLevelUp } from '@/hooks/useLevelUp';

type RewardSource = 'shop' | 'inventory';
type RewardItem = ShopItem | InventoryItem;

interface RewardDetailTarget {
  id: string;
  source: RewardSource;
  fallback?: RewardItem;
}

interface RewardDetailWindow extends Window {
  openRewardDetailModal?: (itemId: string | RewardItem, source: RewardSource) => void;
  buyShopItem?: (itemId: string) => void | Promise<void>;
  useInventoryItem?: (itemId: string) => void | Promise<void>;
  refundInventoryItem?: (itemId: string) => void | Promise<void>;
  undoUseInventoryItem?: (itemId: string) => void | Promise<void>;
  clearSavedRewardTimer?: (itemId: string) => void | Promise<void>;
  deleteShopItem?: (itemId: string) => void | Promise<void>;
  deleteInventoryItem?: (itemId: string) => void | Promise<void>;
  openRewardRenegotiateModal?: (itemId: string) => void;
  openItemFrequencyModal?: (item: Quest | ShopItem, isQuest: boolean) => void;
  extractRewardDuration?: (item: RewardItem) => number;
  initBottomSheetGestures?: () => void;
  dismissModalWithSlideDown?: (modal: HTMLElement) => void;
  sfx?: { playClick?: () => void };
  showToast?: (message: string, type: string) => void;
}

interface RewardDetailSheet extends HTMLElement {
  _reactOnDismiss?: () => void;
}

function isInventoryItem(item: RewardItem): item is InventoryItem {
  return 'isUsed' in item;
}

function getRewardDuration(item: RewardItem, win?: RewardDetailWindow): number {
  if (win?.extractRewardDuration) return win.extractRewardDuration(item);
  if (win) console.error('[RewardDetailModal] Reward duration runtime is unavailable.');
  return Math.max(0, Number(item.targetMinutes) || 0);
}

function invokeLegacy(
  name: keyof RewardDetailWindow,
  itemId: string,
  onMissing: () => void,
) {
  const fn = (window as RewardDetailWindow)[name];
  if (typeof fn !== 'function') {
    console.error(`[RewardDetailModal] Missing legacy action: ${String(name)}`);
    onMissing();
    return;
  }
  (fn as (id: string) => void | Promise<void>)(itemId);
}

export function RewardDetailModal() {
  const { state, openRewardRenegotiateModal } = useLevelUp();
  const stateRef = useRef(state);
  stateRef.current = state;
  const [target, setTarget] = useState<RewardDetailTarget | null>(null);
  const [now, setNow] = useState(Date.now());
  const isShop = target?.source === 'shop';
  const item = useMemo(() => {
    if (!target) return null;
    const currentItem = target.source === 'shop'
      ? state.shopItems.find(reward => reward.id === target.id)
      : state.inventory.find(reward => reward.id === target.id);
    return currentItem || target.fallback || null;
  }, [state.inventory, state.shopItems, target]);
  const inventoryItem = item && isInventoryItem(item) ? item : null;
  const activeTimer = state.activeTimer;
  const isActiveReward = Boolean(
    inventoryItem && activeTimer?.isReward && activeTimer.rewardId === inventoryItem.id,
  );
  const hasSavedTimer = Boolean(
    inventoryItem?.savedTimer && inventoryItem.savedTimer.remainingSeconds > 0,
  );
  const canUndo = Boolean(
    inventoryItem && (
      isActiveReward
      || (inventoryItem.isUsed && inventoryItem.usedAt && now - inventoryItem.usedAt <= 5 * 60 * 1000)
    ),
  );
  const coinsNeeded = isShop && item ? Math.max(0, item.price - state.profile.coins) : 0;
  const canAfford = isShop && item ? state.profile.coins >= item.price : false;
  const durationMinutes = item
    ? getRewardDuration(item, typeof window === 'undefined' ? undefined : window as RewardDetailWindow)
    : 0;

  useEffect(() => {
    const showReward = (value: string | RewardItem, source: RewardSource) => {
      const id = typeof value === 'string' ? value : value?.id;
      if (!id || (source !== 'shop' && source !== 'inventory')) {
        console.error('[RewardDetailModal] Invalid reward supplied to detail dialog.');
        return;
      }
      const currentState = stateRef.current;
      const list = source === 'shop' ? currentState.shopItems : currentState.inventory;
      const found = list.find(reward => reward.id === id);
      const fallback = typeof value === 'string' ? undefined : value;
      if (!found && !fallback) {
        console.error(`[RewardDetailModal] Reward not found: ${id}`);
        return;
      }
      if (fallback && (source === 'inventory') !== isInventoryItem(fallback)) {
        console.error(`[RewardDetailModal] Reward source mismatch: ${id}`);
        return;
      }
      setTarget({ id, source, fallback });
      setNow(Date.now());
    };
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ itemId: string | RewardItem; source: RewardSource }>).detail;
      if (!detail) {
        console.error('[RewardDetailModal] Missing reward detail event data.');
        return;
      }
      showReward(detail.itemId, detail.source);
    };
    window.addEventListener('levelup:open-reward-detail', handleOpen);
    return () => {
      window.removeEventListener('levelup:open-reward-detail', handleOpen);
    };
  }, []);

  useEffect(() => {
    if (!target) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const modal = document.getElementById('modal-reward-detail') as RewardDetailSheet | null;
    if (!modal) return;
    const handleDismiss = () => setTarget(null);
    modal._reactOnDismiss = handleDismiss;
    const win = window as RewardDetailWindow;
    if (win.initBottomSheetGestures) win.initBottomSheetGestures();
    else console.error('[RewardDetailModal] Bottom-sheet gesture runtime is unavailable.');
    return () => {
      if (modal._reactOnDismiss === handleDismiss) delete modal._reactOnDismiss;
    };
  }, [target]);

  const close = (animate = false) => {
    const finishClose = () => setTarget(null);
    const win = window as RewardDetailWindow;
    win.sfx?.playClick?.();
    const modal = document.getElementById('modal-reward-detail') as RewardDetailSheet | null;
    if (animate && modal && win.dismissModalWithSlideDown) {
      modal._reactOnDismiss = finishClose;
      win.dismissModalWithSlideDown(modal);
    } else {
      if (animate && modal) console.error('[RewardDetailModal] Bottom-sheet close animation is unavailable.');
      finishClose();
    }
  };

  const runAction = (name: keyof RewardDetailWindow) => {
    if (!item) return;
    const win = window as RewardDetailWindow;
    close();
    invokeLegacy(name, item.id, () => {
      win.showToast?.('Không thể thực hiện thao tác này.', 'error');
    });
  };

  const openFrequency = () => {
    if (!item) return;
    close();
    const win = window as RewardDetailWindow;
    const open = win.openItemFrequencyModal;
    if (!open) {
      console.error('[RewardDetailModal] Missing legacy action: openItemFrequencyModal');
      win.showToast?.('Không thể mở lịch sử phần thưởng.', 'error');
      return;
    }
    const frequencyItem: ShopItem = isInventoryItem(item)
      ? {
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.price,
        tier: item.tier,
        icon: item.icon,
        targetMinutes: item.targetMinutes || durationMinutes,
      }
      : item;
    open(frequencyItem, false);
  };

  const openDebate = () => {
    if (!item) return;
    close();
    if (openRewardRenegotiateModal) {
      openRewardRenegotiateModal(item.id);
      return;
    }
    const win = window as RewardDetailWindow;
    const open = win.openRewardRenegotiateModal;
    if (!open) {
      console.error('[RewardDetailModal] Missing legacy action: openRewardRenegotiateModal');
      win.showToast?.('Không thể mở thương lượng phần thưởng.', 'error');
      return;
    }
    open(item.id);
  };

  if (!target || !item) return null;

  const isInventory = target.source === 'inventory' && inventoryItem !== null;
  const activeTimerRunning = activeTimer?.status === 'running';
  const description = item.description || 'Không có mô tả chi tiết.';

  return (
    <div
      id="modal-reward-detail"
      className="m3-modal-sheet fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mrd-title"
      data-sheet-dismiss="true"
      onClick={event => {
        if (event.target === event.currentTarget) close(true);
      }}
    >
      <section className="rpg-panel m3-dialog-panel flex max-h-[92vh] w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:max-w-lg">
        <div className="m3-drag-handle sm:hidden" role="button" aria-label="Kéo xuống để đóng" />
        <header className="relative flex shrink-0 items-center justify-between gap-3.5 border-b border-slate-200 bg-slate-100 p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <div id="mrd-icon" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/50 text-3xl shadow-sm backdrop-blur-md dark:bg-white/20">
              {item.icon || '🎁'}
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="mrd-title" className="break-words text-lg font-bold leading-snug text-slate-900 dark:text-white sm:text-xl">{item.name}</h2>
              <span id="mrd-tier-badge" className="hidden" />
            </div>
          </div>
          <button type="button" className="modal-close flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-200/60 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200" aria-label="Đóng" onClick={() => close(true)}>
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          <div id="mrd-price-strip" className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 dark:bg-amber-400/10">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💰</span>
              <div>
                <div id="mrd-price-label" className="font-mono text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">{isShop ? 'Giá đổi phần thưởng' : 'Trị giá phần thưởng'}</div>
                <div id="mrd-price-value" className="font-mono text-lg font-black text-amber-600 dark:text-amber-300 sm:text-xl">{item.price} Vàng</div>
              </div>
            </div>
            <div id="mrd-affordability" className="text-right">
              {isShop && (
                canAfford
                  ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">✓ Đủ Vàng</span>
                  : <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">Thiếu {coinsNeeded} Vàng</span>
              )}
            </div>
          </div>

          <div id="mrd-desc-box" className="space-y-1 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="font-mono text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Mô tả phần thưởng</div>
            <p id="mrd-desc" className="break-words whitespace-pre-wrap text-xs leading-relaxed text-slate-800 dark:text-slate-200 sm:text-sm">{description}</p>
          </div>

          <div id="mrd-meta-container" className="space-y-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="font-mono text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Thông tin bổ trợ</div>
            <div id="mrd-meta-badges" className="flex flex-wrap items-center gap-1.5">
              {durationMinutes > 0
                ? <span className="inline-flex items-center gap-1 rounded-xl border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">⏱️ {durationMinutes} phút</span>
                : <span className="inline-flex items-center gap-1 rounded-xl border border-slate-300/60 bg-slate-200/70 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">⚡ Dùng ngay</span>}
              {isInventory && inventoryItem && (
                <>
                  {isActiveReward
                    ? <span className="inline-flex animate-pulse items-center gap-1 rounded-xl border border-purple-500/30 bg-purple-500/15 px-2.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-300">▶️ Đang sử dụng</span>
                    : hasSavedTimer
                      ? <span className="inline-flex items-center gap-1 rounded-xl border border-sky-500/30 bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-300">⏸️ Đang bảo lưu: {Math.ceil((inventoryItem.savedTimer?.remainingSeconds || 0) / 60)}p</span>
                      : inventoryItem.isUsed
                        ? <span className="inline-flex items-center gap-1 rounded-xl border border-slate-300/60 bg-slate-200/70 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">✅ {durationMinutes > 0 ? 'Đã kết thúc' : 'Đã sử dụng'}</span>
                        : <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">🎁 Chưa sử dụng</span>}
                  {inventoryItem.purchasedAt && (
                    <span className="inline-flex items-center gap-1 rounded-xl border border-slate-300/60 bg-slate-200/70 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      📅 Đã đổi: {new Date(inventoryItem.purchasedAt).toLocaleDateString()}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <footer className="shrink-0 space-y-2.5 border-t border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
          <div id="mrd-primary-action-container">
            {isShop
              ? <button id="mrd-btn-buy" type="button" disabled={!canAfford} className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold shadow-md transition ${canAfford ? 'cursor-pointer bg-purple-600 text-white hover:bg-purple-500' : 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800'}`} onClick={() => runAction('buyShopItem')}>{canAfford ? (durationMinutes > 0 ? `Đổi & Bấm Giờ (${durationMinutes}p) 🎁` : 'Đổi Quà Ngay 🎁') : `Chưa Đủ Vàng (thiếu ${coinsNeeded})`}</button>
              : isActiveReward
                ? <div className="flex items-center gap-2">
                  <button id="mrd-btn-scroll-timer" type="button" className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-purple-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-purple-500" onClick={() => { close(); document.getElementById('active-focus-banner')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }}>{activeTimerRunning ? '⏱️ Xem Đồng Hồ' : '⏸️ Tạm Dừng'}</button>
                  <button id="mrd-btn-undo" type="button" className="flex cursor-pointer items-center justify-center gap-1 rounded-2xl bg-slate-200 px-3.5 py-3 text-xs font-bold text-slate-800 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" onClick={() => runAction('undoUseInventoryItem')}>Hoàn tác</button>
                </div>
                : hasSavedTimer && inventoryItem
                  ? <div className="flex items-center gap-2">
                    <button id="mrd-btn-resume" type="button" className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-sky-500" onClick={() => runAction('useInventoryItem')}>▶️ Tiếp Tục Dùng ({Math.ceil(inventoryItem.savedTimer!.remainingSeconds / 60)}p)</button>
                    <button id="mrd-btn-end-saved" type="button" className="flex cursor-pointer items-center justify-center gap-1 rounded-2xl border border-rose-500/30 bg-rose-500/15 px-3.5 py-3 text-xs font-bold text-rose-600 transition hover:bg-rose-500/25 dark:text-rose-400" onClick={() => runAction('clearSavedRewardTimer')}>⏹️ Kết thúc</button>
                  </div>
                  : inventoryItem?.isUsed
                    ? canUndo
                      ? <button id="mrd-btn-undo-used" type="button" className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-xs font-bold text-slate-950 shadow-md transition hover:bg-amber-400" onClick={() => runAction('undoUseInventoryItem')}>↩️ Hoàn Tác (Đánh dấu chưa dùng)</button>
                      : <div className="py-2 text-center text-xs font-medium text-slate-400 dark:text-slate-500">✅ {durationMinutes > 0 ? 'Đã kết thúc sử dụng' : 'Đã sử dụng xong'}</div>
                    : <button id="mrd-btn-use" type="button" className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-bold text-slate-950 shadow-md transition hover:bg-emerald-400" onClick={() => runAction('useInventoryItem')}>{durationMinutes > 0 ? `▶️ Dùng Quà & Bấm Giờ (${durationMinutes}p) 🎉` : '▶️ Dùng Quà Ngay 🎉'}</button>}
          </div>

          <div id="mrd-secondary-actions" className="space-y-2 border-t border-slate-200/60 pt-2 dark:border-slate-800/60">
            <div id="mrd-secondary-grid" className="grid grid-cols-2 gap-2 text-center">
              {isShop ? (
                <>
                  <button id="mrd-btn-debate" type="button" className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-500/20 dark:text-amber-400" onClick={openDebate}>💬 Thương lượng</button>
                  <button id="mrd-btn-freq" type="button" className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-400" onClick={openFrequency}>📊 Xem tần suất</button>
                  <button id="mrd-btn-delete" type="button" className="col-span-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400" onClick={() => runAction('deleteShopItem')}>🗑️ Xóa phần thưởng</button>
                </>
              ) : (
                <>
                  {inventoryItem && !inventoryItem.isUsed && !isActiveReward && !hasSavedTimer && (
                    <button id="mrd-btn-refund" type="button" className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-500/20 dark:text-amber-400" onClick={() => runAction('refundInventoryItem')}>↩️ Trả quà lấy Vàng</button>
                  )}
                  <button id="mrd-btn-delete" type="button" className={`${inventoryItem && !inventoryItem.isUsed && !isActiveReward && !hasSavedTimer ? '' : 'col-span-2 '}flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400`} onClick={() => runAction('deleteInventoryItem')}>🗑️ Xóa khỏi kho</button>
                </>
              )}
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}
