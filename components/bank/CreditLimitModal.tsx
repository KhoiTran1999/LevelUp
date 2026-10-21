'use client';

import React from 'react';
import { useLevelUp } from '@/components/providers/LevelUpProvider';

export function CreditLimitModal() {
  const { isCreditLimitModalOpen, closeCreditLimitModal, state } = useLevelUp();

  if (!isCreditLimitModalOpen) return null;

  const profile = state.profile;
  const level = Math.max(1, profile?.level || 1);
  const streak = Math.max(0, profile?.streak || 0);
  const totalEarned = Math.max(20, profile?.totalCoinsEarned || 20);
  const autoDeduct = profile?.bank?.loan?.autoDeductPercent || 0.5;

  const levelVal = level * 25;
  const streakVal = streak * 5;
  const earnedBonus = Math.floor(totalEarned * 0.1);
  const rawBase = levelVal + streakVal + earnedBonus;
  const baseLimit = Math.min(400, rawBase);

  const clampedRate = Math.min(0.80, Math.max(0.20, Number(autoDeduct) || 0.50));
  const kDeduct = Number((0.7 + ((Math.max(0.30, clampedRate) - 0.30) / 0.50) * 0.8).toFixed(2));
  const totalLimit = Math.max(20, Math.floor(baseLimit * kDeduct));

  return (
    <div
      id="modal-credit-limit-info"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-credit-limit-title"
    >
      <div className="rpg-panel rounded-2xl w-full sm:max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden modal-fade shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-100 dark:bg-slate-900 px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg leading-none text-blue-500">bolt</span>
            <h3
              id="modal-credit-limit-title"
              className="font-rpg-title font-extrabold text-sm sm:text-base text-blue-600 dark:text-blue-400"
            >
              CÁCH TÍNH & NÂNG HẠN MỨC VAY
            </h3>
          </div>
          <button
            type="button"
            onClick={closeCreditLimitModal}
            className="modal-close w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition shrink-0 active:scale-95"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs text-slate-700 dark:text-slate-300">
          {/* Live Breakdown Card */}
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-2.5">
            <div className="flex justify-between items-center border-b border-blue-500/20 pb-2">
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                  Hạn mức của bạn
                </div>
                <div
                  className="text-xl font-extrabold font-mono text-blue-600 dark:text-blue-400 inline-flex items-center gap-1"
                  id="modal-credit-limit-total"
                >
                  {totalLimit} <span className="coin-icon"></span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                  Mức nhân cam kết
                </div>
                <div className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400" id="modal-credit-limit-kdeduct">
                  x{kDeduct}
                </div>
              </div>
            </div>

            {/* Detailed factors */}
            <div className="space-y-1.5 text-[11px] pt-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">
                  🎖️ Cấp độ (<span id="modal-credit-calc-level">LV. {level}</span>):
                </span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200" id="modal-credit-calc-level-val">
                  +{levelVal} Vàng
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">
                  🔥 Chuỗi ngày (<span id="modal-credit-calc-streak">{streak} ngày</span>):
                </span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200" id="modal-credit-calc-streak-val">
                  +{streakVal} Vàng
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">
                  💰 Vàng tích lũy (<span id="modal-credit-calc-earned">{totalEarned}</span> Vàng):
                </span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200" id="modal-credit-calc-earned-val">
                  +{earnedBonus} Vàng
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-blue-500/15">
                <span className="font-medium text-slate-600 dark:text-slate-400">🛡️ Hạn mức cơ bản:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200" id="modal-credit-calc-base">
                  {baseLimit} Vàng
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 text-[10px]">Tỷ lệ trích nợ cam kết:</span>
                <span className="font-mono text-slate-600 dark:text-slate-400 text-[10px]" id="modal-credit-calc-deduct-rate">
                  {Math.round(autoDeduct * 100)}% thưởng nhiệm vụ
                </span>
              </div>
            </div>
          </div>

          {/* 4 Ways to raise credit limit */}
          <div className="space-y-2">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <span>🚀</span>
              <span>4 Cách để được nâng hạn mức cao hơn</span>
            </div>
            <div className="space-y-2 text-[11px] leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="font-semibold text-blue-600 dark:text-blue-400 mb-0.5">1. Chăm chỉ thăng cấp (Level Up):</div>
                <p className="text-slate-600 dark:text-slate-400">
                  Mỗi khi lên 1 Cấp độ, bạn được cộng thẳng <strong className="text-slate-900 dark:text-white font-mono">+5 Vàng</strong> vào hạn mức cơ bản.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="font-semibold text-blue-600 dark:text-blue-400 mb-0.5">2. Duy trì chuỗi ngày chăm chỉ:</div>
                <p className="text-slate-600 dark:text-slate-400">
                  Đăng nhập và hoàn thành nhiệm vụ mỗi ngày. Mỗi ngày duy trì chuỗi giúp bạn nhận thêm <strong className="text-slate-900 dark:text-white font-mono">+2 Vàng</strong> hạn mức (tối đa +30 Vàng).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="font-semibold text-blue-600 dark:text-blue-400 mb-0.5">3. Tích lũy Vàng từ nhiệm vụ:</div>
                <p className="text-slate-600 dark:text-slate-400">
                  Tổng số Vàng bạn kiếm được càng cao thì độ uy tín tài chính càng lớn, được cộng thêm tối đa +25 Vàng.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="font-semibold text-blue-600 dark:text-blue-400 mb-0.5">4. Nâng tỷ lệ trích thưởng cam kết:</div>
                <p className="text-slate-600 dark:text-slate-400">
                  Kéo thanh trích nợ từ 50% lên 80% khi đăng ký vay giúp nhân hệ số cam kết lên tới <strong>x1.12</strong> toàn bộ hạn mức.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={closeCreditLimitModal}
              className="modal-close px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer"
            >
              Đã Hiểu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
