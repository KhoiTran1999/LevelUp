import assert from 'node:assert';
import handler, {
  LOAN_TERMS,
  BANK_TERMS,
  calculateBankRates,
  accrueUserBank,
  setRedisClientForTesting,
  setGoogleTokenVerifierForTesting
} from '../api/sync.js';

console.log('=== Bắt đầu kiểm thử Toàn Diện Gói Kỳ Hạn Vay Vàng (Loan Multi-Term Engine) ===\n');

// 1. Kiểm thử cấu hình LOAN_TERMS
console.log('Test 1: Cấu hình 4 gói kỳ hạn vay');
{
  assert.ok(LOAN_TERMS[3], 'Phải có gói 3 ngày');
  assert.ok(LOAN_TERMS[7], 'Phải có gói 7 ngày');
  assert.ok(LOAN_TERMS[14], 'Phải có gói 14 ngày');
  assert.ok(LOAN_TERMS[30], 'Phải có gói 30 ngày');

  assert.strictEqual(LOAN_TERMS[3].rateMultiplier, 0.90, 'Gói 3 ngày có hệ số 0.90 (ưu đãi cấp tốc)');
  assert.strictEqual(LOAN_TERMS[7].rateMultiplier, 1.00, 'Gói 7 ngày có hệ số 1.00 (chuẩn)');
  assert.strictEqual(LOAN_TERMS[14].rateMultiplier, 1.10, 'Gói 14 ngày có hệ số 1.10');
  assert.strictEqual(LOAN_TERMS[30].rateMultiplier, 1.20, 'Gói 30 ngày có hệ số 1.20');
  console.log('  -> LOAN_TERMS đầy đủ 4 gói (3d, 7d, 14d, 30d): OK\n');
}

// 2. Kiểm thử tính lãi suất vay cuối cùng (Final Result)
console.log('Test 2: Tính toán lãi suất cuối cùng cho từng gói kỳ hạn');
{
  const pool = { poolGold: 500, totalBorrowed: 0 };
  const rates = calculateBankRates(pool);
  const baseRate = rates.borrowRate; // 0.05 (5.0%/ngày)

  const rate3d = Number((baseRate * LOAN_TERMS[3].rateMultiplier).toFixed(4));
  const rate7d = Number((baseRate * LOAN_TERMS[7].rateMultiplier).toFixed(4));
  const rate14d = Number((baseRate * LOAN_TERMS[14].rateMultiplier).toFixed(4));
  const rate30d = Number((baseRate * LOAN_TERMS[30].rateMultiplier).toFixed(4));

  assert.strictEqual(rate3d, 0.045, '3 ngày: 4.5%/ngày');
  assert.strictEqual(rate7d, 0.050, '7 ngày: 5.0%/ngày');
  assert.strictEqual(rate14d, 0.055, '14 ngày: 5.5%/ngày');
  assert.strictEqual(rate30d, 0.060, '30 ngày: 6.0%/ngày');

  // Dự tính hoàn trả khoản vay 50 Vàng trong 3 ngày vs 7 ngày
  let sim3d = 50;
  for (let d = 0; d < 3; d++) sim3d += Math.ceil(sim3d * rate3d);

  let sim7d = 50;
  for (let d = 0; d < 7; d++) sim7d += Math.ceil(sim7d * rate7d);

  assert.ok(sim3d < sim7d, 'Vay 3 ngày hoàn nợ ít hơn và phát sinh ít lãi hơn vay 7 ngày');
  console.log(`  -> Khoản vay 50 Vàng: 3 ngày trả ${sim3d} Vàng, 7 ngày trả ${sim7d} Vàng: OK\n`);
}

// 3. Kiểm thử kiểm tra quá hạn động theo loan.termDays trong accrueUserBank
console.log('Test 3: Kiểm tra quá hạn động theo loan.termDays');
{
  const now = Date.now();
  const fourDaysAgo = now - 4 * 24 * 60 * 60 * 1000;

  // Case 3a: Khoản vay gói 3 ngày, sau 4 ngày -> ĐÃ QUÁ HẠN
  const loan3d = {
    principal: 50,
    debt: 50,
    termDays: 3,
    borrowRate: 0.045,
    autoDeductPercent: 0.50,
    borrowedAt: fourDaysAgo,
    lastAccruedAt: fourDaysAgo,
    isOverdue: false
  };
  const bank3d = { deposited: 0, loan: loan3d, isFrozen: false };
  const res3d = accrueUserBank(bank3d, { borrowRate: 0.05 }, now);
  assert.strictEqual(res3d.loan.isOverdue, true, 'Gói 3 ngày sau 4 ngày phải bị đánh dấu quá hạn');
  assert.strictEqual(res3d.isFrozen, true, 'Tài khoản phải bị đóng băng khi quá hạn gói 3 ngày');

  // Case 3b: Khoản vay gói 7 ngày, sau 4 ngày -> CHƯA QUÁ HẠN
  const loan7d = {
    principal: 50,
    debt: 50,
    termDays: 7,
    borrowRate: 0.05,
    autoDeductPercent: 0.50,
    borrowedAt: fourDaysAgo,
    lastAccruedAt: fourDaysAgo,
    isOverdue: false
  };
  const bank7d = { deposited: 0, loan: loan7d, isFrozen: false };
  const res7d = accrueUserBank(bank7d, { borrowRate: 0.05 }, now);
  assert.strictEqual(res7d.loan.isOverdue, false, 'Gói 7 ngày sau 4 ngày vẫn còn 3 ngày hạn, KHÔNG quá hạn');
  assert.strictEqual(res7d.isFrozen, false, 'Tài khoản không bị đóng băng');

  // Case 3c: Khoản vay gói 14 ngày, sau 8 ngày -> CHƯA QUÁ HẠN (trước đây nếu hardcode 7 ngày sẽ bị quá hạn oan)
  const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000;
  const loan14d = {
    principal: 50,
    debt: 50,
    termDays: 14,
    borrowRate: 0.055,
    autoDeductPercent: 0.50,
    borrowedAt: eightDaysAgo,
    lastAccruedAt: eightDaysAgo,
    isOverdue: false
  };
  const bank14d = { deposited: 0, loan: loan14d, isFrozen: false };
  const res14d = accrueUserBank(bank14d, { borrowRate: 0.05 }, now);
  assert.strictEqual(res14d.loan.isOverdue, false, 'Gói 14 ngày sau 8 ngày vẫn còn 6 ngày hạn, KHÔNG bị đánh quá hạn nhầm');
  assert.strictEqual(res14d.isFrozen, false, 'Tài khoản vẫn bình thường');

  console.log('  -> Cơ chế phát hiện quá hạn chuẩn xác theo từng kỳ hạn: OK\n');
}

// 4. Kiểm thử API bank_borrow với termDays
console.log('Test 4: Endpoint API bank_borrow giải ngân với termDays được lưu trữ');
{
  const memoryStore = new Map();
  const mockRedis = {
    status: 'ready',
    async connect() {},
    async get(key) { return memoryStore.get(key) || null; },
    async set(key, val) { memoryStore.set(key, val); return 'OK'; },
    async del(key) { memoryStore.delete(key); return 1; }
  };
  setRedisClientForTesting(mockRedis);
  setGoogleTokenVerifierForTesting(async (token) => {
    if (token === 'mock_token_term') {
      return { sub: 'test_sub_borrow_term', email: 'borrow@levelup.test', name: 'Borrow Tester' };
    }
    return null;
  });

  // Khởi tạo user chưa có nợ
  const testUserKey = 'levelup:user:google:test_sub_borrow_term';
  const initialState = {
    profile: {
      sub: 'test_sub_borrow_term',
      googleId: 'test_sub_borrow_term',
      coins: 20,
      level: 2,
      streak: 3,
      totalCoinsEarned: 100,
      bank: {
        deposited: 0,
        depositInterest: 0,
        deposits: [],
        loan: null,
        isFrozen: false
      }
    },
    ledger: []
  };
  memoryStore.set(testUserKey, JSON.stringify(initialState));

  // Gọi request vay gói 14 ngày
  let responseData = null;
  let responseStatus = 200;
  const mockReq = {
    method: 'POST',
    query: { action: 'bank_borrow' },
    headers: {
      authorization: 'Bearer mock_token_term'
    },
    body: {
      amount: 30,
      termDays: 14,
      autoDeductPercent: 0.50
    }
  };
  const mockRes = {
    setHeader() { return this; },
    status(code) { responseStatus = code; return this; },
    json(data) { responseData = data; return this; }
  };

  await handler(mockReq, mockRes);

  assert.strictEqual(responseStatus, 200, 'API bank_borrow phải trả về HTTP 200');
  assert.strictEqual(responseData.success, true, 'Vay Vàng thành công');
  assert.ok(responseData.loan, 'Phải trả về thông tin khoản vay');
  assert.strictEqual(responseData.loan.termDays, 14, 'Khoản vay phải lưu đúng termDays = 14');
  assert.strictEqual(responseData.loan.principal, 30, 'Vốn gốc đã vay là 30');
  assert.strictEqual(responseData.loan.debt, 30, 'Dư nợ ban đầu là 30');
  // Base rate 0.05 * 1.10 = 0.055
  assert.strictEqual(responseData.loan.borrowRate, 0.055, 'Lãi suất áp dụng đúng hệ số gói 14 ngày (5.5%/ngày)');
  assert.ok(responseData.ledger[0].description.includes('14 Ngày'), 'Nhật ký giao dịch ghi rõ kỳ hạn 14 Ngày');

  console.log('  -> API giải ngân thành công với termDays và hệ số lãi chính xác: OK\n');
}

console.log('🎉 TẤT CẢ KIỂM THỬ KỲ HẠN VAY VÀNG ĐÃ VƯỢT QUA 100%!');
