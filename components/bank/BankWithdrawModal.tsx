'use client';

import React, { useState, useEffect } from 'react';
import { useLevelUp } from '@/components/providers/LevelUpProvider';
import { BANK_TERMS } from './bank-utils';

export function BankWithdrawModal() {
  const {
    isBankWithdrawModalOpen,
    closeBankWithdrawModal,
    state,
    executeBankWithdraw,
    selectedWithdrawDepositId,
  } = useLevelUp();

  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [withdrawInput, setWithdrawInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bank = state.profile?.bank;
  const deposits = Array.isArray(bank?.deposits) ? bank.deposits : [];
  const now = Date.now();

  // Nguồn khả dụng rút linh hoạt (0 ngày hoặc đã đáo hạn)
  const safeDeposits = deposits.filter(
    d => d.termDays === 0 || d.status === 'matured' || (d.maturityAt && (d.maturityAt - now) <= 5000)
  );
  const safeDeposited = safeDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);
  const safeInterest = safeDeposits.reduce((sum, d) => sum + (d.interest || 0), 0);
  const safeTotal = safeDeposited + safeInterest;

  // Khởi tạo nguồn tiền khi mở modal
  useEffect(() => {
    if (isBankWithdrawModalOpen) {
      if (selectedWithdrawDepositId && deposits.some(d => d.id === selectedWithdrawDepositId)) {
        setSelectedSource(selectedWithdrawDepositId);
      } else if (safeDeposits.length > 1) {
        setSelectedSource('all');
      } else if (safeDeposits.length === 1) {
        setSelectedSource(safeDeposits[0].id);
      } else if (deposits.length > 0) {
        setSelectedSource(deposits[0].id);
      } else {
        setSelectedSource('all');
      }
    }
  }, [isBankWithdrawModalOpen, selectedWithdrawDepositId, deposits, safeDeposits.length]);

  // Tìm sổ được chọn nếu chọn sổ cụ thể
  const targetDeposit = selectedSource !== 'all'
    ? deposits.find(d => d.id === selectedSource)
    : null;

  const isTermDeposit = Boolean(targetDeposit && targetDeposit.termDays > 0);
  const isEarlyTerm = Boolean(
    isTermDeposit &&
    targetDeposit &&
    targetDeposit.status !== 'matured' &&
    (!targetDeposit.maturityAt || (targetDeposit.maturityAt - now) > 5000)
  );

  // Số dư tính toán theo nguồn được chọn
  let currentDeposited = 0;
  let currentInterest = 0;
  let currentTotal = 0;

  if (targetDeposit) {
    currentDeposited = targetDeposit.amount || 0;
    currentInterest = isEarlyTerm ? 0 : (targetDeposit.interest || 0);
    currentTotal = isEarlyTerm ? targetDeposit.amount : ((targetDeposit.amount || 0) + (targetDeposit.interest || 0));
  } else {
    currentDeposited = safeDeposited;
    currentInterest = safeInterest;
    currentTotal = safeTotal;
  }

  // Tự động điền số tiền rút khi đổi nguồn
  useEffect(() => {
    if (isTermDeposit) {
      setWithdrawInput(String(currentTotal));
    } else {
      setWithdrawInput('');
    }
  }, [selectedSource, isTermDeposit, currentTotal]);

  if (!isBankWithdrawModalOpen) return null;

  const parsedAmount = isTermDeposit
    ? currentTotal
    : Math.max(0, parseInt(withdrawInput, 10) || 0);

  // Phân bổ tiền rút (ưu tiên rút lãi trước, gốc sau)
  const allocInterest = isEarlyTerm
    ? 0
    : Math.min(currentInterest, parsedAmount);
  const allocPrincipal = isEarlyTerm
    ? parsedAmount
    : Math.min(currentDeposited, Math.max(0, parsedAmount - allocInterest));
  const allocTotal = isEarlyTerm
    ? parsedAmount
    : (allocInterest + allocPrincipal);
  const remainingPrincipal = Math.max(0, currentDeposited - allocPrincipal);

  const handlePreset = (preset: number | 'interest' | 'all') => {
    if (isTermDeposit) return;
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
    const amt = isTermDeposit ? currentTotal : parseInt(withdrawInput, 10);
    if (isNaN(amt) || amt <= 0 || amt > currentTotal) return;
    setIsSubmitting(true);
    try {
      const depositIdToPass = targetDeposit ? targetDeposit.id : undefined;
      await executeBankWithdraw(amt, depositIdToPass);
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
              RÚT TIỀN TIẾT KIỆM
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
          {/* Nguồn rút tiền: Cho phép chọn nếu có nhiều sổ */}
          {deposits.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="select-withdraw-source" className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Chọn nguồn rút:
              </label>
              <select
                id="select-withdraw-source"
                value={selectedSource}
                onChange={e => setSelectedSource(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {/* ponytail: Chỉ hiển thị tùy chọn gộp khi có từ 2 nguồn khả dụng trở lên để tránh trùng lặp với sổ linh hoạt đơn lẻ */}
                {safeDeposits.length > 1 && (
                  <option value="all">
                    ⚡ Rút tất cả nguồn khả dụng ({safeTotal} Vàng)
                  </option>
                )}
                {deposits.map(dep => {
                  const cfg = BANK_TERMS[dep.termDays] || BANK_TERMS[0];
                  const isMatured = dep.status === 'matured' || (dep.termDays > 0 && dep.maturityAt && now >= dep.maturityAt);
                  const statusLabel = dep.termDays === 0
                    ? 'Linh hoạt'
                    : isMatured
                    ? 'Đã đáo hạn'
                    : 'Đang khóa';
                  return (
                    <option key={dep.id} value={dep.id}>
                      {cfg.icon} Sổ {cfg.label} ({dep.amount} Vàng) • {statusLabel}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Ghi chú trạng thái nếu là sổ kỳ hạn */}
          {isEarlyTerm && targetDeposit && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] space-y-0.5">
              <span className="font-bold flex items-center gap-1">
                <span>⚠️</span> <span>Rút trước hạn:</span>
              </span>
              <p>
                Sổ này chưa đáo hạn. Rút sớm sẽ bị hủy <strong>+{targetDeposit.interest || 0} Vàng</strong> tiền lãi và nhận lại đúng <strong>{targetDeposit.amount} Vàng</strong> gốc.
              </p>
            </div>
          )}

          {isTermDeposit && !isEarlyTerm && targetDeposit && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] space-y-0.5">
              <span className="font-bold flex items-center gap-1">
                <span>🎉</span> <span>Sổ đã đáo hạn:</span>
              </span>
              <p>
                Nhận trọn vẹn <strong>{targetDeposit.amount} Vàng gốc</strong> + <strong>{targetDeposit.interest || 0} Vàng lãi</strong> về ví.
              </p>
            </div>
          )}

          {/* Thẻ thống kê số dư */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">🏦 Vốn gốc:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1">
                <span id="withdraw-modal-deposited">{currentDeposited}</span> <span className="coin-icon"></span>
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">
                {isEarlyTerm ? '🌱 Tiền lãi (Hủy khi rút sớm):' : '🌱 Tiền lãi tích lũy:'}
              </span>
              <span
                className={`font-mono font-bold inline-flex items-center gap-1 ${
                  isEarlyTerm ? 'text-rose-500 line-through' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {isEarlyTerm ? `+${targetDeposit?.interest || 0}` : `+${currentInterest}`} <span className="coin-icon"></span>
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-emerald-500/20 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">💰 Tổng nhận về ví:</span>
              <span className="font-mono font-extrabold text-amber-500 dark:text-amber-400 text-sm inline-flex items-center gap-1">
                <span id="withdraw-modal-total">{currentTotal}</span> <span className="coin-icon"></span>
              </span>
            </div>
          </div>

          {/* Ô nhập số Vàng muốn rút */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="input-withdraw-amount" className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {isTermDeposit ? 'Số Vàng tất toán:' : 'Nhập số Vàng muốn rút:'}
              </label>
              {!isTermDeposit && <span className="text-[10px] text-slate-400">Tối thiểu: 1 Vàng</span>}
            </div>
            <div className="relative flex items-center">
              <input
                type="number"
                id="input-withdraw-amount"
                min="1"
                max={currentTotal}
                placeholder="Nhập số Vàng..."
                value={isTermDeposit ? currentTotal : withdrawInput}
                disabled={isTermDeposit || currentTotal <= 0}
                readOnly={isTermDeposit}
                onChange={e => setWithdrawInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono font-bold pr-8 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:opacity-80"
              />
              <span className="absolute right-2.5 pointer-events-none flex items-center scale-90">
                <span className="coin-icon"></span>
              </span>
            </div>
          </div>

          {/* Các nút chọn nhanh (khi rút linh hoạt) */}
          {!isTermDeposit && (
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Chọn nhanh số tiền:</span>
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  type="button"
                  id="btn-withdraw-preset-interest"
                  onClick={() => handlePreset('interest')}
                  disabled={currentInterest <= 0 || currentTotal <= 0}
                  className="px-1 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/20 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition text-center truncate cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Chỉ rút tiền lãi đã sinh"
                >
                  Chỉ rút Lãi
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(0.25)}
                  disabled={currentTotal <= 0}
                  className="py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition text-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(0.5)}
                  disabled={currentTotal <= 0}
                  className="py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition text-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(0.75)}
                  disabled={currentTotal <= 0}
                  className="py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition text-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('all')}
                  disabled={currentTotal <= 0}
                  className="py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition text-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Tất cả
                </button>
              </div>
            </div>
          )}

          {/* Bảng phân bổ số tiền rút */}
          <div
            id="withdraw-allocation-box"
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2"
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

            <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
              <p id="withdraw-explanation-note" className="leading-relaxed">
                💡 Ưu tiên rút hết tiền lãi trước. Phần vốn gốc còn lại (
                <strong id="withdraw-remaining-principal" className="font-mono text-slate-700 dark:text-slate-300">
                  {remainingPrincipal}
                </strong>{' '}
                Vàng) tiếp tục sinh lãi.
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
              disabled={isSubmitting || parsedAmount <= 0 || parsedAmount > currentTotal || currentTotal <= 0}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isSubmitting ? 'Đang Xử Lý...' : `Rút Về Ví (${allocTotal} 🪙)`}</span> <span>📤</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
