'use client';

import React from 'react';
import { useLevelUp } from '@/components/providers/LevelUpProvider';

export function ProofApprovedModal() {
  const {
    pendingApprovedQuest,
    isProofApprovedModalOpen,
    claimApprovedProof,
    closeProofApprovedModal,
  } = useLevelUp();

  if (!isProofApprovedModalOpen || !pendingApprovedQuest) {
    return null;
  }

  const coins = pendingApprovedQuest.rewardCoins || 10;
  const exp = coins * 3;
  const feedback =
    pendingApprovedQuest.proofFeedback ||
    'Bằng chứng hợp lệ! Chúc mừng bạn đã hoàn thành xuất sắc nhiệm vụ.';

  return (
    <div
      id="modal-proof-approved"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-approved-modal-title"
    >
      <div className="rpg-panel rounded-3xl w-full max-w-sm border border-amber-500/50 p-6 space-y-4 shadow-2xl bg-white dark:bg-slate-900 text-center modal-fade relative">
        <button
          id="btn-close-proof-approved"
          type="button"
          onClick={closeProofApprovedModal}
          className="modal-close absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition active:scale-95 z-10"
          aria-label="Đóng"
        >
          <span className="material-symbols-outlined text-lg leading-none">close</span>
        </button>

        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-4xl ios-celebrate-pop">
          🏆
        </div>

        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            AI XÁC THỰC THÀNH CÔNG
          </span>
          <h3
            id="proof-approved-modal-title"
            className="font-rpg-title font-black text-lg sm:text-xl text-slate-900 dark:text-slate-100 mt-0.5"
          >
            AI ĐÃ DUYỆT BẰNG CHỨNG!
          </h3>
          <p
            id="proof-approved-quest-title"
            className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 truncate max-w-xs mx-auto"
          >
            {pendingApprovedQuest.title}
          </p>
        </div>

        {/* AI Observation & Feedback Box */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-left space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <span>🤖</span>
            <span>AI quan sát & nhận định:</span>
          </div>
          <p
            id="proof-approved-feedback"
            className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed"
          >
            {feedback}
          </p>
        </div>

        {/* Reward Badges Row */}
        <div className="flex justify-center items-center gap-3 py-1">
          <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-mono font-black text-sm">
            <span className="coin-icon"></span>
            <span id="proof-approved-coins">+{coins} VÀNG</span>
          </div>
          <div className="hidden">
            <span id="proof-approved-exp">+{exp} EXP</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            id="btn-claim-proof-reward"
            type="button"
            onClick={claimApprovedProof}
            className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 transition shadow-lg shadow-amber-500/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>💰</span>
            <span>Nhận Tiền Thưởng & Hoàn Tất</span>
          </button>
        </div>
      </div>
    </div>
  );
}
