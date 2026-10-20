'use client';

import React, { useState, useEffect } from 'react';
import { useLevelUp } from '@/components/providers/LevelUpProvider';
import { LedgerStatsSummary } from './LedgerStatsSummary';
import { TransactionsView } from './TransactionsView';
import { ProofPhotosView } from './ProofPhotosView';
import { getAllProofPhotos, type LedgerSubtabType } from './ledger-utils';

export function LedgerContainer() {
  const { state } = useLevelUp();
  const [subtab, setSubtab] = useState<LedgerSubtabType>('transactions');

  const allPhotos = getAllProofPhotos(state.proofPhotos, state.ledger, state.quests);

  // Expose subtab switcher to global window
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as unknown as { switchLedgerSubtab?: (s: LedgerSubtabType) => void }).switchLedgerSubtab = (s: LedgerSubtabType) => {
      setSubtab(s);
    };
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="font-rpg-title font-extrabold text-lg sm:text-xl text-sky-600 dark:text-sky-400">
          LỊCH SỬ THU CHI VÀNG
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Nhật ký chi tiết các lần bạn nhận thưởng Vàng, đổi quà và album toàn bộ ảnh bằng chứng đã được AI Arbiter phê duyệt.
        </p>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl mb-4 max-w-sm">
        <button
          id="btn-ledger-subtab-transactions"
          type="button"
          onClick={() => setSubtab('transactions')}
          className={`flex-1 py-1.5 sm:py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
            subtab === 'transactions'
              ? 'font-bold bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>💰</span>
          <span>Thu Chi Vàng</span>
        </button>

        <button
          id="btn-ledger-subtab-photos"
          type="button"
          onClick={() => setSubtab('photos')}
          className={`flex-1 py-1.5 sm:py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
            subtab === 'photos'
              ? 'font-bold bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>📸</span>
          <span>Lịch Sử Ảnh</span>
          <span
            id="ledger-photos-badge"
            className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-sky-500/20 text-sky-600 dark:text-sky-400 font-bold"
          >
            {allPhotos.length}
          </span>
        </button>
      </div>

      {/* VIEW 1: TRANSACTIONS (THU CHI VÀNG) */}
      {subtab === 'transactions' && (
        <div className="space-y-4">
          <LedgerStatsSummary ledger={state.ledger} bank={state.profile.bank} />
          <TransactionsView ledger={state.ledger} />
        </div>
      )}

      {/* VIEW 2: PROOF PHOTOS ALBUM (LỊCH SỬ ẢNH BẰNG CHỨNG) */}
      {subtab === 'photos' && <ProofPhotosView photos={allPhotos} />}
    </div>
  );
}
