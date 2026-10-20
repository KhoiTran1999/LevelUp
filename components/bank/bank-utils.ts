import type {
  BankAccount,
  BankDepositItem,
  BankLoan,
  BankPoolState,
  BankRates,
  UserProfile,
} from '@/types/levelup';

export interface BankTermConfig {
  id: string;
  days: number;
  label: string;
  desc: string;
  rateMultiplier: number;
  icon: string;
}

export const BANK_TERMS: Record<number, BankTermConfig> = {
  0: {
    id: 'flex',
    days: 0,
    label: 'Linh Hoạt',
    desc: 'Rút bất cứ lúc nào, an toàn tuyệt đối',
    rateMultiplier: 1.0,
    icon: '🍃',
  },
  7: {
    id: 'week',
    days: 7,
    label: '7 Ngày',
    desc: 'Tuần tích lũy, tăng trưởng đều đặn',
    rateMultiplier: 1.3,
    icon: '⚡',
  },
  14: {
    id: 'two_weeks',
    days: 14,
    label: '14 Ngày',
    desc: 'Thử thách 2 tuần kiên định',
    rateMultiplier: 1.6,
    icon: '🛡️',
  },
  30: {
    id: 'month',
    days: 30,
    label: '30 Ngày',
    desc: 'Chiến binh cam kết, lãi suất tối đa',
    rateMultiplier: 2.0,
    icon: '👑',
  },
};

export const LOAN_TERMS: Record<number, BankTermConfig> = {
  3: {
    id: 'term_3',
    days: 3,
    label: '3 Ngày',
    desc: 'Vay cấp tốc, hoàn nợ trong 3 ngày',
    rateMultiplier: 0.9,
    icon: '⚡',
  },
  7: {
    id: 'term_7',
    days: 7,
    label: '7 Ngày',
    desc: 'Gói chuẩn 1 tuần làm nhiệm vụ',
    rateMultiplier: 1.0,
    icon: '🛡️',
  },
  14: {
    id: 'term_14',
    days: 14,
    label: '14 Ngày',
    desc: 'Thong thả 2 tuần làm việc',
    rateMultiplier: 1.1,
    icon: '⏳',
  },
  30: {
    id: 'term_30',
    days: 30,
    label: '30 Ngày',
    desc: 'Dài hạn 1 tháng, thảnh thơi trả dần',
    rateMultiplier: 1.2,
    icon: '👑',
  },
};

export const DAILY_DEPOSIT_INTEREST_CAP = 8; // Trần tối đa 8 Vàng lãi / ngày

export function calculateEffectiveDepositBase(amount: number): number {
  const a = Math.max(0, parseInt(String(amount), 10) || 0);
  if (a <= 100) return a;
  if (a <= 500) return 100 + (a - 100) * 0.7;
  if (a <= 2000) return 380 + (a - 500) * 0.4;
  return 980 + (a - 2000) * 0.1;
}

export function calculateDisciplineMultiplier(profile?: Partial<UserProfile> | null) {
  const streak = Math.max(0, parseInt(String(profile?.streak), 10) || 0);
  if (streak >= 7)
    return {
      multiplier: 1.5,
      label: 'Chiến Binh Kỷ Luật (Streak ≥ 7)',
      icon: '🔥',
      bonusPct: 50,
    };
  if (streak >= 3)
    return {
      multiplier: 1.3,
      label: 'Duy Trì Thói Quen (Streak ≥ 3)',
      icon: '⚡',
      bonusPct: 30,
    };
  if (streak >= 1)
    return {
      multiplier: 1.15,
      label: 'Khởi Động Ngày Mới (Streak ≥ 1)',
      icon: '🌱',
      bonusPct: 15,
    };
  return {
    multiplier: 0.8,
    label: 'Chưa Có Chuỗi Kỷ Luật (Streak 0)',
    icon: '⚠️',
    bonusPct: -20,
  };
}

export function calculateBankRates(poolState?: Partial<BankPoolState> | null): BankRates {
  const poolGold = Math.max(0, parseInt(String(poolState?.poolGold), 10) || 500);
  const totalBorrowed = Math.max(0, parseInt(String(poolState?.totalBorrowed), 10) || 0);
  const totalLiquidity = poolGold + totalBorrowed;
  const utilization =
    totalLiquidity > 0 ? Math.min(1.0, Math.max(0.0, totalBorrowed / totalLiquidity)) : 0;
  const depositRate = Number(
    (Math.min(0.0025, Math.max(0.001, 0.0012 + 0.0013 * utilization))).toFixed(4)
  );
  const borrowRate = Number((Math.min(0.18, Math.max(0.04, 0.05 + 0.1 * utilization))).toFixed(4));
  return {
    utilization,
    depositRate,
    borrowRate,
    spread: Number((borrowRate - depositRate).toFixed(4)),
  };
}

export function calculateCreditLimit(
  profile?: Partial<UserProfile> | null,
  autoDeductPercent = 0.5
): number {
  const level = Math.max(1, parseInt(String(profile?.level), 10) || 1);
  const streak = Math.max(0, parseInt(String(profile?.streak), 10) || 0);
  const baseLimit = 25 + level * 5;
  const streakBonus = Math.min(30, streak * 2);
  const kDeduct = 1.0 + (autoDeductPercent - 0.5) * 0.4;
  return Math.max(20, Math.floor((baseLimit + streakBonus) * kDeduct));
}

export function formatBankCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function triggerToast(msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  if (typeof window !== 'undefined') {
    (window as unknown as { showToast?: (m: string, t: string) => void }).showToast?.(msg, type);
  }
}

export interface DepositPayoutInfo {
  type: 'flex' | 'term';
  expectedPayoutAmount: number;
  msRemaining: number;
  timerFormatted: string;
  sourceText: string;
  noteText: string;
}

export function calculateDepositPayoutInfo(
  dep: BankDepositItem,
  rates: Partial<BankRates> = {},
  discipline = 1.0,
  now = Date.now()
): DepositPayoutInfo {
  const baseRate = rates.depositRate || 0.0012;
  const termConfig = BANK_TERMS[dep.termDays] || BANK_TERMS[0];
  const effectiveAmount = calculateEffectiveDepositBase(dep.amount);
  const adjustedRate = baseRate * termConfig.rateMultiplier * discipline;
  const dailyInterest = Math.min(DAILY_DEPOSIT_INTEREST_CAP, effectiveAmount * adjustedRate);

  if (dep.termDays === 0) {
    // Sổ linh hoạt: nhận tối thiểu 1 Vàng
    const expectedAmount = 1;
    const msToEarnOneGold = dailyInterest > 0 ? (1 / dailyInterest) * 24 * 60 * 60 * 1000 : 0;
    const lastAcc = dep.lastAccruedAt || dep.createdAt || now;
    const targetMs = Math.ceil(msToEarnOneGold);
    const msRemaining = Math.max(0, lastAcc + targetMs - now);

    return {
      type: 'flex',
      expectedPayoutAmount: expectedAmount,
      msRemaining,
      timerFormatted: formatBankCountdown(msRemaining),
      sourceText: `Sổ Linh Hoạt (${dep.amount} Vàng)`,
      noteText: msRemaining > 0 ? 'Tự động tích lũy vào lãi' : 'Đang cộng lãi...',
    };
  } else {
    // Sổ có kỳ hạn
    const termMs = dep.termDays * 24 * 60 * 60 * 1000;
    const maturityAt = dep.maturityAt || (dep.createdAt || now) + termMs;
    const msRemaining = Math.max(0, maturityAt - now);
    const totalDays = dep.termDays;
    const totalExpectedInterest = Math.round(dailyInterest * totalDays);

    return {
      type: 'term',
      expectedPayoutAmount: totalExpectedInterest,
      msRemaining,
      timerFormatted: formatBankCountdown(msRemaining),
      sourceText: `Gói ${termConfig.label} (${dep.amount} Vàng)`,
      noteText: msRemaining > 0 ? 'Đáo hạn nhận trọn gốc & lãi' : 'Đã đến ngày đáo hạn!',
    };
  }
}

export interface LoanCountdownInfo {
  nextAccrualTimestamp: number;
  msUntilNextAccrual: number;
  nextAccrualFormatted: string;
  nextInterestAmount: number;
  isAccrualDue: boolean;
  expireTimestamp: number;
  msUntilExpire: number;
  expireFormatted: string;
  isOverdue: boolean;
  overdueDays: number;
  termDays: number;
}

export function calculateLoanCountdownInfo(
  loan: BankLoan,
  rates: Partial<BankRates> = {},
  now = Date.now()
): LoanCountdownInfo {
  const termDays = Math.max(1, parseInt(String(loan.termDays), 10) || 7);
  const borrowedAt = parseInt(String(loan.borrowedAt), 10) || now;
  const lastAccruedAt = parseInt(String(loan.lastAccruedAt), 10) || borrowedAt;
  const borrowRate = Number(loan.borrowRate) || rates.borrowRate || 0.05;
  const currentDebt = Math.max(0, parseInt(String(loan.debt), 10) || 0);

  // 1. Next 24h interest accrual cycle
  const nextAccrualTimestamp = lastAccruedAt + 24 * 60 * 60 * 1000;
  const msUntilNextAccrual = Math.max(0, nextAccrualTimestamp - now);
  const nextInterestAmount = Math.ceil(currentDebt * borrowRate);
  const isAccrualDue = now >= nextAccrualTimestamp;

  // 2. Loan term expiration
  const expireTimestamp = borrowedAt + termDays * 24 * 60 * 60 * 1000;
  const msUntilExpire = Math.max(0, expireTimestamp - now);
  const isOverdue = Boolean(loan.isOverdue) || now >= expireTimestamp;
  const overdueDays = isOverdue ? Math.max(1, Math.floor((now - expireTimestamp) / (24 * 60 * 60 * 1000))) : 0;

  return {
    nextAccrualTimestamp,
    msUntilNextAccrual,
    nextAccrualFormatted: formatBankCountdown(msUntilNextAccrual),
    nextInterestAmount,
    isAccrualDue,
    expireTimestamp,
    msUntilExpire,
    expireFormatted: formatBankCountdown(msUntilExpire),
    isOverdue,
    overdueDays,
    termDays,
  };
}

export function normalizeBankDeposits(bank: BankAccount, now = Date.now()): BankAccount {
  if (!bank || typeof bank !== 'object') return bank;

  if (!Array.isArray(bank.deposits)) {
    const dep = Math.max(0, parseInt(String(bank.deposited), 10) || 0);
    const int = Math.max(0, parseInt(String(bank.depositInterest), 10) || 0);
    if (dep > 0 || int > 0) {
      bank.deposits = [
        {
          id: bank.lastDepositAt ? `dep_legacy_${bank.lastDepositAt}` : `dep_legacy_${now}`,
          amount: dep,
          termDays: 0,
          interest: int,
          createdAt: parseInt(String(bank.lastDepositAt), 10) || now,
          lastAccruedAt: parseInt(String(bank.lastDepositAt), 10) || now,
          maturityAt: 0,
          status: 'active',
        },
      ];
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
      d.status = d.termDays > 0 && d.maturityAt && now >= d.maturityAt ? 'matured' : 'active';
    }
    return d.status === 'active' || d.status === 'matured';
  });

  bank.deposited = bank.deposits.reduce((sum, d) => sum + (parseInt(String(d.amount), 10) || 0), 0);
  bank.depositInterest = bank.deposits.reduce(
    (sum, d) => sum + (parseInt(String(d.interest), 10) || 0),
    0
  );
  return bank;
}
