'use client';

import React, { useState, useEffect } from 'react';
import { useLevelUp } from '@/components/providers/LevelUpProvider';

export function BankWithdrawModal() {
  const {
    isBankWithdrawModalOpen,
    closeBankWithdrawModal,
    state,
    executeBankWithdraw,
    selectedWithdrawDepositId,
  } = useLevelUp();

  const [withdrawInput, setWithdrawInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bank = state.profile?.bank;
  const deposited = bank?.deposited || 0;
  const depositInterest = bank?.depositInterest || 0;
  const totalAvailable = deposited + depositInterest;

  // Selected single deposit if any
  const singleDeposit = selectedWithdrawDepositId && Array.isArray(bank?.deposits)
    ? bank.deposits.find(d => d.id === selectedWithdrawDepositId)
    : null;

  const currentDeposited = singleDeposit ? singleDeposit.amount : deposited;
  const currentInterest = singleDeposit ? singleDeposit.interest : depositInterest;
  const currentTotal = currentDeposited + currentInterest;

  // Reset input when modal opens or deposit changes
  useEffect(() => {
    if (isBankWithdrawModalOpen) {
      setWithdrawInput('');
    }
  }, [isBankWithdrawModalOpen, selectedWithdrawDepositId]);

  if (!isBankWithdrawModalOpen) return null;

  const parsedAmount = Math.max(0, parseInt(withdrawInput, 10) || 0);

  // Allocation calculation (Interest is withdrawn first)
  const allocInterest = Math.min(currentInterest, parsedAmount);
  const allocPrincipal = Math.min(currentDeposited, Math.max(0, parsedAmount - allocInterest));
  const allocTotal = allocInterest + allocPrincipal;
  const remainingPrincipal = Math.max(0, currentDeposited - allocPrincipal);

  const handlePreset = (preset: number | 'interest' | 'all') => {
    if (preset === 'interest') {
      setWithdrawInput(String(currentInterest));
    } else if (preset === 'all') {
      setWithdrawInput(String(currentTotal));
    } else {
      const amt = Math.floor(currentTotal * preset);
      setWithdrawInput(String(amt));
    }
  };

  const handleConfirm = async () => {
    const amt = parseInt(withdrawInput, 10);
    if (isNaN(amt) || amt <= 0) return;
    setIsSubmitting(true);
    try {
      await executeBankWithdraw(amt, selectedWithdrawDepositId || undefined);
      closeBankWithdrawModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="modal-bank-withdraw"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-bank-withdraw-title"
    >
      <div className="rpg-panel rounded-2xl w-full sm:max-w-md border border-emerald-500/40 overflow-hidden modal-fade shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-100 dark:bg-slate-900 px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg leading-none text-emerald-500">payments</span>
            <h3
              id="modal-bank-withdraw-title"
              className="font-rpg-title font-extrabold text-sm sm:text-base text-emerald-600 dark:text-emerald-400"
            >
              {singleDeposit ? `RÚT SỔ TIẾT KIỆM (${singleDeposit.termDays} NGÀY)` : 'RÚT TIỀN TIẾT KIỆM'}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeBankWithdrawModal}
            className="modal-close w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition shrink-0 active:scale-95"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs text-slate-700 dark:text-slate-300">
          {/* Thẻ thống kê số dư hiện có */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">🏦 Vốn gốc đã gửi:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1">
                <span id="withdraw-modal-deposited">{currentDeposited}</span> <span className="coin-icon"></span>
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">🌱 Tiền lãi tích lũy:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                +<span id="withdraw-modal-interest">{currentInterest}</span> <span className="coin-icon"></span>
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-emerald-500/20 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">💰 Tổng khả dụng rút:</span>
              <span className="font-mono font-extrabold text-amber-500 dark:text-amber-400 text-sm inline-flex items-center gap-1">
                <span id="withdraw-modal-total">{currentTotal}</span> <span className="coin-icon"></span>
              </span>
            </div>
          </div>

          {/* Ô nhập số Vàng muốn rút */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="input-withdraw-amount" className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Nhập số Vàng muốn rút:
              </label>
              <span className="text-[10px] text-slate-400">Tối thiểu: 1 Vàng</span>
            </div>
            <div className="relative flex items-center">
              <input
                type="number"
                id="input-withdraw-amount"
                min="1"
                max={currentTotal}
                placeholder="Nhập số Vàng..."
                value={withdrawInput}
                onChange={e => setWithdrawInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono font-bold pr-8 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="absolute right-2.5 pointer-events-none flex items-center scale-90">
                <span className="coin-icon"></span>
              </span>
            </div>
          </div>

          {/* Các nút chọn nhanh */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Chọn nhanh số tiền rút:</span>
            <div className="grid grid-cols-5 gap-1.5">
              <button
                type="button"
                id="btn-withdraw-preset-interest"
                onClick={() => handlePreset('interest')}
                disabled={currentInterest <= 0}
                className="px-1 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/20 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition text-center truncate cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Chỉ rút tiền lãi đã sinh"
              >
                Chỉ rút Lãi
              </button>
              <button
                type="button"
                onClick={() => handlePreset(0.25)}
                className="py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition text-center cursor-pointer"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => handlePreset(0.5)}
                className="py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition text-center cursor-pointer"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => handlePreset(0.75)}
                className="py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition text-center cursor-pointer"
              >
                75%
              </button>
              <button
                type="button"
                onClick={() => handlePreset('all')}
                className="py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition text-center cursor-pointer"
              >
                Tất cả
              </button>
            </div>
          </div>

          {/* Bảng phân bổ số tiền rút */}
          <div
            id="withdraw-allocation-box"
            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2"
          >
            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <span>📊</span> <span>Phân bổ số tiền rút:</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>🌱 Trích từ Tiền Lãi:</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400" id="withdraw-alloc-interest">
                  {allocInterest} Vàng
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>🏦 Trích từ Vốn Gốc:</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300" id="withdraw-alloc-principal">
                  {allocPrincipal} Vàng
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-800">
                <span className="font-bold text-emerald-700 dark:text-emerald-400">💰 Thực nhận về ví:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs" id="withdraw-alloc-total">
                  {allocTotal} Vàng
                </span>
              </div>
            </div>

            {/* Lời giải thích */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
              <p id="withdraw-explanation-note" className="leading-relaxed">
                💡 <strong>Cơ chế bảo vệ vốn:</strong> Hệ thống luôn ưu tiên rút hết Tiền Lãi trước. Phần Vốn Gốc còn lại (
                <strong id="withdraw-remaining-principal" className="font-mono text-slate-700 dark:text-slate-300">
                  {remainingPrincipal}
                </strong>{' '}
                Vàng) sẽ tiếp tục ở lại ngân hàng và sinh lời mỗi ngày!
              </p>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeBankWithdrawModal}
              className="modal-close px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              id="btn-confirm-withdraw-action"
              onClick={handleConfirm}
              disabled={isSubmitting || parsedAmount <= 0 || parsedAmount > currentTotal}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isSubmitting ? 'Đang Xử Lý...' : 'Rút Về Ví'}</span> <span>📤</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
