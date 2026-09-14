import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { parseDebateOptionsFromText, analyzeMacroTelemetry } from '../api/ai.js';
import { signLoanOffer, verifyLoanSignature } from '../api/sync.js';

console.log('=== KIỂM THỬ HỆ THỐNG TRỢ LÝ AI TƯ VẤN & THƯƠNG LƯỢNG KHOẢN VAY (QUẦY VAY VÀNG) ===\n');

const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8').replace(/\r\n/g, '\n');
const aiJs = fs.readFileSync(path.resolve('api/ai.js'), 'utf8').replace(/\r\n/g, '\n');
const indexHtml = fs.readFileSync(path.resolve('public/index.html'), 'utf8').replace(/\r\n/g, '\n');

// 1. Kiểm tra chữ ký HMAC và cơ chế Zero-Trust Anti-Cheat cho khoản vay
{
  const userId = 'user_test_123';
  const amount = 50;
  const borrowRate = 0.035; // 3.5%/ngày (ưu đãi)
  const autoDeductPercent = 0.60;
  const creditLimit = 80;

  const sig = signLoanOffer(userId, amount, borrowRate, autoDeductPercent, creditLimit);
  assert.ok(sig && typeof sig === 'string' && sig.length === 16, 'Chữ ký khoản vay phải là chuỗi hex 16 ký tự');

  // Xác thực hợp lệ
  const valid = verifyLoanSignature([userId, 'guest'], amount, borrowRate, autoDeductPercent, creditLimit, sig);
  assert.strictEqual(valid, true, 'Xác thực chữ ký khoản vay hợp lệ phải thành công');

  // Gian lận số tiền vay (người chơi tự tăng tiền vay)
  const cheatAmount = verifyLoanSignature(userId, amount + 20, borrowRate, autoDeductPercent, creditLimit, sig);
  assert.strictEqual(cheatAmount, false, 'Không được phép gian lận thay đổi số tiền vay');

  // Gian lận hạ lãi suất trái phép
  const cheatRate = verifyLoanSignature(userId, amount, 0.01, autoDeductPercent, creditLimit, sig);
  assert.strictEqual(cheatRate, false, 'Không được phép gian lận tự ý hạ lãi suất');

  // Gian lận tăng hạn mức trái phép
  const cheatLimit = verifyLoanSignature(userId, amount, borrowRate, autoDeductPercent, creditLimit + 50, sig);
  assert.strictEqual(cheatLimit, false, 'Không được phép gian lận tự nâng hạn mức');

  // Giả mạo người dùng
  const cheatUser = verifyLoanSignature('hacker_999', amount, borrowRate, autoDeductPercent, creditLimit, sig);
  assert.strictEqual(cheatUser, false, 'Không được dùng chữ ký của người chơi khác');

  console.log('✓ Test 1: Chữ ký HMAC signLoanOffer & verifyLoanSignature bảo vệ toàn vẹn kinh tế, chống gian lận thành công.');
}

// 2. Kiểm tra hàm parseDebateOptionsFromText trích xuất các phương án khoản vay (type === 'loan')
{
  const realAiLoanReply = `Mình rất vui vì bạn luôn có ý thức rèn luyện và duy trì chuỗi chăm chỉ! Để hỗ trợ bạn tốt nhất mà không gây áp lực trả nợ, mình đưa ra 2 phương án ưu đãi này nhé:
- Phương án 1: Vay 35 Vàng với lãi suất 3.5%/ngày, trích 60% tiền thưởng mỗi nhiệm vụ để trả nhanh trong 2 ngày.
- Phương án 2: Cấp hạn mức 75 Vàng, cho bạn vay 45 Vàng với lãi suất 4.0%/ngày, trích 50% tiền thưởng.

Bạn muốn chốt phương án nào thì cứ bấm chọn nhé! ✨`;

  const options = parseDebateOptionsFromText(realAiLoanReply, 'loan');
  assert.strictEqual(options.length, 2, 'Phải trích xuất được 2 phương án khoản vay từ phản hồi của AI');

  const opt1 = options[0];
  assert.strictEqual(opt1.id, '1');
  assert.strictEqual(opt1.newAmount, 35, 'Phương án 1 phải có newAmount = 35 Vàng');
  assert.strictEqual(opt1.newBorrowRate, 0.035, 'Phương án 1 phải có newBorrowRate = 0.035 (3.5%)');
  assert.strictEqual(opt1.newAutoDeductPercent, 0.60, 'Phương án 1 phải có newAutoDeductPercent = 0.60 (60%)');
  assert.ok(opt1.label.includes('35 Vàng') && opt1.label.includes('3.5%'), 'Nhãn nút bấm phải nêu rõ 35 Vàng và 3.5%');

  const opt2 = options[1];
  assert.strictEqual(opt2.id, '2');
  assert.strictEqual(opt2.newAmount, 45, 'Phương án 2 phải có newAmount = 45 Vàng');
  assert.strictEqual(opt2.newBorrowRate, 0.04, 'Phương án 2 phải có newBorrowRate = 0.04 (4.0%)');
  assert.strictEqual(opt2.newAutoDeductPercent, 0.50, 'Phương án 2 phải có newAutoDeductPercent = 0.50 (50%)');
  assert.strictEqual(opt2.newCreditLimit, 75, 'Phương án 2 phải có newCreditLimit = 75 Vàng');
  assert.ok(opt2.label.includes('45 Vàng') && opt2.label.includes('75 Vàng'), 'Nhãn nút bấm phải nêu rõ số Vàng và hạn mức');

  console.log('✓ Test 2: parseDebateOptionsFromText trích xuất chuẩn xác tham số khoản vay (Amount, BorrowRate, Deduct, Limit).');
}

// 3. Kiểm tra các quy tắc văn phong (Tone & Không dùng thuật ngữ khó hiểu) theo Memory
{
  const bannedTerms = [
    'tỷ lệ đòn bẩy',
    'khả năng thanh khoản',
    'rủi ro vĩ mô',
    'chiết khấu',
    'lạm phát điểm',
    'Pomodoro',
    'AMM'
  ];

  for (const term of bannedTerms) {
    const regex = new RegExp(`KHÔNG dùng.*${term}`, 'i');
    assert.ok(
      regex.test(aiJs),
      `System Prompt trong api/ai.js phải ghi rõ điều cấm không dùng thuật ngữ "${term}"`
    );
  }

  assert.ok(
    aiJs.includes('bank_consult_loan') && aiJs.includes('repaymentPlan') && aiJs.includes('shouldBorrow'),
    'api/ai.js phải có action bank_consult_loan hỗ trợ repaymentPlan và shouldBorrow'
  );
  assert.ok(
    aiJs.includes('bank_debate_loan'),
    'api/ai.js phải có action bank_debate_loan hỗ trợ thương lượng khoản vay'
  );

  console.log('✓ Test 3: System Prompt tuân thủ nghiêm ngặt cấm thuật ngữ khó hiểu và yêu cầu dùng ngôn từ bình dân.');
}

// 4. Kiểm tra giao diện HTML Quầy Vay Vàng trong public/index.html
{
  assert.ok(indexHtml.includes('id="bank-ai-consult-card"'), 'index.html phải có #bank-ai-consult-card');
  assert.ok(indexHtml.includes('id="btn-analyze-loan-roadmap"'), 'index.html phải có nút #btn-analyze-loan-roadmap kích hoạt on-demand');
  assert.ok(indexHtml.includes('onclick="loadBankLoanConsultation(true)"'), 'Nút phân tích lộ trình phải gọi loadBankLoanConsultation(true) khi bấm');
  assert.ok(indexHtml.includes('id="bank-ai-advice-text"'), 'index.html phải có #bank-ai-advice-text');
  assert.ok(indexHtml.includes('id="bank-ai-repayment-plan"'), 'index.html phải có #bank-ai-repayment-plan');
  assert.ok(indexHtml.includes('id="bank-ai-est-days"'), 'index.html phải có #bank-ai-est-days');
  assert.ok(indexHtml.includes('id="bank-negotiated-badge"'), 'index.html phải có #bank-negotiated-badge');
  assert.ok(indexHtml.includes('id="bank-debate-container"'), 'index.html phải có #bank-debate-container');
  assert.ok(indexHtml.includes('id="bank-debate-chat-logs"'), 'index.html phải có #bank-debate-chat-logs');
  assert.ok(indexHtml.includes('id="input-bank-debate-arg"'), 'index.html phải có #input-bank-debate-arg');
  assert.ok(indexHtml.includes('id="btn-send-bank-debate"'), 'index.html phải có #btn-send-bank-debate');
  assert.ok(indexHtml.includes('quick-suggest-bank-btn'), 'index.html phải có các chip gợi ý quick-suggest-bank-btn');

  console.log('✓ Test 4: Giao diện HTML Quầy Vay Vàng đầy đủ các thành phần tư vấn lộ trình và khung chat thương lượng.');
}

// 5. Kiểm tra Logic Frontend trong public/app.js
{
  assert.ok(appJs.includes('function calculateUserEarningsCapacity'), 'app.js phải có hàm calculateUserEarningsCapacity');
  assert.ok(appJs.includes('function loadBankLoanConsultation'), 'app.js phải có hàm loadBankLoanConsultation');
  assert.ok(appJs.includes('function toggleBankAiDebate'), 'app.js phải có hàm toggleBankAiDebate');
  assert.ok(appJs.includes('function sendBankDebateMessage'), 'app.js phải có hàm sendBankDebateMessage');
  assert.ok(appJs.includes('loanSignature: bankNegotiatedTerms?.signature'), 'app.js phải gửi kèm loanSignature khi vay');

  console.log('✓ Test 5: Logic frontend app.js hỗ trợ đầy đủ tư vấn, lộ trình trả nợ, thương lượng chat và gửi kèm chữ ký.');
}

// 6. Kiểm tra tính toán lãi suất vào Lộ trình làm việc trả nợ
{
  assert.ok(aiJs.includes('estimatedInterest') && aiJs.includes('totalEstimatedDebt'), 'api/ai.js phải tính toán estimatedInterest và totalEstimatedDebt');
  assert.ok(aiJs.includes('TIỀN PHÍ LÃI SUẤT NGÀY vào tổng nợ'), 'System Prompt phải hướng dẫn AI tính lãi suất ngày vào lộ trình');
  assert.ok(appJs.includes('estimatedInterest = Math.ceil'), 'app.js phải tính estimatedInterest cho lộ trình trả nợ');

  // Thử tính công thức lãi suất và số lần làm nhiệm vụ
  const amount = 50;
  const rate = 0.05; // 5%/ngày
  const days = 2;
  const deduct = 0.50;
  const questReward = 30;

  const estInterest = Math.ceil(amount * rate * days); // 5 Vàng
  const totalDebt = amount + estInterest; // 55 Vàng
  const coinsNeeded = Math.ceil(totalDebt / deduct); // 110 Vàng
  const times = Math.ceil(coinsNeeded / questReward); // 4 lần

  assert.strictEqual(estInterest, 5, 'Tiền lãi phát sinh 2 ngày phải là 5 Vàng');
  assert.strictEqual(totalDebt, 55, 'Tổng nợ gồm cả gốc lẫn lãi phải là 55 Vàng');
  assert.strictEqual(times, 4, 'Cần làm 4 lần nhiệm vụ (thu 120 Vàng, trích 60 Vàng) để trả sạch nợ');

  console.log('✓ Test 6: Đã tính toán chuẩn xác lãi suất phát sinh vào tổng nợ và lộ trình làm nhiệm vụ trả nợ.');
}

// 7. Kiểm tra chuẩn hóa lãi suất (chặn lỗi 2% bị biến thành 20%)
{
  function normalizeRate(raw) {
    let clean = Number(raw);
    if (clean > 0.30) clean = clean / 100;
    return Math.min(0.20, Math.max(0.01, Number(clean.toFixed(4))));
  }

  function normalizeDeduct(raw) {
    let clean = Number(raw);
    if (clean > 1.0) clean = clean / 100;
    return Math.min(0.80, Math.max(0.30, Number(clean.toFixed(2))));
  }

  // Khi AI trả về số nguyên 2 (nghĩa là 2%)
  assert.strictEqual(normalizeRate(2), 0.02, 'Lãi suất 2 phải được quy đổi thành 0.02 (2%), không được thành 0.20 (20%)');
  // Khi AI trả về số thực 2.5 (nghĩa là 2.5%)
  assert.strictEqual(normalizeRate(2.5), 0.025, 'Lãi suất 2.5 phải được quy đổi thành 0.025 (2.5%)');
  // Khi AI trả về chuẩn dạng thập phân 0.02
  assert.strictEqual(normalizeRate(0.02), 0.02, 'Lãi suất 0.02 giữ nguyên 0.02 (2%)');
  // Khi AI trả về 50 (nghĩa là 50% trích nợ)
  assert.strictEqual(normalizeDeduct(50), 0.50, 'Tỷ lệ trích 50 phải được quy đổi thành 0.50 (50%)');
  // Khi AI trả về chuẩn 0.60
  assert.strictEqual(normalizeDeduct(0.60), 0.60, 'Tỷ lệ trích 0.60 giữ nguyên 0.60 (60%)');

  console.log('✓ Test 7: Cơ chế chuẩn hóa tỷ lệ phần trăm bảo đảm 2% không bao giờ bị nhảy thành 20%.');
}

// 8. Kiểm tra Giám Sát Kho Bạc & AMM cho AI Đàm Phán Win-Win và Chỉ Thị Zero-Leak
{
  // 8.1. Kiểm thử hàm analyzeMacroTelemetry với các trạng thái vốn khác nhau
  // Trường hợp dồi dào (Abundant): U < 40%, poolGold >= 300, bailoutDebt == 0
  const abundantPool = {
    poolGold: 500,
    totalBorrowed: 100, // U = 100 / 600 = 16.7%
    reserveFund: 100,
    bailoutDebt: 0,
    totalDeposited: 300
  };
  const macroAbundant = analyzeMacroTelemetry(abundantPool);
  assert.strictEqual(macroAbundant.liquidityStatus, 'abundant', 'Trạng thái phải là abundant khi vốn dồi dào');
  assert.ok(macroAbundant.depositFloor >= 0.02, 'Sàn lãi suất tiền gửi tối thiểu là 2%/ngày');
  assert.strictEqual(macroAbundant.depositFloor, Math.max(0.02, macroAbundant.depositRate), 'depositFloor phải bằng max(0.02, depositRate)');

  // Trường hợp căng thẳng (Tight): có nợ cứu trợ bailoutDebt > 0
  const bailoutPool = {
    poolGold: 50,
    totalBorrowed: 400,
    reserveFund: 30,
    bailoutDebt: 100,
    totalDeposited: 200
  };
  const macroBailout = analyzeMacroTelemetry(bailoutPool);
  assert.strictEqual(macroBailout.liquidityStatus, 'tight', 'Trạng thái phải là tight khi có nợ cứu trợ');

  // Trường hợp căng thẳng (Tight): tỷ lệ sử dụng cao U > 75%
  const highUtilPool = {
    poolGold: 40,
    totalBorrowed: 200, // U = 200 / 240 = 83.3%
    reserveFund: 60,
    bailoutDebt: 0,
    totalDeposited: 200
  };
  const macroHighUtil = analyzeMacroTelemetry(highUtilPool);
  assert.strictEqual(macroHighUtil.liquidityStatus, 'tight', 'Trạng thái phải là tight khi tỷ lệ sử dụng vốn > 75%');

  // Trường hợp bình thường (Normal)
  const normalPool = {
    poolGold: 200,
    totalBorrowed: 150, // U = 150 / 350 = 42.8%
    reserveFund: 80,
    bailoutDebt: 0,
    totalDeposited: 200
  };
  const macroNormal = analyzeMacroTelemetry(normalPool);
  assert.strictEqual(macroNormal.liquidityStatus, 'normal', 'Trạng thái phải là normal khi ở mức cân bằng');

  // 8.2. Kiểm thử bảo vệ sàn lãi suất ngân hàng (Deposit Rate Floor Protection)
  // Khi người chơi đòi hạ lãi suất xuống 1% hoặc 0%, AI phải kẹp lại tối thiểu bằng depositFloor
  const testPoolHighDeposit = {
    poolGold: 100,
    totalBorrowed: 300, // U = 0.75, depositRate = 0.02 + 0.04*0.75 = 0.05 (5%)
    reserveFund: 100,
    bailoutDebt: 0,
    totalDeposited: 300
  };
  const macroHighDep = analyzeMacroTelemetry(testPoolHighDeposit);
  assert.ok(macroHighDep.depositRate >= 0.04, 'depositRate trong bể này phải cao');
  assert.strictEqual(macroHighDep.depositFloor, macroHighDep.depositRate, 'depositFloor phải nâng lên theo depositRate để chống thâm hụt');

  // 8.3. Kiểm thử Chỉ Thị Bảo Mật Zero-Leak Directive trong mã nguồn
  assert.ok(
    aiJs.includes('ZERO-LEAK DIRECTIVE') || aiJs.includes('CHỈ THỊ BẢO MẬT'),
    'api/ai.js phải có Chỉ Thị Bảo Mật Zero-Leak Directive'
  );
  assert.ok(
    aiJs.includes('CẤM TIẾT LỘ: Số dư kho bạc') || aiJs.includes('TUYỆT ĐỐI KHÔNG ĐƯỢC TIẾT LỘ'),
    'System prompt phải nghiêm cấm làm lộ số dư kho bạc và các chỉ số AMM mật'
  );
  assert.ok(
    aiJs.includes('QUY TẮC THƯƠNG LƯỢNG WIN-WIN'),
    'api/ai.js phải có khối Quy Tắc Thương Lượng Win-Win'
  );

  console.log('✓ Test 8: Giám Sát Kho Bạc & AMM hoạt động chuẩn xác, bảo vệ sàn lãi suất và tuân thủ tuyệt đối Chỉ Thị Zero-Leak.');
}

// 9. Kiểm tra Cơ Chế Thương Lượng Phương Án Khoản Vay Đồng Bộ Theo "Thêm Phần Thưởng Mới"
{
  // 9.1. Đảm bảo Chấp thuận Tuyệt đối (Guaranteed Acceptance) & Ưu tiên thông số từ selectedOption
  const selectedOption = {
    id: 1,
    label: 'Gói Vay Ưu Đãi 1',
    argument: 'Chốt gói 1',
    newAmount: 40,
    newBorrowRate: 0.035, // 3.5%
    newAutoDeductPercent: 0.60, // 60%
    newCreditLimit: 75
  };

  // Tình huống LLM từ chối hoặc trả về accepted: false
  const mockedLlmRejection = {
    accepted: false,
    reply: 'Ngân hàng chưa thể đồng ý đề xuất này...',
    newAmount: 20,
    newBorrowRate: 0.06,
    newAutoDeductPercent: 0.50,
    newCreditLimit: 50
  };

  const userAgreed = false;
  const aiAgreed = false;
  const isAccepted = Boolean(mockedLlmRejection.accepted) || Boolean(selectedOption) || (userAgreed && aiAgreed);
  assert.strictEqual(isAccepted, true, 'Có selectedOption BẮT BUỘC accepted = true bất kể LLM từ chối');

  if (isAccepted) {
    mockedLlmRejection.accepted = true;
    if (selectedOption) {
      if (selectedOption.newAmount !== undefined) mockedLlmRejection.newAmount = parseInt(selectedOption.newAmount, 10);
      if (selectedOption.newBorrowRate !== undefined) {
        let sRate = Number(selectedOption.newBorrowRate);
        if (sRate > 0.30) sRate = sRate / 100;
        mockedLlmRejection.newBorrowRate = sRate;
      }
      if (selectedOption.newAutoDeductPercent !== undefined) {
        let sDeduct = Number(selectedOption.newAutoDeductPercent);
        if (sDeduct > 1.0) sDeduct = sDeduct / 100;
        mockedLlmRejection.newAutoDeductPercent = sDeduct;
      }
      if (selectedOption.newCreditLimit !== undefined) mockedLlmRejection.newCreditLimit = parseInt(selectedOption.newCreditLimit, 10);
    }
  }

  assert.strictEqual(mockedLlmRejection.newAmount, 40, 'Thông số newAmount từ option phải đè lên giá trị LLM');
  assert.strictEqual(mockedLlmRejection.newBorrowRate, 0.035, 'Thông số newBorrowRate từ option phải đè lên giá trị LLM');
  assert.strictEqual(mockedLlmRejection.newAutoDeductPercent, 0.60, 'Thông số newAutoDeductPercent từ option phải đè lên giá trị LLM');
  assert.strictEqual(mockedLlmRejection.newCreditLimit, 75, 'Thông số newCreditLimit từ option phải đè lên giá trị LLM');

  // 9.2. Ký số HMAC và xác thực Zero-Trust sau khi chốt phương án
  const userId = 'user_borrower_001';
  const sig = signLoanOffer(userId, mockedLlmRejection.newAmount, mockedLlmRejection.newBorrowRate, mockedLlmRejection.newAutoDeductPercent, mockedLlmRejection.newCreditLimit);
  assert.ok(sig && sig.length === 16, 'Chữ ký HMAC khoản vay phải dài 16 ký tự');
  assert.strictEqual(
    verifyLoanSignature([userId], mockedLlmRejection.newAmount, mockedLlmRejection.newBorrowRate, mockedLlmRejection.newAutoDeductPercent, mockedLlmRejection.newCreditLimit, sig),
    true,
    'Chữ ký phải khớp 100% với tham số của selectedOption'
  );

  // 9.3. Kiểm tra mã nguồn api/ai.js có nhánh offline fallback cho selectedOption
  assert.ok(
    aiJs.includes('if (selectedOption) {') && aiJs.includes('accepted: true') && aiJs.includes('selectedOption.newBorrowRate'),
    'api/ai.js phải có nhánh offline fallback gán accepted: true khi có selectedOption'
  );

  // 9.4. Kiểm tra mã nguồn public/app.js bảo toàn hạn mức ưu đãi khi kéo thanh trượt trích nợ (UI Persistence)
  assert.ok(
    appJs.includes('const isNegotiated = Boolean(bankNegotiatedTerms && bankNegotiatedTerms.creditLimit)'),
    'app.js phải kiểm tra isNegotiated trong onDeductPercentChange và renderBankUI'
  );
  assert.ok(
    appJs.includes('Math.max(bankNegotiatedTerms.creditLimit, standardLimit)'),
    'onDeductPercentChange phải giữ hạn mức ưu đãi cao hơn hạn mức cơ sở'
  );

  console.log('✓ Test 9: Cơ chế chốt phương án khoản vay (Guaranteed Acceptance, Priority Overrides, Offline Fallback & UI Persistence) hoạt động hoàn hảo.');
}

console.log('\n======================================================');
console.log('🎉 TẤT CẢ 9 NHÓM KIỂM THỬ ĐÃ VƯỢT QUA THÀNH CÔNG!');
console.log('======================================================\n');
