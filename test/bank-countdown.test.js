import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  BANK_TERMS,
  LOAN_TERMS,
  calculateBankRates,
  calculateDepositPayoutInfo,
  calculateLoanCountdownInfo,
  formatBankDayHourCountdown
} from '../api/sync.js';

console.log('=== Bắt đầu kiểm thử Toàn Diện Hệ Thống Đếm Ngược Ngân Hàng (Bank Countdown Engine) ===\n');

// -----------------------------------------------------------------------------
// Test 1: Kiểm thử Đếm ngược nhận lãi Tiền gửi Linh hoạt (Flexible Deposit)
// -----------------------------------------------------------------------------
console.log('Test 1: Đếm ngược nhận lãi sổ Linh hoạt (Flexible Deposit)');
{
  const now = 1729300000000;
  const rates = { depositRate: 0.0015 }; // 0.15%/ngày

  // Sổ 100 Vàng, linh hoạt, mới gửi cách đây 2 giờ
  const dep = {
    id: 'dep_flex_1',
    amount: 100,
    termDays: 0,
    interest: 0,
    createdAt: now - 2 * 3600 * 1000,
    lastAccruedAt: now - 2 * 3600 * 1000,
    maturityAt: 0,
    status: 'active'
  };

  const payout = calculateDepositPayoutInfo(dep, rates, 1.0, now);
  assert.ok(payout, 'Phải tính được thông tin nhận lãi');
  assert.strictEqual(payout.type, 'flex', 'Loại sổ là linh hoạt');
  assert.strictEqual(payout.expectedPayoutAmount, 1, 'Lần nhận kế tiếp là 1 Vàng');

  // Với 100 Vàng, baseRate = 0.0015 -> cappedDailyInterest = 0.15 Vàng/ngày
  // Thời gian để nhận 1 Vàng: 1 / 0.15 = 6.6667 ngày = 160 giờ
  // Đã trôi qua 2 giờ -> còn lại 158 giờ
  const expectedTotalMs = Math.ceil((1 / 0.15) * 24 * 60 * 60 * 1000);
  const expectedRemainingMs = (dep.lastAccruedAt + expectedTotalMs) - now;
  assert.strictEqual(payout.msRemaining, expectedRemainingMs, 'Thời gian còn lại tính chính xác theo mili-giây');
  assert.ok(payout.msRemaining > 0, 'Còn thời gian đếm ngược');

  console.log(`  -> Sổ linh hoạt 100 Vàng: Dự kiến nhận +${payout.expectedPayoutAmount} Vàng sau ${Math.round(payout.msRemaining / 3600000)} giờ: OK\n`);
}

// -----------------------------------------------------------------------------
// Test 2: Kiểm thử Đếm ngược và Số tiền nhận cho Sổ Tiết kiệm Có Kỳ Hạn (7, 14, 30 ngày)
// -----------------------------------------------------------------------------
console.log('Test 2: Đếm ngược và số tiền nhận sổ có kỳ hạn (Term Deposit)');
{
  const now = 1729300000000;
  const rates = { depositRate: 0.0020 }; // 0.20%/ngày
  const term7Ms = 7 * 24 * 60 * 60 * 1000;
  const createdAt = now - 2 * 24 * 60 * 60 * 1000; // Đã gửi được 2 ngày
  const maturityAt = createdAt + term7Ms; // Còn 5 ngày nữa đáo hạn

  const dep7d = {
    id: 'dep_term_7d',
    amount: 500,
    termDays: 7,
    interest: 0,
    createdAt: createdAt,
    lastAccruedAt: createdAt,
    maturityAt: maturityAt,
    status: 'active'
  };

  const payout7d = calculateDepositPayoutInfo(dep7d, rates, 1.3, now);
  assert.ok(payout7d, 'Phải tính được thông tin sổ kỳ hạn');
  assert.strictEqual(payout7d.type, 'term');
  assert.strictEqual(payout7d.termDays, 7);
  assert.strictEqual(payout7d.isMatured, false, 'Chưa đến hạn đáo hạn');
  assert.strictEqual(payout7d.msRemaining, maturityAt - now, 'Thời gian đếm ngược chính xác đến ngày đáo hạn (còn 5 ngày)');
  assert.ok(payout7d.expectedPayoutAmount > 0, 'Phải có số tiền lãi nhận được khi đáo hạn');
  assert.strictEqual(payout7d.totalWithPrincipal, 500 + payout7d.expectedPayoutAmount, 'Tổng nhận về = Gốc + Lãi dự kiến');

  // Kiểm tra trường hợp sổ đã đáo hạn (now >= maturityAt)
  const pastMaturity = now - 1000;
  const depMatured = {
    id: 'dep_matured',
    amount: 200,
    termDays: 14,
    interest: 6,
    createdAt: now - 15 * 86400000,
    lastAccruedAt: pastMaturity,
    maturityAt: pastMaturity,
    status: 'matured'
  };
  const payoutMatured = calculateDepositPayoutInfo(depMatured, rates, 1.0, now);
  assert.strictEqual(payoutMatured.isMatured, true, 'Sổ đã được xác nhận là đáo hạn');
  assert.strictEqual(payoutMatured.msRemaining, 0, 'Thời gian đếm ngược là 0 khi đã đáo hạn');
  assert.strictEqual(payoutMatured.expectedPayoutAmount, 6, 'Số tiền nhận là toàn bộ lãi tích lũy');
  assert.strictEqual(payoutMatured.totalWithPrincipal, 206, 'Tổng nhận là 206 Vàng');

  console.log(`  -> Sổ 7 ngày: Đếm ngược còn ${Math.round(payout7d.msRemaining / 86400000)} ngày, nhận +${payout7d.expectedPayoutAmount} Vàng lãi khi đáo hạn: OK`);
  console.log(`  -> Sổ đã đáo hạn: Sẵn sàng nhận trọn vẹn +${payoutMatured.expectedPayoutAmount} Vàng: OK\n`);
}

// -----------------------------------------------------------------------------
// Test 3: Kiểm thử Đếm ngược Đi Vay - Thời gian tính lãi lần tiếp theo & Hết kỳ hạn vay
// -----------------------------------------------------------------------------
console.log('Test 3: Đếm ngược Đi Vay (Thời gian tính lãi tiếp theo & Thời gian hết kỳ hạn)');
{
  const now = 1729300000000;
  const rates = { borrowRate: 0.05 }; // 5.0%/ngày
  const borrowedAt = now - 10 * 3600 * 1000; // Đã vay cách đây 10 giờ
  const lastAcc = borrowedAt; // Lần tính lãi trước là lúc vay

  const loan = {
    principal: 60,
    debt: 60,
    termDays: 7,
    borrowRate: 0.05,
    autoDeductPercent: 0.50,
    borrowedAt: borrowedAt,
    lastAccruedAt: lastAcc,
    isOverdue: false
  };

  const loanInfo = calculateLoanCountdownInfo(loan, rates, now);
  assert.ok(loanInfo, 'Phải tính được thông tin đếm ngược khoản vay');

  // 1. Kiểm tra tính lãi lần tiếp theo (chu kỳ 24h kể từ lastAccruedAt)
  const expectedNextAccrual = lastAcc + 24 * 3600 * 1000;
  assert.strictEqual(loanInfo.nextAccrualTimestamp, expectedNextAccrual, 'Mốc thời gian tính lãi lần tới là đúng 24h sau');
  assert.strictEqual(loanInfo.msUntilNextAccrual, expectedNextAccrual - now, 'Thời gian còn lại tính lãi chính xác (còn 14h)');
  assert.strictEqual(loanInfo.nextInterestAmount, Math.ceil(60 * 0.05), 'Số tiền lãi sẽ tính lần tới = Math.ceil(60 * 0.05) = 3 Vàng');
  assert.strictEqual(loanInfo.isAccrualDue, false, 'Chưa đến lúc cộng lãi');

  // 2. Kiểm tra thời gian hết kỳ hạn vay
  const expectedExpire = borrowedAt + 7 * 24 * 3600 * 1000;
  assert.strictEqual(loanInfo.expireTimestamp, expectedExpire, 'Mốc hết kỳ hạn đúng 7 ngày');
  assert.strictEqual(loanInfo.msUntilExpire, expectedExpire - now, 'Thời gian còn lại của kỳ hạn chính xác');
  assert.strictEqual(loanInfo.isOverdue, false, 'Khoản vay chưa quá hạn');

  console.log(`  -> Khoản vay 60 Vàng: Tính lãi lần tới sau ${Math.round(loanInfo.msUntilNextAccrual / 3600000)}h (+${loanInfo.nextInterestAmount} Vàng), hết kỳ hạn sau ${Math.round(loanInfo.msUntilExpire / 86400000)} ngày: OK\n`);
}

// -----------------------------------------------------------------------------
// Test 4: Kiểm thử Trường hợp Khoản Vay Quá Hạn (Overdue)
// -----------------------------------------------------------------------------
console.log('Test 4: Kiểm thử Khoản vay quá hạn (Overdue)');
{
  const now = 1729300000000;
  const borrowedAt = now - 8 * 24 * 3600 * 1000; // Đã vay cách đây 8 ngày (gói 7 ngày)
  const lastAcc = now - 12 * 3600 * 1000;

  const overdueLoan = {
    principal: 40,
    debt: 52,
    termDays: 7,
    borrowRate: 0.05,
    autoDeductPercent: 0.50,
    borrowedAt: borrowedAt,
    lastAccruedAt: lastAcc,
    isOverdue: true
  };

  const info = calculateLoanCountdownInfo(overdueLoan, { borrowRate: 0.05 }, now);
  assert.strictEqual(info.isOverdue, true, 'Phải nhận diện khoản vay đã quá hạn');
  assert.strictEqual(info.msUntilExpire, 0, 'Thời gian kỳ hạn còn lại là 0 khi quá hạn');
  assert.strictEqual(info.overdueDays, 1, 'Đã quá hạn 1 ngày');
  assert.strictEqual(info.msUntilNextAccrual, (lastAcc + 24 * 3600 * 1000) - now, 'Vẫn đếm ngược thời gian tính lãi ngày kế tiếp');

  console.log('  -> Nhận diện chính xác trạng thái quá hạn và số ngày quá hạn: OK\n');
}

// -----------------------------------------------------------------------------
// Test 5: Kiểm tra Sự hiện diện của Elements trong public/index.html & public/app.js
// -----------------------------------------------------------------------------
console.log('Test 5: Kiểm tra các ID countdown trong index.html và app.js');
{
  const htmlPath = path.join(process.cwd(), 'public', 'index.html');
  const appPath = path.join(process.cwd(), 'public', 'app.js');

  const html = fs.readFileSync(htmlPath, 'utf8');
  const appJs = fs.readFileSync(appPath, 'utf8');

  // Tiền gửi countdown elements
  assert.ok(html.includes('id="bank-deposit-countdown-card"'), 'index.html phải có bank-deposit-countdown-card');
  assert.ok(html.includes('id="bank-deposit-countdown-timer"'), 'index.html phải có bank-deposit-countdown-timer');
  assert.ok(html.includes('id="bank-deposit-countdown-amount"'), 'index.html phải có bank-deposit-countdown-amount');

  // Đi vay countdown elements
  assert.ok(html.includes('id="bank-loan-next-accrual-countdown"'), 'index.html phải có bank-loan-next-accrual-countdown');
  assert.ok(html.includes('id="bank-loan-next-interest-amount"'), 'index.html phải có bank-loan-next-interest-amount');
  assert.ok(html.includes('id="bank-loan-expire-countdown"'), 'index.html phải có bank-loan-expire-countdown');
  assert.ok(html.includes('id="bank-loan-expire-status"'), 'index.html phải có bank-loan-expire-status');

  // Client bundle exported functions
  assert.ok(appJs.includes('calculateDepositPayoutInfo'), 'app.js phải chứa calculateDepositPayoutInfo');
  assert.ok(appJs.includes('calculateLoanCountdownInfo'), 'app.js phải chứa calculateLoanCountdownInfo');
  assert.ok(appJs.includes('formatBankCountdown'), 'app.js phải chứa formatBankCountdown');
  assert.ok(appJs.includes('updateBankCountdowns'), 'app.js phải chứa updateBankCountdowns');
  assert.ok(appJs.includes('startBankCountdownLoop'), 'app.js phải chứa startBankCountdownLoop');

  console.log('  -> Tất cả các phần tử giao diện và hàm xử lý đều có mặt đầy đủ trong client: OK\n');
}

// -----------------------------------------------------------------------------
// Test 6: Kiểm thử Format Đếm Ngược Theo Ngày & Giờ (Không đếm giây)
// -----------------------------------------------------------------------------
console.log('Test 6: Kiểm thử formatBankDayHourCountdown (Ngày & Giờ, không đếm giây)');
{
  // 335 giờ 59 phút 5 giây -> 13 ngày 23 giờ (khớp thực tế gói 14 ngày)
  const ms335h = (335 * 3600 + 59 * 60 + 5) * 1000;
  assert.strictEqual(formatBankDayHourCountdown(ms335h), '13 ngày 23 giờ', 'Format chính xác 13 ngày 23 giờ');

  // 24 giờ chẵn -> 1 ngày 0 giờ
  assert.strictEqual(formatBankDayHourCountdown(24 * 3600 * 1000), '1 ngày 0 giờ', 'Format chính xác 1 ngày 0 giờ');

  // 10 giờ 15 phút -> 10 giờ
  assert.strictEqual(formatBankDayHourCountdown(10 * 3600 * 1000 + 15 * 60 * 1000), '10 giờ', 'Format chính xác 10 giờ');

  // 45 phút (< 1 giờ) -> < 1 giờ
  assert.strictEqual(formatBankDayHourCountdown(45 * 60 * 1000), '< 1 giờ', 'Format chính xác < 1 giờ');

  // 0 ms và âm -> 0 giờ
  assert.strictEqual(formatBankDayHourCountdown(0), '0 giờ', 'Format 0 ms');
  assert.strictEqual(formatBankDayHourCountdown(-5000), '0 giờ', 'Format ms âm');

  // Kiểm tra SavingsColumn.tsx tích hợp formatBankDayHourCountdown cho từng sổ
  const savingsCode = fs.readFileSync('components/bank/SavingsColumn.tsx', 'utf8');
  assert.ok(savingsCode.includes('formatBankDayHourCountdown'), 'SavingsColumn.tsx phải dùng formatBankDayHourCountdown');
  assert.ok(savingsCode.includes('Nhận lãi sau:'), 'SavingsColumn.tsx phải hiển thị Nhận lãi sau trong từng sổ');

  console.log('  -> Format thời gian theo ngày, giờ và hiển thị riêng từng sổ tiết kiệm: OK\n');
}

console.log('🎉 TẤT CẢ KIỂM THỬ ĐẾM NGƯỢC NGÂN HÀNG ĐÃ HOÀN TOÀN VƯỢT QUA 100%!');
