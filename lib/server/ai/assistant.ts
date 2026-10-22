/**
 * Guild Companion / AI Assistant Engine
 * 2-Tier Architecture: Model Brain (Single-Turn Reasoning) & Model Worker (Sub-second Tool Execution)
 */

import { signQuest, signReward } from '@/lib/server/crypto';
import { handleGetMyUserData, handleGetBankMarketStatus } from './tools';
import { sanitizeEvaluatedQuest, sanitizeEvaluatedReward } from './appraisal';
import { callAI } from './client';

export const PROJECT_KNOWLEDGE_BASE = {
  name: 'LevelUp - Gamified Productivity & Habit RPG',
  philosophy: 'Biến công việc và thói quen hàng ngày thành chuyến phiêu lưu RPG. Giữ vững tính kỷ luật, công bằng, chống dopamine rẻ tiền và bảo vệ giá trị nỗ lực thực chất.',
  sections: {
    quests: {
      title: 'Hệ Thống Nhiệm Vụ (Quests)',
      content: `1. Nhiệm vụ Tập trung (type: 'focus'):
- Dành cho việc học tập, làm việc sâu, đọc sách, nghiên cứu, viết code, rèn luyện thể lực.
- Có đồng hồ đếm ngược (thường là 15, 20, 25, 45, 50, 60 phút).
- Tỷ lệ thưởng chuẩn: ~0.35 - 0.40 Vàng/phút tập trung (25p ~ 8-10 Vàng, 50p ~ 18-20 Vàng).
- Nhiệm vụ từ 15 Vàng trở lên hoặc phiên tập trung dài bắt buộc phải có bằng chứng hoàn thành (requiresProof: true).

2. Nhiệm vụ Nhanh / Việc nhà (type: 'bounty'):
- Dành cho việc sinh hoạt thường nhật, việc nhà (rửa chén, quét nhà, đổ rác, lau dọn), việc vặt 5-15 phút.
- KHÔNG HẸN GIỜ (targetMinutes = 0). Người dùng làm xong thì bấm nút "Hoàn thành" nhận ngay.
- Thưởng chuẩn: 3 - 5 Vàng. Tối đa cho việc nhà là 5 Vàng.

3. Các hình thức nộp bằng chứng (Proof Types):
- 📸 Chụp ảnh thực tế (photo): Chỉ chụp trực tiếp từ camera điện thoại (Anti-Cheat, ngăn chặn gian lận upload ảnh giả lập từ máy tính). Phù hợp cho việc dọn dẹp, thể thao, góc bàn làm việc.
- ✍️ Báo cáo nội dung (text): Nhập chi tiết công việc cụ thể đã làm (tối thiểu 10 ký tự). Có bộ lọc Heuristic chặn đứng spam, gõ bừa hoặc thú nhận "không biết làm gì", sau đó AI thẩm định sâu tính hợp lý và công sức trước khi phát thưởng Vàng. Phù hợp cho đọc sách, viết code, học từ vựng, nghiên cứu.
- 📸+✍️ Kết hợp cả hai (both): Vừa chụp ảnh thực tế vừa viết báo cáo giải trình chi tiết. AI đóng vai trò Trọng Tài Giám Định Toàn Diện, đối chiếu chéo xem ảnh và báo cáo có ăn khớp với nhau không. Tự động áp dụng cho giải bài tập toán/lý/hóa, nấu ăn theo công thức, vẽ tranh, lắp ráp mô hình DIY.

4. Tính năng Chuỗi Thói Quen (Streak) & Lặp lại (Repeat):
- Lặp lại (isRepeatable): Cho phép làm nhiều lần trong ngày hoặc các ngày tiếp theo.
- Chuỗi Streak: Thưởng thêm % Vàng (lên đến +50%) khi duy trì làm việc đều đặn mỗi ngày mà không bị ngắt quãng.

5. Triết lý hiển thị thẻ nhiệm vụ:
- Giao diện đã được tinh giản tối đa: Đã gỡ bỏ toàn bộ các badge phân cấp (Hạng E/D/C/B/A/S) gây rối mắt ở mặt trước thẻ, chỉ tập trung vào thông tin cốt lõi: Tên nhiệm vụ, Thời gian tập trung (nếu có), Phần thưởng Vàng và Chuỗi Streak.`
    },
    rewards: {
      title: 'Hệ Thống Cửa Hàng & Phần Thưởng (Shop & Rewards)',
      content: `1. Nguyên tắc Kinh tế RPG 3:1 hoặc 4:1 (Bảo vệ giá trị thực):
- Để tận hưởng 1 giờ giải trí xứng đáng và tự hào, người chơi cần tích lũy 3 - 4 giờ làm việc nghiêm túc.
- Ngăn chặn triệt để "dopamine giá rẻ": Không cho phép đặt giá quá thấp cho các hành vi giải trí dễ gây nghiện.
- Bảng quy đổi chuẩn:
  * Lướt mạng xã hội/TikTok/Facebook/Shorts 30 phút: 25 - 35 Vàng.
  * Chơi game / Xem phim 1 - 2 tiếng: 60 - 90 Vàng (tối thiểu 35 Vàng).
  * Cốc cà phê / Trà sữa: 40 - 55 Vàng.
  * Phần thưởng lớn (Mua sắm, liên hoan, du lịch): 300 - 1000+ Vàng.

2. Cân bằng kinh tế tự động giữa Nhiệm Vụ & Cửa Hàng:
- AI tính thưởng nhiệm vụ và AI định giá phần thưởng luôn giữ mối tương quan chặt chẽ (~0.35 - 0.40 Vàng/phút nỗ lực thực tế).

3. Triết lý hiển thị thẻ phần thưởng (Gỡ bỏ nhãn phân cấp):
- Toàn bộ các tag phân cấp vô nghĩa như "Cao cấp", "Phổ thông", "Tier" đã được loại bỏ hoàn toàn khỏi mặt trước thẻ quà và modal chi tiết.
- Thẻ quà chỉ hiển thị những thông tin thiết thực: Tên phần thưởng, Giá đổi Vàng, Thời gian tận hưởng (ví dụ: 60 phút hoặc Dùng ngay), và trạng thái Đủ Vàng / Thiếu Vàng.`
    },
    proof_verification: {
      title: 'Hệ Thống Giám Định Bằng Chứng & Chống Gian Lận (Proof Verification)',
      content: `1. Cơ chế Anti-Cheat 3 tầng:
- Tầng 1 (Thiết bị chụp ảnh): Ảnh bằng chứng bắt buộc phải chụp trực tiếp từ camera điện thoại, chặn đính kèm file tĩnh từ máy tính để chống gian lận.
- Tầng 2 (Bộ lọc Heuristic): Báo cáo văn bản phải đạt tối thiểu 10 ký tự, tự động phát hiện và chặn đứng các chuỗi gõ phím vô nghĩa (asdfgh...), spam đối phó ("đã xong rồi"), hoặc thừa nhận "không biết làm gì".
- Tầng 3 (Trọng Tài AI Giám Định Sâu): AI phân tích tính logic, khối lượng công việc, tính ăn khớp giữa văn bản và hình ảnh (ở chế độ kết hợp) trước khi phê duyệt cấp Vàng.

2. Tính năng nộp bằng chứng linh hoạt:
- Người dùng có thể chuyển đổi giữa tab Ảnh 📸, Báo Cáo ✍️, hoặc Kết Hợp 📸+✍️ khi nộp bằng chứng.
- Có thể thương lượng với AI để đổi hình thức bằng chứng nếu hoàn cảnh thực tế không cho phép chụp ảnh.

3. Lưu trữ minh bạch & Sổ Cái:
- Ảnh được tải lên lưu trữ an toàn (Cloudflare R2 / Supabase Storage).
- Mọi bằng chứng (ảnh + nội dung báo cáo + nhận xét của AI) đều được lưu trữ vĩnh viễn và có thể xem lại trực tiếp từ Sổ Cái (Ledger) hoặc Album Lịch Sử Bằng Chứng.`
    },
    ui_philosophy: {
      title: 'Triết Lý Giao Diện Tinh Giản & Chống Phân Tâm (Distraction-Free UI/UX)',
      content: `1. Loại bỏ các thông số rườm rà, vô nghĩa:
- Toàn bộ các tag phân cấp như "Cao cấp", "Phổ thông", "Hạng E/D/C/B/A/S", "Tier", điểm EXP ngoài thẻ đều đã được gỡ bỏ khỏi giao diện người dùng.
- Người dùng không cần bận tâm đến những nhãn dán hình thức, chỉ tập trung vào hành động thực tế.

2. Bố cục trực quan, tập trung vào giá trị cốt lõi:
- Thẻ nhiệm vụ: Tên việc, Thời gian tập trung (nếu có), Phần thưởng Vàng và Chuỗi Streak.
- Thẻ phần thưởng: Tên quà, Giá đổi Vàng, Thời lượng sử dụng (60p hoặc Dùng ngay).
- Modal chi tiết: Rộng rãi, sạch sẽ, chỉ giữ các thông tin bổ trợ thiết thực và nút hành động rõ ràng.
- Giao diện mượt mà trên cả Mobile và Desktop với chế độ Sáng/Tối (Light/Dark mode).`
    },
    levels_and_exp: {
      title: 'Hệ Thống Cấp Độ & Danh Hiệu (Levels & EXP)',
      content: `1. Cơ chế tính EXP:
- 1 Vàng kiếm được từ nhiệm vụ hợp lệ = 1 điểm EXP.
- Tiêu Vàng mua quà KHÔNG làm mất EXP (Level dựa trên tổng EXP trọn đời).
2. Công thức lên cấp:
- Cần Level * 100 EXP để thăng cấp tiếp theo.
3. Bảng Danh Hiệu:
- Cấp 1 - 2: Tân Binh Cấp 1 / Tân Binh
- Cấp 3 - 5: Học Viên Chăm Chỉ
- Cấp 6 - 9: Chiến Binh Kiên Trì
- Cấp 10 - 14: Chuyên Gia Tập Trung
- Cấp 15 - 19: Bậc Thầy Năng Suất
- Cấp 20+: Huyền Thoại Kỷ Luật`
    },
    bank_and_finance: {
      title: 'Hệ Thống Ngân Hàng & Kho Bạc (Bank & Finance)',
      content: `1. Gửi Tiết Kiệm (Savings):
- Sinh lời mỗi ngày dựa trên lãi suất tiền gửi của Quỹ.
- An toàn tuyệt đối 100%: Quỹ luôn được bảo trợ bởi Kho Bạc Hệ Thống.
2. Vay Vốn Ngân Hàng (Loan):
- Hỗ trợ khi người chơi thiếu Vàng đổi quà khẩn cấp để nạp năng lượng.
- Cơ chế trả nợ êm ái: Tự động trích phần trăm (thường 20% - 50%) từ phần thưởng của mỗi nhiệm vụ hoàn thành cho đến khi hết nợ.
- Không áp lực thời gian, không phạt nặng nếu tiếp tục chăm chỉ làm nhiệm vụ.
3. Hạn mức tín dụng:
- Tự động nâng cao khi người chơi đạt Cấp cao hơn, duy trì chuỗi Streak dài và có lịch sử trả nợ uy tín.`
    },
    frequency_tracker: {
      title: 'Hệ Thống Theo Dõi Tần Suất & Thói Quen (Frequency Tracker)',
      content: `1. Bản đồ nhiệt (Heatmap Tracker):
- Nằm trong mục "Xem thêm" (More Menu).
- Hiển thị trực quan theo phong cách GitHub Heatmap cho từng nhiệm vụ và phần thưởng.
- Cho phép xem theo chu kỳ: Ngày, Tuần, Tháng, Năm.

2. Chỉ số đo lường kiên trì:
- Tỷ lệ hoàn thành (% kiên trì trong kỳ).
- Tổng số ngày đã thực hiện so với tổng số ngày trong kỳ.`
    },
    productivity_tips: {
      title: 'Mẹo Tăng Năng Suất & Chống Trì Hoãn (Productivity Tips)',
      content: `1. Phương pháp Pomodoro: Làm 25 phút, nghỉ 5 phút. Sau 4 chu kỳ thì nghỉ dài 15-20 phút.
2. Chia nhỏ mục tiêu (Chunking): Đừng bao giờ tạo việc "Học 10 chương sách". Hãy chia thành "Đọc kỹ & tóm tắt Chương 1" (25 phút).
3. Quy tắc 2 phút: Nếu một việc vặt mất dưới 2 phút (dọn bàn, uống nước, cất tài liệu), hãy hoàn thành ngay lập tức.
4. Tránh Dopamine vay mượn: Luôn làm xong việc rồi mới tự thưởng, niềm vui sẽ trọn vẹn và không mang lại cảm giác tội lỗi.`
    },
    negotiation: {
      title: 'Cơ Chế Thương Lượng & Xin Xỏ Với AI (Negotiation & Bargaining System)',
      content: `1. Các lĩnh vực có thể thương lượng trong LevelUp:
- Thương lượng Nhiệm vụ (Quests):
  * Xin tăng thêm Vàng (+2 đến +5 Vàng): Dành cho nhiệm vụ độ khó cao, công việc nhọc nhằn hoặc đòi hỏi tư duy sâu.
  * Xin giảm bớt thời gian hẹn giờ (ví dụ 45p -> 30p, hoặc 25p -> 15p): Dành cho những lúc mệt mỏi, bận rộn nhưng vẫn quyết tâm duy trì chuỗi Streak.
  * Xin đổi hình thức bằng chứng: Đổi giữa chụp ảnh (photo) và viết báo cáo công việc (text) khi làm việc nơi riêng tư hoặc không tiện chụp màn hình.
  * Chuyển đổi thể loại: Chuyển từ việc bấm giờ tập trung (focus) sang việc hoàn thành ngay không hẹn giờ (bounty).
- Thương lượng Phần thưởng Cửa Hàng (Shop & Rewards):
  * Xin giảm giá Vàng (10% - 25%): Khi người chơi cần nạp lại năng lượng hoặc giải trí tự thưởng nhưng đang thiếu một ít Vàng.
  * Xin tăng thời lượng tận hưởng phần thưởng giải trí.
- Thương lượng Ngân Hàng & Khoản Vay (Bank & Loan):
  * Xin giảm tỷ lệ trích nợ tự động từ nhiệm vụ (ví dụ trích 20% thay vì 50%) để giữ lại thêm Vàng chi tiêu.
  * Xin giãn nợ, thương lượng lãi suất ưu đãi hoặc xin tư vấn hạn mức tín dụng.

2. Bí quyết thương lượng & xin xỏ thành công với AI:
- Nêu rõ lý do chính đáng & hoàn cảnh thực tế: Thể hiện sự trung thực, nỗ lực cá nhân và quyết tâm hoàn thành mục tiêu.
- Đề xuất số liệu hợp lý, khiêm tốn: Tránh xin quá mức (như xin +50 Vàng hay giá 0 Vàng), vì AI bảo vệ tính cân bằng kinh tế RPG.
- Đưa ra cam kết hành động (Quid Pro Quo): Ví dụ "Nếu được giảm 10 phút, tôi cam kết tập trung 100% không lướt điện thoại" hoặc "Nếu tăng 3 Vàng, tôi sẽ làm thêm 1 việc nhà nữa".

3. Cách bắt đầu phiên thương lượng:
- Nhấn nút "Thương lượng" trực tiếp trên bất kỳ thẻ nhiệm vụ hoặc phần thưởng nào trong ứng dụng để mở cửa sổ đối thoại thương lượng.
- Nhắn tin hỏi Phù Thủy AI để được cố vấn chiến thuật, gợi ý lập luận và mẫu câu thương lượng khéo léo nhất!`
    }
  }
};

export const ASSISTANT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_user_profile',
      description: 'Lấy thông tin hồ sơ của người chơi: Cấp độ (level), Kinh nghiệm (exp), Vàng hiện có (coins), chuỗi ngày liên tiếp (streak), danh hiệu (title).',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_quests',
      description: 'Lấy danh sách các nhiệm vụ đang mở (activeQuests) và tổng số nhiệm vụ của người chơi.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_shop',
      description: 'Lấy danh sách các món phần thưởng trong Cửa Hàng cá nhân của người chơi.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_bank_account',
      description: 'Lấy thông tin tài khoản ngân hàng: tiền gửi tiết kiệm, số nợ hiện tại, lãi suất và hạn mức tín dụng.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_ledger',
      description: 'Lấy lịch sử giao dịch sao kê ví Vàng gần đây của người chơi (thu, chi, trả nợ).',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_project_knowledge',
      description: 'Tra cứu cẩm nang tri thức và luật chơi của LevelUp RPG theo chủ đề.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['all', 'quests', 'rewards', 'levels_and_exp', 'bank_and_finance', 'productivity_tips', 'negotiation', 'proof_verification', 'ui_philosophy', 'frequency_tracker'],
            description: 'Chủ đề cẩm nang cần tra cứu'
          }
        },
        required: ['topic']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_quest',
      description: 'Tạo một nhiệm vụ mới hợp lệ, chuẩn hóa thông số và ký chữ ký số HMAC SHA-256 an toàn.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Tên nhiệm vụ ngắn gọn, rõ ràng' },
          targetMinutes: { type: 'number', description: 'Thời gian tập trung hẹn giờ (0 cho việc nhà/việc vặt, 15-120 cho tập trung sâu)' },
          rewardCoins: { type: 'number', description: 'Mức Vàng thưởng hợp lệ' },
          type: { type: 'string', enum: ['focus', 'bounty'], description: 'Loại nhiệm vụ (focus: hẹn giờ, bounty: việc nhanh không hẹn giờ)' },
          requiresProof: { type: 'boolean', description: 'Có yêu cầu chụp ảnh bằng chứng hoàn thành không' },
          description: { type: 'string', description: 'Mô tả chi tiết nhiệm vụ' }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_reward',
      description: 'Tạo một phần thưởng mới hợp lệ vào Cửa Hàng, định giá Vàng theo nguyên tắc 3:1 và ký chữ ký số HMAC.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Tên phần thưởng lành mạnh' },
          price: { type: 'number', description: 'Giá Vàng hợp lý' },
          tier: { type: 'string', enum: ['common', 'rare', 'epic', 'legendary'], description: 'Phân hạng phần thưởng' },
          targetMinutes: { type: 'number', description: 'Thời lượng tận hưởng phần thưởng (phút)' },
          description: { type: 'string', description: 'Mô tả phần thưởng' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'suggest_action_plan',
      description: 'Đề xuất kế hoạch hành động 3 bước trong ngày dựa trên dữ liệu nhiệm vụ hiện tại.',
      parameters: { type: 'object', properties: {} }
    }
  }
];

export async function executeWorkerTool(toolName: string, args: any = {}, context: any = {}): Promise<any> {
  const { callerSub, redis, draftContext = {} } = context;
  const startTime = Date.now();

  switch (toolName) {
    case 'get_user_profile': {
      const data = await handleGetMyUserData('profile', callerSub, redis, draftContext);
      return {
        tool: toolName,
        status: 'success',
        executionMs: Date.now() - startTime,
        data,
        summary: `Hồ sơ: Level ${data.level || 1} (${data.title || 'Tân Binh'}), Vàng: ${data.coins || 0}, Streak: ${data.streak || 0} ngày.`
      };
    }
    case 'get_user_quests': {
      const data = await handleGetMyUserData('quests', callerSub, redis, draftContext);
      return {
        tool: toolName,
        status: 'success',
        executionMs: Date.now() - startTime,
        data,
        summary: `Có ${data.activeQuests?.length || 0} nhiệm vụ đang mở trên tổng số ${data.totalQuests || 0} nhiệm vụ.`
      };
    }
    case 'get_user_shop': {
      const data = await handleGetMyUserData('shop_items', callerSub, redis, draftContext);
      return {
        tool: toolName,
        status: 'success',
        executionMs: Date.now() - startTime,
        data,
        summary: `Cửa hàng có ${data.shopItems?.length || 0} món phần thưởng khả dụng.`
      };
    }
    case 'get_bank_account': {
      const data = await handleGetMyUserData('bank_and_debt', callerSub, redis, draftContext);
      const market = await handleGetBankMarketStatus(redis, callerSub, draftContext.profile);
      const combined = { ...data, market };
      return {
        tool: toolName,
        status: 'success',
        executionMs: Date.now() - startTime,
        data: combined,
        summary: `Tiết kiệm: ${combined.deposited || 0} Vàng, Nợ: ${combined.loan?.amount || 0} Vàng, Lãi vay thị trường: ${((market.standardBorrowRate || 0.05) * 100).toFixed(1)}%/ngày.`
      };
    }
    case 'get_user_ledger': {
      const data = await handleGetMyUserData('ledger', callerSub, redis, draftContext);
      return {
        tool: toolName,
        status: 'success',
        executionMs: Date.now() - startTime,
        data,
        summary: `Đã tra cứu ${data.recentTransactions?.length || 0} giao dịch gần nhất trong sổ cái ví.`
      };
    }
    case 'get_project_knowledge': {
      const topic = args.topic || 'all';
      const section = (PROJECT_KNOWLEDGE_BASE.sections as any)[topic];
      const data = section ? { topic, title: section.title, content: section.content } : PROJECT_KNOWLEDGE_BASE;
      return {
        tool: toolName,
        status: 'success',
        executionMs: Date.now() - startTime,
        data,
        summary: `Đã tra cứu cẩm nang hệ thống LevelUp (chủ đề: ${topic}).`
      };
    }
    case 'create_quest': {
      const rawTitle = args.title || 'Nhiệm vụ mới';
      const rawMinutes = parseInt(args.targetMinutes, 10) || (args.type === 'bounty' ? 0 : 25);
      const rawType = (rawMinutes > 0) ? 'focus' : (args.type || 'bounty');
      const rawCoins = parseInt(args.rewardCoins, 10) || (rawType === 'focus' ? Math.max(8, Math.round(rawMinutes * 0.38)) : 4);
      const rawRequiresProof = args.requiresProof !== undefined ? Boolean(args.requiresProof) : (rawCoins >= 15 || rawMinutes >= 45);

      const isRepeatable = Boolean(args.isRepeatable);
      const rawQuest = {
        title: rawTitle,
        description: args.description || '',
        type: rawType,
        targetMinutes: rawMinutes,
        rewardCoins: rawCoins,
        isRepeatable,
        requiresProof: rawRequiresProof,
        proofGuidance: args.proofGuidance || (rawRequiresProof ? 'Chụp ảnh kết quả hoặc góc làm việc để hoàn thành.' : ''),
        icon: args.icon || (rawType === 'focus' ? '🎯' : '🧹')
      };

      const clean = sanitizeEvaluatedQuest(rawQuest, rawTitle, args.description || '', rawMinutes);
      const signature = signQuest(clean.title, clean.type, clean.targetMinutes, clean.rewardCoins, clean.requiresProof, isRepeatable);
      const questResult = {
        ...clean,
        isRepeatable,
        signature,
        id: `quest_ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        status: 'active',
        createdAt: Date.now()
      };

      return {
        tool: toolName,
        status: 'success',
        executionMs: Date.now() - startTime,
        data: questResult,
        summary: `Đã tạo & ký số HMAC cho nhiệm vụ [Hạng ${questResult.rank}]: "${questResult.title}" (${questResult.targetMinutes}p • ${questResult.rewardCoins} Vàng).`
      };
    }
    case 'create_reward': {
      const rawName = args.name || 'Phần thưởng mới';
      const rawPrice = parseInt(args.price, 10) || 30;
      const rawMinutes = parseInt(args.targetMinutes, 10) || 0;
      const rawTier = args.tier || (rawPrice < 30 ? 'common' : (rawPrice < 70 ? 'rare' : 'epic'));

      const rawReward = {
        name: rawName,
        description: args.description || '',
        price: rawPrice,
        tier: rawTier,
        targetMinutes: rawMinutes,
        icon: args.icon || '🎁'
      };

      const clean = sanitizeEvaluatedReward(rawReward, rawName, args.description || '', rawMinutes);
      const signature = signReward(clean.name, clean.price, clean.tier, clean.targetMinutes);
      const rewardResult = {
        ...clean,
        signature,
        id: `reward_ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: Date.now()
      };

      return {
        tool: toolName,
        status: 'success',
        executionMs: Date.now() - startTime,
        data: rewardResult,
        summary: `Đã tạo & ký số HMAC cho phần thưởng: "${rewardResult.name}" (${rewardResult.price} Vàng • Hạng ${rewardResult.tier}).`
      };
    }
    case 'suggest_action_plan': {
      const questsData = await handleGetMyUserData('quests', callerSub, redis, draftContext);
      const activeQuests = questsData.activeQuests || [];
      const plan = [
        {
          step: 1,
          timeOfDay: 'Buổi sáng / Bắt đầu',
          action: activeQuests[0] ? `Khởi động với "${activeQuests[0].title}" (${activeQuests[0].targetMinutes || 15}p)` : 'Khởi động với 1 phiên tập trung sâu 25 phút để kích hoạt năng lượng',
          targetCoins: activeQuests[0]?.rewardCoins || 9
        },
        {
          step: 2,
          timeOfDay: 'Giữa ngày / Trọng tâm',
          action: activeQuests[1] ? `Tiếp tục xử lý "${activeQuests[1].title}"` : 'Giải quyết việc vặt không cần bấm giờ (bounty) để giữ nhịp độ',
          targetCoins: activeQuests[1]?.rewardCoins || 5
        },
        {
          step: 3,
          timeOfDay: 'Cuối ngày / Thư giãn',
          action: 'Dùng Vàng đã tích lũy đổi 1 phần thưởng trong Cửa Hàng để tự hào nạp lại năng lượng',
          targetCoins: 0
        }
      ];
      return {
        tool: toolName,
        status: 'success',
        executionMs: Date.now() - startTime,
        data: plan,
        summary: 'Đã xây dựng kế hoạch 3 bước hành động trong ngày.'
      };
    }
    default:
      return {
        tool: toolName,
        status: 'error',
        executionMs: Date.now() - startTime,
        error: `Không hỗ trợ công cụ: ${toolName}`
      };
  }
}

export function runDeterministicAssistant(
  message: string,
  userProfile: any = {},
  _callerSub: string = 'guest',
  _redis: any = null,
  _draftContext: any = {}
): any {
  const norm = (message || '').toLowerCase();
  const workerResults: any[] = [];
  const suggestedActions: any[] = [];

  if (/(?:bằng chứng|bang chung|chứng minh|chung minh|chụp ảnh|chup anh|báo cáo|bao cao|proof)/i.test(norm)) {
    const knowledge = PROJECT_KNOWLEDGE_BASE.sections.proof_verification || PROJECT_KNOWLEDGE_BASE.sections.quests;
    workerResults.push({
      tool: 'get_project_knowledge',
      status: 'success',
      data: knowledge,
      summary: 'Đã tra cứu cơ chế Hệ Thống Giám Định Bằng Chứng & Chống Gian Lận của LevelUp.'
    });

    return {
      reply: `Chào hiệp sĩ **${userProfile.nickname || 'bạn'}**! 🧙‍♂️📸✍️\n\nTrong LevelUp RPG, để đảm bảo tính kỷ luật và công bằng, hệ thống cung cấp **3 hình thức nộp bằng chứng**:\n\n1. **📸 Chụp ảnh thực tế (Photo):** Chỉ chụp trực tiếp từ camera điện thoại (chống gian lận đính kèm file có sẵn), phù hợp cho việc dọn dẹp, thể thao, không gian làm việc.\n2. **✍️ Báo cáo nội dung (Text):** Nhập mô tả cụ thể những gì bạn đã làm (tối thiểu 10 ký tự). Có bộ lọc Heuristic chống spam và Trọng tài AI thẩm định sâu trước khi duyệt nhận Vàng. Phù hợp cho đọc sách, viết code, học tập.\n3. **📸+✍️ Kết hợp cả hai (Both):** Vừa chụp ảnh bài làm vừa viết báo cáo tóm tắt (dành cho bài tập toán/lý/hóa, nấu ăn, làm mô hình). AI sẽ đối chiếu chéo tính ăn khớp giữa ảnh và báo cáo.\n\n💡 Bạn cũng có thể bấm nút **"Thương lượng"** để xin đổi hình thức nộp bằng chứng nếu có lý do chính đáng nhé!`,
      thought: 'Người dùng hỏi về hệ thống bằng chứng. Model Brain tra cứu cẩm nang proof_verification và giải thích 3 hình thức nộp bằng chứng cùng cơ chế chống gian lận.',
      workerResults,
      suggestedActions,
      options: [
        { id: 1, label: '✍️ Cách viết báo cáo để AI duyệt', argument: 'Hướng dẫn cách viết báo cáo công việc để AI duyệt ngay' },
        { id: 2, label: '🔄 Cách xin đổi hình thức nộp bằng chứng', argument: 'Cách thương lượng xin đổi từ chụp ảnh sang viết báo cáo' }
      ]
    };
  }

  if (/(?:thương lượng|thuong luong|xin xỏ|xin xo|mặc cả|mac ca|xin thêm|xin bot|bí quyết xin|cách thương lượng)/i.test(norm)) {
    const knowledge = PROJECT_KNOWLEDGE_BASE.sections.negotiation;
    workerResults.push({
      tool: 'get_project_knowledge',
      status: 'success',
      data: knowledge,
      summary: 'Đã tra cứu cẩm nang Hệ Thống Thương Lượng & Xin Xỏ với AI trong LevelUp.'
    });

    return {
      reply: `Chào hiệp sĩ **${userProfile.nickname || 'bạn'}**! 🧙‍♂️⚖️✨\n\nTrong LevelUp RPG, bạn hoàn toàn có quyền **thương lượng và xin xỏ với AI** để điều chỉnh nhịp độ làm việc sao cho phù hợp với thể trạng cá nhân. Dưới đây là cẩm nang gợi ý giúp bạn thương lượng hiệu quả nhất:\n\n### 🎯 1. Bạn có thể thương lượng những gì?\n- **Nhiệm vụ (Quests):**\n  * **Xin thêm Vàng (+2 đến +5 Vàng):** Khi việc khó, nặng tính nghiên cứu hoặc đòi hỏi tư duy sâu.\n  * **Xin giảm bớt thời gian (ví dụ 45p ➔ 30p, hoặc 25p ➔ 15p):** Khi bạn mệt mỏi nhưng vẫn muốn giữ chuỗi Streak chăm chỉ.\n  * **Xin miễn chụp ảnh bằng chứng:** Khi làm việc riêng tư, nhạy cảm hoặc không tiện chụp hình.\n  * **Chuyển thành việc nhanh (bounty):** Hoàn thành nhận ngay không cần hẹn giờ.\n- **Cửa Hàng (Shop & Rewards):**\n  * **Xin giảm giá Vàng (10% - 25%):** Khi muốn tự thưởng nạp lại năng lượng sau chuỗi ngày nỗ lực mà đang thiếu chút Vàng.\n- **Ngân Hàng (Bank & Loan):**\n  * **Xin giảm tỷ lệ trích nợ tự động (giảm từ 50% xuống 20% - 30%):** Giữ lại nhiều Vàng chi tiêu hơn mỗi ngày.\n\n### 💡 2. Bí quyết xin xỏ thành công với AI:\n1. **Chân thành & Nêu rõ lý do:** AI rất đồng cảm với tinh thần nỗ lực.\n2. **Đề xuất khiêm tốn & Hợp lý:** Đừng xin quá mức, AI sẽ từ chối để giữ kinh tế cân bằng.\n3. **Cam kết tập trung (Quid Pro Quo):** Nêu rõ cam kết đổi lại quyền lợi.\n\n### 🚀 3. Cách bắt đầu thương lượng:\nBạn chỉ cần bấm vào nút **"Thương lượng"** trực tiếp trên thẻ nhiệm vụ hoặc phần thưởng bất kỳ để bắt đầu đàm phán nhé!`,
      thought: 'Người dùng hỏi về cẩm nang và cách thức thương lượng/xin xỏ với AI. Model Brain tra cứu cẩm nang negotiation và hướng dẫn chi tiết các mảng có thể thương lượng cùng bí quyết xin xỏ thuyết phục.',
      workerResults,
      suggestedActions,
      options: [
        { id: 1, label: '💰 Mẫu câu xin tăng Vàng', argument: 'Gợi ý cho tôi mẫu câu xin tăng Vàng nhiệm vụ' },
        { id: 2, label: '⏱️ Mẹo xin giảm bớt phút', argument: 'Mẹo xin giảm thời gian tập trung khi mệt' },
        { id: 3, label: '🎁 Cách xin giảm giá quà Shop', argument: 'Cách xin giảm giá phần thưởng Cửa Hàng' }
      ]
    };
  }

  if (/(?:tạo|thêm|gợi ý|làm|nhờ|giúp).*(?:nhiệm vụ|việc|task|học|code|đọc)/i.test(norm) || /\d+\s*phút/i.test(norm)) {
    const minsMatch = norm.match(/(\d+)\s*(?:phút|min|p\b)/i);
    const mins = minsMatch ? parseInt(minsMatch[1], 10) : 25;
    const isChore = /(?:rửa|dọn|quét|giặt|đổ\s*rác|lau)/i.test(norm);
    const finalMins = isChore ? 0 : Math.min(120, Math.max(15, mins));
    const title = isChore ? 'Dọn dẹp & sắp xếp không gian gọn gàng' : `Tập trung hoàn thành phiên làm việc ${finalMins} phút`;
    const coins = finalMins === 0 ? 4 : Math.max(8, Math.round(finalMins * 0.38));
    const type = finalMins > 0 ? 'focus' : 'bounty';
    const requiresProof = coins >= 15 || finalMins >= 45;

    const questData = {
      title,
      description: 'Phiên nhiệm vụ được thiết kế cân bằng bởi Cố Vấn Guild để bạn khởi động ngày mới tràn đầy năng lượng.',
      type,
      targetMinutes: finalMins,
      rewardCoins: coins,
      requiresProof,
      proofGuidance: requiresProof ? 'Chụp ảnh kết quả hoặc góc làm việc để xác nhận.' : '',
      icon: type === 'focus' ? '🎯' : '🧹'
    };
    const clean = sanitizeEvaluatedQuest(questData, title, questData.description, finalMins);
    const sig = signQuest(clean.title, clean.type, clean.targetMinutes, clean.rewardCoins, clean.requiresProof, Boolean(clean.isRepeatable));
    const newQuest = {
      ...clean,
      isRepeatable: Boolean(clean.isRepeatable),
      signature: sig,
      id: `quest_ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      status: 'active',
      createdAt: Date.now()
    };

    workerResults.push({
      tool: 'create_quest',
      status: 'success',
      data: newQuest,
      summary: `Đã tạo & ký số HMAC cho nhiệm vụ [Hạng ${newQuest.rank}]: "${newQuest.title}" (${newQuest.targetMinutes}p • ${newQuest.rewardCoins} Vàng).`
    });
    suggestedActions.push({ type: 'quest_created', quest: newQuest });

    return {
      reply: `Chào hiệp sĩ **${userProfile.nickname || 'bạn'}**! ✨\n\nModel Brain đã lên kế hoạch và giao cho Model Worker tạo ngay cho bạn một nhiệm vụ chuẩn chỉ:\n\n- **Tên:** ${newQuest.title}\n- **Thời gian:** ${newQuest.targetMinutes > 0 ? `${newQuest.targetMinutes} phút tập trung sâu` : 'Không bấm giờ (việc nhanh)'}\n- **Mức thưởng:** **+${newQuest.rewardCoins} Vàng** & **+${newQuest.rewardCoins * 3} EXP**\n- **Hạng:** ${newQuest.rank}\n\nBạn có thể bấm nút **"Nhận nhiệm vụ này"** ngay bên dưới để thêm vào danh sách và bắt đầu chinh phục nhé! 🚀`,
      thought: `Người dùng yêu cầu tạo/gợi ý nhiệm vụ. Model Brain xác định thời lượng ${finalMins} phút và mức thưởng ${coins} Vàng, sai Worker tạo nhiệm vụ có chữ ký số HMAC an toàn.`,
      workerResults,
      suggestedActions,
      options: [
        { id: 1, label: '💡 Cho tôi xin thêm mẹo tập trung', argument: 'Cho tôi xin mẹo để tập trung 25 phút không bị xao nhãng' },
        { id: 2, label: '🪙 Làm sao để tối ưu Vàng?', argument: 'Làm sao để tối ưu số Vàng kiếm được mỗi ngày?' }
      ]
    };
  }

  if (/(?:ngân hàng|vay|tiết kiệm|lãi suất|kho bạc|hạn mức|nợ)/i.test(norm)) {
    const knowledge = PROJECT_KNOWLEDGE_BASE.sections.bank_and_finance;
    workerResults.push({
      tool: 'get_project_knowledge',
      status: 'success',
      data: knowledge,
      summary: 'Đã tra cứu cơ chế hoạt động của Ngân Hàng & Quỹ Kho Bạc LevelUp.'
    });

    return {
      reply: `Chào bạn! Về cơ chế **Ngân Hàng & Kho Bạc LevelUp**, mình chia sẻ 2 tính năng chính nè:\n\n1. **🌱 Gửi Tiết Kiệm:**\n   - Nếu có Vàng dư dả chưa dùng mua quà, hãy gửi vào Ngân Hàng để nhận lãi sinh lời mỗi ngày.\n   - Tiền gửi an toàn tuyệt đối 100% vì được bảo trợ bởi Kho Bạc Hệ Thống.\n\n2. **🏦 Vay Vốn Nhẹ Nhàng:**\n   - Khi bạn cần Vàng đổi phần thưởng để giải trí hay nạp năng lượng ngay, bạn có thể vay trong hạn mức tín dụng.\n   - **Trả nợ êm ái:** Hệ thống sẽ tự động trích một phần nhỏ (20% - 50%) từ phần thưởng của mỗi nhiệm vụ bạn làm xong để trả nợ dần. Bạn không phải chịu áp lực đáo hạn!\n\n3. **⭐ Nâng hạn mức tín dụng:**\n   - Hãy nâng cấp Level, giữ chuỗi Streak chăm chỉ và trả nợ đúng hạn để được cấp hạn mức cao hơn nhé!`,
      thought: 'Người dùng hỏi về hệ thống ngân hàng, tiết kiệm và vay vốn. Model Brain phân tích cẩm nang tài chính và giải thích cơ chế trả nợ tự động êm ái.',
      workerResults,
      suggestedActions,
      options: [
        { id: 1, label: '⚡ Tạo việc cày Vàng trả nợ', argument: 'Tạo giúp tôi 1 nhiệm vụ 25 phút để cày Vàng' },
        { id: 2, label: '📖 Cách thăng cấp Level nhanh', argument: 'Làm sao để lên cấp nhanh nhất?' }
      ]
    };
  }

  if (/(?:cấp|level|exp|kinh nghiệm|danh hiệu|thăng cấp)/i.test(norm)) {
    const knowledge = PROJECT_KNOWLEDGE_BASE.sections.levels_and_exp;
    workerResults.push({
      tool: 'get_project_knowledge',
      status: 'success',
      data: knowledge,
      summary: 'Đã tra cứu cơ chế Cấp độ, Kinh nghiệm (EXP) và Danh hiệu hiệp sĩ.'
    });

    return {
      reply: `Chào hiệp sĩ! Đây là bí quyết **Thăng Cấp & Kinh Nghiệm (EXP)** trong LevelUp:\n\n- **Quy tắc vàng:** **1 Vàng kiếm được từ nhiệm vụ = 1 điểm EXP**.\n- Bạn tiêu Vàng mua quà trong Cửa Hàng **KHÔNG BỊ MẤT EXP**, nên cứ tự tin tự thưởng cho bản thân nhé!\n- **Bậc danh hiệu:**\n  * **Cấp 1 - 2:** Tân Binh\n  * **Cấp 3 - 5:** Học Viên Chăm Chỉ\n  * **Cấp 6 - 9:** Chiến Binh Kiên Trì\n  * **Cấp 10 - 14:** Chuyên Gia Tập Trung\n  * **Cấp 15 - 19:** Bậc Thầy Năng Suất\n  * **Cấp 20+:** Huyền Thoại Kỷ Luật ✨\n\nBạn hiện đang ở **Level ${userProfile.level || 1}** (${userProfile.title || 'Tân Binh'}). Hãy tiếp tục hoàn thành các nhiệm vụ tập trung sâu để gom thêm EXP nhé!`,
      thought: 'Người dùng hỏi về EXP, cấp độ và danh hiệu. Model Brain tra cứu cẩm nang và tổng hợp lộ trình phát triển bản thân.',
      workerResults,
      suggestedActions,
      options: [
        { id: 1, label: '⚡ Tạo việc 25p để gom EXP', argument: 'Tạo giúp tôi 1 nhiệm vụ học tập 25 phút' },
        { id: 2, label: '🎁 Gợi ý quà tự thưởng', argument: 'Gợi ý cho tôi phần thưởng lành mạnh trong cửa hàng' }
      ]
    };
  }

  const knowledge = PROJECT_KNOWLEDGE_BASE.sections.productivity_tips;
  workerResults.push({
    tool: 'get_project_knowledge',
    status: 'success',
    data: knowledge,
    summary: 'Đã tra cứu cẩm nang năng suất & chống trì hoãn Pomodoro.'
  });

  return {
    reply: `Chào hiệp sĩ **${userProfile.nickname || 'bạn'}**! Mình là **Cố Vấn Guild AI** của LevelUp RPG. 🧙‍♂️✨\n\nMình hoạt động với kiến trúc 2 tầng:\n- **Model Brain** tư duy sâu sắc, lắng nghe thắc mắc, phân tích và chia sẻ mẹo làm việc, chống trì hoãn.\n- **Model Worker** sẵn sàng thực thi công cụ siêu tốc để tra cứu thông số hoặc tạo nhiệm vụ/phần thưởng mới cho bạn bất cứ lúc nào!\n\n💡 **Mẹo hôm nay:** Hãy bắt đầu với 1 phiên Pomodoro 25 phút tập trung cao độ. Sau khi chuông reo, bạn sẽ vừa nhận được Vàng, vừa được cộng EXP để tiến gần hơn đến mốc thăng cấp tiếp theo! Bạn muốn mình hỗ trợ điều gì hôm nay nè?`,
    thought: 'Phản hồi mặc định từ Model Brain, giới thiệu vai trò Cố Vấn Guild, nêu rõ cơ chế Model Brain & Model Worker và gợi ý mẹo Pomodoro.',
    workerResults,
    suggestedActions,
    options: [
      { id: 1, label: '💡 Hôm nay tôi nên làm gì?', argument: 'Hôm nay tôi nên làm gì?' },
      { id: 2, label: '⚡ Tạo 1 việc học 25 phút', argument: 'Tạo giúp tôi 1 nhiệm vụ học tập 25 phút' },
      { id: 3, label: '🏦 Giải thích Ngân Hàng & Khoản vay', argument: 'Giải thích cách hoạt động của ngân hàng và khoản vay' }
    ]
  };
}

export async function runAssistantAgent({
  message,
  history = [],
  caller = {},
  redis = null,
  draftContext = {},
  onEvent = null
}: {
  message: string;
  history?: any[];
  caller?: any;
  redis?: any;
  draftContext?: any;
  onEvent?: ((event: string, data: any) => void) | null;
}): Promise<any> {
  const notify = (step: number, icon: string, text: string, pct: number) => {
    if (typeof onEvent === 'function') {
      try { onEvent('step', { step, totalSteps: 4, icon, text, pct }); } catch (_) {}
    }
  };

  const callerSub = caller?.sub || 'guest';
  const toolsExecuted: string[] = [];

  const userProfile = await handleGetMyUserData('profile', callerSub, redis, draftContext);
  const contextSummary = `Người chơi: ${userProfile.nickname || 'Hiệp Sĩ'} (Level ${userProfile.level || 1}, Danh hiệu "${userProfile.title || 'Tân Binh'}", Vàng: ${userProfile.coins || 0}, Chuỗi Streak: ${userProfile.streak || 0} ngày).`;

  notify(1, '🧠', 'Model Brain đang suy nghĩ & hoàn tất câu trả lời trong 1 lượt duy nhất...', 35);

  const brainSystemPrompt = `Bạn là CỐ VẤN GUILD (Guild Companion & Personal Productivity Advisor) - Model Brain (Tư duy sâu) của dự án LevelUp RPG.
Vương quốc LevelUp là hệ thống gamify năng suất và quản lý thói quen cá nhân.
Thông tin hiệp sĩ đang trò chuyện: ${contextSummary}

BẠN VẬN HÀNH TRONG 1 LƯỢT DUY NHẤT (SINGLE-TURN):
Bạn vừa đưa ra lời khuyên/câu trả lời hoàn chỉnh ("reply"), vừa có thể giao các tác vụ tạo mới cho Model Worker thực thi trực tiếp ("workerTasks").
Worker chuyên chạy các công cụ (tools) với tốc độ siêu nhanh (< 1s), không suy nghĩ lan man, chỉ thực thi lệnh.
Danh mục công cụ mà Worker có thể làm:
- create_quest: Tạo nhiệm vụ mới (params: title, targetMinutes, rewardCoins, type, requiresProof, description).
- create_reward: Tạo phần thưởng mới (params: name, price, tier, targetMinutes, description).
- suggest_action_plan: Đề xuất kế hoạch hành động 3 bước trong ngày.
- get_user_profile: Xem hồ sơ chi tiết.
- get_user_quests: Xem danh sách nhiệm vụ.
- get_user_shop: Xem danh sách quà trong shop.
- get_bank_account: Xem tiền gửi tiết kiệm, số nợ hiện tại, lãi suất quỹ, hạn mức vay.
- get_project_knowledge: Tra cứu cơ chế LevelUp (topic: 'quests', 'rewards', 'levels_and_exp', 'bank_and_finance', 'productivity_tips', 'negotiation').

TRẢ VỀ JSON:
{
  "thought": "Phân tích suy nghĩ nội bộ của Brain...",
  "reply": "Nội dung phản hồi hoàn chỉnh cho người dùng (ấm áp, tự nhiên, truyền cảm hứng, dùng đại từ 'mình' - 'bạn')...",
  "workerTasks": [
    { "tool": "create_quest", "params": { "title": "...", "targetMinutes": 25, "rewardCoins": 9, "type": "focus" } }
  ],
  "options": [
    { "id": 1, "label": "Gợi ý tương tác tiếp theo", "argument": "Câu hỏi tiếp theo..." }
  ]
}`;

  let brainAnalysis: any = null;
  try {
    const brainRes = await callAI(
      brainSystemPrompt,
      `Tin nhắn của người dùng: "${message}"\nLịch sử trò chuyện: ${JSON.stringify(history.slice(-4))}`,
      { role: 'brain', thinking: false, temperature: 0.3 }
    );
    brainAnalysis = brainRes;
  } catch (err: any) {
    return runDeterministicAssistant(message, userProfile, callerSub, redis, draftContext);
  }

  const workerResults: any[] = [];
  const actionCards: any[] = [];

  if (Array.isArray(brainAnalysis?.workerTasks) && brainAnalysis.workerTasks.length > 0) {
    notify(2, '⚡', 'Model Worker đang thực thi tác vụ tạo mới siêu tốc...', 70);

    const workerTasks = brainAnalysis.workerTasks.slice(0, 4);
    const taskPromises = workerTasks.map(async (task: any) => {
      const toolName = task.tool || task.action;
      const toolArgs = task.params || task.args || {};
      toolsExecuted.push(toolName);

      try {
        const res = await executeWorkerTool(toolName, toolArgs, { callerSub, redis, draftContext });
        return { toolName, res };
      } catch (toolErr: any) {
        return {
          toolName,
          res: {
            tool: toolName,
            status: 'error',
            error: toolErr.message
          }
        };
      }
    });

    const resolvedTasks = await Promise.all(taskPromises);
    for (const { toolName, res } of resolvedTasks) {
      workerResults.push(res);
      if (toolName === 'create_quest' && res.status === 'success') {
        actionCards.push({ type: 'quest_created', quest: res.data });
      } else if (toolName === 'create_reward' && res.status === 'success') {
        actionCards.push({ type: 'reward_created', reward: res.data });
      }
    }
  }

  notify(3, '✨', 'Model Brain hoàn tất câu trả lời...', 100);

  const reply = brainAnalysis?.reply || brainAnalysis?.directReply || (
    actionCards.length > 0
      ? `Chào bạn! Mình đã tạo ${actionCards.map(a => a.type === 'quest_created' ? `nhiệm vụ "${a.quest?.title}"` : `phần thưởng "${a.reward?.name}"`).join(', ')} thành công. Hãy bấm nhận ngay và bắt đầu nhé! ✨`
      : 'Mình luôn sẵn sàng đồng hành và hỗ trợ bạn trong mọi nhiệm vụ của LevelUp! ✨'
  );

  return {
    reply,
    thought: brainAnalysis?.thought || 'Model Brain đã hoàn tất phân tích trong 1 lượt duy nhất.',
    workerResults,
    suggestedActions: actionCards,
    options: Array.isArray(brainAnalysis?.options) && brainAnalysis.options.length > 0
      ? brainAnalysis.options
      : [
          { id: 1, label: '💡 Hôm nay tôi nên làm gì?', argument: 'Hôm nay tôi nên làm gì?' },
          { id: 2, label: '🪙 Cách kiếm Vàng nhanh', argument: 'Làm sao để kiếm nhiều Vàng và lên cấp?' },
          { id: 3, label: '⚡ Tạo 1 việc tập trung 25p', argument: 'Tạo giúp tôi 1 nhiệm vụ học tập 25 phút' }
        ]
  };
}
