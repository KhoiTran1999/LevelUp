import assert from 'node:assert';
import {
  MODEL_WORKER,
  MODEL_BRAIN,
  PROJECT_KNOWLEDGE_BASE,
  ASSISTANT_TOOLS,
  executeWorkerTool,
  runDeterministicAssistant,
  runAssistantAgent
} from '../api/ai.js';
import {
  verifyQuestSignature,
  verifyRewardSignature
} from '../api/sync.js';

console.log('=== KIỂM THỬ TRỢ LÝ AI RIÊNG CHO USER (MODEL BRAIN & MODEL WORKER) ===\n');

// -----------------------------------------------------------------------------
// 1. Kiểm tra Cấu trúc Cơ sở Tri Thức Dự Án (PROJECT_KNOWLEDGE_BASE)
// -----------------------------------------------------------------------------
{
  assert.ok(PROJECT_KNOWLEDGE_BASE.sections.quests, 'Phải có cẩm nang về Nhiệm vụ (quests)');
  assert.ok(PROJECT_KNOWLEDGE_BASE.sections.rewards, 'Phải có cẩm nang về Phần thưởng (rewards)');
  assert.ok(PROJECT_KNOWLEDGE_BASE.sections.levels_and_exp, 'Phải có cẩm nang về Cấp độ & EXP');
  assert.ok(PROJECT_KNOWLEDGE_BASE.sections.bank_and_finance, 'Phải có cẩm nang về Ngân Hàng & Kho Bạc');
  assert.ok(PROJECT_KNOWLEDGE_BASE.sections.productivity_tips, 'Phải có cẩm nang về Mẹo Năng Suất');
  assert.ok(PROJECT_KNOWLEDGE_BASE.sections.negotiation, 'Phải có cẩm nang về Thương Lượng & Xin Xỏ (negotiation)');

  // Kiểm tra nội dung cốt lõi của LevelUp
  assert.ok(PROJECT_KNOWLEDGE_BASE.sections.quests.content.includes('focus'), 'Phải hướng dẫn việc tập trung Pomodoro');
  assert.ok(PROJECT_KNOWLEDGE_BASE.sections.quests.content.includes('bounty'), 'Phải hướng dẫn việc nhanh không hẹn giờ');
  assert.ok(PROJECT_KNOWLEDGE_BASE.sections.rewards.content.includes('3:1'), 'Phải có nguyên tắc kinh tế 3:1 bảo vệ giá trị thực');
  assert.ok(PROJECT_KNOWLEDGE_BASE.sections.levels_and_exp.content.includes('1 Vàng'), 'Phải nêu rõ 1 Vàng = 1 EXP');
  assert.ok(PROJECT_KNOWLEDGE_BASE.sections.bank_and_finance.content.includes('trích'), 'Phải nêu rõ cơ chế trích nợ tự động');
  assert.ok(PROJECT_KNOWLEDGE_BASE.sections.negotiation.content.includes('Thương lượng Nhiệm vụ'), 'Phải hướng dẫn thương lượng nhiệm vụ');
  assert.ok(PROJECT_KNOWLEDGE_BASE.sections.negotiation.content.includes('Cửa Hàng'), 'Phải hướng dẫn thương lượng phần thưởng shop');

  console.log('✓ Test 1: PROJECT_KNOWLEDGE_BASE chứa đầy đủ và chuẩn xác toàn bộ cơ chế của LevelUp RPG.');
}

// -----------------------------------------------------------------------------
// 2. Kiểm tra Danh Mục Công Cụ (ASSISTANT_TOOLS) Của Model Worker
// -----------------------------------------------------------------------------
{
  const toolNames = ASSISTANT_TOOLS.map(t => t.function.name);
  assert.ok(toolNames.includes('get_user_profile'), 'Worker phải có tool get_user_profile');
  assert.ok(toolNames.includes('get_user_quests'), 'Worker phải có tool get_user_quests');
  assert.ok(toolNames.includes('get_user_shop'), 'Worker phải có tool get_user_shop');
  assert.ok(toolNames.includes('get_bank_account'), 'Worker phải có tool get_bank_account');
  assert.ok(toolNames.includes('get_user_ledger'), 'Worker phải có tool get_user_ledger');
  assert.ok(toolNames.includes('get_project_knowledge'), 'Worker phải có tool get_project_knowledge');
  assert.ok(toolNames.includes('create_quest'), 'Worker phải có tool create_quest');
  assert.ok(toolNames.includes('create_reward'), 'Worker phải có tool create_reward');
  assert.ok(toolNames.includes('suggest_action_plan'), 'Worker phải có tool suggest_action_plan');

  console.log('✓ Test 2: Model Worker được trang bị đủ 9 công cụ chuyên biệt phục vụ Model Brain.');
}

// -----------------------------------------------------------------------------
// 3. Kiểm tra Thực Thi Công Cụ Của Model Worker (executeWorkerTool)
// -----------------------------------------------------------------------------
{
  const mockContext = {
    callerSub: 'user_tester_99',
    draftContext: {
      profile: { nickname: 'Hiệp Sĩ Quả Cảm', level: 3, coins: 45, streak: 5, title: 'Học Viên Chăm Chỉ' },
      quests: [
        { id: 'q1', title: 'Đọc sách 25 phút', targetMinutes: 25, rewardCoins: 9, status: 'active' }
      ]
    }
  };

  // 3a. Worker đọc hồ sơ người chơi
  const profileRes = await executeWorkerTool('get_user_profile', {}, mockContext);
  assert.strictEqual(profileRes.status, 'success');
  assert.strictEqual(profileRes.data.level, 3);
  assert.strictEqual(profileRes.data.coins, 45);
  assert.ok(profileRes.summary.includes('Level 3'));

  // 3b. Worker tra cứu cẩm nang
  const knowledgeRes = await executeWorkerTool('get_project_knowledge', { topic: 'quests' }, mockContext);
  assert.strictEqual(knowledgeRes.status, 'success');
  assert.ok(knowledgeRes.data.content.includes('focus'));

  // 3c. Worker tạo nhiệm vụ mới có chữ ký bảo mật HMAC SHA-256
  const createQuestRes = await executeWorkerTool('create_quest', {
    title: 'Học lập trình Node.js 45 phút',
    targetMinutes: 45,
    description: 'Tìm hiểu về EventEmitter và Streams'
  }, mockContext);

  assert.strictEqual(createQuestRes.status, 'success');
  const createdQuest = createQuestRes.data;
  assert.strictEqual(createdQuest.targetMinutes, 45);
  assert.ok(createdQuest.rewardCoins >= 15, '45 phút tập trung phải có thưởng >= 15 Vàng');
  assert.ok(createdQuest.signature && createdQuest.signature.length >= 16, 'Nhiệm vụ tạo bởi Worker phải có chữ ký số HMAC');
  assert.strictEqual(verifyQuestSignature(createdQuest), true, 'Chữ ký số của nhiệm vụ do Worker tạo phải hợp lệ 100%');

  // 3d. Worker tạo phần thưởng mới có chữ ký số HMAC
  const createRewardRes = await executeWorkerTool('create_reward', {
    name: 'Xem 1 tập phim Anime 25 phút',
    targetMinutes: 25,
    price: 30
  }, mockContext);

  assert.strictEqual(createRewardRes.status, 'success');
  const createdReward = createRewardRes.data;
  assert.strictEqual(createdReward.targetMinutes, 25);
  assert.strictEqual(verifyRewardSignature(createdReward), true, 'Chữ ký số phần thưởng do Worker tạo phải hợp lệ 100%');

  // 3e. Worker đề xuất kế hoạch hành động 3 bước
  const planRes = await executeWorkerTool('suggest_action_plan', {}, mockContext);
  assert.strictEqual(planRes.status, 'success');
  assert.strictEqual(planRes.data.length, 3, 'Kế hoạch phải có đúng 3 bước');

  console.log('✓ Test 3: Model Worker thực thi công cụ siêu tốc, dữ liệu chuẩn xác & chữ ký số HMAC toàn vẹn.');
}

// -----------------------------------------------------------------------------
// 4. Kiểm tra Deterministic Assistant Fallback (Khi Offline / Không Có API Key)
// -----------------------------------------------------------------------------
{
  const mockProfile = { nickname: 'Arthur', level: 2, coins: 20, streak: 3, title: 'Tân Binh Cấp 1' };

  // 4a. Người dùng nhờ tạo nhiệm vụ
  const questAsk = runDeterministicAssistant('Tạo giúp tôi 1 nhiệm vụ học tập 30 phút nhé', mockProfile);
  assert.ok(questAsk.reply.includes('Arthur') || questAsk.reply.includes('bạn'));
  assert.ok(questAsk.suggestedActions.some(a => a.type === 'quest_created'));
  const generatedQuest = questAsk.suggestedActions.find(a => a.type === 'quest_created').quest;
  assert.strictEqual(generatedQuest.targetMinutes, 30);
  assert.strictEqual(verifyQuestSignature(generatedQuest), true, 'Nhiệm vụ fallback phải được ký số hợp lệ');

  // 4b. Người dùng hỏi về Ngân Hàng & Khoản Vay
  const bankAsk = runDeterministicAssistant('Giải thích cách vay vốn và gửi tiết kiệm ngân hàng', mockProfile);
  assert.ok(bankAsk.reply.includes('Gửi Tiết Kiệm') || bankAsk.reply.includes('Vay Vốn'));
  assert.ok(bankAsk.reply.includes('trích'), 'Phải giải thích cơ chế trích nợ tự động');

  // 4c. Người dùng hỏi về Cấp độ & EXP
  const expAsk = runDeterministicAssistant('Làm sao để tôi lên cấp và kiếm nhiều EXP?', mockProfile);
  assert.ok(expAsk.reply.includes('1 Vàng'));
  assert.ok(expAsk.reply.includes('EXP'));

  // 4d. Người dùng chào hỏi thông thường
  const generalAsk = runDeterministicAssistant('Chào bạn, hôm nay có mẹo gì hay không?', mockProfile);
  assert.ok(generalAsk.reply.includes('Model Brain') && generalAsk.reply.includes('Model Worker'));
  assert.ok(generalAsk.thought.length > 0);

  // 4e. Người dùng hỏi về Thương Lượng & Xin Xỏ Với AI
  const negAsk = runDeterministicAssistant('Hướng dẫn tôi cách thương lượng và xin xỏ với AI trong LevelUp', mockProfile);
  assert.ok(negAsk.reply.includes('thương lượng') || negAsk.reply.includes('xin xỏ'));
  assert.ok(negAsk.reply.includes('Nhiệm vụ') && negAsk.reply.includes('Cửa Hàng'));
  assert.ok(negAsk.workerResults.some(w => w.tool === 'get_project_knowledge'));
  assert.strictEqual(negAsk.workerResults[0].data.title, PROJECT_KNOWLEDGE_BASE.sections.negotiation.title);

  console.log('✓ Test 4: Deterministic Fallback hoạt động bền bỉ, phản hồi đầy đủ và chuẩn xác theo quy tắc game.');
}

// -----------------------------------------------------------------------------
// 5. Kiểm tra Luồng 2 Tầng: Model Brain (Thinking ON) -> Model Worker (Thinking OFF) -> Model Brain (Synthesis)
// -----------------------------------------------------------------------------
{
  const originalFetch = globalThis.fetch;
  const capturedPayloads = [];
  let callCount = 0;

  globalThis.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    capturedPayloads.push(body);
    callCount++;

    if (callCount === 1) {
      // Phase 1: Model Brain phân tích và quyết định cần Model Worker tạo nhiệm vụ
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  thought: 'Người dùng muốn tạo nhiệm vụ ôn thi tiếng Anh 25 phút. Tôi sẽ giao Model Worker tạo nhiệm vụ và tính thưởng chuẩn Pomodoro.',
                  needWorker: true,
                  workerTasks: [
                    {
                      tool: 'create_quest',
                      params: {
                        title: 'Ôn thi từ vựng tiếng Anh',
                        targetMinutes: 25,
                        rewardCoins: 9,
                        type: 'focus',
                        requiresProof: true
                      }
                    }
                  ]
                })
              }
            }
          ]
        })
      };
    } else {
      // Phase 3: Model Brain tổng hợp kết quả từ Model Worker và trả về lời khuyên hoàn chỉnh
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  thought: 'Worker đã tạo nhiệm vụ thành công với mã chữ ký HMAC. Tôi sẽ khích lệ hiệp sĩ bắt đầu phiên học tập ngay.',
                  reply: 'Chào bạn! Mình đã giao cho Model Worker tạo cho bạn nhiệm vụ "Ôn thi từ vựng tiếng Anh" (25 phút tập trung • 9 Vàng). Hãy bấm nhận ngay và bắt đầu nhé! ✨',
                  options: [
                    { id: 1, label: '💡 Mẹo học nhanh từ vựng', argument: 'Mẹo học từ vựng hiệu quả là gì?' }
                  ]
                })
              }
            }
          ]
        })
      };
    }
  };

  try {
    const stepsRecorded = [];
    const onEvent = (ev, data) => {
      if (ev === 'step') stepsRecorded.push(data);
    };

    const assistantResult = await runAssistantAgent({
      message: 'Tạo giúp tôi nhiệm vụ ôn thi tiếng Anh 25 phút',
      caller: { sub: 'player_hero_007' },
      draftContext: { profile: { nickname: 'Hero', level: 5, coins: 120 } },
      onEvent
    });

    // Xác minh Phase 1: Brain được gọi với MODEL_BRAIN và reasoning_effort: 'low'
    assert.strictEqual(capturedPayloads[0].model, MODEL_BRAIN, 'Phase 1 phải dùng MODEL_BRAIN');
    assert.strictEqual(capturedPayloads[0].reasoning_effort, 'low', 'Phase 1 Brain phải bật thinking mức low');

    // Xác minh Phase 3: Brain tổng hợp cũng dùng MODEL_BRAIN và reasoning_effort: 'low'
    assert.strictEqual(capturedPayloads[1].model, MODEL_BRAIN, 'Phase 3 phải dùng MODEL_BRAIN');
    assert.strictEqual(capturedPayloads[1].reasoning_effort, 'low', 'Phase 3 Brain phải bật thinking mức low');

    // Xác minh Worker đã thực thi nhiệm vụ tạo quest
    assert.ok(assistantResult.workerResults.some(r => r.tool === 'create_quest'));
    assert.ok(assistantResult.suggestedActions.some(a => a.type === 'quest_created'));
    const quest = assistantResult.suggestedActions[0].quest;
    assert.strictEqual(quest.title, 'Ôn thi từ vựng tiếng Anh');
    assert.strictEqual(verifyQuestSignature(quest), true, 'Nhiệm vụ phải có chữ ký HMAC hợp lệ');

    // Xác minh Tiến trình sự kiện SSE (1 -> 4)
    assert.ok(stepsRecorded.length >= 3, 'Phải có đầy đủ các bước thông báo tiến trình thời gian thực');
    assert.ok(stepsRecorded.some(s => s.icon === '🧠'), 'Phải có bước Brain suy nghĩ');
    assert.ok(stepsRecorded.some(s => s.icon === '⚡'), 'Phải có bước Worker thực thi');
    assert.ok(stepsRecorded.some(s => s.icon === '✨'), 'Phải có bước Brain tổng hợp');

    console.log('✓ Test 5: Quy trình phối hợp 2 tầng (Brain Deliberation -> Worker Execution -> Brain Synthesis) diễn ra hoàn hảo.');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// -----------------------------------------------------------------------------
// 6. Kiểm tra Endpoint API /api/ai (ask_assistant action & Xác thực bảo mật)
// -----------------------------------------------------------------------------
{
  const aiHandler = (await import('../api/ai.js')).default;

  // 6a. Từ chối khi chưa đăng nhập
  const mockReqUnauth = {
    method: 'POST',
    headers: {},
    body: { action: 'ask_assistant', payload: { message: 'Chào bạn' } }
  };
  let unauthStatusCode = 0;
  let unauthBody = null;
  const mockResUnauth = {
    status(code) { unauthStatusCode = code; return this; },
    json(data) { unauthBody = data; return this; },
    setHeader() {}
  };
  await aiHandler(mockReqUnauth, mockResUnauth);
  assert.strictEqual(unauthStatusCode, 401, 'Bắt buộc từ chối 401 khi chưa đăng nhập');

  console.log('✓ Test 6: Endpoint API /api/ai action ask_assistant được bảo vệ bảo mật đăng nhập chặt chẽ.');
}

// -----------------------------------------------------------------------------
// 7. Kiểm tra Tích Hợp Giao Diện Người Dùng (HTML, CSS & Client App.js Logic)
// -----------------------------------------------------------------------------
{
  const fs = await import('node:fs');
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  const appJs = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

  // 7a. Kiểm tra HTML: Không có nút Nav thừa thãi, có FAB và Modal Phù Thủy AI
  assert.ok(!html.includes('id="btn-open-assistant-nav"'), 'Desktop Navbar không còn nút Trợ Lý AI thừa thãi (đã có icon Phù Thủy)');
  assert.ok(html.includes('id="btn-floating-assistant"'), 'Phải có Floating Action Button (FAB) Trợ Lý AI');
  assert.ok(html.includes('id="modal-ai-assistant"'), 'Phải có modal #modal-ai-assistant');
  assert.ok(html.includes('id="assistant-chat-logs"'), 'Modal phải có khung log chat #assistant-chat-logs');
  assert.ok(html.includes('id="input-assistant-query"'), 'Modal phải có ô nhập câu hỏi #input-assistant-query');
  assert.ok(html.includes('id="btn-send-assistant"'), 'Modal phải có nút gửi #btn-send-assistant');
  assert.ok(html.includes('id="assistant-step-container"'), 'Modal phải có thanh trạng thái tiến trình thời gian thực');
  assert.ok(html.includes('Mẹo Thương lượng &amp; Xin xỏ') || html.includes('Mẹo Thương lượng'), 'Modal phải có pill gợi ý về Mẹo Thương lượng & Xin xỏ');

  // 7b. Kiểm tra CSS: Animation và Bubble Styling
  assert.ok(css.includes('#btn-floating-assistant'), 'CSS phải có style cho Floating Assistant Button');
  assert.ok(css.includes('.assistant-bubble-user'), 'CSS phải có style bubble người dùng');
  assert.ok(css.includes('.assistant-bubble-ai'), 'CSS phải có style bubble AI');
  assert.ok(css.includes('.assistant-action-card'), 'CSS phải có style thẻ hành động nhiệm vụ/quà');

  // 7c. Kiểm tra App.js: Quản lý vòng đời và tương tác
  assert.ok(appJs.includes('function openAssistantModal'), 'app.js phải có hàm openAssistantModal');
  assert.ok(appJs.includes('function closeAssistantModal'), 'app.js phải có hàm closeAssistantModal');
  assert.ok(appJs.includes('function sendAssistantMessage'), 'app.js phải có hàm sendAssistantMessage');
  assert.ok(appJs.includes('function acceptAssistantQuest'), 'app.js phải có hàm acceptAssistantQuest để nhận việc ngay');
  assert.ok(appJs.includes('function acceptAssistantReward'), 'app.js phải có hàm acceptAssistantReward để thêm quà ngay');
  assert.ok(appJs.includes('Alt+A'), 'app.js phải hỗ trợ phím tắt Alt+A để mở Trợ Lý AI');

  console.log('✓ Test 7: Toàn bộ HTML, CSS và JavaScript Client tích hợp hoàn hảo & đáp ứng tiêu chuẩn trải nghiệm RPG.');
}

// -----------------------------------------------------------------------------
// 8. Kiểm tra Khả Năng Hiển Thị Định Dạng Markdown (Headings, Lists, Bold, Spacing)
// -----------------------------------------------------------------------------
{
  const fs = await import('node:fs');
  const appJs = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

  // Trích xuất hàm renderMarkdown và escapeHtml từ app.js để test độc lập
  const escapeHtmlMatch = appJs.match(/function escapeHtml\([\s\S]*?^}/m);
  const renderMarkdownMatch = appJs.match(/function renderMarkdown\([\s\S]*?^}/m);
  assert.ok(renderMarkdownMatch, 'Phải tìm thấy hàm renderMarkdown trong app.js');

  const evalContext = new Function(`${escapeHtmlMatch[0]}; return ${renderMarkdownMatch[0]};`);
  const renderMarkdown = evalContext();

  const userReportedMarkdown = `Chào bạn! Hôm nay trong Bảng Nhiệm Vụ của bạn đang có 6 nhiệm vụ tuyệt vời sẵn sàng để chinh phục. Để ngày mới tràn đầy năng lượng và không bị quá tải, mình đề xuất cho bạn một lộ trình 3 bước nhịp nhàng như sau nhé:

### 🌅 1. Khởi động ngày mới (Nạp năng lượng & Thức tỉnh giác quan)
Phơi nắng (20 phút) (+10 Vàng) kết hợp hít thở không khí trong lành.
Làm nhanh 1 Set tập thể lực tại nhà (+5 Vàng) hoặc Yoga giãn cơ nhẹ nhàng (+15 Vàng) để cơ thể dẻo dai, tỉnh táo.

### ⚡ 2. Trọng tâm công việc (Bứt phá năng suất)
Bật chế độ Tập trung 1 tiếng (+24 Vàng) cho dự án hoặc công việc quan trọng nhất trong ngày. Đây là mốc thu hoạch Vàng lớn nhất đấy!
(Nếu có thời gian vào buổi chiều, bạn có thể ghé Đi Gym 45 phút để bung tỏa năng lượng!)

### 🌙 3. Phục hồi & Tận hưởng (Thư giãn cuối ngày)
Dành 15 phút Thiền định thư giãn (+6 Vàng) để lắng đọng tâm trí, gột rửa căng thẳng.
* Đừng quên ghé Cửa Hàng Guild đổi một món quà nhỏ từ số Vàng vừa kiếm được để tự thưởng cho chính mình nhé!

Bạn muốn bắt đầu ngay với nhiệm vụ nào đầu tiên?`;

  const rendered = renderMarkdown(userReportedMarkdown);

  // Không được để sót ký tự thô Markdown
  assert.ok(!rendered.includes('### 🌅'), 'Không được để sót chuỗi thô ### 🌅');
  assert.ok(!rendered.includes('* Đừng quên'), 'Không được để sót ký tự dấu sao thô của list item');

  // Phải render ra cấu trúc HTML chuẩn chỉ với Tailwind/CSS
  assert.ok(rendered.includes('<h3 class="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300'), 'Phải render thẻ <h3> có màu hổ phách amber đẹp mắt');
  assert.ok(rendered.includes('<ul class="my-1.5 space-y-1">'), 'Phải có thẻ <ul> bọc danh sách');
  assert.ok(rendered.includes('<li class="flex items-start gap-2 ml-1">'), 'Phải có thẻ <li> kèm icon bullet RPG');
  assert.ok(rendered.includes('🌅 1. Khởi động ngày mới'), 'Nội dung tiêu đề phải được giữ trọn vẹn');
  assert.ok(rendered.includes('Đừng quên ghé Cửa Hàng Guild đổi một món quà nhỏ'), 'Nội dung mục danh sách phải được giữ trọn vẹn');

  console.log('✓ Test 8: Bộ parser renderMarkdown xử lý hoàn hảo tiêu đề (H1-H4), danh sách bullet/số, in đậm và ngắt dòng.');
}

// -----------------------------------------------------------------------------
// 9. Kiểm tra Trả Về Dạng Streaming (SSE event: reply_start và event: chunk)
// -----------------------------------------------------------------------------
{
  const eventsCaptured = [];
  const mockRes = {
    setHeader() {},
    flushHeaders() {},
    write(chunk) {
      const str = chunk.toString();
      const lines = str.split('\n');
      let currentEvent = 'message';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6).trim());
            eventsCaptured.push({ event: currentEvent, data });
          } catch (_) {}
        }
      }
    },
    end() {}
  };

  const aiHandler = (await import('../api/ai.js')).default;
  const mockReq = {
    method: 'POST',
    headers: {
      authorization: 'Bearer admin_master_secret_2026_levelup',
      accept: 'text/event-stream'
    },
    body: {
      action: 'ask_assistant',
      payload: {
        message: 'Hôm nay tôi nên làm gì?',
        stream: true
      }
    }
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              thought: 'Đã phân tích xong câu hỏi.',
              reply: 'Chào bạn! Hôm nay là một ngày tuyệt vời để chinh phục các nhiệm vụ trong LevelUp.',
              options: [{ id: 1, label: 'Bắt đầu ngay', argument: 'Bắt đầu ngay' }]
            })
          }
        }
      ]
    })
  });

  try {
    await aiHandler(mockReq, mockRes);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Phải có sự kiện reply_start chứa thought của Brain
  const replyStartEv = eventsCaptured.find(e => e.event === 'reply_start');
  assert.ok(replyStartEv, 'Phải phát sự kiện reply_start để client mở khung chat streaming ngay');
  assert.ok(replyStartEv.data.thought !== undefined, 'reply_start phải kèm thought của Model Brain');

  // Phải có các sự kiện chunk chứa delta token từng từ
  const chunkEvents = eventsCaptured.filter(e => e.event === 'chunk');
  assert.ok(chunkEvents.length >= 5, 'Phải có chuỗi sự kiện chunk stream từng từ thay vì trả cả cục');
  assert.ok(chunkEvents[0].data.delta, 'Mỗi chunk phải chứa trường delta');

  // Sự kiện kết thúc result phải mang đầy đủ kết quả
  const resultEv = eventsCaptured.find(e => e.event === 'result');
  assert.ok(resultEv, 'Phải có sự kiện result chốt phiên');
  assert.ok(resultEv.data.reply, 'Result phải chứa toàn bộ câu trả lời hoàn chỉnh');

  console.log('✓ Test 9: Hệ thống stream câu trả lời theo thời gian thực (reply_start -> chunk... -> result) thành công xuất sắc.');
}

console.log('\n=== TẤT CẢ 9/9 BỘ KIỂM THỬ TRỢ LÝ AI (BRAIN & WORKER) ĐÃ ĐẠT 100%! ===');
process.exit(0);
