'use client';

import React, { useState, useEffect } from 'react';
import { useLevelUp } from '@/hooks/useLevelUp';
import { ShopList } from './ShopList';
import { InventoryList } from './InventoryList';
import { Icon } from '@/components/ui/Icon';

export function ShopContainer() {
  const { state, optimisticInventory } = useLevelUp();
  const [subtab, setSubtab] = useState<'shop' | 'inventory'>('shop');

  const shopCount = state.shopItems.length;
  const inventoryCount = optimisticInventory.length;

  // Listen to legacy switchRewardSubtab calls or custom events
  useEffect(() => {
    const handleSwitchSubtab = (e: Event) => {
      const customEvent = e as CustomEvent<{ subtab: 'shop' | 'inventory' }>;
      if (customEvent.detail?.subtab) {
        setSubtab(customEvent.detail.subtab);
      }
    };

    window.addEventListener('levelup:switch-reward-subtab', handleSwitchSubtab);
    return () => {
      window.removeEventListener('levelup:switch-reward-subtab', handleSwitchSubtab);
    };
  }, []);

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
      {/* Subtabs and Action Ribbon (Exact match to stable Vercel design) */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 mb-4 sm:mb-6 min-w-0">
        {/* Subtabs Pill Switcher */}
        <div
          className="flex items-center gap-0.5 sm:gap-1 p-1 bg-white dark:bg-slate-900/80 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs shrink-0 h-10 sm:h-10.5"
          role="group"
          aria-label="Bộ lọc phần thưởng"
        >
          <button
            id="subtab-btn-shop"
            type="button"
            onClick={() => setSubtab('shop')}
            className={`reward-subtab flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 h-8 sm:h-8.5 rounded-lg text-xs transition cursor-pointer select-none ${
              subtab === 'shop'
                ? 'active font-bold bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Icon name="storefront" className="text-base leading-none" />
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <span>Cửa Hàng</span>
              <span
                id="badge-shop-count"
                className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 font-mono"
              >
                {shopCount}
              </span>
            </span>
          </button>

          <button
            id="subtab-btn-inventory"
            type="button"
            onClick={() => setSubtab('inventory')}
            className={`reward-subtab flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 h-8 sm:h-8.5 rounded-lg text-xs transition cursor-pointer select-none ${
              subtab === 'inventory'
                ? 'active font-bold bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Icon name="inventory_2" className="text-base leading-none" />
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <span>Túi Đồ</span>
              <span
                id="badge-inventory-count"
                className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
              >
                {inventoryCount}
              </span>
            </span>
          </button>
        </div>

        {/* Action Button: Thêm Quà */}
        <button
          id="btn-open-add-reward-nav"
          type="button"
          onClick={handleOpenAddModal}
          className="btn-action-reward inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 h-10 sm:h-10.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm hover:shadow-md shrink-0 cursor-pointer select-none touch-manipulation whitespace-nowrap active:scale-95"
          title="Tạo phần thưởng mới (Phím tắt: R)"
        >
          <Icon name="add" className="text-base sm:text-lg leading-none font-bold" />
          <span className="hidden sm:inline">Thêm Quà</span>
          <span className="sm:hidden">Thêm quà</span>
          <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/20 dark:bg-white/25 text-white rounded border border-white/20 shadow-2xs">
            R
          </kbd>
        </button>
      </div>

      {/* Subtab Pane 1: Shop */}
      <div id="subtab-pane-shop" className={subtab === 'shop' ? 'block' : 'hidden'}>
        <ShopList />
      </div>

      {/* Subtab Pane 2: Inventory */}
      <div id="subtab-pane-inventory" className={subtab === 'inventory' ? 'block' : 'hidden'}>
        <InventoryList onSwitchToShop={() => setSubtab('shop')} />
      </div>
    </div>
  );
}
