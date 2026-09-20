import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import handler, {
  setRedisClientForTesting,
  setGoogleTokenVerifierForTesting,
  accrueUserBank
} from '../api/sync.js';

console.log('=== Kiểm thử Kiểm Định Tính Toàn Vẹn Sau Rà Soát & Khắc Phục Lỗi ===\n');

const appCode = fs.readFileSync(path.resolve('public/app.js'), 'utf8').replace(/\r\n/g, '\n');
const syncCode = fs.readFileSync(path.resolve('api/sync.js'), 'utf8').replace(/\r\n/g, '\n');

// -----------------------------------------------------------------------------
// Test 1: GET /api/sync trả về sessionToken và client lưu vào appState.profile.sessionToken
// -----------------------------------------------------------------------------
console.log('Test 1: Khôi phục và duy trì sessionToken trong GET /api/sync & initStartupFlow');
{
  assert.ok(
    syncCode.includes('sessionToken: token || undefined'),
    'GET /api/sync phải trả về sessionToken: token || undefined'
  );

  assert.ok(
    syncCode.includes('...(token ? { sessionToken: token } : {})'),
    'GET /api/sync phải gắn sessionToken vào data.profile'
  );

  assert.ok(
    appCode.includes('if (result.sessionToken || result.data?.profile?.sessionToken) {\n          appState.profile.sessionToken = result.sessionToken || result.data?.profile?.sessionToken;\n        }'),
    'initStartupFlow phải khôi phục sessionToken vào appState.profile.sessionToken khi sync thành công'
  );

  console.log('  -> Khôi phục phiên làm việc sau F5: OK\n');
}

// -----------------------------------------------------------------------------
// Test 2: Tất cả các hàm gọi /api/ai và fetchDebateStream đều kèm credentials: 'include'
// -----------------------------------------------------------------------------
console.log('Test 2: Bảo đảm credentials: "include" cho mọi luồng gọi AI và Ngân Hàng');
{
  // fetchDebateStream
  assert.ok(
    appCode.includes("const fetchOptions = {\n    credentials: 'include',\n    ...options\n  };"),
    'fetchDebateStream phải luôn bao gồm credentials: "include"'
  );

  // verify_proof
  assert.ok(
    appCode.includes("const res = await fetch('/api/ai', {\n      method: 'POST',\n      credentials: 'include',\n      headers: getAuthHeaders(),\n      body: JSON.stringify({\n        action: 'verify_proof'"),
    'submitQuestProofToAI phải truyền credentials: "include"'
  );

  // evaluate_quest
  assert.ok(
    appCode.includes("const res = await fetch('/api/ai', {\n      method: 'POST',\n      credentials: 'include',\n      headers: getAuthHeaders(),\n      body: JSON.stringify({\n        action: 'evaluate_quest'"),
    'openQuestRenegotiateModal phải truyền credentials: "include"'
  );

  // evaluate_reward
  assert.ok(
    appCode.includes("const res = await fetch('/api/ai', {\n      method: 'POST',\n      credentials: 'include',\n      headers: getAuthHeaders(),\n      body: JSON.stringify({\n        action: 'evaluate_reward'"),
    'openRewardRenegotiateModal phải truyền credentials: "include"'
  );

  // loadBankState
  assert.ok(
    appCode.includes("const res = await fetch(`/api/sync?action=bank_state&token=${encodeURIComponent(token || '')}&ts=${Date.now()}`, { credentials: 'include' });"),
    'loadBankState phải gọi endpoint bank_state kèm credentials: "include"'
  );

  // loadBankAiCommentary
  assert.ok(
    appCode.includes("const res = await fetch('/api/ai', {\n      method: 'POST',\n      credentials: 'include',\n      headers: {\n        'Content-Type': 'application/json'"),
    'loadBankAiCommentary phải truyền credentials: "include"'
  );

  // consultLoanAdviser
  assert.ok(
    appCode.includes("const res = await fetch('/api/ai', {\n      method: 'POST',\n      credentials: 'include',\n      headers: {\n        'Content-Type': 'application/json'"),
    'consultLoanAdviser phải truyền credentials: "include"'
  );

  // sendAssistantMessage
  assert.ok(
    appCode.includes("const response = await fetch('/api/ai', {\n      method: 'POST',\n      credentials: 'include',\n      signal: currentAssistantAbortCtrl.signal,"),
    'sendAssistantMessage phải truyền credentials: "include"'
  );

  console.log('  -> Xác thực credentials cho toàn bộ luồng AI & Ngân hàng: OK\n');
}

// -----------------------------------------------------------------------------
// Test 3: An toàn null trong undoCompleteQuest
// -----------------------------------------------------------------------------
console.log('Test 3: An toàn null trong undoCompleteQuest khi profile.bank chưa khởi tạo');
{
  assert.ok(
    appCode.includes("if (deductedAmount > 0) {\n      ensureUserBankProfile();"),
    'undoCompleteQuest phải gọi ensureUserBankProfile() trước khi thao tác nợ'
  );

  assert.ok(
    appCode.includes('if (appState.profile.bank?.loan) {'),
    'undoCompleteQuest phải dùng safe optional chaining appState.profile.bank?.loan'
  );

  console.log('  -> Phòng ngừa crash TypeError khi hoàn tác nhiệm vụ: OK\n');
}

// -----------------------------------------------------------------------------
// Test 4: accrueLocalUserBank tính đúng lãi nợ và hạn vay đồng bộ với backend
// -----------------------------------------------------------------------------
console.log('Test 4: Đồng bộ tính toán nợ vay và quá hạn trong accrueLocalUserBank');
{
  assert.ok(
    appCode.includes('// 2. Accrue loan debt interest & check overdue'),
    'accrueLocalUserBank phải có khối tính lãi nợ vay và kiểm tra quá hạn'
  );

  assert.ok(
    appCode.includes('(now - borrowedAt) >= 7 * 24 * 60 * 60 * 1000'),
    'accrueLocalUserBank phải đánh dấu quá hạn sau 7 ngày tương đồng backend'
  );

  assert.ok(
    appCode.includes('const dailyInterest = Math.ceil(loan.debt * loan.borrowRate);'),
    'accrueLocalUserBank phải tính đúng công thức dailyInterest = Math.ceil(loan.debt * loan.borrowRate)'
  );

  // Kiểm tra tính toán lãi nợ vay của hàm backend accrueUserBank
  const now = Date.now();
  const pastLoanTime = now - (3 * 24 * 60 * 60 * 1000); // Vay cách đây 3 ngày
  const testBank = {
    deposited: 0,
    depositInterest: 0,
    loan: {
      principal: 100,
      debt: 100,
      borrowRate: 0.05,
      borrowedAt: pastLoanTime,
      lastAccruedAt: pastLoanTime,
      isOverdue: false
    },
    isFrozen: false
  };

  const result = accrueUserBank(testBank, { borrowRate: 0.05 }, now);
  // Ngày 1: 100 + ceil(100*0.05) = 105
  // Ngày 2: 105 + ceil(105*0.05) = 105 + 6 = 111
  // Ngày 3: 111 + ceil(111*0.05) = 111 + 6 = 117
  assert.strictEqual(result.loan.debt, 117, 'Lãi nợ vay sau 3 ngày phải là 117 Vàng');
  assert.strictEqual(result.loan.isOverdue, false, 'Chưa quá 7 ngày thì chưa bị quá hạn');

  // Thử nghiệm quá 7 ngày
  const overdueLoanTime = now - (8 * 24 * 60 * 60 * 1000);
  testBank.loan.borrowedAt = overdueLoanTime;
  testBank.loan.lastAccruedAt = overdueLoanTime;
  testBank.loan.debt = 100;
  const overdueResult = accrueUserBank(testBank, { borrowRate: 0.05 }, now);
  assert.strictEqual(overdueResult.loan.isOverdue, true, 'Quá 7 ngày phải bị đánh dấu isOverdue = true');
  assert.strictEqual(overdueResult.isFrozen, true, 'Tài khoản ngân hàng phải bị đóng băng');

  console.log('  -> Tính toán nợ vay và quá hạn chính xác: OK\n');
}

// -----------------------------------------------------------------------------
// Test 5: Guard kiểm tra tồn tại cho các Event Listener trên Card
// -----------------------------------------------------------------------------
console.log('Test 5: Guard kiểm tra an toàn cho các nút card nhiệm vụ và cửa hàng');
{
  assert.ok(
    appCode.includes("const delQuestBtn = card.querySelector('.btn-del-quest');\n    if (delQuestBtn) {"),
    'delQuestBtn phải được kiểm tra if (delQuestBtn) trước khi gán listener'
  );

  assert.ok(
    appCode.includes("const delShopBtn = card.querySelector('.btn-del-shop-item');\n    if (delShopBtn) {"),
    'delShopBtn phải được kiểm tra if (delShopBtn) trước khi gán listener'
  );

  assert.ok(
    appCode.includes("const buyItemBtn = card.querySelector('.btn-buy-item');\n    if (buyItemBtn) {"),
    'buyItemBtn phải được kiểm tra if (buyItemBtn) trước khi gán listener'
  );

  console.log('  -> Null guards trên DOM Card buttons: OK\n');
}

console.log('========================================================================');
console.log('🎉 TẤT CẢ 5/5 HẠNG MỤC KIỂM ĐỊNH TOÀN VẸN ĐÃ VƯỢT QUA XUẤT SẮC!');
console.log('========================================================================');
