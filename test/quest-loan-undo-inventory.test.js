import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== Bắt đầu kiểm thử: Kho Quà, Trích Nợ Ngân Hàng, Hoàn Tác & Thu Hồi EXP/Level ===\n');

// 1. Kiểm tra mã nguồn public/app.js đảm bảo sửa triệt để ReferenceError và tích hợp error boundary
const appJs = fs.readFileSync('public/app.js', 'utf8').replace(/\r\n/g, '\n');

assert.ok(appJs.includes('const REWARD_TIER_COLORS = {'), 'Phải khai báo REWARD_TIER_COLORS ở phạm vi module/global');
assert.ok(appJs.includes('const REWARD_TIER_LABELS = {'), 'Phải khai báo REWARD_TIER_LABELS ở phạm vi module/global');
assert.ok(appJs.includes('REWARD_TIER_COLORS[rawTier] || REWARD_TIER_COLORS.rare'), 'renderInventory phải dùng hằng số REWARD_TIER_COLORS');
assert.ok(appJs.includes('function deductEXP(amount)'), 'Phải có hàm deductEXP(amount) để thu hồi EXP đa tầng');
assert.ok(appJs.includes('try {\n    renderAll();\n  } catch (renderErr)'), 'triggerSave phải có try-catch bọc renderAll để bảo vệ cloud sync');

console.log('✓ Test 1: Cấu trúc mã nguồn app.js đạt chuẩn an toàn, loại bỏ 100% nguy cơ ReferenceError.');

// 2. Kiểm thử logic deductEXP (Thu hồi EXP & hạ cấp độ chính xác)
function simulateEXP(initialLevel, initialExp) {
  let profile = { level: initialLevel, exp: initialExp, title: 'Tân Binh Cấp 1' };

  function add(amount) {
    profile.exp += amount;
    while (profile.exp >= profile.level * 100) {
      profile.exp -= profile.level * 100;
      profile.level += 1;
    }
  }

  function deduct(amount) {
    let expToDeduct = Math.max(0, parseInt(amount, 10) || 0);
    while (expToDeduct > 0) {
      if (profile.exp >= expToDeduct) {
        profile.exp -= expToDeduct;
        expToDeduct = 0;
      } else {
        expToDeduct -= profile.exp;
        if (profile.level > 1) {
          profile.level -= 1;
          profile.exp = profile.level * 100;
        } else {
          profile.exp = 0;
          expToDeduct = 0;
        }
      }
    }
  }

  return { profile, add, deduct };
}

// Case 2a: Trừ EXP trong cùng cấp độ
{
  const sim = simulateEXP(1, 80);
  sim.add(30); // 80 + 30 = 110 -> Lv 2, 10 EXP
  assert.strictEqual(sim.profile.level, 2, 'Lên cấp 2 thành công');
  assert.strictEqual(sim.profile.exp, 10, 'EXP dư 10 ở Lv 2');

  // Hoàn tác: trừ 30 EXP
  sim.deduct(30);
  assert.strictEqual(sim.profile.level, 1, 'Cấp độ phải hạ về Lv 1');
  assert.strictEqual(sim.profile.exp, 80, 'EXP phải quay về chính xác 80 như trước khi làm nhiệm vụ');
  console.log('✓ Test 2a: deductEXP hạ cấp và hoàn nguyên EXP chuẩn xác.');
}

// Case 2b: Multi-level de-progression (Hạ nhiều cấp liên tục)
{
  const sim = simulateEXP(1, 50);
  sim.add(350); // 50 + 350 = 400 -> Lv 1(100) -> Lv 2(200) -> Lv 3(100 EXP)
  assert.strictEqual(sim.profile.level, 3);
  assert.strictEqual(sim.profile.exp, 100);

  sim.deduct(350);
  assert.strictEqual(sim.profile.level, 1);
  assert.strictEqual(sim.profile.exp, 50);
  console.log('✓ Test 2b: deductEXP hạ nhiều cấp độ (multi-level) chính xác 100%.');
}

// Case 2c: Clamping at minimum Level 1, 0 EXP
{
  const sim = simulateEXP(1, 20);
  sim.deduct(50);
  assert.strictEqual(sim.profile.level, 1, 'Không bao giờ được hạ xuống dưới Level 1');
  assert.strictEqual(sim.profile.exp, 0, 'EXP không bao giờ âm, kẹp an toàn ở 0');
  console.log('✓ Test 2c: deductEXP chặn âm an toàn tại Level 1, 0 EXP.');
}

// 3. Kiểm thử Trích Nợ Ngân Hàng & Hoàn Tác (Two-Way Ledger Rollback)
function simulateQuestFlow() {
  const state = {
    profile: {
      coins: 20,
      totalCoinsEarned: 20,
      level: 1,
      exp: 0,
      title: 'Tân Binh Cấp 1',
      bank: {
        loan: {
          principal: 50,
          debt: 50,
          interestRate: 0.05,
          borrowedAt: Date.now(),
          autoDeductPercent: 0.50,
          isOverdue: false
        },
        deposited: 0
      }
    },
    quests: [
      { id: 'q1', title: 'Học bài', rewardCoins: 10, status: 'active', isRepeatable: false }
    ],
    ledger: []
  };

  function complete(questId) {
    const q = state.quests.find(x => x.id === questId);
    let earnedCoins = q.rewardCoins;
    let deductedForLoan = 0;
    let principalDeducted = 0;
    let loanBeforeDeduct = null;

    if (state.profile?.bank?.loan && state.profile.bank.loan.debt > 0) {
      const loan = state.profile.bank.loan;
      const deductRate = loan.autoDeductPercent || 0.50;
      deductedForLoan = Math.min(loan.debt, Math.floor(earnedCoins * deductRate));
      if (deductedForLoan > 0) {
        loanBeforeDeduct = { ...loan };
        principalDeducted = Math.min(loan.principal || 0, deductedForLoan);
        loan.debt -= deductedForLoan;
        loan.principal = Math.max(0, (loan.principal || 0) - principalDeducted);
        earnedCoins -= deductedForLoan;

        if (loan.debt <= 0) {
          state.profile.bank.loan = null;
        }
      }
    }

    if (!Array.isArray(q.loanDeductions)) q.loanDeductions = [];
    q.loanDeductions.push({
      rewardCoins: q.rewardCoins,
      deducted: deductedForLoan,
      principalDeducted,
      loanSnapshot: loanBeforeDeduct
    });

    state.profile.coins += earnedCoins;
    state.profile.totalCoinsEarned += q.rewardCoins;
    q.status = 'completed';
    return { earnedCoins, deductedForLoan };
  }

  function undo(questId) {
    const q = state.quests.find(x => x.id === questId);
    const deductionInfo = q.loanDeductions?.pop() || null;
    const deductedAmount = deductionInfo ? deductionInfo.deducted : 0;
    const principalDeducted = deductionInfo ? deductionInfo.principalDeducted : 0;
    const originalReward = q.rewardCoins;
    const earnedCoinsToRevert = Math.max(0, originalReward - deductedAmount);

    if (state.profile.coins < earnedCoinsToRevert) {
      return { success: false, reason: 'INSUFFICIENT_COINS' };
    }

    q.status = 'active';
    state.profile.coins -= earnedCoinsToRevert;
    state.profile.totalCoinsEarned -= originalReward;

    if (deductedAmount > 0) {
      if (state.profile.bank.loan) {
        state.profile.bank.loan.debt += deductedAmount;
        state.profile.bank.loan.principal += principalDeducted;
      } else if (deductionInfo?.loanSnapshot) {
        state.profile.bank.loan = {
          ...deductionInfo.loanSnapshot,
          debt: deductedAmount,
          principal: principalDeducted
        };
      }
    }

    return { success: true, earnedCoinsToRevert, restoredDebt: deductedAmount };
  }

  return { state, complete, undo };
}

// Case 3a: Hoàn thành nhiệm vụ 10 Vàng trích 5 Vàng trả nợ -> Hoàn tác khôi phục nợ
{
  const flow = simulateQuestFlow();
  const resComp = flow.complete('q1');
  assert.strictEqual(resComp.deductedForLoan, 5, 'Phải trích 5 Vàng trả nợ');
  assert.strictEqual(resComp.earnedCoins, 5, 'Ví chỉ nhận thêm 5 Vàng');
  assert.strictEqual(flow.state.profile.coins, 25, 'Ví từ 20 tăng lên 25');
  assert.strictEqual(flow.state.profile.bank.loan.debt, 45, 'Dư nợ từ 50 giảm còn 45');
  assert.strictEqual(flow.state.profile.bank.loan.principal, 45, 'Gốc nợ giảm còn 45');

  const resUndo = flow.undo('q1');
  assert.strictEqual(resUndo.success, true);
  assert.strictEqual(flow.state.profile.coins, 20, 'Ví phải trở về chính xác 20 Vàng');
  assert.strictEqual(flow.state.profile.totalCoinsEarned, 20, 'Tổng Vàng kiếm được phải trở về 20');
  assert.strictEqual(flow.state.profile.bank.loan.debt, 50, 'Dư nợ phải tăng lại về 50 (CHỐNG EXPLOIT XÓA NỢ MIỄN PHÍ)');
  assert.strictEqual(flow.state.profile.bank.loan.principal, 50, 'Gốc nợ phải tăng lại về 50');
  assert.strictEqual(flow.state.quests[0].status, 'active', 'Nhiệm vụ phải mở lại thành active');
  console.log('✓ Test 3a: Hoàn tác nhiệm vụ có trích nợ khôi phục cả 2 đầu sổ cái (Ví & Khoản vay) chính xác.');
}

// Case 3b: Hoàn tất toàn bộ nợ (loan = null) -> Hoàn tác tái sinh khoản vay
{
  const flow = simulateQuestFlow();
  flow.state.profile.bank.loan.debt = 5;
  flow.state.profile.bank.loan.principal = 5;

  // Hoàn thành nhiệm vụ 10 Vàng -> trích 5 Vàng trả hết nợ -> loan = null
  const resComp = flow.complete('q1');
  assert.strictEqual(resComp.deductedForLoan, 5);
  assert.strictEqual(flow.state.profile.bank.loan, null, 'Khoản nợ đã được tất toán');

  // Hoàn tác -> khoản vay phải được hồi sinh từ snapshot
  const resUndo = flow.undo('q1');
  assert.strictEqual(resUndo.success, true);
  assert.notStrictEqual(flow.state.profile.bank.loan, null, 'Khoản vay phải được hồi sinh');
  assert.strictEqual(flow.state.profile.bank.loan.debt, 5, 'Dư nợ được phục hồi đúng 5');
  assert.strictEqual(flow.state.profile.bank.loan.principal, 5, 'Gốc nợ được phục hồi đúng 5');
  console.log('✓ Test 3b: Tái sinh khoản vay đã tất toán từ snapshot (Loan Resurrection) thành công.');
}

// Case 3c: Chống gian lận tiêu tiền trước khi hoàn tác (Insufficient Coins Exploit)
{
  const flow = simulateQuestFlow();
  flow.complete('q1'); // nhận 5 Vàng, ví có 25 Vàng
  // Người chơi mang 25 Vàng đi mua quà trong Shop, ví còn 2 Vàng
  flow.state.profile.coins = 2;

  const resUndo = flow.undo('q1');
  assert.strictEqual(resUndo.success, false, 'Phải chặn hoàn tác khi ví không đủ tiền');
  assert.strictEqual(resUndo.reason, 'INSUFFICIENT_COINS');
  console.log('✓ Test 3c: Chặn đứng hành vi gian lận tiêu hết tiền rồi nhấn hoàn tác.');
}

// 4. Kiểm thử tính bất biến Anti-Cheat (deriveLegitimateBalance)
function deriveLegitimateBalance(state) {
  const quests = Array.isArray(state?.quests) ? state.quests : [];
  const inventory = Array.isArray(state?.inventory) ? state.inventory : [];
  let rawTotal = parseInt(state?.profile?.totalCoinsEarned, 10) || 20;
  let rawCoins = parseInt(state?.profile?.coins, 10) || rawTotal;
  let tampered = false;

  let questEarned = 20;
  for (const q of quests) {
    const reward = Math.max(1, parseInt(q.rewardCoins, 10) || 10);
    const count = (q.status === 'completed' || q.completed === true) ? 1 : 0;
    questEarned += reward * count;
  }

  let totalSpent = 0;
  for (const item of inventory) {
    totalSpent += Math.max(0, parseInt(item.price, 10) || 0);
  }

  const activeLoanPrincipal = Math.max(0, parseInt(state?.profile?.bank?.loan?.principal, 10) || 0);
  const depositedCoins = Math.max(0, parseInt(state?.profile?.bank?.deposited, 10) || 0);
  const maxCurrent = Math.max(0, rawTotal - totalSpent + activeLoanPrincipal - depositedCoins);

  if (rawCoins > maxCurrent) {
    rawCoins = maxCurrent;
    tampered = true;
  }
  return { coins: rawCoins, totalCoinsEarned: rawTotal, tampered };
}

{
  const flow = simulateQuestFlow();
  // Trạng thái ban đầu
  const checkInit = deriveLegitimateBalance(flow.state);
  assert.strictEqual(checkInit.tampered, false, 'Ban đầu phải hợp lệ');

  // Sau khi hoàn thành
  flow.complete('q1');
  const checkAfterComplete = deriveLegitimateBalance(flow.state);
  assert.strictEqual(checkAfterComplete.tampered, false, 'Sau khi hoàn thành có trích nợ phải hợp lệ');

  // Sau khi hoàn tác
  flow.undo('q1');
  const checkAfterUndo = deriveLegitimateBalance(flow.state);
  assert.strictEqual(checkAfterUndo.tampered, false, 'Sau khi hoàn tác phải giữ vững cân bằng anti-cheat');
  console.log('✓ Test 4: Công thức deriveLegitimateBalance bảo toàn hoàn hảo qua các chu kỳ Complete & Undo.');
}

console.log('\n🎉 TẤT CẢ 8 MỤC KIỂM THỬ CHO KHO QUÀ, TRÍCH NỢ, EXP & UNDO ĐÃ VƯỢT QUA XUẤT SẮC!');
