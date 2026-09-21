// =============================================================================
// 2. DEFAULT STATE & SEED DATA
// =============================================================================
const DEFAULT_STATE = {
  profile: {
    nickname: 'HiepSi_' + Math.floor(1000 + Math.random() * 9000),
    avatar: '⚔️',
    level: 1,
    exp: 0,
    coins: 20,
    totalCoinsEarned: 20,
    totalCoinsSpent: 0,
    totalFocusSessions: 0,
    title: 'Tân Binh Cấp 1',
    streak: 1,
    lastStreakDate: '',
    streakHistory: [],
    soundEnabled: true,
    theme: 'dark',
    role: 'adventurer',
    token: '',
    googleId: '',
    googleEmail: '',
    googlePicture: '',
    googleToken: '',
    sessionToken: '',
    hasOnboarded: false,
    bank: {
      deposited: 0,
      depositInterest: 0,
      lastDepositAt: 0,
      loan: null,
      isFrozen: false
    }
  },
  quests: [
    {
      id: 'q_seed_1',
      title: 'Đọc 1 chương sách chuyên ngành',
      description: 'Ghi chú ít nhất 3 ý chính, không dùng điện thoại',
      type: 'focus',
      rank: 'C',
      rewardCoins: 12,
      targetMinutes: 25,
      icon: '📖',
      advice: 'Bật chế độ Không làm phiền trên điện thoại trước khi bấm giờ.',
      verdict: '25 phút tập trung sâu là khoảng thời gian chuẩn mực. Hãy hoàn thành đủ giờ để nhận thưởng!',
      isRepeatable: true,
      completedCount: 0,
      status: 'active',
      history: {},
      createdAt: Date.now()
    },
    {
      id: 'q_seed_2',
      title: 'Dọn sạch góc bàn làm việc & rửa sạch cốc',
      description: 'Không gian ngăn nắp giúp tinh thần thoải mái và tập trung tốt hơn',
      type: 'bounty',
      rank: 'E',
      rewardCoins: 5,
      targetMinutes: 0,
      icon: '🧹',
      advice: 'Làm dứt khoát trong 5 - 10 phút.',
      verdict: 'Công việc nhanh gọn có kết quả rõ ràng. Đánh dấu xong để nhận ngay 5 Vàng!',
      isRepeatable: false,
      completedCount: 0,
      status: 'active',
      history: {},
      createdAt: Date.now()
    }
  ],
  shopItems: [
    {
      id: 'shop_seed_1',
      name: '1 Ly Trà Sữa / Cà Phê Yêu Thích',
      description: 'Tự thưởng một cốc đồ uống ngon lành sau buổi học tập, làm việc',
      price: 35,
      tier: 'rare',
      icon: '🧋',
      targetMinutes: 0,
      history: {},
      verdict: 'Tương đương hơn 1 tiếng tập trung làm việc. Hãy thưởng thức thật ngon miệng!'
    },
    {
      id: 'shop_seed_2',
      name: 'Lướt Mạng Xã Hội / Xem Video 30 Phút',
      description: 'Giải trí thư giãn thoải mái sau khi hoàn thành mục tiêu',
      price: 20,
      tier: 'common',
      icon: '📱',
      targetMinutes: 30,
      history: {},
      verdict: 'Thư giãn hợp lý giúp nạp lại năng lượng cho những mục tiêu tiếp theo.'
    },
    {
      id: 'shop_seed_3',
      name: 'Đi Xem Phim Rạp Cuối Tuần',
      description: 'Một buổi tối thư giãn trọn vẹn tại rạp chiếu phim',
      price: 120,
      tier: 'epic',
      icon: '🍿',
      targetMinutes: 120,
      history: {},
      verdict: 'Mục tiêu lớn! Cần hoàn thành đều đặn nhiệm vụ cả tuần để đổi lấy món quà này.'
    }
  ],
  inventory: [],
  completedQuestIds: [],
  proofPhotos: [],
  ledger: [
    {
      id: 'led_1',
      type: 'earn',
      category: 'bonus',
      amount: 20,
      title: 'Thưởng chào mừng gia nhập LevelUp',
      description: 'Thưởng chào mừng gia nhập LevelUp',
      timestamp: Date.now()
    }
  ],
  activeTimer: null,
  lastTimerClearedAt: 0,
  lastSyncedAt: 0
};
