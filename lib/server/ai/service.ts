/**
 * Central AI Gateway Service
 * Dispatches requests across all AI capabilities: Appraisals, Negotiations, Suggestions,
 * Proof Verification, Bank Advisory, and Guild Companion Assistant.
 */

import type { LegacyApiRequest, LegacyApiResponse } from '@/types/server-api';
import { getRedis, checkRateLimit } from '@/lib/server/redis';
import { extractToken, getAdminConfig, authenticateCaller } from '@/lib/server/auth';
import { signQuest, signReward, signLoanOffer } from '@/lib/server/crypto';
import { calculateBankRates, calculateCreditLimit } from '@/lib/server/bank-math';
import { getGlobalBankState } from '@/lib/server/bank-service';
import { uploadProofImage } from '@/lib/server/storage';

import {
  clampStr,
  extractDurationFromText,
  resolveCategory,
  resolveRewardCategory,
  calculateRank,
  parseBool,
  analyzeMacroTelemetry,
  sanitizeEvaluatedQuest,
  sanitizeEvaluatedReward,
  parseDebateOptionsFromText,
  evaluateTextProofHeuristics
} from './appraisal';
import {
  callAI,
  createSSEStream,
  parseAIJsonContent,
  normalizeDebateOptions
} from './client';
import {
  TOOL_GET_MY_USER_DATA,
  TOOL_UPDATE_QUEST_PARAMETERS,
  TOOL_UPDATE_REWARD_PARAMETERS,
  TOOL_UPDATE_LOAN_TERMS,
  TOOL_SUGGEST_NEGOTIATION_OPTIONS,
  getFallbackNegotiationOptions,
  runNegotiationAgent,
  runDeterministicQuestDebate,
  runDeterministicRewardDebate,
  runDeterministicLoanDebate
} from './tools';
import { runAssistantAgent } from './assistant';
import {
  getDeterministicQuestSuggestions,
  getDeterministicRewardSuggestions,
  sanitizeQuestSuggestions,
  sanitizeRewardSuggestions
} from './suggestions';

export async function handleAiRequest(req: LegacyApiRequest, res: LegacyApiResponse): Promise<any> {
  // Enable CORS
  if (typeof res?.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const redis = getRedis();
  const token = extractToken(req);
  const adminConfig = getAdminConfig();

  // Xác thực tài khoản trước khi cho phép gọi AI Gateway
  const caller = await authenticateCaller(token, redis, adminConfig);
  if (!caller) {
    return res.status(401).json({ error: 'Cần đăng nhập tài khoản để sử dụng Trợ Lý AI.' });
  }

  // Giới hạn tần suất gọi AI (20 lượt / phút)
  const clientIp = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const rateLimitId = caller.sub ? `ai:user:${caller.sub}` : `ai:ip:${clientIp}`;
  const allowed = await checkRateLimit(redis, rateLimitId, 20, 60);
  if (!allowed) {
    return res.status(429).json({ error: 'Bạn đang gọi AI quá nhanh. Vui lòng chờ 1 phút trước khi tiếp tục.' });
  }

  try {
    const body = (req.body || {}) as Record<string, any>;
    const action = body.action;
    const payload: any = body.payload || {};

    if (!action) {
      return res.status(400).json({ error: 'Missing "action" in request body.' });
    }

    switch (action) {
      // ==========================================
      // 1. EVALUATE QUEST (Định giá nhiệm vụ)
      // ==========================================
      case 'evaluate_quest': {
        const title = clampStr(payload?.title, 150);
        const description = clampStr(payload?.description, 1000);
        const userEstimateCoins = parseInt(payload?.userEstimateCoins, 10) || 0;
        const userEstimateDuration = parseInt(payload?.userEstimateDuration, 10) || 0;
        const currentRewards = Array.isArray(payload?.currentRewards) ? payload.currentRewards.slice(0, 5) : [];
        const userCoins = parseInt(payload?.userCoins, 10) || 0;
        if (!title) {
          return res.status(400).json({ error: 'Quest title is required.' });
        }

        const systemPrompt = `Bạn là Trọng Tài Năng Suất & Trợ Lý Giám Định của LevelUp.
Mục tiêu: Đảm bảo tính kỷ luật và công bằng cho hệ sinh thái RPG, ngăn chặn lạm phát điểm thưởng, ngăn chặn việc "farm" Vàng từ các việc vặt vãnh và hỗ trợ người dùng xây dựng thói quen tốt.
Văn phong: Khách quan, công tâm, CỰC KỲ SÚC TÍCH VÀ ĐI THẲNG VÀO TRỌNG TÂM. Không chào hỏi xã giao, không triết lý lê thê.

QUY TẮC THẨM ĐỊNH & PHÂN LOẠI KỶ LUẬT:
1. TRỪNG PHẠT VIỆC HIỂN NHIÊN / SINH HOẠT CÁ NHÂN (ANTI-TRIVIAL):
   - Tuyệt đối KHÔNG trả thưởng cao cho các hành vi sinh hoạt bình thường hiển nhiên (thở, uống nước, đánh răng, rửa mặt, thức dậy, gấp chăn, ăn cơm, mở máy tính...).
   - BẮT BUỘC: Ép về type = 'bounty', targetMinutes = 0, rewardCoins = 1 hoặc 2 Vàng tượng trưng, rank 'E'.
2. CHỐNG KHỐNG THỜI GIAN & VIỆC DỌN DẸP NHANH (ANTI-PADDING):
   - Việc nhà đơn giản (rửa bát/chén, quét nhà, đổ rác, lau bàn) chỉ mất 5-10 phút: BẮT BUỘC chọn type = 'bounty' (thưởng 3 - 5 Vàng, targetMinutes = 0). Giữ đúng tên việc nhà (tuyệt đối không biến thành việc học tập).
   - TUYỆT ĐỐI NGHIÊM CẤM duyệt 30-50 phút cho việc vặt dọn dẹp.
3. TIÊU CHUẨN TẬP TRUNG SÂU (DEEP WORK) & TÔN TRỌNG THỜI GIAN YÊU CẦU:
   - CHỈ các việc đòi hỏi tư duy trí óc hoặc rèn luyện (học tập, ôn thi, đọc sách, lập trình, làm dự án, thể thao) mới được cấp type = 'focus'.
   - TÔN TRỌNG THỜI GIAN NGƯỜI DÙNG YÊU CẦU CỤ THỂ NẾU HỢP LÝ:
     * Nếu người dùng có yêu cầu cụ thể về thời gian (qua ô nhập thời lượng hoặc nêu rõ trong tên/mô tả như "30 phút", "45 phút", "1 tiếng", "20p") và thời gian đó hợp lý (10 - 180 phút):
       -> BẮT BUỘC BẠN PHẢI TÔN TRỌNG VÀ ĐẶT 'targetMinutes' đúng bằng số phút người dùng mong muốn. TUYỆT ĐỐI KHÔNG tự ý ép về 25 hoặc 50 phút mặc định!
       -> TÍNH TOÁN MỨC VÀNG TƯƠNG XỨNG THEO THỜI GIAN: Tính công bằng theo tỷ lệ chuẩn ~0.35 - 0.40 Vàng/phút tập trung.
          Ví dụ chuẩn:
          + 15 phút: 5 - 7 Vàng
          + 20 phút: 7 - 9 Vàng
          + 30 phút: 10 - 12 Vàng
          + 45 phút: 15 - 17 Vàng
          + 60 phút (1 tiếng): 20 - 24 Vàng
          + 90 phút (1.5 tiếng): 30 - 35 Vàng
          + 120 phút (2 tiếng): 40 - 45 Vàng
     * Nếu người dùng KHÔNG yêu cầu thời gian cụ thể: Áp dụng khung chuẩn Pomodoro 25 phút = 8 - 10 Vàng, 50 phút = 18 - 20 Vàng.
4. QUY TẮC BẮT BUỘC CHIA NHỎ NHIỆM VỤ QUÁ TẢI (NGHIÊM CẤM BẢO USER TỰ CHIA):
   - Đánh giá khả thi trong 1 phiên: Một người chỉ có thể tập trung học sâu 1 đơn vị công việc vừa sức (ví dụ: Đọc kỹ & tóm tắt 1 chương sách, làm 3-5 bài tập toán, học 15-20 từ vựng).
   - NHỒI NHÉT / QUÁ TẢI: Nếu người dùng ghi đọc nhiều chương (như "10 chương", "5 chương", "toàn bộ cuốn sách"), học hàng trăm từ, làm toàn bộ đề cương ôn thi:
     -> BẮT BUỘC BẠN PHẢI CHỦ ĐỘNG ĐỔI TÊN ('title') NGAY THÀNH PHIÊN CHƯƠNG 1 (ví dụ: "Đọc kỹ & tóm tắt Chương 1 môn Kinh tế Vĩ mô").
     -> TUYỆT ĐỐI NGHIÊM CẤM giữ nguyên "10 chương" hay "toàn bộ các chương"!
     -> TUYỆT ĐỐI NGHIÊM CẤM bảo người dùng "hãy tự chia nhỏ" hay "ta cho 90 phút rồi tự chia nhỏ"! Trách nhiệm của bạn là PHẢI chia nhỏ ngay trong 'title' và 'description'.
     -> BẮT BUỘC đặt thời gian 'targetMinutes' là 25 hoặc 50 phút. KHÔNG ĐƯỢC đặt 90 phút cho các việc nhồi nhét.
     -> BẮT BUỘC đặt 'isModified': true và 'isOverloaded': true.
     -> BẮT BUỘC nêu rõ 'modificationReason': Lý do ngắn gọn vì sao việc 10 chương là quá tải và phiên bản Chương 1 này giúp người dùng học tập hiệu quả bền bỉ hơn.
   - CHỈ giữ nguyên tên ban đầu ("isModified": false) khi nhiệm vụ thực sự rõ ràng, vừa sức và khả thi trong 1 phiên duy nhất.
5. QUY TẮC BẮT BUỘC VỀ YÊU CẦU BẰNG CHỨNG ('requiresProof' & 'proofType'):
   - BẮT BUỘC ĐẶT "requiresProof": true CHO MỌI NHIỆM VỤ THƯỞNG TỪ 15 VÀNG TRỞ LÊN (Hạng B, A, S) HOẶC PHIÊN TẬP TRUNG TỪ 25-50 PHÚT TRỞ LÊN:
   - CHỌN HÌNH THỨC NỘP BẰNG CHỨNG ('proofType'):
     * "photo" (Chụp ảnh thực tế): Thể thao, vận động, chạy bộ, dọn dẹp, việc nhà, góc bàn làm việc.
     * "text" (Báo cáo nội dung công việc): Đọc sách, học tập, nghiên cứu, viết code, học ngoại ngữ, làm tài liệu trên máy tính.
     * "both" (Kết hợp cả hai): Vừa chụp ảnh vừa viết tóm tắt giải trình (áp dụng cho giải bài tập toán/lý/hóa, nấu ăn, vẽ tranh).
   - Chỉ đặt "requiresProof": false cho việc nhanh dưới 15 Vàng hoặc việc nhà vặt vãnh.

Trả về ĐÚNG định dạng JSON:
{
  "category": "learning" | "fitness" | "deepwork" | "wellness" | "chore" | "trivial",
  "title": "Tên nhiệm vụ",
  "description": "Mô tả nhiệm vụ",
  "isModified": boolean,
  "isOverloaded": boolean,
  "modificationReason": "Lý do",
  "type": "focus" | "bounty",
  "targetMinutes": number,
  "rewardCoins": number,
  "rank": "E" | "D" | "C" | "B" | "A" | "S",
  "requiresProof": boolean,
  "proofType": "photo" | "text" | "both",
  "proofGuidance": "Hướng dẫn nộp bằng chứng",
  "icon": "1 emoji đại diện phù hợp nhất cho nhiệm vụ này",
  "verdict": "Nhận xét súc tích (1-2 câu)"
}`;

        let rewardContext = '';
        if (Array.isArray(currentRewards) && currentRewards.length > 0) {
          const rewardList = currentRewards.map(r => `  + "${r.name}": giá ${r.price} Vàng (${r.targetMinutes ? r.targetMinutes + 'p' : 'Dùng ngay'})`).join('\n');
          rewardContext = `\n- Các phần thưởng trong Cửa Hàng:\n${rewardList}\n- Số Vàng hiện có của người chơi: ${userCoins} Vàng`;
        }

        const inferredDuration = extractDurationFromText(`${title} ${description}`);
        const effectiveDuration = userEstimateDuration > 0 ? userEstimateDuration : inferredDuration;
        const durationPromptInfo = effectiveDuration > 0
          ? `${effectiveDuration} phút (người dùng yêu cầu cụ thể: hãy tôn trọng số phút này nếu hợp lý và tính thưởng tương xứng)`
          : 'Để AI đề xuất (BẮT BUỘC 0 cho việc nhà/việc vặt, 25 hoặc 50 cho học tập/deep work)';

        const userPrompt = `Nhiệm vụ cần giám định:
- Tên công việc: "${title}"
- Chi tiết mô tả: "${description}"
- Mức thưởng người dùng tự ước tính: ${userEstimateCoins ? userEstimateCoins + ' Vàng' : 'Để AI đề xuất'}
- Thời gian mong muốn: ${durationPromptInfo}${rewardContext}`;

        let rawResult: any = null;
        try {
          rawResult = await callAI(systemPrompt, userPrompt, { role: 'worker', thinking: false, temperature: 0.3 });
          if (rawResult && typeof rawResult === 'object') {
            rawResult.fromAI = true;
          }
        } catch (err: any) {
          console.warn('[AI evaluate_quest] callAI failed/timeout, falling back to deterministic evaluation:', err?.message);
        }

        // Deterministic fallback if AI is offline
        if (!rawResult || typeof rawResult !== 'object') {
          const type = (effectiveDuration > 0) ? 'focus' : 'bounty';
          const coins = userEstimateCoins || (type === 'focus' ? Math.max(5, Math.round(effectiveDuration * 0.38)) : 4);
          const requiresProof = coins >= 15 || effectiveDuration >= 45;
          const category = resolveCategory(title, title, description, description);
          const isChoreOrTrivial = category === 'chore' || category === 'trivial';
          const proofType = isChoreOrTrivial ? 'photo' : 'text';

          rawResult = {
            category,
            title,
            description,
            type,
            targetMinutes: effectiveDuration || 0,
            rewardCoins: coins,
            rank: calculateRank(coins, effectiveDuration || 0),
            requiresProof,
            proofType,
            proofGuidance: requiresProof
              ? (proofType === 'photo' ? 'Chụp ảnh góc làm việc hoặc kết quả sau khi hoàn thành.' : 'Ghi lại tóm tắt 2-3 ý chính hoặc kết quả cụ thể bạn vừa hoàn thành.')
              : '',
            icon: isChoreOrTrivial ? '🧹' : (type === 'focus' ? '🎯' : '⚡'),
            verdict: 'Nhiệm vụ đã được định giá tự động theo tiêu chuẩn kỷ luật của LevelUp.'
          };
        }

        const isRepeatable = Boolean(payload?.isRepeatable);
        const result = sanitizeEvaluatedQuest(rawResult, title, description, effectiveDuration);
        result.isRepeatable = isRepeatable;
        result.signature = signQuest(result.title, result.type, result.targetMinutes, result.rewardCoins, result.requiresProof, isRepeatable);
        return res.status(200).json(result);
      }

      // ==========================================
      // 2. DEBATE QUEST (Thương lượng nhiệm vụ)
      // ==========================================
      case 'debate_quest': {
        const { quest } = payload || {};
        const argument = clampStr(payload?.argument, 1000);
        const history = Array.isArray(payload?.history) ? payload.history.slice(-6) : [];
        const isStream = Boolean(payload?.stream) || req.headers?.accept === 'text/event-stream';
        const selectedOpt = payload?.selectedOption || null;

        if (!quest || !argument) {
          return res.status(400).json({ error: 'Quest and argument are required.' });
        }

        const sse = isStream ? (res?.sse || createSSEStream(res)) : null;
        const onEvent = sse ? (ev: string, data: any) => sse.send(ev, data) : null;

        let result: any = null;
        try {
          result = await runNegotiationAgent({
            domain: 'quest',
            caller,
            redis,
            targetEntity: quest,
            selectedOption: selectedOpt,
            userPrompt: argument,
            userArgument: argument,
            tools: [TOOL_GET_MY_USER_DATA, TOOL_UPDATE_QUEST_PARAMETERS, TOOL_SUGGEST_NEGOTIATION_OPTIONS],
            onEvent
          });
        } catch (_) {}

        const isQuestion = /\b(?:được\s*(?:không|ko|chăng)|có\s*được\s*không)\b|\?/i.test(argument);
        const userAgreed = !isQuestion && (/\b(chốt|đồng\s*ý|dong\s*y|nhất\s*trí|nhat\s*tri|ok|oke|chấp\s*thuận|chap\s*thuan|thống\s*nhất|thong\s*nhat)\b/i.test(argument) || /^(?:được|duoc|ok|oke)[\s.!]*$/i.test(argument.trim()));
        const aiAgreed = result && typeof result.reply === 'string' && !/\b(?:để|hãy|bạn)\s*(?:cùng\s*)?chốt\b/i.test(result.reply) && /\b(đồng\s*ý|nhất\s*trí|thống\s*nhất|mình chốt|mình duyệt|mình chấp thuận|sẵn sàng)\b/i.test(result.reply);

        if (result && typeof result.reply === 'string' && (result.reply.trim().startsWith('{') || result.reply.trim().startsWith('```json'))) {
          const parsed = parseAIJsonContent(result.reply);
          if (parsed && typeof parsed.reply === 'string') {
            result.reply = parsed.reply;
            if ((!result.options || result.options.length === 0) && Array.isArray(parsed.options)) {
              result.options = normalizeDebateOptions(parsed.options, 'quest');
            }
            if (parsed.accepted !== undefined && !selectedOpt && !userAgreed) {
              result.accepted = Boolean(parsed.accepted);
            }
          }
        }

        if (!result) {
          result = runDeterministicQuestDebate(quest, argument, selectedOpt);
        }

        if (result?.signature && (result?.accepted || selectedOpt)) {
          result.options = [];
          if (sse) {
            sse.send('step', { step: 5, totalSteps: 5, icon: '🛡️', text: 'Đang đóng dấu xác thực bảo mật & hoàn tất phản hồi...', pct: 100 });
            sse.end('result', result);
            return;
          }
          return res.status(200).json(result);
        }

        if (result?.fromAI) {
          if (result.accepted) {
            let cleanReward = parseInt(result.newRewardCoins !== undefined ? result.newRewardCoins : quest.rewardCoins, 10);
            let cleanMinutes = parseInt(result.newTargetMinutes !== undefined ? result.newTargetMinutes : quest.targetMinutes, 10);
            let cleanType = result.newType || (cleanMinutes > 0 ? 'focus' : 'bounty');
            let cleanProof = result.newRequiresProof !== undefined ? Boolean(result.newRequiresProof) : Boolean(quest.requiresProof);
            let cleanProofType = result.newProofType || quest.proofType || 'photo';
            let cleanGuidance = result.newProofGuidance !== undefined ? result.newProofGuidance : (quest.proofGuidance || '');
            let cleanTitle = result.newTitle || quest.title;
            let cleanDesc = result.newDescription !== undefined ? result.newDescription : (quest.description || '');

            cleanReward = Math.max(1, Math.min(60, isNaN(cleanReward) ? quest.rewardCoins : cleanReward));
            cleanMinutes = Math.max(0, Math.min(180, isNaN(cleanMinutes) ? quest.targetMinutes : cleanMinutes));
            if (cleanType === 'bounty') cleanMinutes = 0;

            const isRepeatable = Boolean(payload?.isRepeatable !== undefined ? payload.isRepeatable : (result.newIsRepeatable !== undefined ? result.newIsRepeatable : quest.isRepeatable));
            result.newTitle = cleanTitle;
            result.newDescription = cleanDesc;
            result.newType = cleanType;
            result.newTargetMinutes = cleanMinutes;
            result.newRewardCoins = cleanReward;
            result.newRequiresProof = cleanProof;
            result.newProofType = cleanProofType;
            result.newProofGuidance = cleanGuidance;
            result.isRepeatable = isRepeatable;
            result.signature = signQuest(cleanTitle, cleanType, cleanMinutes, cleanReward, cleanProof, isRepeatable);
          }
          if (result.accepted || selectedOpt) {
            result.options = [];
          } else {
            if (!Array.isArray(result.options) || result.options.length === 0) {
              result.options = parseDebateOptionsFromText(result.reply, 'quest');
            }
            if (!Array.isArray(result.options) || result.options.length === 0) {
              result.options = getFallbackNegotiationOptions('quest', quest);
            }
          }
          if (sse) {
            sse.send('step', { step: 5, totalSteps: 5, icon: '🛡️', text: 'Đang đóng dấu xác thực bảo mật & hoàn tất phản hồi...', pct: 100 });
            sse.end('result', result);
            return;
          }
          return res.status(200).json(result);
        }

        const isAccepted = Boolean(result.accepted) || Boolean(selectedOpt) || (userAgreed && aiAgreed);
        if (isAccepted) {
          result.accepted = true;
          let extractedCoins: number | undefined;
          let extractedMins: number | undefined;

          if (selectedOpt) {
            if (selectedOpt.newRewardCoins !== undefined) extractedCoins = parseInt(selectedOpt.newRewardCoins, 10);
            if (selectedOpt.newTargetMinutes !== undefined) extractedMins = parseInt(selectedOpt.newTargetMinutes, 10);
            if (selectedOpt.newType !== undefined) result.newType = selectedOpt.newType;
            if (selectedOpt.newRequiresProof !== undefined) result.newRequiresProof = selectedOpt.newRequiresProof;
            if (selectedOpt.newTitle) result.newTitle = selectedOpt.newTitle;
            if (!result.reply || (!aiAgreed && !result.accepted)) {
              result.reply = `Mình hoàn toàn nhất trí chốt theo ${selectedOpt.label || 'phương án bạn chọn'} nhé! Thông số đã được cập nhật chuẩn xác. Chúc bạn làm việc thật hiệu quả! ✨`;
            }
          }

          if (extractedCoins === undefined) {
            if (result.newRewardCoins !== undefined) extractedCoins = parseInt(result.newRewardCoins, 10);
            else if (result.rewardCoins !== undefined) extractedCoins = parseInt(result.rewardCoins, 10);
          }

          if (extractedMins === undefined) {
            if (result.newTargetMinutes !== undefined) extractedMins = parseInt(result.newTargetMinutes, 10);
            else if (result.targetMinutes !== undefined) extractedMins = parseInt(result.targetMinutes, 10);
          }

          if (extractedCoins === undefined && result.reply) {
            const coinMatch = result.reply.match(/(?:mức\s*thưởng|thưởng|nâng\s*lên|tăng\s*lên|giảm\s*xuống|còn)[:\s]*(\d+)\s*vàng/i) || result.reply.match(/(\d+)\s*vàng/i);
            if (coinMatch) extractedCoins = parseInt(coinMatch[1], 10);
          }

          if (extractedMins === undefined) {
            const durationFromQuestName = extractDurationFromText(result.newTitle || selectedOpt?.newTitle || quest.title);
            if (durationFromQuestName > 0) {
              extractedMins = durationFromQuestName;
            } else if (result.reply) {
              const timeMatch = result.reply.match(/(?:thời\s*(?:gian|lượng)|tập\s*trung\s*(?:lên|xuống|khoảng)?|tăng\s*(?:thời\s*gian\s*)?(?:lên|xuống)|xuống|còn)[:\s]*(\d+)\s*phút/i);
              if (timeMatch) extractedMins = parseInt(timeMatch[1], 10);
            }
          }

          if (extractedMins === undefined && (result.newType === 'bounty' || selectedOpt?.newType === 'bounty' || /(?:không\s*(?:cần\s*)?bấm\s*giờ|hoàn\s*thành\s*ngay)/i.test(result.reply || ''))) {
            extractedMins = 0;
          }

          const rawCoins = (extractedCoins !== undefined && !isNaN(extractedCoins)) ? extractedCoins : quest.rewardCoins;
          const rawMins = (extractedMins !== undefined && !isNaN(extractedMins)) ? extractedMins : (quest.targetMinutes !== undefined ? quest.targetMinutes : 25);

          const combinedDebateText = `${argument || ''} ${result.reply || ''}`;
          const debateWantsBoth = /(?:kết\s*hợp|cả\s*hai|cả\s*ảnh[\s\S]{1,60}(?:báo\s*cáo|tóm\s*tắt|viết)|vừa\s*(?:chụp\s*)?ảnh[\s\S]{1,60}vừa\s*(?:báo\s*cáo|tóm\s*tắt|viết)|vừa\s*chụp[\s\S]{1,60}vừa\s*(?:viết|báo|tóm)|ảnh\s*(?:kèm|\+|và)\s*(?:báo\s*cáo|tóm\s*tắt|viết)|(?:báo\s*cáo|tóm\s*tắt|viết)\s*(?:kèm|\+)\s*ảnh)/i.test(combinedDebateText);
          const debateWantsPhoto = !debateWantsBoth && /(?:đổi\s*sang|chuyển\s*sang|chỉ\s*(?:cần\s*)?|thay\s*bằng|muốn|xin)\s*(?:chụp\s*ảnh(?:\s*thực\s*tế)?|bằng\s*chứng\s*ảnh)|(?:chụp\s*ảnh(?:\s*thực\s*tế)?|bằng\s*chứng\s*ảnh)\s*(?:thôi|được\s*không|thay\s*vì)/i.test(combinedDebateText) && !/(?:không\s*cần|miễn)\s*(?:chụp\s*ảnh|bằng\s*chứng)/i.test(combinedDebateText);
          const debateWantsText = !debateWantsBoth && /(?:đổi\s*sang|chuyển\s*sang|chỉ\s*(?:cần\s*)?|thay\s*bằng|muốn|xin)\s*(?:nộp\s*)?(?:báo\s*cáo(?:\s*nội\s*dung)?|viết\s*(?:báo\s*cáo|tóm\s*tắt)|tóm\s*tắt(?:\s*nội\s*dung)?)|(?:báo\s*cáo(?:\s*nội\s*dung)?|viết\s*(?:báo\s*cáo|tóm\s*tắt))\s*(?:thôi|được\s*không|thay\s*vì)/i.test(combinedDebateText) && !/(?:không\s*cần|miễn)\s*(?:báo\s*cáo|bằng\s*chứng)/i.test(combinedDebateText);
          const debateWantsWaive = /(?:miễn|không\s*cần|bỏ)\s*(?:chụp\s*ảnh|bằng\s*chứng|xác\s*thực)/i.test(combinedDebateText);

          if (result.newProofType) {
            if (result.newRequiresProof === undefined) result.newRequiresProof = true;
          } else if (selectedOpt?.newProofType) {
            result.newProofType = selectedOpt.newProofType;
            result.newRequiresProof = true;
          } else if (debateWantsBoth) {
            result.newProofType = 'both';
            result.newRequiresProof = true;
          } else if (debateWantsPhoto) {
            result.newProofType = 'photo';
            result.newRequiresProof = true;
          } else if (debateWantsText) {
            result.newProofType = 'text';
            result.newRequiresProof = true;
          } else if (debateWantsWaive) {
            result.newRequiresProof = false;
          }

          const hasExplicitProofDecision = debateWantsBoth || debateWantsPhoto || debateWantsText || debateWantsWaive || result.newRequiresProof !== undefined || selectedOpt?.newRequiresProof !== undefined || result.newProofType !== undefined || selectedOpt?.newProofType !== undefined;
          const negotiatedProof = hasExplicitProofDecision
            ? parseBool(result.newRequiresProof ?? selectedOpt?.newRequiresProof, (result.newProofType || selectedOpt?.newProofType) ? true : quest.requiresProof)
            : parseBool(quest.requiresProof, false);

          const explicitProofType = result.newProofType || selectedOpt?.newProofType;
          const rawDebate = {
            title: result.newTitle || selectedOpt?.newTitle || quest.title,
            description: result.newDescription !== undefined ? result.newDescription : (quest.description || ''),
            category: result.newCategory || quest.category,
            type: result.newType || selectedOpt?.newType || (rawMins > 0 ? 'focus' : quest.type || 'focus'),
            targetMinutes: rawMins,
            rewardCoins: rawCoins,
            rank: result.newRank,
            requiresProof: negotiatedProof,
            proofType: explicitProofType || quest.proofType,
            proofGuidance: result.newProofGuidance !== undefined ? result.newProofGuidance : (quest.proofGuidance || ''),
            icon: quest.icon,
            isNegotiated: true
          };
          const clean = sanitizeEvaluatedQuest(rawDebate, quest.title, quest.description);
          result.newTitle = clean.title;
          result.newDescription = clean.description;
          result.newType = clean.type;
          result.newTargetMinutes = clean.targetMinutes;
          result.rewardCoins = clean.rewardCoins;
          result.newRank = clean.rank;
          result.newIcon = clean.icon || quest.icon;

          if (hasExplicitProofDecision && !clean.isTrivialTask) {
            result.newRequiresProof = negotiatedProof;
            result.newProofType = explicitProofType || clean.proofType || quest.proofType || 'photo';
            result.newProofGuidance = negotiatedProof
              ? (result.newProofGuidance?.trim() || clean.proofGuidance || (result.newProofType === 'both' ? 'Chụp ảnh kết quả thực tế và viết tóm tắt ngắn gọn nội dung đã hoàn thành.' : (result.newProofType === 'text' ? 'Ghi lại các ý chính hoặc kết quả nội dung đã hoàn thành.' : 'Chụp ảnh kết quả thực tế khi hoàn thành nhiệm vụ.')))
              : '';
          } else {
            result.newRequiresProof = clean.requiresProof;
            result.newProofType = clean.proofType;
            result.newProofGuidance = clean.proofGuidance;
          }

          const isRepeatable = Boolean(payload?.isRepeatable !== undefined ? payload.isRepeatable : (result.newIsRepeatable !== undefined ? result.newIsRepeatable : (result.isRepeatable !== undefined ? result.isRepeatable : quest.isRepeatable)));
          result.isRepeatable = isRepeatable;
          result.signature = signQuest(clean.title, clean.type, clean.targetMinutes, clean.rewardCoins, result.newRequiresProof, isRepeatable);
        }

        if (isAccepted) {
          result.options = [];
        } else {
          if (!Array.isArray(result.options) || result.options.length === 0) {
            result.options = parseDebateOptionsFromText(result.reply, 'quest');
          }
          if (!Array.isArray(result.options) || result.options.length === 0) {
            result.options = getFallbackNegotiationOptions('quest', quest);
          }
        }
        if (sse) {
          sse.send('step', { step: 5, totalSteps: 5, icon: '🛡️', text: 'Đang đóng dấu xác thực bảo mật & hoàn tất phản hồi...', pct: 100 });
          sse.end('result', result);
          return;
        }
        return res.status(200).json(result);
      }

      // ==========================================
      // 3. EVALUATE REWARD (Định giá phần thưởng)
      // ==========================================
      case 'evaluate_reward': {
        const name = clampStr(payload?.name, 150);
        const description = clampStr(payload?.description, 1000);
        const userEstimatePrice = Math.max(0, parseInt(payload?.userEstimatePrice, 10) || 0);
        const userEstimateDuration = Math.max(0, parseInt(payload?.userEstimateDuration, 10) || 0);
        const currentQuests = Array.isArray(payload?.currentQuests) ? payload.currentQuests.slice(0, 5) : [];
        const userCoins = parseInt(payload?.userCoins, 10) || 0;
        if (!name) {
          return res.status(400).json({ error: 'Reward name is required.' });
        }

        const systemPrompt = `Bạn là Trợ Lý Định Giá Cửa Hàng & Giám Định Phần Thưởng của LevelUp.
Mục tiêu: Thiết lập mức giá Vàng cân bằng, công bằng và bảo vệ nguyên tắc kinh tế RPG: nỗ lực tương xứng với phần thưởng, kiên quyết giữ vững giá trị lành mạnh và ngăn chặn dopamine giá rẻ.
Văn phong: Khách quan, công tâm, CỰC KỲ SÚC TÍCH VÀ ĐI THẲNG VÀO TRỌNG TÂM. Không chào hỏi xã giao, không triết lý lê thê.

QUY TẮC ĐỊNH GIÁ & QUY ĐỔI CÔNG SỨC:
1. NGUYÊN TẮC TỶ LỆ CÔNG SỨC 3:1 HOẶC 4:1 (BẢO VỆ GIÁ TRỊ THỰC):
   - Người chơi cần tích lũy thời gian làm việc nghiêm túc để tận hưởng phần thưởng một cách trọn vẹn và tự hào nhất.
   - Bảng quy đổi chuẩn:
     * Lướt mạng xã hội / TikTok / Facebook / Shorts 30 phút: 25 - 35 Vàng.
     * Chơi game / Xem phim 1 - 2 tiếng: 60 - 90 Vàng (tối thiểu 35 Vàng).
     * Cốc trà sữa / Cà phê quán xá: 40 - 55 Vàng.
     * Phần thưởng lớn (Mua sắm cá nhân, liên hoan, du lịch): 300 - 1000+ Vàng.
   - GIỮ VỮNG MỨC GIÁ CHUẨN: Nếu người dùng đề xuất mức giá quá thấp (VD: "chơi game 1 tiếng 10 Vàng"), BẮT BUỘC BẠN PHẢI ĐIỀU CHỈNH LÊN mức chuẩn (tối thiểu 35 Vàng).
2. BẮT BUỘC TINH CHỈNH PHẦN THƯỞNG ĐỘC HẠI HOẶC ẢNH HƯỞNG SỨC KHỎE:
   - Các hành vi: uống say xỉn, hút thuốc, thức thâu đêm chơi game, tiêu sạch tiền lương...
   - BẮT BUỘC đổi tên ('name') và mô tả ('description') sang món quà lành mạnh tương đương.
   - Đặt "isModified": true và nêu rõ lý do bảo vệ sức khỏe ngắn gọn.
3. Phân loại ('tier'):
   - 'common': Quà nhỏ thường ngày (15 - 25 Vàng)
   - 'rare': Giải trí cuối tuần vừa phải (30 - 60 Vàng)
   - 'epic': Phần thưởng lớn theo tuần/tháng (70 - 250 Vàng)
   - 'legendary': Mục tiêu ao ước lớn (300+ Vàng)

Trả về ĐÚNG định dạng JSON:
{
  "category": "entertainment" | "treat" | "item" | "milestone" | "harmful",
  "name": "Tên phần thưởng",
  "description": "Mô tả phần thưởng",
  "isModified": boolean,
  "modificationReason": "Lý do",
  "price": number,
  "tier": "common" | "rare" | "epic" | "legendary",
  "targetMinutes": number,
  "icon": "emoji đại diện phù hợp nhất cho món quà này",
  "verdict": "Nhận xét súc tích (1-2 câu)"
}`;

        let questContext = '';
        if (Array.isArray(currentQuests) && currentQuests.length > 0) {
          const questList = currentQuests.slice(0, 5).map(q => `  + "${q.title}" (Thưởng ${q.rewardCoins} Vàng, ${q.type === 'focus' ? (q.targetMinutes || 25) + ' phút' : 'Không cần bấm giờ'})`).join('\n');
          questContext = `\n- Các nhiệm vụ người dùng đang thực hiện:\n${questList}\n- Số Vàng hiện có của người chơi: ${userCoins} Vàng`;
        }

        const inferredDuration = extractDurationFromText(`${name} ${description}`);
        const effectiveDuration = userEstimateDuration > 0 ? userEstimateDuration : inferredDuration;
        const durationPromptInfo = effectiveDuration > 0
          ? `${effectiveDuration} phút (người dùng yêu cầu cụ thể: hãy tôn trọng số phút này nếu hợp lý và tính giá Vàng tương xứng)`
          : 'Để AI đề xuất (BẮT BUỘC đặt 15 - 30 phút cho hoạt động giải trí/mạng xã hội, 0 cho ăn uống/vật phẩm)';

        const userPrompt = `Phần thưởng muốn thêm vào Cửa Hàng:
- Tên phần thưởng: "${name}"
- Chi tiết: "${description}"
- Mức giá người dùng dự kiến: ${userEstimatePrice ? userEstimatePrice + ' Vàng' : 'Để AI đề xuất'}
- Thời gian tận hưởng dự kiến: ${durationPromptInfo}${questContext}`;

        let rawResult: any = null;
        try {
          rawResult = await callAI(systemPrompt, userPrompt, { role: 'worker', thinking: false, temperature: 0.3 });
          if (rawResult && typeof rawResult === 'object') {
            rawResult.fromAI = true;
          }
        } catch (err: any) {
          console.warn('[AI evaluate_reward] callAI failed/timeout, falling back to deterministic evaluation:', err?.message);
        }

        if (!rawResult || typeof rawResult !== 'object') {
          rawResult = {
            category: resolveRewardCategory(name, name, description, description),
            name,
            description,
            price: userEstimatePrice || 25,
            targetMinutes: effectiveDuration || 0,
            tier: 'common',
            icon: '🎁',
            verdict: 'Phần thưởng đã được định giá tự động theo tiêu chuẩn nỗ lực của LevelUp.'
          };
        }

        const result = sanitizeEvaluatedReward(rawResult, name, description, effectiveDuration);
        result.signature = signReward(result.name, result.price, result.tier, result.targetMinutes);
        return res.status(200).json(result);
      }

      // ==========================================
      // 4. DEBATE REWARD (Thương lượng phần thưởng)
      // ==========================================
      case 'debate_reward': {
        const { reward } = payload || {};
        const argument = clampStr(payload?.argument, 1000);
        const history = Array.isArray(payload?.history) ? payload.history.slice(-6) : [];
        const isStream = Boolean(payload?.stream) || req.headers?.accept === 'text/event-stream';
        const selectedOpt = payload?.selectedOption || null;

        if (!reward || !argument) {
          return res.status(400).json({ error: 'Reward and argument are required.' });
        }

        const sse = isStream ? (res?.sse || createSSEStream(res)) : null;
        const onEvent = sse ? (ev: string, data: any) => sse.send(ev, data) : null;

        let result: any = null;
        try {
          result = await runNegotiationAgent({
            domain: 'reward',
            caller,
            redis,
            targetEntity: reward,
            selectedOption: selectedOpt,
            userPrompt: argument,
            userArgument: argument,
            tools: [TOOL_GET_MY_USER_DATA, TOOL_UPDATE_REWARD_PARAMETERS, TOOL_SUGGEST_NEGOTIATION_OPTIONS],
            onEvent
          });
        } catch (_) {}

        const isQuestion = /\b(?:được\s*(?:không|ko|chăng)|có\s*được\s*không)\b|\?/i.test(argument);
        const userAgreed = !isQuestion && (/\b(chốt|đồng\s*ý|dong\s*y|nhất\s*trí|nhat\s*tri|ok|oke|chấp\s*thuận|chap\s*thuan|thống\s*nhất|thong\s*nhat)\b/i.test(argument) || /^(?:được|duoc|ok|oke)[\s.!]*$/i.test(argument.trim()));
        const aiAgreed = result && typeof result.reply === 'string' && !/\b(?:để|hãy|bạn)\s*(?:cùng\s*)?chốt\b/i.test(result.reply) && /\b(đồng\s*ý|nhất\s*trí|thống\s*nhất|mình chốt|mình duyệt|mình chấp thuận|sẵn sàng)\b/i.test(result.reply);

        if (result && typeof result.reply === 'string' && (result.reply.trim().startsWith('{') || result.reply.trim().startsWith('```json'))) {
          const parsed = parseAIJsonContent(result.reply);
          if (parsed && typeof parsed.reply === 'string') {
            result.reply = parsed.reply;
            if ((!result.options || result.options.length === 0) && Array.isArray(parsed.options)) {
              result.options = normalizeDebateOptions(parsed.options, 'reward');
            }
            if (parsed.accepted !== undefined && !selectedOpt && !userAgreed) {
              result.accepted = Boolean(parsed.accepted);
            }
          }
        }

        if (!result) {
          result = runDeterministicRewardDebate(reward, argument, selectedOpt);
        }

        const isAcceptedReward = Boolean(result.accepted) || Boolean(selectedOpt) || (userAgreed && aiAgreed);
        if (result?.signature && (result?.accepted || selectedOpt)) {
          result.options = [];
          if (sse) {
            sse.send('step', { step: 5, totalSteps: 5, icon: '🛡️', text: 'Đang đóng dấu xác thực bảo mật & hoàn tất phản hồi...', pct: 100 });
            sse.end('result', result);
            return;
          }
          return res.status(200).json(result);
        }

        if (result?.fromAI) {
          if (result.accepted) {
            let cleanPrice = parseInt(result.newPrice !== undefined ? result.newPrice : reward.price, 10);
            let cleanMinutes = parseInt(result.newTargetMinutes !== undefined ? result.newTargetMinutes : (reward.targetMinutes || 0), 10);
            let cleanTier = result.newTier || reward.tier || 'common';
            let cleanName = result.newName || reward.name;
            let cleanDesc = result.newDescription !== undefined ? result.newDescription : (reward.description || '');

            cleanPrice = Math.max(1, Math.min(500, isNaN(cleanPrice) ? reward.price : cleanPrice));
            cleanMinutes = Math.max(0, Math.min(360, isNaN(cleanMinutes) ? (reward.targetMinutes || 0) : cleanMinutes));

            result.newName = cleanName;
            result.newDescription = cleanDesc;
            result.newPrice = cleanPrice;
            result.newTier = cleanTier;
            result.newTargetMinutes = cleanMinutes;
            result.signature = signReward(cleanName, cleanPrice, cleanTier, cleanMinutes);
          }
          if (!Array.isArray(result.options) || result.options.length === 0) {
            result.options = parseDebateOptionsFromText(result.reply, 'reward');
          }
          if (!Array.isArray(result.options) || result.options.length === 0) {
            result.options = getFallbackNegotiationOptions('reward', reward);
          }
          if (sse) {
            sse.send('step', { step: 5, totalSteps: 5, icon: '🛡️', text: 'Đang đóng dấu xác thực bảo mật & hoàn tất phản hồi...', pct: 100 });
            sse.end('result', result);
            return;
          }
          return res.status(200).json(result);
        }

        const isAccepted = Boolean(result.accepted) || Boolean(selectedOpt) || (userAgreed && aiAgreed);
        if (isAccepted) {
          result.accepted = true;
          let extractedPrice: number | undefined;
          let extractedMins: number | undefined;

          if (selectedOpt) {
            if (selectedOpt.newPrice !== undefined) extractedPrice = parseInt(selectedOpt.newPrice, 10);
            if (selectedOpt.newTargetMinutes !== undefined) extractedMins = parseInt(selectedOpt.newTargetMinutes, 10);
            if (selectedOpt.newTier) result.newTier = selectedOpt.newTier;
            if (selectedOpt.newName) result.newName = selectedOpt.newName;
          }

          if (extractedPrice === undefined) {
            if (result.newPrice !== undefined) extractedPrice = parseInt(result.newPrice, 10);
            else if (result.price !== undefined) extractedPrice = parseInt(result.price, 10);
          }

          if (extractedMins === undefined) {
            if (result.newTargetMinutes !== undefined) extractedMins = parseInt(result.newTargetMinutes, 10);
            else if (result.targetMinutes !== undefined) extractedMins = parseInt(result.targetMinutes, 10);
          }

          if (extractedPrice === undefined && result.reply) {
            const priceMatch = result.reply.match(/(?:mức\s*giá|giá(?:\s*vàng)?|giảm\s*(?:còn|xuống)|còn)[:\s]*(\d+)\s*vàng/i) || result.reply.match(/(\d+)\s*vàng/i);
            if (priceMatch) extractedPrice = parseInt(priceMatch[1], 10);
          }

          const durationFromName = extractDurationFromText(result.newName || selectedOpt?.newName || reward.name);
          if (extractedMins === undefined && durationFromName > 0) {
            extractedMins = durationFromName;
          } else if (extractedMins === undefined && result.reply) {
            const timeMatch = result.reply.match(/(?:thời\s*(?:gian|lượng)|rút\s*ngắn\s*(?:thời\s*gian\s*)?(?:xuống|còn)|xuống|còn)[:\s]*(\d+)\s*phút/i);
            if (timeMatch) extractedMins = parseInt(timeMatch[1], 10);
          }

          const rawPrice = (extractedPrice !== undefined && !isNaN(extractedPrice)) ? extractedPrice : reward.price;
          const rawMins = (extractedMins !== undefined && !isNaN(extractedMins)) ? extractedMins : (reward.targetMinutes !== undefined ? reward.targetMinutes : 0);
          const rawTier = result.newTier || selectedOpt?.newTier || result.tier || reward.tier;
          const rawName = result.newName || selectedOpt?.newName || result.name || reward.name;
          const rawDesc = result.newDescription !== undefined ? result.newDescription : (result.description !== undefined ? result.description : (reward.description || ''));
          const rawCat = result.newCategory || result.category || reward.category;

          const rawDebate = {
            name: rawName,
            description: rawDesc,
            category: rawCat,
            price: rawPrice,
            tier: rawTier,
            targetMinutes: rawMins,
            isNegotiated: true
          };
          const clean = sanitizeEvaluatedReward(rawDebate, reward.name, reward.description);
          result.newName = clean.name;
          result.newDescription = clean.description;
          result.newPrice = clean.price;
          result.newTier = clean.tier;
          result.newTargetMinutes = clean.targetMinutes;
          result.signature = signReward(clean.name, clean.price, clean.tier, clean.targetMinutes);
        }

        if (isAcceptedReward) {
          result.options = [];
        } else {
          if (!Array.isArray(result.options) || result.options.length === 0) {
            result.options = parseDebateOptionsFromText(result.reply, 'reward');
          }
          if (!Array.isArray(result.options) || result.options.length === 0) {
            result.options = getFallbackNegotiationOptions('reward', reward);
          }
        }
        if (sse) {
          sse.send('step', { step: 5, totalSteps: 5, icon: '🛡️', text: 'Đang ký duyệt thông số và hoàn tất phản hồi...', pct: 100 });
          sse.end('result', result);
          return;
        }
        return res.status(200).json(result);
      }

      // ==========================================
      // 5. SUGGEST QUESTS (Gợi ý nhiệm vụ)
      // ==========================================
      case 'suggest_quests': {
        const existingQuests = Array.isArray(payload?.existingQuests) ? payload.existingQuests : [];
        const excludeTitles = Array.isArray(payload?.excludeTitles) ? payload.excludeTitles : [];
        const refreshCount = parseInt(payload?.refreshCount, 10) || 0;
        const userCoins = parseInt(payload?.userCoins, 10) || 0;
        const userLevel = parseInt(payload?.userLevel, 10) || 1;

        let suggestions: any = null;
        const questAngles = [
          'CHỦ ĐỀ LẦN NÀY: Vận động thể chất, sức khỏe cơ thể & nạp năng lượng (Tập hít đất/squat tại chỗ, chạy bộ, giãn cơ yoga vai gáy, bài tập thở sâu)',
          'CHỦ ĐỀ LẦN NÀY: Kỹ năng mới, tư duy & học tập thực hành (Học 15 từ vựng ngoại ngữ mới, giải bài tập khó / thử thách coding, xem 1 video TED/kiến thức)',
          'CHỦ ĐỀ LẦN NÀY: Năng suất tập trung cao & Giải quyết việc khó tồn đọng (Xử lý dứt điểm 1 việc khó nhất đang trì hoãn - Eat That Frog, dọn sạch Inbox Zero, tối ưu góc làm việc)',
          'CHỦ ĐỀ LẦN NÀY: Sáng tạo nghệ thuật, thói quen tích cực & đời sống (Viết nhật ký ngắn 200 chữ, phác thảo thiết kế, luyện nhạc cụ, tự nấu bữa ăn lành mạnh)'
        ];
        const currentAngle = questAngles[refreshCount % questAngles.length];

        try {
          const systemPrompt = `Bạn là Cố Vấn Năng Suất & Trợ Lý RPG của LevelUp.
Nhiệm vụ: Gợi ý 3 nhiệm vụ mới ĐỘC ĐÁO, THIẾT THỰC, VỪA SỨC và HOÀN TOÀN MỚI LẠ.
${currentAngle}

Trả về JSON:
{
  "suggestions": [
    {
      "title": "Tên nhiệm vụ ngắn gọn, cụ thể",
      "description": "Mô tả mục tiêu 1 câu",
      "type": "focus" | "bounty",
      "targetMinutes": 20,
      "rewardCoins": 8,
      "isRepeatable": false,
      "icon": "🏃",
      "reason": "Lý do gợi ý"
    }
  ]
}`;

          const questSummary = existingQuests.slice(0, 8).map(q => `- ${q.title} (${q.type === 'focus' ? (q.targetMinutes || 25) + 'p' : 'Bounty'})`).join('\n') || '(Chưa có nhiệm vụ)';
          const userPrompt = `Dữ liệu người chơi:
Cấp độ: LV.${userLevel}, Vàng: ${userCoins} Vàng.
Lần đổi gợi ý thứ: ${refreshCount + 1}.
Nhiệm vụ đang có:
${questSummary}

Hãy gợi ý 3 nhiệm vụ mới mẻ, hấp dẫn bám sát chủ đề trên!`;

          const aiRes = await callAI(systemPrompt, userPrompt, { role: 'worker', thinking: false, temperature: 0.85 });
          if (Array.isArray(aiRes?.suggestions) && aiRes.suggestions.length > 0) {
            suggestions = aiRes.suggestions;
          }
        } catch (err: any) {
          console.warn('AI suggest_quests call failed, falling back to deterministic:', err?.message);
        }

        if (!suggestions || suggestions.length === 0) {
          suggestions = getDeterministicQuestSuggestions(existingQuests, userCoins, userLevel, excludeTitles, refreshCount);
        }

        const cleanedSuggestions = sanitizeQuestSuggestions(suggestions, existingQuests);
        return res.status(200).json({ suggestions: cleanedSuggestions });
      }

      // ==========================================
      // 6. SUGGEST REWARDS (Gợi ý phần thưởng)
      // ==========================================
      case 'suggest_rewards': {
        const existingRewards = Array.isArray(payload?.existingRewards) ? payload.existingRewards : [];
        const activeQuests = Array.isArray(payload?.activeQuests) ? payload.activeQuests : [];
        const excludeNames = Array.isArray(payload?.excludeNames) ? payload.excludeNames : [];
        const refreshCount = parseInt(payload?.refreshCount, 10) || 0;
        const userCoins = parseInt(payload?.userCoins, 10) || 0;

        let suggestions: any = null;
        const rewardAngles = [
          'CHỦ ĐỀ LẦN NÀY: Ẩm thực & Thức uống thơm ngon (Thưởng thức 1 ly cà phê/trà thảo mộc, ly trà sữa mát lạnh, món bánh ngọt khoái khẩu, bữa tối thịnh soạn)',
          'CHỦ ĐỀ LẦN NÀY: Giải trí kỹ thuật số & Gaming (30 phút chơi tựa game yêu thích, xem 1 tập anime/series mới, 20 phút video giải trí Youtube)',
          'CHỦ ĐỀ LẦN NÀY: Thư giãn thể chất & Tự chăm sóc (Tắm nước nóng thư giãn, chợp mắt nghỉ trưa 20 phút phục hồi năng lượng, đi dạo hóng mát ngoài trời không điện thoại, nghe album nhạc không lời)',
          'CHỦ ĐỀ LẦN NÀY: Trải nghiệm mới & Mua sắm tự thưởng (Mua một cuốn sách mới, buổi cà phê tán gẫu cùng bạn bè, 1 giờ tự do đọc truyện tranh thỏa thích)'
        ];
        const currentRewardAngle = rewardAngles[refreshCount % rewardAngles.length];

        try {
          const systemPrompt = `Bạn là Trợ Lý Định Giá Cửa Hàng & Cố Vấn Tự Thưởng của LevelUp.
Nhiệm vụ: Gợi ý 3 phần thưởng mới LÀNH MẠNH, THIẾT THỰC, ĐÚNG NGUYÊN TẮC KỶ LUẬT (nỗ lực tương xứng, không dopamine giá rẻ).
${currentRewardAngle}

Trả về JSON:
{
  "suggestions": [
    {
      "name": "Tên phần thưởng",
      "description": "Mô tả",
      "price": 30,
      "targetMinutes": 20,
      "tier": "common" | "rare" | "epic",
      "icon": "☕",
      "reason": "Lý do gợi ý"
    }
  ]
}`;

          const userPrompt = `Dữ liệu người chơi: Vàng hiện có: ${userCoins} Vàng.
Số phần thưởng hiện có trong Cửa Hàng: ${existingRewards.length}.
Nhiệm vụ đang làm: ${activeQuests.slice(0, 5).map(q => q.title).join(', ') || 'Chưa có'}.
Lần đổi gợi ý thứ: ${refreshCount + 1}.

Hãy gợi ý 3 món phần thưởng hấp dẫn, phù hợp với chủ đề trên!`;

          const aiRes = await callAI(systemPrompt, userPrompt, { role: 'worker', thinking: false, temperature: 0.85 });
          if (Array.isArray(aiRes?.suggestions) && aiRes.suggestions.length > 0) {
            suggestions = aiRes.suggestions;
          }
        } catch (err: any) {
          console.warn('AI suggest_rewards call failed, falling back to deterministic:', err?.message);
        }

        if (!suggestions || suggestions.length === 0) {
          suggestions = getDeterministicRewardSuggestions(existingRewards, activeQuests, userCoins, excludeNames, refreshCount);
        }

        const cleanedSuggestions = sanitizeRewardSuggestions(suggestions, existingRewards);
        return res.status(200).json({ suggestions: cleanedSuggestions });
      }

      // ==========================================
      // 7. VERIFY PROOF (Giám định bằng chứng)
      // ==========================================
      case 'verify_proof': {
        const title = clampStr(payload?.title, 150);
        const description = clampStr(payload?.description, 1000);
        const userNote = clampStr(payload?.userNote, 500);
        const imageBase64 = typeof payload?.imageBase64 === 'string' ? payload.imageBase64.trim() : '';
        const rawWorkContent = typeof payload?.workContent === 'string' ? payload.workContent.trim() : '';
        const workContent = clampStr(rawWorkContent || userNote, 2000);

        let proofType = payload?.proofType;
        if (proofType !== 'both' && proofType !== 'text' && proofType !== 'photo') {
          if (imageBase64 && workContent && workContent.length >= 10) {
            proofType = 'both';
          } else if (imageBase64) {
            proofType = 'photo';
          } else {
            proofType = 'text';
          }
        }

        if (!title) {
          return res.status(400).json({ error: 'Quest title is required.' });
        }

        if (proofType === 'both') {
          if (!imageBase64) {
            return res.status(400).json({ error: 'Hình thức bằng chứng kết hợp yêu cầu có ảnh chụp bằng chứng thực tế.' });
          }
          if (!workContent || workContent.length < 5) {
            return res.status(400).json({ error: 'Hình thức bằng chứng kết hợp yêu cầu có báo cáo chi tiết nội dung những gì bạn đã làm.' });
          }
        } else if (proofType === 'photo') {
          if (!imageBase64) {
            return res.status(400).json({ error: 'Cần có ảnh chụp bằng chứng để AI thẩm định.' });
          }
        } else {
          if (!workContent || workContent.length < 5) {
            return res.status(400).json({ error: 'Vui lòng nhập chi tiết nội dung những gì bạn đã làm để AI thẩm định.' });
          }
        }

        if (proofType === 'text' || proofType === 'both') {
          const heuristic = evaluateTextProofHeuristics(title, workContent);
          if (heuristic && heuristic.approved === false) {
            return res.status(200).json({
              approved: false,
              feedback: heuristic.feedback,
              proofImageUrl: null
            });
          }
        }

        let systemPrompt: string;
        let userPrompt: string;

        if (proofType === 'both') {
          systemPrompt = `Bạn là Trọng Tài Giám Định Toàn Diện (Hình Ảnh & Báo Cáo Công Việc) của LevelUp.
Nhiệm vụ: Thẩm định KẾT HỢP cả ảnh chụp thực tế và nội dung báo cáo kết quả công việc để xác định tính trung thực.

Trả về JSON:
{
  "approved": boolean,
  "feedback": "Lời nhận xét và khích lệ ngắn gọn (1-2 câu, dưới 35 từ)"
}`;
          userPrompt = `Nhiệm vụ: "${title}"\n${description ? `Mô tả: "${description}"\n` : ''}Báo cáo: """${workContent}"""`;
        } else if (proofType === 'text') {
          systemPrompt = `Bạn là Trọng Tài Giám Định Báo Cáo Công Việc của LevelUp.
Nhiệm vụ: Thẩm định tính logic, đầy đủ và công sức thể hiện qua báo cáo văn bản.

Trả về JSON:
{
  "approved": boolean,
  "feedback": "Lời nhận xét và khích lệ ngắn gọn (1-2 câu, dưới 35 từ)"
}`;
          userPrompt = `Nhiệm vụ: "${title}"\n${description ? `Mô tả: "${description}"\n` : ''}Báo cáo: """${workContent}"""`;
        } else {
          systemPrompt = `Bạn là Trọng Tài Giám Định Hình Ảnh & Khích Lệ Kỷ Luật của LevelUp.
Nhiệm vụ: Xem ảnh chụp thực tế của người dùng và xác định xem ảnh có liên quan hợp lý đến kết quả hoặc quá trình làm nhiệm vụ hay không.

Trả về JSON:
{
  "approved": boolean,
  "feedback": "Lời nhận xét và khích lệ ngắn gọn (1-2 câu, dưới 35 từ)"
}`;
          userPrompt = `Nhiệm vụ: "${title}"\n${description ? `Mô tả: "${description}"\n` : ''}${userNote ? `Ghi chú: "${userNote}"` : ''}`;
        }

        let result: any = null;
        try {
          result = await callAI(systemPrompt, userPrompt, {
            role: 'worker',
            thinking: false,
            temperature: 0.2,
            imageBase64: (proofType === 'photo' || proofType === 'both') ? imageBase64 : null
          });
        } catch (err: any) {
          console.warn('[AI verify_proof] callAI failed/timeout, falling back to graceful appraisal:', err?.message);
        }

        if (!result || typeof result !== 'object') {
          const hasImage = Boolean(imageBase64 && (proofType === 'photo' || proofType === 'both'));
          const hasNote = Boolean(workContent && workContent.trim().length >= 10);
          const approved = hasImage || hasNote;
          result = {
            approved,
            feedback: approved
              ? 'Hệ thống đã ghi nhận bằng chứng hoàn thành nhiệm vụ của bạn. Tiếp tục phát huy nhé!'
              : 'Vui lòng cung cấp thêm hình ảnh hoặc báo cáo chi tiết hơn để hoàn tất nhiệm vụ.'
          };
        }

        const approved = Boolean(result.approved);
        let proofImageUrl: string | null = null;

        if (approved && imageBase64 && (proofType === 'photo' || proofType === 'both')) {
          try {
            proofImageUrl = await uploadProofImage({
              imageBase64,
              questId: payload?.questId || 'quest',
              userId: caller?.sub || (caller as any)?.nickname || 'guest'
            });
          } catch (storageErr) {
            console.error('[AI] Lỗi lưu ảnh bằng chứng lên R2/Supabase:', storageErr);
          }
        }

        const defaultFeedback = approved
          ? 'Bằng chứng hợp lệ! Chúc mừng bạn đã hoàn thành nhiệm vụ.'
          : (proofType === 'both'
            ? 'Bằng chứng kết hợp chưa đạt yêu cầu, bạn vui lòng kiểm tra lại ảnh chụp và nội dung báo cáo nhé.'
            : (proofType === 'text'
              ? 'Nội dung báo cáo chưa đạt yêu cầu, bạn vui lòng nhập lại cụ thể hơn nhé.'
              : 'Ảnh chưa thấy rõ kết quả công việc, bạn vui lòng chụp lại nhé.'));

        return res.status(200).json({
          approved,
          feedback: (result.feedback || defaultFeedback).trim(),
          proofImageUrl
        });
      }

      // ==========================================
      // 8. BANK CONSULT LOAN (Tư vấn khoản vay)
      // ==========================================
      case 'bank_consult_loan':
      case 'bank_credit_appraise': {
        const userProfile = payload?.profile || {};
        const autoDeduct = Math.min(0.80, Math.max(0.20, Number(payload?.autoDeductPercent) || 0.50));
        const requestedAmount = Math.max(0, parseInt(payload?.requestedAmount, 10) || 0);
        const poolState = payload?.poolState || {};
        const macro = analyzeMacroTelemetry(poolState);
        const rates = macro;
        const creditLimit = calculateCreditLimit(userProfile, autoDeduct);
        const userCoins = parseInt(userProfile?.coins, 10) || 0;
        const level = Math.max(1, parseInt(userProfile?.level, 10) || 1);
        const streak = Math.max(0, parseInt(userProfile?.streak, 10) || 0);

        const quests = Array.isArray(payload?.quests) ? payload.quests.slice(0, 8) : [];
        const shopItems = Array.isArray(payload?.shopItems) ? payload.shopItems.slice(0, 6) : [];
        const earningsStats = payload?.earningsStats || {};
        const avgDaily = Math.max(0, parseInt(earningsStats?.avgDailyIncome, 10) || 0);
        const todayEarned = Math.max(0, parseInt(earningsStats?.todayEarned, 10) || 0);

        let aiResult: any = null;
        try {
          const systemPrompt = `Bạn là Trợ Lý Vay Vàng & Cố Vấn Kế Hoạch Tài Chính của LevelUp RPG.
Lãi suất vay hiện tại: ${(rates.borrowRate * 100).toFixed(1)}%/ngày. Hạn mức: ${creditLimit} Vàng.
Dùng từ ngữ đời thường, gần gũi, khích lệ người chơi làm nhiệm vụ trả nợ nhẹ nhàng.

Trả về JSON:
{
  "shouldBorrow": boolean,
  "recommendedAmount": number,
  "recommendedDeductPercent": number,
  "estimatedDaysToRepay": number,
  "estimatedInterest": number,
  "totalEstimatedDebt": number,
  "repaymentPlan": "Kế hoạch trả nợ cụ thể",
  "advice": "Lời khuyên",
  "warning": "Lưu ý",
  "options": [
    {
      "id": 1,
      "label": "Gói vay",
      "argument": "Câu chốt",
      "newAmount": number,
      "newBorrowRate": number,
      "newAutoDeductPercent": number,
      "newCreditLimit": number
    }
  ]
}`;

          const userPrompt = `Người chơi: Level ${level}, Streak ${streak} ngày, Ví: ${userCoins} Vàng, Thu nhập: ~${avgDaily || 15} Vàng/ngày. Dự định vay: ${requestedAmount > 0 ? requestedAmount : 'Chưa rõ'}.`;
          const aiRes = await callAI(systemPrompt, userPrompt, { role: 'worker', thinking: false, temperature: 0.3 });
          aiResult = aiRes;
        } catch (_) {}

        const shouldBorrowDefault = userCoins < 40;
        const safeAmountDefault = Math.min(creditLimit, Math.max(15, Math.floor((avgDaily || 20) * 2)));
        const finalAmount = Math.min(creditLimit, requestedAmount > 0 ? requestedAmount : (aiResult?.recommendedAmount || safeAmountDefault));
        const finalDeduct = typeof aiResult?.recommendedDeductPercent === 'number' ? Math.min(0.8, Math.max(0.3, aiResult.recommendedDeductPercent)) : autoDeduct;

        const estDays = Math.max(1, parseInt(aiResult?.estimatedDaysToRepay, 10) || Math.min(6, Math.max(2, Math.ceil(finalAmount / Math.max(5, (avgDaily || 15) * finalDeduct)))));
        const estimatedInterest = Math.max(0, parseInt(aiResult?.estimatedInterest, 10) || Math.ceil(finalAmount * rates.borrowRate * estDays));
        const totalEstimatedDebt = Math.max(finalAmount, parseInt(aiResult?.totalEstimatedDebt, 10) || (finalAmount + estimatedInterest));

        let fallbackPlan = '';
        if (quests.length > 0) {
          const q1 = quests[0];
          const coinsNeeded = Math.ceil(totalEstimatedDebt / finalDeduct);
          const timesNeeded = Math.max(1, Math.ceil(coinsNeeded / Math.max(1, q1.rewardCoins || 10)));
          fallbackPlan = `Bạn chỉ cần hoàn thành nhiệm vụ "${q1.title}" khoảng ${timesNeeded} lần trong ${estDays} ngày (thu về ~${coinsNeeded} Vàng, trích ra trả ~${totalEstimatedDebt} Vàng gồm ${finalAmount} Vàng gốc + ${estimatedInterest} Vàng tiền phí lãi) là sạch nợ nhẹ nhàng!`;
        } else {
          fallbackPlan = `Khoản vay ${finalAmount} Vàng dự kiến phát sinh thêm khoảng ${estimatedInterest} Vàng tiền phí lãi trong ${estDays} ngày (tổng nợ ~${totalEstimatedDebt} Vàng). Bạn hãy thêm 1-2 nhiệm vụ để làm đều đặn trong ${estDays} ngày, hệ thống sẽ tự động trích thưởng trả hết sạch nhé!`;
        }

        const advice = aiResult?.advice || (shouldBorrowDefault
          ? `Bạn đang có chuỗi chăm chỉ ${streak} ngày và kiếm được khoảng ${avgDaily || 15} Vàng/ngày. Vay ${finalAmount} Vàng là mức vừa sức giúp bạn đổi quà sớm mà không lo áp lực!`
          : `Bạn đang có sẵn ${userCoins} Vàng trong ví, đủ để đổi nhiều món quà nhỏ mà không cần vay mượn. Nếu cần món lớn hơn thì hãy vay một khoản nhỏ nhé!`);

        const repaymentPlan = aiResult?.repaymentPlan || fallbackPlan;
        const warning = aiResult?.warning || 'Hãy nhớ trả nợ trong vòng 7 ngày để tránh bị tạm khóa đổi quà nhé!';
        const shouldBorrow = aiResult?.shouldBorrow !== undefined ? parseBool(aiResult.shouldBorrow, shouldBorrowDefault) : shouldBorrowDefault;

        let options = Array.isArray(aiResult?.options) && aiResult.options.length > 0 ? aiResult.options : [];
        if (options.length === 0) {
          const opt1Amt = Math.max(15, Math.floor(finalAmount * 0.7));
          const opt2Amt = Math.min(creditLimit, Math.max(finalAmount, Math.floor(finalAmount * 1.3)));
          options = [
            {
              id: 1,
              label: `Gói an toàn: Vay ${opt1Amt} Vàng (Trích 50%)`,
              argument: `Mình chọn gói an toàn vay ${opt1Amt} Vàng với tỷ lệ trích 50%`,
              newAmount: opt1Amt,
              newBorrowRate: rates.borrowRate,
              newAutoDeductPercent: 0.50,
              newCreditLimit: creditLimit
            },
            {
              id: 2,
              label: `Gói tăng tốc: Vay ${opt2Amt} Vàng (Trích 70%)`,
              argument: `Mình chọn gói tăng tốc vay ${opt2Amt} Vàng với tỷ lệ trích 70%`,
              newAmount: opt2Amt,
              newBorrowRate: rates.borrowRate,
              newAutoDeductPercent: 0.70,
              newCreditLimit: creditLimit
            }
          ];
        }

        return res.status(200).json({
          shouldBorrow,
          creditLimit,
          recommendedAmount: finalAmount,
          borrowRate: rates.borrowRate,
          autoDeductPercent: finalDeduct,
          estimatedDaysToRepay: estDays,
          estimatedInterest,
          totalEstimatedDebt,
          repaymentPlan,
          advice,
          warning,
          options
        });
      }

      // ==========================================
      // 9. BANK DEBATE LOAN (Thương lượng khoản vay)
      // ==========================================
      case 'bank_debate_loan':
      case 'debate_loan': {
        const loan = payload?.loan || {};
        const argument = clampStr(payload?.argument, 1000);
        const history = Array.isArray(payload?.history) ? payload.history.slice(-6) : [];
        const isStream = Boolean(payload?.stream) || req.headers?.accept === 'text/event-stream';
        const selectedOpt = payload?.selectedOption || null;

        if (!argument) {
          return res.status(400).json({ error: 'Nội dung đề xuất thương lượng không được để trống.' });
        }

        const sse = isStream ? (res?.sse || createSSEStream(res)) : null;
        const onEvent = sse ? (ev: string, data: any) => sse.send(ev, data) : null;

        let result: any = null;
        try {
          result = await runNegotiationAgent({
            domain: 'loan',
            caller,
            redis,
            targetEntity: loan,
            selectedOption: selectedOpt,
            userPrompt: argument,
            userArgument: argument,
            tools: [TOOL_GET_MY_USER_DATA, TOOL_UPDATE_LOAN_TERMS, TOOL_SUGGEST_NEGOTIATION_OPTIONS],
            onEvent
          });
        } catch (_) {}

        if (result && typeof result.reply === 'string' && (result.reply.trim().startsWith('{') || result.reply.trim().startsWith('```json'))) {
          const parsed = parseAIJsonContent(result.reply);
          if (parsed && typeof parsed.reply === 'string') {
            result.reply = parsed.reply;
            if ((!result.options || result.options.length === 0) && Array.isArray(parsed.options)) {
              result.options = normalizeDebateOptions(parsed.options, 'loan');
            }
          }
        }

        if (!result) {
          const poolState = redis ? await getGlobalBankState(redis) : {};
          const macro = analyzeMacroTelemetry(poolState);
          result = runDeterministicLoanDebate(loan, argument, caller?.sub || 'guest', macro, selectedOpt, payload?.profile || {});
        }

        const isAcceptedLoan = Boolean(result?.accepted) || Boolean(selectedOpt);
        if (result?.signature && (result?.accepted || selectedOpt)) {
          result.options = [];
          if (sse) {
            sse.send('step', { step: 5, totalSteps: 5, icon: '🛡️', text: 'Đang ký duyệt hợp đồng khoản vay...', pct: 100 });
            sse.end('result', result);
            return;
          }
          return res.status(200).json(result);
        }

        if (result?.accepted) {
          const cleanAmt = Math.max(10, parseInt(result.newAmount || selectedOpt?.newAmount || loan.amount || 30, 10));
          const cleanRate = Number(result.newBorrowRate || selectedOpt?.newBorrowRate || loan.borrowRate || 0.05);
          const cleanDeduct = Number(result.newAutoDeductPercent || selectedOpt?.newAutoDeductPercent || loan.autoDeductPercent || 0.5);
          const cleanLimit = Math.max(cleanAmt, parseInt(result.newCreditLimit || selectedOpt?.newCreditLimit || loan.creditLimit || 100, 10));

          result.newAmount = cleanAmt;
          result.newBorrowRate = cleanRate;
          result.newAutoDeductPercent = cleanDeduct;
          result.newCreditLimit = cleanLimit;
          result.signature = signLoanOffer(caller?.sub || 'guest', cleanAmt, cleanRate, cleanDeduct, cleanLimit);
          result.options = [];
        } else {
          if (!Array.isArray(result.options) || result.options.length === 0) {
            result.options = parseDebateOptionsFromText(result.reply, 'loan');
          }
          if (!Array.isArray(result.options) || result.options.length === 0) {
            result.options = getFallbackNegotiationOptions('loan', loan);
          }
        }

        if (sse) {
          sse.send('step', { step: 5, totalSteps: 5, icon: '🛡️', text: 'Đang ký duyệt hợp đồng khoản vay...', pct: 100 });
          sse.end('result', result);
          return;
        }
        return res.status(200).json(result);
      }

      // ==========================================
      // 10. BANK MARKET COMMENTARY (Bản tin thị trường)
      // ==========================================
      case 'bank_market_commentary': {
        const poolState = payload?.poolState || {};
        const rates = calculateBankRates(poolState);
        const poolGold = Math.max(0, parseInt(poolState.poolGold, 10) || 0);
        const totalBorrowed = Math.max(0, parseInt(poolState.totalBorrowed, 10) || 0);
        const bailoutDebt = Math.max(0, parseInt(poolState.bailoutDebt, 10) || 0);
        const utilization = rates.utilization;

        let commentary = '';
        try {
          const systemPrompt = `Bạn là Thống Đốc Ngân Hàng AI thân thiện của LevelUp RPG. Viết bản tin tài chính thị trường ngắn gọn (2 câu), gần gũi, vui tươi.`;
          const userPrompt = `Quỹ Vàng: ${poolGold}, Đang cho vay: ${totalBorrowed}, Nợ cứu trợ: ${bailoutDebt}, Lãi gửi: ${(rates.depositRate * 100).toFixed(1)}%/ngày, Lãi vay: ${(rates.borrowRate * 100).toFixed(1)}%/ngày.`;
          const aiRes = await callAI(systemPrompt, userPrompt, { role: 'worker', thinking: false, temperature: 0.4 });
          commentary = aiRes?.commentary || '';
        } catch (_) {}

        if (!commentary) {
          if (bailoutDebt > 0) {
            commentary = `🛡️ Kho Bạc Hệ Thống đang bảo trợ ${bailoutDebt} Vàng để đảm bảo tiền gửi an toàn 100%. Lãi suất gửi tiết kiệm đang ở mức tốt ${(rates.depositRate * 100).toFixed(1)}%/ngày, hãy gửi Vàng để nhận sinh lời mỗi ngày!`;
          } else if (utilization > 0.7) {
            commentary = `🔥 Nhu cầu vay Vàng đang tăng! Ngân Hàng tăng lãi suất tiền gửi lên ${(rates.depositRate * 100).toFixed(1)}%/ngày. Cơ hội tuyệt vời cho các thành viên chăm chỉ gửi tiết kiệm tích lũy tài sản!`;
          } else if (utilization < 0.3) {
            commentary = `🌱 Quỹ Vàng đang rất dồi dào và lãi vay ưu đãi chỉ còn ${(rates.borrowRate * 100).toFixed(1)}%/ngày. Nếu cần chút Vàng đổi quà thư giãn nạp năng lượng, bạn có thể vay nhẹ nhàng và trả dần qua nhiệm vụ!`;
          } else {
            commentary = `⚖️ Thị trường ngân hàng đang vận hành ổn định. Lãi gửi tiết kiệm ${(rates.depositRate * 100).toFixed(1)}%/ngày và lãi vay ${(rates.borrowRate * 100).toFixed(1)}%/ngày.`;
          }
        }

        return res.status(200).json({
          commentary,
          rates,
          poolGold,
          totalBorrowed,
          bailoutDebt
        });
      }

      // ==========================================
      // 11. GUILD COMPANION / AI ASSISTANT
      // ==========================================
      case 'ask_assistant':
      case 'chat_assistant': {
        const message = clampStr(payload?.message || payload?.query || payload?.prompt, 1000);
        const history = Array.isArray(payload?.history) ? payload.history.slice(-10) : [];
        const isStream = Boolean(payload?.stream) || req.headers?.accept === 'text/event-stream';

        if (!message) {
          return res.status(400).json({ error: 'Nội dung câu hỏi không được để trống.' });
        }

        const sse = isStream ? (res?.sse || createSSEStream(res)) : null;
        const onEvent = sse ? (ev: string, data: any) => sse.send(ev, data) : null;

        try {
          const result = await runAssistantAgent({
            message,
            history,
            caller,
            redis,
            draftContext: payload?.draftContext || {},
            onEvent
          });

          if (sse) {
            sse.send('reply_start', {
              thought: result.thought || '',
              workerResults: result.workerResults || [],
              suggestedActions: result.suggestedActions || []
            });

            const fullReply = result.reply || '';
            const streamChunks = fullReply.match(/\S+\s*|\s+/g) || [fullReply];
            for (const chunk of streamChunks) {
              sse.send('chunk', { delta: chunk });
            }

            sse.send('step', { step: 4, totalSteps: 4, icon: '✨', text: 'Model Brain hoàn tất câu trả lời tối ưu!', pct: 100 });
            sse.end('result', result);
            return;
          }

          return res.status(200).json(result);
        } catch (error: any) {
          console.error('runAssistantAgent error:', error);
          if (sse) {
            sse.end('error', { error: error.message || 'Lỗi xử lý trợ lý AI' });
            return;
          }
          throw error;
        }
      }

      default:
        return res.status(400).json({ error: `Unknown action: "${action}"` });
    }
  } catch (err: any) {
    console.error('API /api/ai error:', err);
    const isProd = process.env.NODE_ENV === 'production';
    return res.status(500).json({
      error: 'AI Service Error',
      ...(isProd ? {} : { details: err.message })
    });
  }
}
