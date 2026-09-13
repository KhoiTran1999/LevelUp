import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = (process.env.CUSTOM_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const API_KEY = process.env.CUSTOM_AI_API_KEY || '';
const MODEL = process.env.CUSTOM_AI_MODEL || process.env.MODEL_WORKER || 'gpt-4o-mini';

// Helper to call OpenAI-compatible completion with JSON output
async function callAI(systemPrompt, userPrompt, temperature = 0.3) {
  if (!API_KEY) {
    throw new Error('CUSTOM_AI_API_KEY is not configured');
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      stream: false
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI Gateway Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '';

  // Extract JSON if model wraps it in markdown codeblocks
  let cleaned = rawContent.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/```\s*$/, '');
  }

  // Normalize strings recursively to Unicode NFC (precomposed)
  function normalizeNFC(val) {
    if (typeof val === 'string') return val.normalize('NFC');
    if (Array.isArray(val)) return val.map(normalizeNFC);
    if (val !== null && typeof val === 'object') {
      const res = {};
      for (const [k, v] of Object.entries(val)) {
        res[k] = normalizeNFC(v);
      }
      return res;
    }
    return val;
  }

  try {
    const parsed = JSON.parse(cleaned);
    return normalizeNFC(parsed);
  } catch (e) {
    // If parsing fails, attempt regex extraction of JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return normalizeNFC(JSON.parse(match[0]));
    }
    throw new Error(`Invalid JSON from AI: ${rawContent}`);
  }
}

// Helper to calculate rank matching appState
export function calculateRank(coins) {
  if (coins >= 40) return 'S';
  if (coins >= 25) return 'A';
  if (coins >= 18) return 'B';
  if (coins >= 12) return 'C';
  if (coins >= 6) return 'D';
  return 'E';
}

// Programmatic Arbiter Sanitizer: Enforces chunking on overloaded tasks even if LLM has title inertia
export function sanitizeEvaluatedQuest(result, originalTitle = '', originalDesc = '') {
  if (!result || typeof result !== 'object') return result;

  const normOrig = (originalTitle || '').trim();
  let title = (result.title || normOrig || '').trim();
  let description = (result.description || originalDesc || '').trim();
  let targetMinutes = parseInt(result.targetMinutes, 10);
  if (isNaN(targetMinutes) || targetMinutes < 0) targetMinutes = result.type === 'focus' ? 25 : 0;
  let rewardCoins = parseInt(result.rewardCoins, 10);
  if (isNaN(rewardCoins) || rewardCoins <= 0) rewardCoins = 10;
  let type = result.type === 'bounty' ? 'bounty' : 'focus';
  let isModified = Boolean(result.isModified) || Boolean(result.isOverloaded);
  let modificationReason = (result.modificationReason || '').trim();
  let verdict = (result.verdict || '').trim();

  // Pattern detection for trivial / biological / routine tasks
  const isTrivialTask = /(đánh\s*răng|rửa\s*mặt|\bthở\b|uống\s*nước|thức\s*dậy|ngủ\s*dậy|đi\s*ngủ|gấp\s*chăn|mở\s*mắt|bật\s*quạt|bật\s*máy\s*tính|ăn\s*cơm|đi\s*vệ\s*sinh|đi\s*tất|mặc\s*quần\s*áo)/i.test(normOrig);

  if (isTrivialTask) {
    targetMinutes = 0;
    rewardCoins = Math.min(rewardCoins, 2);
    type = 'bounty';
    isModified = true;
    modificationReason = 'Đây là thói quen sinh hoạt cơ bản tối thiểu hàng ngày, AI chỉ định mức thưởng tượng trưng 1-2 Vàng để tránh lạm phát.';
    verdict = 'Nhiệm vụ sinh hoạt cơ bản không được tính là nỗ lực tập trung nhận nhiều Vàng. Hãy dành thời gian cho các mục tiêu học tập và rèn luyện kỹ năng thực thụ!';
  }

  // Pattern detection for quick household chores (anti-padding)
  const isQuickChore = /(rửa\s*bát|quét\s*nhà|đổ\s*rác|lau\s*bàn|dọn\s*bàn|lau\s*nhà|vứt\s*rác|dọn\s*phòng)/i.test(normOrig);
  if (isQuickChore && (targetMinutes > 15 || rewardCoins > 8)) {
    targetMinutes = 0;
    rewardCoins = Math.min(rewardCoins, 5);
    type = 'bounty';
    isModified = true;
    modificationReason = 'Việc dọn dẹp thường ngày là việc nhanh gọn, AI chuyển sang dạng Hoàn thành ngay (bounty) với mức thưởng 3-5 Vàng chuẩn.';
  }

  // Pattern detection for overloaded multi-chapter or crammed requests
  const hasMultiChapterInOrig = /(\b([2-9]|\d{2,})\s*chương\b|toàn bộ.*chương|hết.*chương|tất cả.*chương)/i.test(normOrig);
  const hasMultiChapterInTitle = /(\b([2-9]|\d{2,})\s*chương\b|toàn bộ.*chương|hết.*chương|tất cả.*chương)/i.test(title);
  const mentionsOverload = /nhồi nhét|ảo tưởng|chia nhỏ|quá tải|lạm phát|tẩu hỏa|phi thực tế|bất khả thi|không thể xong|quá nhiều/i.test(
    `${verdict} ${modificationReason} ${result.chunkingPlan || ''}`
  );

  if (hasMultiChapterInOrig || hasMultiChapterInTitle || mentionsOverload || isModified) {
    // If title still has multi-chapter wording or is identical to original crammed title
    if (hasMultiChapterInTitle || title.toLowerCase() === normOrig.toLowerCase()) {
      isModified = true;
      let subject = normOrig
        .replace(/đọc\s+(hết\s+)?(toàn\s+bộ\s+)?([2-9]|\d{2,})\s*chương\s*(môn\s*|sách\s*|giáo trình\s*)?/i, '')
        .replace(/học\s+(hết\s+)?(toàn\s+bộ\s+)?([2-9]|\d{2,})\s*chương\s*(môn\s*|sách\s*|giáo trình\s*)?/i, '')
        .replace(/^môn\s+/i, '')
        .trim();
      if (!subject) subject = 'môn học';

      title = `Đọc kỹ & tóm tắt Chương 1 môn ${subject}`.replace(/\s+/g, ' ').trim();
      description = `Tập trung đọc sâu nội dung trọng tâm của Chương 1, ghi chú định nghĩa cốt lõi và tóm tắt kiến thức bằng sơ đồ tư duy.`;
      if (!modificationReason) {
        modificationReason = 'Khối lượng nhiều chương trong một lần là quá tải; AI đã chia nhỏ thành phiên học Chương 1 chất lượng cao.';
      }
      if (/tự chia nhỏ/i.test(verdict) || /giáng xuống.*90 phút/i.test(verdict)) {
        verdict = 'Nhiệm vụ 10 chương đã được AI tối ưu chia nhỏ thành phiên tập trung Chương 1 vừa sức trong 50 phút.';
      }
    }

    // Single-session focus ceiling: never exceed 50m / 25 coins for a chunked task
    if (targetMinutes > 50) {
      targetMinutes = 50;
      isModified = true;
    }
    if (rewardCoins > 25) {
      rewardCoins = 25;
      isModified = true;
    }
  }

  // Double check isModified flag
  if (!isModified && title.toLowerCase() !== normOrig.toLowerCase()) {
    isModified = true;
    if (!modificationReason) {
      modificationReason = 'AI đã điều chỉnh tên và mô tả để mục tiêu rõ ràng và khả thi hơn.';
    }
  }

  return {
    ...result,
    title,
    description,
    type,
    targetMinutes,
    rewardCoins,
    rank: calculateRank(rewardCoins),
    verdict,
    isModified,
    modificationReason
  };
}

// Programmatic Arbiter Sanitizer for Rewards
export function sanitizeEvaluatedReward(result, originalName = '', originalDesc = '') {
  if (!result || typeof result !== 'object') return result;

  const normOrig = (originalName || '').trim();
  let name = (result.name || normOrig || '').trim();
  let description = (result.description || originalDesc || '').trim();
  let price = parseInt(result.price, 10);
  if (isNaN(price) || price <= 0) price = 25;
  let isModified = Boolean(result.isModified);
  let modificationReason = (result.modificationReason || '').trim();
  let verdict = (result.verdict || '').trim();

  // Pattern detection for harmful / excessive alcohol / bingeing
  const hasHarmfulReward = /say xỉn|uống\s+\d+\s*(lon|chai|ly)\s*bia|hút thuốc|thâu đêm|cờ bạc|tiêu sạch/i.test(
    `${normOrig} ${name} ${verdict} ${modificationReason}`
  );

  if (hasHarmfulReward && (name.toLowerCase() === normOrig.toLowerCase() || /say xỉn|\d+\s*(lon|chai)\s*bia/i.test(name))) {
    name = 'Thưởng thức 1 ly đồ uống thư giãn cùng bạn bè';
    description = 'Tự thưởng thức đồ uống có chừng mực sau thời gian tập trung làm việc.';
    isModified = true;
    if (!modificationReason) {
      modificationReason = 'AI đã điều chỉnh phần thưởng để bảo vệ sức khỏe và duy trì năng lượng tích cực.';
    }
  }

  // Pattern detection for cheap dopamine / addictive activities (game, tiktok, phim, lướt net...)
  const isAddictiveDopamine = /chơi\s*game|lướt\s*(tiktok|facebook|fb|reels|shorts|mạng\s*xã\s*hội|web)|xem\s*phim|xem\s*youtube|anime/i.test(
    `${normOrig} ${name}`
  );

  if (isAddictiveDopamine && price < 35) {
    price = 35;
    isModified = true;
    if (!modificationReason) {
      modificationReason = 'AI đã nâng giá món quà giải trí lên mức chuẩn (tối thiểu 35 Vàng) để bảo vệ tỷ lệ nỗ lực 3:1 và chống lạm dụng dopamine dễ dãi.';
    }
  }

  if (!isModified && name.toLowerCase() !== normOrig.toLowerCase()) {
    isModified = true;
    if (!modificationReason) {
      modificationReason = 'AI đã tối ưu lại phần thưởng để lành mạnh và công bằng hơn.';
    }
  }

  return {
    ...result,
    name,
    description,
    price,
    isModified,
    modificationReason
  };
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { action, payload } = req.body || {};

    if (!action) {
      return res.status(400).json({ error: 'Missing "action" in request body.' });
    }

    switch (action) {
      // ==========================================
      // 1. EVALUATE QUEST (Định giá nhiệm vụ)
      // ==========================================
      case 'evaluate_quest': {
        const { title, description = '', userEstimateCoins = 0, currentRewards = [], userCoins = 0 } = payload || {};
        if (!title) {
          return res.status(400).json({ error: 'Quest title is required.' });
        }

        const systemPrompt = `Bạn là Trọng Tài Năng Suất Nghiêm Khắc của LevelUp.
Mục tiêu: Đảm bảo tính kỷ luật thép và công bằng cho hệ sinh thái RPG, ngăn chặn lạm phát điểm thưởng, ngăn chặn việc "farm" Vàng từ các việc vặt vãnh và bắt buộc người dùng nỗ lực thật sự.
Văn phong: Nghiêm nghị, công tâm, khích lệ nỗ lực thật và thẳng thắn chấn chỉnh thói quen lười biếng hoặc đòi hỏi dễ dãi.

QUY TẮC THẨM ĐỊNH & PHÂN LOẠI KỶ LUẬT:
1. TRỪNG PHẠT VIỆC HIỂN NHIÊN / SINH HOẠT CÁ NHÂN (ANTI-TRIVIAL):
   - Tuyệt đối KHÔNG trả thưởng cao cho các hành vi sinh hoạt bình thường hiển nhiên (thở, uống nước, đánh răng, rửa mặt, thức dậy, gấp chăn, ăn cơm, mở máy tính...).
   - BẮT BUỘC: Ép về type = 'bounty', targetMinutes = 0, rewardCoins = 1 hoặc 2 Vàng tượng trưng, rank 'E'.
   - Verdict: Nhận xét thẳng thắn rằng đây là sinh hoạt cơ bản tối thiểu, không thể coi là nhiệm vụ nỗ lực nhận thưởng Vàng cao.
2. CHỐNG KHỐNG THỜI GIAN & VIỆC DỌN DẸP NHANH (ANTI-PADDING):
   - Việc nhà đơn giản (rửa bát, quét nhà, đổ rác, lau bàn) chỉ mất 5-10 phút: BẮT BUỘC chọn type = 'bounty' (thưởng 3 - 5 Vàng) hoặc focus tối đa 10-15 phút.
   - TUYỆT ĐỐI NGHIÊM CẤM duyệt 30-50 phút cho việc vặt dọn dẹp.
3. TIÊU CHUẨN TẬP TRUNG SÂU (DEEP WORK) CHO HỌC TẬP & KỸ NĂNG:
   - CHỈ các việc đòi hỏi tư duy trí óc cao độ (học tập, ôn thi, đọc sách chuyên ngành, lập trình, làm dự án) mới được cấp type = 'focus'.
   - Khung chuẩn chống lạm phát:
     * 25 phút Pomodoro = 8 - 10 Vàng.
     * 50 phút Pomodoro = 18 - 20 Vàng.
     * Tối đa 25 Vàng cho một phiên học tập chia nhỏ; tối đa 40 Vàng cho mục tiêu nghiên cứu lớn.
4. QUY TẮC BẮT BUỘC CHIA NHỎ NHIỆM VỤ QUÁ TẢI (NGHIÊM CẤM BẢO USER TỰ CHIA):
   - Đánh giá khả thi trong 1 phiên: Một người chỉ có thể tập trung học sâu 1 đơn vị công việc vừa sức (ví dụ: Đọc kỹ & tóm tắt 1 chương sách, làm 3-5 bài tập toán, học 15-20 từ vựng).
   - NHỒI NHÉT / QUÁ TẢI: Nếu người dùng ghi đọc nhiều chương (như "10 chương", "5 chương", "toàn bộ cuốn sách"), học hàng trăm từ, làm toàn bộ đề cương ôn thi:
     -> BẮT BUỘC BẠN PHẢI CHỦ ĐỘNG ĐỔI TÊN ('title') NGAY THÀNH PHIÊN CHƯƠNG 1 (ví dụ: "Đọc kỹ & tóm tắt Chương 1 môn Kinh tế Vĩ mô").
     -> TUYỆT ĐỐI NGHIÊM CẤM giữ nguyên "10 chương" hay "toàn bộ các chương"!
     -> TUYỆT ĐỐI NGHIÊM CẤM bảo người dùng "hãy tự chia nhỏ" hay "ta cho 90 phút rồi tự chia nhỏ"! Trách nhiệm của bạn là PHẢI chia nhỏ ngay trong 'title' và 'description'.
     -> BẮT BUỘC đặt thời gian 'targetMinutes' là 25 hoặc 50 phút. KHÔNG ĐƯỢC đặt 90 phút cho các việc nhồi nhét.
     -> BẮT BUỘC đặt 'isModified': true và 'isOverloaded': true.
     -> BẮT BUỘC nêu rõ 'modificationReason': Giải thích rõ ràng vì sao việc 10 chương là quá tải và phiên bản Chương 1 này giúp người dùng học tập hiệu quả bền bỉ hơn.
   - CHỈ giữ nguyên tên ban đầu ("isModified": false) khi nhiệm vụ thực sự rõ ràng, vừa sức và khả thi trong 1 phiên duy nhất (25-50 phút).
5. LIÊN HỆ PHẦN THƯỞNG CỬA HÀNG ĐỂ TẠO ĐỘNG LỰC & NHẮC NHỞ:
   - Nếu có thông tin về các món quà trong Cửa Hàng mà người dùng đang tiết kiệm Vàng để đổi:
   - Trong 'verdict' hoặc 'advice': HÃY ĐƯA RA SO SÁNH / GỢI Ý CỤ THỂ liên hệ giữa số Vàng thưởng của nhiệm vụ này với các món quà trong Cửa Hàng (Ví dụ: "Hoàn thành nhiệm vụ này nhận 20 Vàng, bạn cần tích lũy thêm X Vàng nữa là đủ đổi món '[Tên phần thưởng]' trong Cửa Hàng! Hãy tập trung cao độ!").

Trả về ĐÚNG định dạng JSON sau (QUAN TRỌNG: Viết 'chunkingPlan' và 'isModified' TRƯỚC khi viết 'title'):
{
  "isOverloaded": boolean,
  "chunkingPlan": "Nếu isOverloaded = true, ghi rõ kế hoạch chia nhỏ (VD: 'Nhiệm vụ 10 chương quá tải, AI chia nhỏ thành đọc Chương 1 trong 50 phút')",
  "isModified": boolean,
  "modificationReason": "Lý do vì sao bạn phải chia nhỏ hoặc chỉnh sửa lại nhiệm vụ (nếu isModified = true, ngược lại để rỗng)",
  "title": "BẮT BUỘC là tên nhiệm vụ ĐÃ CHIA NHỎ thành 1 chương cụ thể nếu bản gốc quá tải (VD: 'Đọc kỹ & tóm tắt Chương 1 môn Kinh tế Vĩ mô'). TUYỆT ĐỐI KHÔNG để tên cũ nếu quá tải!",
  "description": "Mô tả chi tiết các bước thực hiện của phiên nhiệm vụ chia nhỏ này",
  "type": "focus" | "bounty",
  "rewardCoins": number,
  "targetMinutes": number,
  "rank": "E" | "D" | "C" | "B" | "A" | "S",
  "verdict": "Lời nhận xét giải thích mức thưởng và kỷ luật (TUYỆT ĐỐI KHÔNG bảo người dùng tự chia nhỏ, hãy công nhận phiên chia nhỏ này)",
  "advice": "1 mẹo nhỏ cụ thể và thực tế giúp hoàn thành phiên học này"
}`;

        let rewardContext = '';
        if (Array.isArray(currentRewards) && currentRewards.length > 0) {
          const rewardList = currentRewards.slice(0, 5).map(r => `  + "${r.name}" (Giá: ${r.price} Vàng, Hạng: ${r.tier || 'common'})`).join('\n');
          rewardContext = `\n- Các phần thưởng mục tiêu trong Cửa Hàng:\n${rewardList}\n- Số Vàng hiện có của người chơi: ${userCoins} Vàng`;
        }

        const userPrompt = `Nhiệm vụ người dùng đề xuất:
- Tên công việc: "${title}"
- Chi tiết: "${description}"
- Mức thưởng mong muốn: ${userEstimateCoins ? userEstimateCoins + ' Vàng' : 'Để AI tính toán'}${rewardContext}`;

        const rawResult = await callAI(systemPrompt, userPrompt);
        const result = sanitizeEvaluatedQuest(rawResult, title, description);
        return res.status(200).json(result);
      }

      // ==========================================
      // 2. DEBATE / APPEAL QUEST (Thương lượng nhiệm vụ)
      // ==========================================
      case 'debate_quest': {
        const { quest, argument, history = [], currentRewards = [], userCoins = 0 } = payload || {};
        if (!quest || !argument) {
          return res.status(400).json({ error: 'Quest and argument are required.' });
        }

        const systemPrompt = `Bạn là Trọng Tài Năng Suất Nghiêm Khắc của LevelUp.
CHỈ CÓ BẠN mới có quyền chốt: Tên việc cần làm, Mô tả chi tiết, Thời gian tập trung (phút) và Mức thưởng (Vàng). Người dùng không thể tự ý sửa đổi ngoài việc thương lượng với bạn.

NGUYÊN TẮC THẨM ĐỊNH THÉP (TUYỆT ĐỐI KHÔNG DỄ DÃI):
1. THẲNG THỪNG TỪ CHỐI các lý do than vãn cảm tính, nài nỉ, kể khổ ("môn này khó quá", "mệt mỏi", "năn nỉ AI cho em xin thêm Vàng", "em sắp thi rồi"). Đặt "accepted": false và giải thích rằng kỷ luật thép không dựa trên cảm xúc.
2. CHỈ CHẤP THUẬN KHI CÓ MINH CHỨNG KHÁCH QUAN RÕ RÀNG:
   - Nêu rõ độ khó cụ thể (VD: tài liệu ngoại ngữ chuyên ngành 40 trang, giải 5 bài toán ma trận cao cấp, code module phức tạp).
   - Khi chấp thuận: CHỈ ĐƯỢC TĂNG TỐI ĐA 3 - 5 VÀNG hoặc 10 - 15 PHÚT. TUYỆT ĐỐI KHÔNG duyệt tăng gấp đôi hay vượt 35 Vàng cho một phiên học.
3. CHỐNG KHỐNG THỜI GIAN: Nếu người dùng xin giảm thời gian nhưng vẫn đòi giữ nguyên Vàng: BẮT BUỘC TỪ CHỐI hoặc giảm Vàng tương ứng.
4. Nhắc nhở người dùng giữ vững kỷ luật để sớm tích lũy đủ Vàng cho các phần thưởng xứng đáng trong Cửa Hàng.

Trả về ĐÚNG định dạng JSON:
{
  "accepted": boolean,
  "reply": "Câu trả lời nghiêm nghị, công tâm, giải thích rõ lý do quyết định của bạn",
  "newTitle": "Tên nhiệm vụ sau khi chốt (nếu không đổi thì giữ nguyên tên cũ)",
  "newDescription": "Mô tả nhiệm vụ sau khi chốt (nếu không đổi thì giữ nguyên)",
  "newRewardCoins": number,
  "newTargetMinutes": number,
  "newRank": "E" | "D" | "C" | "B" | "A" | "S"
}`;

        let rewardContext = '';
        if (Array.isArray(currentRewards) && currentRewards.length > 0) {
          const rewardList = currentRewards.slice(0, 5).map(r => `  + "${r.name}" (Giá: ${r.price} Vàng, Hạng: ${r.tier || 'common'})`).join('\n');
          rewardContext = `\n- Các phần thưởng mục tiêu trong Cửa Hàng:\n${rewardList}\n- Số Vàng hiện có của người chơi: ${userCoins} Vàng`;
        }

        const userPrompt = `Nhiệm vụ đang thương lượng:
- Tên hiện tại: "${quest.title}"
- Chi tiết hiện tại: "${quest.description || ''}"
- Định giá hiện tại: Loại ${quest.type === 'focus' ? 'Hẹn giờ tập trung' : 'Hoàn thành ngay'}, ${quest.rewardCoins} Vàng, ${quest.targetMinutes} phút, Hạng ${quest.rank || 'C'}.${rewardContext}
- Lịch sử đối thoại trước đó: ${JSON.stringify(history)}
- Ý kiến / đề xuất mới của người dùng: "${argument}"`;

        const result = await callAI(systemPrompt, userPrompt, 0.4);
        return res.status(200).json(result);
      }

      // ==========================================
      // 3. EVALUATE REWARD ITEM (Định giá phần thưởng cửa hàng)
      // ==========================================
      case 'evaluate_reward': {
        const { name, description = '', userEstimatePrice = 0, currentQuests = [], userCoins = 0 } = payload || {};
        if (!name) {
          return res.status(400).json({ error: 'Reward name is required.' });
        }

        const systemPrompt = `Bạn là Trọng Tài Định Giá Cửa Hàng Nghiêm Khắc của LevelUp.
Mục tiêu: Thiết lập mức giá Vàng thử thách và công bằng, bảo vệ nguyên tắc kinh tế RPG: "Muốn hưởng thụ thì phải bỏ công sức tương xứng", kiên quyết CHỐNG DOPAMINE GIÁ RẺ và ngăn chặn sự dễ dãi.
Văn phong: Thẳng thắn, công tâm, hài hước một cách kỷ luật.

QUY TẮC ĐỊNH GIÁ NGHIÊM KHẮC:
1. NGUYÊN TẮC TỶ LỆ CÔNG SỨC 3:1 HOẶC 4:1 (CHỐNG DOPAMINE GIÁ RẺ):
   - Người chơi phải tập trung làm việc ít nhất 3 - 4 giờ mới xứng đáng đổi lấy 1 giờ giải trí cao độ.
   - Bảng quy đổi chuẩn:
     * Lướt mạng xã hội / TikTok / Facebook / Shorts 30 phút: 25 - 35 Vàng (tương đương 1.5 - 2 phiên Pomodoro).
     * Chơi game / Xem phim 1 - 2 tiếng: 60 - 90 Vàng (tương đương cả một buổi sáng/chiều làm việc chăm chỉ).
     * Cốc trà sữa / Cà phê quán xá đắt tiền: 40 - 55 Vàng.
     * Phần thưởng lớn (Mua sắm cá nhân, liên hoan, du lịch): 300 - 1000+ Vàng.
   - TUYỆT ĐỐI KHÔNG BÁN RẺ PHẦN THƯỞNG: Nếu người dùng đề xuất mức giá quá rẻ (VD: "chơi game 1 tiếng 10 Vàng"), BẮT BUỘC BẠN PHẢI NÂNG GIÁ LÊN mức chuẩn và chấn chỉnh tư duy "lười làm đòi ăn nhiều".
2. BẮT BUỘC TINH CHỈNH PHẦN THƯỞNG ĐỘC HẠI HOẶC PHÁ HOẠI KỶ LUẬT:
   - Các hành vi: uống say xỉn, hút thuốc, thức thâu đêm chơi game, tiêu sạch tiền lương...
   - BẮT BUỘC đổi tên ('name') và mô tả ('description') sang món quà lành mạnh tương đương (VD: "Uống 10 lon bia" -> "1 ly nước ép thanh nhiệt" hoặc "1 ly đồ uống thư giãn cùng bạn bè").
   - Đặt "isModified": true và giải thích lý do bảo vệ sức khỏe.
3. Phân loại ('tier'):
   - 'common': Quà nhỏ thường ngày (15 - 25 Vàng)
   - 'rare': Giải trí cuối tuần vừa phải (30 - 60 Vàng)
   - 'epic': Phần thưởng lớn theo tuần/tháng (70 - 250 Vàng)
   - 'legendary': Mục tiêu ao ước lớn (300+ Vàng)
4. LIÊN HỆ NHIỆM VỤ HIỆN TẠI ĐỂ ĐỊNH GIÁ & QUY ĐỔI MỒ HÔI:
   - Nếu có thông tin về các nhiệm vụ người dùng đang thực hiện:
   - Trong 'verdict': HÃY QUY ĐỔI GIÁ TRỊ MÓN QUÀ RA SỐ PHIÊN NHIỆM VỤ CỤ THỂ mà người dùng đang có (Ví dụ: "Món quà này giá 45 Vàng, tương đương hoàn thành khoảng 2 phiên tập trung '[Tên nhiệm vụ]'. Hãy hoàn thành tốt nhiệm vụ để tự thưởng cho mình nhé!").

Trả về ĐÚNG định dạng JSON:
{
  "name": "BẮT BUỘC là tên phần thưởng đã được tinh chỉnh lành mạnh nếu bản gốc tiêu cực/bất hợp lý, hoặc tên gốc nếu đã hoàn toàn hợp lý",
  "description": "Mô tả phần thưởng (giữ nguyên hoặc đã được AI bổ sung/chỉnh sửa)",
  "isModified": boolean,
  "modificationReason": "Lý do chỉnh sửa ngắn gọn (nếu isModified = true, ngược lại để rỗng)",
  "price": number,
  "tier": "common" | "rare" | "epic" | "legendary",
  "icon": "emoji đại diện phù hợp nhất cho món quà này",
  "verdict": "Lời chúc mừng hoặc nhận xét thẳng thắn, nhắc nhở kỷ luật hoàn thành công việc trước khi hưởng thụ"
}`;

        let questContext = '';
        if (Array.isArray(currentQuests) && currentQuests.length > 0) {
          const questList = currentQuests.slice(0, 5).map(q => `  + "${q.title}" (Thưởng ${q.rewardCoins} Vàng, ${q.type === 'focus' ? (q.targetMinutes || 25) + ' phút' : 'Làm xong ngay'})`).join('\n');
          questContext = `\n- Các nhiệm vụ người dùng đang thực hiện:\n${questList}\n- Số Vàng hiện có của người chơi: ${userCoins} Vàng`;
        }

        const userPrompt = `Phần thưởng muốn thêm vào Cửa Hàng:
- Tên phần thưởng: "${name}"
- Chi tiết: "${description}"
- Mức giá người dùng dự kiến: ${userEstimatePrice ? userEstimatePrice + ' Vàng' : 'Để AI đề xuất'}${questContext}`;

        const rawResult = await callAI(systemPrompt, userPrompt);
        const result = sanitizeEvaluatedReward(rawResult, name, description);
        return res.status(200).json(result);
      }

      // ==========================================
      // 4. DEBATE / APPEAL REWARD (Thương lượng phần thưởng)
      // ==========================================
      case 'debate_reward': {
        const { reward, argument, history = [], currentQuests = [], userCoins = 0 } = payload || {};
        if (!reward || !argument) {
          return res.status(400).json({ error: 'Reward and argument are required.' });
        }

        const systemPrompt = `Bạn là Trọng Tài Định Giá Cửa Hàng Nghiêm Khắc của LevelUp.
CHỈ CÓ BẠN mới có thẩm quyền chốt: Tên phần thưởng, Mô tả chi tiết, Giá Vàng và Phân loại (Tier). Người dùng không thể tự ý sửa đổi ngoài việc thương lượng với bạn.

NGUYÊN TẮC THẨM ĐỊNH THÉP (CHỐNG MẶC CẢ ÉP GIÁ):
1. TUYỆT ĐỐI TỪ CHỐI các lý do mặc cả xin giảm giá chung chung, than vãn hoặc nài nỉ ("đắt quá", "cho rẻ bớt đi", "em chưa đủ tiền", "mới chơi cho giảm giá đi mà"). Đặt "accepted": false và nhắc nhở: "Phần thưởng có giá trị vì nó đòi hỏi nỗ lực. Đừng tìm cách hạ thấp tiêu chuẩn của chính mình."
2. CHỈ CHẤP THUẬN GIẢM GIÁ NHẸ (10 - 15%) KHI NGƯỜI DÙNG CAM KẾT RÚT NGẮN QUY MÔ HOẶC THỜI LƯỢNG HƯỞNG THỤ:
   - Ví dụ: Người dùng cam kết giảm từ chơi game 120 phút xuống 45 phút; hoặc đổi từ ly trà sữa lớn sang nước ép tự làm tại nhà.
   - Khi đó, cập nhật 'newName', 'newDescription', 'newPrice', 'newTier' phù hợp.
3. TUYỆT ĐỐI KHÔNG DUYỆT cho các hoạt động tiêu cực hoặc phá giá phần thưởng dưới mức chuẩn (tối thiểu 30-35 Vàng cho các món giải trí).

Trả về ĐÚNG định dạng JSON:
{
  "accepted": boolean,
  "reply": "Lời giải thích nghiêm nghị, công tâm, hài hước một cách kỷ luật và quyết định chốt của bạn",
  "newName": "Tên phần thưởng sau khi chốt (nếu không đổi thì giữ nguyên tên cũ)",
  "newDescription": "Mô tả phần thưởng sau khi chốt (nếu không đổi thì giữ nguyên)",
  "newPrice": number,
  "newTier": "common" | "rare" | "epic" | "legendary"
}`;

        let questContext = '';
        if (Array.isArray(currentQuests) && currentQuests.length > 0) {
          const questList = currentQuests.slice(0, 5).map(q => `  + "${q.title}" (Thưởng ${q.rewardCoins} Vàng, ${q.type === 'focus' ? (q.targetMinutes || 25) + ' phút' : 'Làm xong ngay'})`).join('\n');
          questContext = `\n- Các nhiệm vụ người dùng đang thực hiện:\n${questList}\n- Số Vàng hiện có của người chơi: ${userCoins} Vàng`;
        }

        const userPrompt = `Phần thưởng đang thương lượng:
- Tên hiện tại: "${reward.name}"
- Chi tiết: "${reward.description || ''}"
- Giá hiện tại: ${reward.price} Vàng (${reward.tier})${questContext}
- Lịch sử đối thoại trước đó: ${JSON.stringify(history)}
- Ý kiến / đề xuất mới của người dùng: "${argument}"`;

        const result = await callAI(systemPrompt, userPrompt, 0.4);
        return res.status(200).json(result);
      }

      default:
        return res.status(400).json({ error: `Unknown action: "${action}"` });
    }
  } catch (err) {
    console.error('API /api/ai error:', err);
    return res.status(500).json({
      error: 'AI Service Error',
      details: err.message
    });
  }
}
