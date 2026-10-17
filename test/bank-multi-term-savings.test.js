import assert from 'node:assert';
import {
  BANK_TERMS,
  DAILY_DEPOSIT_INTEREST_CAP,
  calculateEffectiveDepositBase,
  calculateDisciplineMultiplier,
  calculateBankRates,
  normalizeBankDeposits,
  accrueUserBank
} from '../api/sync.js';

console.log('=== Bắt đầu kiểm thử Toàn Diện Hệ Thống Sổ Tiết Kiệm Đa Kỳ Hạn (A, B, C, D) ===\n');

// -----------------------------------------------------------------------------
// Test 1: Kiểm thử Phương án A - Lãi suất AMM cân bằng & Không Floor Rule ảo
// -----------------------------------------------------------------------------
console.log('Test 1: Lãi suất cơ sở cân bằng cho RPG & Loại bỏ Floor Rule ảo');
{
  const lowUtilPool = { poolGold: 1000, totalBorrowed: 0 };
  const lowRates = calculateBankRates(lowUtilPool);
  assert.ok(lowRates.depositRate >= 0.0010 && lowRates.depositRate <= 0.0015, 'Lãi suất sàn phải trong khoảng 0.10% - 0.15%/ngày');

  const highUtilPool = { poolGold: 100, totalBorrowed: 900 };
  const highRates = calculateBankRates(highUtilPool);
  assert.ok(highRates.depositRate <= 0.0030, 'Lãi suất tối đa không vượt quá 0.30%/ngày');

  // Kiểm tra tài khoản nhỏ 10 Vàng sau 1 ngày (trước đây bị ép 1 Vàng/ngày = 10%/ngày)
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const smallBank = {
    deposited: 10,
    depositInterest: 0,
    lastDepositAt: oneDayAgo,
    deposits: [{
      id: 'dep_small',
      amount: 10,
      termDays: 0,
      interest: 0,
      createdAt: oneDayAgo,
      lastAccruedAt: oneDayAgo,
      maturityAt: 0,
      status: 'active'
    }]
  };

  const accruedSmall = accrueUserBank(smallBank, lowRates, now, { streak: 0 });
  // 10 Vàng * 0.0012 * 0.8 = 0.0096 Vàng -> floor = 0 Vàng (không bị làm tròn ảo thành 1 Vàng)
  assert.strictEqual(accruedSmall.depositInterest, 0, '10 Vàng sau 1 ngày chưa đủ 1 Vàng lãi thì giữ nguyên, không nhân tiền ảo');
  console.log('  -> Không còn hiện tượng nhân tiền ảo do Floor Rule: OK\n');
}

// -----------------------------------------------------------------------------
// Test 2: Kiểm thử Phương án B - Bậc thang (Tiered APR) & Trần Lãi Suất Ngày (Cap 8 Vàng)
// -----------------------------------------------------------------------------
console.log('Test 2: Lãi suất Bậc Thang (Tiered APR) và Trần Lãi Ngày (Daily Cap)');
{
  assert.strictEqual(calculateEffectiveDepositBase(50), 50, 'Số dư <= 100 tính 100% gốc');
  assert.strictEqual(calculateEffectiveDepositBase(100), 100, '100 Vàng tính đủ 100 Vàng');
  // 300 Vàng: 100 + 200 * 0.7 = 240
  assert.strictEqual(calculateEffectiveDepositBase(300), 240, '300 Vàng tính theo bậc 2 là 240');
  // 1000 Vàng: 100 + 400*0.7 + 500*0.4 = 100 + 280 + 200 = 580
  assert.strictEqual(calculateEffectiveDepositBase(1000), 580, '1000 Vàng tính theo bậc 3 là 580');

  // Kiểm tra trần lãi ngày: Người gửi 50,000 Vàng để 1 ngày
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const whaleBank = {
    deposited: 50000,
    depositInterest: 0,
    deposits: [{
      id: 'dep_whale',
      amount: 50000,
      termDays: 30, // 2.0x
      interest: 0,
      createdAt: oneDayAgo,
      lastAccruedAt: oneDayAgo,
      maturityAt: now + 29 * 24 * 60 * 60 * 1000,
      status: 'active'
    }]
  };

  const accruedWhale = accrueUserBank(whaleBank, { depositRate: 0.0025 }, now, { streak: 10 });
  // Dù số dư cực lớn và x2.0 term, x1.5 streak, mỗi ngày tối đa chỉ nhận đúng DAILY_DEPOSIT_INTEREST_CAP (8 Vàng)
  assert.ok(accruedWhale.depositInterest <= DAILY_DEPOSIT_INTEREST_CAP, `Lãi nhận không được vượt quá trần ${DAILY_DEPOSIT_INTEREST_CAP} Vàng/ngày`);
  assert.strictEqual(accruedWhale.depositInterest, DAILY_DEPOSIT_INTEREST_CAP, 'Đạt đúng trần tối đa 8 Vàng/ngày');
  console.log('  -> Bậc thang và Trần lãi ngày khống chế lạm phát hiệu quả: OK\n');
}

// -----------------------------------------------------------------------------
// Test 3: Kiểm thử Phương án C - Hệ Số Kỷ Luật Streak (Discipline Bonus)
// -----------------------------------------------------------------------------
console.log('Test 3: Thưởng Kỷ Luật Chuỗi Streak (Discipline Multiplier)');
{
  const disc0 = calculateDisciplineMultiplier({ streak: 0 });
  assert.strictEqual(disc0.multiplier, 0.8, 'Streak 0 bị giảm 20% lãi suất');

  const disc1 = calculateDisciplineMultiplier({ streak: 2 });
  assert.strictEqual(disc1.multiplier, 1.15, 'Streak 1-2 ngày được thưởng +15% lãi suất');

  const disc3 = calculateDisciplineMultiplier({ streak: 5 });
  assert.strictEqual(disc3.multiplier, 1.3, 'Streak 3-6 ngày được thưởng +30% lãi suất');

  const disc7 = calculateDisciplineMultiplier({ streak: 14 });
  assert.strictEqual(disc7.multiplier, 1.5, 'Streak ≥ 7 ngày được siêu thưởng +50% lãi suất');
  console.log('  -> Hệ thống thưởng phạt theo chuỗi kỷ luật streak chính xác: OK\n');
}

// -----------------------------------------------------------------------------
// Test 4: Kiểm thử Phương án D - Đa Kỳ Hạn, Đáo Hạn & Phạt Rút Sớm
// -----------------------------------------------------------------------------
console.log('Test 4: Gói Tiết Kiệm Đa Kỳ Hạn (7, 14, 30 ngày) và Xử lý Đáo Hạn / Rút Sớm');
{
  assert.strictEqual(BANK_TERMS[0].rateMultiplier, 1.0, 'Gói Linh Hoạt x1.0');
  assert.strictEqual(BANK_TERMS[7].rateMultiplier, 1.3, 'Gói 7 Ngày x1.3');
  assert.strictEqual(BANK_TERMS[14].rateMultiplier, 1.6, 'Gói 14 Ngày x1.6');
  assert.strictEqual(BANK_TERMS[30].rateMultiplier, 2.0, 'Gói 30 Ngày x2.0');

  // Kiểm tra đáo hạn đúng ngày
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const maturedBank = {
    deposited: 100,
    depositInterest: 0,
    deposits: [{
      id: 'dep_7d',
      amount: 100,
      termDays: 7,
      interest: 0,
      createdAt: sevenDaysAgo,
      lastAccruedAt: sevenDaysAgo,
      maturityAt: now,
      status: 'active'
    }]
  };

  const accruedMatured = accrueUserBank(maturedBank, { depositRate: 0.0020 }, now, { streak: 5 });
  const dep = accruedMatured.deposits[0];
  assert.strictEqual(dep.status, 'matured', 'Sau 7 ngày sổ phải chuyển sang trạng thái matured');
  assert.ok(dep.interest > 0, 'Sổ đáo hạn phải tích lũy tiền lãi đầy đủ');

  // Kiểm tra tương thích ngược khi dữ liệu cũ chưa có deposits array
  const legacyBank = {
    deposited: 200,
    depositInterest: 10,
    lastDepositAt: sevenDaysAgo
  };
  const normalizedLegacy = normalizeBankDeposits(legacyBank, now);
  assert.strictEqual(normalizedLegacy.deposits.length, 1, 'Dữ liệu cũ tự động chuyển thành 1 sổ linh hoạt');
  assert.strictEqual(normalizedLegacy.deposits[0].amount, 200, 'Vốn gốc cũ được bảo toàn');
  assert.strictEqual(normalizedLegacy.deposits[0].interest, 10, 'Tiền lãi cũ được bảo toàn');
  console.log('  -> Đa kỳ hạn, đáo hạn và tương thích ngược dữ liệu cũ: OK\n');
}

console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ A, B, C, D ĐỀU VƯỢT QUA 100%!');
