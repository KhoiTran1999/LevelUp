'use client';

import React, { useState, useMemo } from 'react';
import { useLevelUp } from '@/components/providers/LevelUpProvider';
import {
  BANK_TERMS,
  DAILY_DEPOSIT_INTEREST_CAP,
  calculateEffectiveDepositBase,
  calculateDisciplineMultiplier,
  calculateDepositPayoutInfo,
  formatBankDayHourCountdown,
  type DepositPayoutInfo,
} from './bank-utils';
import type { BankRates, BankDepositItem } from '@/types/levelup';

interface SavingsColumnProps {
  rates: BankRates;
  currentTime: number;
}

export function SavingsColumn({ rates, currentTime }: SavingsColumnProps) {
  const {
    state,
    executeBankDeposit,
    openBankWithdrawModal,
  } = useLevelUp();

  const [selectedTerm, setSelectedTerm] = useState<number>(0);
  const [depositAmountInput, setDepositAmountInput] = useState<string>('');
  const [isDepositing, setIsDepositing] = useState(false);

  const profile = state.profile;
  const userCoins = profile?.coins || 0;
  const bank = profile?.bank;
  const deposited = bank?.deposited || 0;
  const depositInterest = bank?.depositInterest || 0;
  const deposits: BankDepositItem[] = Array.isArray(bank?.deposits) ? bank.deposits : [];

  const discipline = calculateDisciplineMultiplier(profile);

  // Top/Primary deposit for countdown display
  const primaryDeposit = useMemo(() => {
    if (deposits.length === 0) return null;
    // Prefer term deposits with nearest maturity or the highest amount
    const activeTerm = deposits.find(d => d.termDays > 0 && d.status === 'active');
    return activeTerm || deposits[0];
  }, [deposits]);

  const payoutInfo: DepositPayoutInfo = useMemo(() => {
    if (!primaryDeposit) {
      return {
        type: 'flex',
        expectedPayoutAmount: 0,
        msRemaining: 0,
        timerFormatted: '--:--:--',
        countdownFormatted: '0 giờ',
        sourceText: 'Chưa có sổ',
        noteText: 'Gửi Vàng để bắt đầu nhận lãi',
      };
    }
    return calculateDepositPayoutInfo(primaryDeposit, rates, discipline.multiplier, currentTime);
  }, [primaryDeposit, rates, discipline.multiplier, currentTime]);

  // Calculator preview
  const parsedDepositAmt = Math.max(0, parseInt(depositAmountInput, 10) || 0);
  const termConfig = BANK_TERMS[selectedTerm] || BANK_TERMS[0];
  const effectiveBase = calculateEffectiveDepositBase(parsedDepositAmt);
  const calcRate = rates.depositRate * termConfig.rateMultiplier * discipline.multiplier;
  const calcDailyInterest = Math.min(DAILY_DEPOSIT_INTEREST_CAP, effectiveBase * calcRate);
  const calcDays = selectedTerm === 0 ? 1 : selectedTerm;
  const calcTotalInterest = Math.round(calcDailyInterest * calcDays);
  const calcTotalPayout = parsedDepositAmt + calcTotalInterest;

  const handleDepositSubmit = async () => {
    const amt = parseInt(depositAmountInput, 10);
    if (isNaN(amt) || amt <= 0 || amt > userCoins) return;
    setIsDepositing(true);
    try {
      await executeBankDeposit(amt, selectedTerm);
      setDepositAmountInput('');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleQuickAmount = (val: number | 'max') => {
    if (val === 'max') {
      setDepositAmountInput(String(userCoins));
    } else {
      setDepositAmountInput(String(Math.min(userCoins, val)));
    }
  };

  return (
    <div className="rpg-panel rounded-2xl p-4 sm:p-5 border-2 border-emerald-500/40 border-t-4 border-t-emerald-500 bg-gradient-to-b from-emerald-500/[0.07] via-transparent to-transparent flex flex-col justify-between shadow-xs">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-emerald-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0">
              🌱
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-emerald-700 dark:text-emerald-300">
                GỬI TIẾT KIỆM
              </h3>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0 uppercase tracking-wide">
            📥 Sinh Lãi
          </span>
        </div>

        {/* Tóm tắt tài sản gửi */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[11px] text-slate-600 dark:text-slate-400">Đang Gửi:</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span id="bank-user-deposited" className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {deposited}
              </span>
              <span className="coin-icon"></span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-[11px] text-slate-600 dark:text-slate-400">Lãi Tích Lũy:</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span id="bank-user-interest" className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                +{depositInterest}
              </span>
              <span className="coin-icon"></span>
            </div>
          </div>
        </div>

        {/* Badge Kỷ Luật Streak */}
        <div
          id="bank-discipline-badge"
          className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 text-xs mb-3"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm shrink-0">{discipline.icon}</span>
            <span className="font-bold text-amber-700 dark:text-amber-300 truncate">
              {discipline.label}
            </span>
          </div>
          <span className="font-mono font-bold text-[11px] text-amber-600 dark:text-amber-400 shrink-0">
            {discipline.bonusPct > 0 ? `+${discipline.bonusPct}%` : `${discipline.bonusPct}%`}
          </span>
        </div>

        {/* Hidden compatibility container for test assertions and DOM references */}
        <div id="bank-deposit-countdown-card" className="hidden" aria-hidden="true">
          <span id="bank-deposit-countdown-timer">{payoutInfo.countdownFormatted || payoutInfo.timerFormatted}</span>
          <span id="bank-deposit-countdown-amount">+{payoutInfo.expectedPayoutAmount}</span>
          <span id="bank-deposit-countdown-source">{payoutInfo.sourceText}</span>
          <span id="bank-deposit-countdown-subtext">{payoutInfo.noteText}</span>
        </div>

        {/* Danh sách các sổ tiết kiệm */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>📚</span> <span>Sổ Tiết Kiệm Của Bạn ({deposits.length})</span>
            </span>
          </div>
          <div id="bank-deposits-list" className="max-h-60 overflow-y-auto pr-0.5 space-y-2">
            {deposits.length === 0 ? (
              <div className="p-3 text-center text-[11px] text-slate-400 dark:text-slate-500 italic bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                Chưa có sổ tiết kiệm nào. Hãy gửi Vàng ở form bên dưới!
              </div>
            ) : (
              deposits.map(dep => {
                const cfg = BANK_TERMS[dep.termDays] || BANK_TERMS[0];
                const isMatured = dep.status === 'matured' || (dep.termDays > 0 && dep.maturityAt && currentTime >= dep.maturityAt);
                const info = calculateDepositPayoutInfo(dep, rates, discipline.multiplier, currentTime);
                const countdownText = isMatured ? '0 giờ' : formatBankDayHourCountdown(info.msRemaining);

                return (
                  <div
                    key={dep.id}
                    className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-500/20 hover:border-emerald-500/35 transition text-xs space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-base shrink-0">{cfg.icon}</span>
                        <div className="truncate">
                          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span>{cfg.label}</span>
                            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              {dep.amount} 🪙
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Lãi tích lũy: +{dep.interest || 0} 🪙
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                          isMatured
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                        }`}
                      >
                        {dep.termDays === 0 ? 'Linh hoạt' : isMatured ? '🎉 Đã đáo hạn' : 'Đang sinh lãi'}
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-emerald-500/15 flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                        <span className="text-xs">⏱️</span>
                        <span className="text-[10px] sm:text-[11px] font-medium">Nhận lãi sau:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {countdownText}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 mr-1">
                          {dep.termDays === 0 ? 'Dự kiến:' : 'Đáo hạn:'}
                        </span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          +{info.expectedPayoutAmount} 🪙
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Form gửi Vàng */}
        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          {/* Chọn Kỳ Hạn Multi-Term Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Kỳ Hạn:
            </label>
            <div className="grid grid-cols-2 xs:grid-cols-4 gap-1.5">
              {[0, 7, 14, 30].map(days => {
                const cfg = BANK_TERMS[days];
                const isSelected = selectedTerm === days;
                const ratePct = ((rates.depositRate * cfg.rateMultiplier) * 100).toFixed(2);
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setSelectedTerm(days)}
                    data-term-days={days}
                    className={`bank-term-select-btn flex-1 py-2 px-1 rounded-xl text-center transition cursor-pointer ${
                      isSelected
                        ? 'font-bold text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500 shadow-xs'
                        : 'font-medium text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50'
                    }`}
                  >
                    <span className="block text-sm">{cfg.icon}</span>
                    <span className="block text-[11px] font-bold">{cfg.label}</span>
                    <span
                      id={`bank-term-rate-${days}`}
                      className="block text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400"
                    >
                      {ratePct}%/ngày
                    </span>
                  </button>
                );
              })}
            </div>
            <div
              id="bank-deposit-term-note"
              className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800"
            >
              {termConfig.icon} <strong>{termConfig.label}:</strong> {termConfig.desc}
            </div>
          </div>

          <div>
            <label
              htmlFor="input-deposit-amount"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Số Vàng gửi:
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                id="input-deposit-amount"
                min="1"
                max={userCoins}
                value={depositAmountInput}
                onChange={e => setDepositAmountInput(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition font-mono pr-10"
              />
              <span className="absolute right-3 pointer-events-none flex items-center">
                <span className="coin-icon"></span>
              </span>
            </div>
          </div>

          {/* Quick amount chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 mr-1">Nhanh:</span>
            {[10, 25, 50, 100].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => handleQuickAmount(v)}
                className="px-2 py-0.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/20 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                {v}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleQuickAmount('max')}
              className="px-2 py-0.5 rounded-lg text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 font-bold transition cursor-pointer"
            >
              Tối Đa
            </button>
          </div>

          {/* Máy tính dự tính tiền lãi tiết kiệm */}
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 text-xs">
                <span>🧮</span> <span>Dự Tính Lãi</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Lãi suất:{' '}
                <b id="calc-deposit-rate-label" className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {(calcRate * 100).toFixed(2)}%/ngày
                </b>
              </span>
            </div>

            <div id="calc-deposit-discipline-badge" className="hidden"></div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-emerald-500/15">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Lãi dự kiến:</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                  +<span id="calc-deposit-result-interest">{calcTotalInterest}</span> <span className="coin-icon"></span>
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-emerald-500/15">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Tổng nhận về:</span>
                <span className="font-bold font-mono text-slate-700 dark:text-slate-300 inline-flex items-center gap-1">
                  <span id="calc-deposit-result-total">{calcTotalPayout}</span> <span className="coin-icon"></span>
                </span>
              </div>
            </div>

            {/* Hidden inputs for backward compatibility */}
            <div className="hidden" aria-hidden="true">
              <input type="number" id="calc-deposit-coins" value={parsedDepositAmt} readOnly />
              <input type="number" id="calc-deposit-days" value={calcDays} readOnly />
            </div>
          </div>
        </div>
      </div>

      {/* Nút hành động gửi & rút */}
      <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <button
          id="btn-bank-deposit"
          type="button"
          onClick={handleDepositSubmit}
          disabled={isDepositing || parsedDepositAmt <= 0 || parsedDepositAmt > userCoins}
          className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>📥</span> <span>{isDepositing ? 'Đang Gửi...' : 'Gửi Tiết Kiệm'}</span>
        </button>
        <button
          id="btn-bank-withdraw"
          type="button"
          onClick={() => openBankWithdrawModal()}
          className="py-2.5 px-4 rounded-xl text-xs font-bold transition border border-emerald-500/40 hover:bg-emerald-500/15 active:scale-95 text-emerald-700 dark:text-emerald-300 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
        >
          <span>📤</span> <span>Rút Tiền</span>
        </button>
      </div>
    </div>
  );
}
