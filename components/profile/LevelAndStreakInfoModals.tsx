'use client';

import { useEffect, useState } from 'react';
import { useLevelUp } from '@/hooks/useLevelUp';

type ModalWindow = Window & {
  openLevelInfoModal?: () => void;
  openStreakInfoModal?: () => void;
  sfx?: { playClick?: () => void };
};

const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function getLocalDayString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStreakBonusPercent(streak: number) {
  if (streak >= 30) return 20;
  if (streak >= 14) return 15;
  if (streak >= 7) return 10;
  if (streak >= 3) return 5;
  return 0;
}

function getStreakTitle(streak: number) {
  if (streak >= 30) return 'Bất Bại 👑';
  if (streak >= 14) return 'Chuyên Cần';
  if (streak >= 7) return 'Bền Bỉ';
  if (streak >= 3) return 'Cần Mẫn';
  return 'Khởi Đầu';
}

function getNextStreakMilestone(streak: number) {
  if (streak < 3) return 'Chuỗi 3 ngày: +5%';
  if (streak < 7) return 'Chuỗi 7 ngày: +10%';
  if (streak < 14) return 'Chuỗi 14 ngày: +15%';
  if (streak < 30) return 'Chuỗi 30 ngày: +20% (Max)';
  return 'Đạt cấp tối đa (+20%)';
}

function getStreakStatus(profile: {
  streak: number;
  lastStreakDate: string;
}, today: Date) {
  const streak = Math.max(0, Number.parseInt(String(profile.streak), 10) || 0);
  const lastDate = profile.lastStreakDate || '';
  if (!lastDate) return streak > 0 ? 'waiting_today' : 'broken';

  const [lastYear, lastMonth, lastDay] = lastDate.split('-').map(Number);
  const [todayYear, todayMonth, todayDay] = getLocalDayString(today).split('-').map(Number);
  const daysDiff = Math.round(
    (new Date(todayYear, todayMonth - 1, todayDay).getTime() -
      new Date(lastYear, lastMonth - 1, lastDay).getTime()) /
      (24 * 60 * 60 * 1000)
  );

  if (daysDiff === 0) return 'active_today';
  if (daysDiff === 1) return 'waiting_today';
  return 'broken';
}

function ModalFrame({
  id,
  titleId,
  onClose,
  children,
  accent,
}: {
  id: string;
  titleId: string;
  onClose: () => void;
  children: React.ReactNode;
  accent: 'amber' | 'orange';
}) {
  const styles = accent === 'amber'
    ? {
        icon: 'text-amber-500',
        title: 'text-amber-600 dark:text-amber-400',
      }
    : {
        icon: 'text-orange-500',
        title: 'text-orange-600 dark:text-orange-400',
      };
  return (
    <div id={id} className="m3-modal-sheet fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-4">
      <section
        className="rpg-panel m3-dialog-panel flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 shadow-2xl dark:border-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="m3-drag-handle sm:hidden" />
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined text-lg leading-none ${styles.icon}`}>
              {accent === 'amber' ? 'military_tech' : 'local_fire_department'}
            </span>
            <h2
              id={titleId}
              className={`font-rpg-title text-sm font-extrabold sm:text-base ${styles.title}`}
            >
              {accent === 'amber' ? 'CẤP ĐỘ & DANH HIỆU' : 'CHUỖI NGÀY CHĂM CHỈ (STREAK)'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close m3-icon-btn flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-200/60 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function LevelAndStreakInfoModals() {
  const { optimisticProfile: profile } = useLevelUp();
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [isStreakOpen, setIsStreakOpen] = useState(false);

  useEffect(() => {
    const legacyWindow = window as ModalWindow;
    const openLevel = () => setIsLevelOpen(true);
    const openStreak = () => setIsStreakOpen(true);
    legacyWindow.openLevelInfoModal = openLevel;
    legacyWindow.openStreakInfoModal = openStreak;

    return () => {
      if (legacyWindow.openLevelInfoModal === openLevel) delete legacyWindow.openLevelInfoModal;
      if (legacyWindow.openStreakInfoModal === openStreak) delete legacyWindow.openStreakInfoModal;
    };
  }, []);

  const close = () => {
    (window as ModalWindow).sfx?.playClick?.();
    setIsLevelOpen(false);
    setIsStreakOpen(false);
  };

  const level = Math.max(1, profile.level || 1);
  const streak = Math.max(0, Number.parseInt(String(profile.streak), 10) || 0);
  const now = new Date();
  const status = getStreakStatus(profile, now);
  const bonusPercent = getStreakBonusPercent(streak);
  const history = Array.isArray(profile.streakHistory) ? profile.streakHistory : [];
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getTime() - (6 - index) * 24 * 60 * 60 * 1000);
    const dayString = getLocalDayString(date);
    return {
      date,
      dayString,
      isToday: index === 6,
      isCompleted: history.includes(dayString),
    };
  });

  return (
    <>
      {isLevelOpen && (
        <ModalFrame id="modal-level-info" titleId="modal-level-title" onClose={close} accent="amber">
          <div className="space-y-4 overflow-y-auto p-5 text-xs text-slate-700 dark:text-slate-300 sm:p-6">
            <div className="space-y-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cấp độ hiện tại</div>
                  <div className="font-mono text-xl font-extrabold text-amber-600 dark:text-amber-400">LV. {level}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Danh hiệu</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{profile.title || 'Tân Binh Cấp 1'}</div>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                ✨ Tiếp tục hoàn thành nhiệm vụ để tích lũy tiến trình tự động thăng cấp và nâng tầm danh xưng.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">🎯 Làm sao để tăng Cấp độ?</h3>
              <div className="space-y-2 text-[11px] leading-relaxed">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <strong className="mb-0.5 block text-amber-600 dark:text-amber-400">1. Hoàn thành Nhiệm Vụ:</strong>
                  Mỗi khi làm xong nhiệm vụ, hệ thống tự động ghi nhận khối lượng công việc và Vàng thưởng để nâng cao cấp độ.
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <strong className="mb-0.5 block text-amber-600 dark:text-amber-400">2. Cơ chế thăng cấp tự động:</strong>
                  Cấp độ thăng tiến theo quá trình rèn luyện bền bỉ. Cấp độ càng cao, danh hiệu và uy tín hiệp sĩ càng tỏa sáng.
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <strong className="mb-0.5 block text-amber-600 dark:text-amber-400">3. Lợi ích khi lên cấp:</strong>
                  <ul className="list-inside list-disc space-y-0.5 text-slate-600 dark:text-slate-400">
                    <li><strong className="text-slate-800 dark:text-slate-200">Đứng đầu Bảng Xếp Hạng:</strong> Cấp độ là tiêu chí ưu tiên cao nhất khi xếp thứ hạng.</li>
                    <li><strong className="text-slate-800 dark:text-slate-200">Mở khóa Danh hiệu:</strong> Nâng cấp danh xưng hiển thị bên cạnh tên hiệp sĩ.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-1.5 font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">👑 Hệ Thống Danh Hiệu Theo Cấp Độ</h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 text-[11px] dark:border-slate-800">
                <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-100 p-2 font-bold dark:border-slate-800 dark:bg-slate-900"><span>Cấp Độ</span><span>Danh Hiệu</span></div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  <div className="grid grid-cols-2 p-2"><span>Lv. 1 - 2</span><span className="font-medium text-slate-600 dark:text-slate-400">Tân Binh Cấp 1</span></div>
                  <div className="grid grid-cols-2 p-2"><span>Lv. 3 - 5</span><span className="font-medium text-amber-600 dark:text-amber-400">Học Viên Chăm Chỉ</span></div>
                  <div className="grid grid-cols-2 p-2"><span>Lv. 6 - 9</span><span className="font-medium text-emerald-600 dark:text-emerald-400">Chiến Binh Kiên Trì</span></div>
                  <div className="grid grid-cols-2 p-2"><span>Lv. 10 - 14</span><span className="font-medium text-blue-600 dark:text-blue-400">Chuyên Gia Tập Trung</span></div>
                  <div className="grid grid-cols-2 p-2"><span>Lv. 15 - 19</span><span className="font-medium text-purple-600 dark:text-purple-400">Bậc Thầy Năng Suất</span></div>
                  <div className="grid grid-cols-2 p-2"><span>Lv. 20+</span><span className="font-bold text-amber-500">Huyền Thoại Kỷ Luật 👑</span></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="button" onClick={close} className="cursor-pointer rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400">Đã Hiểu</button>
            </div>
          </div>
        </ModalFrame>
      )}

      {isStreakOpen && (
        <ModalFrame id="modal-streak-info" titleId="modal-streak-title" onClose={close} accent="orange">
          <div className="space-y-4 overflow-y-auto p-5 text-xs text-slate-700 dark:text-slate-300 sm:p-6">
            <div className="space-y-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Chuỗi ngày hiện tại</div>
                  <div className="flex items-center gap-1.5 font-mono text-2xl font-black text-orange-600 dark:text-orange-400">🔥 {streak}<span className="text-xs font-bold text-slate-700 dark:text-slate-300">NGÀY LIÊN TIẾP</span></div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Danh hiệu chuỗi</div>
                  <div className="text-xs font-bold text-orange-600 dark:text-orange-400">{getStreakTitle(streak)}</div>
                </div>
              </div>

              {status === 'active_today' ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  <span className="shrink-0 text-base">✅</span><div><strong className="block">Chuỗi hôm nay đã được bảo vệ an toàn!</strong><span className="text-[10px] text-slate-500 dark:text-slate-400">Bạn đã hoàn thành nhiệm vụ hôm nay. Hãy quay lại vào ngày mai để tiếp tục nâng chuỗi nhé!</span></div>
                </div>
              ) : status === 'waiting_today' ? (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                  <span className="shrink-0 text-base">⏳</span><div><strong className="block">Chưa hoàn thành nhiệm vụ hôm nay!</strong><span className="text-[10px] text-slate-500 dark:text-slate-400">Hãy hoàn thành ít nhất 1 nhiệm vụ trước 23:59 để tăng chuỗi lên {streak + 1} ngày và nhận thưởng.</span></div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                  <span className="shrink-0 text-base">⚠️</span><div><strong className="block">Chuỗi đã bị gián đoạn!</strong><span className="text-[10px] text-slate-500 dark:text-slate-400">Bạn đã bỏ lỡ ngày hôm qua. Hoàn thành 1 nhiệm vụ hôm nay để thắp lại ngọn lửa chuỗi mới!</span></div>
                </div>
              )}

              <div className="pt-1">
                <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"><span>Lịch 7 Ngày Gần Nhất</span></div>
                <div className="grid grid-cols-7 gap-1.5 text-center sm:gap-2">
                  {days.map(({ date, dayString, isToday, isCompleted }) => (
                    <div key={dayString} className={`flex flex-col items-center gap-1 rounded-xl border p-1 transition-all sm:p-1.5 ${isToday ? 'streak-day-card today border-orange-500/50 bg-orange-500/15' : isCompleted ? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900' : 'border-slate-200/50 bg-slate-100/60 opacity-60 dark:border-slate-800/50 dark:bg-slate-950/60'}`}>
                      <span className={`text-[9px] font-bold ${isToday ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'}`}>{dayNames[date.getDay()]}</span>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs sm:h-7 sm:w-7 ${isCompleted ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm' : isToday ? 'animate-pulse border border-dashed border-orange-500/50 bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'bg-slate-200/50 text-slate-400 dark:bg-slate-800/50'}`}>{isCompleted ? '🔥' : isToday ? '⏳' : '·'}</span>
                      <span className="font-mono text-[8px] text-slate-400">{date.getDate()}/{date.getMonth() + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">⚡ Đặc Quyền Chuỗi Bạn Đang Nhận</h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/60"><div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Thưởng Nhiệm Vụ</div><div className="mt-0.5 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">+{bonusPercent}% Vàng</div><div className="mt-0.5 text-[9px] text-slate-400">{getNextStreakMilestone(streak)}</div></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/60"><div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Hạn Mức Ngân Hàng</div><div className="mt-0.5 font-mono text-sm font-bold text-blue-600 dark:text-blue-400">+{streak * 5} Vàng</div><div className="mt-0.5 text-[9px] text-slate-400">+5 Vàng / mỗi ngày chuỗi</div></div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">🏆 Các Mốc Thưởng Chuỗi</h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 text-[10px] dark:border-slate-800">
                <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-100 p-2 font-bold uppercase dark:border-slate-800 dark:bg-slate-900"><span>Chuỗi</span><span>Danh hiệu</span><span className="text-center">Thưởng NV</span><span className="text-right">Hạn mức</span></div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  <div className="grid grid-cols-4 items-center p-2"><span className="font-mono">1 - 2 ngày</span><span className="text-slate-600 dark:text-slate-400">Khởi Đầu</span><span className="text-center font-mono text-slate-500">+0%</span><span className="text-right font-mono text-blue-600 dark:text-blue-400">+5 - +10</span></div>
                  <div className="grid grid-cols-4 items-center p-2"><span className="font-mono">3 - 6 ngày</span><span className="font-medium text-orange-600 dark:text-orange-400">Cần Mẫn</span><span className="text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">+5%</span><span className="text-right font-mono text-blue-600 dark:text-blue-400">+15 - +30</span></div>
                  <div className="grid grid-cols-4 items-center p-2"><span className="font-mono">7 - 13 ngày</span><span className="font-semibold text-red-500">Bền Bỉ</span><span className="text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">+10%</span><span className="text-right font-mono text-blue-600 dark:text-blue-400">+35 - +65</span></div>
                  <div className="grid grid-cols-4 items-center p-2"><span className="font-mono">14 - 29 ngày</span><span className="font-bold text-purple-600 dark:text-purple-400">Chuyên Cần</span><span className="text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">+15%</span><span className="text-right font-mono text-blue-600 dark:text-blue-400">+70 - +145</span></div>
                  <div className="grid grid-cols-4 items-center bg-orange-500/5 p-2"><span className="font-mono font-bold">30+ ngày</span><span className="font-extrabold text-amber-500">Bất Bại 👑</span><span className="text-center font-mono font-bold text-emerald-500">+20% (Max)</span><span className="text-right font-mono font-bold text-blue-500">+150+</span></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="button" onClick={close} className="cursor-pointer rounded-xl bg-orange-500 px-5 py-2 text-xs font-bold text-slate-950 transition hover:bg-orange-400">Đã Hiểu</button>
            </div>
          </div>
        </ModalFrame>
      )}
    </>
  );
}
