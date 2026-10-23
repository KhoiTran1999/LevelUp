'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLevelUp } from '@/hooks/useLevelUp';
import { Icon } from '@/components/ui/Icon';
import type { TabType } from '@/types/levelup';

export function TabNavigation() {
  const { activeTab, setActiveTab, state } = useLevelUp();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const activeQuestsCount = state.quests.filter(q => q.status === 'active').length;
  const shopCount = state.shopItems.length;
  const notesCount = state.notes.length || 1;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    setIsMoreOpen(false);
  };

  const isRoleAdmin = state.profile.role === 'admin';

  return (
    <nav className="hidden md:block relative z-30 max-w-6xl mx-auto px-3 sm:px-4 mt-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 gap-1.5 xl:gap-2">
        <div className="flex items-center gap-1 sm:gap-1.5 xl:gap-2 min-w-0">
          {/* Logo & Brand */}
          <a
            href="/quests"
            className="hidden lg:flex items-center gap-2 mr-0.5 sm:mr-1 pr-1.5 sm:pr-2.5 border-r border-slate-200 dark:border-slate-800 shrink-0 select-none cursor-pointer"
            onClick={(e) => { e.preventDefault(); handleTabClick('quests'); }}
            title="LevelUp"
          >
            <img src="/logo.svg" alt="LevelUp Logo" className="w-7 h-7 rounded-lg shadow-sm" />
            <span className="font-rpg-title font-black text-sm tracking-wider bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent hidden xl:inline">
              LEVELUP
            </span>
          </a>

          {/* Main Tab 1: Quests */}
          <a
            href="/quests"
            data-tab="quests"
            role="tab"
            onClick={(e) => { e.preventDefault(); handleTabClick('quests'); }}
            className={`nav-tab flex items-center gap-1 sm:gap-1.5 px-2 md:px-2.5 xl:px-3 py-1.5 rounded-xl font-bold text-xs transition shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'quests'
                ? 'active bg-indigo-500/15 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-500/40 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Icon name="task_alt" className="text-[18px] leading-none shrink-0" />
            <span>Nhiệm Vụ</span>
            <span
              id="badge-active-quests"
              className="text-[11px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono"
            >
              {activeQuestsCount}
            </span>
          </a>

          {/* Main Tab 2: Shop / Rewards */}
          <a
            href="/shop"
            data-tab="shop"
            role="tab"
            onClick={(e) => { e.preventDefault(); handleTabClick('shop'); }}
            className={`nav-tab flex items-center gap-1 sm:gap-1.5 px-2 md:px-2.5 xl:px-3 py-1.5 rounded-xl font-semibold text-xs transition shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'shop'
                ? 'active bg-purple-500/15 dark:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/40 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Icon name="redeem" className="text-[18px] leading-none shrink-0" />
            <span className="hidden lg:inline">Phần Thưởng</span>
            <span className="lg:hidden">Thưởng</span>
            <span
              id="badge-rewards-total"
              className="text-[11px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 font-mono"
            >
              {shopCount}
            </span>
          </a>

          {/* Main Tab 3: Notes / Brain Dump */}
          <a
            href="/notes"
            data-tab="notes"
            role="tab"
            onClick={(e) => { e.preventDefault(); handleTabClick('notes'); }}
            className={`nav-tab flex items-center gap-1 sm:gap-1.5 px-2 md:px-2.5 xl:px-3 py-1.5 rounded-xl font-semibold text-xs transition shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'notes'
                ? 'active bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent'
            }`}
            title="Sổ ghi chú"
          >
            <Icon name="edit_note" className="text-[18px] leading-none shrink-0 text-amber-500" />
            <span className="hidden sm:inline">Sổ Ghi Chú</span>
            <span className="sm:hidden">Ghi Chú</span>
            <span
              id="badge-notes-count"
              className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono"
            >
              {notesCount}
            </span>
          </a>

          {/* Dropdown Xem Thêm */}
          <div className="relative inline-block text-left" id="nav-more-dropdown-container" ref={moreRef}>
            <button
              id="btn-nav-more"
              type="button"
              onClick={() => setIsMoreOpen(prev => !prev)}
              className="nav-more-toggle flex items-center gap-1 px-2 md:px-2.5 xl:px-3 py-1.5 rounded-xl font-semibold text-xs transition text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Icon name="more_horiz" className="text-[18px] leading-none shrink-0" />
              <span>Xem Thêm</span>
              <Icon name="expand_more" className="text-[16px] leading-none text-slate-400" />
            </button>

            <div
              id="nav-more-menu"
              className={`${
                isMoreOpen ? 'block' : 'hidden'
              } absolute left-0 mt-1.5 w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 z-50`}
            >
              <a
                href="/tracker"
                data-tab="tracker"
                role="tab"
                onClick={(e) => { e.preventDefault(); handleTabClick('tracker'); }}
                className={`nav-tab nav-more-item flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-lg transition text-left cursor-pointer ${
                  activeTab === 'tracker'
                    ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon name="insights" className="text-[18px] leading-none shrink-0 text-indigo-500" />
                <span>Tần Suất Thói Quen</span>
              </a>

              <a
                href="/leaderboard"
                data-tab="leaderboard"
                role="tab"
                onClick={(e) => { e.preventDefault(); handleTabClick('leaderboard'); }}
                className={`nav-tab nav-more-item flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-lg transition text-left cursor-pointer ${
                  activeTab === 'leaderboard'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon name="leaderboard" className="text-[18px] leading-none shrink-0 text-amber-500" />
                <span>Bảng Xếp Hạng</span>
              </a>

              <a
                href="/ledger"
                data-tab="ledger"
                role="tab"
                onClick={(e) => { e.preventDefault(); handleTabClick('ledger'); }}
                className={`nav-tab nav-more-item flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-lg transition text-left cursor-pointer ${
                  activeTab === 'ledger'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon name="receipt_long" className="text-[18px] leading-none shrink-0 text-emerald-500" />
                <span>Sổ Giao Dịch</span>
              </a>

              <a
                href="/bank"
                data-tab="bank"
                role="tab"
                onClick={(e) => { e.preventDefault(); handleTabClick('bank'); }}
                className={`nav-tab nav-more-item flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-lg transition text-left cursor-pointer ${
                  activeTab === 'bank'
                    ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon name="account_balance" className="text-[18px] leading-none shrink-0 text-sky-500" />
                <span>Ngân Hàng RPG</span>
              </a>

              {isRoleAdmin && (
                <a
                  href="/admin"
                  id="nav-tab-admin"
                  data-tab="admin"
                  role="tab"
                  onClick={(e) => { e.preventDefault(); handleTabClick('admin'); }}
                  className={`nav-tab nav-more-item flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-lg transition text-left cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                      : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                  }`}
                >
                  <Icon name="admin_panel_settings" className="text-[18px] leading-none shrink-0" />
                  <span>Quản Trị Viên</span>
                </a>
              )}

              <button
                id="btn-nav-about"
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  if (typeof window !== 'undefined' && typeof (window as unknown as { openAboutModal?: () => void }).openAboutModal === 'function') {
                    (window as unknown as { openAboutModal: () => void }).openAboutModal();
                  }
                }}
                className="nav-more-item flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition text-left cursor-pointer border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1"
              >
                <Icon name="info" className="text-[18px] leading-none shrink-0" />
                <span>Giới Thiệu App</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
