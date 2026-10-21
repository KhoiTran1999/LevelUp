/**
 * Automated Test Suite: Next.js 16 Server Actions Bank Operations
 * Tests Server Actions trust boundaries, auth checks, deposit, withdraw, borrow, repay, and bank state.
 */
import assert from 'node:assert/strict';
import {
  depositGoldAction,
  withdrawGoldAction,
  borrowGoldAction,
  repayLoanAction,
  getBankStateAction,
} from '../app/actions/bank.ts';
import { setRedisClientForTesting } from '../api/sync.js';

console.log('=== KIỂM THỬ NEXT.JS SERVER ACTIONS BANK ===\n');

class InMemoryRedisMock {
  constructor() {
    this.store = new Map();
  }
  async get(key) {
    return this.store.get(key) || null;
  }
  async set(key, val) {
    this.store.set(key, val);
    return 'OK';
  }
  async del(key) {
    this.store.delete(key);
    return 1;
  }
}

const redisMock = new InMemoryRedisMock();
setRedisClientForTesting(redisMock);

const TEST_SUB = 'google_test_user_bank_actions';
const TEST_TOKEN = 'test_session_token_bank_999';

// Pre-seed session in mock Redis
await redisMock.set(`levelup:session:${TEST_TOKEN}`, JSON.stringify({
  sub: TEST_SUB,
  email: 'bankhero@levelup.local',
  name: 'Hiệp Sĩ Ngân Hàng',
  picture: '🏦'
}));

// Pre-seed initial user state with 500 gold
await redisMock.set(`levelup:user:google:${TEST_SUB}`, JSON.stringify({
  profile: {
    nickname: 'BankTester',
    coins: 500,
    level: 3,
    googleId: TEST_SUB,
    bank: {
      deposited: 0,
      depositInterest: 0,
      lastDepositAt: Date.now(),
      loan: null,
      isFrozen: false,
      deposits: [],
    },
  },
  quests: [],
  shopItems: [],
  notes: [],
  inventory: [],
  ledger: [],
}));

// Pre-seed global bank pool
await redisMock.set('levelup:bank:global_pool', JSON.stringify({
  poolGold: 5000,
  totalBorrowed: 0,
  reserveFund: 500,
  totalDeposited: 0,
  bailoutDebt: 0,
}));

// -----------------------------------------------------------------------------
// 1. Kiểm thử Bảo mật & Ranh giới tin cậy (Trust Boundaries)
// -----------------------------------------------------------------------------
{
  console.log('Test 1: Từ chối Server Actions khi chưa xác thực...');
  const resDep = await depositGoldAction(100, 0);
  assert.strictEqual(resDep.success, false, 'Phải từ chối gửi tiền khi không có session');
  assert.ok(resDep.error?.includes('đăng nhập Google'), 'Thông báo lỗi xác thực Google');

  const resWth = await withdrawGoldAction(50);
  assert.strictEqual(resWth.success, false, 'Phải từ chối rút tiền khi không có session');

  const resBor = await borrowGoldAction(100, 7, 0.5);
  assert.strictEqual(resBor.success, false, 'Phải từ chối vay tiền khi không có session');

  const resRep = await repayLoanAction(50);
  assert.strictEqual(resRep.success, false, 'Phải từ chối trả nợ khi không có session');
  console.log('  -> PASS: Đã chặn truy cập trái phép.');
}

// -----------------------------------------------------------------------------
// 2. Kiểm thử Input Validation: Tham số không hợp lệ
// -----------------------------------------------------------------------------
{
  console.log('Test 2: Kiểm tra xác thực đầu vào (Validation)...');

  // Gửi số tiền <= 0
  const zeroDep = await depositGoldAction(0, 0, TEST_TOKEN);
  assert.strictEqual(zeroDep.success, false, 'Phải từ chối gửi <= 0 Vàng');

  // Gửi số tiền vượt quá số dư trong ví
  const overDep = await depositGoldAction(999999, 0, TEST_TOKEN);
  assert.strictEqual(overDep.success, false, 'Phải từ chối khi số dư ví không đủ');
  assert.ok(overDep.error?.includes('không đủ'), 'Báo lỗi không đủ số dư');

  // Rút tiền khi chưa có khoản tiền gửi nào
  const emptyWth = await withdrawGoldAction(100, undefined, false, TEST_TOKEN);
  assert.strictEqual(emptyWth.success, false, 'Phải từ chối khi không có tiền gửi để rút');

  // Vay số tiền <= 0
  const zeroBor = await borrowGoldAction(0, 7, 0.5, undefined, TEST_TOKEN);
  assert.strictEqual(zeroBor.success, false, 'Phải từ chối vay <= 0 Vàng');

  // Trả nợ khi không có khoản nợ
  const noLoanRep = await repayLoanAction(50, TEST_TOKEN);
  assert.strictEqual(noLoanRep.success, false, 'Phải từ chối khi không có nợ');
  console.log('  -> PASS: Xác thực đầu vào hoàn toàn chính xác.');
}

// -----------------------------------------------------------------------------
// 3. Kiểm thử Gửi tiết kiệm (Deposit)
// -----------------------------------------------------------------------------
{
  console.log('Test 3: Gửi tiết kiệm thành công qua Server Action...');
  const depAmt = 200;
  const res = await depositGoldAction(depAmt, 0, TEST_TOKEN);
  assert.strictEqual(res.success, true, 'Gửi tiền phải thành công');
  assert.ok(res.data, 'Phải trả về data');
  assert.strictEqual(res.data.coins, 300, 'Số dư ví phải giảm còn 300');
  assert.strictEqual(res.data.bank.deposited, 200, 'Tài khoản tiết kiệm có 200 Vàng');
  assert.ok(Array.isArray(res.data.ledger), 'Phải có sổ cái ledger');
  assert.strictEqual(res.data.ledger[0].category, 'bank_deposit', 'Mục mới nhất trong ledger là bank_deposit');
  console.log('  -> PASS: Gửi tiết kiệm thành công, ví còn 300 Vàng.');
}

// -----------------------------------------------------------------------------
// 4. Kiểm thử Rút tiền tiết kiệm (Withdraw)
// -----------------------------------------------------------------------------
{
  console.log('Test 4: Rút tiền tiết kiệm qua Server Action...');
  const wthAmt = 100;
  const res = await withdrawGoldAction(wthAmt, undefined, true, TEST_TOKEN);
  assert.strictEqual(res.success, true, 'Rút tiền phải thành công');
  assert.ok(res.data, 'Phải có dữ liệu trả về');
  assert.strictEqual(res.data.coins, 400, 'Số dư ví tăng lên 400');
  assert.strictEqual(res.data.bank.deposited, 100, 'Sổ tiết kiệm giảm còn 100 Vàng');
  assert.strictEqual(res.data.ledger[0].category, 'bank_withdraw', 'Ledger ghi nhận bank_withdraw');
  console.log('  -> PASS: Rút tiền thành công, ví có 400 Vàng.');
}

// -----------------------------------------------------------------------------
// 5. Kiểm thử Vay vốn (Borrow) & Trả nợ (Repay)
// -----------------------------------------------------------------------------
{
  console.log('Test 5: Vay vốn và hoàn trả qua Server Actions...');
  // Vay 50 Vàng
  const borrowAmt = 50;
  const resBorrow = await borrowGoldAction(borrowAmt, 7, 0.5, undefined, TEST_TOKEN);
  assert.strictEqual(resBorrow.success, true, 'Vay tiền phải thành công');
  assert.ok(resBorrow.data?.loan, 'Khoản vay được tạo');
  assert.strictEqual(resBorrow.data.loan.debt, 50, 'Nợ 50 Vàng');
  assert.strictEqual(resBorrow.data.coins, 450, 'Ví nhận thêm 50 Vàng -> 450');

  // Trả nợ tất toán sớm
  const resRepay = await repayLoanAction('all', TEST_TOKEN);
  assert.strictEqual(resRepay.success, true, 'Trả nợ phải thành công');
  assert.strictEqual(resRepay.data?.bank.loan, null, 'Khoản vay đã được tất toán sạch');
  assert.ok(resRepay.data?.ledger[0].category === 'bank_repay', 'Ghi nhận bank_repay');
  console.log('  -> PASS: Vay và trả nợ thành công.');
}

// -----------------------------------------------------------------------------
// 6. Kiểm thử Lấy trạng thái ngân hàng (getBankStateAction)
// -----------------------------------------------------------------------------
{
  console.log('Test 6: Lấy thông tin trạng thái ngân hàng...');
  const resState = await getBankStateAction(TEST_TOKEN);
  assert.strictEqual(resState.success, true, 'Lấy state thành công');
  assert.ok(resState.data?.bank, 'Có thông tin bank của user');
  assert.ok(resState.data?.pool, 'Có thông tin pool thanh khoản');
  assert.ok(resState.data?.rates, 'Có thông tin lãi suất động');
  console.log('  -> PASS: Lấy trạng thái ngân hàng thành công.');
}

// -----------------------------------------------------------------------------
// 7. Kiểm thử Phân tách Rõ Ràng giữa "Rút Sổ" & "Rút Nhanh" (Separation of Concerns)
// -----------------------------------------------------------------------------
{
  console.log('Test 7: Phân tách nghiệp vụ giữa Rút Sổ (Term Settlement) và Rút Nhanh (Flexible Drawdown)...');

  // Gửi 1 sổ kỳ hạn 14 ngày (100 Vàng)
  const resTermDep = await depositGoldAction(100, 14, TEST_TOKEN);
  assert.strictEqual(resTermDep.success, true);
  const termDep = resTermDep.data.bank.deposits.find(d => d.termDays === 14);
  assert.ok(termDep, 'Phải có sổ 14 ngày trong danh sách');

  // Thử Rút Nhanh khi chỉ còn sổ kỳ hạn đang khóa -> Phải từ chối an toàn và hướng dẫn bấm "Rút Sổ"
  // Trước hết rút sạch phần flexible đã gửi ở test 3-4 (còn 100 Vàng 0-ngày)
  await withdrawGoldAction(100, undefined, true, TEST_TOKEN);

  const resQuickLockedOnly = await withdrawGoldAction(50, undefined, true, TEST_TOKEN);
  assert.strictEqual(resQuickLockedOnly.success, false, 'Rút nhanh phải từ chối khi chỉ có sổ kỳ hạn đang khóa');
  assert.ok(resQuickLockedOnly.error?.includes('sổ kỳ hạn đang khóa'), 'Báo lỗi hướng dẫn dùng Rút Sổ');

  // Rút Sổ trước hạn (early settlement) trên chính sổ 14 ngày đó
  const resSettleEarly = await withdrawGoldAction(undefined, termDep.id, true, TEST_TOKEN);
  assert.strictEqual(resSettleEarly.success, true, 'Rút sổ thành công');
  assert.strictEqual(resSettleEarly.data.withdrawn, 100, 'Nhận lại đúng 100 Vàng gốc, lãi bị hủy');
  assert.ok(resSettleEarly.data.message?.includes('Phạt tất toán sớm'), 'Có thông báo phạt tất toán sớm');

  console.log('  -> PASS: Phân tách hoàn hảo giữa Rút Sổ và Rút Nhanh.');
}

// -----------------------------------------------------------------------------
// 8. Kiểm thử Tất Toán Khoản Vay Quá Hạn & Đồng Bộ Hạn Mức Tín Dụng
// -----------------------------------------------------------------------------
{
  console.log('Test 8: Kiểm thử Tất toán Khoản vay quá hạn & mở khóa tài khoản...');

  // 8.1 Giả lập khoản vay gói 3 ngày đã quá hạn 4 ngày
  const rawUserState = await redisMock.get(`levelup:user:google:${TEST_SUB}`);
  const userState = JSON.parse(rawUserState);
  const fourDaysAgo = Date.now() - 4 * 24 * 3600 * 1000;
  userState.profile.title = 'Con Nợ Quá Hạn ⚠️';
  userState.profile.coins = 200;
  userState.profile.bank = {
    deposited: 0,
    depositInterest: 0,
    deposits: [],
    isFrozen: true,
    loan: {
      principal: 60,
      debt: 60,
      termDays: 3,
      borrowRate: 0.05,
      autoDeductPercent: 0.50,
      borrowedAt: fourDaysAgo,
      lastAccruedAt: fourDaysAgo,
      isOverdue: true,
    },
  };
  await redisMock.set(`levelup:user:google:${TEST_SUB}`, JSON.stringify(userState));

  // Trả nợ khoản vay quá hạn -> không bị phạt 5% phí sớm, mở đóng băng và khôi phục danh hiệu
  const resOverdueRepay = await repayLoanAction('all', TEST_TOKEN);
  assert.strictEqual(resOverdueRepay.success, true, 'Trả nợ quá hạn phải thành công');
  assert.strictEqual(resOverdueRepay.data?.bank.loan, null, 'Khoản vay đã được tất toán');
  assert.strictEqual(resOverdueRepay.data?.bank.isFrozen, false, 'Tài khoản phải được gỡ đóng băng khi sạch nợ');

  const updatedRaw = await redisMock.get(`levelup:user:google:${TEST_SUB}`);
  const updatedState = JSON.parse(updatedRaw);
  assert.notStrictEqual(updatedState.profile.title, 'Con Nợ Quá Hạn ⚠️', 'Danh hiệu con nợ phải được xóa bỏ');
  assert.strictEqual(updatedState.profile.bank.isFrozen, false, 'Trạng thái isFrozen trong DB phải là false');

  console.log('  -> PASS: Tất toán nợ quá hạn miễn 100% phí phạt và tự động gỡ đóng băng.');
}

console.log('\n=== TẤT CẢ TEST SERVER ACTIONS BANK ĐÃ VƯỢT QUA! ===');
