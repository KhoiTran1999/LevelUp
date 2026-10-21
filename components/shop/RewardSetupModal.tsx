'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLevelUp } from '@/components/providers/LevelUpProvider';
import { AiNegotiationChat } from '@/components/ai/AiNegotiationChat';
import { extractDurationFromText } from '@/lib/proof-utils';
import type { ShopItem, ShopItemTier } from '@/types/levelup';

interface RewardSuggestion {
  name: string;
  description: string;
  targetMinutes: number;
  price: number;
  icon: string;
  reason: string;
}

const DEFAULT_REWARD_SUGGESTIONS: RewardSuggestion[] = [
  {
    name: '1 Ly Trà Sữa / Cà Phê Yêu Thích',
    description: 'Tự thưởng một cốc đồ uống ngon lành sau buổi học tập, làm việc chăm chỉ.',
    targetMinutes: 0,
    price: 35,
    icon: '🧋',
    reason: 'Thưởng thức đồ uống giải nhiệt, nạp năng lượng tích cực.',
  },
  {
    name: 'Lướt Mạng Xã Hội / Xem Video 30 Phút',
    description: 'Giải trí thư giãn thoải mái sau khi hoàn thành mục tiêu tập trung.',
    targetMinutes: 30,
    price: 20,
    icon: '📱',
    reason: 'Thư giãn có kiểm soát với đồng hồ hẹn giờ.',
  },
  {
    name: 'Chơi 1 Trận Game Yêu Thích',
    description: 'Chơi 1 ván game giải tỏa căng thẳng sau khi hoàn thành mục tiêu ngày.',
    targetMinutes: 30,
    price: 30,
    icon: '🎮',
    reason: 'Giải tỏa áp lực trí não và tận hưởng chiến thắng.',
  },
  {
    name: 'Xem 1 Tập Phim Truyền Hình / Anime',
    description: 'Thưởng thức tập phim yêu thích không bị gián đoạn hay cảm giác tội lỗi.',
    targetMinutes: 45,
    price: 40,
    icon: '🍿',
    reason: 'Tận hưởng cốt truyện và thế giới giải trí hấp dẫn.',
  },
  {
    name: 'Đi Dạo & Mua Món Đồ Nhỏ Yêu Thích',
    description: 'Tự thưởng một món quà lưu niệm hoặc đồ dùng cá nhân xinh xắn.',
    targetMinutes: 60,
    price: 80,
    icon: '🛍️',
    reason: 'Tạo cảm giác thành tựu rõ rệt sau chuỗi ngày nỗ lực.',
  },
];

function triggerToast(msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  if (typeof window !== 'undefined') {
    (window as unknown as { showToast?: (m: string, t: string) => void }).showToast?.(msg, type);
  }
}

export function RewardSetupModal() {
  const {
    isRewardModalOpen,
    isRewardRenegotiating,
    editingReward,
    closeRewardModal,
    addShopItem,
    state,
  } = useLevelUp();

  // Modal Step: 1 = Form, 2 = Evaluating, 3 = Verdict
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatePrice, setEstimatePrice] = useState('');
  const [estimateDuration, setEstimateDuration] = useState('');

  // Suggestions toggle state
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Evaluating Step State
  const [evalStepInfo, setEvalStepInfo] = useState<{ text: string; pct: number }>({
    text: 'Đánh giá mức độ thoả mãn...',
    pct: 30,
  });
  const evalTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Verdict State
  const [pendingReward, setPendingReward] = useState<Partial<ShopItem> & {
    isModified?: boolean;
    modificationReason?: string;
  } | null>(null);
  const [showDebate, setShowDebate] = useState(false);

  // Reset or initialize when modal opens/closes
  useEffect(() => {
    if (!isRewardModalOpen) {
      setStep(1);
      setName('');
      setDescription('');
      setEstimatePrice('');
      setEstimateDuration('');
      setPendingReward(null);
      setShowDebate(false);
      if (evalTimerRef.current) clearInterval(evalTimerRef.current);
      return;
    }

    if (editingReward && isRewardRenegotiating) {
      setName(editingReward.name || '');
      setDescription(editingReward.description || '');
      setEstimatePrice(editingReward.price ? String(editingReward.price) : '');
      setEstimateDuration(editingReward.targetMinutes ? String(editingReward.targetMinutes) : '');
      setPendingReward({
        id: editingReward.id,
        name: editingReward.name,
        description: editingReward.description || '',
        price: editingReward.price || 30,
        tier: editingReward.tier || 'rare',
        targetMinutes: editingReward.targetMinutes || 0,
        icon: editingReward.icon || '🎁',
        verdict: editingReward.verdict || 'Phần thưởng hợp lý.',
        isModified: false,
      });
      setShowDebate(true);
      setStep(3);
    } else if (editingReward) {
      setName(editingReward.name || '');
      setDescription(editingReward.description || '');
      setEstimatePrice(editingReward.price ? String(editingReward.price) : '');
      setEstimateDuration(editingReward.targetMinutes ? String(editingReward.targetMinutes) : '');
      setStep(1);
    } else {
      setStep(1);
      setName('');
      setDescription('');
      setEstimatePrice('');
      setEstimateDuration('');
      setPendingReward(null);
      setShowDebate(false);
    }
  }, [isRewardModalOpen, editingReward, isRewardRenegotiating]);

  useEffect(() => {
    return () => {
      if (evalTimerRef.current) clearInterval(evalTimerRef.current);
    };
  }, []);

  if (!isRewardModalOpen) return null;

  // Handle Suggestion Click
  const handleSelectSuggestion = (s: RewardSuggestion) => {
    setName(s.name);
    setDescription(s.description);
    setEstimateDuration(String(s.targetMinutes));
    setEstimatePrice(String(s.price));
  };

  // Start AI evaluation
  const handleStartEvaluation = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      triggerToast('Vui lòng nhập tên phần thưởng!', 'error');
      return;
    }

    let dur = parseInt(estimateDuration, 10) || 0;
    if (dur <= 0) {
      const parsedDur = extractDurationFromText(`${trimmedName} ${description}`);
      if (parsedDur > 0) dur = parsedDur;
    }
    const priceEst = parseInt(estimatePrice, 10) || 0;

    // Transition to Step 2: Evaluating
    setStep(2);
    setEvalStepInfo({ text: 'Đánh giá mức độ thoả mãn...', pct: 30 });

    const progressSteps = [
      { text: 'Đánh giá mức độ thoả mãn...', pct: 30 },
      { text: 'Tính toán chi phí cơ hội...', pct: 65 },
      { text: 'Thiết lập giá Vàng cân bằng...', pct: 90 },
    ];
    let stepIdx = 0;
    if (evalTimerRef.current) clearInterval(evalTimerRef.current);
    evalTimerRef.current = setInterval(() => {
      stepIdx++;
      if (stepIdx < progressSteps.length) {
        setEvalStepInfo(progressSteps[stepIdx]);
      }
    }, 1100);

    try {
      const currentQuests = (state.quests || [])
        .filter(q => q.status === 'active')
        .slice(0, 10)
        .map(q => ({
          title: q.title,
          rewardCoins: q.rewardCoins,
          type: q.type,
          targetMinutes: q.targetMinutes,
        }));

      const res = await fetch('/api/ai', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'evaluate_reward',
          payload: {
            name: trimmedName,
            description: description.trim(),
            userEstimatePrice: priceEst,
            userEstimateDuration: dur,
            currentQuests,
            userCoins: state.profile?.coins || 0,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.details || err.error || 'AI Error');
      }

      const data = await res.json();
      if (evalTimerRef.current) clearInterval(evalTimerRef.current);

      const finalName = data.name && typeof data.name === 'string' ? data.name.trim() : trimmedName;
      const finalDesc =
        data.description !== undefined && typeof data.description === 'string'
          ? data.description.trim()
          : description.trim();
      const isModified =
        Boolean(data.isModified) || finalName.toLowerCase() !== trimmedName.toLowerCase();

      const verdictObj: Partial<ShopItem> & {
        isModified?: boolean;
        modificationReason?: string;
      } = {
        name: finalName,
        description: finalDesc,
        isModified,
        modificationReason:
          data.modificationReason ||
          (isModified
            ? 'AI đã điều chỉnh phần thưởng để lành mạnh và duy trì động lực tốt hơn.'
            : ''),
        price: data.price || 30,
        tier: (data.tier || 'rare') as ShopItemTier,
        targetMinutes: data.targetMinutes !== undefined ? Number(data.targetMinutes) : dur,
        icon: data.icon || '🎁',
        verdict: data.verdict || 'Phần thưởng đã được định giá phù hợp.',
      };

      setPendingReward(verdictObj);
      setStep(3);
    } catch (err: unknown) {
      if (evalTimerRef.current) clearInterval(evalTimerRef.current);
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
      triggerToast(`Không thể kết nối với AI (${msg}). Vui lòng thử lại sau.`, 'error');
      setStep(1);
    }
  };

  // Accept Verdict and Save to Shop
  const handleSaveReward = () => {
    if (!pendingReward || !pendingReward.name) return;

    if (editingReward) {
      addShopItem({
        ...editingReward,
        ...pendingReward,
      });
      triggerToast('Đã cập nhật phần thưởng thành công!', 'success');
    } else {
      addShopItem({
        id: `shop_${Date.now()}`,
        name: pendingReward.name,
        description: pendingReward.description || '',
        price: pendingReward.price || 30,
        tier: pendingReward.tier || 'rare',
        targetMinutes: pendingReward.targetMinutes || 0,
        icon: pendingReward.icon || '🎁',
        verdict: pendingReward.verdict || '',
      });
      triggerToast('Đã thêm phần thưởng vào Cửa Hàng!', 'success');
    }

    if (typeof window !== 'undefined') {
      const win = window as unknown as { sfx?: { playFanfare?: () => void } };
      win.sfx?.playFanfare?.();
    }

    closeRewardModal();
  };

  return (
    <div
      id="modal-reward"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 m3-modal-sheet"
      role="dialog"
      aria-modal="true"
    >
      <div className="rpg-panel rounded-2xl w-full sm:max-w-lg m3-dialog-panel border border-amber-500/30 overflow-hidden modal-fade shadow-2xl max-h-[92vh] flex flex-col">
        <div className="m3-drag-handle sm:hidden"></div>

        {/* Modal Header */}
        <div className="bg-slate-100 dark:bg-slate-900 px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-purple-500">redeem</span>
            <div>
              <h3
                id="modal-reward-title"
                className="font-rpg-title font-extrabold text-sm sm:text-base text-amber-600 dark:text-amber-400"
              >
                {isRewardRenegotiating
                  ? 'THƯƠNG LƯỢNG LẠI PHẦN THƯỞNG'
                  : editingReward
                  ? 'Chỉnh sửa phần thưởng'
                  : 'Thêm phần thưởng mới'}
              </h3>
              <p
                id="modal-reward-subtitle"
                className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400"
              >
                {isRewardRenegotiating
                  ? 'Trực tiếp trao đổi với AI để điều chỉnh giá trị hoặc thời lượng phần thưởng'
                  : 'Nhập phần thưởng bạn muốn để AI định giá Vàng phù hợp'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-reward-modal"
            type="button"
            onClick={closeRewardModal}
            className="modal-close m3-icon-btn w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition shrink-0 active:scale-95"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </div>

        {/* Step 1: Input Form */}
        {step === 1 && (
          <div id="reward-form-step" className="p-5 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto">
            {/* Smart Auto-Suggestions Container */}
            <div
              id="reward-suggestions-container"
              className="rounded-xl border border-purple-500/25 bg-purple-500/5 dark:bg-purple-500/10 p-2.5 sm:p-3 space-y-2 transition"
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-400 whitespace-nowrap">
                    Gợi ý phần thưởng
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate hidden sm:inline">
                    • Chạm để điền nhanh
                  </span>
                </div>
                <button
                  id="btn-toggle-reward-suggestions"
                  type="button"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-purple-500/10 transition text-xs shrink-0 cursor-pointer"
                  title="Thu gọn / Mở rộng gợi ý"
                >
                  <span id="icon-toggle-reward-suggestions">{showSuggestions ? '▲' : '▼'}</span>
                </button>
              </div>

              {showSuggestions && (
                <div id="reward-suggestions-list" className="space-y-1.5">
                  {DEFAULT_REWARD_SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 hover:bg-purple-500/10 dark:hover:bg-purple-500/15 border border-slate-200/60 dark:border-slate-800 transition flex items-center justify-between gap-2 text-xs group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">{item.icon}</span>
                        <div className="truncate">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {item.reason}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
                        {item.price} Vàng
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Tên phần thưởng *
              </label>
              <input
                id="input-reward-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleStartEvaluation();
                }}
                placeholder="Ví dụ: Xem 1 tập phim, Uống trà sữa..."
                className="w-full rpg-input rounded-xl px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Mô tả (Không bắt buộc)
              </label>
              <textarea
                id="input-reward-desc"
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Mô tả cụ thể món quà bạn muốn tự thưởng..."
                className="w-full rpg-input rounded-xl px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Mức Vàng đề xuất (Không bắt buộc)
              </label>
              <input
                id="input-reward-estimate"
                type="number"
                value={estimatePrice}
                onChange={e => setEstimatePrice(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleStartEvaluation();
                }}
                placeholder="Ví dụ: 35 (Để trống để AI tự tính)"
                className="w-full rpg-input rounded-xl px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Thời gian tận hưởng (Phút - Không bắt buộc)
              </label>
              <input
                id="input-reward-duration"
                type="number"
                value={estimateDuration}
                onChange={e => setEstimateDuration(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleStartEvaluation();
                }}
                placeholder="Ví dụ: 30 (Đặt 0 nếu không cần bấm giờ)"
                className="w-full rpg-input rounded-xl px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-mono"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={closeRewardModal}
                className="modal-close m3-btn m3-btn-text px-4 py-2.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                id="btn-eval-reward"
                type="button"
                onClick={handleStartEvaluation}
                className="m3-btn m3-btn-filled flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                <span>🤖</span>
                <span>AI Định Giá</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: AI Evaluating Spinner */}
        {step === 2 && (
          <div id="reward-evaluating-step" className="p-6 sm:p-8 text-center space-y-4 max-w-md mx-auto">
            <div className="m3-loading-indicator contained mx-auto text-amber-500">
              <span className="m3-loading-indicator-shape large"></span>
            </div>
            <div>
              <h4
                id="reward-evaluating-title"
                className="font-rpg-title font-bold text-amber-600 dark:text-amber-400 text-base"
              >
                AI đang định giá phần thưởng...
              </h4>
              <p
                id="reward-evaluating-subtitle"
                className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto"
              >
                Đang tính toán số Vàng và thời gian tận hưởng phù hợp...
              </p>
            </div>
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span id="reward-evaluating-phase-text">{evalStepInfo.text}</span>
                <span id="reward-evaluating-pct">{evalStepInfo.pct}%</span>
              </div>
              <div
                className="m3-linear-progress m3-linear-progress--thick"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  id="reward-evaluating-progress-bar"
                  className="m3-linear-progress-bar"
                  style={{ width: `${evalStepInfo.pct}%` }}
                ></div>
                <div className="m3-linear-progress-stop"></div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: AI Verdict Display */}
        {step === 3 && pendingReward && (
          <div id="reward-verdict-step" className="p-4 sm:p-6 space-y-3 sm:space-y-3.5 overflow-y-auto">
            {/* AI Modification Notice */}
            {pendingReward.isModified && (
              <div
                id="reward-modified-notice"
                className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs space-y-1"
              >
                <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                  <span>⚡</span>
                  <span>AI đã tối ưu lại phần thưởng:</span>
                </div>
                <p id="reward-modified-reason" className="text-[11px] leading-relaxed italic">
                  {pendingReward.modificationReason}
                </p>
              </div>
            )}

            {/* Hidden Legacy Elements for 100% Contract Safety */}
            <div className="hidden" aria-hidden="true">
              <span id="eval-tier" className="hidden">
                {(pendingReward.tier || 'rare').toUpperCase()}
              </span>
              <span id="eval-price">{pendingReward.price || 35} Vàng</span>
              <div id="reward-eval-time-box">
                <span id="eval-target-minutes">{pendingReward.targetMinutes || 30} Phút</span>
              </div>
              <span id="eval-advice">Tự thưởng có chừng mực sau khi nỗ lực để duy trì động lực bền vững.</span>
              <span id="reward-locked-tier-label">{(pendingReward.tier || 'rare').toUpperCase()}</span>
              <p id="eval-verdict">{pendingReward.verdict || 'Phán quyết...'}</p>
            </div>

            {/* Clean Unified Reward Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-start gap-3">
                <span
                  id="reward-locked-icon"
                  className="text-xl shrink-0 p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400"
                >
                  {pendingReward.icon || '🎁'}
                </span>
                <div className="min-w-0 flex-1">
                  <h4
                    id="reward-locked-name"
                    className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug"
                  >
                    {pendingReward.name}
                  </h4>
                  {pendingReward.description && (
                    <div id="reward-locked-desc-container" className="pt-0.5">
                      <p
                        id="reward-locked-desc"
                        className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed"
                      >
                        {pendingReward.description}
                      </p>
                    </div>
                  )}
                </div>
                <span
                  id="eval-category-badge"
                  className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/30 shrink-0"
                >
                  🎁 TỰ THƯỞNG
                </span>
              </div>

              {/* Parameter Pills Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <div
                  id="reward-locked-time-box"
                  onClick={() => {
                    setShowDebate(true);
                    triggerToast(
                      'Thời gian phần thưởng do AI thẩm định. Hãy thương lượng với AI ở khung bên dưới!',
                      'info'
                    );
                  }}
                  className="bg-white dark:bg-slate-950/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs cursor-pointer hover:border-purple-400/50 transition group"
                  title="Thời gian do AI thẩm định. Bấm để thương lượng với AI ở khung bên dưới."
                >
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Thời gian:
                  </span>
                  <span className="flex items-center gap-1">
                    <span
                      id="reward-locked-time-label"
                      className="font-bold text-xs text-purple-600 dark:text-purple-400 font-mono"
                    >
                      {!pendingReward.targetMinutes ? 'Không cần bấm giờ' : `${pendingReward.targetMinutes} Phút`}
                    </span>
                    <span className="text-[10px] text-slate-400 group-hover:text-purple-500 transition" title="Do AI thẩm định">🔒</span>
                  </span>
                </div>
                <div
                  onClick={() => {
                    setShowDebate(true);
                    triggerToast(
                      'Giá Vàng phần thưởng do AI thẩm định. Hãy thương lượng với AI ở khung bên dưới!',
                      'info'
                    );
                  }}
                  className="bg-white dark:bg-slate-950/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs cursor-pointer hover:border-amber-400/50 transition group"
                  title="Giá Vàng do AI thẩm định. Bấm để thương lượng với AI ở khung bên dưới."
                >
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Giá đổi:
                  </span>
                  <span className="flex items-center gap-1">
                    <span
                      id="reward-locked-price-label"
                      className="font-bold text-amber-600 dark:text-amber-400 font-mono inline-flex items-center gap-1"
                    >
                      <span className="coin-icon"></span> {pendingReward.price || 35} Vàng
                    </span>
                    <span className="text-[10px] text-slate-400 group-hover:text-amber-500 transition" title="Do AI thẩm định">🔒</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Reward Debate Container */}
            {showDebate && (
              <AiNegotiationChat
                reward={pendingReward}
                type="reward"
                onRewardVerdictUpdated={updated => {
                  setPendingReward(prev => (prev ? { ...prev, ...updated } : prev));
                }}
              />
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2.5 pt-2">
              <button
                id="btn-open-reward-debate"
                type="button"
                onClick={() => setShowDebate(!showDebate)}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold self-start sm:self-auto flex items-center gap-1 cursor-pointer"
              >
                <span>💬</span>
                <span>
                  {showDebate
                    ? 'Thu gọn khung thương lượng'
                    : 'Muốn chỉnh sửa? Thương lượng với AI'}
                </span>
              </button>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={closeRewardModal}
                  className="modal-close px-3.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  id="btn-save-reward"
                  type="button"
                  onClick={handleSaveReward}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
                >
                  {editingReward ? '✓ Cập Nhật Phần Thưởng' : '✓ Đồng Ý & Thêm Vào Cửa Hàng'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
