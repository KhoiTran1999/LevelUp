'use client';

import React from 'react';
import { useLevelUp } from '@/hooks/useLevelUp';
import { Icon } from '@/components/ui/Icon';

const isAvatarUrl = (avatar?: string) => {
  if (!avatar) return false;
  return (
    avatar.startsWith('http://') ||
    avatar.startsWith('https://') ||
    avatar.startsWith('/') ||
    avatar.startsWith('data:')
  );
};

export function Header() {
  const {
    optimisticProfile,
    toggleTheme,
    toggleSound,
    togglePalette,
  } = useLevelUp();

  const isDark = optimisticProfile.theme === 'dark';
  const soundEnabled = optimisticProfile.soundEnabled;

  return (
    <header
      suppressHydrationWarning
      className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/85 backdrop-blur-md transition-colors duration-200"
    >
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-1.5 sm:py-2.5 flex items-center justify-between gap-1 sm:gap-3">
        {/* Profile: Avatar & Nickname Button (Left) */}
        <button
          id="open-profile-btn"
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && typeof (window as unknown as { openProfileModal?: () => void }).openProfileModal === 'function') {
              (window as unknown as { openProfileModal: () => void }).openProfileModal();
            }
          }}
          className="flex items-center gap-1.5 sm:gap-2 text-left hover:bg-slate-100 dark:hover:bg-slate-900/80 rounded-xl px-1.5 sm:px-2 py-1 transition group min-w-0 shrink cursor-pointer"
          title="Hồ sơ cá nhân & Mã tài khoản"
        >
          <div
            id="hero-avatar"
            suppressHydrationWarning
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm sm:text-base group-hover:scale-105 transition shadow-sm shrink-0 overflow-hidden"
          >
            {isAvatarUrl(optimisticProfile.avatar) ? (
              <img
                referrerPolicy="no-referrer"
                src={optimisticProfile.avatar}
                alt={optimisticProfile.nickname || 'Avatar'}
                className="w-full h-full object-cover rounded-lg"
                onError={e => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.textContent = '⚔️';
                  }
                }}
              />
            ) : (
              optimisticProfile.avatar || '⚔️'
            )}
          </div>
          <div className="min-w-0 max-w-[65px] xs:max-w-[85px] sm:max-w-[120px] md:max-w-[160px] truncate">
            <div className="flex items-center gap-1">
              <span
                id="hero-nickname"
                suppressHydrationWarning
                className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate"
              >
                {optimisticProfile.nickname || 'Thành Viên'}
              </span>
              <span
                id="sync-indicator"
                className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 shrink-0"
                title="Đã đồng bộ"
              />
            </div>
            <div
              className="hidden sm:block text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate"
              id="hero-title"
              suppressHydrationWarning
            >
              {optimisticProfile.title || 'Tân Binh Cấp 1'}
            </div>
          </div>
        </button>

        {/* Adventurer Stats Pill (Right) */}
        <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl px-1.5 sm:px-3 py-1 sm:py-1.5 shadow-sm dark:shadow-inner transition-colors shrink-0">
          {/* Level Display */}
          <button
            id="btn-level-info"
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                (window as unknown as { openLevelInfoModal?: () => void }).openLevelInfoModal?.();
              }
            }}
            className="flex flex-col justify-center shrink-0 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 rounded-lg px-0.5 sm:px-1.5 py-0.5 transition cursor-pointer text-left group"
            title="Xem thông tin Cấp độ & Cách tăng LV"
          >
            <div className="flex items-center justify-between gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] font-mono leading-tight">
              <span
                className="text-indigo-600 dark:text-indigo-400 font-bold group-hover:underline flex items-center gap-0.5"
                id="hero-level-badge"
                suppressHydrationWarning
              >
                LV. {optimisticProfile.level || 1}
              </span>
              <span className="hidden" id="hero-exp-text" suppressHydrationWarning>
                {optimisticProfile.exp || 0}/100
              </span>
            </div>
            <div className="hidden">
              <div
                id="hero-exp-bar"
                style={{ width: `${Math.min(100, Math.max(0, optimisticProfile.exp || 0))}%` }}
              />
            </div>
          </button>

          {/* Vertical Divider */}
          <div className="h-4 sm:h-5 w-px bg-slate-300 dark:bg-slate-800 shrink-0" />

          {/* Gold Balance */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 px-0.5 shrink-0">
            <span className="text-xs sm:text-base coin-icon coin-shine" />
            <div className="flex flex-col">
              <span className="hidden md:inline text-[9px] text-slate-500 dark:text-slate-400 leading-none">
                Vàng
              </span>
              <span
                id="hero-coins"
                suppressHydrationWarning
                className="text-xs sm:text-sm font-extrabold text-amber-600 dark:text-amber-400 font-mono tracking-tight leading-tight"
              >
                {optimisticProfile.coins ?? 0}
              </span>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="h-4 sm:h-5 w-px bg-slate-300 dark:bg-slate-800 shrink-0" />

          {/* Streak Badge */}
          <button
            id="btn-streak-info"
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                (window as unknown as { openStreakInfoModal?: () => void }).openStreakInfoModal?.();
              }
            }}
            className="flex items-center gap-0.5 sm:gap-1.5 px-0.5 sm:px-1.5 py-0.5 rounded-lg hover:bg-orange-500/10 dark:hover:bg-orange-500/20 transition cursor-pointer text-left group shrink-0"
            title="Xem Chuỗi ngày & Thưởng"
          >
            <span
              id="hero-streak-flame"
              className="text-xs sm:text-base streak-flame transition-transform group-hover:scale-110"
            >
              🔥
            </span>
            <div className="flex flex-col">
              <span className="hidden md:inline text-[9px] text-slate-500 dark:text-slate-400 leading-none">
                Chuỗi
              </span>
              <span
                id="hero-streak-count"
                suppressHydrationWarning
                className="text-xs sm:text-sm font-extrabold text-orange-600 dark:text-orange-400 font-mono tracking-tight leading-tight"
              >
                {optimisticProfile.streak || 1}
                <span className="hidden sm:inline text-[10px] font-medium ml-0.5">ngày</span>
              </span>
            </div>
          </button>

          {/* Vertical Divider */}
          <div className="h-4 sm:h-5 w-px bg-slate-300 dark:bg-slate-800 shrink-0" />

          {/* Control Buttons: Theme, Palette, Sound */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              id="toggle-palette-btn"
              type="button"
              onClick={e => {
                if (e.shiftKey) {
                  togglePalette();
                } else if (typeof window !== 'undefined' && typeof (window as unknown as { openPaletteStudio?: () => void }).openPaletteStudio === 'function') {
                  (window as unknown as { openPaletteStudio: () => void }).openPaletteStudio();
                } else {
                  togglePalette();
                }
              }}
              className="flex p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition text-xs sm:text-sm items-center justify-center cursor-pointer"
              title="Bảng màu giao diện (Bấm để mở, Shift-Click đổi nhanh)"
            >
              <Icon name="palette" className="text-lg leading-none" />
            </button>

            <button
              id="toggle-theme-btn"
              type="button"
              suppressHydrationWarning
              onClick={toggleTheme}
              className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition text-xs sm:text-sm flex items-center justify-center cursor-pointer"
              title="Chế độ sáng / tối"
            >
              <Icon name={isDark ? 'light_mode' : 'dark_mode'} className="text-lg leading-none" />
            </button>

            <button
              id="toggle-sound-btn"
              type="button"
              suppressHydrationWarning
              onClick={toggleSound}
              className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition text-xs sm:text-sm hidden xs:flex items-center justify-center cursor-pointer"
              title="Bật / tắt âm thanh"
            >
              <Icon name={soundEnabled ? 'volume_up' : 'volume_off'} className="text-lg leading-none" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
