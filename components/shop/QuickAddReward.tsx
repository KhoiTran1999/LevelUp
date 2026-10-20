'use client';

import React, { useState } from 'react';
import { useLevelUp } from '@/hooks/useLevelUp';
import { Icon } from '@/components/ui/Icon';
import type { ShopItemTier } from '@/types/levelup';

export function QuickAddReward() {
  const { addShopItem } = useLevelUp();
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(30);
  const [targetMinutes, setTargetMinutes] = useState<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let tier: ShopItemTier = 'common';
    if (price >= 100) tier = 'legendary';
    else if (price >= 50) tier = 'epic';
    else if (price >= 25) tier = 'rare';

    addShopItem({
      name: name.trim(),
      price: Math.max(1, price),
      targetMinutes: Math.max(0, targetMinutes),
      tier,
      icon: targetMinutes > 0 ? '⏱️' : '🎁',
      description: targetMinutes > 0 ? `Tự thưởng ${targetMinutes} phút thư giãn.` : 'Phần thưởng tự tạo khích lệ tinh thần.',
    });

    setName('');
    setPrice(30);
    setTargetMinutes(0);
  };

  const handleOpenDetailedModal = () => {
    if (typeof window !== 'undefined' && typeof (window as unknown as { openRewardModal?: () => void }).openRewardModal === 'function') {
      (window as unknown as { openRewardModal: () => void }).openRewardModal();
    } else {
      const btn = document.getElementById('btn-open-add-reward-nav');
      if (btn) btn.click();
    }
  };

  return (
    <div className="mb-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xs">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Gõ nhanh phần thưởng mới... (VD: 1 Cốc trà sữa, Xem 1 tập phim)"
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
          <Icon
            name="card_giftcard"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-500 text-lg"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          <div className="flex items-center gap-1 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 px-2.5 py-1.5 rounded-xl">
            <span className="coin-icon text-xs" />
            <input
              type="number"
              min={1}
              max={9999}
              value={price}
              onChange={e => setPrice(Number(e.target.value))}
              className="w-12 bg-transparent text-xs font-mono font-bold text-amber-700 dark:text-amber-300 focus:outline-none"
              title="Giá Vàng"
            />
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">Vàng</span>
          </div>

          <select
            value={targetMinutes}
            onChange={e => setTargetMinutes(Number(e.target.value))}
            className="px-2 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-mono font-bold text-purple-600 dark:text-purple-400 focus:outline-none cursor-pointer"
            title="Thời gian tự thưởng"
          >
            <option value={0}>Không hẹn giờ</option>
            <option value={15}>15 phút</option>
            <option value={30}>30 phút</option>
            <option value={60}>60 phút</option>
            <option value={120}>120 phút</option>
          </select>

          <button
            type="submit"
            disabled={!name.trim()}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
            title="Thêm nhanh phần thưởng"
          >
            <Icon name="add" className="text-base" />
            <span className="hidden sm:inline">Thêm</span>
          </button>

          <button
            type="button"
            onClick={handleOpenDetailedModal}
            className="px-2.5 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer active:scale-95"
            title="Mở bảng thẩm định AI Arbiter (Phím tắt R)"
          >
            <span>🤖</span>
            <span className="hidden md:inline">AI Định Giá</span>
          </button>
        </div>
      </form>
    </div>
  );
}
