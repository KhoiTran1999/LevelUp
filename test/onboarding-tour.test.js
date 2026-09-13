import assert from 'node:assert';

// 1. Tour steps definition validator
const TOUR_STEPS = [
  {
    id: 'profile',
    title: 'Hồ Sơ & Trạng Thái Hiệp Sĩ',
    icon: '🛡️',
    tab: 'quests',
    desc: 'Thanh trạng thái nhân vật của bạn. Xem Cấp độ (Level), thanh Kinh Nghiệm (EXP) và số Vàng (🪙) bạn tích lũy từ công việc. Nhấn vào đây để xem Hồ Sơ, đổi danh hiệu và sao chép Mã Token bí mật.'
  },
  {
    id: 'add-quest',
    title: 'Thêm Việc & Nhận Nhiệm Vụ',
    icon: '⚔️',
    tab: 'quests',
    desc: 'Nhấn vào đây (hoặc phím tắt Q) để tạo việc cần làm. Trọng tài AI nghiêm khắc sẽ tự động định giá Rank S/A/B/C/D và đặt mức thưởng Vàng tương xứng!'
  },
  {
    id: 'focus-timer',
    title: 'Bộ Đếm Tập Trung (Pomodoro)',
    icon: '⏱️',
    tab: 'quests',
    desc: 'Kích hoạt đồng hồ tập trung khi làm việc để tăng tối đa năng suất. Có chế độ Zen Mode toàn màn hình giúp bạn dập tắt hoàn toàn các xao nhãng xung quanh!'
  },
  {
    id: 'shop',
    title: 'Cửa Hàng Phần Thưởng Thực Tế',
    icon: '🎁',
    tab: 'shop',
    desc: 'Dùng Vàng kiếm được để mở khóa những điều bạn yêu thích: 30 phút chơi game, 1 tập phim anime, cà phê... Tận hưởng trọn vẹn mà không còn một chút cảm giác tội lỗi!'
  },
  {
    id: 'leaderboard',
    title: 'Bảng Xếp Hạng & Sẵn Sàng',
    icon: '🏆',
    tab: 'leaderboard',
    desc: 'Cạnh tranh vị trí Top hiệp sĩ chăm chỉ nhất cùng cộng đồng LevelUp. Hãy bắt đầu tạo nhiệm vụ đầu tiên và nâng cấp bản thân ngay hôm nay!'
  }
];

// 2. Step Navigator State Machine
class TourStateMachine {
  constructor(steps) {
    this.steps = steps;
    this.currentStep = 0;
    this.isActive = false;
    this.completed = false;
    this.activeTab = 'quests';
  }

  start() {
    this.isActive = true;
    this.currentStep = 0;
    this.completed = false;
    this.activeTab = this.steps[0].tab;
  }

  next() {
    if (!this.isActive) return false;
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.activeTab = this.steps[this.currentStep].tab;
      return true;
    } else {
      this.finish(true);
      return false;
    }
  }

  prev() {
    if (!this.isActive) return false;
    if (this.currentStep > 0) {
      this.currentStep--;
      this.activeTab = this.steps[this.currentStep].tab;
      return true;
    }
    return false;
  }

  skip() {
    if (!this.isActive) return;
    this.finish(false);
  }

  finish(completed) {
    this.isActive = false;
    this.completed = completed;
    this.activeTab = 'quests';
  }
}

// 3. Layout Positioning Math Function (Matches updateTourPosition logic)
function calculateTourPopoverLayout({ targetRect, viewportW, viewportH, cardW, cardH }) {
  const pad = 6;
  const tTop = Math.max(0, targetRect.top - pad);
  const tLeft = Math.max(0, targetRect.left - pad);
  const tWidth = Math.min(viewportW - tLeft, targetRect.width + pad * 2);
  const tHeight = Math.min(viewportH - tTop, targetRect.height + pad * 2);

  const spaceBelow = viewportH - (tTop + tHeight);
  const spaceAbove = tTop;

  let cardTop = 0;
  let cardLeft = 0;
  let arrowPlacement = 'top';

  if (viewportW < 640) {
    cardLeft = Math.max(16, (viewportW - cardW) / 2);
    if (spaceBelow >= cardH + 16) {
      cardTop = tTop + tHeight + 12;
      arrowPlacement = 'top';
    } else if (spaceAbove >= cardH + 16) {
      cardTop = Math.max(16, tTop - cardH - 12);
      arrowPlacement = 'bottom';
    } else {
      cardTop = Math.max(16, (viewportH - cardH) / 2);
      arrowPlacement = 'none';
    }
  } else {
    if (spaceBelow >= cardH + 20) {
      cardTop = tTop + tHeight + 14;
      arrowPlacement = 'top';
    } else if (spaceAbove >= cardH + 20) {
      cardTop = Math.max(16, tTop - cardH - 14);
      arrowPlacement = 'bottom';
    } else {
      cardTop = Math.max(20, (viewportH - cardH) / 2);
      arrowPlacement = 'none';
    }

    const targetCenter = tLeft + tWidth / 2;
    cardLeft = targetCenter - cardW / 2;
    cardLeft = Math.max(16, Math.min(viewportW - cardW - 16, cardLeft));
  }

  cardTop = Math.max(16, Math.min(viewportH - cardH - 16, cardTop));

  return { tTop, tLeft, tWidth, tHeight, cardTop, cardLeft, arrowPlacement };
}

// 4. Welcome Modal Tab Switcher Logic
function getWelcomeTabState(activeTab) {
  const tabs = ['intro', 'new', 'returning'];
  assert(tabs.includes(activeTab), `Invalid tab: ${activeTab}`);
  return {
    isIntroActive: activeTab === 'intro',
    isNewActive: activeTab === 'new',
    isReturningActive: activeTab === 'returning',
    activeTab
  };
}

// =============================================================================
// RUN TESTS
// =============================================================================
console.log('--- Bắt đầu kiểm thử Onboarding Tour & Welcome Flow ---');

// Test 1: Validate step definitions
assert.strictEqual(TOUR_STEPS.length, 5, 'Tour phải có đúng 5 bước');
const stepIds = new Set(TOUR_STEPS.map(s => s.id));
assert.strictEqual(stepIds.size, 5, 'Các ID bước tour phải là duy nhất');
TOUR_STEPS.forEach(step => {
  assert(step.title && step.title.length > 0, `Bước ${step.id} thiếu tiêu đề`);
  assert(step.desc && step.desc.length > 0, `Bước ${step.id} thiếu mô tả`);
  assert(step.icon && step.icon.length > 0, `Bước ${step.id} thiếu icon`);
  assert(['quests', 'shop', 'leaderboard'].includes(step.tab), `Bước ${step.id} tab không hợp lệ: ${step.tab}`);
});
console.log('✓ Test 1: Khai báo 5 bước tour hợp lệ và đầy đủ metadata.');

// Test 2: Tour State Machine progression (Forward & Finish)
const sm = new TourStateMachine(TOUR_STEPS);
sm.start();
assert.strictEqual(sm.isActive, true);
assert.strictEqual(sm.currentStep, 0);
assert.strictEqual(sm.activeTab, 'quests');

// Next to step 1 (add-quest)
assert.strictEqual(sm.next(), true);
assert.strictEqual(sm.currentStep, 1);

// Next to step 2 (focus-timer)
assert.strictEqual(sm.next(), true);
assert.strictEqual(sm.currentStep, 2);

// Next to step 3 (shop) - should switch to shop tab
assert.strictEqual(sm.next(), true);
assert.strictEqual(sm.currentStep, 3);
assert.strictEqual(sm.activeTab, 'shop');

// Next to step 4 (leaderboard) - should switch to leaderboard tab
assert.strictEqual(sm.next(), true);
assert.strictEqual(sm.currentStep, 4);
assert.strictEqual(sm.activeTab, 'leaderboard');

// Next on final step completes tour and resets tab to quests
assert.strictEqual(sm.next(), false);
assert.strictEqual(sm.isActive, false);
assert.strictEqual(sm.completed, true);
assert.strictEqual(sm.activeTab, 'quests');
console.log('✓ Test 2: Tiến trình duyệt bước từ 0 đến 4 và hoàn tất trở về tab quests chính xác.');

// Test 3: Backward navigation and boundary checks
sm.start();
assert.strictEqual(sm.prev(), false, 'Không thể lùi khi đang ở bước đầu tiên');
assert.strictEqual(sm.currentStep, 0);

sm.next(); // to step 1
sm.next(); // to step 2
sm.next(); // to step 3 (shop)
assert.strictEqual(sm.currentStep, 3);
assert.strictEqual(sm.activeTab, 'shop');

sm.prev(); // back to step 2 (quests)
assert.strictEqual(sm.currentStep, 2);
assert.strictEqual(sm.activeTab, 'quests');

sm.skip(); // skip tour
assert.strictEqual(sm.isActive, false);
assert.strictEqual(sm.completed, false);
assert.strictEqual(sm.activeTab, 'quests');
console.log('✓ Test 3: Điều hướng lùi (Prev) và bỏ qua (Skip) an toàn, chính xác.');

// Test 4: Welcome Modal Tab Switcher
const tIntro = getWelcomeTabState('intro');
assert.strictEqual(tIntro.isIntroActive, true);
assert.strictEqual(tIntro.isNewActive, false);
assert.strictEqual(tIntro.isReturningActive, false);

const tNew = getWelcomeTabState('new');
assert.strictEqual(tNew.isIntroActive, false);
assert.strictEqual(tNew.isNewActive, true);
assert.strictEqual(tNew.isReturningActive, false);

const tReturning = getWelcomeTabState('returning');
assert.strictEqual(tReturning.isIntroActive, false);
assert.strictEqual(tReturning.isNewActive, false);
assert.strictEqual(tReturning.isReturningActive, true);
console.log('✓ Test 4: Chuyển đổi trạng thái 3 Tab Welcome Modal hoạt động chính xác.');

// Test 5: Popover layout calculation (Mobile Viewport)
const mobileLayout = calculateTourPopoverLayout({
  targetRect: { top: 60, left: 16, width: 140, height: 40 },
  viewportW: 390,
  viewportH: 844,
  cardW: 358,
  cardH: 220
});
assert(mobileLayout.cardTop > mobileLayout.tTop + mobileLayout.tHeight, 'Card phải nằm dưới target khi có khoảng trống');
assert(mobileLayout.cardLeft >= 16, 'Card phải cách lề trái tối thiểu 16px');
assert(mobileLayout.cardLeft + 358 <= 390, 'Card không được tràn màn hình phải');
assert.strictEqual(mobileLayout.arrowPlacement, 'top', 'Mũi tên hướng lên trên khi card nằm dưới');
console.log('✓ Test 5: Tính toán vị trí và mũi tên trên giao diện Mobile chính xác, không tràn viền.');

// Test 6: Popover layout calculation (Desktop Viewport - Target at Bottom)
const desktopBottomLayout = calculateTourPopoverLayout({
  targetRect: { top: 650, left: 400, width: 200, height: 50 },
  viewportW: 1440,
  viewportH: 800,
  cardW: 420,
  cardH: 220
});
assert(desktopBottomLayout.cardTop < desktopBottomLayout.tTop, 'Card phải nằm trên target khi đáy màn hình không đủ chỗ');
assert.strictEqual(desktopBottomLayout.arrowPlacement, 'bottom', 'Mũi tên hướng xuống dưới khi card nằm trên');
assert(desktopBottomLayout.cardLeft >= 16 && desktopBottomLayout.cardLeft + 420 <= 1440, 'Card nằm trọn trong viewport desktop');
console.log('✓ Test 6: Tính toán đảo chiều vị trí trên Desktop khi sát đáy màn hình chuẩn xác.');

// Test 7: Avatar URL Detector Function (isAvatarUrl logic)
function isAvatarUrl(avatar) {
  return typeof avatar === 'string' && /^(https?:\/\/|\/\/|data:image\/)/i.test(avatar.trim());
}

assert.strictEqual(isAvatarUrl('https://lh3.googleusercontent.com/a/ACg8ocJHV7XXHIMcw8=s96-c'), true, 'Nhận diện chuẩn Google avatar HTTPS URL');
assert.strictEqual(isAvatarUrl('http://example.com/avatar.png'), true, 'Nhận diện chuẩn HTTP avatar URL');
assert.strictEqual(isAvatarUrl('//lh3.googleusercontent.com/avatar.jpg'), true, 'Nhận diện chuẩn protocol-relative avatar URL');
assert.strictEqual(isAvatarUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA'), true, 'Nhận diện chuẩn data URL avatar');
assert.strictEqual(isAvatarUrl('⚔️'), false, 'Emoji kiếm không phải là URL');
assert.strictEqual(isAvatarUrl('🧙‍♂️'), false, 'Emoji pháp sư không phải là URL');
assert.strictEqual(isAvatarUrl('👑'), false, 'Emoji vương miện không phải là URL');
assert.strictEqual(isAvatarUrl(''), false, 'Chuỗi rỗng không phải là URL');
assert.strictEqual(isAvatarUrl(null), false, 'null không phải là URL');
assert.strictEqual(isAvatarUrl(undefined), false, 'undefined không phải là URL');
console.log('✓ Test 7: Nhận diện chính xác định dạng Avatar URL (Google photo) và Emoji.');

// Test 8: Tour initialization modal-close selector protects tour-card & chrome elements
function filterModalsToClose(elements) {
  return elements.filter(el => {
    // Selector: .fixed[id^="modal-"]:not(#modal-welcome):not(.hidden)
    const isFixed = el.classList.includes('fixed');
    const isModalId = typeof el.id === 'string' && el.id.startsWith('modal-');
    const notWelcome = el.id !== 'modal-welcome';
    const notHidden = !el.classList.includes('hidden');
    return isFixed && isModalId && notWelcome && notHidden;
  });
}

const mockDomElements = [
  { id: 'modal-quest', classList: ['fixed', 'inset-0'] },
  { id: 'modal-reward', classList: ['fixed', 'inset-0'] },
  { id: 'modal-profile', classList: ['fixed', 'inset-0'] },
  { id: 'modal-welcome', classList: ['fixed', 'inset-0'] },
  { id: 'tour-overlay', classList: ['fixed', 'inset-0', 'hidden'] },
  { id: 'tour-card', classList: ['fixed', 'z-[108]'] },
  { id: 'toast-container', classList: ['fixed', 'bottom-4'] },
  { id: 'mobile-nav', classList: ['fixed', 'bottom-0'] }
];

const closed = filterModalsToClose(mockDomElements);
assert.strictEqual(closed.length, 3, 'Chỉ đóng đúng 3 modal đang mở (quest, reward, profile)');
assert(closed.some(e => e.id === 'modal-quest'));
assert(closed.some(e => e.id === 'modal-reward'));
assert(closed.some(e => e.id === 'modal-profile'));
assert(!closed.some(e => e.id === 'tour-card'), 'tour-card KHÔNG bao giờ bị đóng nhầm khi bắt đầu tour');
assert(!closed.some(e => e.id === 'tour-overlay'), 'tour-overlay không bị đóng');
assert(!closed.some(e => e.id === 'toast-container'), 'toast-container không bị đóng');
assert(!closed.some(e => e.id === 'mobile-nav'), 'mobile-nav không bị đóng');
console.log('✓ Test 8: Bộ lọc selector đóng modal bảo vệ an toàn cho tour-card và các thành phần giao diện.');

console.log('\n🎉 TẤT CẢ UNIT TESTS CHO ONBOARDING TOUR ĐÃ VƯỢT QUA THÀNH CÔNG!');
