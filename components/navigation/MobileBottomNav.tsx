'use client';

import React from 'react';
import { useLevelUp } from '@/hooks/useLevelUp';
import { Icon } from '@/components/ui/Icon';
import type { TabType } from '@/types/levelup';

export function MobileBottomNav() {
  const { activeTab, setActiveTab } = useLevelUp();

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleMobileMore = () => {
    if (typeof window !== 'undefined') {
      const moreMenu = document.getElementById('mobile-more-menu');
      if (moreMenu) {
        moreMenu.classList.toggle('hidden');
      }
    }
  };

  return (
    <nav className="md:hidden m3-navigation-bar fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-800/80 backdrop-blur-lg safe-area-bottom shadow-lg transition-colors">
      <div className="flex items-center justify-around h-[68px] max-w-md mx-auto px-2 pt-1 pb-[env(safe-area-inset-bottom,0px)]">
        {/* Tab Nhiệm Vụ */}
        <button
          data-tab="quests"
          type="button"
          onClick={() => handleTabClick('quests')}
          className={`mobile-nav-btn flex-1 min-w-0 flex flex-col items-center justify-center py-1 group cursor-pointer focus:outline-none transition-all ${
            activeTab === 'quests' ? 'active' : ''
          }`}
        >
          <span
            className={`m3-nav-indicator flex items-center justify-center w-14 sm:w-16 h-8 rounded-full transition-all duration-200 ${
              activeTab === 'quests'
                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Icon
              name="task_alt"
              className="text-2xl leading-none transition-transform duration-200 group-hover:scale-105"
            />
          </span>
          <span
            className={`m3-nav-label text-[10px] sm:text-[11px] font-bold tracking-tight whitespace-nowrap mt-0.5 transition-colors ${
              activeTab === 'quests'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Nhiệm Vụ
          </span>
        </button>

        {/* Tab Phần Thưởng */}
        <button
          data-tab="shop"
          type="button"
          onClick={() => handleTabClick('shop')}
          className={`mobile-nav-btn flex-1 min-w-0 flex flex-col items-center justify-center py-1 group cursor-pointer focus:outline-none transition-all ${
            activeTab === 'shop' ? 'active' : ''
          }`}
        >
          <span
            className={`m3-nav-indicator flex items-center justify-center w-14 sm:w-16 h-8 rounded-full transition-all duration-200 ${
              activeTab === 'shop'
                ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Icon
              name="redeem"
              className="text-2xl leading-none transition-transform duration-200 group-hover:scale-105"
            />
          </span>
          <span
            className={`m3-nav-label text-[10px] sm:text-[11px] font-medium tracking-tight whitespace-nowrap mt-0.5 transition-colors ${
              activeTab === 'shop'
                ? 'text-purple-600 dark:text-purple-400 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Phần Thưởng
          </span>
        </button>

        {/* Tab Ghi Chú */}
        <button
          data-tab="notes"
          type="button"
          onClick={() => handleTabClick('notes')}
          className={`mobile-nav-btn flex-1 min-w-0 flex flex-col items-center justify-center py-1 group cursor-pointer focus:outline-none transition-all ${
            activeTab === 'notes' ? 'active' : ''
          }`}
        >
          <span
            className={`m3-nav-indicator flex items-center justify-center w-14 sm:w-16 h-8 rounded-full transition-all duration-200 ${
              activeTab === 'notes'
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Icon
              name="edit_note"
              className="text-2xl leading-none transition-transform duration-200 group-hover:scale-105"
            />
          </span>
          <span
            className={`m3-nav-label text-[10px] sm:text-[11px] font-medium tracking-tight whitespace-nowrap mt-0.5 transition-colors ${
              activeTab === 'notes'
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Ghi Chú
          </span>
        </button>

        {/* Tab Xem Thêm */}
        <button
          id="btn-mobile-more"
          type="button"
          onClick={handleMobileMore}
          className="mobile-more-btn flex-1 min-w-0 flex flex-col items-center justify-center py-1 group cursor-pointer focus:outline-none transition-all"
        >
          <span className="m3-nav-indicator flex items-center justify-center w-14 sm:w-16 h-8 rounded-full transition-all duration-200 text-slate-600 dark:text-slate-400">
            <Icon
              name="more_horiz"
              className="text-2xl leading-none transition-transform duration-200 group-hover:scale-105"
            />
          </span>
          <span className="m3-nav-label text-[10px] sm:text-[11px] font-medium tracking-tight whitespace-nowrap mt-0.5 transition-colors text-slate-600 dark:text-slate-400">
            Xem Thêm
          </span>
        </button>
      </div>
    </nav>
  );
}
