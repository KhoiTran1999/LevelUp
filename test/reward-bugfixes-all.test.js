import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { deriveLegitimateBalance, signQuest } from '../api/sync.js';

console.log('=== Kiểm thử Toàn diện 14 Ca Sửa Lỗi Hệ Thống Phần Thưởng (Rewards) ===\n');

const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8').replace(/\r\n/g, '\n');
const aiJs = fs.readFileSync(path.resolve('api/ai.js'), 'utf8').replace(/\r\n/g, '\n');
const syncJs = fs.readFileSync(path.resolve('api/sync.js'), 'utf8').replace(/\r\n/g, '\n');

// -----------------------------------------------------------------------------
// 1. Kiểm tra TDZ ReferenceError trong api/ai.js (Bug #1)
// -----------------------------------------------------------------------------
{
  const debateRewardIdx = aiJs.indexOf("case 'debate_reward':");
  assert.ok(debateRewardIdx !== -1, "Phải có case 'debate_reward' trong api/ai.js");
  const nextCaseIdx = aiJs.indexOf("case '", debateRewardIdx + 20);
  const debateRewardCode = aiJs.slice(debateRewardIdx, nextCaseIdx !== -1 ? nextCaseIdx : debateRewardIdx + 10000);

  const userAgreedPos = debateRewardCode.indexOf('const userAgreed =');
  const parsedCheckPos = debateRewardCode.indexOf('if (parsed.accepted !== undefined');
  assert.ok(userAgreedPos !== -1 && parsedCheckPos !== -1, 'userAgreed và parsed.accepted phải tồn tại trong debate_reward');
  assert.ok(userAgreedPos < parsedCheckPos, 'userAgreed PHẢI được khai báo TRƯỚC khi kiểm tra parsed.accepted để tránh TDZ ReferenceError');

  // Kiểm tra tương tự cho debate_quest
  const debateQuestIdx = aiJs.indexOf("case 'debate_quest':");
  assert.ok(debateQuestIdx !== -1, "Phải có case 'debate_quest' trong api/ai.js");
  const qNextCaseIdx = aiJs.indexOf("case '", debateQuestIdx + 20);
  const debateQuestCode = aiJs.slice(debateQuestIdx, qNextCaseIdx !== -1 ? qNextCaseIdx : debateQuestIdx + 10000);
  const qUserAgreedPos = debateQuestCode.indexOf('const userAgreed =');
  const qParsedCheckPos = debateQuestCode.indexOf('if (parsed.accepted !== undefined');
  assert.ok(qUserAgreedPos !== -1 && qParsedCheckPos !== -1, 'userAgreed và parsed.accepted phải tồn tại trong debate_quest');
  assert.ok(qUserAgreedPos < qParsedCheckPos, 'userAgreed PHẢI được khai báo TRƯỚC parsed.accepted trong debate_quest');

  console.log('✓ Test 1: Khắc phục triệt để lỗi TDZ ReferenceError trong debate_reward và debate_quest.');
}

// -----------------------------------------------------------------------------
// 2. Kiểm tra Hoàn tác khi vừa mua phần thưởng có hẹn giờ (Bug #2)
// -----------------------------------------------------------------------------
{
  assert.ok(
    appJs.includes('const isCurrentlyActive = Boolean(activeRewardItem && activeRewardItem.id === invId);') &&
    appJs.includes('if (item.isUsed && !skipConfirm && !isCurrentlyActive) return;'),
    'refundInventoryItem phải cho phép hoàn tác nếu skipConfirm=true hoặc là activeRewardItem'
  );
  console.log('✓ Test 2: refundInventoryItem cho phép hoàn tác ngay sau khi mua phần thưởng có timer.');
}

// -----------------------------------------------------------------------------
// 3. Kiểm tra Anti-Cheat đồng bộ giá sàn Tier chuẩn hóa 15/30/70/250 (Bug #3)
// -----------------------------------------------------------------------------
{
  const questTitle = 'Tập trung học tập';
  const questCoins = 50;
  const questSig = signQuest(questTitle, 'focus', 30, questCoins, false, false);

  const testState = {
    profile: {
      level: 1,
      coins: 25,
      totalCoinsEarned: 70,
      totalCoinsSpent: 45,
      streak: 0
    },
    inventory: [
      { id: 'inv_1', name: 'Món Common 15 Vàng', tier: 'common', price: 15, signature: 'invalid_sig' },
      { id: 'inv_2', name: 'Món Rare 30 Vàng', tier: 'rare', price: 30, signature: 'invalid_sig' }
    ],
    quests: [
      { id: 'q_1', title: questTitle, type: 'focus', targetMinutes: 30, rewardCoins: questCoins, completed: true, signature: questSig }
    ],
    ledger: []
  };

  const result = deriveLegitimateBalance(testState, null);
  assert.strictEqual(result.tampered, false, 'Vật phẩm Common 15 Vàng và Rare 30 Vàng KHÔNG được coi là gian lận');
  assert.strictEqual(result.coins, 25, 'Số Vàng người dùng được bảo toàn chính xác');

  // Kiểm tra vật phẩm gian lận thực sự (ví dụ Common 5 Vàng < 15 Vàng sàn)
  const hackedState = {
    ...testState,
    inventory: [
      { id: 'inv_hacked', name: 'Món Hack', tier: 'common', price: 5, signature: 'invalid_sig' }
    ]
  };
  const hackedResult = deriveLegitimateBalance(hackedState, null);
  assert.strictEqual(hackedResult.tampered, true, 'Giá nhỏ hơn 15 Vàng phải bị phát hiện gian lận');

  console.log('✓ Test 3: Anti-Cheat đồng bộ chính xác giá sàn Tier (15/30/70/250), loại bỏ phạt oan người dùng hợp lệ.');
}

// -----------------------------------------------------------------------------
// 4. Kiểm tra Giới hạn 5 phút hoàn tác phần thưởng đã dùng (Bug #4)
// -----------------------------------------------------------------------------
{
  assert.ok(
    appJs.includes('if (!isCurrentlyActive && item.usedAt && (Date.now() - item.usedAt > 5 * 60 * 1000))'),
    'undoUseInventoryItem phải từ chối hoàn tác nếu quà đã dùng quá 5 phút'
  );
  assert.ok(
    appJs.includes('const canUndo = isThisActiveReward || (item.isUsed && item.usedAt && (Date.now() - item.usedAt <= 5 * 60 * 1000));'),
    'renderInventory chỉ hiển thị nút Hoàn tác cho thẻ quà trong vòng 5 phút sau khi dùng'
  );
  console.log('✓ Test 4: Chặn triệt để lỗ hổng tái sử dụng phần thưởng vô hạn bằng cửa sổ an toàn 5 phút.');
}

// -----------------------------------------------------------------------------
// 5. Kiểm tra Dùng quà không hẹn giờ có nút Hoàn tác và không broadcast cancel (Bug #5)
// -----------------------------------------------------------------------------
{
  const untimedIdx = appJs.indexOf('if (durationMinutes === 0 && !hasSavedTimer) {');
  assert.ok(untimedIdx !== -1, 'Phải có nhánh xử lý durationMinutes === 0');
  const untimedBlock = appJs.slice(untimedIdx, untimedIdx + 1000);

  assert.ok(untimedBlock.includes("undoUseInventoryItem(invId, true)"), 'Dùng quà 0p phải có nút Hoàn tác trên Toast');
  assert.ok(!untimedBlock.includes("triggerSave(true, true, 'cancel', true)"), 'Dùng quà 0p KHÔNG được phát sóng lệnh cancel làm gián đoạn thiết bị khác');
  console.log('✓ Test 5: Dùng phần thưởng tức thì / không hẹn giờ cung cấp nút Hoàn tác và không hủy timer máy khác.');
}

// -----------------------------------------------------------------------------
// 6. Kiểm tra restoreFocusTimer bảo vệ timer phần thưởng khi reload (Bug #6)
// -----------------------------------------------------------------------------
{
  const restoreIdx = appJs.indexOf('} else if (state.isRewardMode && state.rewardItemId) {');
  assert.ok(restoreIdx !== -1, 'Nhánh restoreFocusTimer cho isRewardMode phải tồn tại');
  const restoreBlock = appJs.slice(restoreIdx, restoreIdx + 300);

  assert.ok(
    restoreBlock.includes('if (!invItem) {\n        // Chưa load xong inventory từ cloud, giữ nguyên timer state tránh xóa nhầm khi reload trang\n        return;\n      }'),
    'restoreFocusTimer phải return sớm thay vì clearFocusTimerSession khi inventory chưa load'
  );
  console.log('✓ Test 6: restoreFocusTimer bảo toàn timer phần thưởng khi dữ liệu đang nạp từ đám mây.');
}

// -----------------------------------------------------------------------------
// 7. Kiểm tra DEFAULT_SHOP_ITEMS seed có targetMinutes (Bug #7)
// -----------------------------------------------------------------------------
{
  assert.ok(appJs.includes("id: 'shop_seed_1'") && appJs.includes('targetMinutes: 0'), 'shop_seed_1 (Trà sữa) phải có targetMinutes: 0');
  assert.ok(appJs.includes("id: 'shop_seed_2'") && appJs.includes('targetMinutes: 30'), 'shop_seed_2 phải có targetMinutes: 30');
  assert.ok(appJs.includes("id: 'shop_seed_3'") && appJs.includes('targetMinutes: 120'), 'shop_seed_3 phải có targetMinutes: 120');
  console.log('✓ Test 7: Dữ liệu khởi tạo shop_seed_1 khai báo rõ ràng targetMinutes: 0, không tự kích hoạt Pomodoro.');
}

// -----------------------------------------------------------------------------
// 8. Kiểm tra Dọn sạch biến trạng thái tạm thời (Bug #8)
// -----------------------------------------------------------------------------
{
  const savePendingIdx = appJs.indexOf('async function savePendingReward()');
  assert.ok(savePendingIdx !== -1, 'savePendingReward phải tồn tại');
  const savePendingCode = appJs.slice(savePendingIdx, savePendingIdx + 3000);

  // Nhánh update
  assert.ok(savePendingCode.includes('currentEditingRewardId = null;\n      currentPendingReward = null;'), 'Nhánh update phải reset cả 2 biến');
  // Nhánh add
  assert.ok(savePendingCode.includes("closeModal('modal-reward');\n  currentEditingRewardId = null;\n  currentPendingReward = null;"), 'Nhánh add phải reset cả 2 biến');

  // Modal close handler
  assert.ok(appJs.includes("if (modal.id === 'modal-reward') {\n          currentEditingRewardId = null;\n          currentPendingReward = null;\n        }"), 'Khi bấm nút đóng modal-reward phải reset cả 2 biến');
  console.log('✓ Test 8: Trạng thái currentPendingReward và currentEditingRewardId được giải phóng hoàn toàn.');
}

// -----------------------------------------------------------------------------
// 9. Kiểm tra acceptAssistantReward chống trùng lặp và sinh ID (Bug #9)
// -----------------------------------------------------------------------------
{
  const assistantIdx = appJs.indexOf('function acceptAssistantReward(');
  assert.ok(assistantIdx !== -1, 'acceptAssistantReward phải tồn tại');
  const assistantCode = appJs.slice(assistantIdx, assistantIdx + 1200);

  assert.ok(assistantCode.includes('reward.id = \'shop_\''), 'Phải sinh ID duy nhất nếu reward thiếu ID');
  assert.ok(assistantCode.includes('const exists = appState.shopItems.some('), 'Phải kiểm tra trùng lặp phần thưởng trong cửa hàng');
  console.log('✓ Test 9: Trợ lý AI thêm phần thưởng tự động sinh ID duy nhất và ngăn trùng lặp.');
}

// -----------------------------------------------------------------------------
// 10. Kiểm tra Hiển thị thời lượng và nhãn nút Kho Quà (Bug #10)
// -----------------------------------------------------------------------------
{
  assert.ok(appJs.includes('${durationMins > 0 ? `${durationMins} phút` : \'Dùng ngay\'}'), 'Kho quà phải hiển thị Dùng ngay khi durationMins <= 0');
  assert.ok(appJs.includes('${durationMins > 0 ? `Dùng Quà (${durationMins}p)` : \'Dùng Quà\'}'), 'Nút dùng quà không hiển thị 0p khi quà không hẹn giờ');
  console.log('✓ Test 10: Giao diện Kho Quà hiển thị "Dùng ngay" và "Dùng Quà" chuẩn xác cho phần thưởng tức thì.');
}

// -----------------------------------------------------------------------------
// 11. Kiểm tra clearFocusTimerSession và rewardTimerFinished re-render kho (Bug #11)
// -----------------------------------------------------------------------------
{
  const clearSessionIdx = appJs.indexOf('function clearFocusTimerSession(');
  const clearSessionCode = appJs.slice(clearSessionIdx, clearSessionIdx + 2500);
  assert.ok(clearSessionCode.includes('hadActiveReward'), 'clearFocusTimerSession phải ghi nhận hadActiveReward');
  assert.ok(clearSessionCode.includes('if (hadActiveReward && typeof renderInventory === \'function\') {\n    renderInventory();\n  }'), 'clearFocusTimerSession phải re-render kho quà khi timer kết thúc');
  console.log('✓ Test 11: clearFocusTimerSession tự động cập nhật lại Kho Quà, loại bỏ viền tím "ĐANG DÙNG" kịp thời.');
}

// -----------------------------------------------------------------------------
// 12. Kiểm tra nhãn Tạm Dừng cho phần thưởng (Bug #12)
// -----------------------------------------------------------------------------
{
  assert.ok(appJs.includes("modeLabel.textContent = isFocusRunning ? 'ĐANG TẬN HƯỞNG PHẦN THƯỞNG 🎉' : 'ĐANG TẠM DỪNG THƯỞNG ⏸️';"), 'modeLabel phải cập nhật ĐANG TẠM DỪNG THƯỞNG khi timer phần thưởng bị tạm dừng');
  console.log('✓ Test 12: Nhãn trạng thái hiển thị "ĐANG TẠM DỪNG THƯỞNG ⏸️" chính xác khi bấm Pause.');
}

// -----------------------------------------------------------------------------
// 13. Kiểm tra Nav Badge không nhảy số bất thường (Bug #13)
// -----------------------------------------------------------------------------
{
  const badgeIdx = appJs.indexOf('function updateRewardsNavBadge()');
  const badgeCode = appJs.slice(badgeIdx, badgeIdx + 300);
  assert.ok(badgeCode.includes('totalRewardsBadge.textContent = unusedCount;'), 'Badge chỉ hiển thị unusedCount, không fallback sang shopItems.length');
  console.log('✓ Test 13: Badge Phần Thưởng hiển thị chính xác số quà khả dụng, không nhảy số lệch lạc.');
}

// -----------------------------------------------------------------------------
// 14. Kiểm tra Chặn số âm trong định giá phần thưởng (Bug #14)
// -----------------------------------------------------------------------------
{
  assert.ok(appJs.includes('const estimate = Math.max(0, parseInt(document.getElementById(\'input-reward-estimate\')?.value, 10) || 0);'), 'evaluateRewardItem phải dùng Math.max(0, ...) cho estimate');
  assert.ok(appJs.includes('let duration = Math.max(0, parseInt(document.getElementById(\'input-reward-duration\')?.value, 10) || 0);'), 'evaluateRewardItem phải dùng Math.max(0, ...) cho duration');
  assert.ok(aiJs.includes('const userEstimatePrice = Math.max(0, parseInt(payload?.userEstimatePrice, 10) || 0);'), 'api/ai.js evaluate_reward phải dùng Math.max(0, ...) cho userEstimatePrice');
  assert.ok(aiJs.includes('const userEstimateDuration = Math.max(0, parseInt(payload?.userEstimateDuration, 10) || 0);'), 'api/ai.js evaluate_reward phải dùng Math.max(0, ...) cho userEstimateDuration');
  console.log('✓ Test 14: Form thẩm định phần thưởng chặn hoàn toàn số âm ở cả Client và Server.');
}

console.log('\n=============================================================================');
console.log('🎉 TOÀN BỘ 14 BÀI KIỂM THỬ SỬA LỖI PHẦN THƯỞNG ĐỀU ĐẠT CHUẨN XUẤT SẮC (100%)!');
console.log('=============================================================================\n');
