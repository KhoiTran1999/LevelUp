'use client';

import { useEffect, type ReactNode } from 'react';

interface GuideStep {
  number: string;
  title: string;
  duration: string;
  color: 'indigo' | 'purple' | 'amber' | 'emerald';
  tips: ReactNode[];
}

const steps: GuideStep[] = [
  {
    number: '1',
    title: 'Xóa Bộ Nhớ Đệm Thể Chất',
    duration: '10 phút',
    color: 'indigo',
    tips: [
      <><b>Rời khỏi vị trí cũ:</b> Nơi bạn vừa lướt web hay nghỉ ngơi tuyệt đối không được là nơi bạn ngồi học. Hãy đứng dậy ngay lập tức.</>,
      <><b>Thay đổi trạng thái:</b> Đi rửa mặt bằng nước lạnh hoặc tắm nhanh. Sự thay đổi nhiệt độ đột ngột giúp đánh thức hệ thần kinh và "rửa trôi" trạng thái lờ đờ.</>,
      <><b>Uống nước:</b> Uống ngay một cốc nước lọc lớn để kích hoạt lại cơ thể và tuần hoàn máu.</>,
    ],
  },
  {
    number: '2',
    title: 'Thiết Lập Môi Trường Cách Ly',
    duration: 'Không gian',
    color: 'purple',
    tips: [
      <><b>Loại bỏ nguồn cám dỗ:</b> Tắt nguồn điện thoại, bật chế độ máy bay, hoặc cất hẳn sang phòng khác. Đừng chỉ úp điện thoại trên bàn, vì tiềm thức bạn vẫn biết nó ở đó và chờ đợi chuông báo.</>,
      <><b>Dọn bàn học tối giản:</b> Chỉ để lại đúng những thứ phục vụ cho môn học hiện tại (1 quyển sách, 1 cây bút, 1 laptop nếu cần). Càng ít đồ vật, não càng ít lý do phân tán.</>,
    ],
  },
  {
    number: '3',
    title: 'Chiến Thuật "Bắt Đầu Siêu Nhỏ"',
    duration: 'Quy tắc 5 phút',
    color: 'amber',
    tips: [
      <>Não bạn đang quen với những thứ dễ dãi, nên nếu bạn nghĩ <i>"Mình phải học 2 tiếng"</i>, nó sẽ sợ hãi và tìm cách đình công.</>,
      <><b>Mục tiêu phá vỡ lực cản:</b> Hãy tự nhủ <i>"Mình chỉ ngồi vào bàn, mở trang sách ra và đọc đúng 1 đoạn"</i>, hoặc <i>"Mình chỉ làm 1 bài tập rồi nghỉ"</i>. Một khi đã bắt tay làm được 5 phút, quán tính sẽ tự kéo bạn đi tiếp!</>,
    ],
  },
  {
    number: '4',
    title: 'Kích Hoạt Chu Kỳ Tập Trung Ngắn',
    duration: 'Pomodoro 25/5',
    color: 'emerald',
    tips: [
      <>Sự tập trung lúc đầu rất mỏng manh, đừng cố ngồi lỳ. Hãy dùng <b>Pomodoro: Tập trung 25 phút — Nghỉ 5 phút</b> trên LevelUp.</>,
      <><b>Kỷ luật thép khi nghỉ:</b> Trong 5 phút nghỉ, <b>tuyệt đối không cầm lại điện thoại</b> hay mở tab giải trí. Hãy đứng dậy, vươn vai, nhìn ra xa (quy tắc 20-20-20) hoặc nhắm mắt. Việc nạp lại dopamine kích thích lúc này sẽ phá hỏng hoàn toàn công sức ngắt mạch!</>,
    ],
  },
  {
    number: '5',
    title: 'Đặt Một Cuốn "Sổ Ghi Chú" (Brain Dump) Cạnh Tay',
    duration: 'Xả xao nhãng',
    color: 'amber',
    tips: [
      <>Trong 15 phút đầu học sâu, não bạn sẽ liên tục giãy giụa và ném ra các suy nghĩ ngẫu nhiên (<i>"Quên chưa rep tin nhắn", "Lát nữa ăn gì ta"</i>).</>,
      <><b>Đừng giải quyết chúng ngay:</b> Hãy mở ngay <b>📝 Sổ Ghi Chú</b> trên thanh Pomodoro (hoặc phím tắt <code>Alt + D</code>) để soạn thảo văn bản hoặc ghi nhanh vào, coi như đã "lưu", rồi quay ngay lại việc học. Não bạn sẽ an tâm không quên để tiếp tục duy trì trạng thái học sâu.</>,
    ],
  },
];

const stepClasses: Record<GuideStep['color'], { title: string; number: string; duration: string; bullet: string }> = {
  indigo: {
    title: 'text-indigo-600 dark:text-indigo-400',
    number: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    duration: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    bullet: 'text-indigo-500',
  },
  purple: {
    title: 'text-purple-600 dark:text-purple-400',
    number: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
    duration: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    bullet: 'text-purple-500',
  },
  amber: {
    title: 'text-amber-600 dark:text-amber-400',
    number: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    duration: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    bullet: 'text-amber-500',
  },
  emerald: {
    title: 'text-emerald-600 dark:text-emerald-400',
    number: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    duration: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    bullet: 'text-emerald-500',
  },
};

interface DopamineWindow extends Window {
  closeDopamineGuideModal?: () => void;
  openBrainDumpModal?: () => void;
}

function closeGuide() {
  const modal = document.getElementById('modal-dopamine-guide');
  if (modal) modal.classList.add('hidden');
  const close = (window as DopamineWindow).closeDopamineGuideModal;
  if (close && close !== closeGuide) close();
}

function openBrainDump() {
  closeGuide();
  const win = window as DopamineWindow & { openReactBrainDumpModal?: () => void };
  if (typeof win.openReactBrainDumpModal === 'function') {
    win.openReactBrainDumpModal();
    return;
  }
  const open = win.openBrainDumpModal;
  if (open) open();
  else console.error('[DopamineGuideModal] Legacy notes handler is unavailable.');
}

export function DopamineGuideModal() {
  useEffect(() => {
    const win = window as DopamineWindow & {
      openDopamineGuideModal?: () => void;
      closeDopamineGuideModal?: () => void;
    };
    const openModal = () => {
      const modal = document.getElementById('modal-dopamine-guide');
      if (modal) modal.classList.remove('hidden');
    };
    win.openDopamineGuideModal = openModal;
    win.closeDopamineGuideModal = closeGuide;
    return () => {
      if (win.openDopamineGuideModal === openModal) delete win.openDopamineGuideModal;
      if (win.closeDopamineGuideModal === closeGuide) delete win.closeDopamineGuideModal;
    };
  }, []);

  return (
    <div id="modal-dopamine-guide" className="fixed inset-0 z-[100] hidden bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="modal-dopamine-guide-title" data-sheet-dismiss="true">
      <div className="rpg-panel rounded-2xl sm:rounded-3xl w-full max-w-2xl border border-amber-500/40 overflow-hidden modal-fade shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-white dark:bg-slate-900">
        <div className="bg-amber-500/10 dark:bg-amber-950/40 px-5 sm:px-6 py-3.5 sm:py-4 border-b border-amber-500/20 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/25 to-indigo-500/25 border border-amber-500/40 flex items-center justify-center text-xl shadow-xs">🧠</div>
            <div>
              <h3 id="modal-dopamine-guide-title" className="font-rpg-title font-black text-sm sm:text-base text-amber-600 dark:text-amber-400 tracking-wide uppercase">CẨM NANG NGẮT MẠCH DOPAMINE</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">5 bước chuyển trạng thái từ video ngắn sang Deep Work</p>
            </div>
          </div>
          <button id="btn-close-dopamine-guide" type="button" onClick={closeGuide} className="modal-close w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition shrink-0 active:scale-95" aria-label="Đóng">
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar overscroll-contain p-4 sm:p-6 space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-amber-700 dark:text-amber-300">
              <span className="text-base">⚠️</span>
              <span>Hiểu Cơ Chế: Tại Sao Bạn Không Thể Học Sâu Ngay?</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Não bạn hiện đang ngập trong lượng <b>dopamine "rẻ" và cường độ cao</b> từ việc lướt video ngắn và mạng xã hội. Việc ép bản thân nhảy ngay vào trạng thái học sâu (deep work) lúc này giống như đang <b>lái xe 100km/h mà bóp phanh gấp</b> — não sẽ kháng cự dữ dội, sinh ra cảm giác chán nản và bồn chồn.
            </p>
            <div className="text-[11px] font-medium text-amber-800 dark:text-amber-200/90 bg-amber-500/15 p-2.5 rounded-xl border border-amber-500/20">
              💡 <b>Giải pháp:</b> Hãy thực hiện quy trình "ngắt mạch" 5 bước dưới đây để đưa dopamine về mức cơ bản trước khi bắt đầu!
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {steps.map(step => {
              const classes = stepClasses[step.color];
              return (
                <section key={step.number} className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 transition space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-xs sm:text-sm flex items-center gap-2 ${classes.title}`}>
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-xs ${classes.number}`}>{step.number}</span>
                      <span>{step.title}</span>
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${classes.duration}`}>{step.duration}</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pl-1">
                    {step.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className={`mt-0.5 ${classes.bullet}`}>•</span>
                        <div>{tip}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>

        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between shrink-0">
          <button type="button" onClick={openBrainDump} className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer">
            <span className="material-symbols-outlined text-[16px] leading-none">edit_note</span>
            <span>Mở Sổ Tay Ghi Chú</span>
          </button>
          <button type="button" onClick={closeGuide} className="px-4 sm:px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition active:scale-95 cursor-pointer shadow-sm">
            Đã Hiểu &amp; Bắt Đầu Học ⚔️
          </button>
        </div>
      </div>
    </div>
  );
}
