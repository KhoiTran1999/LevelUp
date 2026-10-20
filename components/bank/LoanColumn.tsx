'use client';

import React, { useState, useMemo } from 'react';
import { useLevelUp } from '@/components/providers/LevelUpProvider';
import {
  LOAN_TERMS,
  calculateCreditLimit,
  calculateLoanCountdownInfo,
  triggerToast,
  type LoanCountdownInfo,
} from './bank-utils';
import { AiNegotiationChat } from '@/components/ai/AiNegotiationChat';
import type { BankRates, BankLoan } from '@/types/levelup';

interface LoanColumnProps {
  rates: BankRates;
  currentTime: number;
}

export function LoanColumn({ rates, currentTime }: LoanColumnProps) {
  const {
    state,
    executeBankBorrow,
    executeBankRepay,
    openCreditLimitModal,
  } = useLevelUp();

  const [selectedTerm, setSelectedTerm] = useState<number>(7);
  const [borrowAmountInput, setBorrowAmountInput] = useState<string>('');
  const [deductPercent, setDeductPercent] = useState<number>(50);
  const [showDebate, setShowDebate] = useState(false);
  const [isAnalyzingRoadmap, setIsAnalyzingRoadmap] = useState(false);
  const [roadmapData, setRoadmapData] = useState<{
    advice?: string;
    repaymentPlan?: string;
    estDays?: string;
    dailyIncome?: string;
  } | null>(null);

  // Negotiated loan terms from AI deliberation
  const [negotiatedTerms, setNegotiatedTerms] = useState<{
    newBorrowRate?: number;
    newCreditLimit?: number;
    newAutoDeductPercent?: number;
    newAmount?: number;
  } | null>(null);

  const [isBorrowing, setIsBorrowing] = useState(false);
  const [isRepaying, setIsRepaying] = useState(false);

  const profile = state.profile;
  const userCoins = profile?.coins || 0;
  const bank = profile?.bank;
  const loan: BankLoan | null = bank?.loan || null;
  const hasActiveLoan = Boolean(loan && (loan.debt || 0) > 0);

  // Credit limit calculation
  const calculatedLimit = useMemo(() => {
    const base = calculateCreditLimit(profile, deductPercent / 100);
    if (negotiatedTerms?.newCreditLimit) {
      return Math.max(base, negotiatedTerms.newCreditLimit);
    }
    return base;
  }, [profile, deductPercent, negotiatedTerms?.newCreditLimit]);

  // Loan countdown calculation
  const loanCountdownInfo: LoanCountdownInfo | null = useMemo(() => {
    if (!hasActiveLoan || !loan) return null;
    return calculateLoanCountdownInfo(loan, rates, currentTime);
  }, [hasActiveLoan, loan, rates, currentTime]);

  // Current effective borrow rate
  const termConfig = LOAN_TERMS[selectedTerm] || LOAN_TERMS[7];
  const effectiveBorrowRate = useMemo(() => {
    if (negotiatedTerms?.newBorrowRate) {
      return negotiatedTerms.newBorrowRate;
    }
    return Number((rates.borrowRate * termConfig.rateMultiplier).toFixed(4));
  }, [rates.borrowRate, termConfig.rateMultiplier, negotiatedTerms?.newBorrowRate]);

  // Calculator preview for new loan
  const parsedBorrowAmt = Math.max(0, parseInt(borrowAmountInput, 10) || 0);
  const calcDailyInterest = Math.ceil(parsedBorrowAmt * effectiveBorrowRate);
  let simDebt = parsedBorrowAmt;
  for (let d = 0; d < selectedTerm; d++) {
    simDebt += Math.ceil(simDebt * effectiveBorrowRate);
  }

  // Handle Roadmap Analysis
  const handleAnalyzeRoadmap = async () => {
    setIsAnalyzingRoadmap(true);
    try {
      const quests = state.quests.filter(q => q.status !== 'completed');
      const avgReward = quests.length > 0
        ? Math.round(quests.reduce((acc, q) => acc + (q.rewardCoins || 10), 0) / quests.length)
        : 15;
      const targetDebt = parsedBorrowAmt || 30;
      const dailyEarn = Math.max(10, avgReward * 2);
      const estDaysCount = Math.max(1, Math.ceil(targetDebt / (dailyEarn * (deductPercent / 100))));

      setRoadmapData({
        advice: `Dựa trên năng lực hiện tại (${quests.length} nhiệm vụ sẵn sàng), bạn có thể hoàn thành khoản vay một cách an toàn và bền vững.`,
        repaymentPlan: `Mỗi ngày hoàn thành 2-3 nhiệm vụ, trích ${deductPercent}% thưởng (~${Math.round(dailyEarn * (deductPercent / 100))} Vàng/ngày) để trả nợ.`,
        estDays: `${estDaysCount}-${estDaysCount + 1} ngày`,
        dailyIncome: `Thu nhập: ~${dailyEarn} Vàng/ngày`,
      });
    } catch {
      triggerToast('Không thể phân tích lộ trình lúc này', 'error');
    } finally {
      setIsAnalyzingRoadmap(false);
    }
  };

  const handleBorrowSubmit = async () => {
    const amt = parseInt(borrowAmountInput, 10);
    if (isNaN(amt) || amt <= 0 || amt > calculatedLimit) return;
    setIsBorrowing(true);
    try {
      await executeBankBorrow(amt, selectedTerm, deductPercent / 100);
      setBorrowAmountInput('');
      setNegotiatedTerms(null);
      setShowDebate(false);
    } finally {
      setIsBorrowing(false);
    }
  };

  const handleRepaySubmit = async () => {
    if (!loan || (loan.debt || 0) <= 0) return;
    setIsRepaying(true);
    try {
      await executeBankRepay();
    } finally {
      setIsRepaying(false);
    }
  };

  const handleQuickBorrowAmount = (val: number | 'max') => {
    if (val === 'max') {
      setBorrowAmountInput(String(calculatedLimit));
    } else {
      setBorrowAmountInput(String(Math.min(calculatedLimit, val)));
    }
  };

  return (
    <div className="rpg-panel rounded-2xl p-4 sm:p-5 border-2 border-indigo-500/40 border-t-4 border-t-indigo-500 bg-gradient-to-b from-indigo-500/[0.07] via-transparent to-transparent flex flex-col justify-between shadow-xs">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-indigo-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xl shrink-0">
              💳
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-indigo-700 dark:text-indigo-300">
                  VAY VÀNG
                </h3>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 uppercase tracking-wide">
              💳 Chi Tiêu Trước
            </span>
            <button
              id="bank-credit-limit-badge"
              onClick={openCreditLimitModal}
              type="button"
              className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/15 hover:bg-indigo-500/25 active:scale-95 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 inline-flex items-center gap-1 cursor-pointer transition shadow-2xs"
              title="Bấm để xem công thức tính & cách nâng hạn mức"
            >
              <span>Hạn mức: {calculatedLimit}</span> <span className="coin-icon"></span>
            </button>
          </div>
        </div>

        {/* Tình trạng nợ hiện tại (Hiện khi có nợ) */}
        {hasActiveLoan && loan && loanCountdownInfo && (
          <div
            id="bank-loan-active-box"
            className="mb-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600 dark:text-slate-400 font-bold">Tổng nợ hiện tại:</span>
              <span
                id="bank-current-debt"
                className="font-mono font-black text-rose-600 dark:text-rose-400 text-base inline-flex items-center gap-1"
              >
                {loan.debt} <span className="coin-icon"></span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] my-2 p-2 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-indigo-500/15">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Vốn gốc:</span>
                <span id="bank-loan-principal" className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                  {loan.principal || loan.debt} <span className="coin-icon"></span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Lãi phát sinh:</span>
                <span id="bank-loan-accrued-interest" className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                  +{Math.max(0, (loan.debt || 0) - (loan.principal || 0))} <span className="coin-icon"></span>
                </span>
              </div>
            </div>

            {/* 2 Đồng hồ đếm ngược cho khoản vay */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2.5">
              {/* 1. Đếm ngược tính lãi chu kỳ 24h */}
              <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                    <span>⏱️</span> <span>Tính lãi sau:</span>
                  </span>
                  <span id="bank-loan-next-interest-amount" className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400">
                    +{loanCountdownInfo.nextInterestAmount} 🪙
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span
                    id="bank-loan-next-accrual-countdown"
                    className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400 tracking-wider"
                  >
                    {loanCountdownInfo.nextAccrualFormatted}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">chu kỳ 24h</span>
                </div>
              </div>

              {/* 2. Đếm ngược hết kỳ hạn vay */}
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <span>⏳</span> <span>Hết hạn vay:</span>
                  </span>
                  <span id="bank-loan-term-badge" className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono">
                    {loan.termDays || 7} ngày
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span
                    id="bank-loan-expire-countdown"
                    className="text-sm font-mono font-black text-amber-600 dark:text-amber-400 tracking-wider"
                  >
                    {loanCountdownInfo.expireFormatted}
                  </span>
                  <span
                    id="bank-loan-expire-status"
                    className={`text-[10px] font-medium ${
                      loanCountdownInfo.isOverdue ? 'text-rose-600 font-bold' : 'text-amber-600'
                    }`}
                  >
                    {loanCountdownInfo.isOverdue ? `Quá hạn ${loanCountdownInfo.overdueDays} ngày` : 'Trong hạn'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Lãi suất:</span>
              <span id="bank-active-borrow-rate" className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                {((loan.borrowRate || rates.borrowRate) * 100).toFixed(1)}%/ngày
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
              <span>Trích thưởng:</span>
              <span id="bank-active-deduct-rate" className="font-semibold text-slate-700 dark:text-slate-300">
                {Math.round((loan.autoDeductPercent || 0.5) * 100)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
              <span>Thời hạn:</span>
              <span id="bank-loan-days-left" className="font-semibold text-amber-600">
                {loan.termDays || 7} ngày
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
              <span>Tất toán sớm:</span>
              <span id="bank-early-repay-penalty-label" className="font-semibold text-amber-600 dark:text-amber-400">
                5% phí trả trước hạn
              </span>
            </div>
          </div>
        )}

        {/* Form đăng ký vay mới */}
        {!hasActiveLoan && (
          <div id="bank-loan-form-box" className="space-y-3">
            {/* Trợ lý AI Tư Vấn & Thương Lượng */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-blue-500/10 border border-indigo-500/30 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🤖</span>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <span>TRỢ LÝ VAY VÀNG</span>
                      <span
                        id="bank-ai-recommend-tag"
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                      >
                        Nên vay vừa sức
                      </span>
                    </h4>
                  </div>
                </div>
                <button
                  id="btn-toggle-bank-ai-chat"
                  type="button"
                  onClick={() => setShowDebate(!showDebate)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition cursor-pointer shrink-0 shadow-2xs inline-flex items-center gap-1"
                >
                  <span>💬</span> <span id="btn-toggle-bank-ai-text">{showDebate ? 'Thu gọn' : 'Thương Lượng'}</span>
                </button>
              </div>

              {/* Lời khuyên & Lộ trình trả nợ từ AI */}
              <div id="bank-ai-consult-card" className="text-xs space-y-2 pt-1 border-t border-indigo-500/15">
                <div id="bank-ai-consult-trigger" className="space-y-1.5 py-1">
                  <button
                    id="btn-analyze-loan-roadmap"
                    type="button"
                    onClick={handleAnalyzeRoadmap}
                    disabled={isAnalyzingRoadmap}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <span>🧭</span>
                    <span id="btn-analyze-loan-text">
                      {isAnalyzingRoadmap ? 'Đang phân tích...' : 'Phân tích lộ trình trả nợ'}
                    </span>
                  </button>
                  <p id="bank-ai-consult-hint" className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                    AI sẽ tính toán thu nhập từ các nhiệm vụ hiện có để gợi ý gói vay an toàn
                  </p>
                </div>

                {roadmapData && (
                  <>
                    <div id="bank-ai-advice-text" className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed italic">
                      {roadmapData.advice}
                    </div>

                    <div
                      id="bank-ai-roadmap-box"
                      className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-500/20 text-[11px] space-y-1"
                    >
                      <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                        <span>🧭</span> <span>Lộ trình làm việc trả nợ:</span>
                      </div>
                      <p id="bank-ai-repayment-plan" className="text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                        {roadmapData.repaymentPlan}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-200/60 dark:border-slate-800/80 mt-1">
                        <span>
                          Dự kiến hoàn thành: <b id="bank-ai-est-days" className="text-indigo-600 dark:text-indigo-400 font-mono">{roadmapData.estDays}</b>
                        </span>
                        <span id="bank-ai-daily-income-tag" className="text-slate-400 font-mono">
                          {roadmapData.dailyIncome}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Thỏa thuận thương lượng đã chốt */}
                {negotiatedTerms && (
                  <div
                    id="bank-negotiated-badge"
                    className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-800 dark:text-emerald-200 font-semibold flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1">
                      <span>✓</span> <span>Đã chốt ưu đãi với AI:</span>
                      <span id="bank-negotiated-terms" className="font-bold font-mono">
                        {negotiatedTerms.newBorrowRate
                          ? `Lãi ${(negotiatedTerms.newBorrowRate * 100).toFixed(1)}%/ngày`
                          : ''}
                        {negotiatedTerms.newCreditLimit
                          ? ` • Hạn mức ${negotiatedTerms.newCreditLimit} Vàng`
                          : ''}
                      </span>
                    </span>
                    <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">
                      Đã chốt ưu đãi
                    </span>
                  </div>
                )}
              </div>

              {/* Hộp Chat Thương Lượng Khoản Vay */}
              {showDebate && (
                <AiNegotiationChat
                  type="loan"
                  loan={{
                    amount: parsedBorrowAmt || 30,
                    borrowRate: effectiveBorrowRate,
                    autoDeductPercent: deductPercent / 100,
                    creditLimit: calculatedLimit,
                    termDays: selectedTerm,
                  }}
                  onLoanTermsUpdated={terms => {
                    setNegotiatedTerms(terms);
                    if (terms.newAutoDeductPercent) {
                      setDeductPercent(Math.round(terms.newAutoDeductPercent * 100));
                    }
                    if (terms.newAmount) {
                      setBorrowAmountInput(String(terms.newAmount));
                    }
                  }}
                />
              )}
            </div>

            {/* Chọn Kỳ Hạn Vay Multi-Term Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Kỳ Hạn Vay:
              </label>
              <div className="grid grid-cols-2 xs:grid-cols-4 gap-1.5">
                {[3, 7, 14, 30].map(days => {
                  const cfg = LOAN_TERMS[days];
                  const isSelected = selectedTerm === days;
                  const ratePct = ((rates.borrowRate * cfg.rateMultiplier) * 100).toFixed(1);
                  return (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setSelectedTerm(days)}
                      data-borrow-term-days={days}
                      className={`bank-borrow-term-btn flex-1 py-2 px-1 rounded-xl text-center transition cursor-pointer ${
                        isSelected
                          ? 'font-bold text-xs bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-500 shadow-xs'
                          : 'font-medium text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50'
                      }`}
                    >
                      <span className="block text-sm">{cfg.icon}</span>
                      <span className="block text-[11px] font-bold">{cfg.label}</span>
                      <span
                        id={`bank-borrow-term-rate-${days}`}
                        className="block text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400"
                      >
                        {ratePct}%/ngày
                      </span>
                    </button>
                  );
                })}
              </div>
              <div
                id="bank-borrow-term-note"
                className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800"
              >
                <span id="bank-borrow-term-note-text">
                  {termConfig.icon} <strong>Gói {termConfig.label}:</strong> {termConfig.desc}. Sau {termConfig.days} ngày chưa tất toán sẽ tạm đóng băng Cửa Hàng.
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="input-borrow-amount"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Số Vàng vay:
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  id="input-borrow-amount"
                  min="1"
                  max={calculatedLimit}
                  value={borrowAmountInput}
                  onChange={e => setBorrowAmountInput(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 transition font-mono pr-10"
                />
                <span className="absolute right-3 pointer-events-none flex items-center">
                  <span className="coin-icon"></span>
                </span>
              </div>
            </div>

            {/* Quick amount chips for borrowing */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 mr-1">Nhanh:</span>
              {[10, 25, 50].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleQuickBorrowAmount(v)}
                  className="px-2 py-0.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500/20 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  {v}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleQuickBorrowAmount('max')}
                className="px-2 py-0.5 rounded-lg text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold transition cursor-pointer"
              >
                Tối Đa
              </button>
            </div>

            {/* Máy tính dự tính lãi vay & hoàn trả nợ */}
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 text-xs">
                  <span>🧮</span> <span>Dự Tính Lãi Vay</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Lãi suất:{' '}
                  <b id="calc-borrow-rate-label" className="text-indigo-600 dark:text-indigo-400 font-mono">
                    {(effectiveBorrowRate * 100).toFixed(1)}%/ngày
                  </b>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-indigo-500/15">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Lãi mỗi ngày:</span>
                  <span
                    id="calc-borrow-daily-interest"
                    className="font-bold font-mono text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1"
                  >
                    +{calcDailyInterest} <span className="coin-icon"></span>/ngày
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-indigo-500/15">
                  <span id="calc-borrow-total-label" className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    Tổng hoàn trả sau {selectedTerm} ngày:
                  </span>
                  <span
                    id="calc-borrow-total-debt"
                    className="font-bold font-mono text-rose-600 dark:text-rose-400 inline-flex items-center gap-1"
                  >
                    {simDebt} <span className="coin-icon"></span>
                  </span>
                </div>
              </div>
            </div>

            {/* Thanh trượt chọn tỷ lệ trích nợ */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Trích thưởng nhiệm vụ trả nợ:
                </span>
                <span id="deduct-percent-label" className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {deductPercent}%
                </span>
              </div>
              <input
                type="range"
                id="input-deduct-percent"
                min="20"
                max="80"
                step="5"
                value={deductPercent}
                onChange={e => setDeductPercent(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5 font-mono">
                <span>20%</span>
                <span>50%</span>
                <span>80%</span>
              </div>
            </div>

            {/* Lời khuyên & Ghi chú tỷ lệ trích nợ */}
            <div
              id="bank-appraisal-box"
              className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center justify-between"
            >
              <span id="bank-appraisal-text" className="truncate">
                💡 <strong>Trích {deductPercent}%:</strong>{' '}
                {deductPercent <= 30
                  ? 'Thảnh thơi nhưng trả nợ chậm hơn'
                  : deductPercent >= 70
                  ? 'Trả nợ siêu tốc, hạn mức tối đa'
                  : 'Tỷ lệ cân bằng lý tưởng'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Nút hành động Vay & Trả Nợ */}
      <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <button
          id="btn-bank-borrow"
          type="button"
          onClick={handleBorrowSubmit}
          disabled={hasActiveLoan || isBorrowing || parsedBorrowAmt <= 0 || parsedBorrowAmt > calculatedLimit}
          className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>⚡</span> <span>{isBorrowing ? 'Đang Xử Lý...' : 'Vay Vàng Tiêu Ngay'}</span>
        </button>
        <button
          id="btn-bank-repay"
          type="button"
          onClick={handleRepaySubmit}
          disabled={!hasActiveLoan || isRepaying || userCoins <= 0}
          className="py-2.5 px-4 rounded-xl text-xs font-bold transition border border-rose-500/40 hover:bg-rose-500/15 active:scale-95 text-rose-700 dark:text-rose-300 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>💳</span> <span>{isRepaying ? 'Đang Trả...' : 'Trả Nợ Sớm'}</span>
        </button>
      </div>
    </div>
  );
}
