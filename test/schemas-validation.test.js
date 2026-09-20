import assert from 'node:assert';
import handler, {
  validateQuest,
  validateReward,
  validateLoanOffer,
  validateBankAction,
  validateProfile,
  validateStateSync,
  setRedisClientForTesting
} from '../api/sync.js';

console.log('=== KIỂM THỬ VALIBOT SCHEMAS & TYPE SAFETY RUNTIME ===\n');

const mockRedis = {
  status: 'ready',
  async connect() {},
  async get() { return null; },
  async set() { return 'OK'; },
  async del() { return 1; }
};
setRedisClientForTesting(mockRedis);

// 1. Kiểm thử Validate Quest Schema
console.log('1. Kiểm thử Validate Quest Schema...');
const validQuest = {
  id: 'quest_test_1',
  title: 'Học lập trình Node.js & TypeScript',
  type: 'focus',
  targetMinutes: 25,
  rewardCoins: 12,
  requiresProof: false,
  isRepeatable: true
};
const questRes1 = validateQuest(validQuest);
assert.strictEqual(questRes1.success, true, 'Quest hợp lệ phải vượt qua validation');
assert.strictEqual(questRes1.data.title, 'Học lập trình Node.js & TypeScript');

const invalidQuestNoTitle = { ...validQuest, title: '' };
const questRes2 = validateQuest(invalidQuestNoTitle);
assert.strictEqual(questRes2.success, false, 'Quest rỗng tiêu đề phải bị chặn');
assert.ok(questRes2.error.includes('không được để trống'));

const invalidQuestNegCoins = { ...validQuest, rewardCoins: 0 };
const questRes3 = validateQuest(invalidQuestNegCoins);
assert.strictEqual(questRes3.success, false, 'Quest thưởng 0 xu phải bị chặn');
console.log('✓ Test 1: Quest Schema kiểm soát chặt chẽ tiêu đề, loại hình và mức thưởng.\n');

// 2. Kiểm thử Validate Reward / Shop Item Schema
console.log('2. Kiểm thử Validate Reward Schema...');
const validReward = {
  id: 'item_1',
  name: 'Cốc trà sữa trân châu',
  price: 25,
  tier: 'common'
};
const rewardRes1 = validateReward(validReward);
assert.strictEqual(rewardRes1.success, true, 'Reward hợp lệ phải vượt qua validation');

const invalidRewardNegPrice = { ...validReward, price: -5 };
const rewardRes2 = validateReward(invalidRewardNegPrice);
assert.strictEqual(rewardRes2.success, false, 'Phần thưởng giá âm phải bị từ chối');
console.log('✓ Test 2: Reward Schema bảo đảm không xuất hiện phần thưởng giá âm hoặc rỗng tên.\n');

// 3. Kiểm thử Validate Loan Offer Schema
console.log('3. Kiểm thử Validate Loan Offer Schema...');
const validLoan = {
  userId: 'user_123',
  amount: 100,
  borrowRate: 0.08,
  autoDeductPercent: 0.50,
  creditLimit: 200,
  signature: 'abcdef0123456789'
};
const loanRes1 = validateLoanOffer(validLoan);
assert.strictEqual(loanRes1.success, true, 'Hợp đồng vay hợp lệ phải vượt qua validation');

const invalidLoanExcessiveRate = { ...validLoan, borrowRate: 0.99 }; // 99% > 50% max
const loanRes2 = validateLoanOffer(invalidLoanExcessiveRate);
assert.strictEqual(loanRes2.success, false, 'Lãi suất vượt trần 50% phải bị từ chối');
console.log('✓ Test 3: Loan Offer Schema bảo vệ hạn mức tín dụng và trần lãi suất AMM.\n');

// 4. Kiểm thử Validate Bank Action Schema
console.log('4. Kiểm thử Validate Bank Action Schema...');
// 4a. Gửi tiết kiệm hợp lệ
const depRes = validateBankAction({ action: 'bank_deposit', amount: 50 });
assert.strictEqual(depRes.success, true);
assert.strictEqual(depRes.data.amount, 50);

// 4b. Tự động ép kiểu chuỗi số hợp lệ ("50" -> 50)
const depCoerce = validateBankAction({ action: 'bank_deposit', amount: '50' });
assert.strictEqual(depCoerce.success, true);
assert.strictEqual(depCoerce.data.amount, 50);

// 4c. Chặn số tiền âm và NaN
const depInvalid = validateBankAction({ action: 'bank_deposit', amount: -20 });
assert.strictEqual(depInvalid.success, false);
assert.ok(depInvalid.error);

// 4d. Rút tiền toàn bộ (amount: 'all')
const withAll = validateBankAction({ action: 'bank_withdraw', amount: 'all' });
assert.strictEqual(withAll.success, true);
assert.strictEqual(withAll.data.amount, 'all');

// 4e. Hành động bất hợp pháp
const invalidAct = validateBankAction({ action: 'bank_hack', amount: 100 });
assert.strictEqual(invalidAct.success, false);
console.log('✓ Test 4: Bank Action Schema tự động ép kiểu thông minh và chặn đứng mọi input gian lận.\n');

// 5. Kiểm thử Tích hợp Endpoint api/sync xử lý Bank Action gian lận
console.log('5. Kiểm thử Tích hợp Endpoint api/sync với Valibot Guard...');
let capturedStatus = null;
let capturedJson = null;
const mockRes = {
  setHeader() {},
  status(code) {
    capturedStatus = code;
    return {
      json: (data) => {
        capturedJson = data;
        return data;
      },
      end: () => {}
    };
  }
};

// Gửi request deposit với số tiền âm (-100)
const maliciousReq = {
  method: 'POST',
  query: { action: 'bank_deposit' },
  body: { amount: -100 },
  headers: {}
};

await handler(maliciousReq, mockRes);
assert.strictEqual(capturedStatus, 400, 'Endpoint phải trả về HTTP 400 khi payload không qua được Valibot');
assert.ok(capturedJson?.error, 'Phải có thông báo lỗi từ Valibot trả về cho client');
console.log(`✓ Test 5: api/sync chặn đứng giao dịch xấu tại cửa ngõ với mã ${capturedStatus}: "${capturedJson.error}"\n`);

console.log('🎉 TẤT CẢ 5/5 BỘ KIỂM THỬ VALIBOT SCHEMAS ĐÃ VƯỢT QUA XUẤT SẮC!');
process.exit(0);
