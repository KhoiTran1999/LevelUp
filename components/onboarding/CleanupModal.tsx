'use client';

export function CleanupModal() {
  return (
    <div id="modal-cleanup" className="fixed inset-0 z-[1100] hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none" role="dialog" aria-modal="true" aria-labelledby="cleanup-modal-title">
      <div className="rpg-panel rounded-3xl w-full max-w-lg border border-rose-500/30 bg-white dark:bg-slate-900 overflow-hidden shadow-2xl flex flex-col text-left relative max-h-[92vh]">
        <div className="bg-rose-500/10 dark:bg-rose-950/40 px-5 sm:px-6 py-4 border-b border-rose-500/20 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center text-lg shadow-md shadow-rose-500/20">🧹</div>
            <div>
              <h3 id="cleanup-modal-title" className="font-rpg-title font-extrabold text-sm sm:text-base text-rose-600 dark:text-rose-400">DỌN DẸP &amp; GỠ BỎ LEVELUP</h3>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400">Dành cho người dùng không còn nhu cầu sử dụng ứng dụng</p>
            </div>
          </div>
          <button id="btn-close-cleanup-modal" type="button" className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition shrink-0 active:scale-95" aria-label="Đóng">
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs text-slate-600 dark:text-slate-300">
          <p className="leading-relaxed">
            LevelUp luôn tôn trọng sự riêng tư và quyền tự do của bạn. Nếu bạn quyết định không sử dụng nữa, hãy thực hiện 2 bước đơn giản bên dưới để dọn sạch 100% mọi tệp tin trên máy tính và trình duyệt:
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center">1</span>
              <span>Gỡ bỏ tiện ích khỏi máy tính &amp; Chrome:</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Chạy lệnh PowerShell để xóa sạch file:</span>
                <button id="btn-copy-uninstall-cmd" type="button" className="py-1 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10.5px] transition flex items-center gap-1 cursor-pointer active:scale-95">
                  <span className="material-symbols-outlined text-[12px]">content_copy</span>
                  <span id="btn-copy-uninstall-text">Sao Chép Lệnh</span>
                </button>
              </div>
              <div id="container-uninstall-cmd" className="bg-black/90 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between cursor-pointer" title="Bấm để sao chép">
                <code id="code-uninstall-cmd" className="text-[11px] font-mono text-rose-400 select-all overflow-x-auto whitespace-nowrap block">irm https://level-up-seven-blue.vercel.app/uninstall.ps1 | iex</code>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                💡 Lệnh trên sẽ tự động xóa sạch toàn bộ thư mục <code className="font-mono text-slate-300">%LOCALAPPDATA%\LevelUpShield</code> khỏi máy tính của bạn.
              </p>
            </div>

            <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700/60 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>👉 Bước cuối trên Chrome (Mất 2 giây):</span>
                <span className="text-[9.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Bảo mật Google</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Mở tab <code className="font-mono bg-slate-200 dark:bg-slate-900 px-1 py-0.5 rounded text-indigo-500 font-bold">chrome://extensions</code> ➔ Tìm ô <b>LevelUp Focus Shield</b> ➔ Bấm nút <b>Xóa</b> (Remove) để gỡ bỏ hoàn toàn khỏi Chrome.
              </p>
              <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-300/90 leading-normal flex items-start gap-1.5">
                <span className="material-symbols-outlined text-[13px] shrink-0 text-amber-500 mt-0.5">info</span>
                <span>Vì chính sách bảo mật Sandbox của Chrome, không phần mềm bên ngoài nào được phép tự ý gỡ ngầm tiện ích mà bắt buộc bạn phải tự click xác nhận.</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-300/50 dark:border-rose-900/50 space-y-3">
            <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300 text-xs">
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-black flex items-center justify-center">2</span>
              <span>Xóa sạch toàn bộ dữ liệu Web &amp; Đăng xuất:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              Hành động này sẽ xóa vĩnh viễn toàn bộ dữ liệu (nhiệm vụ, Vàng, chuỗi chăm chỉ, cài đặt) trên trình duyệt này.
            </p>
            <button id="btn-purge-all-data" type="button" className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
              <span className="material-symbols-outlined text-[16px]">delete_forever</span>
              <span>XÓA DỮ LIỆU &amp; RỜI ĐI</span>
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button id="btn-cancel-cleanup" type="button" className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
