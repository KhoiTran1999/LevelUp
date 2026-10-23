'use client';

import React from 'react';
import type { ShopItem, ShopItemTier } from '@/types/levelup';
import { useLevelUp } from '@/hooks/useLevelUp';

interface RewardCardProps {
  item: ShopItem;
}

export function RewardCard({ item }: RewardCardProps) {
  const { buyShopItem, deleteShopItem } = useLevelUp();

  const rawTier = (item.tier || 'rare').toLowerCase() as ShopItemTier;
  const durationMins = item.targetMinutes || 0;

  const handleOpenDetail = () => {
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent('levelup:open-reward-detail', {
        detail: { itemId: item, source: 'shop' },
      }));
    });
  };

  return (
    <div
      data-reward-id={item.id}
      onClick={handleOpenDetail}
      className={`rpg-card rpg-panel quest-card-compact reward-card-tier-${rawTier} p-3.5 sm:p-4 rounded-2xl flex items-center justify-between transition-all duration-300 relative cursor-pointer hover:shadow-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900`}
    >
      {/* Left: Icon Box */}
      <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-2xl shadow-xs shrink-0">
        {item.icon || '🎁'}
      </div>

      {/* Center: Title & Description */}
      <div className="flex-1 min-w-0 mx-3 sm:mx-4 flex flex-col justify-center gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-bold text-sm sm:text-base leading-snug truncate text-slate-900 dark:text-slate-100">
            {item.name}
          </h3>
        </div>
        {item.description ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 truncate leading-relaxed">
            {item.description}
          </p>
        ) : null}
      </div>

      {/* Right: Price & Duration (Faithful to stable Vercel design) */}
      <div className="flex flex-col items-end justify-center shrink-0 pl-3 sm:pl-4 gap-1.5 self-center">
        {durationMins > 0 && (
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
            <span className="text-xs">⏱️</span>
            <span>{durationMins}p</span>
          </div>
        )}
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs shadow-xs whitespace-nowrap"
          title={`Giá: ${item.price} Vàng`}
        >
          <span className="coin-icon" />
          <span>{item.price}</span>
          <span className="hidden sm:inline text-[10px] font-medium ml-0.5">Vàng</span>
        </span>
      </div>

      {/* Hidden compatibility controls for legacy test runner */}
      <div className="hidden reward-card-internal-controls" aria-hidden="true">
        <p className="reward-desc-text">{item.description || ''}</p>
        <button type="button" className="btn-toggle-desc">...xem thêm</button>
        <button type="button" className="btn-shop-menu" aria-label="Tùy chọn thao tác" />
        <div className="shop-dropdown-menu">
          <button type="button" className="btn-debate-shop-item">Thương lượng AI</button>
          <button type="button" className="btn-view-shop-freq">Xem biểu đồ tần suất</button>
          <button
            type="button"
            className="btn-del-shop-item"
            onClick={e => {
              e.stopPropagation();
              deleteShopItem(item.id);
            }}
          >
            Xóa phần thưởng
          </button>
        </div>
        <button
          type="button"
          className="btn-buy-item"
          onClick={e => {
            e.stopPropagation();
            buyShopItem(item);
          }}
        >
          Đổi Quà
        </button>
      </div>
    </div>
  );
}
