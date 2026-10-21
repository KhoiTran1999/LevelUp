'use server';

import {
  BANK_TERMS,
  LOAN_TERMS,
  calculateBankRates,
  getGlobalBankState,
  saveGlobalBankState,
  accrueUserBank,
  normalizeBankDeposits,
  calculateCreditLimit,
  verifyLoanSignature,
  deriveTitleForLevel,
  getRedis,
} from '../../api/sync.js';
import {
  resolveAuthenticatedUser,
  fetchUserState,
  commitUserState,
  type ActionResponse,
} from '@/lib/server/user-state';
import type { BankAccount, BankLoan, LedgerEntry } from '@/types/levelup';

export type { ActionResponse };

/**
 * Server Action: Deposit gold into savings account
 */
export async function depositGoldAction(
  amount: number,
  termDays: number,
  sessionToken?: string
): Promise<ActionResponse<{ bank: BankAccount; coins: number; ledger: LedgerEntry[]; message?: string }>> {
  const user = await resolveAuthenticatedUser(sessionToken);
  if (!user || !user.sub) {
    return { success: false, error: 'Cần đăng nhập Google để thực hiện giao dịch ngân hàng.' };
  }

  const depositAmt = Math.max(0, parseInt(String(amount), 10) || 0);
  if (depositAmt <= 0) {
    return { success: false, error: 'Số Vàng gửi tiết kiệm phải lớn hơn 0.' };
  }

  const userSub = user.sub;
  const state = await fetchUserState(userSub);
  if (!state.profile.bank) {
    state.profile.bank = { deposited: 0, depositInterest: 0, lastDepositAt: Date.now(), loan: null, isFrozen: false };
  }
  if (!Array.isArray(state.ledger)) state.ledger = [];

  const userCoins = Math.max(0, parseInt(String(state.profile.coins), 10) || 0);
  if (userCoins < depositAmt) {
    return { success: false, error: `Số dư Vàng không đủ (hiện có: ${userCoins} Vàng).` };
  }

  const redis = getRedis();
  const poolState = await getGlobalBankState(redis);
  const serverTimestamp = Date.now();
  const rates = calculateBankRates(poolState);

  // Accrue interest before new transaction
  state.profile.bank = accrueUserBank(state.profile.bank, rates, serverTimestamp, state.profile || {});

  const rawTerm = parseInt(String(termDays), 10);
  const validTerm = [0, 7, 14, 30].includes(rawTerm) ? rawTerm : 0;
  const termConfig = (BANK_TERMS as Record<number, { label: string }>)[validTerm] || { label: 'Linh hoạt' };
  const maturityAt = validTerm > 0 ? (serverTimestamp + validTerm * 24 * 60 * 60 * 1000) : 0;

  normalizeBankDeposits(state.profile.bank, serverTimestamp);
  if (!Array.isArray(state.profile.bank.deposits)) {
    state.profile.bank.deposits = [];
  }

  if (validTerm === 0) {
    const existingFlex = state.profile.bank.deposits.find(d => d.termDays === 0 && d.status === 'active');
    if (existingFlex) {
      existingFlex.amount = (parseInt(String(existingFlex.amount), 10) || 0) + depositAmt;
      existingFlex.lastAccruedAt = serverTimestamp;
    } else {
      state.profile.bank.deposits.push({
        id: `dep_${serverTimestamp}_${Math.random().toString(36).substring(2, 7)}`,
        amount: depositAmt,
        termDays: 0,
        interest: 0,
        createdAt: serverTimestamp,
        lastAccruedAt: serverTimestamp,
        maturityAt: 0,
        status: 'active',
      });
    }
  } else {
    state.profile.bank.deposits.push({
      id: `dep_${serverTimestamp}_${Math.random().toString(36).substring(2, 7)}`,
      amount: depositAmt,
      termDays: validTerm,
      interest: 0,
      createdAt: serverTimestamp,
      lastAccruedAt: serverTimestamp,
      maturityAt,
      status: 'active',
    });
  }

  normalizeBankDeposits(state.profile.bank, serverTimestamp);
  state.profile.coins = userCoins - depositAmt;

  poolState.poolGold += depositAmt;
  poolState.totalDeposited = (poolState.totalDeposited || 0) + depositAmt;

  const termTitle = validTerm > 0 ? `gói ${validTerm} ngày (${termConfig.label})` : 'gói Linh Hoạt';
  state.ledger.unshift({
    id: `bank_dep_${serverTimestamp}`,
    type: 'spend',
    category: 'bank_deposit',
    amount: depositAmt,
    title: `Gửi tiết kiệm ${termConfig.label}`,
    description: `🏦 Đã gửi ${depositAmt} Vàng vào Sổ tiết kiệm ${termTitle}.`,
    timestamp: serverTimestamp,
  });
  if (state.ledger.length > 100) state.ledger.splice(100);

  await saveGlobalBankState(redis, poolState);
  await commitUserState(userSub, state);

  return {
    success: true,
    data: {
      bank: state.profile.bank,
      coins: state.profile.coins,
      ledger: state.ledger,
      message: `Gửi tiết kiệm thành công ${depositAmt} Vàng (${termConfig.label})!`,
    },
  };
}

/**
 * Server Action: Withdraw gold from savings account
 */
export async function withdrawGoldAction(
  amount?: number | 'all',
  depositId?: string,
  confirmEarly?: boolean,
  sessionToken?: string
): Promise<ActionResponse<{ bank: BankAccount; coins: number; withdrawn: number; ledger: LedgerEntry[]; message?: string }>> {
  const user = await resolveAuthenticatedUser(sessionToken);
  if (!user || !user.sub) {
    return { success: false, error: 'Cần đăng nhập Google để thực hiện giao dịch ngân hàng.' };
  }

  const userSub = user.sub;
  const state = await fetchUserState(userSub);
  if (!state.profile.bank) {
    state.profile.bank = { deposited: 0, depositInterest: 0, lastDepositAt: Date.now(), loan: null, isFrozen: false };
  }
  if (!Array.isArray(state.ledger)) state.ledger = [];

  const redis = getRedis();
  const poolState = await getGlobalBankState(redis);
  const serverTimestamp = Date.now();
  const rates = calculateBankRates(poolState);

  state.profile.bank = accrueUserBank(state.profile.bank, rates, serverTimestamp, state.profile || {});
  normalizeBankDeposits(state.profile.bank, serverTimestamp);

  const deposits = state.profile.bank.deposits || [];
  let withdrawAmt = 0;
  let penaltyNotice = '';

  if (depositId) {
    const depIndex = deposits.findIndex(d => d.id === depositId && (d.status === 'active' || d.status === 'matured'));
    if (depIndex === -1) {
      return { success: false, error: 'Không tìm thấy sổ tiết kiệm này hoặc sổ đã tất toán.' };
    }
    const dep = deposits[depIndex];
    const isEarly = dep.termDays > 0 && dep.status !== 'matured' && (dep.maturityAt - serverTimestamp) > 5000;

    if (isEarly) {
      if (!confirmEarly) {
        const daysLeft = Math.ceil((dep.maturityAt - serverTimestamp) / (24 * 60 * 60 * 1000));
        return {
          success: false,
          error: `Sổ này chưa đến ngày đáo hạn (còn lại ${daysLeft} ngày). Rút trước hạn sẽ mất toàn bộ ${dep.interest} Vàng tiền lãi tích lũy và chỉ nhận lại ${dep.amount} Vàng gốc.`,
        };
      }
      withdrawAmt = dep.amount;
      penaltyNotice = ` (Phạt tất toán sớm gói ${dep.termDays} ngày: Hủy ${dep.interest} Vàng lãi tích lũy)`;
      deposits.splice(depIndex, 1);
    } else if (dep.termDays > 0) {
      // Sổ có kỳ hạn đã đáo hạn: tất toán toàn bộ gốc và lãi
      withdrawAmt = dep.amount + (dep.interest || 0);
      deposits.splice(depIndex, 1);
    } else {
      // Sổ linh hoạt (0 ngày): cho phép rút một phần hoặc tất cả
      const availableInDep = (dep.amount || 0) + (dep.interest || 0);
      const reqAmt = amount === 'all' || !amount ? availableInDep : Math.max(1, parseInt(String(amount), 10) || availableInDep);
      withdrawAmt = Math.min(availableInDep, reqAmt);
      let rem = withdrawAmt;

      if (dep.interest > 0) {
        const intDraw = Math.min(dep.interest, rem);
        dep.interest -= intDraw;
        rem -= intDraw;
      }
      if (rem > 0 && dep.amount > 0) {
        const amtDraw = Math.min(dep.amount, rem);
        dep.amount -= amtDraw;
        rem -= amtDraw;
      }
      if (dep.amount <= 0 && (!dep.interest || dep.interest <= 0)) {
        deposits.splice(depIndex, 1);
      }
    }
  } else {
    const safeDeposits = deposits.filter(d => d.termDays === 0 || d.status === 'matured' || (d.maturityAt && (d.maturityAt - serverTimestamp) <= 5000));
    const safeTotalAvailable = safeDeposits.reduce((sum, d) => sum + (d.amount || 0) + (d.interest || 0), 0);

    if (safeTotalAvailable <= 0) {
      const hasLockedTerms = deposits.some(d => d.termDays > 0 && d.status !== 'matured');
      return {
        success: false,
        error: hasLockedTerms
          ? 'Toàn bộ số dư đang nằm trong sổ kỳ hạn đang khóa. Vui lòng chọn sổ cần tất toán trong phần Rút Tiền.'
          : 'Bạn không có Vàng gửi tiết kiệm hoặc tiền lãi khả dụng để rút.',
      };
    }

    const reqAmt = amount === 'all' || !amount ? safeTotalAvailable : Math.max(1, parseInt(String(amount), 10) || safeTotalAvailable);
    withdrawAmt = Math.min(safeTotalAvailable, reqAmt);
    let remainingToWithdraw = withdrawAmt;

    const sortedSafe = [...safeDeposits].sort((a, b) => a.termDays - b.termDays);
    for (const dep of sortedSafe) {
      if (remainingToWithdraw <= 0) break;
      if (dep.interest > 0) {
        const intDraw = Math.min(dep.interest, remainingToWithdraw);
        dep.interest -= intDraw;
        remainingToWithdraw -= intDraw;
      }
    }
    for (const dep of sortedSafe) {
      if (remainingToWithdraw <= 0) break;
      if (dep.amount > 0) {
        const amtDraw = Math.min(dep.amount, remainingToWithdraw);
        dep.amount -= amtDraw;
        remainingToWithdraw -= amtDraw;
      }
    }
    state.profile.bank.deposits = deposits.filter(d => (d.amount > 0 || (d.interest || 0) > 0));
  }

  if (withdrawAmt <= 0) {
    return { success: false, error: 'Số tiền rút không hợp lệ.' };
  }

  normalizeBankDeposits(state.profile.bank, serverTimestamp);
  state.profile.coins = (parseInt(String(state.profile.coins), 10) || 0) + withdrawAmt;
  state.profile.totalCoinsEarned = (parseInt(String(state.profile.totalCoinsEarned), 10) || 0) + withdrawAmt;

  poolState.poolGold = Math.max(0, poolState.poolGold - withdrawAmt);
  poolState.totalDeposited = Math.max(0, (poolState.totalDeposited || 0) - withdrawAmt);

  state.ledger.unshift({
    id: `bank_wth_${serverTimestamp}`,
    type: 'earn',
    category: 'bank_withdraw',
    amount: withdrawAmt,
    title: 'Rút Vàng Tiết Kiệm',
    description: `🏦 Đã rút ${withdrawAmt} Vàng từ tài khoản Ngân Hàng.${penaltyNotice}`,
    timestamp: serverTimestamp,
  });
  if (state.ledger.length > 100) state.ledger.splice(100);

  await saveGlobalBankState(redis, poolState);
  await commitUserState(userSub, state);

  return {
    success: true,
    data: {
      bank: state.profile.bank,
      coins: state.profile.coins,
      withdrawn: withdrawAmt,
      ledger: state.ledger,
      message: `Rút tiền thành công ${withdrawAmt} Vàng!${penaltyNotice}`,
    },
  };
}

/**
 * Server Action: Borrow gold from bank pool
 */
export async function borrowGoldAction(
  amount: number,
  termDays: number,
  autoDeductPercent: number,
  loanSignature?: string,
  sessionToken?: string
): Promise<ActionResponse<{ bank: BankAccount; coins: number; loan: BankLoan; ledger: LedgerEntry[]; message?: string }>> {
  const user = await resolveAuthenticatedUser(sessionToken);
  if (!user || !user.sub) {
    return { success: false, error: 'Cần đăng nhập Google để thực hiện giao dịch ngân hàng.' };
  }

  const borrowAmt = Math.max(0, parseInt(String(amount), 10) || 0);
  if (borrowAmt <= 0) {
    return { success: false, error: 'Số Vàng vay phải lớn hơn 0.' };
  }

  const userSub = user.sub;
  const state = await fetchUserState(userSub);
  if (!state.profile.bank) {
    state.profile.bank = { deposited: 0, depositInterest: 0, lastDepositAt: Date.now(), loan: null, isFrozen: false };
  }
  if (!Array.isArray(state.ledger)) state.ledger = [];

  if (state.profile.bank.loan && (parseInt(String(state.profile.bank.loan.debt), 10) || 0) > 0) {
    return { success: false, error: 'Bạn đang có một khoản vay chưa thanh toán hết. Vui lòng tất toán khoản nợ hiện tại trước khi vay mới!' };
  }

  const redis = getRedis();
  const poolState = await getGlobalBankState(redis);
  const serverTimestamp = Date.now();
  const rates = calculateBankRates(poolState);

  // Accrue interest on any existing deposits before borrowing
  state.profile.bank = accrueUserBank(state.profile.bank, rates, serverTimestamp, state.profile || {});

  const autoDeduct = Math.min(0.80, Math.max(0.20, Number(autoDeductPercent) || 0.50));
  const standardLimit = calculateCreditLimit(state.profile, autoDeduct);
  let effectiveLimit = standardLimit;

  const rawTerm = parseInt(String(termDays), 10);
  const validTerm = [3, 7, 14, 30].includes(rawTerm) ? rawTerm : 7;
  const termConfig = (LOAN_TERMS as Record<number, { label: string; rateMultiplier: number }>)[validTerm] || { label: '7 ngày', rateMultiplier: 1.0 };
  const termMult = termConfig.rateMultiplier || 1.0;
  let effectiveBorrowRate = Number((rates.borrowRate * termMult).toFixed(4));
  let isNegotiatedLoan = false;

  if (loanSignature && typeof loanSignature === 'string') {
    const userCandidates = [userSub, state.profile?.googleId, state.profile?.nickname, 'guest'].filter(Boolean);
    if (verifyLoanSignature(userCandidates, borrowAmt, rates.borrowRate, autoDeduct, standardLimit * 1.5, loanSignature)) {
      isNegotiatedLoan = true;
      effectiveBorrowRate = Math.max(0.01, Number((rates.borrowRate * 0.8 * termMult).toFixed(4)));
      effectiveLimit = Math.min(1000, Math.round(standardLimit * 1.5));
    }
  }

  if (borrowAmt > effectiveLimit) {
    return { success: false, error: `Số Vàng vay (${borrowAmt}) vượt quá hạn mức tín dụng tối đa (${effectiveLimit}) của bạn!` };
  }

  if (poolState.poolGold < borrowAmt) {
    const bailout = borrowAmt - poolState.poolGold;
    poolState.bailoutDebt = (poolState.bailoutDebt || 0) + bailout;
    poolState.poolGold += bailout;
  }

  poolState.poolGold = Math.max(0, poolState.poolGold - borrowAmt);
  poolState.totalBorrowed = (poolState.totalBorrowed || 0) + borrowAmt;

  state.profile.coins = (parseInt(String(state.profile.coins), 10) || 0) + borrowAmt;
  const newLoan: BankLoan = {
    principal: borrowAmt,
    debt: borrowAmt,
    termDays: validTerm,
    borrowRate: effectiveBorrowRate,
    autoDeductPercent: autoDeduct,
    borrowedAt: serverTimestamp,
    lastAccruedAt: serverTimestamp,
    isOverdue: false,
    isNegotiated: isNegotiatedLoan,
  };
  state.profile.bank.loan = newLoan;
  state.profile.bank.isFrozen = false;

  state.ledger.unshift({
    id: `bank_bor_${serverTimestamp}`,
    type: 'earn',
    category: 'bank_borrow',
    amount: borrowAmt,
    title: 'Vay Vàng Ngân Hàng',
    description: `🏦 Đã vay ${borrowAmt} Vàng. Kỳ hạn: ${termConfig.label}, Lãi suất: ${(effectiveBorrowRate * 100).toFixed(1)}%/ngày.`,
    timestamp: serverTimestamp,
  });
  if (state.ledger.length > 100) state.ledger.splice(100);

  await saveGlobalBankState(redis, poolState);
  await commitUserState(userSub, state);

  return {
    success: true,
    data: {
      bank: state.profile.bank,
      coins: state.profile.coins,
      loan: newLoan,
      ledger: state.ledger,
      message: `Giải ngân thành công khoản vay ${borrowAmt} Vàng!`,
    },
  };
}

/**
 * Server Action: Repay loan
 */
export async function repayLoanAction(
  amount?: number | 'all',
  sessionToken?: string
): Promise<ActionResponse<{ bank: BankAccount; coins: number; ledger: LedgerEntry[]; message?: string }>> {
  const user = await resolveAuthenticatedUser(sessionToken);
  if (!user || !user.sub) {
    return { success: false, error: 'Cần đăng nhập Google để thực hiện giao dịch ngân hàng.' };
  }

  const userSub = user.sub;
  const state = await fetchUserState(userSub);

  const redis = getRedis();
  const poolState = await getGlobalBankState(redis);
  const serverTimestamp = Date.now();
  const rates = calculateBankRates(poolState);

  // Accrue interest and check overdue before repayment
  state.profile.bank = accrueUserBank(state.profile.bank, rates, serverTimestamp, state.profile || {});

  const loan = state.profile?.bank?.loan;
  const currentDebt = Math.max(0, parseInt(String(loan?.debt), 10) || 0);
  if (!loan || currentDebt <= 0) {
    return { success: false, error: 'Bạn không có khoản nợ nào cần thanh toán!' };
  }

  const userCoins = Math.max(0, parseInt(String(state.profile.coins), 10) || 0);
  if (userCoins <= 0) {
    return { success: false, error: 'Số dư Vàng trong ví bằng 0, không thể trả nợ!' };
  }

  const reqAmt = amount === 'all' || !amount ? currentDebt : Math.max(1, parseInt(String(amount), 10) || currentDebt);
  const isOverdue = Boolean(loan.isOverdue);
  const penaltyRate = isOverdue ? 0 : 0.05;
  let payAmt = Math.min(currentDebt, reqAmt);
  let penaltyFee = (!isOverdue && payAmt > 0) ? Math.max(1, Math.round(payAmt * penaltyRate)) : 0;

  if (payAmt + penaltyFee > userCoins) {
    payAmt = Math.max(1, Math.floor((userCoins - (penaltyRate > 0 ? 1 : 0)) / (1 + penaltyRate)));
    penaltyFee = (!isOverdue && payAmt > 0) ? Math.max(1, Math.round(payAmt * penaltyRate)) : 0;
    while (payAmt > 0 && payAmt + penaltyFee > userCoins) {
      payAmt--;
      penaltyFee = (!isOverdue && payAmt > 0) ? Math.max(1, Math.round(payAmt * penaltyRate)) : 0;
    }
  }

  const totalPaid = payAmt + penaltyFee;
  if (totalPaid <= 0 || totalPaid > userCoins) {
    return { success: false, error: 'Số Vàng trong ví không đủ để thanh toán nợ kèm phí phạt tất toán sớm!' };
  }

  state.profile.coins = userCoins - totalPaid;
  const principal = Math.max(0, parseInt(String(loan.principal), 10) || 0);
  const accruedInterest = Math.max(0, currentDebt - principal);
  const interestPaid = Math.min(accruedInterest, payAmt);
  const principalPaid = Math.min(principal, Math.max(0, payAmt - interestPaid));

  loan.debt = Math.max(0, currentDebt - payAmt);
  loan.principal = Math.max(0, principal - principalPaid);
  let debtCleared = false;
  if (loan.debt <= 0) {
    debtCleared = true;
    state.profile.bank.loan = null;
    state.profile.bank.isFrozen = false;
    if (state.profile.title === 'Con Nợ Quá Hạn ⚠️') {
      state.profile.title = deriveTitleForLevel(state.profile.level || 1);
    }
  }

  poolState.totalBorrowed = Math.max(0, (poolState.totalBorrowed || 0) - principalPaid);

  // Preserve cash flow: allocate repaid debt, interest, and penalties
  let treasuryRepaid = 0;
  if (poolState.bailoutDebt > 0) {
    treasuryRepaid = Math.min(poolState.bailoutDebt, Math.floor(payAmt * 0.5) + penaltyFee);
    poolState.bailoutDebt -= treasuryRepaid;
  }
  const remainingPaid = totalPaid - treasuryRepaid;
  const goldToPool = Math.min(principalPaid, remainingPaid);
  poolState.poolGold = (poolState.poolGold || 0) + goldToPool;
  const goldToReserve = remainingPaid - goldToPool;
  if (goldToReserve > 0) {
    poolState.reserveFund = (poolState.reserveFund || 0) + goldToReserve;
  }

  state.ledger.unshift({
    id: `bank_rep_${serverTimestamp}`,
    type: 'spend',
    category: 'bank_repay',
    amount: totalPaid,
    title: isOverdue ? 'Thanh toán nợ quá hạn' : 'Tất toán nợ sớm',
    description: `🏦 Đã trả ${payAmt} Vàng${penaltyFee > 0 ? ` (+${penaltyFee} Vàng phí phạt trả sớm 5%)` : ''}.${debtCleared ? ' Chúc mừng bạn đã tất toán toàn bộ nợ!' : ` Nợ còn lại: ${loan.debt} Vàng.`}`,
    timestamp: serverTimestamp,
  });
  if (state.ledger.length > 100) state.ledger.splice(100);

  await saveGlobalBankState(redis, poolState);
  await commitUserState(userSub, state);

  return {
    success: true,
    data: {
      bank: state.profile.bank,
      coins: state.profile.coins,
      ledger: state.ledger,
      message: `Thanh toán thành công ${totalPaid} Vàng!`,
    },
  };
}

/**
 * Server Action: Get current bank state, pool, and dynamic interest rates
 */
export async function getBankStateAction(
  sessionToken?: string
): Promise<ActionResponse<{ bank: BankAccount; pool: Record<string, unknown>; rates: Record<string, unknown> }>> {
  const user = await resolveAuthenticatedUser(sessionToken);
  const redis = getRedis();
  const poolState = await getGlobalBankState(redis);
  const rates = calculateBankRates(poolState);

  let userBank: BankAccount = { deposited: 0, depositInterest: 0, lastDepositAt: Date.now(), loan: null, isFrozen: false };
  if (user?.sub) {
    const state = await fetchUserState(user.sub);
    if (state.profile?.bank) {
      userBank = accrueUserBank(state.profile.bank, rates, Date.now(), state.profile || {});
    }
  }

  return {
    success: true,
    data: {
      bank: userBank,
      pool: poolState,
      rates,
    },
  };
}
