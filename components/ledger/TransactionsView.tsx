'use client';

import React, { useState } from 'react';
import type { LedgerEntry } from '@/types/levelup';
import { useLevelUp } from '@/components/providers/LevelUpProvider';
import {
  LEDGER_PAGE_SIZE,
  filterLedgerEntries,
  groupLedgerByDate,
  getLedgerCategoryConfig,
  type LedgerFilterType,
} from './ledger-utils';

interface TransactionsViewProps {
  ledger: LedgerEntry[];
}

export function TransactionsView({ ledger }: TransactionsViewProps) {
  const { openProofViewer, startupStatus } = useLevelUp();
  const isLoading = startupStatus === 'loading';
  const [filter, setFilter] = useState<LedgerFilterType>('all');
  const [page, setPage] = useState<number>(1);
  const [expandedDescIds, setExpandedDescIds] = useState<Record<string, boolean>>({});

  const filtered = filterLedgerEntries(ledger, filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / LEDGER_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const startIdx = (currentPage - 1) * LEDGER_PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + LEDGER_PAGE_SIZE);
  const grouped = groupLedgerByDate(pageItems);

  const handleFilterChange = (newFilter: LedgerFilterType) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handlePageChange = (delta: number) => {
    setPage(prev => Math.min(totalPages, Math.max(1, prev + delta)));
  };

  const toggleDesc = (id: string) => {
    setExpandedDescIds(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleOpenProof = (entry: LedgerEntry) => {
    openProofViewer({
      imageUrl: entry.proofImageUrl || null,
      questTitle: entry.title || entry.description,
      userNote: entry.proofUserNote || entry.userNote || '',
      feedback: entry.proofFeedback || entry.feedback || '',
      timestamp: entry.timestamp || null,
    });
  };

  return (
    <>
      {/* 4 Bộ Lọc Giao Dịch */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button
          id="ledger-filter-all"
          type="button"
          onClick={() => handleFilterChange('all')}
          className={`ledger-filter-btn px-3 py-1 rounded-xl text-xs transition cursor-pointer ${
            filter === 'all'
              ? 'font-bold bg-sky-500 text-white shadow-xs shadow-sky-500/20'
              : 'font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Tất Cả
        </button>
        <button
          id="ledger-filter-earn"
          type="button"
          onClick={() => handleFilterChange('earn')}
          className={`ledger-filter-btn px-3 py-1 rounded-xl text-xs transition cursor-pointer ${
            filter === 'earn'
              ? 'font-bold bg-sky-500 text-white shadow-xs shadow-sky-500/20'
              : 'font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Thu Nhập (+)
        </button>
        <button
          id="ledger-filter-spend"
          type="button"
          onClick={() => handleFilterChange('spend')}
          className={`ledger-filter-btn px-3 py-1 rounded-xl text-xs transition cursor-pointer ${
            filter === 'spend'
              ? 'font-bold bg-sky-500 text-white shadow-xs shadow-sky-500/20'
              : 'font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Đổi Quà (-)
        </button>
        <button
          id="ledger-filter-bank"
          type="button"
          onClick={() => handleFilterChange('bank')}
          className={`ledger-filter-btn px-3 py-1 rounded-xl text-xs transition cursor-pointer ${
            filter === 'bank'
              ? 'font-bold bg-sky-500 text-white shadow-xs shadow-sky-500/20'
              : 'font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          🏦 Tiết Kiệm & Vay
        </button>
      </div>

      {/* Danh Sách Giao Dịch */}
      <div className="rpg-panel rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800">
        <div id="ledger-list" className="space-y-4">
          {isLoading ? (
            <div className="space-y-2.5" aria-label="Đang tải lịch sử giao dịch">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={`ledger-skel-${idx}`}
                  className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 animate-pulse flex items-center justify-between gap-3 select-none"
                >
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-2.5 w-1/4 rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                  <div className="h-4 w-14 rounded bg-slate-200 dark:bg-slate-700 shrink-0" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Chưa có giao dịch Vàng. Hãy hoàn thành nhiệm vụ hoặc đổi quà để ghi nhận.
            </div>
          ) : (
            Object.entries(grouped).map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                  <span>📅</span> <span>{dateLabel}</span>
                </div>
                <div className="space-y-2">
                  {items.map(entry => {
                    const isEarn = entry.type === 'earn';
                    const isBank = typeof entry.category === 'string' && entry.category.startsWith('bank_');
                    const catCfg = getLedgerCategoryConfig(entry);
                    const timeStr = new Date(entry.timestamp || Date.now()).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const displayTitle = entry.title || entry.description || 'Giao dịch';
                    const displayDesc =
                      entry.description && entry.description !== entry.title ? entry.description : '';
                    const isExpanded = Boolean(expandedDescIds[entry.id]);

                    const hasImage = Boolean(entry.proofImageUrl);
                    const hasNote = Boolean(entry.proofUserNote || entry.userNote);

                    return (
                      <div
                        key={entry.id}
                        className={`ledger-item p-3 rounded-xl bg-white dark:bg-slate-900/60 border ${
                          isBank ? 'border-amber-500/20' : 'border-slate-200 dark:border-slate-800'
                        } flex items-start justify-between gap-3 text-xs shadow-xs transition-all`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span className="text-base shrink-0 mt-0.5">{catCfg.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5 flex-wrap">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${catCfg.colorClass}`}>
                                {catCfg.label}
                              </span>
                              <span className="truncate">{displayTitle}</span>

                              {/* Proof viewing button */}
                              {hasImage && hasNote ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenProof(entry)}
                                  className="btn-view-proof-img shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 cursor-pointer ml-auto transition"
                                  title="Xem ảnh & báo cáo đã duyệt"
                                >
                                  <span>📸+📝 Xem bằng chứng</span>
                                </button>
                              ) : hasImage ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenProof(entry)}
                                  className="btn-view-proof-img shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 cursor-pointer ml-auto transition"
                                  title="Xem ảnh bằng chứng đã duyệt"
                                >
                                  <span>📸 Xem ảnh</span>
                                </button>
                              ) : hasNote ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenProof(entry)}
                                  className="btn-view-proof-img shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 cursor-pointer ml-auto transition"
                                  title="Xem báo cáo công việc đã duyệt"
                                >
                                  <span>📝 Xem báo cáo</span>
                                </button>
                              ) : null}
                            </div>

                            <div className="ledger-desc-container mt-0.5">
                              <div
                                onClick={() => toggleDesc(entry.id)}
                                className={`ledger-desc-content text-[10px] text-slate-400 cursor-pointer transition-colors hover:text-slate-600 dark:hover:text-slate-300 ${
                                  isExpanded ? '' : 'truncate'
                                }`}
                                title="Nhấn để xem thêm / thu gọn"
                              >
                                <span className="font-mono">{timeStr}</span>
                                {displayDesc && (
                                  <>
                                    {' · '}
                                    <span className="ledger-desc-text">{displayDesc}</span>
                                  </>
                                )}
                              </div>
                              {displayDesc && displayDesc.length > 50 && (
                                <button
                                  type="button"
                                  onClick={() => toggleDesc(entry.id)}
                                  className="btn-toggle-ledger-desc text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer block mt-0.5"
                                >
                                  {isExpanded ? 'thu gọn' : '...xem thêm'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`font-mono font-bold text-sm shrink-0 inline-flex items-center gap-1 ${
                            isEarn ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                          } pt-0.5`}
                        >
                          <span>
                            {isEarn ? '+' : '-'}
                            {entry.amount || 0}
                          </span>{' '}
                          <span className="coin-icon"></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Thanh Phân Trang */}
        {filtered.length > 0 && totalPages > 1 && (
          <div
            id="ledger-pagination"
            className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
          >
            <button
              id="ledger-prev-btn"
              type="button"
              onClick={() => handlePageChange(-1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition active:scale-95 cursor-pointer"
            >
              ◀ Trước
            </button>
            <span id="ledger-page-info" className="text-slate-500 dark:text-slate-400 font-mono text-xs">
              Trang {currentPage} / {totalPages} ({filtered.length} giao dịch)
            </span>
            <button
              id="ledger-next-btn"
              type="button"
              onClick={() => handlePageChange(1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition active:scale-95 cursor-pointer"
            >
              Sau ▶
            </button>
          </div>
        )}
      </div>
    </>
  );
}
