'use client';

import React from 'react';
import { useLevelUp } from '@/hooks/useLevelUp';
import { Icon } from '@/components/ui/Icon';
import type { TabType } from '@/types/levelup';

export function MobileBottomNav() {
  const { state, optimisticProfile, activeTab, setActiveTab } = useLevelUp();

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    closeMoreMenu();
  };

  const openMoreMenu = () => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as { openMobileMoreMenu?: () => void };
      if (typeof win.openMobileMoreMenu === 'function') {
        win.openMobileMoreMenu();
      } else {
        document.getElementById('mobile-more-menu')?.classList.remove('hidden');
        document.getElementById('mobile-more-backdrop')?.classList.remove('hidden');
      }
    }
  };

  const closeMoreMenu = () => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as { closeMobileMoreMenu?: () => void };
      if (typeof win.closeMobileMoreMenu === 'function') {
        win.closeMobileMoreMenu();
      } else {
        document.getElementById('mobile-more-menu')?.classList.add('hidden');
        document.getElementById('mobile-more-backdrop')?.classList.add('hidden');
      }
    }
  };

  const handleMobileMore = () => {
    if (typeof window !== 'undefined') {
      const moreMenu = document.getElementById('mobile-more-menu');
      if (moreMenu?.classList.contains('hidden')) {
        openMoreMenu();
      } else {
        closeMoreMenu();
      }
    }
  };

  const handleAboutClick = () => {
    closeMoreMenu();
    if (typeof window !== 'undefined') {
      const win = window as unknown as { openAboutModal?: () => void };
      win.openAboutModal?.();
    }
  };

  const isAdmin = (optimisticProfile || state.profile)?.role === 'admin';

  return (
    <>
      {/* Full-viewport Backdrop overlay for Mobile More Menu */}
      <div
        id="mobile-more-backdrop"
        onClick={closeMoreMenu}
        className="hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200 cursor-pointer"
      />

      {/* Mobile More Menu as Modern M3 Bottom Sheet */}
      <div
        id="mobile-more-menu"
        className="hidden fixed inset-x-0 bottom-0 z-50 w-full max-w-lg mx-auto bg-white/98 dark:bg-slate-900/98 rounded-t-3xl border-t border-slate-200/90 dark:border-slate-800 shadow-2xl p-3 pb-8 safe-area-bottom backdrop-blur-2xl"
      >
        <div className="m3-drag-handle" />
        <div className="flex items-center justify-between px-2 pb-1 mb-1 border-b border-slate-100 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Tính năng khác</span>
          <button
            type="button"
            onClick={closeMoreMenu}
            className="text-slate-400 p-0.5 cursor-pointer"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <button
          data-tab="tracker"
          type="button"
          onClick={() => handleTabClick('tracker')}
          className="mobile-nav-btn mobile-more-item group flex items-center justify-between gap-3 w-full px-3 py-2 sm:py-2.5 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px] leading-none">insights</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Tần Suất Thói Quen</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">Biểu đồ heatmap &amp; chuỗi</div>
            </div>
          </div>
          <span className="material-symbols-outlined text-base text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0">chevron_right</span>
        </button>

        <button
          data-tab="leaderboard"
          type="button"
          onClick={() => handleTabClick('leaderboard')}
          className="mobile-nav-btn mobile-more-item group flex items-center justify-between gap-3 w-full px-3 py-2 sm:py-2.5 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px] leading-none">leaderboard</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Bảng Xếp Hạng</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">Cộng đồng &amp; thứ hạng LevelUp</div>
            </div>
          </div>
          <span className="material-symbols-outlined text-base text-amber-300 dark:text-amber-600 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0">chevron_right</span>
        </button>

        <button
          data-tab="ledger"
          type="button"
          onClick={() => handleTabClick('ledger')}
          className="mobile-nav-btn mobile-more-item group flex items-center justify-between gap-3 w-full px-3 py-2 sm:py-2.5 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px] leading-none">receipt_long</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Sổ Giao Dịch &amp; Ảnh Bằng Chứng</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">Biến động vàng &amp; album minh chứng</div>
            </div>
          </div>
          <span className="material-symbols-outlined text-base text-emerald-300 dark:text-emerald-600 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0">chevron_right</span>
        </button>

        <button
          data-tab="bank"
          type="button"
          onClick={() => handleTabClick('bank')}
          className="mobile-nav-btn mobile-more-item group flex items-center justify-between gap-3 w-full px-3 py-2 sm:py-2.5 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px] leading-none">account_balance</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Ngân Hàng RPG</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">Gửi tiết kiệm lãi suất &amp; vay khẩn cấp</div>
            </div>
          </div>
          <span className="material-symbols-outlined text-base text-sky-300 dark:text-sky-600 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all shrink-0">chevron_right</span>
        </button>

        {isAdmin && (
          <button
            id="mobile-nav-admin"
            data-tab="admin"
            type="button"
            onClick={() => handleTabClick('admin')}
            className="mobile-nav-btn mobile-more-item group flex items-center justify-between gap-3 w-full px-3 py-2 sm:py-2.5 rounded-2xl text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[20px] leading-none">admin_panel_settings</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-purple-700 dark:text-purple-300 truncate">Quản Trị Hệ Thống</div>
                <div className="text-[10px] text-purple-400/80 truncate font-normal">Cấu hình &amp; kiểm soát dữ liệu</div>
              </div>
            </div>
            <span className="material-symbols-outlined text-base text-purple-300 dark:text-purple-600 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0">chevron_right</span>
          </button>
        )}

        <button
          id="btn-mobile-about"
          type="button"
          onClick={handleAboutClick}
          className="mobile-nav-btn mobile-more-item group flex items-center justify-between gap-3 w-full px-3 py-2 sm:py-2.5 rounded-2xl text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-all text-left cursor-pointer border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-0.5"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px] leading-none">auto_stories</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-violet-700 dark:text-violet-300 truncate">Giới Thiệu Dự Án</div>
              <div className="text-[10px] text-violet-400/80 truncate font-normal">LevelUp RPG • v1.0.4</div>
            </div>
          </div>
          <span className="material-symbols-outlined text-base text-violet-300 dark:text-violet-500 group-hover:translate-x-0.5 transition-all shrink-0">chevron_right</span>
        </button>
      </div>

      <nav className="md:hidden m3-navigation-bar fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-800/80 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)] transition-colors safe-area-bottom select-none">
        <div className="flex items-center justify-around max-w-md mx-auto px-2 pt-2">
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
              className={`m3-nav-label text-[10px] sm:text-[11px] font-bold tracking-tight whitespace-nowrap mt-1 transition-colors ${
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
              className={`m3-nav-label text-[10px] sm:text-[11px] font-medium tracking-tight whitespace-nowrap mt-1 transition-colors ${
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
              className={`m3-nav-label text-[10px] sm:text-[11px] font-medium tracking-tight whitespace-nowrap mt-1 transition-colors ${
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
            <span className="m3-nav-label text-[10px] sm:text-[11px] font-medium tracking-tight whitespace-nowrap mt-1 transition-colors text-slate-600 dark:text-slate-400">
              Xem Thêm
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
