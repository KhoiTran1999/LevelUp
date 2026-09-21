// =============================================================================
// 8. STRICT AI ARBITER EVALUATION & DEBATE
// =============================================================================
let currentPendingVerdict = null;
let currentDebateHistory = [];
let currentEditingQuestId = null;
let currentEditingRewardId = null;
// =============================================================================
// QUICK SMART AUTO-SUGGESTIONS (Nhiệm Vụ & Phần Thưởng Thông Minh)
// =============================================================================
let currentQuestSuggestions = [];
let currentRewardSuggestions = [];
let isFetchingQuestSuggestions = false;
let isFetchingRewardSuggestions = false;

function getClientQuestSuggestionsFallback(customQuests = null, customCoins = null, customLevel = null) {
  const quests = Array.isArray(customQuests) ? customQuests : (Array.isArray(appState?.quests) ? appState.quests : []);
  const existingNorms = quests.map(q => (q.title || '').toLowerCase().trim());
  const userCoins = customCoins !== null ? customCoins : (parseInt(appState?.profile?.coins, 10) || 0);
  const userLevel = customLevel !== null ? customLevel : (parseInt(appState?.profile?.level, 10) || 1);

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

  // 2. Sắp xếp theo trụ cột thiếu nhất (nhu cầu còn thiếu)
  pillarStats.sort((a, b) => a.count - b.count);

  const selected = [];
  const pickedTitles = new Set();

  for (const stat of pillarStats) {
    if (selected.length >= 3) break;
    const available = stat.pillar.items.filter(item => {
      const norm = item.title.toLowerCase().trim();
      const alreadyExists = existingNorms.some(t => t.includes(norm) || norm.includes(t));
      const alreadyPicked = pickedTitles.has(norm);
      return !alreadyExists && !alreadyPicked;
    });

    if (available.length > 0) {
      const best = (userLevel <= 2 && available.some(i => i.type === 'bounty' || i.targetMinutes <= 15))
        ? (available.find(i => i.targetMinutes <= 15) || available[0])
        : available[0];
      selected.push(best);
      pickedTitles.add(best.title.toLowerCase().trim());
    }
  }

  if (selected.length < 3) {
    const allPoolItems = QUEST_PILLARS.flatMap(p => p.items);
    for (const item of allPoolItems) {
      if (selected.length >= 3) break;
      const norm = item.title.toLowerCase().trim();
      const alreadyExists = existingNorms.some(t => t.includes(norm) || norm.includes(t));
      const alreadyPicked = pickedTitles.has(norm);
      if (!alreadyExists && !alreadyPicked) {
        selected.push(item);
        pickedTitles.add(norm);
      }
    }
  }

  if (selected.length === 0) {
    return QUEST_PILLARS[0].items.slice(0, 3);
  }

  return selected.slice(0, 3);
}

function getClientRewardSuggestionsFallback(customRewards = null, customQuests = null, customCoins = null) {
  const shop = Array.isArray(customRewards) ? customRewards : (Array.isArray(appState?.shopItems) ? appState.shopItems : []);
  const existingNames = shop.map(s => (s.name || '').toLowerCase().trim());
  const activeQuests = Array.isArray(customQuests) ? customQuests : (Array.isArray(appState?.quests) ? appState.quests.filter(q => q.status === 'active') : []);
  const activeQuestNorms = activeQuests.map(q => (q.title || '').toLowerCase().trim());
  const userCoins = customCoins !== null ? customCoins : (parseInt(appState?.profile?.coins, 10) || 0);

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

  const pillarStats = REWARD_PILLARS.map(pillar => {
    let count = 0;
    existingNames.forEach(name => {
      if (pillar.keywords.some(kw => name.includes(kw))) {
        count++;
      }
    });

    const isStressful = activeQuestNorms.some(t => t.includes('án') || t.includes('khó') || t.includes('pomodoro') || t.includes('học') || t.includes('tập'));
    if (pillar.id === 'self_care' && isStressful) {
      count = Math.max(0, count - 1);
    }

    return { pillar, count };
  });

  pillarStats.sort((a, b) => a.count - b.count);

  const selected = [];
  const pickedNames = new Set();

  for (const stat of pillarStats) {
    if (selected.length >= 3) break;
    const available = stat.pillar.items.filter(item => {
      const norm = item.name.toLowerCase().trim();
      const alreadyExists = existingNames.some(n => n.includes(norm) || norm.includes(n));
      const alreadyPicked = pickedNames.has(norm);
      return !alreadyExists && !alreadyPicked;
    });

    if (available.length > 0) {
      const affordable = (userCoins < 30) ? available.filter(i => i.price <= 30) : available;
      const pick = affordable[0] || available[0];
      selected.push(pick);
      pickedNames.add(pick.name.toLowerCase().trim());
    }
  }

  if (selected.length < 3) {
    const allPoolItems = REWARD_PILLARS.flatMap(p => p.items);
    for (const item of allPoolItems) {
      if (selected.length >= 3) break;
      const norm = item.name.toLowerCase().trim();
      const alreadyExists = existingNames.some(n => n.includes(norm) || norm.includes(n));
      const alreadyPicked = pickedNames.has(norm);
      if (!alreadyExists && !alreadyPicked) {
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

function renderQuestSuggestions(suggestions) {
  const container = document.getElementById('quest-suggestions-list');
  if (!container) return;
  container.innerHTML = '';

  const items = (suggestions || []).slice(0, 3);
  if (items.length === 0) {
    container.innerHTML = '<div class="text-[11px] text-slate-400 py-1 text-center italic">Đã có đủ các nhiệm vụ cân bằng!</div>';
    return;
  }

  items.forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = 'suggestion-card quest-suggest';
    card.setAttribute('data-index', idx);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    card.innerHTML = `
      <span class="text-sm sm:text-base shrink-0 select-none">${s.icon || '🎯'}</span>
      <span class="font-medium text-xs text-slate-800 dark:text-slate-100 truncate flex-1 min-w-0" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</span>
    `;

    const triggerApply = () => applyQuestSuggestion(s, card);
    card.addEventListener('click', triggerApply);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerApply();
      }
    });

    container.appendChild(card);
  });
}

function applyQuestSuggestion(s, activeCard) {
  if (typeof sfx?.playClick === 'function') sfx.playClick();
  const titleInput = document.getElementById('input-quest-title');
  const descInput = document.getElementById('input-quest-desc');
  const durationInput = document.getElementById('input-quest-duration');
  const estimateInput = document.getElementById('input-quest-estimate');

  if (titleInput) titleInput.value = s.title || '';
  if (descInput) descInput.value = s.description || '';
  if (durationInput) durationInput.value = (s.type === 'bounty' || s.targetMinutes === 0) ? '' : (s.targetMinutes || 25);
  if (estimateInput) estimateInput.value = s.rewardCoins || '';

  const radioValue = s.isRepeatable ? 'repeatable' : 'once';
  const radio = document.querySelector(`input[name="quest-repeat"][value="${radioValue}"]`);
  if (radio) radio.checked = true;

  document.querySelectorAll('#quest-suggestions-list .suggestion-card').forEach(c => {
    c.classList.remove('suggestion-card-active');
  });
  if (activeCard) {
    activeCard.classList.add('suggestion-card-active');
  }

  showToast(`Đã chọn: "${s.title}"`, 'info');
}

function renderRewardSuggestions(suggestions) {
  const container = document.getElementById('reward-suggestions-list');
  if (!container) return;
  container.innerHTML = '';

  const items = (suggestions || []).slice(0, 3);
  if (items.length === 0) {
    container.innerHTML = '<div class="text-[11px] text-slate-400 py-1 text-center italic">Đã có đủ các phần thưởng phong phú!</div>';
    return;
  }

  items.forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = 'suggestion-card reward-suggest';
    card.setAttribute('data-index', idx);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    card.innerHTML = `
      <span class="text-sm sm:text-base shrink-0 select-none">${s.icon || '🎁'}</span>
      <span class="font-medium text-xs text-slate-800 dark:text-slate-100 truncate flex-1 min-w-0" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</span>
    `;

    const triggerApply = () => applyRewardSuggestion(s, card);
    card.addEventListener('click', triggerApply);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerApply();
      }
    });

    container.appendChild(card);
  });
}

function applyRewardSuggestion(s, activeCard) {
  if (typeof sfx?.playClick === 'function') sfx.playClick();
  const nameInput = document.getElementById('input-reward-name');
  const descInput = document.getElementById('input-reward-desc');
  const estimateInput = document.getElementById('input-reward-estimate');
  const durationInput = document.getElementById('input-reward-duration');

  if (nameInput) nameInput.value = s.name || '';
  if (descInput) descInput.value = s.description || '';
  if (estimateInput) estimateInput.value = s.price || '';
  if (durationInput) durationInput.value = (s.targetMinutes && s.targetMinutes > 0) ? s.targetMinutes : '';

  document.querySelectorAll('#reward-suggestions-list .suggestion-card').forEach(c => {
    c.classList.remove('suggestion-card-active');
  });
  if (activeCard) {
    activeCard.classList.add('suggestion-card-active');
  }

  showToast(`Đã chọn: "${s.name}"`, 'info');
}

function loadQuestSuggestions() {
  const container = document.getElementById('quest-suggestions-list');
  if (!container) return;

  const existingQuests = Array.isArray(appState?.quests) ? appState.quests : [];
  const userCoins = parseInt(appState?.profile?.coins, 10) || 0;
  const userLevel = parseInt(appState?.profile?.level, 10) || 1;

  currentQuestSuggestions = getClientQuestSuggestionsFallback(existingQuests, userCoins, userLevel);
  renderQuestSuggestions(currentQuestSuggestions);
}

function loadRewardSuggestions() {
  const container = document.getElementById('reward-suggestions-list');
  if (!container) return;

  const existingRewards = Array.isArray(appState?.shopItems) ? appState.shopItems : [];
  const activeQuests = (appState?.quests || []).filter(q => q.status === 'active');
  const userCoins = parseInt(appState?.profile?.coins, 10) || 0;

  currentRewardSuggestions = getClientRewardSuggestionsFallback(existingRewards, activeQuests, userCoins);
  renderRewardSuggestions(currentRewardSuggestions);
}

window.loadQuestSuggestions = loadQuestSuggestions;
window.loadRewardSuggestions = loadRewardSuggestions;
window.applyQuestSuggestion = applyQuestSuggestion;
window.applyRewardSuggestion = applyRewardSuggestion;

async function submitQuestToAI() {
  const title = document.getElementById('input-quest-title').value.trim();
  const desc = document.getElementById('input-quest-desc').value.trim();
  const estimate = parseInt(document.getElementById('input-quest-estimate').value, 10) || 0;
  let duration = parseInt(document.getElementById('input-quest-duration')?.value, 10) || 0;
  if (duration <= 0) {
    const textDur = extractDurationFromText(`${title} ${desc}`);
    if (textDur > 0) duration = textDur;
  }
  const isRepeatable = document.querySelector('input[name="quest-repeat"]:checked')?.value === 'repeatable';

  if (!title) {
    showToast('Vui lòng nhập tên nhiệm vụ!', 'error');
    return;
  }

  document.getElementById('quest-form-step').classList.add('hidden');
  document.getElementById('quest-evaluating-step').classList.remove('hidden');

  try {
    const currentRewards = (appState.shopItems || []).slice(0, 10).map(item => ({
      name: item.name,
      price: item.price,
      tier: item.tier
    }));

    const res = await fetch('/api/ai', {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'evaluate_quest',
        payload: {
          title,
          description: desc,
          isRepeatable: Boolean(isRepeatable),
          userEstimateCoins: estimate,
          userEstimateDuration: duration,
          currentRewards,
          userCoins: appState.profile?.coins || 0
        }
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.details || err.error || 'AI Server Error');
    }

    const data = await res.json();
    const finalTitle = (data.title && typeof data.title === 'string') ? data.title.trim() : title;
    const finalDesc = (data.description !== undefined && typeof data.description === 'string') ? data.description.trim() : desc;
    const isModified = Boolean(data.isModified) || (finalTitle.toLowerCase() !== title.trim().toLowerCase());

    currentPendingVerdict = {
      title: finalTitle,
      description: finalDesc,
      isModified,
      modificationReason: data.modificationReason || (isModified ? 'AI đã điều chỉnh lại tên và khối lượng công việc để đảm bảo tính khả thi và hiệu quả tập trung.' : ''),
      type: data.type || 'focus',
      rewardCoins: data.rewardCoins || 10,
      targetMinutes: data.targetMinutes !== undefined ? Number(data.targetMinutes) : (data.type === 'bounty' ? 0 : 25),
      signature: data.signature || '',
      rank: data.rank || calculateRank(data.rewardCoins || 10),
      verdict: data.verdict || 'Nhiệm vụ hợp lý, đã được tính mức thưởng chuẩn.',
      advice: data.advice || 'Tập trung hoàn thành từng bước một.',
      icon: (data.icon && typeof data.icon === 'string') ? data.icon.trim() : '',
      isRepeatable: Boolean(isRepeatable),
      requiresProof: Boolean(data.requiresProof),
      proofGuidance: data.proofGuidance || ''
    };
    currentDebateHistory = [];

    renderVerdictStep();
  } catch (err) {
    showToast('Không thể kết nối với AI: ' + err.message, 'error');
    document.getElementById('quest-evaluating-step').classList.add('hidden');
    document.getElementById('quest-form-step').classList.remove('hidden');
  }
}

function updateVerdictDisplay() {
  if (!currentPendingVerdict) return;

  const rankBadge = document.getElementById('verdict-rank');
  if (rankBadge) {
    rankBadge.textContent = `HẠNG ${currentPendingVerdict.rank}`;
    rankBadge.className = `rank-badge-${currentPendingVerdict.rank} text-xs font-mono font-black px-2.5 py-1 rounded-lg hidden`;
  }

  const typeBadge = document.getElementById('verdict-type-badge');
  const timeBox = document.getElementById('verdict-target-time-box');
  const minutesEl = document.getElementById('verdict-minutes');
  const lockedTimeBox = document.getElementById('verdict-locked-time-box');

  if (currentPendingVerdict.type === 'focus') {
    if (typeBadge) {
      typeBadge.textContent = '⏳ HẸN GIỜ TẬP TRUNG';
      typeBadge.className = 'text-xs px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/30';
    }
    if (timeBox) timeBox.classList.remove('hidden');
    if (minutesEl) minutesEl.textContent = `${currentPendingVerdict.targetMinutes} Phút`;
    if (lockedTimeBox) lockedTimeBox.classList.remove('hidden');
  } else {
    if (typeBadge) {
      typeBadge.textContent = '⚡ KHÔNG CẦN BẤM GIỜ';
      typeBadge.className = 'text-xs px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30';
    }
    if (timeBox) timeBox.classList.add('hidden');
    if (lockedTimeBox) lockedTimeBox.classList.add('hidden');
  }

  const repeatText = document.getElementById('verdict-repeat-text');
  if (repeatText) {
    repeatText.textContent = currentPendingVerdict.isRepeatable ? '🔁 Lặp lại' : '🎯 Làm một lần';
  }

  const proofBadge = document.getElementById('verdict-proof-badge');
  const proofGuidanceBox = document.getElementById('verdict-proof-guidance-box');
  const proofGuidanceText = document.getElementById('verdict-proof-guidance-text');

  if (currentPendingVerdict.requiresProof) {
    if (proofBadge) {
      proofBadge.textContent = '📸 Cần chụp ảnh';
      proofBadge.className = 'font-bold text-xs px-2 py-0.5 rounded-lg border bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    }
    if (proofGuidanceBox && proofGuidanceText) {
      if (currentPendingVerdict.proofGuidance) {
        proofGuidanceText.textContent = currentPendingVerdict.proofGuidance;
        proofGuidanceBox.classList.remove('hidden');
      } else {
        proofGuidanceBox.classList.add('hidden');
      }
    }
  } else {
    if (proofBadge) {
      proofBadge.textContent = '⚡ Không cần chụp ảnh';
      proofBadge.className = 'font-bold text-xs px-2 py-0.5 rounded-lg border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    }
    if (proofGuidanceBox) {
      proofGuidanceBox.classList.add('hidden');
    }
  }

  const btnProofSuggest = document.getElementById('btn-suggest-proof');
  if (btnProofSuggest) {
    if (currentPendingVerdict.requiresProof) {
      btnProofSuggest.textContent = '📸 Xin miễn chụp ảnh';
      btnProofSuggest.setAttribute('data-suggest', 'Công việc này mình làm trên điện thoại hoặc không tiện chụp ảnh thực tế, bạn giúp mình miễn chụp ảnh được không?');
    } else {
      btnProofSuggest.textContent = '📸 Thêm yêu cầu chụp ảnh';
      btnProofSuggest.setAttribute('data-suggest', 'Mình muốn thêm yêu cầu chụp ảnh bằng chứng khi hoàn thành để tự rèn luyện kỷ luật hơn, bạn cập nhật giúp mình nhé!');
    }
  }

  const verdictCoins = document.getElementById('verdict-coins');
  if (verdictCoins) verdictCoins.innerHTML = `${COIN_ICON_HTML} ${currentPendingVerdict.rewardCoins} Vàng`;

  // AI-locked display card
  const lockedIcon = document.getElementById('verdict-locked-icon');
  if (lockedIcon) lockedIcon.textContent = getQuestIcon(currentPendingVerdict);

  const lockedTitle = document.getElementById('verdict-locked-title');
  if (lockedTitle) lockedTitle.textContent = currentPendingVerdict.title;

  const lockedDesc = document.getElementById('verdict-locked-desc');
  const lockedDescContainer = document.getElementById('verdict-locked-desc-container');
  if (lockedDesc && lockedDescContainer) {
    if (currentPendingVerdict.description) {
      lockedDesc.textContent = currentPendingVerdict.description;
      lockedDescContainer.classList.remove('hidden');
    } else {
      lockedDescContainer.classList.add('hidden');
    }
  }

  const lockedCoins = document.getElementById('verdict-locked-coins');
  if (lockedCoins) lockedCoins.innerHTML = `${COIN_ICON_HTML} ${currentPendingVerdict.rewardCoins} Vàng`;

  const lockedMinutes = document.getElementById('verdict-locked-minutes');
  if (lockedMinutes) lockedMinutes.textContent = `${currentPendingVerdict.targetMinutes} Phút`;

  const speechEl = document.getElementById('verdict-speech');
  if (speechEl && currentPendingVerdict.verdict) {
    speechEl.textContent = `"${currentPendingVerdict.verdict}"`;
  }
}

function renderVerdictStep() {
  document.getElementById('quest-evaluating-step').classList.add('hidden');
  document.getElementById('quest-verdict-step').classList.remove('hidden');

  updateVerdictDisplay();

  document.getElementById('verdict-speech').textContent = `"${currentPendingVerdict.verdict}"`;
  document.getElementById('verdict-advice').textContent = currentPendingVerdict.advice;

  // AI Modification Notice
  const modNotice = document.getElementById('verdict-modified-notice');
  const modReason = document.getElementById('verdict-modified-reason');
  if (modNotice && modReason) {
    if (currentPendingVerdict.isModified && currentPendingVerdict.modificationReason) {
      modNotice.classList.remove('hidden');
      modReason.textContent = currentPendingVerdict.modificationReason;
    } else {
      modNotice.classList.add('hidden');
    }
  }

  document.getElementById('debate-container').classList.add('hidden');
  document.getElementById('debate-chat-logs').innerHTML = '';
}

function openQuestRenegotiateModal(questId) {
  const quest = appState.quests.find(q => q.id === questId);
  if (!quest) return;

  if (quest.status === 'completed' && !quest.isRepeatable) {
    showToast('Nhiệm vụ đã hoàn thành không thể thương lượng lại.', 'info');
    return;
  }

  if (activeFocusQuest && activeFocusQuest.id === quest.id && isFocusRunning) {
    showToast('Vui lòng tạm dừng phiên tập trung trước khi thương lượng lại nhiệm vụ này.', 'info');
    return;
  }

  currentEditingQuestId = quest.id;
  currentPendingVerdict = {
    title: quest.title,
    description: quest.description || '',
    type: quest.type || 'focus',
    rank: quest.rank || calculateRank(quest.rewardCoins || 10),
    rewardCoins: quest.rewardCoins || 10,
    targetMinutes: quest.targetMinutes !== undefined ? Number(quest.targetMinutes) : (quest.type === 'bounty' ? 0 : 25),
    signature: quest.signature || '',
    advice: quest.advice || 'Tập trung hoàn thành từng bước một.',
    icon: quest.icon || getQuestIcon(quest),
    verdict: quest.verdict || 'Nhiệm vụ hợp lý, đã được tính mức thưởng chuẩn.',
    isRepeatable: Boolean(quest.isRepeatable),
    requiresProof: Boolean(quest.requiresProof),
    proofGuidance: quest.proofGuidance || ''
  };
  currentDebateHistory = [];

  const titleEl = document.getElementById('modal-quest-title');
  const subEl = document.getElementById('modal-quest-subtitle');
  if (titleEl) titleEl.textContent = 'THƯƠNG LƯỢNG LẠI NHIỆM VỤ';
  if (subEl) subEl.textContent = 'Trực tiếp trao đổi với AI để điều chỉnh độ khó, thời gian hoặc phần thưởng';

  const acceptBtn = document.getElementById('btn-accept-verdict');
  if (acceptBtn) acceptBtn.textContent = '✓ Cập Nhật Nhiệm Vụ';

  document.getElementById('quest-form-step').classList.add('hidden');
  document.getElementById('quest-evaluating-step').classList.add('hidden');
  document.getElementById('quest-verdict-step').classList.remove('hidden');

  updateVerdictDisplay();
  document.getElementById('verdict-speech').textContent = `"${currentPendingVerdict.verdict}"`;
  document.getElementById('verdict-advice').textContent = currentPendingVerdict.advice;

  const modNotice = document.getElementById('verdict-modified-notice');
  if (modNotice) modNotice.classList.add('hidden');

  const debateBox = document.getElementById('debate-container');
  if (debateBox) debateBox.classList.remove('hidden');

  initQuestDebateChat(true);

  const argInput = document.getElementById('input-debate-arg');
  if (argInput) argInput.value = '';

  openModal('modal-quest');
  if (argInput) setTimeout(() => argInput.focus(), 150);
}

async function acceptVerdictAndCreateQuest() {
  if (!currentPendingVerdict) return;

  const isEditing = Boolean(currentEditingQuestId);
  const questTitle = currentPendingVerdict.title || 'Nhiệm vụ mới';
  const questCoins = currentPendingVerdict.rewardCoins || 10;
  const questTime = currentPendingVerdict.type === 'focus' ? `${currentPendingVerdict.targetMinutes || 25}p tập trung` : 'Không cần bấm giờ';
  const repeatText = currentPendingVerdict.isRepeatable ? '🔁 Lặp lại' : '🎯 Làm một lần';
  const proofText = currentPendingVerdict.requiresProof ? '📸 Cần chụp ảnh' : '⚡ Không cần chụp ảnh';

  const ok = await confirmAction({
    title: isEditing ? 'Xác Nhận Cập Nhật Nhiệm Vụ?' : 'Xác Nhận Nhận Nhiệm Vụ?',
    message: isEditing
      ? `Bạn có chắc muốn lưu các thay đổi cho nhiệm vụ "${questTitle}"?`
      : `Bạn có chắc chắn muốn nhận nhiệm vụ "${questTitle}" vào danh sách?`,
    detail: `💰 Thưởng: ${questCoins} Vàng • ⏱️ ${questTime}\n📌 ${repeatText} • ${proofText}`,
    confirmText: isEditing ? 'Cập Nhật' : 'Nhận Nhiệm Vụ',
    cancelText: 'Xem Lại',
    icon: '⚔️',
    btnColor: 'amber'
  });

  if (!ok) return;

  if (currentEditingQuestId) {
    const targetQuest = appState.quests.find(q => q.id === currentEditingQuestId);
    if (targetQuest) {
      targetQuest.title = currentPendingVerdict.title;
      targetQuest.description = currentPendingVerdict.description || '';
      targetQuest.type = currentPendingVerdict.type;
      targetQuest.rank = currentPendingVerdict.rank || calculateRank(currentPendingVerdict.rewardCoins);
      targetQuest.rewardCoins = currentPendingVerdict.rewardCoins;
      targetQuest.targetMinutes = currentPendingVerdict.targetMinutes !== undefined ? Number(currentPendingVerdict.targetMinutes) : 0;
      targetQuest.signature = currentPendingVerdict.signature || targetQuest.signature || '';
      targetQuest.icon = currentPendingVerdict.icon || targetQuest.icon || getQuestIcon(targetQuest);
      targetQuest.advice = currentPendingVerdict.advice;
      targetQuest.verdict = currentPendingVerdict.verdict;
      targetQuest.isRepeatable = Boolean(currentPendingVerdict.isRepeatable);
      targetQuest.requiresProof = Boolean(currentPendingVerdict.requiresProof);
      targetQuest.proofGuidance = currentPendingVerdict.proofGuidance || '';
      delete targetQuest.focusTimerCompleted;
      delete targetQuest._proofVerified;

      if (activeFocusQuest && activeFocusQuest.id === targetQuest.id) {
        activeFocusQuest.title = targetQuest.title;
        activeFocusQuest.targetMinutes = targetQuest.targetMinutes;
        activeFocusQuest.rewardCoins = targetQuest.rewardCoins;
        renderActiveFocusBanner();
      }

      sfx.playClick();
      showToast(`Đã cập nhật nhiệm vụ: "${targetQuest.title}"!`, 'success');
      closeModal('modal-quest');
      currentEditingQuestId = null;
      currentPendingVerdict = null;
      renderQuests();
      triggerSave(true);
      return;
    }
  }

  const newQuest = {
    id: 'q_' + Date.now(),
    title: currentPendingVerdict.title,
    description: currentPendingVerdict.description || '',
    type: currentPendingVerdict.type,
    rank: currentPendingVerdict.rank || calculateRank(currentPendingVerdict.rewardCoins),
    rewardCoins: currentPendingVerdict.rewardCoins,
    targetMinutes: currentPendingVerdict.targetMinutes !== undefined ? Number(currentPendingVerdict.targetMinutes) : 0,
    signature: currentPendingVerdict.signature || '',
    icon: currentPendingVerdict.icon || getQuestIcon(currentPendingVerdict),
    advice: currentPendingVerdict.advice,
    verdict: currentPendingVerdict.verdict,
    isRepeatable: Boolean(currentPendingVerdict.isRepeatable),
    requiresProof: Boolean(currentPendingVerdict.requiresProof),
    proofGuidance: currentPendingVerdict.proofGuidance || '',
    completedCount: 0,
    status: 'active',
    createdAt: Date.now()
  };

  appState.quests.unshift(newQuest);
  sfx.playClick();
  showToast(`Đã thêm nhiệm vụ: "${newQuest.title}"!`, 'success');
  closeModal('modal-quest');
  currentEditingQuestId = null;
  currentPendingVerdict = null;
  renderQuests();
  triggerSave(true);
}

// =============================================================================
// AI NEGOTIATION CHAT UI HELPERS & STATE
// =============================================================================
let isDebatingQuest = false;
let isDebatingReward = false;

function renderUserMiniAvatar() {
  const avatar = appState.profile?.avatar || '👤';
  if (isAvatarUrl(avatar)) {
    return `<img src="${escapeHtml(avatar)}" referrerpolicy="no-referrer" alt="Avatar" class="w-full h-full rounded-full object-cover">`;
  }
  return escapeHtml(avatar);
}

function appendUserChatBubble(container, text) {
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'flex justify-end items-end gap-2 message-fade-in';
  row.innerHTML = `
    <div class="max-w-[88%] sm:max-w-[90%] bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-medium px-4 py-2.5 sm:py-3 rounded-2xl rounded-tr-xs text-xs sm:text-[13px] shadow-sm whitespace-pre-wrap leading-relaxed">
      ${escapeHtml(text)}
    </div>
    <div class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs overflow-hidden select-none mb-0.5">
      ${renderUserMiniAvatar()}
    </div>
  `;
  container.appendChild(row);
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

function createDebateLoadingBubble(modeOrText = 'quest') {
  const row = document.createElement('div');
  row.className = 'flex justify-start items-start gap-2 message-fade-in mb-3';

  let mode = 'quest';
  let initialText = '';
  if (modeOrText === 'reward' || modeOrText === 'loan' || modeOrText === 'quest') {
    mode = modeOrText;
  } else if (typeof modeOrText === 'string') {
    initialText = modeOrText;
    if (/phần thưởng|quà/i.test(modeOrText)) mode = 'reward';
    else if (/khoản vay|ngân hàng|lãi/i.test(modeOrText)) mode = 'loan';
  }

  const stepsConfig = {
    quest: [
      { icon: '🔍', text: 'Đang tra cứu hồ sơ cá nhân & dữ liệu hiệp sĩ...' },
      { icon: '⏱️', text: 'Đang phân tích thời gian thực hiện & mức Vàng đề xuất...' },
      { icon: '⚖️', text: 'Đang đối chiếu nỗ lực thực tế và cân bằng hệ thống...' },
      { icon: '⚡', text: 'Đang chọn công cụ cập nhật thông số nhiệm vụ...' },
      { icon: '🛡️', text: 'Đang đóng dấu xác thực bảo mật & hoàn tất phản hồi...' }
    ],
    reward: [
      { icon: '🔍', text: 'Đang kiểm tra số Vàng tích lũy & kho phần thưởng...' },
      { icon: '🎁', text: 'Đang xem xét giá trị quà & thời gian giải trí...' },
      { icon: '⚖️', text: 'Đang cân đối động lực để bạn hoàn thành nhiệm vụ...' },
      { icon: '⚡', text: 'Đang gọi công cụ cập nhật giá & phân hạng quà...' },
      { icon: '🛡️', text: 'Đang ký duyệt thông số và hoàn tất phản hồi...' }
    ],
    loan: [
      { icon: '🔍', text: 'Đang tra cứu dư nợ, chuỗi chăm chỉ & điểm tín dụng...' },
      { icon: '🏦', text: 'Đang kiểm tra thanh khoản kho bạc & trần lãi suất...' },
      { icon: '📊', text: 'Đang tính toán hạn mức vay & tỷ lệ trích nợ an toàn...' },
      { icon: '⚡', text: 'Đang gọi công cụ thiết lập gói vay ưu đãi...' },
      { icon: '🛡️', text: 'Đang đóng dấu hợp đồng tín dụng & hoàn tất lời khuyên...' }
    ]
  };

  const steps = stepsConfig[mode] || stepsConfig.quest;
  if (initialText) {
    steps[0] = { icon: '🔍', text: initialText };
  }
  let currentStepIdx = 0;

  row.innerHTML = `
    <div class="w-7 h-7 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-xs select-none">🤖</div>
    <div class="max-w-[88%] sm:max-w-[90%] bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-slate-800 rounded-2xl rounded-tl-xs p-3 sm:p-3.5 text-xs sm:text-[13px] text-amber-900 dark:text-amber-200 shadow-sm flex flex-col gap-2">
      <div class="flex items-center justify-between gap-2 border-b border-amber-200/50 dark:border-slate-800 pb-1.5 text-[10px] sm:text-[11px] font-semibold text-amber-700 dark:text-amber-400 select-none">
        <span class="flex items-center gap-1.5">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span class="tracking-wide">AI Đang Xử Lý Thời Gian Thực</span>
        </span>
        <span class="step-badge font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-slate-800 text-amber-800 dark:text-amber-300">
          Bước 1/${steps.length}
        </span>
      </div>

      <div class="flex items-center gap-2.5 py-0.5 min-h-[28px]">
        <span class="step-icon text-base shrink-0 animate-pulse">${steps[0].icon}</span>
        <span class="step-text font-medium text-slate-800 dark:text-slate-100 transition-all duration-300 leading-snug">
          ${steps[0].text}
        </span>
      </div>

      <div class="w-full bg-amber-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
        <div class="step-progress bg-gradient-to-r from-amber-500 to-amber-600 h-1 rounded-full transition-all duration-500" style="width: ${(1 / steps.length) * 100}%"></div>
      </div>
    </div>
  `;

  const badgeEl = row.querySelector('.step-badge');
  const iconEl = row.querySelector('.step-icon');
  const textEl = row.querySelector('.step-text');
  const progressEl = row.querySelector('.step-progress');

  const intervalId = setInterval(() => {
    if (currentStepIdx < steps.length - 1) {
      currentStepIdx++;
      const s = steps[currentStepIdx];
      if (badgeEl) badgeEl.textContent = `Bước ${currentStepIdx + 1}/${steps.length}`;
      if (iconEl) iconEl.textContent = s.icon;
      if (textEl) {
        textEl.style.opacity = '0';
        setTimeout(() => {
          textEl.textContent = s.text;
          textEl.style.opacity = '1';
        }, 150);
      }
      if (progressEl) {
        const pct = Math.min(95, Math.round(((currentStepIdx + 1) / steps.length) * 100));
        progressEl.style.width = `${pct}%`;
      }
    }
  }, 2200);

  // Nhận sự kiện thời gian thực từ luồng Server-Sent Events
  row.updateStep = (stepData) => {
    if (!stepData) return;
    if (intervalId) clearInterval(intervalId); // Tắt bộ đếm giả lập khi đã có sự kiện thật
    if (stepData.icon && iconEl) iconEl.textContent = stepData.icon;
    if (stepData.text && textEl) {
      textEl.style.opacity = '0';
      setTimeout(() => {
        textEl.textContent = stepData.text;
        textEl.style.opacity = '1';
      }, 120);
    }
    if (badgeEl && stepData.step) {
      badgeEl.textContent = `Bước ${stepData.step}/${stepData.totalSteps || steps.length}`;
    }
    if (progressEl && stepData.pct !== undefined) {
      progressEl.style.width = `${Math.min(100, Math.max(5, stepData.pct))}%`;
    }
  };

  row.cleanup = () => {
    if (intervalId) clearInterval(intervalId);
  };

  return row;
}

// Bộ đọc luồng Server-Sent Events (SSE) thời gian thực cho thương lượng AI
async function fetchDebateStream(url, options, onStep) {
  const fetchOptions = {
    credentials: 'include',
    ...options
  };
  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    let errJson = null;
    try { errJson = await res.json(); } catch (_) {}
    throw new Error(errJson?.error || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    // Tương thích ngược nếu server trả JSON tĩnh thông thường
    return await res.json();
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finalResult = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop();

    for (const part of parts) {
      if (!part.trim()) continue;
      const lines = part.split('\n');
      let event = 'message';
      let dataStr = '';
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
      }
      if (dataStr) {
        try {
          const parsed = JSON.parse(dataStr);
          if (event === 'step') {
            if (typeof onStep === 'function') onStep(parsed);
          } else if (event === 'result') {
            finalResult = parsed;
          } else if (event === 'error') {
            throw new Error(parsed?.error || 'Lỗi xử lý luồng AI');
          }
        } catch (e) {
          if (event === 'error') throw e;
        }
      }
    }
  }

  if (!finalResult) {
    throw new Error('Không nhận được dữ liệu kết quả từ luồng streaming.');
  }
  return finalResult;
}

function parseDebateOptionsFromText(text, type = 'reward') {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split('\n');
  const rawOptions = [];
  let current = null;

  const keywordRegex = /^\s*(?:[-*•]|\d+[.)])?\s*(Phương\s*án|Phương\s*thức|Cách|Gợi\s*ý|Lựa\s*chọn|Giải\s*pháp|Hướng|Option|Opt|PA)\s*([1-9]|A|B|C|Một|Hai|Ba)[:.-]?\s*(.*)$/i;
  const numberRegex = /^\s*[-*•]?\s*([1-9])[:.)]\s+(.*)$/i;

  for (const line of lines) {
    const kwMatch = line.match(keywordRegex);
    const numMatch = !kwMatch ? line.match(numberRegex) : null;
    const match = kwMatch || numMatch;

    if (match) {
      if (current) rawOptions.push(current);
      const prefix = kwMatch ? kwMatch[1].trim() : 'Phương án';
      const id = kwMatch ? kwMatch[2] : numMatch[1];
      const rest = (kwMatch ? kwMatch[3] : numMatch[2]).trim();
      current = {
        id,
        title: `${prefix} ${id}`,
        text: rest
      };
    } else if (!line.trim()) {
      if (current) {
        rawOptions.push(current);
        current = null;
      }
    } else if (current && !line.match(/^\s*[-*•]/)) {
      current.text += ' ' + line.trim();
    } else if (current && line.match(/^\s*[-*•]/)) {
      rawOptions.push(current);
      current = null;
    }
  }
  if (current) rawOptions.push(current);

  return rawOptions.map(opt => {
    let mins = 0;
    const isBounty = /(?:không\s*(?:cần\s*)?bấm\s*giờ|hoàn\s*thành\s*ngay|bounty)/i.test(opt.text);
    const mentionsProofReq = /(?:cần|yêu\s*cầu|chụp)\s*ảnh/i.test(opt.text);
    const mentionsProofWaive = /(?:miễn|không\s*cần|bỏ)\s*ảnh/i.test(opt.text);
    if (type === 'reward' && /(?:nhiệm\s*vụ|làm\s*(?:thêm|nốt)).*?\d+\s*phút/i.test(opt.text)) {
      const rewardDurMatch = opt.text.match(/(?:đổi|thời\s*(?:lượng|gian)|xem|chơi|thành).*?(\d+)\s*phút/i);
      if (rewardDurMatch) {
        mins = parseInt(rewardDurMatch[1], 10);
      } else if (/nửa\s*(?:tiếng|giờ)/i.test(opt.text)) {
        mins = 30;
      }
    } else {
      mins = extractDurationFromText(opt.text);
    }

    let gold = undefined;
    let loanRate = undefined;
    let loanDeduct = undefined;
    let loanLimit = undefined;

    if (type === 'loan') {
      const loanGoldMatch = opt.text.match(/(?:vay|mức\s*vay|khoản\s*vay|số\s*vàng(?:\s*vay)?|còn)[:\s]*(\d+)\s*vàng/i) || opt.text.match(/(\d+)\s*vàng/i);
      if (loanGoldMatch) gold = parseInt(loanGoldMatch[1], 10);

      const rateMatch = opt.text.match(/(?:lãi\s*suất|lãi|phí)[:\s]*(\d+(?:[.,]\d+)?)\s*%/i) || opt.text.match(/(\d+(?:[.,]\d+)?)\s*%(?:\/ngày)?/i);
      if (rateMatch) loanRate = parseFloat(rateMatch[1].replace(',', '.')) / 100;

      const deductMatch = opt.text.match(/(?:trích|trích\s*nợ|tỷ\s*lệ)[:\s]*(\d+)\s*%/i);
      if (deductMatch) loanDeduct = parseInt(deductMatch[1], 10) / 100;

      const limitMatch = opt.text.match(/(?:hạn\s*mức(?:\s*(?:lên|mới))?|cấp\s*hạn\s*mức)[:\s]*(\d+)\s*vàng/i);
      if (limitMatch) loanLimit = parseInt(limitMatch[1], 10);
    } else {
      const explicitPriceMatch = opt.text.match(/(?:mức\s*giá|giá(?:\s*vàng)?|giảm\s*(?:còn|xuống)|đổi\s*(?:ngay\s*)?(?:với\s*)?(?:mức\s*)?giá)[:\s]*(\d+)\s*vàng/i);
      if (explicitPriceMatch) {
        gold = parseInt(explicitPriceMatch[1], 10);
      } else if (type === 'quest') {
        const questCoinMatch = opt.text.match(/(?:thưởng|mức\s*thưởng|nâng\s*lên|tăng\s*lên|giảm\s*xuống)[:\s]*(\d+)\s*vàng/i) || opt.text.match(/(\d+)\s*vàng/i);
        if (questCoinMatch) gold = parseInt(questCoinMatch[1], 10);
      } else if (!/(?:tích\s*lũy|có\s*sẵn|thêm\s*\d+\s*vàng|làm\s*nốt|làm\s*thêm)/i.test(opt.text)) {
        const genericGoldMatch = opt.text.match(/(\d+)\s*vàng/i);
        if (genericGoldMatch) gold = parseInt(genericGoldMatch[1], 10);
      }
    }

    let newName = undefined;
    const nameMatch = opt.text.match(/(?:thành|tên\s*(?:mới\s*)?(?:là)?)\s*["“]?([^"”\n,.]+?)["”]?\s*(?:nha|nhé|nè|\.|$)/i);
    if (nameMatch) {
      const candidate = nameMatch[1].trim();
      if (candidate.length >= 3 && !/^\s*\d+\s*(?:vàng|phút|tiếng|giờ|min|p)\s*$/i.test(candidate) && !/^\s*mức\s*giá/i.test(candidate)) {
        newName = candidate;
      }
    }

    let label = opt.title;
    const details = [];
    if (type === 'loan') {
      if (gold !== undefined) details.push(`Vay ${gold} Vàng`);
      if (loanRate !== undefined) details.push(`Lãi ${(loanRate * 100).toFixed(1)}%/ngày`);
      if (loanDeduct !== undefined) details.push(`Trích ${(loanDeduct * 100).toFixed(0)}%`);
      if (loanLimit !== undefined) details.push(`Hạn mức ${loanLimit} Vàng`);
    } else {
      if (mins > 0) {
        details.push(`${mins} phút`);
      } else if (isBounty) {
        details.push('Không cần bấm giờ');
      }
      if (gold !== undefined) details.push(`${gold} Vàng`);
      if (type === 'quest') {
        if (mentionsProofReq) details.push('Cần ảnh');
        else if (mentionsProofWaive) details.push('Miễn ảnh');
      }
    }
    if (details.length > 0) {
      label += ` (${details.join(' • ')})`;
    } else if (opt.text.length < 40) {
      label += `: ${opt.text}`;
    }

    let argument = `Chốt ${opt.title.toLowerCase()}`;
    if (details.length > 0) {
      argument += `: ${details.join(', ')}`;
    }

    const payload = {};
    if (type === 'loan') {
      if (gold !== undefined) payload.newAmount = gold;
      if (loanRate !== undefined) payload.newBorrowRate = loanRate;
      if (loanDeduct !== undefined) payload.newAutoDeductPercent = loanDeduct;
      if (loanLimit !== undefined) payload.newCreditLimit = loanLimit;
    } else if (type === 'reward') {
      if (gold !== undefined) payload.newPrice = gold;
      if (mins > 0) payload.newTargetMinutes = mins;
      else if (isBounty) payload.newTargetMinutes = 0;
      if (gold !== undefined && gold < 30) payload.newTier = 'common';
      if (newName) payload.newName = newName;
    } else {
      if (gold !== undefined) payload.newRewardCoins = gold;
      if (mins > 0) {
        payload.newTargetMinutes = mins;
        payload.newType = 'focus';
      } else if (isBounty) {
        payload.newTargetMinutes = 0;
        payload.newType = 'bounty';
      }
      if (mentionsProofReq) payload.newRequiresProof = true;
      else if (mentionsProofWaive) payload.newRequiresProof = false;
      if (newName) payload.newTitle = newName;
    }

    return {
      id: opt.id,
      label,
      argument,
      text: opt.text,
      ...payload
    };
  });
}

function appendAiChatBubble(container, {
  reply,
  accepted,
  diffTags = [],
  botName = 'Trọng Tài AI',
  botIcon = '🤖',
  options = [],
  onSelectOption = null,
  mode = 'quest',
  toolsExecuted = []
}) {
  if (!container) return;

  // Unpack if reply is a JSON string (failsafe in case backend or raw model returned json)
  if (typeof reply === 'string' && (reply.trim().startsWith('{') || reply.trim().startsWith('```json'))) {
    try {
      let raw = reply.trim();
      if (raw.startsWith('```json')) raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
      else if (raw.startsWith('```')) raw = raw.replace(/^```\s*/i, '').replace(/```\s*$/, '');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.reply === 'string') {
        reply = parsed.reply;
        if ((!options || options.length === 0) && Array.isArray(parsed.options)) {
          options = parsed.options;
        }
      }
    } catch (_) {}
  }

  const row = document.createElement('div');
  row.className = 'flex justify-start items-start gap-2 message-fade-in';

  const statusBadge = accepted
    ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 shrink-0">
        <span>✓</span><span>ĐÃ ĐỒNG Ý & CẬP NHẬT</span>
      </span>`
    : `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-slate-700 shrink-0">
        <span>⚖️</span><span>GIỮ NGUYÊN THÔNG SỐ</span>
      </span>`;

  let diffTagsHtml = '';
  if (accepted && diffTags.length > 0) {
    diffTagsHtml = `
      <div class="mt-2 pt-2 border-t border-emerald-200/80 dark:border-emerald-900/60 flex flex-wrap gap-1.5">
        ${diffTags.map(tag => `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-400/50">${escapeHtml(tag)}</span>`).join('')}
      </div>
    `;
  }

  let toolsHtml = '';
  if (Array.isArray(toolsExecuted) && toolsExecuted.length > 0) {
    const executedPills = toolsExecuted.map(t => {
      if (t === 'get_my_user_data') return '🔍 Đã đọc hồ sơ';
      if (t === 'get_bank_market_status') return '🏦 Kiểm tra kho bạc';
      if (t === 'update_quest_parameters') return '⚡ Cập nhật nhiệm vụ';
      if (t === 'update_reward_parameters') return '🎁 Chốt giá quà';
      if (t === 'update_loan_terms') return '📜 Chốt khoản vay';
      if (t === 'suggest_negotiation_options') return '💡 Gợi ý phương án';
      return null;
    }).filter(Boolean);
    if (executedPills.length > 0) {
      toolsHtml = `
        <div class="mt-1 flex flex-wrap items-center gap-1 opacity-75 text-[10px] text-slate-500 dark:text-slate-400">
          <span class="font-medium">🛠️ AI Tools:</span>
          ${executedPills.map(p => `<span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">${escapeHtml(p)}</span>`).join('')}
        </div>
      `;
    }
  }

  // Parse options if not provided directly
  const effectiveOptions = (Array.isArray(options) && options.length > 0)
    ? options
    : parseDebateOptionsFromText(reply, mode);

  let optionsHtml = '';
  if (effectiveOptions && effectiveOptions.length > 0) {
    optionsHtml = `
      <div class="mt-2.5 pt-2.5 border-t border-amber-200/70 dark:border-slate-800/80 space-y-1.5 debate-options-wrapper">
        <div class="text-[11px] font-bold text-amber-700 dark:text-amber-400 tracking-wide flex items-center gap-1.5">
          <span>💡</span><span>Chọn phương án đề xuất:</span>
        </div>
        <div class="flex flex-col sm:flex-row flex-wrap gap-1.5 debate-options-list">
          ${effectiveOptions.map((opt, idx) => `
            <button type="button" data-option-idx="${idx}" class="debate-option-btn group text-left px-3 py-2 rounded-xl text-xs font-semibold bg-white/90 dark:bg-slate-800/90 hover:bg-amber-100 dark:hover:bg-amber-950/60 active:scale-95 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 transition-all flex items-center gap-2 shadow-xs cursor-pointer">
              <span class="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center text-[11px] font-black shrink-0 group-hover:scale-110 transition-transform">👉</span>
              <span class="font-medium">${escapeHtml(opt.label || `Phương án ${opt.id || idx + 1}`)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  const bubbleThemeClass = accepted
    ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-300/80 dark:border-emerald-800/60 text-slate-800 dark:text-slate-200'
    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200';

  row.innerHTML = `
    <div class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">${botIcon}</div>
    <div class="max-w-[90%] sm:max-w-[92%] ${bubbleThemeClass} border rounded-2xl rounded-tl-xs p-3.5 sm:p-4 text-xs sm:text-[13px] shadow-xs leading-relaxed space-y-2">
      <div class="flex items-center justify-between gap-2">
        <span class="font-bold text-xs sm:text-[13px] text-amber-600 dark:text-amber-400">${botName}</span>
        ${statusBadge}
      </div>
      <div class="text-xs sm:text-[13px] leading-relaxed break-words">${renderMarkdown(reply)}</div>
      ${toolsHtml}
      ${diffTagsHtml}
      ${optionsHtml}
    </div>
  `;
  container.appendChild(row);

  // Attach click listener to option buttons
  const optionButtons = row.querySelectorAll('.debate-option-btn');
  optionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-option-idx'), 10);
      const selected = effectiveOptions[idx];
      if (!selected) return;

      optionButtons.forEach(b => {
        b.disabled = true;
        b.classList.add('opacity-50', 'pointer-events-none');
      });
      btn.classList.remove('opacity-50');
      btn.classList.add('ring-2', 'ring-amber-500', 'bg-amber-100', 'dark:bg-amber-900/40');

      if (typeof onSelectOption === 'function') {
        onSelectOption(selected);
      }
    });
  });

  // Cuộn dừng ở ĐẦU tin nhắn của AI thay vì cuối tin nhắn để người đọc bắt đầu ngay từ dòng đầu
  requestAnimationFrame(() => {
    setTimeout(() => {
      const containerRect = container.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const targetTop = Math.max(0, rowRect.top - containerRect.top + container.scrollTop - 8);
      container.scrollTo({ top: targetTop, behavior: 'smooth' });
    }, 40);
  });
}

function initQuestDebateChat(forceReset = false) {
  const chatLogs = document.getElementById('debate-chat-logs');
  if (!chatLogs) return;
  if (!forceReset && chatLogs.children.length > 0) return;

  const quest = currentPendingVerdict || {};
  const modeText = quest.type === 'focus' ? `${quest.targetMinutes || 25}p tập trung` : 'không cần bấm giờ';
  const proofText = quest.requiresProof ? ' • 📸 Yêu cầu chụp ảnh' : ' • ⚡ Không cần ảnh';
  const isRenegotiate = Boolean(currentEditingQuestId);

  const btnProofSuggest = document.getElementById('btn-suggest-proof');
  if (btnProofSuggest) {
    if (quest.requiresProof) {
      btnProofSuggest.textContent = '📸 Xin miễn chụp ảnh';
      btnProofSuggest.setAttribute('data-suggest', 'Công việc này mình làm trên điện thoại hoặc không tiện chụp ảnh thực tế, bạn giúp mình miễn chụp ảnh được không?');
    } else {
      btnProofSuggest.textContent = '📸 Thêm yêu cầu chụp ảnh';
      btnProofSuggest.setAttribute('data-suggest', 'Mình muốn thêm yêu cầu chụp ảnh bằng chứng khi hoàn thành để tự rèn luyện kỷ luật hơn, bạn cập nhật giúp mình nhé!');
    }
  }

  chatLogs.innerHTML = `
    <div class="flex justify-start items-start gap-2 message-fade-in">
      <div class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">🤖</div>
      <div class="max-w-[90%] sm:max-w-[92%] bg-amber-50/80 dark:bg-slate-900 border border-amber-200/80 dark:border-slate-800 rounded-2xl rounded-tl-xs p-3.5 sm:p-4 text-xs sm:text-[13px] text-amber-950 dark:text-amber-200/90 shadow-xs leading-relaxed space-y-2">
        <div class="font-bold text-xs sm:text-[13px] text-amber-600 dark:text-amber-400">Trọng Tài AI:</div>
        <div>
          ${isRenegotiate ? 'Bạn đang thương lượng lại nhiệm vụ' : 'Bạn đang xem xét nhiệm vụ'} <strong>"${escapeHtml(quest.title || 'Nhiệm vụ')}"</strong> (${quest.rewardCoins || 10} Vàng, ${modeText}${proofText}).
        </div>
        <div class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
          💡 Chọn một gợi ý nhanh bên dưới hoặc nhập đề xuất để mình điều chỉnh thông số cho phù hợp nhé!
        </div>
      </div>
    </div>
  `;
  chatLogs.scrollTo({ top: 0, behavior: 'smooth' });
}

function initRewardDebateChat(forceReset = false) {
  const chatLogs = document.getElementById('reward-debate-chat-logs');
  if (!chatLogs) return;
  if (!forceReset && chatLogs.children.length > 0) return;

  const reward = currentPendingReward || {};
  const isRenegotiate = Boolean(currentEditingRewardId);

  chatLogs.innerHTML = `
    <div class="flex justify-start items-start gap-2 message-fade-in">
      <div class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">🎁</div>
      <div class="max-w-[90%] sm:max-w-[92%] bg-amber-50/80 dark:bg-slate-900 border border-amber-200/80 dark:border-slate-800 rounded-2xl rounded-tl-xs p-3.5 sm:p-4 text-xs sm:text-[13px] text-amber-950 dark:text-amber-200/90 shadow-xs leading-relaxed space-y-2">
        <div class="font-bold text-xs sm:text-[13px] text-amber-600 dark:text-amber-400">Trợ Lý Cửa Hàng AI:</div>
        <div>
          ${isRenegotiate ? 'Bạn đang thương lượng lại phần thưởng' : 'Bạn đang xem xét phần thưởng'} <strong>"${escapeHtml(reward.name || 'Phần thưởng')}"</strong> (Giá: ${reward.price || 30} Vàng).
        </div>
        <div class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
          💡 Chọn một gợi ý nhanh bên dưới hoặc nhập đề xuất để mình điều chỉnh giá hoặc tên phần thưởng nhé!
        </div>
      </div>
    </div>
  `;
  chatLogs.scrollTo({ top: 0, behavior: 'smooth' });
}

async function sendDebateArgument(customArg = null, selectedOption = null) {
  if (isDebatingQuest) return;

  const argInput = document.getElementById('input-debate-arg');
  const argument = (typeof customArg === 'string' && customArg.trim())
    ? customArg.trim()
    : (argInput ? argInput.value.trim() : '');
  if (!argument) return;

  const chatLogs = document.getElementById('debate-chat-logs');
  const btnSend = document.getElementById('btn-send-debate');

  isDebatingQuest = true;
  if (argInput) {
    argInput.disabled = true;
    argInput.value = '';
  }
  if (btnSend) {
    btnSend.disabled = true;
    btnSend.innerHTML = `<span class="inline-flex gap-1 items-center"><span class="w-1.5 h-1.5 rounded-full bg-slate-950 animate-bounce" style="animation-delay: 0ms"></span><span class="w-1.5 h-1.5 rounded-full bg-slate-950 animate-bounce" style="animation-delay: 150ms"></span><span class="w-1.5 h-1.5 rounded-full bg-slate-950 animate-bounce" style="animation-delay: 300ms"></span></span>`;
  }

  appendUserChatBubble(chatLogs, argument);

  const loadingBubble = createDebateLoadingBubble('quest');
  chatLogs.appendChild(loadingBubble);
  chatLogs.scrollTo({ top: chatLogs.scrollHeight, behavior: 'smooth' });

  try {
    const currentRewards = (appState.shopItems || []).slice(0, 10).map(item => ({
      name: item.name,
      price: item.price,
      tier: item.tier
    }));

    const prevVerdict = { ...currentPendingVerdict };

    const data = await fetchDebateStream('/api/ai', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        action: 'debate_quest',
        payload: {
          quest: currentPendingVerdict,
          argument,
          history: currentDebateHistory,
          currentRewards,
          userCoins: appState.profile?.coins || 0,
          selectedOption,
          stream: true
        }
      })
    }, (stepData) => {
      if (loadingBubble && loadingBubble.updateStep) loadingBubble.updateStep(stepData);
    });

    if (loadingBubble && loadingBubble.cleanup) loadingBubble.cleanup();
    loadingBubble.remove();

    if (data && typeof data.reply === 'string' && (data.reply.trim().startsWith('{') || data.reply.trim().startsWith('```json'))) {
      try {
        let raw = data.reply.trim();
        if (raw.startsWith('```json')) raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
        else if (raw.startsWith('```')) raw = raw.replace(/^```\s*/i, '').replace(/```\s*$/, '');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.reply === 'string') {
          data.reply = parsed.reply;
          if ((!data.options || data.options.length === 0) && Array.isArray(parsed.options)) {
            data.options = parsed.options;
          }
        }
      } catch (_) {}
    }

    const diffTags = [];
    if (data.accepted) {
      if (data.newRewardCoins && data.newRewardCoins !== prevVerdict.rewardCoins) {
        diffTags.push(`💰 Thưởng: ${prevVerdict.rewardCoins} ➔ ${data.newRewardCoins} Vàng`);
      }
      if (data.newTargetMinutes !== undefined && Number(data.newTargetMinutes) !== Number(prevVerdict.targetMinutes)) {
        diffTags.push(`⏱️ Thời gian: ${prevVerdict.targetMinutes || 0}p ➔ ${data.newTargetMinutes}p`);
      }
      if (data.newType && data.newType !== prevVerdict.type) {
        diffTags.push(`⚡ Loại: ${prevVerdict.type === 'focus' ? 'Hẹn giờ' : 'Không bấm giờ'} ➔ ${data.newType === 'focus' ? 'Hẹn giờ' : 'Không bấm giờ'}`);
      }
      if (data.newTitle && data.newTitle !== prevVerdict.title) {
        diffTags.push(`📝 Tên mới: "${data.newTitle}"`);
      }
      if (data.newRequiresProof !== undefined && Boolean(data.newRequiresProof) !== Boolean(prevVerdict.requiresProof)) {
        diffTags.push(data.newRequiresProof ? '📸 Yêu cầu chụp ảnh bằng chứng' : '⚡ Miễn chụp ảnh (Hoàn thành 1 chạm)');
      }
    }

    appendAiChatBubble(chatLogs, {
      reply: data.reply,
      accepted: data.accepted,
      diffTags,
      botName: 'Trọng Tài AI',
      botIcon: '🤖',
      options: data.options,
      mode: 'quest',
      toolsExecuted: data.toolsExecuted,
      onSelectOption: (opt) => sendDebateArgument(opt.argument || `Chốt phương án ${opt.id}`, opt)
    });

    currentDebateHistory.push({ user: argument, arbiter: data.reply });

    if (data.accepted) {
      if (data.newTitle) currentPendingVerdict.title = data.newTitle;
      if (data.newDescription !== undefined) currentPendingVerdict.description = data.newDescription;
      if (data.newRewardCoins !== undefined && Number(data.newRewardCoins) > 0) currentPendingVerdict.rewardCoins = Number(data.newRewardCoins);
      if (data.newTargetMinutes !== undefined) currentPendingVerdict.targetMinutes = Number(data.newTargetMinutes);
      if (data.signature) currentPendingVerdict.signature = data.signature;
      if (data.newType) {
        currentPendingVerdict.type = data.newType;
      } else if (data.newTargetMinutes !== undefined) {
        currentPendingVerdict.type = data.newTargetMinutes > 0 ? 'focus' : 'bounty';
      }
      if (data.newRequiresProof !== undefined) {
        currentPendingVerdict.requiresProof = Boolean(data.newRequiresProof);
      }
      if (data.newProofGuidance !== undefined) {
        currentPendingVerdict.proofGuidance = data.newProofGuidance;
      }
      if (data.newIcon) {
        currentPendingVerdict.icon = data.newIcon;
      }
      currentPendingVerdict.rank = data.newRank || calculateRank(currentPendingVerdict.rewardCoins);
      if (data.reply) currentPendingVerdict.verdict = data.reply;

      const verdictModNotice = document.getElementById('verdict-modified-notice');
      if (verdictModNotice) verdictModNotice.classList.add('hidden');

      // Refresh locked specs display card and badges
      updateVerdictDisplay();

      showToast('Thương lượng thành công! AI đã cập nhật thông số nhiệm vụ.', 'gold');
      sfx.playFanfare();
    }
  } catch (err) {
    if (loadingBubble && loadingBubble.cleanup) loadingBubble.cleanup();
    loadingBubble.remove();
    const errRow = document.createElement('div');
    errRow.className = 'flex justify-start items-start gap-2 message-fade-in';
    errRow.innerHTML = `
      <div class="w-6 h-6 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">⚠️</div>
      <div class="max-w-[85%] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl rounded-tl-xs p-3 text-xs text-rose-700 dark:text-rose-300 shadow-xs">
        <strong>Lỗi thương lượng:</strong> ${escapeHtml(err.message || 'Không thể kết nối với AI. Vui lòng thử lại.')}
      </div>
    `;
    chatLogs.appendChild(errRow);
    chatLogs.scrollTo({ top: chatLogs.scrollHeight, behavior: 'smooth' });
    showToast('Lỗi thương lượng: ' + (err.message || 'Vui lòng thử lại'), 'error');
  } finally {
    isDebatingQuest = false;
    if (argInput) {
      argInput.disabled = false;
      argInput.focus();
    }
    if (btnSend) {
      btnSend.disabled = false;
      btnSend.innerHTML = `<span>Gửi</span><span class="text-[10px]">➤</span>`;
    }
  }
}
