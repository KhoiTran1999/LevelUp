'use client';

import React from 'react';
import { useLevelUp } from '@/components/providers/LevelUpProvider';

export function BankRulesModal() {
  const { isBankRulesModalOpen, closeBankRulesModal } = useLevelUp();

  if (!isBankRulesModalOpen) return null;

  return (
    <div
      id="modal-bank-rules-info"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-bank-rules-title"
    >
      <div className="rpg-panel rounded-2xl w-full sm:max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden modal-fade shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-100 dark:bg-slate-900 px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏦</span>
            <h3
              id="modal-bank-rules-title"
              className="font-rpg-title font-extrabold text-sm sm:text-base text-emerald-600 dark:text-emerald-400"
            >
              QUY TẮC & CƠ CHẾ NGÂN HÀNG
            </h3>
          </div>
          <button
            type="button"
            onClick={closeBankRulesModal}
            className="modal-close w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition shrink-0 active:scale-95"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-3.5 overflow-y-auto text-xs text-slate-700 dark:text-slate-300">
          {/* 1. Gói kỳ hạn & Lãi suất */}
          <div
            id="bank-rule-savings-terms"
            className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5 transition-all duration-300"
          >
            <div className="font-bold text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-1.5">
              <span>🌱</span> <span>1. Gói Kỳ Hạn Tiết Kiệm & Lãi Suất</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Hệ thống áp dụng lãi suất cơ sở động từ quỹ vốn AMM (~0.12% - 0.25%/ngày). Bạn có thể chọn 4 gói kỳ hạn:
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
              <li>
                <strong>Linh Hoạt (0 ngày):</strong> Lãi suất chuẩn, rút bất cứ lúc nào bảo toàn 100% gốc và lãi.
              </li>
              <li>
                <strong>7 Ngày:</strong> Thưởng <strong>+30%</strong> lãi suất so với lãi cơ sở.
              </li>
              <li>
                <strong>14 Ngày:</strong> Thưởng <strong>+60%</strong> lãi suất so với lãi cơ sở.
              </li>
              <li>
                <strong>30 Ngày:</strong> Thưởng <strong>+100%</strong> (gấp đôi lãi suất cơ sở!).
              </li>
            </ul>
            <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium pt-1 border-t border-emerald-500/20">
              ⚠️ <em>Rút trước hạn ở các gói cố định sẽ bị thu hồi toàn bộ tiền lãi tích lũy (gốc luôn được bảo toàn 100%).</em>
            </div>
          </div>

          {/* 2. Thưởng chuỗi kỷ luật (Streak) */}
          <div
            id="bank-rule-streak"
            className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5 transition-all duration-300"
          >
            <div className="font-bold text-amber-700 dark:text-amber-400 text-xs flex items-center gap-1.5">
              <span>🔥</span> <span>2. Thưởng Kỷ Luật Chuỗi Ngày (Streak)</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Mỗi khi bạn duy trì chuỗi hoàn thành nhiệm vụ đều đặn, lãi suất gửi tiết kiệm được nhân thêm:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-amber-500/15">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Streak ≥ 7 ngày:</span>
                <span className="block text-[10px] text-slate-500">
                  Thưởng <strong>+50% lãi suất</strong> (x1.5)
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-amber-500/15">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Streak ≥ 3 ngày:</span>
                <span className="block text-[10px] text-slate-500">
                  Thưởng <strong>+30% lãi suất</strong> (x1.3)
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-amber-500/15">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Streak ≥ 1 ngày:</span>
                <span className="block text-[10px] text-slate-500">
                  Thưởng <strong>+15% lãi suất</strong> (x1.15)
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-amber-500/15">
                <span className="font-bold text-amber-600 dark:text-amber-400">Streak 0 ngày:</span>
                <span className="block text-[10px] text-slate-500">Giảm 20% lãi suất (x0.8)</span>
              </div>
            </div>
          </div>

          {/* 3. Quy tắc chống lạm phát */}
          <div
            id="bank-rule-anti-inflation"
            className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 space-y-1.5 transition-all duration-300"
          >
            <div className="font-bold text-blue-700 dark:text-blue-400 text-xs flex items-center gap-1.5">
              <span>🛡️</span> <span>3. Quy Tắc Bảo Vệ Kinh Tế RPG</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              <li>
                <strong>Lãi suất bậc thang:</strong> Dưới 100 Vàng tính 100% gốc; từ 101 - 500 Vàng tính 70%; từ 501 - 2000 Vàng tính 40%; trên 2000 Vàng tính 10%.
              </li>
              <li>
                <strong>Trần lãi suất ngày:</strong> Mỗi ngày nhận tối đa <strong>8 Vàng lãi</strong> để bảo đảm giá trị đồng Vàng trong game không bị lạm phát.
              </li>
            </ul>
          </div>

          {/* 4. Quy tắc vay vàng */}
          <div
            id="bank-rule-borrow"
            className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/25 space-y-1.5 transition-all duration-300"
          >
            <div className="font-bold text-purple-700 dark:text-purple-400 text-xs flex items-center gap-1.5">
              <span>⚡</span> <span>4. Quy Định Kỳ Hạn Vay Vàng & Trả Nợ</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              <li>
                <strong>Đa dạng kỳ hạn vay:</strong> 4 gói kỳ hạn linh hoạt: <strong>3 Ngày (4.5%/ngày)</strong>, <strong>7 Ngày (5.0%/ngày - Chuẩn)</strong>, <strong>14 Ngày (5.5%/ngày)</strong>, <strong>30 Ngày (6.0%/ngày)</strong>.
              </li>
              <li>
                <strong>Trả nợ không phí:</strong> Hệ thống tự động trích từ Vàng thưởng mỗi khi bạn hoàn thành nhiệm vụ, hoàn toàn <strong>miễn 100% phí phạt</strong>.
              </li>
              <li>
                <strong>Phí phạt tất toán sớm:</strong> Nếu tự bấm trả nợ bằng ví Vàng trước khi đến hạn, áp dụng phí 5% (tối thiểu 1 Vàng).
              </li>
              <li>
                <strong>Quá hạn kỳ hạn:</strong> Nếu quá số ngày đã chọn mà chưa trả hết nợ: Đóng băng Cửa Hàng & Túi Đồ cho đến khi hoàn thành nhiệm vụ trả hết nợ.
              </li>
            </ul>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={closeBankRulesModal}
              className="modal-close px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
            >
              Đã Hiểu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
