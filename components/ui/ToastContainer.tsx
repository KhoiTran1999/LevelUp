'use client';

import React from 'react';

export function ToastContainer() {
  return (
    <>
      {/* Toast Notification Container (Positioned at top for high visibility) */}
      <div
        id="toast-container"
        className="fixed top-4 sm:top-5 right-4 left-4 sm:left-auto sm:max-w-sm z-[130] flex flex-col gap-2.5 pointer-events-none"
      />

      {/* Global Floating Tooltip for Frequency Heatmap Cells */}
      <div
        id="heatmap-floating-tooltip"
        className="fixed pointer-events-none hidden z-[9999] px-3 py-2 rounded-xl bg-slate-950/95 dark:bg-slate-900/95 text-white border border-slate-700/80 shadow-2xl text-xs font-mono backdrop-blur-md transition-opacity duration-150 transform -translate-x-1/2 -translate-y-full mb-2"
      />
    </>
  );
}
