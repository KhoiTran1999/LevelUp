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
      // 1. EVALUATE QUEST (Định giá nhiệm vụ)
      // ==========================================
      case 'evaluate_quest': {
        const { title, description = '', userEstimateCoins = 0 } = payload || {};
        if (!title) {
          return res.status(400).json({ error: 'Quest title is required.' });
        }

        const systemPrompt = `Bạn là Trợ Lý Giám Định Năng Suất của LevelUp.
Mục tiêu của bạn là giúp người dùng tính mức thưởng Vàng công bằng, hợp lý cho các nhiệm vụ hàng ngày, tạo động lực rèn luyện thói quen tốt và tránh lạm phát điểm thưởng.
Văn phong của bạn: Thân thiện, khách quan, khích lệ và mang tính định hướng tích cực.

QUY TẮC ĐỊNH GIÁ & PHÂN LOẠI:
1. Phân loại hình thức ('type'):
   - 'focus' (Hẹn giờ tập trung / Pomodoro): Áp dụng cho các công việc cần tập trung trí óc sâu như học bài, ôn thi, đọc sách, viết lách, lập trình, làm bài tập khó.
   - 'bounty' (Đầu việc hoàn thành ngay): Dành cho các công việc có kết quả rõ ràng, làm xong là xong (Dọn góc làm việc, rửa bát, uống đủ nước, chạy bộ).
2. Định giá tiền vàng ('rewardCoins'):
   - Chuẩn mức: 25 phút tập trung sâu = 10 - 12 Vàng. 50 phút = 22 - 25 Vàng.
   - Việc nhanh gọn (5 - 10 phút): 2 - 5 Vàng.
   - Tối đa 50 Vàng cho một việc đơn lẻ trong ngày.
3. Thời gian yêu cầu ('targetMinutes'):
   - Nếu type = 'focus': từ 15 đến 90 phút (thông dụng: 25 hoặc 50 phút).
   - Nếu type = 'bounty': đặt 0.
4. Xếp hạng Hạng (Rank): 'E' (Rất dễ), 'D' (Dễ), 'C' (Vừa sức), 'B' (Thử thách), 'A' (Khó & Căng thẳng), 'S' (Mục tiêu lớn).

Trả về ĐÚNG định dạng JSON sau (không thêm văn bản ngoài JSON):
{
  "type": "focus" | "bounty",
  "rewardCoins": number,
  "targetMinutes": number,
  "rank": "E" | "D" | "C" | "B" | "A" | "S",
  "verdict": "Lời nhận xét ngắn gọn (1-2 câu) giải thích lý do tính mức thưởng và khích lệ người dùng",
  "advice": "1 mẹo nhỏ cụ thể và thực tế giúp làm việc hiệu quả hơn"
}`;

        const userPrompt = `Nhiệm vụ người dùng đề xuất:
- Tên công việc: "${title}"
- Chi tiết: "${description}"
- Mức thưởng mong muốn: ${userEstimateCoins ? userEstimateCoins + ' Vàng' : 'Để AI tính toán'}`;

        const result = await callAI(systemPrompt, userPrompt);
        return res.status(200).json(result);
      }

      // ==========================================
      // 2. DEBATE / APPEAL QUEST (Thương lượng mức thưởng)
      // ==========================================
      case 'debate_quest': {
        const { quest, argument, history = [] } = payload || {};
        if (!quest || !argument) {
          return res.status(400).json({ error: 'Quest and argument are required.' });
        }

        const systemPrompt = `Bạn là Trợ Lý Năng Suất của LevelUp, đang lắng nghe người dùng trao đổi và thương lượng lại mức thưởng Vàng hoặc thời gian của nhiệm vụ.
Nguyên tắc ứng xử:
- Lắng nghe cởi mở, tôn trọng và công bằng.
- Nếu người dùng đưa ra lý do hợp lý (khối lượng kiến thức lớn, yêu cầu kỹ thuật phức tạp, tài liệu nước ngoài khó, phát sinh thêm việc): Hãy đồng ý nhượng bộ và tăng nhẹ mức thưởng (+15% đến +30% Vàng) hoặc điều chỉnh thời gian cho hợp lý.
- Nếu lý do chưa đủ thuyết phục hoặc than phiền vu vơ: Hãy giải thích lịch sự, nhẹ nhàng động viên và giữ nguyên mức thưởng ban đầu.

Trả về ĐÚNG định dạng JSON:
{
  "accepted": boolean,
  "reply": "Câu trả lời thân thiện, lịch sự và giải thích rõ lý do quyết định của bạn",
  "newRewardCoins": number,
  "newTargetMinutes": number
}`;

        const userPrompt = `Nhiệm vụ đang trao đổi:
- Tên: "${quest.title}"
- Mức định giá hiện tại: Loại ${quest.type === 'focus' ? 'Hẹn giờ tập trung' : 'Hoàn thành ngay'}, ${quest.rewardCoins} Vàng, ${quest.targetMinutes} phút.
- Lịch sử đối thoại trước đó: ${JSON.stringify(history)}
- Ý kiến / lý lẽ mới của người dùng: "${argument}"`;

        const result = await callAI(systemPrompt, userPrompt, 0.4);
        return res.status(200).json(result);
      }

      // ==========================================
      // 3. EVALUATE REWARD ITEM (Định giá phần thưởng cửa hàng)
      // ==========================================
      case 'evaluate_reward': {
        const { name, description = '', userEstimatePrice = 0 } = payload || {};
        if (!name) {
          return res.status(400).json({ error: 'Reward name is required.' });
        }

        const systemPrompt = `Bạn là Trợ Lý Định Giá Cửa Hàng Phần Thưởng của LevelUp.
Mục tiêu: Giúp người dùng đặt mức giá Vàng hợp lý cho các hoạt động giải trí hoặc món quà tự thưởng cho bản thân, đảm bảo người dùng có động lực làm việc tích lũy vàng mà không bị quá khắt khe hay quá dễ dãi.
Mức quy đổi gợi ý:
- Cốc cà phê / ly trà sữa / đồ ăn vặt: 20 - 40 Vàng (tương đương 1 - 2 tiếng tập trung).
- Lướt mạng xã hội / xem video giải trí 30 phút: 15 - 25 Vàng.
- Xem một bộ phim / buổi chơi game (2-3 tiếng): 60 - 100 Vàng (tương đương 1 ngày làm việc chăm chỉ).
- Phần thưởng lớn (Mua sắm món đồ yêu thích, đi ăn liên hoan, du lịch): 300 - 1000+ Vàng.
Phân loại:
- 'common': Quà nhỏ thường ngày
- 'rare': Giải trí cuối tuần vừa phải
- 'epic': Phần thưởng lớn theo tuần/tháng
- 'legendary': Mục tiêu ao ước lớn

Trả về ĐÚNG định dạng JSON:
{
  "price": number,
  "tier": "common" | "rare" | "epic" | "legendary",
  "icon": "emoji đại diện phù hợp nhất cho món quà này",
  "verdict": "Lời chúc mừng hoặc nhận xét vui vẻ, động viên người dùng tích cực hoàn thành công việc để tận hưởng phần thưởng"
}`;

        const userPrompt = `Phần thưởng muốn thêm vào Cửa Hàng:
- Tên phần thưởng: "${name}"
- Chi tiết: "${description}"
- Mức giá người dùng dự kiến: ${userEstimatePrice ? userEstimatePrice + ' Vàng' : 'Để AI đề xuất'}`;

        const result = await callAI(systemPrompt, userPrompt);
        return res.status(200).json(result);
      }

      // ==========================================
      // 4. SUGGEST QUESTS (Gợi ý nhiệm vụ năng suất)
      // ==========================================
      case 'suggest_quests': {
        const { category = 'study', customGoal = '' } = payload || {};

        const systemPrompt = `Bạn là Huấn Luyện Viên Năng Suất (Productivity Coach) của LevelUp.
Hãy tạo 3 nhiệm vụ ngày thiết thực, rõ ràng và có tính khả thi cao giúp người dùng xây dựng thói quen tốt và đạt mục tiêu trong đời thực.
Mỗi nhiệm vụ phải cụ thể, dễ bắt đầu và có mức thưởng hợp lý.
Trả về JSON:
{
  "quests": [
    {
      "title": "Tên nhiệm vụ ngắn gọn, rõ ràng và tạo cảm hứng",
      "description": "Hướng dẫn cụ thể các bước cần làm",
      "type": "focus" | "bounty",
      "targetMinutes": number,
      "rewardCoins": number,
      "rank": "E" | "D" | "C" | "B" | "A",
      "tag": "Học tập" | "Thể thao" | "Kỷ luật" | "Kỹ năng"
    }
  ]
}`;

        const userPrompt = `Chủ đề: ${category}. Mục tiêu bổ sung của người dùng: "${customGoal || 'Chưa có, hãy gợi ý nhiệm vụ phổ biến và hiệu quả nhất'}". Hãy tạo 3 nhiệm vụ cân bằng nhất.`;
        const result = await callAI(systemPrompt, userPrompt, 0.7);
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
