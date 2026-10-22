/**
 * AI Suggestions Engine
 * Deterministic offline suggestions & sanitization filters for quests and shop rewards.
 */

import { clampStr } from './appraisal';

export function getDeterministicQuestSuggestions(
  existingQuests: any[] = [],
  _userCoins: number = 0,
  userLevel: number = 1,
  excludeTitles: string[] = [],
  _refreshCount: number = 0
): any[] {
  const existingNorms = (existingQuests || []).map(q => (q.title || '').toLowerCase().trim());
  const excludeNorms = (excludeTitles || []).map(t => (t || '').toLowerCase().trim());

  const QUEST_PILLARS = [
    {
      id: 'fitness',
      name: 'Vận động thể chất & Sức bền',
      keywords: ['tập', 'chạy', 'đi bộ', 'hít đất', 'squat', 'yoga', 'giãn cơ', 'thể dục', 'gym', 'vận động', 'bơi', 'plank', 'thể thao'],
      items: [
        {
          title: 'Tập 3 hiệp hít đất & squat tại chỗ',
          description: 'Khởi động cơ thể với 15 cái hít đất và 20 cái squat để kích hoạt cơ bắp.',
          type: 'focus',
          targetMinutes: 15,
          rewardCoins: 6,
          isRepeatable: true,
          icon: '🏋️',
          reason: 'Bổ sung vận động thể chất giúp kích hoạt trao đổi chất và xua tan uể oải.'
        },
        {
          title: 'Chạy bộ hoặc đi bộ nhanh 20 phút ngoài trời',
          description: 'Thay giày và vận động ngoài không gian mở để tăng cường sức bền tim mạch.',
          type: 'focus',
          targetMinutes: 20,
          rewardCoins: 8,
          isRepeatable: true,
          icon: '🏃',
          reason: 'Hít thở không khí tự nhiên, giải phóng endorphin tạo hưng phấn tích cực.'
        },
        {
          title: 'Giãn cơ cổ vai gáy & tập yoga 10 phút',
          description: 'Thả lỏng các nhóm cơ bị căng cứng do ngồi máy tính lâu, xoay hông và kéo giãn lưng.',
          type: 'focus',
          targetMinutes: 10,
          rewardCoins: 5,
          isRepeatable: true,
          icon: '🧘',
          reason: 'Phòng ngừa thoái hóa cột sống cổ và giảm căng thẳng tức thì.'
        }
      ]
    },
    {
      id: 'learning',
      name: 'Học tập & Kỹ năng tư duy',
      keywords: ['học', 'từ vựng', 'tiếng anh', 'ngoại ngữ', 'đọc', 'sách', 'tài liệu', 'bài tập', 'khóa học', 'ôn thi', 'lập trình', 'code'],
      items: [
        {
          title: 'Học 15 từ vựng hoặc 1 chủ điểm ngữ pháp mới',
          description: 'Ghi chú và đặt 3 câu ví dụ thực tế với cấu trúc vừa học.',
          type: 'focus',
          targetMinutes: 20,
          rewardCoins: 8,
          isRepeatable: false,
          icon: '🇬🇧',
          reason: 'Bổ sung vốn ngoại ngữ và tri thức liên tục mỗi ngày.'
        },
        {
          title: 'Đọc 10-15 trang sách hoặc tài liệu chuyên môn',
          description: 'Nạp kiến thức mới, gạch chân các ý tưởng tâm đắc để áp dụng vào thực tế.',
          type: 'focus',
          targetMinutes: 20,
          rewardCoins: 7,
          isRepeatable: false,
          icon: '📖',
          reason: 'Nuôi dưỡng thói quen đọc và làm giàu vốn hiểu biết mỗi ngày.'
        },
        {
          title: 'Xem 1 bài giảng TED hoặc video kiến thức chuyên sâu',
          description: 'Ghi chép lại 3 ý tưởng tâm đắc từ diễn giả hoặc chuyên gia.',
          type: 'focus',
          targetMinutes: 15,
          rewardCoins: 6,
          isRepeatable: false,
          icon: '🎓',
          reason: 'Mở rộng tầm nhìn và cập nhật xu hướng hiểu biết thế giới.'
        },
        {
          title: 'Giải 3 bài tập khó hoặc thử thách lập trình',
          description: 'Đào sâu tư duy logic để tìm ra lời giải tối ưu cho bài toán kỹ thuật.',
          type: 'focus',
          targetMinutes: 30,
          rewardCoins: 11,
          isRepeatable: false,
          icon: '🧠',
          reason: 'Rèn luyện khả năng giải quyết vấn đề và chịu đựng áp lực trí tuệ.'
        }
      ]
    },
    {
      id: 'deepwork',
      name: 'Tập trung sâu & Giải quyết việc cốt lõi',
      keywords: ['pomodoro', 'dự án', 'hoàn thành', 'việc khó', 'deep work', 'công việc', 'báo cáo', 'deadline', 'nhiệm vụ'],
      items: [
        {
          title: 'Phiên Pomodoro 25 phút tập trung sâu',
          description: 'Bật chế độ tập trung, cách ly mạng xã hội và dồn 100% năng lượng vào công việc.',
          type: 'focus',
          targetMinutes: 25,
          rewardCoins: 9,
          isRepeatable: false,
          icon: '⏱️',
          reason: 'Thiết lập nhịp tập trung chuẩn không xao nhãng để tạo đà bứt phá.'
        },
        {
          title: 'Xử lý dứt điểm 1 việc khó nhất đang trì hoãn',
          description: 'Áp dụng nguyên tắc Nuốt chửng con ếch (Eat That Frog), tập trung giải quyết ngay.',
          type: 'focus',
          targetMinutes: 30,
          rewardCoins: 12,
          isRepeatable: false,
          icon: '🎯',
          reason: 'Giải phóng áp lực tâm lý từ việc trì hoãn lâu ngày.'
        },
        {
          title: 'Luyện gõ bàn phím 10 ngón tốc độ cao 15 phút',
          description: 'Luyện tập trên Monkeytype hoặc TypeRacer để tăng tốc độ và độ chuẩn xác.',
          type: 'focus',
          targetMinutes: 15,
          rewardCoins: 6,
          isRepeatable: true,
          icon: '⌨️',
          reason: 'Nâng cao năng suất thao tác công việc và phản xạ ngón tay.'
        }
      ]
    },
    {
      id: 'wellness',
      name: 'Phục hồi cơ thể & Không gian sống',
      keywords: ['nước', 'dọn', 'nghỉ', 'bàn làm việc', 'inbox', 'mắt', 'hít thở', 'ngủ', 'ăn', 'rác', 'giường', 'phòng', 'cây'],
      items: [
        {
          title: 'Uống 1 ly nước ấm & hít thở sâu 5 phút',
          description: 'Uống từng ngụm nước ấm và thực hiện 10 nhịp thở bụng sâu đón năng lượng mới.',
          type: 'bounty',
          targetMinutes: 0,
          rewardCoins: 3,
          isRepeatable: true,
          icon: '💧',
          reason: 'Cấp nước cho não bộ và tái lập trạng thái bình tĩnh, cân bằng cơ thể.'
        },
        {
          title: 'Dọn dẹp bàn làm việc & sắp xếp tài liệu ngăn nắp',
          description: 'Lau sạch bụi bàn, cất gọn giấy tờ và chuẩn bị không gian làm việc sạch sẽ.',
          type: 'bounty',
          targetMinutes: 0,
          rewardCoins: 4,
          isRepeatable: true,
          icon: '🧹',
          reason: 'Không gian gọn gàng giúp tâm trí thông thoáng và tập trung cao độ.'
        },
        {
          title: 'Dọn sạch hộp thư đến & hủy đăng ký email rác',
          description: 'Đạt trạng thái Inbox Zero, phân loại thư quan trọng và xóa thư quảng cáo.',
          type: 'bounty',
          targetMinutes: 0,
          rewardCoins: 4,
          isRepeatable: true,
          icon: '📥',
          reason: 'Giảm ô nhiễm thông tin kỹ thuật số giúp đầu óc nhẹ nhõm.'
        },
        {
          title: 'Lập kế hoạch & chọn ra 3 ưu tiên cho ngày mai',
          description: 'Viết ra 3 mục tiêu đinh cho ngày kế tiếp để sáng mai bắt tay vào làm ngay.',
          type: 'focus',
          targetMinutes: 15,
          rewardCoins: 6,
          isRepeatable: true,
          icon: '📝',
          reason: 'Tạo đà chủ động, giúp bạn thức dậy với định hướng rõ ràng.'
        }
      ]
    }
  ];

  // 1. Phân tích số lượng nhiệm vụ người dùng đã có theo từng trụ cột
  const pillarStats = QUEST_PILLARS.map(pillar => {
    let count = 0;
    existingNorms.forEach(title => {
      if (pillar.keywords.some(kw => title.includes(kw))) {
        count++;
      }
    });
    return { pillar, count };
  });

  // 2. Sắp xếp các trụ cột theo thứ tự thiếu nhất (ít nhiệm vụ nhất lên đầu)
  pillarStats.sort((a, b) => a.count - b.count);

  const selected: any[] = [];
  const pickedTitles = new Set<string>();

  // 3. Chọn từ các trụ cột đang thiếu nhất (nhu cầu còn thiếu)
  for (const stat of pillarStats) {
    if (selected.length >= 3) break;
    const available = stat.pillar.items.filter(item => {
      const norm = item.title.toLowerCase().trim();
      const alreadyExists = existingNorms.some(t => t.includes(norm) || norm.includes(t));
      const alreadyExcluded = excludeNorms.some(t => t.includes(norm) || norm.includes(t));
      const alreadyPicked = pickedTitles.has(norm);
      return !alreadyExists && !alreadyExcluded && !alreadyPicked;
    });

    if (available.length > 0) {
      const best = (userLevel <= 2 && available.some(i => i.type === 'bounty' || i.targetMinutes <= 15))
        ? (available.find(i => i.targetMinutes <= 15) || available[0])
        : available[0];
      selected.push(best);
      pickedTitles.add(best.title.toLowerCase().trim());
    }
  }

  // 4. Nếu vẫn chưa đủ 3 gợi ý, lấy bổ sung từ các mục chưa trùng
  if (selected.length < 3) {
    const allPoolItems = QUEST_PILLARS.flatMap(p => p.items);
    for (const item of allPoolItems) {
      if (selected.length >= 3) break;
      const norm = item.title.toLowerCase().trim();
      const alreadyExists = existingNorms.some(t => t.includes(norm) || norm.includes(t));
      const alreadyExcluded = excludeNorms.some(t => t.includes(norm) || norm.includes(t));
      const alreadyPicked = pickedTitles.has(norm);
      if (!alreadyExists && !alreadyExcluded && !alreadyPicked) {
        selected.push(item);
        pickedTitles.add(norm);
      }
    }
  }

  // 5. Trường hợp ngoại lệ nếu kho trống
  if (selected.length === 0) {
    return QUEST_PILLARS[0].items.slice(0, 3);
  }

  return selected.slice(0, 3);
}

export function getDeterministicRewardSuggestions(
  existingRewards: any[] = [],
  activeQuests: any[] = [],
  userCoins: number = 0,
  excludeNames: string[] = [],
  _refreshCount: number = 0
): any[] {
  const existingNames = (existingRewards || []).map(r => (r.name || '').toLowerCase().trim());
  const activeQuestNorms = (activeQuests || []).map(q => (q.title || '').toLowerCase().trim());
  const excludeNorms = (excludeNames || []).map(n => (n || '').toLowerCase().trim());

  const REWARD_PILLARS = [
    {
      id: 'treat',
      name: 'Ẩm thực & Thức uống thơm ngon',
      keywords: ['cà phê', 'trà sữa', 'bánh', 'ăn', 'uống', 'kem', 'nước ép', 'tráng miệng'],
      items: [
        {
          name: 'Thưởng thức 1 ly cà phê / trà thảo mộc tự pha',
          description: 'Nhâm nhi tách đồ uống thơm ngon trong 15 phút tĩnh lặng nạp năng lượng.',
          price: 20,
          targetMinutes: 15,
          tier: 'common',
          icon: '☕',
          reason: 'Khoảng lặng êm dịu tái tạo sự tỉnh táo mà không làm ngắt mạch năng suất.'
        },
        {
          name: 'Tự thưởng 1 ly trà sữa / nước ép hoa quả mát lạnh',
          description: 'Order một ly đồ uống mát lạnh yêu thích giải nhiệt sau giờ làm việc căng thẳng.',
          price: 30,
          targetMinutes: 20,
          tier: 'common',
          icon: '🧋',
          reason: 'Vị ngọt thanh mát kích thích dopamine tự nhiên, mang lại cảm giác sảng khoái.'
        },
        {
          name: 'Thưởng thức món bánh ngọt hoặc kem tươi yêu thích',
          description: 'Nhâm nhi một chiếc bánh tart, bánh sừng bò hoặc ly kem mát lạnh hảo hạng.',
          price: 25,
          targetMinutes: 15,
          tier: 'common',
          icon: '🍦',
          reason: 'Phần thưởng ngọt ngào xua tan mệt mỏi sau khi hoàn thành chuỗi việc.'
        }
      ]
    },
    {
      id: 'gaming_entertainment',
      name: 'Giải trí kỹ thuật số & Gaming',
      keywords: ['game', 'chơi game', 'anime', 'phim', 'video', 'truyện', 'lướt web', 'youtube', 'podcast'],
      items: [
        {
          name: '30 phút chơi tựa game yêu thích không áy náy',
          description: 'Thỏa sức phiêu lưu giải trí trong thế giới game sau chuỗi nhiệm vụ vất vả.',
          price: 35,
          targetMinutes: 30,
          tier: 'rare',
          icon: '🎮',
          reason: 'Phần thưởng xứng đáng cho những nỗ lực kỷ luật đã bỏ ra.'
        },
        {
          name: 'Xem 1 tập phim anime hoặc series phim mới',
          description: 'Thả lỏng cơ thể trên ghế sofa và thưởng thức một tập phim hấp dẫn.',
          price: 45,
          targetMinutes: 45,
          tier: 'rare',
          icon: '🎬',
          reason: 'Đắm chìm vào câu chuyện giải trí để khép lại một ngày học tập hiệu quả.'
        },
        {
          name: '20 phút xem video giải trí hoặc podcast hài hước',
          description: 'Bật video của sáng tạo nội dung yêu thích và cười sảng khoái.',
          price: 20,
          targetMinutes: 20,
          tier: 'common',
          icon: '📺',
          reason: 'Tiếng cười giúp giảm lượng cortisol và giải tỏa căng thẳng thần kinh.'
        }
      ]
    },
    {
      id: 'self_care',
      name: 'Thư giãn thể chất & Tự chăm sóc',
      keywords: ['tắm', 'ngủ', 'chợp mắt', 'dạo', 'hóng mát', 'nhạc', 'thư giãn', 'nghỉ ngơi'],
      items: [
        {
          name: 'Tắm nước nóng thư giãn xua tan mệt mỏi',
          description: 'Ngâm mình dưới làn nước ấm, thả lỏng toàn bộ cơ bắp và tinh thần.',
          price: 25,
          targetMinutes: 20,
          tier: 'common',
          icon: '🛁',
          reason: 'Kích thích tuần hoàn máu và giúp giấc ngủ sâu hơn.'
        },
        {
          name: 'Chợp mắt nghỉ trưa 20 phút phục hồi năng lượng',
          description: 'Một giấc ngủ ngắn (Power Nap) đúng nhịp sinh học giúp khởi động lại não bộ.',
          price: 20,
          targetMinutes: 20,
          tier: 'common',
          icon: '😴',
          reason: 'Nạp đầy năng lượng cho buổi chiều làm việc minh mẫn.'
        },
        {
          name: 'Đi dạo hóng mát ngoài trời không mang điện thoại',
          description: 'Tản bộ 20 phút trong công viên hoặc ngắm hoàng hôn để tâm trí tĩnh lặng.',
          price: 20,
          targetMinutes: 20,
          tier: 'common',
          icon: '🌅',
          reason: 'Tách biệt khỏi ánh sáng xanh và tái kết nối với thế giới xung quanh.'
        },
        {
          name: 'Nghe trọn vẹn 1 album nhạc acoustic hoặc lofi thư giãn',
          description: 'Đeo tai nghe và thả hồn vào những giai điệu yêu thích giúp xua tan căng thẳng.',
          price: 25,
          targetMinutes: 25,
          tier: 'common',
          icon: '🎧',
          reason: 'Nuôi dưỡng cảm xúc tích cực và xoa dịu tinh thần sau giờ làm việc.'
        }
      ]
    },
    {
      id: 'milestone',
      name: 'Trải nghiệm & Kết nối xã hội',
      keywords: ['bạn bè', 'sách', 'mua', 'quà', 'sở thích', 'đi chơi', 'dạo phố'],
      items: [
        {
          name: 'Một buổi tối dạo phố / gặp gỡ tán gẫu cùng bạn bè',
          description: 'Tự thưởng buổi đi chơi thoải mái bên những người bạn thân thiết.',
          price: 75,
          targetMinutes: 90,
          tier: 'epic',
          icon: '🌟',
          reason: 'Cân bằng giữa phát triển cá nhân và các mối quan hệ xã hội ấm áp.'
        },
        {
          name: 'Mua một cuốn sách mới hoặc món đồ yêu thích',
          description: 'Đầu tư cho bản thân một món quà vật lý lưu giữ kỷ niệm kỷ luật.',
          price: 80,
          targetMinutes: 0,
          tier: 'epic',
          icon: '🎁',
          reason: 'Cột mốc hữu hình đánh dấu sự kiên trì vượt trội của bạn.'
        },
        {
          name: 'Dành 45 phút cho sở thích cá nhân bỏ quên',
          description: 'Chăm sóc bể cá, xếp lego, tỉa cây cảnh hoặc làm đồ thủ công.',
          price: 40,
          targetMinutes: 45,
          tier: 'rare',
          icon: '🪴',
          reason: 'Kích thích niềm say mê tự nhiên bên ngoài công việc.'
        }
      ]
    }
  ];

  // 1. Phân tích các loại phần thưởng hiện có trong Cửa Hàng
  const pillarStats = REWARD_PILLARS.map(pillar => {
    let count = 0;
    existingNames.forEach(name => {
      if (pillar.keywords.some(kw => name.includes(kw))) {
        count++;
      }
    });

    // Nếu người dùng đang làm việc căng thẳng, tăng ưu tiên cho phục hồi/tự chăm sóc
    const isStressful = activeQuestNorms.some(t => t.includes('án') || t.includes('khó') || t.includes('pomodoro') || t.includes('học') || t.includes('tập'));
    if (pillar.id === 'self_care' && isStressful) {
      count = Math.max(0, count - 1);
    }

    return { pillar, count };
  });

  // 2. Sắp xếp theo thứ tự thiếu nhất
  pillarStats.sort((a, b) => a.count - b.count);

  const selected: any[] = [];
  const pickedNames = new Set<string>();

  // 3. Chọn quà từ các nhóm đang thiếu nhất
  for (const stat of pillarStats) {
    if (selected.length >= 3) break;
    const available = stat.pillar.items.filter(item => {
      const norm = item.name.toLowerCase().trim();
      const alreadyExists = existingNames.some(n => n.includes(norm) || norm.includes(n));
      const alreadyExcluded = excludeNorms.some(n => n.includes(norm) || norm.includes(n));
      const alreadyPicked = pickedNames.has(norm);
      return !alreadyExists && !alreadyExcluded && !alreadyPicked;
    });

    if (available.length > 0) {
      // Ưu tiên quà giá vừa phải nếu người chơi ít Vàng (< 30)
      const affordable = (userCoins < 30) ? available.filter(i => i.price <= 30) : available;
      const pick = affordable[0] || available[0];
      selected.push(pick);
      pickedNames.add(pick.name.toLowerCase().trim());
    }
  }

  // 4. Bổ sung nếu chưa đủ 3
  if (selected.length < 3) {
    const allPoolItems = REWARD_PILLARS.flatMap(p => p.items);
    for (const item of allPoolItems) {
      if (selected.length >= 3) break;
      const norm = item.name.toLowerCase().trim();
      const alreadyExists = existingNames.some(n => n.includes(norm) || norm.includes(n));
      const alreadyExcluded = excludeNorms.some(n => n.includes(norm) || norm.includes(n));
      const alreadyPicked = pickedNames.has(norm);
      if (!alreadyExists && !alreadyExcluded && !alreadyPicked) {
        selected.push(item);
        pickedNames.add(norm);
      }
    }
  }

  if (selected.length === 0) {
    return REWARD_PILLARS[0].items.slice(0, 3);
  }

  return selected.slice(0, 3);
}

export function sanitizeQuestSuggestions(suggestions: any, existingQuests: any[] = []): any[] {
  if (!Array.isArray(suggestions)) return getDeterministicQuestSuggestions(existingQuests);
  const existingTitles = (existingQuests || []).map(q => (q.title || '').toLowerCase().trim());
  const clean: any[] = [];

  for (const s of suggestions) {
    if (!s || typeof s !== 'object') continue;
    const title = clampStr(s.title || s.name || '', 120);
    if (!title) continue;
    const norm = title.toLowerCase();
    if (existingTitles.includes(norm)) continue;

    const type = (s.type === 'bounty' || s.targetMinutes === 0) ? 'bounty' : 'focus';
    let targetMinutes = parseInt(s.targetMinutes, 10);
    if (isNaN(targetMinutes) || targetMinutes < 0) targetMinutes = (type === 'focus' ? 25 : 0);
    if (type === 'bounty') targetMinutes = 0;
    if (targetMinutes > 180) targetMinutes = 180;

    let rewardCoins = parseInt(s.rewardCoins, 10);
    if (isNaN(rewardCoins) || rewardCoins <= 0) {
      rewardCoins = (type === 'focus') ? Math.max(5, Math.round(targetMinutes * 0.38)) : 4;
    }
    rewardCoins = Math.min(100, Math.max(1, rewardCoins));

    clean.push({
      title,
      description: clampStr(s.description || '', 300),
      type,
      targetMinutes,
      rewardCoins,
      isRepeatable: Boolean(s.isRepeatable),
      icon: clampStr(s.icon || (type === 'focus' ? '🎯' : '🧹'), 10),
      reason: clampStr(s.reason || 'Gợi ý phù hợp với nhịp độ làm việc của bạn.', 250)
    });

    if (clean.length >= 4) break;
  }

  if (clean.length === 0) {
    return getDeterministicQuestSuggestions(existingQuests);
  }
  return clean;
}

export function sanitizeRewardSuggestions(suggestions: any, existingRewards: any[] = []): any[] {
  if (!Array.isArray(suggestions)) return getDeterministicRewardSuggestions(existingRewards);
  const existingNames = (existingRewards || []).map(r => (r.name || '').toLowerCase().trim());
  const clean: any[] = [];

  for (const s of suggestions) {
    if (!s || typeof s !== 'object') continue;
    const name = clampStr(s.name || s.title || '', 120);
    if (!name) continue;
    const norm = name.toLowerCase();
    if (existingNames.includes(norm)) continue;

    let price = parseInt(s.price, 10);
    if (isNaN(price) || price <= 0) price = 30;
    price = Math.min(300, Math.max(5, price));

    let targetMinutes = parseInt(s.targetMinutes, 10);
    if (isNaN(targetMinutes) || targetMinutes < 0) targetMinutes = 0;
    if (targetMinutes > 240) targetMinutes = 240;

    let tier = s.tier;
    if (!['common', 'rare', 'epic'].includes(tier)) {
      tier = price < 30 ? 'common' : (price < 60 ? 'rare' : 'epic');
    }

    clean.push({
      name,
      description: clampStr(s.description || '', 300),
      price,
      targetMinutes,
      tier,
      icon: clampStr(s.icon || '🎁', 10),
      reason: clampStr(s.reason || 'Tự thưởng lành mạnh để tái tạo năng lượng.', 250)
    });

    if (clean.length >= 4) break;
  }

  if (clean.length === 0) {
    return getDeterministicRewardSuggestions(existingRewards);
  }
  return clean;
}
