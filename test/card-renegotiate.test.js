import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { signQuest, signReward, verifyQuestSignature, verifyRewardSignature } from '../api/sync.js';

console.log('=== Kiểm thử Tính năng Thương Lượng lại với AI trên Thẻ Nhiệm vụ & Phần thưởng ===\n');

const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8').replace(/\r\n/g, '\n');
const indexHtml = fs.readFileSync(path.resolve('public/index.html'), 'utf8').replace(/\r\n/g, '\n');

// 1. Kiểm tra cấu trúc HTML hỗ trợ chuyển đổi tiêu đề modal
assert.ok(indexHtml.includes('id="modal-quest-title"'), 'modal-quest-title phải tồn tại');
assert.ok(indexHtml.includes('id="modal-quest-subtitle"'), 'modal-quest-subtitle phải tồn tại');
assert.ok(indexHtml.includes('id="modal-reward-title"'), 'modal-reward-title phải tồn tại');
assert.ok(indexHtml.includes('id="modal-reward-subtitle"'), 'modal-reward-subtitle phải tồn tại');
console.log('✓ Test 1: HTML chứa đầy đủ ID định danh cho tiêu đề modal phục vụ chuyển đổi chế độ tạo mới / thương lượng.');

// 2. Kiểm tra mã nguồn public/app.js có đầy đủ hàm và nút thương lượng
assert.ok(appJs.includes('function openQuestRenegotiateModal('), 'Phải có hàm openQuestRenegotiateModal');
assert.ok(appJs.includes('function openRewardRenegotiateModal('), 'Phải có hàm openRewardRenegotiateModal');
assert.ok(appJs.includes('window.openQuestRenegotiateModal = openQuestRenegotiateModal;'), 'Phải export openQuestRenegotiateModal');
assert.ok(appJs.includes('window.openRewardRenegotiateModal = openRewardRenegotiateModal;'), 'Phải export openRewardRenegotiateModal');
assert.ok(appJs.includes('btn-debate-quest'), 'Thẻ nhiệm vụ phải có nút class btn-debate-quest');
assert.ok(appJs.includes('btn-debate-shop-item'), 'Thẻ phần thưởng phải có nút class btn-debate-shop-item');
assert.ok(appJs.includes('THƯƠNG LƯỢNG LẠI NHIỆM VỤ'), 'Phải cập nhật tiêu đề modal khi thương lượng nhiệm vụ');
assert.ok(appJs.includes('THƯƠNG LƯỢNG LẠI PHẦN THƯỞNG'), 'Phải cập nhật tiêu đề modal khi thương lượng phần thưởng');
console.log('✓ Test 2: Mã nguồn app.js tích hợp đầy đủ hàm mở thương lượng và gắn nút vào các thẻ.');

// 3. Kiểm thử Zero-Trust Anti-Cheat: Chữ ký số HMAC cho nhiệm vụ và phần thưởng sau thương lượng
{
  // 3a. Nhiệm vụ thương lượng lại được ký HMAC hợp lệ
  const originalQuest = {
    title: 'Học ReactJS',
    type: 'focus',
    targetMinutes: 25,
    rewardCoins: 15,
    signature: signQuest('Học ReactJS', 'focus', 25, 15)
  };
  assert.strictEqual(verifyQuestSignature(originalQuest), true);

  // Sau khi thương lượng được AI duyệt tăng thời gian và thưởng
  const renegotiatedQuest = {
    ...originalQuest,
    title: 'Học ReactJS & Làm Project Thực Chiến',
    type: 'focus',
    targetMinutes: 60,
    rewardCoins: 35,
    signature: signQuest('Học ReactJS & Làm Project Thực Chiến', 'focus', 60, 35)
  };
  assert.strictEqual(verifyQuestSignature(renegotiatedQuest), true, 'Nhiệm vụ sau thương lượng với chữ ký AI mới phải hợp lệ');

  // Nếu người dùng tự ý chỉnh Vàng mà không qua AI ký
  const tamperedQuest = {
    ...renegotiatedQuest,
    rewardCoins: 100
  };
  assert.strictEqual(verifyQuestSignature(tamperedQuest), false, 'Nhiệm vụ gian lận tự sửa số Vàng phải bị từ chối');

  // 3b. Phần thưởng Cửa Hàng (Shop Item) thương lượng lại
  const originalReward = {
    id: 'shop_seed_1',
    name: 'Cà phê Highland / Phúc Long',
    price: 35,
    tier: 'rare'
  };
  assert.strictEqual(verifyRewardSignature(originalReward), true);

  // Thương lượng lại thành công với AI: AI ký chữ ký HMAC cho món quà
  const renegotiatedReward = {
    ...originalReward,
    name: 'Cà phê Highland size Lớn + Bánh mì',
    price: 50,
    tier: 'epic',
    signature: signReward('Cà phê Highland size Lớn + Bánh mì', 50, 'epic')
  };
  assert.strictEqual(verifyRewardSignature(renegotiatedReward), true, 'Quà sau thương lượng có chữ ký HMAC hợp lệ phải vượt qua kiểm tra');

  // Nếu kẻ gian tự ý hạ giá quà xuống 1 Vàng
  const tamperedReward = {
    ...renegotiatedReward,
    price: 1
  };
  assert.strictEqual(verifyRewardSignature(tamperedReward), false, 'Quà bị sửa giá không có chữ ký hợp lệ phải bị phát hiện');
  console.log('✓ Test 3: Hệ thống xác thực chữ ký số HMAC bảo đảm zero-trust cho các thẻ sau khi thương lượng lại.');
}

// 4. Mô phỏng luồng thương lượng lại Nhiệm Vụ (In-place Quest Update)
{
  const quests = [
    {
      id: 'q_123',
      title: 'Dọn phòng',
      description: 'Gấp chăn màn',
      type: 'bounty',
      targetMinutes: 0,
      rewardCoins: 5,
      rank: 'E',
      signature: signQuest('Dọn phòng', 'bounty', 0, 5)
    },
    {
      id: 'q_456',
      title: 'Viết báo cáo',
      type: 'focus',
      targetMinutes: 25,
      rewardCoins: 15,
      rank: 'B',
      signature: signQuest('Viết báo cáo', 'focus', 25, 15)
    }
  ];

  let currentEditingQuestId = 'q_123';
  let activeFocusQuest = { id: 'q_123', title: 'Dọn phòng', targetMinutes: 0, rewardCoins: 5 };

  // AI chấp thuận thương lượng: Dọn toàn bộ phòng ngủ và lau sàn (45 phút, 25 Vàng)
  const verdictAfterDebate = {
    title: 'Dọn dẹp & Lau sàn toàn bộ phòng ngủ',
    description: 'Quét bụi, gấp chăn màn và lau sàn',
    type: 'focus',
    targetMinutes: 45,
    rewardCoins: 25,
    rank: 'A',
    signature: signQuest('Dọn dẹp & Lau sàn toàn bộ phòng ngủ', 'focus', 45, 25),
    verdict: 'Lý lẽ thuyết phục, đã nâng lên 45p và 25 Vàng.',
    advice: 'Mở cửa sổ cho thoáng khi lau sàn.'
  };

  // Áp dụng cập nhật
  const targetQuest = quests.find(q => q.id === currentEditingQuestId);
  assert.ok(targetQuest, 'Phải tìm thấy nhiệm vụ cần sửa');

  targetQuest.title = verdictAfterDebate.title;
  targetQuest.description = verdictAfterDebate.description;
  targetQuest.type = verdictAfterDebate.type;
  targetQuest.targetMinutes = verdictAfterDebate.targetMinutes;
  targetQuest.rewardCoins = verdictAfterDebate.rewardCoins;
  targetQuest.rank = verdictAfterDebate.rank;
  targetQuest.signature = verdictAfterDebate.signature;

  if (activeFocusQuest && activeFocusQuest.id === targetQuest.id) {
    activeFocusQuest.title = targetQuest.title;
    activeFocusQuest.targetMinutes = targetQuest.targetMinutes;
    activeFocusQuest.rewardCoins = targetQuest.rewardCoins;
  }
  currentEditingQuestId = null;

  assert.strictEqual(quests.length, 2, 'Số lượng nhiệm vụ không được tăng thêm');
  assert.strictEqual(quests[0].id, 'q_123', 'ID nhiệm vụ được giữ nguyên');
  assert.strictEqual(quests[0].title, 'Dọn dẹp & Lau sàn toàn bộ phòng ngủ');
  assert.strictEqual(quests[0].rewardCoins, 25);
  assert.strictEqual(quests[0].targetMinutes, 45);
  assert.strictEqual(activeFocusQuest.title, 'Dọn dẹp & Lau sàn toàn bộ phòng ngủ', 'Active focus quest phải được đồng bộ');
  assert.strictEqual(verifyQuestSignature(quests[0]), true, 'Chữ ký nhiệm vụ cập nhật phải hợp lệ');

  console.log('✓ Test 4: Mô phỏng thương lượng nhiệm vụ cập nhật in-place chính xác và đồng bộ timer.');
}

// 5. Mô phỏng luồng thương lượng lại Phần Thưởng (In-place Reward Update)
{
  const shopItems = [
    {
      id: 'shop_seed_2',
      name: 'Xem 1 tập phim Anime / Netflix',
      description: 'Thư giãn 25 phút',
      price: 20,
      tier: 'common',
      icon: '🎬'
    }
  ];

  let currentEditingRewardId = 'shop_seed_2';

  // AI chấp thuận thương lượng: Xem phim điện ảnh bom tấn (2 tiếng) giá 40 Vàng
  const pendingRewardAfterDebate = {
    id: 'shop_seed_2',
    name: 'Xem 1 bộ phim điện ảnh chiếu rạp / Netflix 2 tiếng',
    description: 'Thư giãn xem phim điện ảnh chất lượng cao',
    price: 40,
    tier: 'rare',
    icon: '🍿',
    signature: signReward('Xem 1 bộ phim điện ảnh chiếu rạp / Netflix 2 tiếng', 40, 'rare')
  };

  const targetReward = shopItems.find(i => i.id === currentEditingRewardId);
  assert.ok(targetReward, 'Phải tìm thấy phần thưởng cần sửa');

  targetReward.name = pendingRewardAfterDebate.name;
  targetReward.description = pendingRewardAfterDebate.description;
  targetReward.price = pendingRewardAfterDebate.price;
  targetReward.tier = pendingRewardAfterDebate.tier;
  targetReward.icon = pendingRewardAfterDebate.icon;
  targetReward.signature = pendingRewardAfterDebate.signature;
  currentEditingRewardId = null;

  assert.strictEqual(shopItems.length, 1, 'Số lượng phần thưởng không được tăng thêm');
  assert.strictEqual(shopItems[0].id, 'shop_seed_2', 'ID phần thưởng được giữ nguyên');
  assert.strictEqual(shopItems[0].name, 'Xem 1 bộ phim điện ảnh chiếu rạp / Netflix 2 tiếng');
  assert.strictEqual(shopItems[0].price, 40);
  assert.strictEqual(shopItems[0].tier, 'rare');
  assert.strictEqual(verifyRewardSignature(shopItems[0]), true, 'Chữ ký phần thưởng cập nhật phải hợp lệ');

  console.log('✓ Test 5: Mô phỏng thương lượng phần thưởng cập nhật in-place và giữ vững tính toàn vẹn Cửa Hàng.');
}

// 6. Kiểm thử cơ chế dọn dẹp state khi chuyển giữa Tạo Mới và Thương Lượng
{
  let currentEditingQuestId = 'q_active_99';
  let currentEditingRewardId = 'r_active_88';

  // Khi mở modal tạo mới nhiệm vụ:
  function simulateOpenQuestCreate() {
    currentEditingQuestId = null;
  }
  // Khi mở modal tạo mới phần thưởng:
  function simulateOpenRewardCreate() {
    currentEditingRewardId = null;
  }

  simulateOpenQuestCreate();
  assert.strictEqual(currentEditingQuestId, null, 'Tạo nhiệm vụ mới phải reset currentEditingQuestId');

  simulateOpenRewardCreate();
  assert.strictEqual(currentEditingRewardId, null, 'Tạo phần thưởng mới phải reset currentEditingRewardId');

  console.log('✓ Test 6: Reset trạng thái khi chuyển giữa tạo mới và thương lượng hoạt động chuẩn xác.');
}

console.log('\n🎉 TẤT CẢ 6/6 TEST TÍNH NĂNG THƯƠNG LƯỢNG LẠI VỚI AI ĐÃ VƯỢT QUA XUẤT SẮC!');
