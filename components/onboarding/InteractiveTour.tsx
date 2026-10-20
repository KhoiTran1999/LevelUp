'use client';

export function InteractiveTour() {
  return (
    <div id="tour-overlay" className="fixed inset-0 z-[105] hidden transition-opacity duration-300 pointer-events-auto" role="dialog" aria-modal="true" aria-label="Tour hướng dẫn LevelUp">
      <svg id="tour-spotlight-svg" className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300">
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect id="tour-hole" x="0" y="0" width="0" height="0" rx="14" fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(2, 6, 23, 0.78)" mask="url(#tour-mask)" />
      </svg>

      <div id="tour-target-box" className="absolute pointer-events-none rounded-2xl border-2 border-amber-400 transition-all duration-300 ease-out z-[106] tour-target-pulse" />

      <div id="tour-card" className="fixed z-[108] w-[calc(100vw-32px)] max-w-sm sm:max-w-md rpg-panel rounded-2xl border border-amber-500/50 shadow-2xl p-4 sm:p-5 modal-fade transition-all duration-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <div id="tour-arrow" className="tour-arrow-indicator hidden" />

        <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span id="tour-step-pill" className="text-[10px] sm:text-[11px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              Bước 1 / 5
            </span>
            <div id="tour-dots" className="flex items-center gap-1.5" />
          </div>
          <button id="btn-tour-skip-top" type="button" className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition text-sm leading-none rounded-lg" title="Bỏ qua hướng dẫn">
            ✕
          </button>
        </div>

        <div className="flex items-start gap-3 my-2.5">
          <div id="tour-step-icon" className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
            🛡️
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <h4 id="tour-step-title" className="font-rpg-title font-black text-sm sm:text-base text-amber-600 dark:text-amber-400 leading-snug">
              Hồ Sơ &amp; Trạng Thái Hiệp Sĩ
            </h4>
            <p id="tour-step-desc" className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Theo dõi Cấp độ và Vàng tích lũy. Dữ liệu tự động đồng bộ qua Google. Nhấn vào đây để đổi Avatar, biệt danh hoặc xem lịch sử giao dịch.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/80 dark:border-slate-800 gap-2">
          <button id="btn-tour-skip" type="button" className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition font-medium px-2 py-1.5 rounded-lg">
            Bỏ qua
          </button>
          <div className="flex items-center gap-2">
            <button id="btn-tour-prev" type="button" className="hidden px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
              Quay lại
            </button>
            <button id="btn-tour-next" type="button" className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-md shadow-amber-500/20 flex items-center gap-1 active:scale-95">
              <span id="btn-tour-next-text">Tiếp theo</span>
              <span id="btn-tour-next-icon">➡️</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
