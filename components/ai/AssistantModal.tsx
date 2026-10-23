'use client';

interface AssistantWindow extends Window {
  openAssistantModal?: () => void;
  clearAssistantChat?: () => void;
  sendQuickAssistantPrompt?: (prompt: string) => void;
  handleAssistantSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
}

function invokeAssistant(action: 'clear' | 'send', prompt?: string) {
  const win = window as AssistantWindow;
  if (action === 'clear') {
    if (win.clearAssistantChat) win.clearAssistantChat();
    else console.error('[AssistantModal] Legacy clear handler is unavailable.');
    return;
  }
  if (win.sendQuickAssistantPrompt) win.sendQuickAssistantPrompt(prompt || '');
  else console.error('[AssistantModal] Legacy prompt handler is unavailable.');
}

function openAssistant() {
  const open = (window as AssistantWindow).openAssistantModal;
  if (open) open();
  else console.error('[AssistantModal] Legacy open handler is unavailable.');
}

function submitAssistant(event: React.FormEvent<HTMLFormElement>) {
  const submit = (window as AssistantWindow).handleAssistantSubmit;
  if (submit) submit(event);
  else {
    event.preventDefault();
    console.error('[AssistantModal] Legacy submit handler is unavailable.');
  }
}

export function AssistantModal() {
  return (
    <>
      <aside
        aria-label="Phù Thủy AI LevelUp"
        className="pointer-events-auto fixed bottom-20 right-4 z-30 flex flex-col items-end gap-2 md:bottom-6 md:right-6"
      >
        <button
          id="btn-floating-assistant"
          onClick={openAssistant}
          type="button"
          className="group relative flex cursor-pointer select-none items-center justify-center rounded-full transition-all duration-300 active:scale-95"
          title="Hỏi Phù Thủy (Phím tắt: Alt+A)"
        >
          <img
            src="wizard.svg"
            alt="Phù Thủy"
            className="assistant-fab-icon pointer-events-none select-none transition-transform duration-300 group-hover:scale-110"
          />
          <span className="hidden text-xs font-bold tracking-wide text-violet-100 dark:text-violet-200 md:inline">
            Phù Thủy
          </span>
        </button>
      </aside>

      <div
        id="modal-ai-assistant"
        className="fixed inset-0 z-50 hidden flex items-center justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-modal-title"
      >
        <div
          id="assistant-panel"
          className="rpg-panel flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-none border-0 bg-white/95 shadow-2xl dark:bg-slate-900/95 sm:h-[84vh] sm:rounded-2xl sm:border sm:border-violet-500/40"
        >
          <div className="assistant-header flex shrink-0 items-center justify-between gap-2 border-b border-violet-500/20 bg-gradient-to-r from-violet-950/30 via-slate-900/20 to-indigo-950/30 px-3.5 pb-3 pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] sm:px-4 sm:py-3.5">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl border border-violet-400/40 bg-gradient-to-br from-violet-600 to-indigo-700 p-1 shadow-md sm:h-10 sm:w-10 sm:p-1.5">
                <img src="wizard.svg" alt="Phù Thủy" className="pointer-events-none h-full w-full select-none object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="assistant-modal-title"
                  className="truncate font-rpg-title text-sm font-extrabold uppercase tracking-wide text-violet-700 dark:text-violet-300 sm:text-base"
                >
                  Phù Thủy
                </h2>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <button
                type="button"
                onClick={() => invokeAssistant('clear')}
                className="flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-sm text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500"
                title="Xóa lịch sử trò chuyện"
              >
                <span className="material-symbols-outlined text-lg leading-none">delete_sweep</span>
              </button>
              <button
                type="button"
                className="modal-close flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-200/60 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                title="Thoát"
                aria-label="Đóng"
              >
                <span className="material-symbols-outlined text-lg leading-none">close</span>
              </button>
            </div>
          </div>

          <div
            id="assistant-suggest-chips"
            className="horizontal-scroll-drag flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-slate-200/80 bg-slate-50/70 px-3 py-1.5 text-xs select-none no-scrollbar dark:border-slate-800 dark:bg-slate-950/40 sm:py-2"
            title="Cuộn chuột hoặc kéo rê để xem thêm gợi ý"
          >
            <span className="shrink-0 select-none text-[10px] font-bold uppercase tracking-wider text-violet-600/80 dark:text-violet-400/80">
              Gợi ý:
            </span>
            <button type="button" onClick={() => invokeAssistant('send', 'Hôm nay tôi nên làm gì?')} className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-700 transition hover:bg-violet-500/20 active:scale-95 dark:text-violet-300">
              💡 Hôm nay nên làm gì?
            </button>
            <button type="button" onClick={() => invokeAssistant('send', 'Làm sao để kiếm nhiều Vàng và lên cấp nhanh nhất?')} className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 transition hover:bg-amber-500/20 active:scale-95 dark:text-amber-300">
              🪙 Cày Vàng &amp; Thăng Cấp
            </button>
            <button type="button" onClick={() => invokeAssistant('send', 'Hướng dẫn tôi cách thương lượng và xin xỏ với AI trong LevelUp')} className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-700 transition hover:bg-rose-500/20 active:scale-95 dark:text-rose-300">
              ⚖️ Mẹo Thương lượng &amp; Xin xỏ
            </button>
            <button type="button" onClick={() => invokeAssistant('send', 'Giải thích cách hoạt động của gửi tiết kiệm và vay vốn ngân hàng')} className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-700 transition hover:bg-blue-500/20 active:scale-95 dark:text-blue-300">
              🏦 Cơ chế Ngân Hàng
            </button>
            <button type="button" onClick={() => invokeAssistant('send', 'Tạo giúp tôi 1 nhiệm vụ học tập 25 phút tập trung sâu')} className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-500/20 active:scale-95 dark:text-emerald-300">
              ⚡ Tạo việc học 25p
            </button>
            <button type="button" onClick={() => invokeAssistant('send', 'Gợi ý cho tôi phần thưởng lành mạnh để đưa vào Cửa Hàng')} className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-purple-500/25 bg-purple-500/10 px-2.5 py-1 text-[11px] font-medium text-purple-700 transition hover:bg-purple-500/20 active:scale-95 dark:text-purple-300">
              🎁 Gợi ý quà lành mạnh
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="assistant-watermark-bg pointer-events-none absolute inset-0 z-0 flex select-none items-center justify-center overflow-hidden" aria-hidden="true">
              <img src="wizard.svg" alt="" className="assistant-watermark-wizard pointer-events-none select-none" />
            </div>
            <div id="assistant-chat-logs" className="relative z-10 flex-1 space-y-3.5 overflow-y-auto p-3 pr-2 text-xs sm:p-4 sm:text-[13px]" />
          </div>

          <div id="assistant-step-container" className="hidden shrink-0 border-t border-violet-500/20 bg-violet-50/50 px-3.5 py-2.5 dark:bg-violet-950/20 sm:px-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-violet-700 dark:text-violet-300">
              <span id="assistant-step-text" className="flex items-center gap-2">
                <span className="m3-loading-indicator text-violet-500"><span className="m3-loading-indicator-shape micro" /></span>
                <span id="assistant-step-msg" className="truncate font-medium">Phù Thủy đang suy nghĩ...</span>
              </span>
              <span id="assistant-step-pct" className="font-mono text-[10px]">25%</span>
            </div>
            <div className="m3-linear-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100}>
              <div id="assistant-step-bar" className="m3-linear-progress-bar" style={{ width: '25%' }} />
              <div className="m3-linear-progress-stop" />
            </div>
          </div>

          <div className="assistant-input-area shrink-0 border-t border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900 sm:p-3.5">
            <form
              id="form-assistant-chat"
              onSubmit={submitAssistant}
              className="flex items-center gap-2"
            >
              <input
                id="input-assistant-query"
                type="text"
                maxLength={1000}
                placeholder="Hỏi Phù Thủy..."
                className="rpg-input flex-1 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs transition focus:border-violet-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/80 dark:focus:border-violet-400 sm:px-3.5 sm:py-2.5 sm:text-sm"
              />
              <button
                id="btn-send-assistant"
                type="submit"
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:from-violet-500 hover:to-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-2.5 sm:text-sm"
              >
                <span>Gửi</span>
                <span className="material-symbols-outlined text-base leading-none">send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
