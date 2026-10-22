'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  parseDebateOptionsFromText,
  fetchDebateStream,
  type DebateOption,
} from '@/lib/proof-utils';
import type { Quest, ShopItem, BankLoan } from '@/types/levelup';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system' | 'step';
  text: string;
  options?: DebateOption[];
  timestamp?: number;
}

interface AiNegotiationChatProps {
  quest?: Partial<Quest> | null;
  reward?: Partial<ShopItem> | null;
  loan?: Partial<BankLoan> | null;
  type?: 'quest' | 'reward' | 'loan';
  onOptionSelected?: (option: DebateOption) => void;
  onVerdictUpdated?: (updated: Partial<Quest>) => void;
  onRewardVerdictUpdated?: (updated: Partial<ShopItem>) => void;
  onLoanTermsUpdated?: (terms: {
    newBorrowRate?: number;
    newCreditLimit?: number;
    newAutoDeductPercent?: number;
    newAmount?: number;
    signature?: string;
  }) => void;
}

function useHorizontalScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 1. Wheel listener: convert vertical mouse wheel to horizontal scroll
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    // 2. Mouse drag-to-scroll
    let isDown = false;
    let startX = 0;
    let scrollStart = 0;
    let hasMoved = false;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isDown = true;
      hasMoved = false;
      startX = e.clientX;
      scrollStart = el.scrollLeft;

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (!hasMoved && Math.abs(dx) > 4) {
        hasMoved = true;
        el.classList.add('is-dragging');
      }
      if (hasMoved) {
        el.scrollLeft = scrollStart - dx;
      }
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      el.classList.remove('is-dragging');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    // Prevent child button click if mouse was dragging
    const onClickCapture = (e: MouseEvent) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
        hasMoved = false;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('click', onClickCapture, true);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const scrollBy = (offset: number) => {
    if (ref.current) {
      ref.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return { ref, scrollBy };
}

export function AiNegotiationChat({
  quest,
  reward,
  loan,
  type = 'quest',
  onOptionSelected,
  onVerdictUpdated,
  onRewardVerdictUpdated,
  onLoanTermsUpdated,
}: AiNegotiationChatProps) {
  const loanScroll = useHorizontalScroll<HTMLDivElement>();
  const rewardScroll = useHorizontalScroll<HTMLDivElement>();
  const questScroll = useHorizontalScroll<HTMLDivElement>();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputArg, setInputArg] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStepText, setCurrentStepText] = useState<string | null>(null);

  const chatLogsRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatLogsRef.current) {
      chatLogsRef.current.scrollTop = chatLogsRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStepText]);

  // Initial welcome message from AI
  useEffect(() => {
    if (messages.length === 0) {
      if (type === 'reward' && reward) {
        const initialSpeech =
          reward.verdict ||
          'Tôi đã xem qua phần thưởng bạn muốn đổi. Bạn có muốn thương lượng lại mức giá hay thời gian không?';
        setMessages([
          {
            id: 'welcome_reward',
            sender: 'ai',
            text: initialSpeech,
            timestamp: Date.now(),
          },
        ]);
      } else if (type === 'loan') {
        const initialSpeech =
          'Chào bạn! Tôi là Trợ lý Vay Vàng AI. Bạn muốn thương lượng giảm lãi suất, xin nâng hạn mức hay điều chỉnh tỷ lệ trích nợ?';
        setMessages([
          {
            id: 'welcome_loan',
            sender: 'ai',
            text: initialSpeech,
            timestamp: Date.now(),
          },
        ]);
      } else if (quest) {
        const initialSpeech =
          quest.advice ||
          quest.verdict ||
          'Tôi đã xem qua thiết lập nhiệm vụ. Bạn có điều gì muốn thương lượng lại không?';
        setMessages([
          {
            id: 'welcome_quest',
            sender: 'ai',
            text: initialSpeech,
            timestamp: Date.now(),
          },
        ]);
      }
    }
  }, [quest, reward, loan, type, messages.length]);

  const handleSendArgument = async (customText?: string, selectedOption?: DebateOption | null) => {
    const textToSend = (customText || inputArg).trim();
    if (!textToSend || isStreaming) return;

    const userMsgId = `user_${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        text: textToSend,
        timestamp: Date.now(),
      },
    ];
    setMessages(newMessages);
    setInputArg('');
    setIsStreaming(true);
    setCurrentStepText('AI đang suy nghĩ...');

    try {
      const historyPayload = newMessages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      let action = 'debate_quest';
      let targetPayload: unknown = quest;
      let payloadKey = 'quest';

      if (type === 'reward') {
        action = 'debate_reward';
        targetPayload = reward;
        payloadKey = 'reward';
      } else if (type === 'loan') {
        action = 'debate_loan';
        targetPayload = loan;
        payloadKey = 'loan';
      }

      const data = await fetchDebateStream<{
        reply?: string;
        text?: string;
        options?: DebateOption[];
        verdict?: Partial<Quest> & Partial<ShopItem>;
        accepted?: boolean;
        newRewardCoins?: number;
        newTargetMinutes?: number;
        newRequiresProof?: boolean;
        newProofType?: 'photo' | 'text' | 'both';
        newPrice?: number;
        newTier?: ShopItem['tier'];
        newName?: string;
        newBorrowRate?: number;
        newCreditLimit?: number;
        newAutoDeductPercent?: number;
        newAmount?: number;
        signature?: string;
        loanSignature?: string;
      }>(
        '/api/ai',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            action,
            payload: {
              [payloadKey]: targetPayload,
              argument: textToSend,
              history: historyPayload,
              ...(selectedOption ? { selectedOption } : {}),
            },
          }),
        },
        (step) => {
          if (step.text || step.description) {
            setCurrentStepText(step.text || step.description || '');
          }
        }
      );

      const replyText = data.reply || data.text || 'Tôi đã tiếp nhận ý kiến của bạn.';
      const isFinalChoice = Boolean(selectedOption);
      const parsedOptions = isFinalChoice
        ? []
        : (Array.isArray(data.options) && data.options.length > 0
            ? data.options
            : (data.accepted ? [] : parseDebateOptionsFromText(replyText, type)));

      setMessages(prev => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: replyText,
          options: parsedOptions,
          timestamp: Date.now(),
        },
      ]);

      if (type === 'reward') {
        if (data.verdict) {
          onRewardVerdictUpdated?.(data.verdict);
        } else if (data.accepted) {
          onRewardVerdictUpdated?.({
            ...(data.newPrice !== undefined ? { price: data.newPrice } : {}),
            ...(data.newTargetMinutes !== undefined ? { targetMinutes: data.newTargetMinutes } : {}),
            ...(data.newTier !== undefined ? { tier: data.newTier } : {}),
            ...(data.newName ? { name: data.newName } : {}),
          });
        }
      } else if (type === 'loan') {
        if (
          data.accepted ||
          data.newBorrowRate !== undefined ||
          data.newCreditLimit !== undefined ||
          data.newAutoDeductPercent !== undefined ||
          data.newAmount !== undefined ||
          data.signature !== undefined ||
          data.loanSignature !== undefined
        ) {
          onLoanTermsUpdated?.({
            newBorrowRate: data.newBorrowRate,
            newCreditLimit: data.newCreditLimit,
            newAutoDeductPercent: data.newAutoDeductPercent,
            newAmount: data.newAmount,
            signature: (data.signature || data.loanSignature) as string | undefined,
          });
        }
      } else {
        if (data.verdict) {
          onVerdictUpdated?.(data.verdict);
        } else if (data.accepted) {
          onVerdictUpdated?.({
            ...(data.newRewardCoins !== undefined ? { rewardCoins: data.newRewardCoins } : {}),
            ...(data.newTargetMinutes !== undefined ? { targetMinutes: data.newTargetMinutes } : {}),
            ...(data.newRequiresProof !== undefined ? { requiresProof: data.newRequiresProof } : {}),
            ...(data.newProofType !== undefined ? { proofType: data.newProofType } : {}),
          });
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi kết nối AI';
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'system',
          text: `⚠️ Không thể nhận phản hồi từ AI: ${errorMsg}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsStreaming(false);
      setCurrentStepText(null);
    }
  };

  const handleOptionClick = (option: DebateOption) => {
    onOptionSelected?.(option);
    handleSendArgument(option.argument, option);
  };

  const handleQuickSuggest = (suggestText: string) => {
    setInputArg(suggestText);
  };

  if (type === 'loan') {
    return (
      <div
        id="bank-debate-container"
        className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-slate-950 border border-indigo-500/30 dark:border-slate-800 space-y-3 shadow-inner"
      >
        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800/80">
          <span className="flex items-center gap-1.5">
            <span>💬</span>
            <span>Thương Lượng Khoản Vay</span>
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
            Đề xuất giảm lãi hoặc tăng hạn mức
          </span>
        </div>

        {/* Chat logs container with smooth scroll */}
        <div
          id="bank-debate-chat-logs"
          ref={chatLogsRef}
          className="relative min-h-[200px] max-h-72 sm:max-h-80 overflow-y-auto space-y-2.5 text-xs sm:text-[13px] pr-1.5"
        >
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white font-medium rounded-br-none shadow-sm'
                    : msg.sender === 'system'
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm'
                }`}
              >
                {msg.text}

                {/* Parsed Debate Option Chips */}
                {msg.options && msg.options.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap gap-1.5">
                    {msg.options.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleOptionClick(opt)}
                        disabled={isStreaming}
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <span>⚡</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Live Streaming Step Indicator */}
          {isStreaming && currentStepText && (
            <div className="flex items-start">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-800 dark:text-indigo-300 text-xs flex items-center gap-2 animate-pulse">
                <span className="material-symbols-outlined text-sm animate-spin">
                  autorenew
                </span>
                <span>{currentStepText}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips for Loan */}
        <div className="relative flex items-center gap-1 group/suggest">
          <button
            type="button"
            onClick={() => loanScroll.scrollBy(-150)}
            className="w-6 h-6 shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center text-[10px] shadow-xs cursor-pointer active:scale-95 transition"
            title="Cuộn sang trái"
            aria-label="Cuộn sang trái"
          >
            ◀
          </button>
          <div
            ref={loanScroll.ref}
            id="bank-suggest-chips"
            className="horizontal-scroll-drag flex-1 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar select-none cursor-grab active:cursor-grabbing scroll-smooth"
            title="Cuộn chuột hoặc kéo rê để xem thêm gợi ý"
          >
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
            Gợi ý:
          </span>
          <button
            type="button"
            onClick={() =>
              handleQuickSuggest(
                'Mình có chuỗi chăm chỉ tốt và cam kết làm việc đều, xin giảm lãi suất ngày được không?'
              )
            }
            className="quick-suggest-bank-btn px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0 cursor-pointer text-[11px]"
            data-suggest="Mình có chuỗi chăm chỉ tốt và cam kết làm việc đều, xin giảm lãi suất ngày được không?"
          >
            📉 Xin giảm lãi suất
          </button>
          <button
            type="button"
            onClick={() =>
              handleQuickSuggest(
                'Mình muốn đổi món quà đặc biệt trong Cửa Hàng, bạn nâng thêm hạn mức vay cho mình nhé?'
              )
            }
            className="quick-suggest-bank-btn px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0 cursor-pointer text-[11px]"
            data-suggest="Mình muốn đổi món quà đặc biệt trong Cửa Hàng, bạn nâng thêm hạn mức vay cho mình nhé?"
          >
            🚀 Xin nâng hạn mức
          </button>
          <button
            type="button"
            onClick={() =>
              handleQuickSuggest(
                'Mình cam kết trích 70% tiền thưởng để trả nợ nhanh, bạn cho mình mức lãi ưu đãi nhất nhé!'
              )
            }
            className="quick-suggest-bank-btn px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0 cursor-pointer text-[11px]"
            data-suggest="Mình cam kết trích 70% tiền thưởng để trả nợ nhanh, bạn cho mình mức lãi ưu đãi nhất nhé!"
          >
            ⚡ Cam kết trích nợ 70%
          </button>
          <button
            type="button"
            onClick={() =>
              handleQuickSuggest(
                'Tình hình tài chính của mình hiện tại thì có nên vay không và nên vay bao nhiêu Vàng?'
              )
            }
            className="quick-suggest-bank-btn px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0 cursor-pointer text-[11px]"
            data-suggest="Tình hình tài chính của mình hiện tại thì có nên vay không và nên vay bao nhiêu Vàng?"
          >
            💡 Có nên vay lúc này?
          </button>
          <button
            type="button"
            onClick={() =>
              handleQuickSuggest(
                'Lập giúp mình kế hoạch trả nợ chi tiết theo các nhiệm vụ mình đang có nhé.'
              )
            }
            className="quick-suggest-bank-btn px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0 cursor-pointer text-[11px]"
            data-suggest="Lập giúp mình kế hoạch trả nợ chi tiết theo các nhiệm vụ mình đang có nhé."
          >
            🧭 Lập kế hoạch trả nợ
          </button>
        </div>
          <button
            type="button"
            onClick={() => loanScroll.scrollBy(150)}
            className="w-6 h-6 shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center text-[10px] shadow-xs cursor-pointer active:scale-95 transition"
            title="Cuộn sang phải"
            aria-label="Cuộn sang phải"
          >
            ▶
          </button>
        </div>

        {/* Chat Input Row */}
        <div className="flex gap-2 items-center">
          <input
            id="input-bank-debate-arg"
            type="text"
            value={inputArg}
            onChange={e => setInputArg(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendArgument();
              }
            }}
            disabled={isStreaming}
            placeholder="Nhập đề xuất hoặc chọn gợi ý bên trên..."
            className="flex-1 rpg-input rounded-xl px-3.5 py-2 text-xs transition disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            id="btn-send-bank-debate"
            type="button"
            onClick={() => handleSendArgument()}
            disabled={isStreaming || !inputArg.trim()}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shrink-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
          >
            <span>Gửi</span>
            <span className="text-[10px]">➤</span>
          </button>
        </div>
      </div>
    );
  }

  if (type === 'reward') {
    return (
      <div
        id="reward-debate-container"
        className="p-3.5 sm:p-4 rounded-2xl bg-slate-100/90 dark:bg-slate-950 border border-amber-500/30 dark:border-slate-800 space-y-3 shadow-inner"
      >
        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800/80">
          <span className="flex items-center gap-1.5">
            <span>💬</span>
            <span>Thương Lượng Phần Thưởng</span>
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
            Đưa ra lý do để AI điều chỉnh
          </span>
        </div>

        {/* Chat logs container with smooth scroll */}
        <div
          id="reward-debate-chat-logs"
          ref={chatLogsRef}
          className="relative min-h-[220px] max-h-72 sm:max-h-[340px] overflow-y-auto space-y-2.5 text-xs sm:text-[13px] pr-1"
        >
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                  msg.sender === 'user'
                    ? 'bg-amber-500 text-slate-950 font-medium rounded-br-none shadow-sm'
                    : msg.sender === 'system'
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm'
                }`}
              >
                {msg.text}

                {/* Parsed Debate Option Chips */}
                {msg.options && msg.options.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap gap-1.5">
                    {msg.options.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleOptionClick(opt)}
                        disabled={isStreaming}
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition flex items-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <span>⚡</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Live Streaming Step Indicator */}
          {isStreaming && currentStepText && (
            <div className="flex items-start">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 animate-pulse">
                <span className="material-symbols-outlined text-sm animate-spin">
                  autorenew
                </span>
                <span>{currentStepText}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips for Reward */}
        <div className="relative flex items-center gap-1 group/suggest">
          <button
            type="button"
            onClick={() => rewardScroll.scrollBy(-150)}
            className="w-6 h-6 shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center justify-center text-[10px] shadow-xs cursor-pointer active:scale-95 transition"
            title="Cuộn sang trái"
            aria-label="Cuộn sang trái"
          >
            ◀
          </button>
          <div
            ref={rewardScroll.ref}
            id="reward-suggest-chips"
            className="horizontal-scroll-drag flex-1 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar select-none cursor-grab active:cursor-grabbing scroll-smooth"
            title="Cuộn chuột hoặc kéo rê để xem thêm gợi ý"
          >
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
            Gợi ý:
          </span>
          <button
            type="button"
            onClick={() =>
              handleQuickSuggest(
                'Món này khá đơn giản và nhỏ, mình xin giảm giá Vàng một chút để dễ tự thưởng hơn.'
              )
            }
            className="quick-suggest-reward-btn px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition shrink-0 cursor-pointer text-[11px]"
          >
            📉 Giảm giá Vàng
          </button>
          <button
            type="button"
            onClick={() =>
              handleQuickSuggest(
                'Món quà này rất giá trị và đặc biệt, mình muốn nâng giá Vàng lên cho xứng đáng với nỗ lực.'
              )
            }
            className="quick-suggest-reward-btn px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition shrink-0 cursor-pointer text-[11px]"
          >
            💎 Nâng giá Vàng
          </button>
          <button
            type="button"
            onClick={() =>
              handleQuickSuggest('Mình muốn tăng thêm thời gian tận hưởng món quà này một chút.')
            }
            className="quick-suggest-reward-btn px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition shrink-0 cursor-pointer text-[11px]"
          >
            ⏱️ Tăng thời gian
          </button>
          <button
            type="button"
            onClick={() =>
              handleQuickSuggest('Mình muốn giảm bớt thời gian tự thưởng để tập trung làm việc khác.')
            }
            className="quick-suggest-reward-btn px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition shrink-0 cursor-pointer text-[11px]"
          >
            ⏱️ Giảm thời gian
          </button>
          <button
            type="button"
            onClick={() =>
              handleQuickSuggest(
                'Món quà này mình muốn nhận ngay, không cần hẹn giờ đếm ngược được không?'
              )
            }
            className="quick-suggest-reward-btn px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition shrink-0 cursor-pointer text-[11px]"
          >
            ⚡ Không cần bấm giờ
          </button>
          <button
            type="button"
            onClick={() =>
              handleQuickSuggest('Mình muốn sửa lại tên phần thưởng cho cụ thể và đúng ý hơn.')
            }
            className="quick-suggest-reward-btn px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition shrink-0 cursor-pointer text-[11px]"
          >
            ✏️ Đổi tên quà
          </button>
        </div>
          <button
            type="button"
            onClick={() => rewardScroll.scrollBy(150)}
            className="w-6 h-6 shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center justify-center text-[10px] shadow-xs cursor-pointer active:scale-95 transition"
            title="Cuộn sang phải"
            aria-label="Cuộn sang phải"
          >
            ▶
          </button>
        </div>

        {/* Chat Input Row */}
        <div className="flex gap-2 items-center">
          <input
            id="input-reward-debate-arg"
            type="text"
            value={inputArg}
            onChange={e => setInputArg(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendArgument();
              }
            }}
            disabled={isStreaming}
            placeholder="Nhập đề xuất thương lượng giá quà..."
            className="flex-1 rpg-input rounded-xl px-4 py-2.5 text-xs sm:text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            id="btn-send-reward-debate"
            type="button"
            onClick={() => handleSendArgument()}
            disabled={isStreaming || !inputArg.trim()}
            className="px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shrink-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
          >
            <span>Gửi</span>
            <span className="text-[10px]">➤</span>
          </button>
        </div>
      </div>
    );
  }

  // Default: Quest / Proof negotiation mode
  return (
    <div
      id="debate-container"
      className="p-3.5 sm:p-4 rounded-2xl bg-slate-100/90 dark:bg-slate-950 border border-amber-500/30 dark:border-slate-800 space-y-3 shadow-inner"
    >
      <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800/80">
        <span className="flex items-center gap-1.5">
          <span>💬</span>
          <span>Thương Lượng Với AI</span>
        </span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
          Đưa ra lý do để AI điều chỉnh
        </span>
      </div>

      {/* Chat logs container with smooth scroll */}
      <div
        id="debate-chat-logs"
        ref={chatLogsRef}
        className="relative min-h-[220px] max-h-72 sm:max-h-[340px] overflow-y-auto space-y-2.5 text-xs sm:text-[13px] pr-1"
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[88%] p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                msg.sender === 'user'
                  ? 'bg-amber-500 text-slate-950 font-medium rounded-br-none shadow-sm'
                  : msg.sender === 'system'
                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm'
              }`}
            >
              {msg.text}

              {/* Parsed Debate Option Chips */}
              {msg.options && msg.options.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap gap-1.5">
                  {msg.options.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleOptionClick(opt)}
                      disabled={isStreaming}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition flex items-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <span>⚡</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live Streaming Step Indicator */}
        {isStreaming && currentStepText && (
          <div className="flex items-start">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 animate-pulse">
              <span className="material-symbols-outlined text-sm animate-spin">
                autorenew
              </span>
              <span>{currentStepText}</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Suggestion Chips for Quest */}
      <div className="relative flex items-center gap-1 group/suggest">
        <button
          type="button"
          onClick={() => questScroll.scrollBy(-150)}
          className="w-6 h-6 shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center justify-center text-[10px] shadow-xs cursor-pointer active:scale-95 transition"
          title="Cuộn sang trái"
          aria-label="Cuộn sang trái"
        >
          ◀
        </button>
        <div
          ref={questScroll.ref}
          id="quest-suggest-chips"
          className="horizontal-scroll-drag flex-1 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar select-none cursor-grab active:cursor-grabbing scroll-smooth"
          title="Cuộn chuột hoặc kéo rê để xem thêm gợi ý"
        >
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
          Gợi ý:
        </span>
        <button
          id="btn-suggest-proof"
          type="button"
          onClick={() =>
            handleQuickSuggest(
              'Công việc này mình làm trên điện thoại hoặc không tiện chụp ảnh thực tế, bạn giúp mình miễn chụp ảnh được không?'
            )
          }
          className="quick-suggest-btn px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition shrink-0 cursor-pointer text-[11px]"
          data-suggest-proof="true"
        >
          📸 Xin miễn chụp ảnh
        </button>
        <button
          id="btn-suggest-proof-both"
          type="button"
          onClick={() =>
            handleQuickSuggest(
              'Mình muốn nâng cấp lên kết hợp cả ảnh chụp thực tế và viết báo cáo tóm tắt để rèn luyện kỷ luật cao hơn nhé!'
            )
          }
          className="quick-suggest-btn px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition shrink-0 cursor-pointer text-[11px]"
        >
          📸+✍️ Kết hợp cả hai
        </button>
        <button
          type="button"
          onClick={() =>
            handleQuickSuggest(
              'Nhiệm vụ này cần nhiều nỗ lực và thời gian hơn, mình xin tăng thêm một ít Vàng được không?'
            )
          }
          className="quick-suggest-btn px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition shrink-0 cursor-pointer text-[11px]"
        >
          💰 Xin thêm Vàng
        </button>
        <button
          type="button"
          onClick={() =>
            handleQuickSuggest(
              'Mình muốn chia nhỏ việc này thành phiên tập trung ngắn hơn 25 phút để đỡ quá tải.'
            )
          }
          className="quick-suggest-btn px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition shrink-0 cursor-pointer text-[11px]"
        >
          ⏱️ Giảm thời gian
        </button>
        <button
          type="button"
          onClick={() =>
            handleQuickSuggest(
              'Đây là việc mình làm xong lúc nào thì vào bấm nhận thưởng lúc đó, đổi sang không cần bấm giờ được không?'
            )
          }
          className="quick-suggest-btn px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition shrink-0 cursor-pointer text-[11px]"
        >
          ⚡ Không cần bấm giờ
        </button>
        <button
          type="button"
          onClick={() =>
            handleQuickSuggest(
              'Mình muốn điều chỉnh lại tên hoặc mô tả cho rõ ràng và dễ theo dõi hơn.'
            )
          }
          className="quick-suggest-btn px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition shrink-0 cursor-pointer text-[11px]"
        >
          📝 Đổi tên/mô tả
        </button>
      </div>
        <button
          type="button"
          onClick={() => questScroll.scrollBy(150)}
          className="w-6 h-6 shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center justify-center text-[10px] shadow-xs cursor-pointer active:scale-95 transition"
          title="Cuộn sang phải"
          aria-label="Cuộn sang phải"
        >
          ▶
        </button>
      </div>

      {/* Chat Input Row */}
      <div className="flex gap-2 items-center">
        <input
          id="input-debate-arg"
          type="text"
          value={inputArg}
          onChange={e => setInputArg(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendArgument();
            }
          }}
          disabled={isStreaming}
          placeholder="Nhập đề xuất thương lượng hoặc bấm gợi ý ở trên..."
          className="flex-1 rpg-input rounded-xl px-4 py-2.5 text-xs sm:text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
        />
        <button
          id="btn-send-debate"
          type="button"
          onClick={() => handleSendArgument()}
          disabled={isStreaming || !inputArg.trim()}
          className="px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shrink-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
        >
          <span>Gửi</span>
          <span className="text-[10px]">➤</span>
        </button>
      </div>
    </div>
  );
}
