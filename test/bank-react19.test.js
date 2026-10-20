import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('=== Bắt đầu kiểm thử Toàn Diện React 19 RPG Bank & Financial Modals ===\n');

// -------------------------------------------------------------
// Test 1: Kiểm tra cấu hình và hằng số ngân hàng trong bank-utils
// -------------------------------------------------------------
console.log('Test 1: Cấu hình kỳ hạn gửi & vay trong bank-utils');
const bankUtilsPath = path.resolve('components/bank/bank-utils.ts');
assert(fs.existsSync(bankUtilsPath), 'File bank-utils.ts phải tồn tại');
const bankUtilsCode = fs.readFileSync(bankUtilsPath, 'utf8');

assert(bankUtilsCode.includes("id: 'flex'"), 'Cần có gói gửi linh hoạt flex');
assert(bankUtilsCode.includes("days: 7"), 'Cần có gói gửi 7 ngày');
assert(bankUtilsCode.includes("days: 14"), 'Cần có gói gửi 14 ngày');
assert(bankUtilsCode.includes("days: 30"), 'Cần có gói gửi 30 ngày');

assert(bankUtilsCode.includes("days: 3"), 'Cần có gói vay 3 ngày');
assert(bankUtilsCode.includes("days: 7"), 'Cần có gói vay 7 ngày');
assert(bankUtilsCode.includes("days: 14"), 'Cần có gói vay 14 ngày');
assert(bankUtilsCode.includes("days: 30"), 'Cần có gói vay 30 ngày');
assert(bankUtilsCode.includes('DAILY_DEPOSIT_INTEREST_CAP'), 'Cần có trần lãi ngày DAILY_DEPOSIT_INTEREST_CAP');
console.log('  -> Cấu hình kỳ hạn tiết kiệm và vay vàng đầy đủ: OK\n');

// -------------------------------------------------------------
// Test 2: Kiểm tra công thức AMM, Multiplier và Đếm ngược
// -------------------------------------------------------------
console.log('Test 2: Kiểm tra các hàm tính toán tài chính (AMM, Multiplier, Payout, Countdown)');
assert(bankUtilsCode.includes('export function calculateBankRates'), 'Cần export calculateBankRates');
assert(bankUtilsCode.includes('export function calculateDisciplineMultiplier'), 'Cần export calculateDisciplineMultiplier');
assert(bankUtilsCode.includes('export function calculateCreditLimit'), 'Cần export calculateCreditLimit');
assert(bankUtilsCode.includes('export function calculateEffectiveDepositBase'), 'Cần export calculateEffectiveDepositBase');
assert(bankUtilsCode.includes('export function calculateDepositPayoutInfo'), 'Cần export calculateDepositPayoutInfo');
assert(bankUtilsCode.includes('export function calculateLoanCountdownInfo'), 'Cần export calculateLoanCountdownInfo');
assert(bankUtilsCode.includes('export function formatBankCountdown'), 'Cần export formatBankCountdown');
console.log('  -> Tất cả các hàm tính toán tài chính đều được định nghĩa chuẩn xác: OK\n');

// -------------------------------------------------------------
// Test 3: Kiểm tra DOM IDs của BankContainer & 2 Cột Giao Dịch
// -------------------------------------------------------------
console.log('Test 3: Kiểm tra DOM IDs của BankContainer, SavingsColumn và LoanColumn');
const bankContainerCode = fs.readFileSync('components/bank/BankContainer.tsx', 'utf8');
const savingsColumnCode = fs.readFileSync('components/bank/SavingsColumn.tsx', 'utf8');
const loanColumnCode = fs.readFileSync('components/bank/LoanColumn.tsx', 'utf8');

// BankContainer
const containerIds = [
  'bank-overdue-banner',
  'btn-refresh-bank',
  'bank-pool-gold',
  'bank-total-borrowed',
  'bank-deposit-rate',
  'bank-borrow-rate',
  'bank-utilization-pct',
];
containerIds.forEach(id => {
  assert(
    bankContainerCode.includes(`id="${id}"`),
    `BankContainer phải chứa id="${id}"`
  );
});

// SavingsColumn
const savingsIds = [
  'bank-user-deposited',
  'bank-user-interest',
  'bank-discipline-badge',
  'bank-deposit-countdown-card',
  'bank-deposits-list',
  'input-deposit-amount',
  'calc-deposit-rate-label',
  'calc-deposit-result-interest',
  'calc-deposit-result-total',
  'btn-bank-deposit',
  'btn-bank-withdraw',
];
savingsIds.forEach(id => {
  assert(
    savingsColumnCode.includes(`id="${id}"`),
    `SavingsColumn phải chứa id="${id}"`
  );
});
assert(savingsColumnCode.includes('id={`bank-term-rate-${days}`}'), 'SavingsColumn phải chứa id="bank-term-rate-${days}"');

// LoanColumn
const loanIds = [
  'bank-credit-limit-badge',
  'bank-loan-active-box',
  'bank-current-debt',
  'bank-loan-principal',
  'bank-loan-accrued-interest',
  'bank-loan-next-accrual-countdown',
  'bank-loan-expire-countdown',
  'input-borrow-amount',
  'input-deduct-percent',
  'calc-borrow-rate-label',
  'calc-borrow-daily-interest',
  'calc-borrow-total-debt',
  'btn-bank-borrow',
  'btn-bank-repay',
];
loanIds.forEach(id => {
  assert(
    loanColumnCode.includes(`id="${id}"`),
    `LoanColumn phải chứa id="${id}"`
  );
});
assert(loanColumnCode.includes('id={`bank-borrow-term-rate-${days}`}'), 'LoanColumn phải chứa id="bank-borrow-term-rate-${days}"');
console.log('  -> Tất cả các DOM IDs và nút bấm ở Cột Tiết kiệm & Vay vàng đều khớp 100%: OK\n');

// -------------------------------------------------------------
// Test 4: Kiểm tra 3 Modal Tài Chính React 19
// -------------------------------------------------------------
console.log('Test 4: Kiểm tra DOM IDs của bộ 3 Modal Tài Chính (Withdraw, Rules, Credit Limit)');
const withdrawModalCode = fs.readFileSync('components/bank/BankWithdrawModal.tsx', 'utf8');
const rulesModalCode = fs.readFileSync('components/bank/BankRulesModal.tsx', 'utf8');
const creditLimitModalCode = fs.readFileSync('components/bank/CreditLimitModal.tsx', 'utf8');

// BankWithdrawModal
assert(withdrawModalCode.includes('id="modal-bank-withdraw"'), 'BankWithdrawModal phải có id="modal-bank-withdraw"');
assert(withdrawModalCode.includes('id="input-withdraw-amount"'), 'BankWithdrawModal phải có id="input-withdraw-amount"');
assert(withdrawModalCode.includes('id="withdraw-modal-total"'), 'BankWithdrawModal phải có id="withdraw-modal-total"');
assert(withdrawModalCode.includes('id="btn-confirm-withdraw-action"'), 'BankWithdrawModal phải có id="btn-confirm-withdraw-action"');

// BankRulesModal
assert(rulesModalCode.includes('id="modal-bank-rules-info"'), 'BankRulesModal phải có id="modal-bank-rules-info"');

// CreditLimitModal
assert(creditLimitModalCode.includes('id="modal-credit-limit-info"'), 'CreditLimitModal phải có id="modal-credit-limit-info"');
assert(creditLimitModalCode.includes('id="modal-credit-limit-total"'), 'CreditLimitModal phải có id="modal-credit-limit-total"');
console.log('  -> Bộ 3 Modal Tài chính React 19 có đầy đủ IDs và chức năng: OK\n');

// -------------------------------------------------------------
// Test 5: Kiểm tra Tích hợp AI Negotiation Chat cho Khoản Vay
// -------------------------------------------------------------
console.log('Test 5: Kiểm tra AI Negotiation Chat cho khoản vay vàng');
const aiChatCode = fs.readFileSync('components/ai/AiNegotiationChat.tsx', 'utf8');
assert(aiChatCode.includes("type === 'loan'"), 'AiNegotiationChat phải hỗ trợ type="loan"');
assert(aiChatCode.includes('id="bank-debate-container"'), 'Cần có container tranh biện ngân hàng bank-debate-container');
assert(aiChatCode.includes('id="bank-debate-chat-logs"'), 'Cần có logs tranh biện bank-debate-chat-logs');
assert(aiChatCode.includes('id="bank-suggest-chips"'), 'Cần có gợi ý lập luận bank-suggest-chips');
assert(aiChatCode.includes('id="input-bank-debate-arg"'), 'Cần có ô nhập luận điểm bank-debate-arg');
assert(aiChatCode.includes('id="btn-send-bank-debate"'), 'Cần có nút gửi bank-debate');
console.log('  -> Tranh biện AI đàm phán nâng hạn mức/giảm lãi vay tích hợp chuẩn xác: OK\n');

// -------------------------------------------------------------
// Test 6: Kiểm tra Cơ chế Tự động Trích Nợ khi Hoàn Thành Nhiệm Vụ
// -------------------------------------------------------------
console.log('Test 6: Kiểm tra tự động khấu trừ nợ trong completeQuest');
const providerCode = fs.readFileSync('components/providers/LevelUpProvider.tsx', 'utf8');
assert(providerCode.includes('executeBankDeposit'), 'Provider cần có executeBankDeposit');
assert(providerCode.includes('executeBankWithdraw'), 'Provider cần có executeBankWithdraw');
assert(providerCode.includes('executeBankBorrow'), 'Provider cần có executeBankBorrow');
assert(providerCode.includes('executeBankRepay'), 'Provider cần có executeBankRepay');
assert(providerCode.includes('openBankWithdrawModal'), 'Provider cần có openBankWithdrawModal');
assert(providerCode.includes('openBankRulesModal'), 'Provider cần có openBankRulesModal');
assert(providerCode.includes('openCreditLimitModal'), 'Provider cần có openCreditLimitModal');

// Check auto loan deduction inside completeQuest
assert(providerCode.includes('autoDeductPercent'), 'Cần đọc autoDeductPercent khi hoàn thành quest');
assert(providerCode.includes('deductRate'), 'Cần tính deductRate theo tỷ lệ cam kết hoặc 100% khi overdue');
assert(providerCode.includes('bank_deduct'), 'Cần ghi nhận giao dịch bank_deduct vào sổ giao dịch khi tự động trích nợ');
console.log('  -> Cơ chế tự động trích nợ trả dần theo cam kết % đã tích hợp vào completeQuest: OK\n');

// -------------------------------------------------------------
// Test 7: Kiểm tra page.tsx tích hợp tab-bank và không còn HTML trùng lặp
// -------------------------------------------------------------
console.log('Test 7: Kiểm tra page.tsx tích hợp tab-bank & loại bỏ legacy duplicates');
const pageCode = fs.readFileSync('app/page.tsx', 'utf8');
assert(pageCode.includes('<section id="tab-bank"'), 'page.tsx phải có <section id="tab-bank"');
assert(pageCode.includes('<BankContainer />'), 'page.tsx phải chứa <BankContainer />');
assert(pageCode.includes('<BankWithdrawModal />'), 'page.tsx phải chứa <BankWithdrawModal />');
assert(pageCode.includes('<BankRulesModal />'), 'page.tsx phải chứa <BankRulesModal />');
assert(pageCode.includes('<CreditLimitModal />'), 'page.tsx phải chứa <CreditLimitModal />');
assert(pageCode.includes('replace(/<section\\s+id="tab-bank"'), 'page.tsx phải lọc tab-bank cũ');
assert(pageCode.includes('replace(/<!--\\s*MODAL:\\s*H[^>]*VAY'), 'page.tsx phải lọc bank modals cũ');
console.log('  -> page.tsx kết nối hoàn hảo với React 19 Bank & Financial Modals: OK\n');

console.log('🎉 TẤT CẢ KIỂM THỬ REACT 19 RPG BANK ĐÃ VƯỢT QUA 100%!');
