import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import handler, {
  setRedisClientForTesting,
  setGoogleTokenVerifierForTesting,
  calculateNetWorth
} from '../api/sync.js';

console.log('=== Kiểm thử Toàn Diện Các Lỗi Phát Hiện Qua Rà Soát Hệ Thống ===\n');

const appCode = fs.readFileSync(path.resolve('public/app.js'), 'utf8').replace(/\r\n/g, '\n');
const syncCode = fs.readFileSync(path.resolve('api/sync.js'), 'utf8').replace(/\r\n/g, '\n');

// -----------------------------------------------------------------------------
// Test 1: BroadcastChannel Timer gửi đúng payload (questId, rewardItemId, savedTimer)
// -----------------------------------------------------------------------------
console.log('Test 1: BroadcastChannel gửi đúng action và payload khi Hold & ClearSaved');
{
  // 1.1 holdFocusTimer phải truyền questId và savedTimer khi bảo lưu nhiệm vụ
  assert.ok(
    appCode.includes("action: 'hold',\n          questId: quest.id,\n          savedTimer: quest.savedTimer"),
    'holdFocusTimer phải gửi questId và savedTimer qua BroadcastChannel khi bảo lưu nhiệm vụ'
  );

  // 1.2 holdFocusTimer phải truyền rewardItemId và savedTimer khi bảo lưu quà
  assert.ok(
    appCode.includes("action: 'hold',\n          rewardItemId: item.id,\n          savedTimer: item.savedTimer"),
    'holdFocusTimer phải gửi rewardItemId và savedTimer qua BroadcastChannel khi bảo lưu quà'
  );

  // 1.3 clearSavedQuestTimer phải gửi action: 'clearSaved' kèm questId
  assert.ok(
    appCode.includes("action: 'clearSaved',\n        questId: quest.id"),
    'clearSavedQuestTimer phải gửi action: "clearSaved" kèm questId qua BroadcastChannel'
  );

  // 1.4 clearSavedRewardTimer phải gửi action: 'clearSaved' kèm rewardItemId
  assert.ok(
    appCode.includes("action: 'clearSaved',\n        rewardItemId: item.id"),
    'clearSavedRewardTimer phải gửi action: "clearSaved" kèm rewardItemId qua BroadcastChannel'
  );

  console.log('  -> Đồng bộ BroadcastChannel Timer đa tab: OK\n');
}

// -----------------------------------------------------------------------------
// Test 2: AI Assistant Streaming không bị treo (Deadlock) khi result dài hơn chunk
// -----------------------------------------------------------------------------
console.log('Test 2: Xử lý dòng chảy Streaming Phù Thủy AI chống Deadlock');
{
  assert.ok(
    appCode.includes("if (!streamTimer) {\n                    tickStream();\n                  }"),
    'Khi event result có reply dài hơn targetReplyText, phải kích hoạt tickStream() nếu streamTimer đang null'
  );

  assert.ok(
    appCode.includes("await Promise.race([\n      typingCompletedPromise,\n      new Promise(resolve => setTimeout(resolve, 3500))\n    ]);"),
    'Phải có Promise.race kèm safety timeout để bảo đảm typingCompletedPromise không bao giờ treo vĩnh viễn'
  );

  console.log('  -> Chống treo dòng chảy AI Streaming: OK\n');
}

// -----------------------------------------------------------------------------
// Test 3: An toàn JSON Parse trong admin_clear_user_ledger
// -----------------------------------------------------------------------------
console.log('Test 3: An toàn JSON parsing trong admin_clear_user_ledger');
{
  assert.ok(
    syncCode.includes("let userData = null;\n        try { userData = JSON.parse(rawUserData); } catch (_) {}\n        if (!userData) {\n          return res.status(500).json({ error: 'Dữ liệu người chơi không hợp lệ.' });\n        }"),
    'admin_clear_user_ledger phải bọc try-catch khi parse rawUserData từ Redis'
  );

  console.log('  -> Safe JSON parsing trong Admin API: OK\n');
}

// -----------------------------------------------------------------------------
// Test 4: Điểm Leaderboard trong admin_update_user và admin_pardon chuẩn Net Worth
// -----------------------------------------------------------------------------
console.log('Test 4: Leaderboard Score tính theo Net Worth (gồm tiền gửi và nợ) trong Admin API');
{
  assert.ok(
    syncCode.includes("const netWorth = calculateNetWorth(userData.profile);\n        const score = (level * 1000) + netWorth;\n        await redis.zadd('levelup:leaderboard', score, targetSub);"),
    'admin_pardon phải tính điểm Leaderboard bằng calculateNetWorth(userData.profile)'
  );

  assert.ok(
    syncCode.includes("const netWorth = calculateNetWorth(userData.profile);\n          const score = (finalLevel * 1000) + netWorth;\n          await redis.zadd('levelup:leaderboard', score, canonicalSub);"),
    'admin_update_user phải tính điểm Leaderboard bằng calculateNetWorth(userData.profile)'
  );

  // Kiểm thử công thức calculateNetWorth với tài khoản có tiền gửi và nợ
  const mockProfile = {
    coins: 50,
    bank: {
      deposited: 100,
      depositInterest: 15,
      loan: { debt: 45 }
    }
  };
  // Net Worth = 50 + 100 + 15 - 45 = 120
  const nw = calculateNetWorth(mockProfile);
  assert.strictEqual(nw, 120, 'Net Worth phải bằng coins + deposited + depositInterest - debt');
  const level = 2;
  const score = (level * 1000) + nw;
  assert.strictEqual(score, 2120, 'Điểm xếp hạng phải là 2120');

  console.log('  -> Tính điểm Leaderboard chuẩn Net Worth: OK\n');
}

// -----------------------------------------------------------------------------
// Test 5: Giải phóng biến currentPendingVerdict và gọi renderQuests khi nhận nhiệm vụ
// -----------------------------------------------------------------------------
console.log('Test 5: Reset currentPendingVerdict và renderQuests trong acceptVerdictAndCreateQuest');
{
  const fnIndex = appCode.indexOf('async function acceptVerdictAndCreateQuest()');
  const fnEnd = appCode.indexOf('let isDebatingQuest = false;', fnIndex);
  const fnCode = appCode.slice(fnIndex, fnEnd);

  assert.ok(
    fnCode.includes('currentPendingVerdict = null;'),
    'acceptVerdictAndCreateQuest phải giải phóng currentPendingVerdict = null'
  );
  assert.ok(
    fnCode.includes('renderQuests();'),
    'acceptVerdictAndCreateQuest phải gọi renderQuests() để đồng bộ DOM tức thì'
  );

  console.log('  -> Dọn dẹp biến trạng thái và đồng bộ nhiệm vụ: OK\n');
}

// -----------------------------------------------------------------------------
// Test 6: Bọc an toàn localStorage.setItem trong Onboarding Tour
// -----------------------------------------------------------------------------
console.log('Test 6: Safe localStorage.setItem trong Onboarding Tour');
{
  const tourIndex = appCode.indexOf('function finishTour(');
  const tourEnd = appCode.indexOf('function nextTourStep', tourIndex);
  const tourCode = appCode.slice(tourIndex, tourEnd);

  assert.ok(
    tourCode.includes("try {\n    localStorage.setItem('levelup_tour_completed', 'true');\n  } catch (_) {}"),
    'finishTour phải bọc localStorage.setItem trong khối try-catch'
  );

  console.log('  -> An toàn localStorage trong Onboarding Tour: OK\n');
}

// -----------------------------------------------------------------------------
// Test 7: Dọn dẹp triệt để khóa levelup:user:${targetSubToDelete} khi xóa tài khoản
// -----------------------------------------------------------------------------
console.log('Test 7: Dọn dẹp toàn diện khóa Redis khi Admin xóa người chơi');
{
  assert.ok(
    syncCode.includes("await redis.del(`levelup:user:google:${targetSubToDelete}`);\n          await redis.del(`levelup:user:${targetSubToDelete}`);\n          await redis.del(`levelup:user:${sanitizedTarget}`);"),
    'admin_remove phải xóa cả levelup:user:${targetSubToDelete}'
  );

  console.log('  -> Dọn dẹp khóa Redis trong admin_remove: OK\n');
}

console.log('========================================================================');
console.log('🎉 TẤT CẢ 7/7 HẠNG MỤC KIỂM THỬ RÀ SOÁT CHUYÊN SÂU ĐÃ VƯỢT QUA XUẤT SẮC!');
console.log('========================================================================');
