/**
 * LevelUp RPG Guild — Data Schemas & Runtime Type Validation
 * Powered by Valibot (Ultra-lightweight ~1KB, Zero Overhead)
 */
import * as v from 'valibot';

/**
 * 1. Quest (Nhiệm vụ) Schema
 */
export const QuestSchema = v.looseObject({
  id: v.optional(v.string()),
  title: v.pipe(
    v.string('Tiêu đề nhiệm vụ phải là chuỗi ký tự'),
    v.minLength(1, 'Tiêu đề nhiệm vụ không được để trống')
  ),
  type: v.optional(v.picklist(['focus', 'bounty'], 'Loại nhiệm vụ phải là focus hoặc bounty'), 'focus'),
  targetMinutes: v.optional(v.pipe(v.number(), v.minValue(0, 'Thời gian tập trung không được âm')), 0),
  rewardCoins: v.optional(v.pipe(v.number(), v.minValue(1, 'Phần thưởng tối thiểu là 1 Vàng')), 1),
  requiresProof: v.optional(v.boolean(), false),
  isRepeatable: v.optional(v.boolean(), false),
  status: v.optional(v.string(), 'active'),
  completed: v.optional(v.boolean(), false),
  completedCount: v.optional(v.number(), 0),
  signature: v.optional(v.string())
});

/**
 * 2. Reward / Shop Item (Phần thưởng Tiệm) Schema
 */
export const RewardSchema = v.looseObject({
  id: v.optional(v.string()),
  name: v.pipe(
    v.string('Tên phần thưởng phải là chuỗi ký tự'),
    v.minLength(1, 'Tên phần thưởng không được để trống')
  ),
  price: v.pipe(
    v.number('Giá phần thưởng phải là số'),
    v.minValue(1, 'Giá trị phần thưởng tối thiểu là 1 Vàng')
  ),
  tier: v.optional(v.picklist(['common', 'rare', 'epic', 'legendary']), 'common'),
  targetMinutes: v.optional(v.number(), 0),
  signature: v.optional(v.string())
});

/**
 * 3. AI Loan Offer (Hợp đồng Vay vốn Tín dụng) Schema
 */
export const LoanOfferSchema = v.looseObject({
  userId: v.optional(v.string()),
  amount: v.pipe(
    v.number('Số tiền vay phải là số'),
    v.minValue(1, 'Số tiền vay tối thiểu là 1 Vàng')
  ),
  borrowRate: v.pipe(
    v.number('Lãi suất vay phải là số'),
    v.minValue(0.01, 'Lãi suất không được thấp hơn 1%/ngày'),
    v.maxValue(0.50, 'Lãi suất không được vượt quá 50%/ngày')
  ),
  autoDeductPercent: v.pipe(
    v.number('Tỷ lệ trích nợ phải là số'),
    v.minValue(0.10, 'Tỷ lệ trích nợ tối thiểu là 10%'),
    v.maxValue(1.00, 'Tỷ lệ trích nợ tối đa là 100%')
  ),
  creditLimit: v.pipe(
    v.number('Hạn mức tín dụng phải là số'),
    v.minValue(0, 'Hạn mức tín dụng không được âm')
  ),
  signature: v.optional(v.string())
});

/**
 * 4. Bank Action (Giao dịch Ngân hàng AMM) Schema
 */
export const BankActionSchema = v.looseObject({
  action: v.picklist(
    ['bank_deposit', 'bank_withdraw', 'bank_borrow', 'bank_repay'],
    'Hành động ngân hàng không hợp lệ'
  ),
  amount: v.optional(
    v.union([
      v.pipe(v.number('Số tiền giao dịch phải là số hợp lệ'), v.minValue(1, 'Số tiền giao dịch tối thiểu là 1 Vàng')),
      v.literal('all')
    ])
  ),
  rate: v.optional(v.number()),
  autoDeductPercent: v.optional(v.number()),
  creditLimit: v.optional(v.number()),
  signature: v.optional(v.string())
});

/**
 * 5. Profile (Hồ sơ Nhân vật) Schema
 */
export const ProfileSchema = v.looseObject({
  nickname: v.optional(v.string()),
  level: v.optional(v.pipe(v.number(), v.minValue(1)), 1),
  coins: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
  totalCoinsEarned: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
  exp: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
  streak: v.optional(v.pipe(v.number(), v.minValue(0)), 0),
  role: v.optional(v.picklist(['admin', 'adventurer']), 'adventurer'),
  title: v.optional(v.string()),
  avatar: v.optional(v.string())
});

/**
 * 6. Cloud State Sync Schema (Lỏng để tương thích ngược mọi phiên bản)
 */
export const StateSyncSchema = v.looseObject({
  profile: v.optional(ProfileSchema),
  quests: v.optional(v.array(v.any())),
  shopItems: v.optional(v.array(v.any())),
  inventory: v.optional(v.array(v.any())),
  ledger: v.optional(v.array(v.any())),
  completedQuestIds: v.optional(v.array(v.any())),
  lastSyncedAt: v.optional(v.number()),
  lastModified: v.optional(v.number())
});

// Helper validation functions returning clean Result object
function formatIssues(issues) {
  if (!issues || issues.length === 0) return 'Dữ liệu không hợp lệ';
  return issues.map(i => i.message || `${i.path?.[0]?.key}: không hợp lệ`).join(', ');
}

export function validateQuest(raw) {
  const result = v.safeParse(QuestSchema, raw);
  if (result.success) {
    return { success: true, data: result.output, error: null };
  }
  return { success: false, data: null, error: formatIssues(result.issues) };
}

export function validateReward(raw) {
  const result = v.safeParse(RewardSchema, raw);
  if (result.success) {
    return { success: true, data: result.output, error: null };
  }
  return { success: false, data: null, error: formatIssues(result.issues) };
}

export function validateLoanOffer(raw) {
  const result = v.safeParse(LoanOfferSchema, raw);
  if (result.success) {
    return { success: true, data: result.output, error: null };
  }
  return { success: false, data: null, error: formatIssues(result.issues) };
}

export function validateBankAction(raw) {
  if (!raw || typeof raw !== 'object') {
    return { success: false, data: null, error: 'Dữ liệu yêu cầu không hợp lệ' };
  }

  // Graceful coercion for numbers passed as strings (e.g. amount: "50")
  const prepared = { ...raw };
  if (typeof prepared.amount === 'string' && prepared.amount !== 'all') {
    const parsed = parseInt(prepared.amount, 10);
    prepared.amount = isNaN(parsed) ? prepared.amount : parsed;
  }
  if (typeof prepared.rate === 'string') {
    const parsed = parseFloat(prepared.rate);
    prepared.rate = isNaN(parsed) ? prepared.rate : parsed;
  }
  if (typeof prepared.autoDeductPercent === 'string') {
    const parsed = parseFloat(prepared.autoDeductPercent);
    prepared.autoDeductPercent = isNaN(parsed) ? prepared.autoDeductPercent : parsed;
  }
  if (typeof prepared.creditLimit === 'string') {
    const parsed = parseInt(prepared.creditLimit, 10);
    prepared.creditLimit = isNaN(parsed) ? prepared.creditLimit : parsed;
  }

  // Specific domain validations
  if (prepared.action === 'bank_deposit' && (prepared.amount === undefined || prepared.amount === null || prepared.amount === 'all' || typeof prepared.amount !== 'number' || prepared.amount <= 0)) {
    return { success: false, data: null, error: 'Số Vàng gửi tiết kiệm phải lớn hơn 0.' };
  }
  if (prepared.action === 'bank_borrow' && (prepared.amount === undefined || prepared.amount === null || prepared.amount === 'all' || typeof prepared.amount !== 'number' || prepared.amount <= 0)) {
    return { success: false, data: null, error: 'Số Vàng vay phải lớn hơn 0.' };
  }

  const result = v.safeParse(BankActionSchema, prepared);
  if (result.success) {
    return { success: true, data: result.output, error: null };
  }
  return { success: false, data: null, error: formatIssues(result.issues) };
}

export function validateProfile(raw) {
  const result = v.safeParse(ProfileSchema, raw);
  if (result.success) {
    return { success: true, data: result.output, error: null };
  }
  return { success: false, data: null, error: formatIssues(result.issues) };
}

export function validateStateSync(raw) {
  const result = v.safeParse(StateSyncSchema, raw);
  if (result.success) {
    return { success: true, data: result.output, error: null };
  }
  return { success: false, data: null, error: formatIssues(result.issues) };
}
