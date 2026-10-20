'use client';

export function WelcomeModal() {
  return (
    <div id="modal-welcome" className="fixed inset-0 z-[100] hidden bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="rpg-panel rounded-3xl w-full max-w-md border border-amber-500/40 overflow-hidden modal-fade shadow-2xl flex flex-col bg-slate-900">
        <div className="bg-gradient-to-r from-amber-600/20 via-slate-900 to-amber-600/20 px-6 py-5 border-b border-slate-800 text-center">
          <img src="/logo.svg" alt="LevelUp Logo" className="w-14 h-14 mx-auto mb-2.5 drop-shadow-md rounded-2xl shadow-amber-500/10" />
          <h3 className="font-rpg-title font-black text-lg text-amber-400 uppercase tracking-wide">CHÀO MỪNG ĐẾN VỚI LEVELUP</h3>
          <p className="text-xs text-slate-400 mt-1">Biến công việc và thói quen hàng ngày thành trò chơi để không còn trì hoãn</p>
        </div>

        <div className="grid grid-cols-2 p-1.5 sm:p-2 bg-slate-950/60 border-b border-slate-800 text-[11px] sm:text-xs font-bold gap-1">
          <button id="btn-tab-welcome-login" type="button" className="py-2 sm:py-2.5 rounded-xl text-center transition bg-amber-500 text-slate-950 shadow-sm font-bold">
            🔐 Đăng Nhập Google
          </button>
          <button id="btn-tab-welcome-intro" type="button" className="py-2 sm:py-2.5 rounded-xl text-center transition text-slate-400 hover:text-slate-200">
            📖 Giới Thiệu
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          <div id="welcome-panel-intro" className="hidden space-y-3">
            <div className="text-center pb-1">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Vòng lặp Gamification 3 bước</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Xóa tan trì hoãn, làm việc tập trung và tận hưởng phần thưởng</p>
            </div>

            <div className="space-y-2.5 text-left">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-lg shrink-0">⚔️</div>
                <div className="text-xs">
                  <div className="font-bold text-slate-200">1. Nhiệm Vụ &amp; Bấm Giờ Tập Trung</div>
                  <div className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">Đặt nhiệm vụ thật cho bản thân và bật đồng hồ đếm giờ tập trung. Chế độ Toàn màn hình giúp loại bỏ xao nhãng hoàn toàn.</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-lg shrink-0">⚖️</div>
                <div className="text-xs">
                  <div className="font-bold text-slate-200">2. Trợ Lý AI Thẩm Định &amp; Định Giá</div>
                  <div className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">AI đánh giá công việc khách quan và thưởng Vàng <span className="coin-icon" /> xứng đáng với công sức bỏ ra.</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-lg shrink-0">🎁</div>
                <div className="text-xs">
                  <div className="font-bold text-slate-200">3. Tự Thưởng Quà Thật Không Tội Lỗi</div>
                  <div className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">Dùng Vàng mua giờ chơi game, xem phim, cà phê... Tận hưởng trọn vẹn giải trí vì bạn đã tự trả công bằng lao động thật.</div>
                </div>
              </div>
            </div>

            <button id="btn-welcome-goto-login" type="button" className="w-full mt-2 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2">
              <span>Tiếp Tục: Đăng Nhập Bằng Google</span>
              <span>➡️</span>
            </button>
          </div>

          <div id="welcome-panel-login" className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wide">Đăng nhập tài khoản để lưu tiến trình</div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Toàn bộ Nhiệm vụ, Cấp độ, Vàng tích lũy <span className="coin-icon" /> và Cửa hàng sẽ được tự động đồng bộ trên đám mây bằng tài khoản Google.
              </p>
            </div>

            <div className="py-3 flex flex-col items-center justify-center">
              <div id="google-signin-btn-container" className="flex justify-center min-h-[44px]" />
              <div id="google-signin-loading" className="text-xs text-slate-400 flex items-center gap-2 py-2">
                <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>Đang kết nối Google Identity Services...</span>
              </div>
            </div>

            <div id="welcome-google-error" className="hidden text-xs text-rose-400 bg-rose-950/40 p-3 rounded-xl border border-rose-800 text-left" />

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px] text-slate-400 space-y-1.5 text-left">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <span>🛡️</span>
                <span>Bảo mật &amp; Tự động</span>
              </div>
              <p className="leading-relaxed">
                • Tên hiển thị &amp; ảnh đại diện được tự động nhận diện từ Google (có thể tùy chỉnh lại bất kỳ lúc nào trong Hồ sơ).<br />
                • Dữ liệu gắn liền vĩnh viễn với tài khoản Google, không lo mất dữ liệu khi đổi thiết bị.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
