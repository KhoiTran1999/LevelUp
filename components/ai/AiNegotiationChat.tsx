'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  parseDebateOptionsFromText,
  fetchDebateStream,
  type DebateOption,
} from '@/lib/proof-utils';
import type { Quest, ShopItem } from '@/types/levelup';

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
  type?: 'quest' | 'reward' | 'loan';
  onOptionSelected?: (option: DebateOption) => void;
  onVerdictUpdated?: (updated: Partial<Quest>) => void;
  onRewardVerdictUpdated?: (updated: Partial<ShopItem>) => void;
}

export function AiNegotiationChat({
  quest,
  reward,
  type = 'quest',
  onOptionSelected,
  onVerdictUpdated,
  onRewardVerdictUpdated,
}: AiNegotiationChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputArg, setInputArg] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStepText, setCurrentStepText] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
  }, [quest, reward, type, messages.length]);

  const handleSendArgument = async (customText?: string) => {
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

      const action = type === 'reward' ? 'debate_reward' : 'debate_quest';
      const targetPayload = type === 'reward' ? reward : quest;
      const payloadKey = type === 'reward' ? 'reward' : 'quest';

      const data = await fetchDebateStream<{
        reply?: string;
        text?: string;
        verdict?: Partial<Quest> & Partial<ShopItem>;
        accepted?: boolean;
        newRewardCoins?: number;
        newTargetMinutes?: number;
        newRequiresProof?: boolean;
        newProofType?: 'photo' | 'text' | 'both';
        newPrice?: number;
        newTier?: ShopItem['tier'];
        newName?: string;
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
      const parsedOptions = parseDebateOptionsFromText(replyText, type);

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
    handleSendArgument(option.argument);
  };

  const handleQuickSuggest = (suggestText: string) => {
    setInputArg(suggestText);
  };

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

          <div ref={logsEndRef} />
        </div>

        {/* Quick Suggestion Chips for Reward */}
        <div
          id="reward-suggest-chips"
          className="horizontal-scroll-drag flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar select-none"
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

        <div ref={logsEndRef} />
      </div>

      {/* Quick Suggestion Chips for Quest */}
      <div
        id="quest-suggest-chips"
        className="horizontal-scroll-drag flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar select-none"
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
