'use client';

import React from 'react';
import type { BankAccount, LedgerEntry } from '@/types/levelup';
import { calculateLedgerStats } from './ledger-utils';

interface LedgerStatsSummaryProps {
  ledger: LedgerEntry[];
  bank?: BankAccount;
}

export function LedgerStatsSummary({ ledger, bank }: LedgerStatsSummaryProps) {
  const { todayEarn, todaySpend, totalBankDeposits, currentBankDebt } = calculateLedgerStats(ledger, bank);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {/* 1. Thu hôm nay */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-sky-500/20 shadow-xs flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center text-base shrink-0">
          📥
        </div>
        <div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Thu hôm nay</div>
          <div id="ledger-stat-earn" className="text-sm sm:text-base font-bold font-mono text-sky-600 dark:text-sky-400 inline-flex items-center gap-1">
            +{todayEarn} <span className="coin-icon"></span>
          </div>
        </div>
      </div>

      {/* 2. Chi hôm nay */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-rose-500/20 shadow-xs flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-base shrink-0">
          📤
        </div>
        <div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Chi hôm nay</div>
          <div id="ledger-stat-spend" className="text-sm sm:text-base font-bold font-mono text-rose-600 dark:text-rose-400 inline-flex items-center gap-1">
            -{todaySpend} <span className="coin-icon"></span>
          </div>
        </div>
      </div>

      {/* 3. Đang tiết kiệm */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-emerald-500/20 shadow-xs flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base shrink-0">
          🏦
        </div>
        <div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Đang tiết kiệm</div>
          <div id="ledger-stat-bank-deposit" className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
            {totalBankDeposits} <span className="coin-icon"></span>
          </div>
        </div>
      </div>

      {/* 4. Dư nợ hiện tại */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-blue-500/20 shadow-xs flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-base shrink-0">
          💳
        </div>
        <div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Dư nợ hiện tại</div>
          <div id="ledger-stat-bank-debt" className="text-sm sm:text-base font-bold font-mono text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
            {currentBankDebt} <span className="coin-icon"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
