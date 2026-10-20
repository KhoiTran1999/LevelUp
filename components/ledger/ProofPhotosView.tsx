'use client';

import React, { useState } from 'react';
import type { ProofPhotoItem } from '@/types/levelup';
import { useLevelUp } from '@/components/providers/LevelUpProvider';

interface ProofPhotosViewProps {
  photos: ProofPhotoItem[];
}

export function ProofPhotosView({ photos }: ProofPhotosViewProps) {
  const { openProofViewer } = useLevelUp();
  const [loadedImgMap, setLoadedImgMap] = useState<Record<string, boolean>>({});

  const handleOpenPhoto = (item: ProofPhotoItem) => {
    openProofViewer({
      imageUrl: item.proofImageUrl || item.photoUrl || null,
      questTitle: item.questTitle || 'Bằng chứng nhiệm vụ',
      userNote: item.userNote || '',
      feedback: item.feedback || '',
      timestamp: item.timestamp || null,
    });
  };

  const hasPhotos = photos.length > 0;

  return (
    <div id="view-ledger-photos">
      {/* Header Thống Kê Album */}
      <div className="flex items-center justify-between gap-3 mb-4 p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-sky-500/20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xl shrink-0">
            📸
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Album Bằng Chứng Đã Duyệt
            </h3>
            <p id="ledger-photos-summary" className="text-[11px] text-slate-500 dark:text-slate-400">
              Toàn bộ ảnh chụp thực tế được AI Arbiter thẩm định và lưu trữ an toàn.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span
            id="ledger-photos-count"
            className="text-base sm:text-lg font-bold font-mono text-sky-600 dark:text-sky-400"
          >
            {photos.length}
          </span>
          <span className="text-[10px] text-slate-400 block">ảnh đã lưu</span>
        </div>
      </div>

      {/* Lưới Ảnh Bằng Chứng */}
      {hasPhotos ? (
        <div id="ledger-photos-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {photos.map(item => {
            const timeStr = new Date(item.timestamp || Date.now()).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const safeTitle = item.questTitle || 'Nhiệm vụ đã hoàn thành';
            const safeUrl = item.proofImageUrl || item.photoUrl || '';
            const isLoaded = Boolean(loadedImgMap[item.id]);

            return (
              <div
                key={item.id}
                data-proof-id={item.id}
                onClick={() => handleOpenPhoto(item)}
                className="proof-photo-card group rounded-2xl overflow-hidden bg-white dark:bg-slate-900/90 shadow-xs hover:shadow-md transition-all flex flex-col cursor-pointer border border-slate-200/60 dark:border-slate-800"
                title="Nhấn để xem chi tiết ảnh và ghi chú"
              >
                <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {/* Skeleton loader */}
                  {!isLoaded && (
                    <div className="proof-skeleton absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 pointer-events-none">
                      <svg
                        className="w-7 h-7 text-slate-300 dark:text-slate-600 animate-pulse"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}

                  <img
                    src={safeUrl}
                    alt={safeTitle}
                    loading="lazy"
                    onLoad={() =>
                      setLoadedImgMap(prev => ({
                        ...prev,
                        [item.id]: true,
                      }))
                    }
                    className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                      isLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                  />

                  {/* Coin Badge */}
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-500/90 text-white font-mono text-[10px] font-bold shadow-xs backdrop-blur-sm flex items-center gap-1 z-20">
                    <span>+{item.rewardCoins || 10}</span> <span className="coin-icon"></span>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold backdrop-blur-[1px] z-20">
                    <span className="btn-view-proof-img px-2.5 py-1 rounded-lg bg-sky-500/90 hover:bg-sky-400 text-white flex items-center gap-1 shadow-xs">
                      <span>🔍 Phóng to</span>
                    </span>
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4
                      className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors"
                      title={safeTitle}
                    >
                      {safeTitle}
                    </h4>

                    {item.userNote ? (
                      <div className="mt-1.5 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-1 leading-snug">
                        <span className="shrink-0 text-xs">📝</span>
                        <span className="line-clamp-2" title={item.userNote}>
                          {item.userNote}
                        </span>
                      </div>
                    ) : null}

                    {item.feedback ? (
                      <p
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 line-clamp-1 mt-1 italic"
                        title={item.feedback}
                      >
                        🤖 &quot;{item.feedback}&quot;
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono">{timeStr}</span>
                    <span className="text-sky-600 dark:text-sky-400 font-medium hover:underline">
                      Xem chi tiết ↗
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Empty State */}
      {!hasPhotos && (
        <div
          id="ledger-photos-empty"
          className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 rpg-panel"
        >
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center text-3xl">
            📸
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
            Chưa có ảnh bằng chứng nào
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Khi bạn hoàn thành các nhiệm vụ yêu cầu chụp ảnh từ điện thoại và được AI phê duyệt, ảnh sẽ tự động được lưu vào bộ sưu tập tại đây.
          </p>
        </div>
      )}
    </div>
  );
}
