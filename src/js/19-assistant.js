// =============================================================================
// AI ASSISTANT / GUILD COMPANION (MODEL BRAIN & MODEL WORKER)
// =============================================================================

let assistantChatHistory = [];
let isAssistantBusy = false;
let currentAssistantAbortCtrl = null;
let assistantAnimTimer = null;

function updateAssistantTransformOrigin(sourceEl = null) {
  const modal = document.getElementById('modal-ai-assistant');
  const panel = modal ? (modal.querySelector('#assistant-panel') || modal.querySelector('.rpg-panel')) : null;
  const fab = document.getElementById('btn-floating-assistant');
  const triggerEl = (sourceEl && typeof sourceEl.getBoundingClientRect === 'function') ? sourceEl : fab;
  if (!modal || !panel) return;

  if (triggerEl) {
    const triggerRect = triggerEl.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    // Tọa độ tâm icon phù thủy tương đối so với panel
    const originX = triggerRect.left + triggerRect.width / 2 - panelRect.left;
    const originY = triggerRect.top + triggerRect.height / 2 - panelRect.top;
    panel.style.transformOrigin = `${originX}px ${originY}px`;
  } else {
    panel.style.transformOrigin = 'calc(100% - 2rem) calc(100% - 2rem)';
  }
}

function openAssistantModal(sourceEl = null) {
  const modal = document.getElementById('modal-ai-assistant');
  if (!modal) return;
  const panel = modal.querySelector('#assistant-panel') || modal.querySelector('.rpg-panel');

  if (assistantAnimTimer) {
    clearTimeout(assistantAnimTimer);
    assistantAnimTimer = null;
  }

  // Gỡ bỏ trạng thái đóng nếu trước đó đang đóng dở
  modal.classList.remove('assistant-modal-closing');
  if (panel) panel.classList.remove('assistant-panel-closing');

  // Mở modal và gắn class animation bung lên từ Phù Thủy
  modal.classList.remove('hidden');
  modal.classList.add('assistant-modal-opening');
  if (panel) panel.classList.add('assistant-panel-opening');

  // Tính tọa độ icon phù thủy để bung nở chính xác từ vị trí icon
  updateAssistantTransformOrigin(sourceEl);

  // Hiệu ứng nảy ma thuật trên icon phù thủy nổi
  const fabIcon = document.querySelector('#btn-floating-assistant img');
  if (fabIcon) {
    fabIcon.classList.remove('assistant-fab-burst');
    void fabIcon.offsetWidth;
    fabIcon.classList.add('assistant-fab-burst');
    setTimeout(() => fabIcon.classList.remove('assistant-fab-burst'), 500);
  }

  const chatLogs = document.getElementById('assistant-chat-logs');
  if (chatLogs && assistantChatHistory.length === 0) {
    initAssistantWelcomeMessage();
  }

  assistantAnimTimer = setTimeout(() => {
    modal.classList.remove('assistant-modal-opening');
    if (panel) panel.classList.remove('assistant-panel-opening');
    assistantAnimTimer = null;
    const input = document.getElementById('input-assistant-query');
    if (input) input.focus({ preventScroll: true });
    scrollAssistantToBottom(true);
  }, 350);
}

function closeAssistantModal() {
  const modal = document.getElementById('modal-ai-assistant');
  if (!modal || modal.classList.contains('hidden')) return;

  if (isAssistantBusy && currentAssistantAbortCtrl) {
    try { currentAssistantAbortCtrl.abort(); } catch (_) {}
  }

  const panel = modal.querySelector('#assistant-panel') || modal.querySelector('.rpg-panel');

  if (assistantAnimTimer) {
    clearTimeout(assistantAnimTimer);
    assistantAnimTimer = null;
  }

  // Cập nhật transform-origin chuẩn xác trước khi thu nhỏ về phù thủy
  updateAssistantTransformOrigin();

  modal.classList.remove('assistant-modal-opening');
  modal.classList.add('assistant-modal-closing');
  if (panel) {
    panel.classList.remove('assistant-panel-opening');
    panel.classList.add('assistant-panel-closing');
  }

  // Hiệu ứng hấp thụ ma thuật vào lại icon phù thủy
  const fabIcon = document.querySelector('#btn-floating-assistant img');
  if (fabIcon) {
    setTimeout(() => {
      fabIcon.classList.remove('assistant-fab-burst');
      void fabIcon.offsetWidth;
      fabIcon.classList.add('assistant-fab-burst');
      setTimeout(() => fabIcon.classList.remove('assistant-fab-burst'), 450);
    }, 100);
  }

  assistantAnimTimer = setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('assistant-modal-closing');
    if (panel) panel.classList.remove('assistant-panel-closing');
    assistantAnimTimer = null;
  }, 260);
}

function initAssistantWelcomeMessage() {
  const chatLogs = document.getElementById('assistant-chat-logs');
  if (!chatLogs) return;

  const nickname = appState.profile?.nickname || 'Hiệp Sĩ';
  const level = appState.profile?.level || 1;
  const coins = appState.profile?.coins || 0;
  const streak = appState.profile?.streak || 0;
  const activeQuestsCount = (appState.quests || []).filter(q => q.status === 'active').length;

  chatLogs.innerHTML = `
    <div class="assistant-msg-ai flex gap-3 items-start animate-fade-in">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center p-1.5 shrink-0 shadow-sm border border-violet-400/40">
        <img src="wizard.svg" alt="Phù Thủy" class="w-full h-full object-contain pointer-events-none select-none" />
      </div>
      <div class="flex-1 assistant-bubble-ai p-3.5 sm:p-4 text-slate-800 dark:text-slate-100 leading-relaxed text-xs sm:text-[13px] space-y-2">
        <div class="font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
          <span>Chào mừng bạn, hiệp sĩ ${escapeHtml(nickname)}!</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-700 dark:text-violet-300 font-mono">Cấp ${level}</span>
        </div>
        <p>Ta là <strong>Phù Thủy</strong> của LevelUp RPG 🧙‍♂️. Ta luôn sẵn sàng lắng nghe, phân tích chiến thuật, chia sẻ mẹo năng suất và hỗ trợ bạn cày cấp, làm nhiệm vụ mỗi ngày!</p>
        <div class="p-2 rounded-xl bg-violet-500/10 dark:bg-violet-950/30 border border-violet-500/20 text-[11px] text-violet-800 dark:text-violet-200">
          📊 <strong>Tình trạng của bạn:</strong> ${coins} Vàng • ${streak} ngày streak • ${activeQuestsCount} nhiệm vụ đang mở.
        </div>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 italic">
          Bấm các gợi ý nhanh phía trên hoặc nhập câu hỏi bất kỳ để ta hỗ trợ bạn nhé! ✨
        </p>
      </div>
    </div>
  `;
}

function scrollAssistantToBottom(force = false) {
  const chatLogs = document.getElementById('assistant-chat-logs');
  if (!chatLogs) return;
  if (force) {
    chatLogs.scrollTop = chatLogs.scrollHeight;
    return;
  }
  const isNearBottom = chatLogs.scrollHeight - chatLogs.scrollTop - chatLogs.clientHeight < 140;
  if (isNearBottom) {
    chatLogs.scrollTop = chatLogs.scrollHeight;
  }
}

function scrollAssistantToMessage(messageEl, smooth = true) {
  const chatLogs = document.getElementById('assistant-chat-logs');
  if (!chatLogs || !messageEl) return;

  const containerRect = chatLogs.getBoundingClientRect();
  const targetRect = messageEl.getBoundingClientRect();
  // Tính vị trí tương đối của phần đầu tin nhắn trong khung cuộn
  const relativeTop = targetRect.top - containerRect.top + chatLogs.scrollTop;
  const targetScrollTop = Math.max(0, relativeTop - 12);

  if (smooth && typeof chatLogs.scrollTo === 'function') {
    chatLogs.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  } else {
    chatLogs.scrollTop = targetScrollTop;
  }
}

async function clearAssistantChat() {
  const confirmed = await confirmAction({
    title: 'Làm Mới Trò Chuyện',
    message: 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện này không?',
    detail: 'Toàn bộ nội dung trò chuyện với Phù Thủy trong phiên này sẽ được đặt lại từ đầu.',
    confirmText: 'Xóa & Làm Mới',
    cancelText: 'Giữ Lại',
    icon: '🗑️',
    btnColor: 'rose'
  });
  if (!confirmed) return;

  assistantChatHistory = [];
  initAssistantWelcomeMessage();
  showToast('Đã làm mới cuộc trò chuyện với Phù Thủy.', 'info');
}

function sendQuickAssistantPrompt(text) {
  const input = document.getElementById('input-assistant-query');
  if (input) input.value = '';
  sendAssistantMessage(text);
}

function handleAssistantSubmit(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('input-assistant-query');
  if (!input) return;
  const message = input.value.trim();
  if (!message || isAssistantBusy) return;
  input.value = '';
  sendAssistantMessage(message);
}

async function sendAssistantMessage(userQuery) {
  if (!userQuery || isAssistantBusy) return;

  const chatLogs = document.getElementById('assistant-chat-logs');
  const stepContainer = document.getElementById('assistant-step-container');
  const stepMsg = document.getElementById('assistant-step-msg');
  const stepPct = document.getElementById('assistant-step-pct');
  const stepBar = document.getElementById('assistant-step-bar');
  const sendBtn = document.getElementById('btn-send-assistant');
  const input = document.getElementById('input-assistant-query');

  isAssistantBusy = true;
  if (sendBtn) sendBtn.disabled = true;
  if (input) input.value = '';
  if (input) input.readOnly = true;

  // Append user bubble
  if (chatLogs) {
    const userMsgHtml = `
      <div class="flex justify-end gap-2.5 items-end animate-fade-in">
        <div class="assistant-bubble-user max-w-[85%] sm:max-w-[75%] px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-sm">
          ${escapeHtml(userQuery)}
        </div>
        <div class="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-xs shrink-0 select-none overflow-hidden">
          ${renderUserMiniAvatar()}
        </div>
      </div>
    `;
    chatLogs.insertAdjacentHTML('beforeend', userMsgHtml);

    // Append initial streaming AI bubble with gentle speaking aura
    const streamBubbleHtml = `
      <div id="active-assistant-msg" class="assistant-msg-ai flex gap-3 items-start animate-fade-in">
        <div class="assistant-avatar-el w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center p-1.5 shrink-0 shadow-sm border border-violet-400/40 mt-0.5 select-none assistant-avatar-speaking">
          <img src="wizard.svg" alt="Phù Thủy" class="w-full h-full object-contain pointer-events-none select-none" />
        </div>
        <div class="assistant-bubble-container flex-1 assistant-bubble-ai assistant-bubble-speaking p-3.5 sm:p-4 text-slate-800 dark:text-slate-100 leading-relaxed text-xs sm:text-[13px] space-y-2.5 transition-all duration-300">
          <div id="active-assistant-status" class="flex items-center gap-2 py-0.5">
            <div class="assistant-thinking-indicator inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100/80 dark:bg-violet-950/50 border border-violet-200/80 dark:border-violet-800/60 text-violet-700 dark:text-violet-300">
              <span class="flex items-center gap-1">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
              </span>
              <span id="active-assistant-status-text" class="text-xs font-medium tracking-wide">Phù Thủy đang suy nghĩ...</span>
            </div>
          </div>
          <div id="active-assistant-thought"></div>
          <div id="active-assistant-worker"></div>
          <div id="active-assistant-text" class="assistant-markdown prose prose-sm dark:prose-invert max-w-none text-xs sm:text-[13px] leading-relaxed break-words hidden cursor-pointer" title="Bấm vào để hiện ngay toàn bộ">
            <span class="assistant-stream-body"><span class="assistant-typing-cursor"></span></span>
          </div>
          <div id="active-assistant-actions" class="space-y-2"></div>
          <div id="active-assistant-options"></div>
        </div>
      </div>
    `;
    chatLogs.insertAdjacentHTML('beforeend', streamBubbleHtml);
    // Cưỡng chế cuộn ngay xuống đáy khi vừa gửi tin để không bị kẹt ở trên
    scrollAssistantToBottom(true);
    requestAnimationFrame(() => {
      scrollAssistantToBottom(true);
    });
    setTimeout(() => {
      scrollAssistantToBottom(true);
    }, 60);
  }

  // Show Step Progress
  if (stepContainer) {
    stepContainer.classList.remove('hidden');
    if (stepMsg) stepMsg.textContent = 'Phù Thủy đang suy nghĩ & phân tích...';
    if (stepPct) stepPct.textContent = '25%';
    if (stepBar) stepBar.style.width = '25%';
    requestAnimationFrame(() => {
      scrollAssistantToBottom(true);
    });
  }

  currentAssistantAbortCtrl = new AbortController();

  const draftContext = {
    profile: appState.profile,
    quests: (appState.quests || []).slice(0, 10),
    shopItems: (appState.shopItems || []).slice(0, 10),
    bank: appState.profile?.bank || { deposited: 0, depositInterest: 0, loan: null }
  };

  // Quản lý cuộn thông minh trong lúc streaming
  let userScrolledUp = false;
  const handleUserScroll = () => {
    if (!chatLogs) return;
    const distFromBottom = chatLogs.scrollHeight - chatLogs.scrollTop - chatLogs.clientHeight;
    if (distFromBottom > 160) {
      userScrolledUp = true;
    } else if (distFromBottom < 50) {
      userScrolledUp = false;
    }
  };
  chatLogs?.addEventListener('scroll', handleUserScroll, { passive: true });

  // Bộ điều khiển hiệu ứng dòng chảy chữ (fluid stream) mượt mà, liên tục
  let targetReplyText = '';
  let renderedChars = 0;
  let streamTimer = null;
  let isServerDone = false;
  let notifyDoneResolve = null;
  const typingCompletedPromise = new Promise(resolve => { notifyDoneResolve = resolve; });

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      credentials: 'include',
      signal: currentAssistantAbortCtrl.signal,
      headers: {
        ...getAuthHeaders(),
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        action: 'ask_assistant',
        payload: {
          message: userQuery,
          history: assistantChatHistory.slice(-8),
          draftContext,
          stream: true
        }
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${response.status}`);
    }

    let finalResult = null;
    const contentType = response.headers.get('content-type') || '';

    const activeMsg = document.getElementById('active-assistant-msg');
    const activeStatus = document.getElementById('active-assistant-status');
    const activeStatusText = document.getElementById('active-assistant-status-text');
    const activeThought = document.getElementById('active-assistant-thought');
    const activeWorker = document.getElementById('active-assistant-worker');
    const activeText = document.getElementById('active-assistant-text');
    const streamBody = activeText ? activeText.querySelector('.assistant-stream-body') : null;

    function tickStream() {
      if (renderedChars < targetReplyText.length) {
        const pending = targetReplyText.length - renderedChars;
        // Tốc độ mượt mà: 1-2 ký tự mỗi frame (16ms) khi gõ đều đặn
        // Tự thích ứng nhịp nhàng nếu lượng chữ dồn về để không bị chậm
        let step = 1;
        if (pending > 150) {
          step = 6;
        } else if (pending > 60) {
          step = 3;
        } else if (pending > 15) {
          step = 2;
        } else {
          step = 1;
        }
        if (isServerDone) {
          // Khi server đã hoàn tất, tăng tốc độ gõ nhịp nhàng để không bị trễ
          step = Math.max(step, Math.ceil(pending / 10));
        }

        renderedChars = Math.min(targetReplyText.length, renderedChars + step);
        const currentSlice = targetReplyText.slice(0, renderedChars);

        if (streamBody) {
          streamBody.innerHTML = renderStreamingMarkdown(currentSlice);
        }

        // Tự động bám sát đáy khi đang sinh chữ trừ khi người dùng chủ động kéo lên đọc
        if (!userScrolledUp && chatLogs) {
          chatLogs.scrollTop = chatLogs.scrollHeight;
        }
        streamTimer = setTimeout(tickStream, 16);
      } else {
        streamTimer = null;
        if (streamBody && targetReplyText) {
          streamBody.innerHTML = renderMarkdown(targetReplyText);
        }
        if (activeMsg) {
          activeMsg.querySelectorAll('.assistant-typing-cursor').forEach(el => el.remove());
        }
        if (isServerDone && notifyDoneResolve) {
          notifyDoneResolve();
          notifyDoneResolve = null;
        }
      }
    }

    function appendToStream(delta) {
      targetReplyText += delta;
      if (!streamTimer) {
        tickStream();
      }
    }

    // Hỗ trợ người dùng bấm vào tin nhắn để hiện ngay toàn bộ nội dung
    if (activeText) {
      activeText.addEventListener('click', () => {
        if (streamTimer) {
          clearTimeout(streamTimer);
          streamTimer = null;
        }
        renderedChars = targetReplyText.length;
        if (streamBody) {
          streamBody.innerHTML = renderMarkdown(targetReplyText);
        }
        if (activeMsg) {
          activeMsg.querySelectorAll('.assistant-typing-cursor').forEach(el => el.remove());
        }
        if (!userScrolledUp && chatLogs) {
          chatLogs.scrollTop = chatLogs.scrollHeight;
        }
        if (isServerDone && notifyDoneResolve) {
          notifyDoneResolve();
          notifyDoneResolve = null;
        }
      });
    }

    if (contentType.includes('text/event-stream') && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent = 'message';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop(); // Giữ lại phần chưa kết thúc dòng

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.slice(7).trim();
          } else if (trimmed.startsWith('data: ')) {
            const rawData = trimmed.slice(6).trim();
            try {
              const parsed = JSON.parse(rawData);
              if (currentEvent === 'step') {
                if (stepMsg) stepMsg.textContent = parsed.text || 'Đang xử lý...';
                if (stepPct) stepPct.textContent = `${parsed.pct || 50}%`;
                if (stepBar) stepBar.style.width = `${parsed.pct || 50}%`;
                if (activeStatusText) {
                  activeStatusText.textContent = parsed.text || 'Đang xử lý...';
                }
              } else if (currentEvent === 'reply_start') {
                if (activeStatus) activeStatus.classList.add('hidden');
                if (activeThought && parsed.thought) {
                  activeThought.innerHTML = renderAssistantThoughtBlock(parsed.thought);
                }
                if (activeWorker && Array.isArray(parsed.workerResults) && parsed.workerResults.length > 0) {
                  activeWorker.innerHTML = renderAssistantWorkerBlock(parsed.workerResults);
                }
                if (activeText) activeText.classList.remove('hidden');
                if (streamBody && !renderedChars) {
                  streamBody.innerHTML = '<span class="assistant-typing-cursor"></span>';
                }
                if (!userScrolledUp) {
                  scrollAssistantToBottom(true);
                }
              } else if (currentEvent === 'chunk') {
                if (activeStatus) activeStatus.classList.add('hidden');
                if (activeText) activeText.classList.remove('hidden');
                if (parsed.delta) {
                  appendToStream(parsed.delta);
                }
              } else if (currentEvent === 'result') {
                finalResult = parsed;
                if (finalResult.reply && finalResult.reply.length > targetReplyText.length) {
                  targetReplyText = finalResult.reply;
                  if (!streamTimer) {
                    tickStream();
                  }
                }
                isServerDone = true;
                if (renderedChars >= targetReplyText.length && notifyDoneResolve) {
                  notifyDoneResolve();
                  notifyDoneResolve = null;
                }
              } else if (currentEvent === 'error') {
                throw new Error(parsed.error || 'Lỗi xử lý');
              }
            } catch (jsonErr) {
              if (currentEvent === 'error') throw jsonErr;
            }
          }
        }
      }
    } else {
      finalResult = await response.json();
      if (finalResult?.reply) {
        appendToStream(finalResult.reply);
      }
      isServerDone = true;
      if (renderedChars >= targetReplyText.length && notifyDoneResolve) {
        notifyDoneResolve();
        notifyDoneResolve = null;
      }
    }

    if (!finalResult) {
      throw new Error('Không nhận được phản hồi từ Phù Thủy.');
    }

    // Đợi hiệu ứng dòng chảy hoàn tất (kèm safety timeout chống kẹt stream)
    await Promise.race([
      typingCompletedPromise,
      new Promise(resolve => setTimeout(resolve, 3500))
    ]);

    // Hủy triệt để bộ đếm streamTimer nếu còn sót để không ghi đè lại nội dung hoặc cướp vị trí cuộn
    if (streamTimer) {
      clearTimeout(streamTimer);
      streamTimer = null;
    }
    renderedChars = targetReplyText.length;

    // Hoàn tất hiển thị trong bubble active
    if (activeMsg) {
      if (activeStatus) activeStatus.classList.add('hidden');
      if (activeText) activeText.classList.remove('hidden');

      // Tắt hào quang đang nói và con trỏ
      const cursor = activeMsg.querySelector('.assistant-typing-cursor');
      if (cursor) cursor.remove();
      activeMsg.querySelectorAll('.assistant-typing-cursor').forEach(el => el.remove());
      if (chatLogs) {
        chatLogs.querySelectorAll('.assistant-typing-cursor').forEach(el => el.remove());
      }
      const bubbleContainer = activeMsg.querySelector('.assistant-bubble-speaking');
      if (bubbleContainer) bubbleContainer.classList.remove('assistant-bubble-speaking');
      const avatarEl = activeMsg.querySelector('.assistant-avatar-speaking');
      if (avatarEl) avatarEl.classList.remove('assistant-avatar-speaking');

      // Cập nhật Markdown hoàn chỉnh
      if (streamBody) {
        streamBody.innerHTML = renderMarkdown(finalResult.reply || targetReplyText || '');
      }
      activeMsg.querySelectorAll('.assistant-typing-cursor').forEach(el => el.remove());

      // Đảm bảo khối suy nghĩ và khối worker được render nếu trước đó chưa nhận reply_start
      if (activeThought && !activeThought.innerHTML.trim() && finalResult.thought) {
        activeThought.innerHTML = renderAssistantThoughtBlock(finalResult.thought);
      }
      if (activeWorker && !activeWorker.innerHTML.trim() && Array.isArray(finalResult.workerResults) && finalResult.workerResults.length > 0) {
        activeWorker.innerHTML = renderAssistantWorkerBlock(finalResult.workerResults);
      }

      // Render Thẻ hành động (Nhiệm vụ / Phần thưởng)
      const actionsEl = document.getElementById('active-assistant-actions');
      if (actionsEl && Array.isArray(finalResult.suggestedActions) && finalResult.suggestedActions.length > 0) {
        actionsEl.innerHTML = renderAssistantActionCards(finalResult.suggestedActions);
      }

      // Render Các gợi ý tương tác tiếp theo
      const optionsEl = document.getElementById('active-assistant-options');
      if (optionsEl && Array.isArray(finalResult.options) && finalResult.options.length > 0) {
        optionsEl.innerHTML = renderAssistantOptionChips(finalResult.options);
      }

      // Ẩn thanh tiến trình ngay trước khi cuộn để kích thước chatLogs chuẩn xác
      if (stepContainer) stepContainer.classList.add('hidden');

      const finishedMsgEl = activeMsg;

      // Đổi ID để không bị xung đột với các tin nhắn tiếp theo
      activeMsg.removeAttribute('id');
      if (activeStatus) activeStatus.removeAttribute('id');
      if (activeStatusText) activeStatusText.removeAttribute('id');
      if (activeThought) activeThought.removeAttribute('id');
      if (activeWorker) activeWorker.removeAttribute('id');
      if (activeText) activeText.removeAttribute('id');
      if (actionsEl) actionsEl.removeAttribute('id');
      if (optionsEl) optionsEl.removeAttribute('id');

      // Tự động cuộn mượt lên dòng đầu tin nhắn Phù Thủy vừa gửi để user có thể đọc lại từ đầu tin
      requestAnimationFrame(() => {
        scrollAssistantToMessage(finishedMsgEl, true);
        setTimeout(() => {
          scrollAssistantToMessage(finishedMsgEl, true);
        }, 120);
      });
    } else {
      // Fallback nếu DOM activeMsg không tìm thấy
      renderAssistantResponse(finalResult);
    }

    // Record to history
    assistantChatHistory.push({ role: 'user', content: userQuery });
    assistantChatHistory.push({ role: 'assistant', content: finalResult.reply || targetReplyText || '' });

    if (typeof sfx !== 'undefined' && sfx.playSuccess) sfx.playSuccess();
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('sendAssistantMessage error:', err);
    const activeMsg = document.getElementById('active-assistant-msg');
    if (activeMsg) {
      activeMsg.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-rose-500/20 text-rose-600 flex items-center justify-center text-sm shrink-0 select-none">⚠️</div>
        <div class="assistant-bubble-ai p-3 rounded-2xl text-rose-600 dark:text-rose-400 text-xs flex-1">
          ${escapeHtml(err.message || 'Có lỗi kết nối đến Phù Thủy. Vui lòng thử lại sau!')}
        </div>
      `;
      activeMsg.removeAttribute('id');
      scrollAssistantToBottom(true);
    } else if (chatLogs) {
      const errMsgHtml = `
        <div class="assistant-msg-ai flex gap-3 items-start animate-fade-in">
          <div class="w-8 h-8 rounded-full bg-rose-500/20 text-rose-600 flex items-center justify-center text-sm shrink-0">⚠️</div>
          <div class="assistant-bubble-ai p-3 rounded-2xl text-rose-600 dark:text-rose-400 text-xs">
            ${escapeHtml(err.message || 'Có lỗi kết nối đến Phù Thủy. Vui lòng thử lại sau!')}
          </div>
        </div>
      `;
      chatLogs.insertAdjacentHTML('beforeend', errMsgHtml);
      scrollAssistantToBottom(true);
    }
    showToast(err.message || 'Lỗi kết nối Phù Thủy', 'error');
  } finally {
    if (streamTimer) {
      clearTimeout(streamTimer);
      streamTimer = null;
    }
    if (chatLogs) {
      chatLogs.removeEventListener('scroll', handleUserScroll);
    }
    isAssistantBusy = false;
    currentAssistantAbortCtrl = null;
    if (stepContainer) stepContainer.classList.add('hidden');
    if (sendBtn) sendBtn.disabled = false;
    if (input) {
      input.readOnly = false;
      input.disabled = false;
      const isMobileDevice = window.innerWidth < 640 || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
      if (!isMobileDevice) {
        try {
          input.focus({ preventScroll: true });
        } catch (_) {
          input.focus();
        }
      }
    }
  }
}

function renderAssistantThoughtBlock(thought) {
  if (!thought) return '';
  return `
    <details class="assistant-collapsible-details rounded-xl bg-violet-500/10 dark:bg-violet-950/30 border border-violet-500/20 overflow-hidden text-[11px]">
      <summary class="px-3 py-1.5 font-semibold text-violet-700 dark:text-violet-300 cursor-pointer flex items-center justify-between select-none hover:bg-violet-500/15">
        <span class="flex items-center gap-1.5">
          <span>🧠</span>
          <span>Tư duy phân tích của Model Brain</span>
        </span>
        <svg class="w-3.5 h-3.5 text-violet-500 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </summary>
      <div class="p-2.5 border-t border-violet-500/15 text-slate-700 dark:text-slate-300 italic leading-relaxed whitespace-pre-wrap">
        ${escapeHtml(thought)}
      </div>
    </details>
  `;
}

function renderAssistantWorkerBlock(workerResults) {
  if (!Array.isArray(workerResults) || workerResults.length === 0) return '';
  const workerItems = workerResults.map(w => `
    <li class="flex items-start gap-1.5 text-[11px]">
      <span class="text-indigo-500 font-bold">⚡</span>
      <div>
        <span class="font-mono text-indigo-700 dark:text-indigo-300 font-semibold">[${escapeHtml(w.tool)}]:</span>
        <span class="text-slate-600 dark:text-slate-300 ml-1">${escapeHtml(w.summary || 'Thực thi thành công')}</span>
        ${w.executionMs !== undefined ? `<span class="text-[10px] text-slate-400 font-mono">(${w.executionMs}ms)</span>` : ''}
      </div>
    </li>
  `).join('');

  return `
    <details class="assistant-collapsible-details rounded-xl bg-indigo-500/10 dark:bg-indigo-950/30 border border-indigo-500/20 overflow-hidden text-[11px]">
      <summary class="px-3 py-1.5 font-semibold text-indigo-700 dark:text-indigo-300 cursor-pointer flex items-center justify-between select-none hover:bg-indigo-500/15">
        <span class="flex items-center gap-1.5">
          <span>⚡</span>
          <span>Hành động Model Worker đã thực thi (${workerResults.length})</span>
        </span>
        <svg class="w-3.5 h-3.5 text-indigo-500 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </summary>
      <ul class="p-2.5 border-t border-indigo-500/15 space-y-1.5">
        ${workerItems}
      </ul>
    </details>
  `;
}

function renderAssistantActionCards(suggestedActions) {
  if (!Array.isArray(suggestedActions) || suggestedActions.length === 0) return '';
  return suggestedActions.map(act => {
    if (act.type === 'quest_created' && act.quest) {
      const q = act.quest;
      const jsonSafe = encodeURIComponent(JSON.stringify(q));
      return `
        <div class="assistant-action-card p-3 rounded-xl border border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/20 flex items-center justify-between gap-3 shadow-xs">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-base">${escapeHtml(q.icon || '🎯')}</span>
              <span class="font-bold text-xs text-amber-800 dark:text-amber-200 truncate">${escapeHtml(q.title)}</span>
              <span class="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono bg-amber-500/20 text-amber-800 dark:text-amber-300">Hạng ${q.rank || 'D'}</span>
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              ${q.targetMinutes > 0 ? `⏱️ ${q.targetMinutes} phút tập trung` : '⚡ Việc nhanh không hẹn giờ'} • 🪙 +${q.rewardCoins} Vàng
            </div>
          </div>
          <button
            type="button"
            onclick="acceptAssistantQuest('${jsonSafe}', this)"
            class="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition active:scale-95 cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
          >
            <span>Nhận việc</span>
            <span>➕</span>
          </button>
        </div>
      `;
    }
    if (act.type === 'reward_created' && act.reward) {
      const r = act.reward;
      const jsonSafe = encodeURIComponent(JSON.stringify(r));
      return `
        <div class="assistant-action-card p-3 rounded-xl border border-purple-500/40 bg-purple-50/70 dark:bg-purple-950/20 flex items-center justify-between gap-3 shadow-xs">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-base">${escapeHtml(r.icon || '🎁')}</span>
              <span class="font-bold text-xs text-purple-800 dark:text-purple-200 truncate">${escapeHtml(r.name)}</span>
              <span class="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono bg-purple-500/20 text-purple-800 dark:text-purple-300">${r.tier}</span>
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              🪙 Giá: ${r.price} Vàng ${r.targetMinutes > 0 ? `• ⏱️ ${r.targetMinutes} phút` : ''}
            </div>
          </div>
          <button
            type="button"
            onclick="acceptAssistantReward('${jsonSafe}', this)"
            class="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition active:scale-95 cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
          >
            <span>Thêm vào Shop</span>
            <span>🎁</span>
          </button>
        </div>
      `;
    }
    return '';
  }).join('');
}

function renderAssistantOptionChips(options) {
  if (!Array.isArray(options) || options.length === 0) return '';
  const optionButtons = options.map(opt => `
    <button
      type="button"
      data-prompt="${escapeHtml(opt.argument || opt.label)}"
      onclick="sendQuickAssistantPrompt(this.getAttribute('data-prompt'))"
      class="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-violet-100 dark:bg-slate-800 dark:hover:bg-violet-950 text-slate-700 dark:text-slate-200 hover:text-violet-700 dark:hover:text-violet-300 border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer shrink-0"
    >
      ${escapeHtml(opt.label)}
    </button>
  `).join('');

  return `
    <div class="pt-1 flex items-center gap-1.5 flex-wrap">
      ${optionButtons}
    </div>
  `;
}

function renderAssistantResponse(result) {
  const chatLogs = document.getElementById('assistant-chat-logs');
  if (!chatLogs) return;

  const replyHtml = renderMarkdown(result.reply || '');
  const thoughtBlockHtml = renderAssistantThoughtBlock(result.thought);
  const workerBlockHtml = renderAssistantWorkerBlock(result.workerResults);
  const actionCardsHtml = renderAssistantActionCards(result.suggestedActions);
  const optionsHtml = renderAssistantOptionChips(result.options);

  const aiMsgHtml = `
    <div class="assistant-msg-ai flex gap-3 items-start animate-fade-in">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-sm shrink-0 shadow-sm border border-violet-400/40 mt-0.5 select-none">
        🧙‍♂️
      </div>
      <div class="flex-1 assistant-bubble-ai p-3.5 sm:p-4 text-slate-800 dark:text-slate-100 leading-relaxed text-xs sm:text-[13px] space-y-2.5">
        ${thoughtBlockHtml}
        ${workerBlockHtml}
        <div class="assistant-markdown prose prose-sm dark:prose-invert max-w-none text-xs sm:text-[13px] leading-relaxed break-words">
          ${replyHtml}
        </div>
        ${actionCardsHtml}
        ${optionsHtml}
      </div>
    </div>
  `;

  chatLogs.insertAdjacentHTML('beforeend', aiMsgHtml);
  const newMsg = chatLogs.lastElementChild;
  requestAnimationFrame(() => {
    scrollAssistantToMessage(newMsg, true);
  });
}


function acceptAssistantQuest(encodedJson, btnEl) {
  try {
    const quest = JSON.parse(decodeURIComponent(encodedJson));
    if (!quest || !quest.title) return;

    if (!Array.isArray(appState.quests)) appState.quests = [];
    const exists = appState.quests.some(q => q.id === quest.id || (q.title === quest.title && q.status === 'active'));
    if (exists) {
      showToast('Nhiệm vụ này đã có trong danh sách của bạn rồi!', 'info');
      return;
    }

    appState.quests.unshift(quest);
    if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
    showToast(`Đã thêm nhiệm vụ [Hạng ${quest.rank || 'D'}]: "${quest.title}"!`, 'success');

    if (btnEl) {
      btnEl.disabled = true;
      btnEl.classList.remove('bg-amber-500', 'hover:bg-amber-400');
      btnEl.classList.add('bg-emerald-600', 'text-white', 'opacity-90', 'cursor-default');
      btnEl.innerHTML = `<span>✓ Đã nhận</span>`;
    }

    if (typeof renderQuests === 'function') renderQuests();
    if (typeof triggerSave === 'function') triggerSave(true);
  } catch (e) {
    console.error('acceptAssistantQuest error:', e);
    showToast('Không thể thêm nhiệm vụ', 'error');
  }
}

function acceptAssistantReward(encodedJson, btnEl) {
  try {
    const reward = JSON.parse(decodeURIComponent(encodedJson));
    if (!reward || !reward.name) return;

    if (!Array.isArray(appState.shopItems)) appState.shopItems = [];

    if (!reward.id) {
      reward.id = 'shop_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    }

    const exists = appState.shopItems.some(item => item.id === reward.id || (item.name && item.name.toLowerCase().trim() === reward.name.toLowerCase().trim()));
    if (exists) {
      showToast(`Phần thưởng "${reward.name}" đã có trong Cửa Hàng!`, 'info');
      if (btnEl) {
        btnEl.disabled = true;
        btnEl.classList.remove('bg-purple-600', 'hover:bg-purple-500');
        btnEl.classList.add('bg-emerald-600', 'text-white', 'opacity-90', 'cursor-default');
        btnEl.innerHTML = `<span>✓ Đã có sẵn</span>`;
      }
      return;
    }

    appState.shopItems.unshift(reward);
    if (typeof sfx !== 'undefined' && sfx.playClick) sfx.playClick();
    showToast(`Đã thêm phần thưởng: "${reward.name}" vào Cửa Hàng!`, 'success');

    if (btnEl) {
      btnEl.disabled = true;
      btnEl.classList.remove('bg-purple-600', 'hover:bg-purple-500');
      btnEl.classList.add('bg-emerald-600', 'text-white', 'opacity-90', 'cursor-default');
      btnEl.innerHTML = `<span>✓ Đã thêm</span>`;
    }

    if (typeof renderShop === 'function') renderShop();
    if (typeof triggerSave === 'function') triggerSave(true);
  } catch (e) {
    console.error('acceptAssistantReward error:', e);
    showToast('Không thể thêm phần thưởng', 'error');
  }
}

window.holdFocusTimer = holdFocusTimer;
window.clearSavedQuestTimer = clearSavedQuestTimer;
window.clearSavedRewardTimer = clearSavedRewardTimer;
window.acceptAssistantQuest = acceptAssistantQuest;
window.acceptAssistantReward = acceptAssistantReward;
window.sendQuickAssistantPrompt = sendQuickAssistantPrompt;
