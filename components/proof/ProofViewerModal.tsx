'use client';

import React, { useState, useEffect } from 'react';
import { useLevelUp } from '@/components/providers/LevelUpProvider';

export function ProofViewerModal() {
  const { viewerProofData, isProofViewerModalOpen, closeProofViewer } = useLevelUp();
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    setImgLoaded(false);
  }, [viewerProofData?.imageUrl]);

  if (!isProofViewerModalOpen || !viewerProofData) {
    return null;
  }

  const { imageUrl, questTitle, userNote, feedback, timestamp } = viewerProofData;

  const dateStr = timestamp
    ? new Date(timestamp).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      id="modal-proof-viewer"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-viewer-title"
    >
      <div className="rpg-panel rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-amber-500/40 shadow-2xl modal-fade">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-lg shadow-sm shrink-0">
              <span className="material-symbols-outlined text-lg leading-none text-amber-500">
                photo_library
              </span>
            </div>
            <div className="min-w-0">
              <h3
                id="proof-viewer-title"
                className="font-rpg-title font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate"
              >
                {questTitle || (imageUrl ? 'ẢNH BẰNG CHỨNG NHIỆM VỤ' : 'BÁO CÁO NHIỆM VỤ')}
              </h3>
              <p id="proof-viewer-subtitle" className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {dateStr
                  ? `${imageUrl ? 'Chụp lúc' : 'Báo cáo lúc'}: ${dateStr} · AI Arbiter đã thẩm định`
                  : 'Bằng chứng đã được AI Arbiter thẩm định và lưu trữ an toàn'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-proof-viewer"
            type="button"
            onClick={closeProofViewer}
            className="modal-close w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition shrink-0 active:scale-95"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </div>

        {/* Body & Image Display */}
        <div className="p-4 sm:p-5 flex flex-col items-center justify-center overflow-y-auto bg-slate-950/30 space-y-3">
          {imageUrl && (
            <div
              id="proof-viewer-img-container"
              className="relative w-full rounded-xl overflow-hidden border border-slate-700/50 shadow-inner min-h-[220px] sm:min-h-[280px] max-h-[50vh] flex items-center justify-center bg-slate-900"
            >
              {/* Skeleton loading indicator */}
              {!imgLoaded && (
                <div
                  id="proof-viewer-skeleton"
                  className="proof-skeleton absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 transition-opacity duration-300"
                >
                  <div className="m3-loading-indicator text-amber-400">
                    <span className="m3-loading-indicator-shape large"></span>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    Đang tải ảnh bằng chứng...
                  </span>
                </div>
              )}
              <img
                id="proof-viewer-img"
                src={imageUrl}
                alt="Ảnh bằng chứng nhiệm vụ"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgLoaded(true)}
                className={`w-full h-auto max-h-[50vh] object-contain rounded-lg relative z-20 transition-opacity duration-300 ${
                  imgLoaded ? 'proof-img-loaded opacity-100' : 'proof-img-loading opacity-0'
                }`}
              />
            </div>
          )}

          {/* User Note Zone */}
          {userNote && userNote.trim() && (
            <div
              id="proof-viewer-note-zone"
              className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-left"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                <span>📝</span>
                <span>Thông tin bổ sung bạn gửi cho AI:</span>
              </div>
              <p
                id="proof-viewer-note-text"
                className="text-xs text-slate-700 dark:text-slate-200 mt-1 whitespace-pre-wrap leading-relaxed"
              >
                {userNote.trim()}
              </p>
            </div>
          )}

          {/* AI Observation Feedback Zone */}
          {feedback && feedback.trim() && (
            <div
              id="proof-viewer-feedback-zone"
              className="w-full p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-left"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <span>🤖</span>
                <span>AI Arbiter nhận xét:</span>
              </div>
              <p
                id="proof-viewer-feedback-text"
                className="text-xs text-slate-700 dark:text-slate-300 italic mt-1 leading-relaxed"
              >
                {feedback.trim()}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
            Cloud Storage (Bằng chứng đã qua thẩm định)
          </span>
          <div className="flex items-center gap-2">
            {imageUrl && (
              <a
                id="proof-viewer-download"
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                <span>Mở ảnh gốc</span>
              </a>
            )}
            <button
              id="btn-close-proof-viewer-footer"
              type="button"
              onClick={closeProofViewer}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition active:scale-95 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
