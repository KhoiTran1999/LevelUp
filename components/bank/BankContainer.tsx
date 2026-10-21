'use client';

import React, { useState, useEffect } from 'react';
import { useLevelUp } from '@/components/providers/LevelUpProvider';
import { SavingsColumn } from './SavingsColumn';
import { LoanColumn } from './LoanColumn';
import { calculateBankRates } from './bank-utils';
import type { BankRates, BankPoolState } from '@/types/levelup';

export function BankContainer() {
  const {
    state,
    bankPool,
    openBankRulesModal,
    loadBankState,
  } = useLevelUp();

  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial load of live bank state
  useEffect(() => {
    loadBankState?.();
  }, [loadBankState]);

  // Live timer tick every 1000ms for bank countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const profile = state.profile;
  const bank = profile?.bank;
  const loan = bank?.loan;
  const isOverdue = Boolean(loan?.isOverdue || bank?.isFrozen);

  // Pool state from Server Actions or fallback
  const poolState: BankPoolState = bankPool || {
    poolGold: 500,
    totalBorrowed: loan?.debt ? Math.min(loan.debt, 500) : 0,
    reserveFund: 150,
    totalDeposited: bank?.deposited || 0,
    bailoutDebt: 0,
  };

  const rates: BankRates = calculateBankRates(poolState);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadBankState?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 0. Banner cảnh báo nợ quá hạn (hiển thị khi isOverdue = true) */}
      {isOverdue && (
        <div
          id="bank-overdue-banner"
          className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-rose-500/15 dark:bg-rose-950/40 border border-rose-500/40 text-rose-700 dark:text-rose-300 flex items-start gap-3 shadow-xs"
        >
          <span className="text-2xl shrink-0">⚠️</span>
          <div>
            <h3 id="bank-overdue-title" className="font-bold text-sm">
              CẢNH BÁO: KHOẢN VAY ĐÃ QUÁ HẠN!
            </h3>
            <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
              Bạn đã quá thời hạn trả nợ. <strong>Cửa Hàng đổi quà đã bị đóng băng tạm thời</strong>. Toàn bộ{' '}
              <strong>100% Vàng thưởng</strong> từ các nhiệm vụ bạn hoàn thành sẽ được hệ thống tự động trích nợ cho đến khi thanh toán xong. Hãy hoàn thành nhiệm vụ để trả nợ ngay!
            </p>
          </div>
        </div>
      )}

      {/* 1. Header & Bản Tin Thống Đốc Ngân Hàng */}
      <div className="rpg-panel rounded-2xl p-4 sm:p-5 border border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 via-transparent to-teal-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 dark:bg-emerald-400/20 border border-emerald-500/40 flex items-center justify-center text-xl shrink-0">
              🏦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-rpg-title font-black text-base sm:text-lg text-emerald-700 dark:text-emerald-300">
                  NGÂN HÀNG VÀNG
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Bảo Lãnh 100% Vốn
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => openBankRulesModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-2xs"
              title="Xem toàn bộ quy tắc tài chính & cơ chế Ngân hàng"
            >
              <span>📖</span> <span>Quy Tắc</span>
            </button>
            <button
              id="btn-refresh-bank"
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 shadow-xs cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span id="btn-refresh-bank-icon" className={`inline-block transition-transform ${isRefreshing ? 'animate-spin' : ''}`}>
                🔄
              </span>{' '}
              <span id="btn-refresh-bank-text">{isRefreshing ? 'Đang tải...' : 'Cập Nhật'}</span>
            </button>
          </div>
        </div>

        {/* AI Commentary Box */}
        <div id="bank-ai-commentary-card" className="hidden" aria-hidden="true">
          <span id="bank-ai-commentary">Ngân hàng hoạt động ổn định.</span>
        </div>

        {/* Hidden telemetry for backward compatibility */}
        <div className="hidden" aria-hidden="true">
          <span id="bank-deposit-rate">{(rates.depositRate * 100).toFixed(2)}%/ngày</span>
          <span id="bank-borrow-rate">{(rates.borrowRate * 100).toFixed(1)}%/ngày</span>
          <span id="bank-pool-gold">{poolState.poolGold}</span>
          <span id="bank-total-borrowed">{poolState.totalBorrowed}</span>
          <span id="bank-utilization-pct">{Math.round(rates.utilization * 100)}%</span>
          <span id="bank-reserve-fund">{poolState.reserveFund}</span>
          <div id="bank-bailout-status"></div>
        </div>
      </div>

      {/* 2 Cột: Bên trái là Sổ Tiết Kiệm (Depositor), Bên phải là Quầy Vay Vàng (Borrower) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <SavingsColumn rates={rates} currentTime={currentTime} />
        <LoanColumn rates={rates} currentTime={currentTime} />
      </div>
    </div>
  );
}
