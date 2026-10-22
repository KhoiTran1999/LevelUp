import type { BankAccount, BankDepositItem, BankLoan, BankRates } from '../../types/levelup';

export interface BankTermConfig {
  id: string;
  days: number;
  label: string;
  desc: string;
  rateMultiplier: number;
  icon: string;
}

export const BANK_TERMS: Record<number, BankTermConfig> = {
  0: { id: 'flex', days: 0, label: 'Linh Hoạt', desc: 'Rút bất cứ lúc nào, an toàn tuyệt đối', rateMultiplier: 1.0, icon: '🍃' },
  7: { id: 'week', days: 7, label: '7 Ngày', desc: 'Tuần tích lũy, tăng trưởng đều đặn', rateMultiplier: 1.3, icon: '⚡' },
  14: { id: 'two_weeks', days: 14, label: '14 Ngày', desc: 'Thử thách 2 tuần kiên định', rateMultiplier: 1.6, icon: '🛡️' },
  30: { id: 'month', days: 30, label: '30 Ngày', desc: 'Chiến binh cam kết, lãi suất tối đa', rateMultiplier: 2.0, icon: '👑' }
};

export interface LoanTermConfig {
  id: string;
  days: number;
  label: string;
  desc: string;
  rateMultiplier: number;
  icon: string;
}

export const LOAN_TERMS: Record<number, LoanTermConfig> = {
  3: { id: 'term_3', days: 3, label: '3 Ngày', desc: 'Vay cấp tốc, hoàn nợ trong 3 ngày', rateMultiplier: 0.90, icon: '⚡' },
  7: { id: 'term_7', days: 7, label: '7 Ngày', desc: 'Gói chuẩn 1 tuần làm nhiệm vụ', rateMultiplier: 1.00, icon: '🛡️' },
  14: { id: 'term_14', days: 14, label: '14 Ngày', desc: 'Thong thả 2 tuần làm việc', rateMultiplier: 1.10, icon: '⏳' },
  30: { id: 'term_30', days: 30, label: '30 Ngày', desc: 'Dài hạn 1 tháng, thảnh thơi trả dần', rateMultiplier: 1.20, icon: '👑' }
};

export const DAILY_DEPOSIT_INTEREST_CAP = 8; // Trần tối đa 8 Vàng lãi / ngày

export function calculateEffectiveDepositBase(amount: number | string): number {
  const a = Math.max(0, parseInt(String(amount), 10) || 0);
  if (a <= 100) return a;
  if (a <= 500) return 100 + (a - 100) * 0.70;
  if (a <= 2000) return 380 + (a - 500) * 0.40;
  return 980 + (a - 2000) * 0.10;
}

export interface DisciplineMultiplierResult {
  multiplier: number;
  label: string;
  icon: string;
  bonusPct: number;
}

export function calculateDisciplineMultiplier(profile?: { streak?: number | string } | null): DisciplineMultiplierResult {
  const streak = Math.max(0, parseInt(String(profile?.streak), 10) || 0);
  if (streak >= 7) return { multiplier: 1.5, label: 'Chiến Binh Kỷ Luật (Streak ≥ 7)', icon: '🔥', bonusPct: 50 };
  if (streak >= 3) return { multiplier: 1.3, label: 'Duy Trì Thói Quen (Streak ≥ 3)', icon: '⚡', bonusPct: 30 };
  if (streak >= 1) return { multiplier: 1.15, label: 'Khởi Động Ngày Mới (Streak ≥ 1)', icon: '🌱', bonusPct: 15 };
  return { multiplier: 0.8, label: 'Chưa Có Chuỗi Kỷ Luật (Streak 0)', icon: '⚠️', bonusPct: -20 };
}

export type { BankDepositItem };

export type BankStateData = Partial<Omit<BankAccount, 'loan'>> & {
  loan?: Partial<BankLoan> | null;
};

export function normalizeBankDeposits(bank: BankStateData | null | undefined, now: number = Date.now()): BankStateData | null | undefined {
  if (!bank || typeof bank !== 'object') return bank;

  if (!Array.isArray(bank.deposits)) {
    const dep = Math.max(0, parseInt(String(bank.deposited), 10) || 0);
    const int = Math.max(0, parseInt(String(bank.depositInterest), 10) || 0);
    if (dep > 0 || int > 0) {
      bank.deposits = [{
        id: bank.lastDepositAt ? `dep_legacy_${bank.lastDepositAt}` : `dep_legacy_${now}`,
        amount: dep,
        termDays: 0,
        interest: int,
        createdAt: parseInt(String(bank.lastDepositAt), 10) || now,
        lastAccruedAt: parseInt(String(bank.lastDepositAt), 10) || now,
        maturityAt: 0,
        status: 'active'
      }];
    } else {
      bank.deposits = [];
    }
  }

  bank.deposits = bank.deposits.filter(d => {
    if (!d) return false;
    const amount = parseInt(String(d.amount), 10) || 0;
    const interest = parseInt(String(d.interest), 10) || 0;
    if (amount <= 0 && interest <= 0) return false;
    if (!d.status) {
      d.status = (d.termDays > 0 && d.maturityAt && now >= d.maturityAt) ? 'matured' : 'active';
    }
    return d.status === 'active' || d.status === 'matured';
  });
  bank.deposited = bank.deposits.reduce((sum, d) => sum + (parseInt(String(d.amount), 10) || 0), 0);
  bank.depositInterest = bank.deposits.reduce((sum, d) => sum + (parseInt(String(d.interest), 10) || 0), 0);
  return bank;
}

export type BankRatesResult = BankRates;

export function calculateBankRates(poolState?: { poolGold?: number | string; totalBorrowed?: number | string } | null): BankRates {
  const p = Math.max(0, parseInt(String(poolState?.poolGold), 10) || 0);
  const b = Math.max(0, parseInt(String(poolState?.totalBorrowed), 10) || 0);
  const total = p + b;
  const u = total > 0 ? b / total : 0;
  const clampedU = Math.min(1, Math.max(0, u));

  // Dynamic rates (per 24h)
  const depositRate = Number((Math.min(0.0025, Math.max(0.0010, 0.0012 + 0.0013 * clampedU))).toFixed(4));
  const borrowRate = Number((Math.min(0.18, Math.max(0.04, 0.05 + 0.10 * clampedU))).toFixed(4));
  const spread = Number((borrowRate - depositRate).toFixed(4));

  return {
    utilization: Number(clampedU.toFixed(4)),
    depositRate,
    borrowRate,
    spread
  };
}

export function calculateCreditLimit(
  profile?: { level?: number | string; streak?: number | string; totalCoinsEarned?: number | string } | null,
  autoDeductPercent: number | string = 0.50
): number {
  const lvl = Math.max(1, parseInt(String(profile?.level), 10) || 1);
  const streak = Math.max(0, parseInt(String(profile?.streak), 10) || 0);
  const totalEarned = Math.max(20, parseInt(String(profile?.totalCoinsEarned), 10) || 20);

  // Base hard cap limit
  const baseLimit = Math.min(400, (lvl * 25) + (streak * 5) + Math.floor(totalEarned * 0.1));

  // Commitment factor based on user selected deduction rate (0.20 - 0.80)
  const clampedRate = Math.min(0.80, Math.max(0.20, Number(autoDeductPercent) || 0.50));
  const kDeduct = 0.7 + ((Math.max(0.30, clampedRate) - 0.30) / 0.50) * 0.8; // 0.7 to 1.5

  return Math.max(20, Math.floor(baseLimit * kDeduct));
}

export function calculateNetWorth(
  profile?: {
    coins?: number | string;
    bank?: {
      deposited?: number | string;
      depositInterest?: number | string;
      loan?: { debt?: number | string } | null;
    };
  } | null
): number {
  const coins = Math.max(0, parseInt(String(profile?.coins), 10) || 0);
  const bank = profile?.bank || {};
  const deposited = Math.max(0, parseInt(String(bank.deposited), 10) || 0);
  const depositInterest = Math.max(0, parseInt(String(bank.depositInterest), 10) || 0);
  const debt = Math.max(0, parseInt(String(bank.loan?.debt), 10) || 0);
  return Math.max(0, coins + deposited + depositInterest - debt);
}

// ponytail: Format countdown by days and hours; upgrade to localized Intl.DurationFormat when baseline support lands
export function formatBankDayHourCountdown(ms?: number | null): string {
  if (!ms || ms <= 0) return '0 giờ';
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return `${days} ngày ${hours} giờ`;
  }
  if (hours > 0) {
    return `${hours} giờ`;
  }
  return '< 1 giờ';
}

export function formatBankCountdown(ms?: number | null): string {
  return formatBankDayHourCountdown(ms);
}

export interface DepositPayoutInfo {
  type: 'term' | 'flex';
  termDays: number;
  termLabel: string;
  targetTimestamp: number;
  msRemaining: number;
  isMatured: boolean;
  expectedPayoutAmount: number;
  totalWithPrincipal: number;
  currentAccruedInterest: number;
  cappedDailyInterest: number;
}

export function calculateDepositPayoutInfo(
  dep?: {
    amount?: number | string;
    termDays?: number | string;
    interest?: number | string;
    createdAt?: number | string;
    lastAccruedAt?: number | string;
    maturityAt?: number | string;
    status?: string;
  } | null,
  rates: { depositRate?: number | string } = {},
  discipline: number | { multiplier?: number | string } = 1.0,
  now: number = Date.now()
): DepositPayoutInfo | null {
  if (!dep || typeof dep !== 'object') return null;
  const amount = Math.max(0, parseInt(String(dep.amount), 10) || 0);
  if (amount <= 0) return null;

  const termDays = parseInt(String(dep.termDays), 10) || 0;
  const termConfig = BANK_TERMS[termDays] || BANK_TERMS[0];
  const termMult = termConfig.rateMultiplier || 1.0;

  const discMult = typeof discipline === 'object' && discipline !== null
    ? (Number(discipline.multiplier) || 1.0)
    : (Number(discipline) || 1.0);

  const rawBase = Number(rates?.depositRate) || 0.0015;
  const baseRate = Math.min(0.0025, Math.max(0.0010, rawBase));
  const effectiveBase = calculateEffectiveDepositBase(amount);
  const dailyRate = baseRate * termMult * discMult;
  const cappedDailyInterest = Math.min(DAILY_DEPOSIT_INTEREST_CAP, effectiveBase * dailyRate);

  const lastAcc = parseInt(String(dep.lastAccruedAt), 10) || parseInt(String(dep.createdAt), 10) || now;

  // 1. Sổ có kỳ hạn (termDays > 0)
  if (termDays > 0 && dep.maturityAt) {
    const maturityAt = parseInt(String(dep.maturityAt), 10);
    const msUntilMaturity = Math.max(0, maturityAt - now);
    const isMatured = dep.status === 'matured' || now >= maturityAt || msUntilMaturity <= 5000;

    // Tổng lãi dự kiến khi đáo hạn
    const totalExpectedInterest = Math.max(
      parseInt(String(dep.interest), 10) || 0,
      Math.floor(cappedDailyInterest * termDays)
    );

    return {
      type: 'term',
      termDays,
      termLabel: termConfig.label,
      targetTimestamp: maturityAt,
      msRemaining: isMatured ? 0 : msUntilMaturity,
      isMatured,
      expectedPayoutAmount: isMatured ? (parseInt(String(dep.interest), 10) || 0) : totalExpectedInterest,
      totalWithPrincipal: amount + (isMatured ? (parseInt(String(dep.interest), 10) || 0) : totalExpectedInterest),
      currentAccruedInterest: parseInt(String(dep.interest), 10) || 0,
      cappedDailyInterest
    };
  }

  // 2. Sổ linh hoạt (termDays === 0)
  if (cappedDailyInterest <= 0) {
    return {
      type: 'flex',
      termDays: 0,
      termLabel: termConfig.label,
      targetTimestamp: 0,
      msRemaining: 0,
      isMatured: false,
      expectedPayoutAmount: 0,
      totalWithPrincipal: amount,
      currentAccruedInterest: parseInt(String(dep.interest), 10) || 0,
      cappedDailyInterest: 0
    };
  }

  const elapsedDays = Math.max(0, (now - lastAcc) / (24 * 60 * 60 * 1000));
  const currentEarnedCoins = Math.floor(cappedDailyInterest * elapsedDays);
  const nextTargetCoinCount = currentEarnedCoins + 1;
  const daysNeededTotal = nextTargetCoinCount / cappedDailyInterest;
  const targetTimestamp = lastAcc + Math.ceil(daysNeededTotal * 24 * 60 * 60 * 1000);
  const msRemaining = Math.max(0, targetTimestamp - now);

  return {
    type: 'flex',
    termDays: 0,
    termLabel: termConfig.label,
    targetTimestamp,
    msRemaining,
    isMatured: false,
    expectedPayoutAmount: 1,
    totalWithPrincipal: amount + (parseInt(String(dep.interest), 10) || 0) + 1,
    currentAccruedInterest: parseInt(String(dep.interest), 10) || 0,
    cappedDailyInterest
  };
}

export interface LoanCountdownInfo {
  debt: number;
  principal: number;
  termDays: number;
  borrowRate: number;
  nextAccrualTimestamp: number;
  msUntilNextAccrual: number;
  nextInterestAmount: number;
  isAccrualDue: boolean;
  expireTimestamp: number;
  msUntilExpire: number;
  isOverdue: boolean;
  overdueDays: number;
}

export function calculateLoanCountdownInfo(
  loan?: {
    debt?: number | string;
    principal?: number | string;
    termDays?: number | string;
    borrowRate?: number | string;
    borrowedAt?: number | string;
    lastAccruedAt?: number | string;
    isOverdue?: boolean;
  } | null,
  rates: { borrowRate?: number | string } = {},
  now: number = Date.now()
): LoanCountdownInfo | null {
  if (!loan || typeof loan !== 'object' || (parseInt(String(loan.debt), 10) || 0) <= 0) {
    return null;
  }

  const debt = Math.max(0, parseInt(String(loan.debt), 10) || 0);
  const principal = Math.max(0, parseInt(String(loan.principal), 10) || 0);
  const termDays = Math.max(1, parseInt(String(loan.termDays), 10) || 7);
  const borrowRate = Number(loan.borrowRate) || Number(rates?.borrowRate) || 0.05;

  const borrowedAt = parseInt(String(loan.borrowedAt), 10) || now;
  const lastAcc = parseInt(String(loan.lastAccruedAt), 10) || borrowedAt;

  // 1. Đếm ngược tính lãi lần tiếp theo (chu kỳ 24h từ lastAccruedAt)
  const nextAccrualTimestamp = lastAcc + (24 * 60 * 60 * 1000);
  const msUntilNextAccrual = Math.max(0, nextAccrualTimestamp - now);
  const nextInterestAmount = Math.ceil(debt * borrowRate);

  // 2. Đếm ngược hết kỳ hạn vay
  const expireTimestamp = borrowedAt + (termDays * 24 * 60 * 60 * 1000);
  const msUntilExpire = expireTimestamp - now;
  const isOverdue = Boolean(loan.isOverdue) || msUntilExpire <= 0;

  return {
    debt,
    principal,
    termDays,
    borrowRate,
    nextAccrualTimestamp,
    msUntilNextAccrual,
    nextInterestAmount,
    isAccrualDue: msUntilNextAccrual === 0,
    expireTimestamp,
    msUntilExpire: Math.max(0, msUntilExpire),
    isOverdue,
    overdueDays: isOverdue ? Math.max(1, Math.floor(Math.abs(now - expireTimestamp) / (24 * 60 * 60 * 1000))) : 0
  };
}

export function accrueUserBank(
  bankData?: BankStateData | null,
  rates: { depositRate?: number | string; borrowRate?: number | string } = {},
  now: number = Date.now(),
  profile: { streak?: number | string } = {}
): BankAccount {
  if (!bankData || typeof bankData !== 'object') {
    return {
      deposited: 0,
      depositInterest: 0,
      lastDepositAt: now,
      deposits: [],
      loan: null,
      isFrozen: false
    };
  }

  const copy: BankStateData = {
    ...bankData,
    deposited: Math.max(0, parseInt(String(bankData.deposited), 10) || 0),
    depositInterest: Math.max(0, parseInt(String(bankData.depositInterest), 10) || 0),
    isFrozen: Boolean(bankData.isFrozen)
  };

  normalizeBankDeposits(copy, now);

  const baseRate = Math.min(0.0025, Math.max(0.0010, Number(rates?.depositRate) || 0.0015));
  const { multiplier: disciplineMult } = calculateDisciplineMultiplier(profile);

  // 1. Accrue deposit interest cho từng sổ
  if (Array.isArray(copy.deposits) && copy.deposits.length > 0) {
    for (const dep of copy.deposits) {
      const amount = Math.max(0, parseInt(String(dep.amount), 10) || 0);
      if (amount <= 0) continue;

      const termDays = parseInt(String(dep.termDays), 10) || 0;
      const termConfig = BANK_TERMS[termDays] || BANK_TERMS[0];
      const termMult = termConfig.rateMultiplier || 1.0;

      const lastAcc = parseInt(String(dep.lastAccruedAt), 10) || parseInt(String(dep.createdAt), 10) || now;
      let targetNow = now;

      // Nếu có kỳ hạn, chỉ tính lãi đến lúc đáo hạn
      if (termDays > 0 && dep.maturityAt) {
        if (now >= dep.maturityAt || (dep.maturityAt - now) <= 5000) {
          dep.status = 'matured';
          targetNow = Math.min(now, dep.maturityAt);
        }
      }

      const elapsedDays = Math.max(0, (targetNow - lastAcc) / (24 * 60 * 60 * 1000));
      if (elapsedDays > 0) {
        const effectiveBase = calculateEffectiveDepositBase(amount);
        const dailyRate = baseRate * termMult * disciplineMult;

        // Giới hạn trần lãi ngày (DAILY_DEPOSIT_INTEREST_CAP = 8 Vàng/ngày)
        const cappedDailyInterest = Math.min(DAILY_DEPOSIT_INTEREST_CAP, effectiveBase * dailyRate);
        const earned = Math.floor(cappedDailyInterest * elapsedDays);

        if (earned > 0) {
          dep.interest = (parseInt(String(dep.interest), 10) || 0) + earned;
          const daysConsumed = cappedDailyInterest > 0 ? (earned / cappedDailyInterest) : elapsedDays;
          dep.lastAccruedAt = Math.min(targetNow, lastAcc + Math.round(daysConsumed * 24 * 60 * 60 * 1000));
        }
        if (termDays > 0 && dep.maturityAt && targetNow === dep.maturityAt && now >= dep.maturityAt) {
          dep.lastAccruedAt = dep.maturityAt;
        }
      }
    }

    copy.deposited = copy.deposits.reduce((sum, d) => sum + (parseInt(String(d.amount), 10) || 0), 0);
    copy.depositInterest = copy.deposits.reduce((sum, d) => sum + (parseInt(String(d.interest), 10) || 0), 0);
    copy.lastDepositAt = now;
  }

  // 2. Accrue loan debt interest & check overdue
  if (copy.loan && parseInt(String(copy.loan.debt), 10) > 0) {
    const loanTermDays = Math.max(1, parseInt(String(copy.loan.termDays), 10) || 7);
    const loan = {
      ...copy.loan,
      principal: Math.max(0, parseInt(String(copy.loan.principal), 10) || 0),
      debt: Math.max(0, parseInt(String(copy.loan.debt), 10) || 0),
      termDays: loanTermDays,
      borrowRate: Number(copy.loan.borrowRate) || Number(rates?.borrowRate) || 0.06,
      autoDeductPercent: Math.min(0.80, Math.max(0.20, Number(copy.loan.autoDeductPercent) || 0.50)),
      isOverdue: Boolean(copy.loan.isOverdue)
    };

    const borrowedAt = parseInt(String(loan.borrowedAt), 10) || now;
    const lastAcc = parseInt(String(loan.lastAccruedAt), 10) || borrowedAt;
    const elapsedDays = Math.max(0, (now - lastAcc) / (24 * 60 * 60 * 1000));

    // Check overdue (past loan.termDays since loan creation without full repayment)
    if ((now - borrowedAt) >= loanTermDays * 24 * 60 * 60 * 1000) {
      loan.isOverdue = true;
      copy.isFrozen = true;
    }

    if (elapsedDays >= 1) {
      const daysCount = Math.min(365, Math.floor(elapsedDays));
      for (let d = 0; d < daysCount; d++) {
        const dailyInterest = Math.ceil(loan.debt * loan.borrowRate);
        loan.debt += dailyInterest;
      }
      loan.lastAccruedAt = lastAcc + (daysCount * 24 * 60 * 60 * 1000);
    }

    copy.loan = loan;
  }

  const resultLoan: BankLoan | null = copy.loan ? {
    principal: copy.loan.principal || 0,
    debt: copy.loan.debt || 0,
    termDays: copy.loan.termDays || 7,
    borrowRate: copy.loan.borrowRate || 0.05,
    autoDeductPercent: copy.loan.autoDeductPercent || 0.5,
    borrowedAt: copy.loan.borrowedAt || now,
    lastAccruedAt: copy.loan.lastAccruedAt || now,
    isOverdue: Boolean(copy.loan.isOverdue),
    signature: copy.loan.signature || ''
  } : null;

  return {
    deposited: copy.deposited || 0,
    depositInterest: copy.depositInterest || 0,
    lastDepositAt: copy.lastDepositAt || now,
    deposits: copy.deposits || [],
    loan: resultLoan,
    isFrozen: Boolean(copy.isFrozen)
  };
}
