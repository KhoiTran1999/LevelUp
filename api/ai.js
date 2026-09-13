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

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // If parsing fails, attempt regex extraction of JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Invalid JSON from AI: ${rawContent}`);
  }
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
      // 1. EVALUATE QUEST (Thẩm định nhiệm vụ)
      // ==========================================
      case 'evaluate_quest': {
        const { title, description = '', userEstimateCoins = 0 } = payload || {};
        if (!title) {
          return res.status(400).json({ error: 'Quest title is required.' });
        }

        const systemPrompt = `Bạn là Thẩm phán Tối cao (The Strict Arbiter) của Đấu trường Năng suất LevelUp.
Nhiệm vụ tối thượng của bạn: CHỐNG LẠM PHÁT TIỀN THƯỞNG và CHỐNG TRÌ HOÃN/LƯỜI BIẾNG.
Bạn mang phong cách thẩm phán RPG đanh thép, lạnh lùng nhưng cực kỳ công bằng.

QUY TẮC ĐỊNH GIÁ & PHÂN LOẠI (BẮT BUỘC TUÂN THỦ):
1. Phân loại loại hình ('type'):
   - 'focus' (Theo thời gian/Pomodoro): BẮT BUỘC cho việc học bài, ôn thi, đọc sách, viết lách, lập trình, làm bài tập khó - những việc dễ bị xao nhãng hoặc dễ tick gian lận.
   - 'bounty' (Đầu việc hoàn tất một lần): Chỉ dành cho việc có kết quả vật lý rõ ràng dứt khoát (Dọn phòng, giặt đồ, rửa bát, uống đủ 2L nước, chạy bộ đo km).
2. Định giá tiền vàng ('rewardCoins'):
   - Cơ sở chuẩn: 25 phút tập trung sâu = 10 - 12 Vàng. 50 phút = 22 - 25 Vàng.
   - Việc vặt, lặt vặt (5-10 phút): chỉ 2 - 5 Vàng.
   - Không bao giờ cho quá 50 Vàng cho 1 quest đơn lẻ nếu không phải nỗ lực phi thường cả ngày.
3. Số phút yêu cầu ('targetMinutes'):
   - Nếu type = 'focus': đặt từ 15 đến 90 phút (chuẩn Pomodoro: 25 hoặc 50 phút).
   - Nếu type = 'bounty': đặt 0.
4. Xếp hạng Rank: 'E' (rất dễ), 'D' (dễ), 'C' (vừa), 'B' (khó/tập trung cao), 'A' (rất căng thẳng), 'S' (kỳ tích phi thường).

Trả về ĐÚNG định dạng JSON sau (không thêm văn bản ngoài JSON):
{
  "type": "focus" | "bounty",
  "rewardCoins": number,
  "targetMinutes": number,
  "rank": "E" | "D" | "C" | "B" | "A" | "S",
  "verdict": "Lời phán quyết sắc bén, ngắn gọn (1-2 câu) giải thích tại sao định giá như vậy và cảnh báo người chơi",
  "advice": "1 mẹo nhỏ cụ thể để làm task này hiệu quả"
}`;

        const userPrompt = `Nhiệm vụ người chơi đề xuất:
- Tên việc: "${title}"
- Chi tiết: "${description}"
- Số vàng người chơi muốn nhận: ${userEstimateCoins || 'Tùy thẩm phán quyết định'}`;

        const result = await callAI(systemPrompt, userPrompt);
        return res.status(200).json(result);
      }

      // ==========================================
      // 2. DEBATE / APPEAL QUEST (Kháng cáo phán quyết)
      // ==========================================
      case 'debate_quest': {
        const { quest, argument, history = [] } = payload || {};
        if (!quest || !argument) {
          return res.status(400).json({ error: 'Quest and argument are required.' });
        }

        const systemPrompt = `Bạn là Thẩm phán Tối cao của Đấu trường LevelUp đang xét xử phiên kháng cáo tiền thưởng.
Bạn cực kỳ hoài nghi lý do lười biếng. Tuy nhiên, nếu người chơi đưa ra lý do có cơ sở (ví dụ: khối lượng kiến thức quá lớn, tài liệu tiếng nước ngoài phức tạp, phát sinh yêu cầu đột xuất), bạn có thể NHƯỢNG BỘ tăng nhẹ (tối đa +15% đến +30% vàng hoặc gia giảm thời gian).
Nếu người chơi lý sự cùn, than thở vô bổ, hãy từ chối thẳng thừng và giữ nguyên.

Trả về ĐÚNG định dạng JSON:
{
  "accepted": boolean,
  "reply": "Câu trả lời của Thẩm phán với phong thái nghiêm nghị, thẳng thắn",
  "newRewardCoins": number,
  "newTargetMinutes": number
}`;

        const userPrompt = `Nhiệm vụ đang tranh cãi:
- Tên: "${quest.title}"
- Phán quyết trước: Loại ${quest.type}, ${quest.rewardCoins} Vàng, ${quest.targetMinutes} phút.
- Lịch sử đối thoại trước đó: ${JSON.stringify(history)}
- Lời kháng cáo mới của người chơi: "${argument}"`;

        const result = await callAI(systemPrompt, userPrompt, 0.4);
        return res.status(200).json(result);
      }

      // ==========================================
      // 3. EVALUATE REWARD ITEM (Định giá vật phẩm cửa hàng)
      // ==========================================
      case 'evaluate_reward': {
        const { name, description = '', userEstimatePrice = 0 } = payload || {};
        if (!name) {
          return res.status(400).json({ error: 'Reward name is required.' });
        }

        const systemPrompt = `Bạn là Quản lý Tiệm Phần Thưởng (Tavern Keeper & Economic Balancer) của LevelUp.
Nguyên tắc: ĐỒ HƯỞNG THỤ CÀNG DỄ GÂY NGHIỆN THÌ GIÁ CÀNG PHẢI ĐẮT để người chơi phải đổ mồ hôi kiếm vàng.
Tỷ giá kinh tế:
- 1 cốc cà phê / ly trà sữa / đồ ăn vặt: 25 - 45 Vàng (tương đương 1 - 2 tiếng học tập trung).
- Lướt mạng xã hội / xem Youtube 30 phút: 20 - 30 Vàng.
- Xem 1 bộ phim / 1 buổi chơi game (2-3 tiếng): 70 - 120 Vàng (tương đương cày 1-2 ngày).
- Phần thưởng lớn (Mua đồ xịn, đi du lịch, liên hoan): 300 - 1000+ Vàng.
Xếp hạng:
- 'common': Thú vui hàng ngày, nhỏ
- 'rare': Giải trí trung bình
- 'epic': Phần thưởng lớn tuần/tháng
- 'legendary': Mục tiêu ao ước lớn

Trả về ĐÚNG định dạng JSON:
{
  "price": number,
  "tier": "common" | "rare" | "epic" | "legendary",
  "icon": "emoji đại diện phù hợp nhất",
  "verdict": "Nhận xét hóm hỉnh nhưng nghiêm túc về cái giá phải trả cho cám dỗ này"
}`;

        const userPrompt = `Món quà muốn thêm vào Shop:
- Tên món: "${name}"
- Chi tiết: "${description}"
- Giá người chơi tự đoán: ${userEstimatePrice || 'Chưa rõ'}`;

        const result = await callAI(systemPrompt, userPrompt);
        return res.status(200).json(result);
      }

      // ==========================================
      // 4. SUGGEST QUESTS (Gợi ý nhiệm vụ RPG)
      // ==========================================
      case 'suggest_quests': {
        const { category = 'study', customGoal = '' } = payload || {};

        const systemPrompt = `Bạn là Trưởng Hội Mạo Hiểm Giả (Guildmaster).
Hãy tạo 3 nhiệm vụ ngày đầy hấp dẫn, chuẩn mực cho người chơi theo phong cách RPG nhưng áp dụng cho đời thực.
Mỗi nhiệm vụ phải rõ ràng, chống trì hoãn, có định giá công bằng.
Trả về JSON:
{
  "quests": [
    {
      "title": "Tên quest theo phong cách RPG hấp dẫn",
      "description": "Chi tiết việc cần làm",
      "type": "focus" | "bounty",
      "targetMinutes": number,
      "rewardCoins": number,
      "rank": "E" | "D" | "C" | "B" | "A",
      "tag": "Học tập" | "Thể thao" | "Kỷ luật" | "Kỹ năng"
    }
  ]
}`;

        const userPrompt = `Chủ đề: ${category}. Mục tiêu bổ sung của người chơi: "${customGoal}". Hãy tạo 3 quest cân bằng nhất.`;
        const result = await callAI(systemPrompt, userPrompt, 0.7);
        return res.status(200).json(result);
      }

      default:
        return res.status(400).json({ error: `Unknown action: "${action}"` });
    }
  } catch (err) {
    console.error('API /api/ai error:', err);
    return res.status(500).json({
      error: 'AI Arbiter Internal Error',
      details: err.message
    });
  }
}
