'use client';

const earningExamples = [
  <> <b>25 - 30 phút tập trung sâu:</b> Kiếm được <b>~10 Vàng</b> (tương đương ~20 - 24 Vàng/tiếng).</>,
  <><b>Việc nhà dọn dẹp nhanh (5-10p):</b> Cố định <b>3 - 5 Vàng</b>.</>,
  <><b>Việc sinh hoạt hiển nhiên:</b> 1 - 2 Vàng tượng trưng (chống farm điểm lười biếng).</>,
];

const rewardExamples = [
  <><b>30 phút lướt mạng / xem video:</b> Giá <b>30 - 35 Vàng</b> (cần ~1.5 tiếng nỗ lực).</>,
  <><b>1 ly trà sữa / cà phê:</b> Giá <b>40 - 55 Vàng</b> (cần ~2 tiếng làm việc sâu).</>,
  <><b>1 giờ chơi game / xem phim:</b> Giá <b>55 - 65 Vàng</b> (cần ~3 tiếng tập trung).</>,
];

const judges = [
  {
    icon: '🎯',
    classes: 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300',
    title: 'Trọng Tài Nhiệm Vụ',
    description: 'Tự động chia nhỏ mục tiêu bị nhồi nhét quá tải và định mức Vàng công bằng theo thời gian.',
  },
  {
    icon: '🛍️',
    classes: 'bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300',
    title: 'Trọng Tài Cửa Hàng',
    description: 'Định giá quà tương xứng với công sức, bắt buộc có đồng hồ đếm ngược giải trí và ngăn chặn thói quen độc hại.',
  },
  {
    icon: '🛡️',
    classes: 'bg-sky-500/5 dark:bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-300',
    title: 'Trọng Tài Bằng Chứng',
    description: 'Thẩm định ảnh chụp 📸 hoặc báo cáo công việc ✍️. Kiên quyết từ chối nếu khai không biết làm gì, lạc đề hoặc vô lý.',
  },
];

const features = [
  {
    icon: '⚔️',
    title: 'Cấp Độ & EXP Bền Vững',
    description: '1 Vàng kiếm được = 1 EXP. Tiêu Vàng mua quà không làm mất EXP. Thăng tiến từ Tân Binh lên Huyền Thoại Kỷ Luật.',
  },
  {
    icon: '⏱️',
    title: 'Đồng Hồ Bảo Lưu Thông Minh',
    description: 'Đang làm dở có việc gấp? Bấm Bảo Lưu để cất thời gian còn lại, tiếp tục sau mà không sợ mất chuỗi hay hỏng việc.',
  },
  {
    icon: '🏦',
    title: 'Ngân Hàng RPG & Vay Vốn',
    description: 'Gửi tiết kiệm nhận lãi mỗi ngày. Vay Vàng đổi quà với cơ chế tự động trích nợ êm ái qua từng nhiệm vụ hoàn thành.',
  },
  {
    icon: '🤝',
    title: 'Quyền Thương Lượng Với AI',
    description: 'Bất cứ lúc nào mệt mỏi hay việc quá khó, bạn có quyền bấm "Thương lượng" để xin giảm phút, tăng Vàng hoặc miễn ảnh chụp!',
  },
];

function ExampleList({ items, color }: { items: React.ReactNode[]; color: 'emerald' | 'purple' }) {
  const bulletClass = color === 'emerald' ? 'text-emerald-500' : 'text-purple-500';
  return (
    <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 mt-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-1.5">
          <span className={`${bulletClass} font-bold`}>•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function AboutModal() {
  return (
    <div id="modal-about" className="fixed inset-0 z-50 hidden bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="modal-about-title">
      <div className="rpg-panel rounded-2xl sm:rounded-3xl w-full max-w-2xl border border-indigo-500/40 overflow-hidden modal-fade shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-white dark:bg-slate-900">
        <div className="bg-indigo-50/80 dark:bg-indigo-950/50 px-5 sm:px-6 py-3.5 sm:py-4 border-b border-indigo-500/20 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 flex items-center justify-center text-xl shadow-xs">⚔️</div>
            <div>
              <h3 id="modal-about-title" className="font-rpg-title font-black text-sm sm:text-base text-indigo-700 dark:text-indigo-300 tracking-wide uppercase">GIỚI THIỆU LEVELUP RPG</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Game hóa năng suất &amp; Kỷ luật cá nhân đỉnh cao</p>
            </div>
          </div>
          <button id="btn-close-about-top" type="button" className="modal-close w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition shrink-0 active:scale-95" aria-label="Đóng">
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar overscroll-contain p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-amber-500/10 border border-indigo-500/20">
            <div className="flex items-center gap-2 font-bold text-sm text-indigo-600 dark:text-indigo-400 mb-1.5">
              <span>✨</span><span>LevelUp Là Gì? (Hiểu Trong 1 Phút)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              LevelUp biến các công việc học tập, làm việc và thói quen sinh hoạt mỗi ngày của bạn thành một chuyến phiêu lưu nhập vai <b>RPG thực thụ</b>. Mỗi khi bạn hoàn thành nhiệm vụ, bạn nhận được <b>Vàng (Coins)</b> và <b>EXP</b> để nâng cấp hiệp sĩ và tự do đổi lấy những phần thưởng giải trí mình yêu thích.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1.5 text-xs">⚖️ <span>Kinh Tế Cân Bằng: Kiếm Vàng vs Tiêu Vàng</span></span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono font-bold">Quy luật 3:1</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-500/20 space-y-2 flex flex-col justify-between">
                <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">🪙 <span>AI Tính Thưởng (Kiếm Vàng)</span></div>
                <ExampleList items={earningExamples} color="emerald" />
              </div>
              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-500/20 space-y-2 flex flex-col justify-between">
                <div className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">🎁 <span>AI Định Giá Quà (Tiêu Vàng)</span></div>
                <ExampleList items={rewardExamples} color="purple" />
              </div>
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-300 italic bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
              💡 <b>Tại sao lại có tỷ lệ này?</b> Bỏ ra 3 giờ nỗ lực để đổi lấy 1 giờ giải trí trọn vẹn giúp ngăn chặn "dopamine giá rẻ", bảo vệ sức khỏe và giúp bạn tận hưởng phần thưởng mà <b>không còn cảm giác tội lỗi</b>!
            </div>
          </div>

          <section className="space-y-2.5">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide text-xs flex items-center gap-1.5">🤖 <span>Bộ 3 Trọng Tài AI Giám Sát Công Tâm</span></h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
              {judges.map(judge => (
                <div key={judge.title} className={`p-3 rounded-xl border flex flex-col justify-between ${judge.classes}`}>
                  <div className="text-base mb-1">{judge.icon}</div>
                  <div className="font-bold">{judge.title}</div>
                  <p className="text-slate-600 dark:text-slate-400 mt-1 leading-normal">{judge.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2.5 pb-2">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide text-xs flex items-center gap-1.5">🌟 <span>Các Tính Năng RPG Độc Đáo Khác</span></h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
              {features.map(feature => (
                <div key={feature.title} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                  <span className="text-xl shrink-0">{feature.icon}</span>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{feature.title}</div>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 shrink-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
          <button id="btn-about-start-tour" type="button" className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer">
            <span className="material-symbols-outlined text-base leading-none">explore</span><span>Xem Tour Hướng Dẫn</span>
          </button>
          <button id="btn-close-about-bottom" type="button" className="modal-close w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition active:scale-95 cursor-pointer">
            Đã Hiểu &amp; Bắt Đầu Phiêu Lưu 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
