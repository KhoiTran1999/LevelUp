'use client';

import React, { useMemo } from 'react';
import type { ShopItem } from '@/types/levelup';
import { useLevelUp } from '@/hooks/useLevelUp';
import { RewardCard } from './RewardCard';

export function ShopList() {
  const { state } = useLevelUp();

  const tierScores: Record<string, number> = {
    legendary: 4,
    epic: 3,
    rare: 2,
    common: 1,
  };

  const sortedItems = useMemo(() => {
    // ponytail: Deduplicate shop items by ID to guarantee unique React keys. Upgrade path: DB PK constraint.
    const seenIds = new Set<string>();
    const uniqueItems: ShopItem[] = [];
    for (const item of state.shopItems) {
      if (item && item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueItems.push(item);
      }
    }

    return uniqueItems.sort((a, b) => {
      const scoreA = tierScores[(a.tier || 'rare').toLowerCase()] ?? 1;
      const scoreB = tierScores[(b.tier || 'rare').toLowerCase()] ?? 1;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (b.price || 0) - (a.price || 0);
    });
  }, [state.shopItems]);

  const handleOpenAddModal = () => {
    if (
      typeof window !== 'undefined' &&
      typeof (window as unknown as { openRewardModal?: () => void }).openRewardModal === 'function'
    ) {
      (window as unknown as { openRewardModal: () => void }).openRewardModal();
    } else {
      const btn = document.getElementById('btn-open-add-reward-nav');
      if (btn) btn.click();
    }
  };

  return (
    <div className="w-full">
      {/* Shop Grid */}
      {sortedItems.length > 0 ? (
        <div
          id="shop-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5"
        >
          {sortedItems.map(item => (
            <RewardCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="col-span-full text-center py-12 sm:py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-3xl shadow-xs">
            🏪
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            Cửa Hàng Chưa Bày Bán Phần Thưởng Nào!
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            Hãy tạo những phần thưởng bạn yêu thích (ly cà phê, xem phim, mua sách...) và để AI định giá Vàng hợp lý nhé.
          </p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="btn-action-reward flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md bg-purple-600 hover:bg-purple-500 text-white cursor-pointer active:scale-95"
            >
              <span className="text-sm">🎁</span>
              <span>+ Thêm Phần Thưởng Ngay</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
