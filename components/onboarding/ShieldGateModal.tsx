'use client';

export function ShieldGateModal() {
  return (
    <div id="modal-shield-gate" className="fixed inset-0 z-[1000] hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none" role="dialog" aria-modal="true" aria-labelledby="shield-gate-title">
      <div className="shield-gate-dialog rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xl flex flex-col text-center relative transition-colors">
        <div id="shield-gate-header" className="bg-indigo-50/80 dark:bg-indigo-950/40 px-6 py-6 border-b border-indigo-100 dark:border-indigo-900/60 text-center relative">
          <div id="shield-gate-icon" className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg shadow-indigo-600/30 ring-4 ring-indigo-500/20">🛡️</div>
          <div id="shield-gate-badge" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-700/60 text-indigo-800 dark:text-indigo-200 text-[11px] font-black uppercase tracking-wider mb-2">
            <span>🔒 TRANG BỊ BẮT BUỘC ĐỂ SỬ DỤNG</span>
          </div>
          <h3 id="shield-gate-title" className="font-rpg-title font-black text-xl text-slate-900 dark:text-white uppercase tracking-wide">KHIÊN CHẶN XAO NHÃNG</h3>
          <p id="shield-gate-desc" className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 max-w-sm mx-auto leading-relaxed">
            Để bắt đầu hành trình và bảo vệ kỷ luật, Hiệp sĩ cần trang bị tiện ích Chrome để phong ấn các trang mạng xã hội gây xao nhãng.
          </p>
        </div>

        <div className="p-5 sm:p-6 space-y-4 text-left">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/40 shadow-xl text-white space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">1</span>
                <span className="text-xs font-bold text-slate-100">Chạy lệnh tải tiện ích vào máy:</span>
              </div>
              <button id="btn-copy-install-cmd" type="button" className="py-1 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition flex items-center gap-1 cursor-pointer active:scale-95">
                <span className="material-symbols-outlined text-[13px]">content_copy</span>
                <span id="btn-copy-install-text">Copy Lệnh</span>
              </button>
            </div>
            <div id="container-install-cmd" className="bg-black/90 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between cursor-pointer" title="Bấm để copy">
              <code id="code-install-cmd" className="text-[11.5px] font-mono text-emerald-400 select-all overflow-x-auto whitespace-nowrap scrollbar-none font-semibold">irm https://level-up-seven-blue.vercel.app/install.ps1 | iex</code>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">💡 Mở PowerShell, dán lệnh rồi nhấn Enter để tải bộ cài tiện ích vào máy tính.</p>
          </div>

          <div id="shield-gate-step-2" className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-slate-800 dark:text-slate-200 text-left">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">2</span>
              <span id="shield-gate-step-2-title" className="text-xs font-bold text-slate-900 dark:text-white">Nạp vào Chrome (Chỉ 1 lần duy nhất):</span>
            </div>
            <div id="shield-gate-step-2-body" className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">①</span>
                <span>Mở tab mới:</span>
                <code className="font-mono bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-300 font-bold select-all">chrome://extensions</code>
                <button id="copy-chrome-url-btn" type="button" className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold ml-0.5 cursor-pointer">Copy</button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">②</span>
                <span>Bật công tắc <b>Chế độ cho nhà phát triển</b> (góc trên bên phải).</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">③</span>
                <span>Bấm <b>Tải tiện ích đã giải nén</b> (góc trái) ➔ Chọn thư mục:</span>
              </div>
            </div>
            <div id="shield-gate-step-2-folder" className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
              <code id="folder-path-display" className="text-[10.5px] font-mono text-amber-600 dark:text-amber-400 truncate flex-1 select-all font-semibold">%LOCALAPPDATA%\LevelUpShield</code>
              <button id="btn-copy-folder-path" type="button" className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10.5px] font-bold shrink-0 transition flex items-center gap-1 active:scale-95 cursor-pointer">
                <span className="material-symbols-outlined text-[12px]">content_copy</span>
                <span id="btn-copy-folder-text">Sao Chép Thư Mục</span>
              </button>
            </div>
          </div>

          <div id="shield-gate-status-box" className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-600/60 flex items-center justify-between gap-3 text-xs transition-all shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span id="shield-gate-spinner" className="w-4 h-4 border-2 border-amber-600 dark:border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
              <span id="shield-gate-status-text" className="text-xs font-bold text-amber-950 dark:text-amber-100 truncate">Đang đợi phát hiện Khiên từ Chrome...</span>
            </div>
            <button id="btn-shield-check-now" type="button" className="px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 dark:bg-amber-900/70 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 text-xs font-bold transition active:scale-95 cursor-pointer shrink-0">Quét Lại</button>
          </div>

          <div className="pt-1 flex flex-col gap-2.5">
            <button id="btn-shield-gate-success" type="button" className="hidden w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-600/25 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
              <span>⚔️ MỞ KHÓA &amp; BẮT ĐẦU SỬ DỤNG LEVELUP</span>
            </button>
            <div className="pt-1 text-center space-y-1.5">
              <p id="shield-gate-footer-note" className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-slate-400">shield</span>
                <span>Bắt buộc cài Khiên để mở khóa app. Điện thoại được tự động miễn trừ.</span>
              </p>
              <div className="text-[10.5px] text-slate-400">
                <span>Không dùng Windows?</span>
                <a href="/download/levelup-shield.zip" download="levelup-shield.zip" id="btn-download-shield-zip" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium ml-1">Tải file ZIP thủ công</a>
              </div>
              <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80">
                <button id="btn-open-cleanup-from-gate" type="button" className="text-[11px] text-slate-400 hover:text-rose-500 underline transition cursor-pointer">
                  Không muốn sử dụng app nữa? Dọn dẹp &amp; gỡ bỏ tại đây
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
