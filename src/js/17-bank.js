// =============================================================================
// 13.6. BANKING FINANCIAL ENGINE & AMM STATE MANAGEMENT (AI Central Bank)
// =============================================================================

let currentBankPool = {
  poolGold: 500,
  totalBorrowed: 0,
  reserveFund: 150,
  totalDeposited: 0,
  bailoutDebt: 0
};

let bankCommentaryCache = { text: '', timestamp: 0 };

const BANK_TERMS = {
  0: { id: 'flex', days: 0, label: 'Linh Hoạt', desc: 'Rút bất cứ lúc nào, an toàn tuyệt đối', rateMultiplier: 1.0, icon: '🍃' },
  7: { id: 'week', days: 7, label: '7 Ngày', desc: 'Tuần tích lũy, tăng trưởng đều đặn', rateMultiplier: 1.3, icon: '⚡' },
  14: { id: 'two_weeks', days: 14, label: '14 Ngày', desc: 'Thử thách 2 tuần kiên định', rateMultiplier: 1.6, icon: '🛡️' },
  30: { id: 'month', days: 30, label: '30 Ngày', desc: 'Chiến binh cam kết, lãi suất tối đa', rateMultiplier: 2.0, icon: '👑' }
};

const LOAN_TERMS = {
  3: { id: 'term_3', days: 3, label: '3 Ngày', desc: 'Vay cấp tốc, hoàn nợ trong 3 ngày', rateMultiplier: 0.90, icon: '⚡' },
  7: { id: 'term_7', days: 7, label: '7 Ngày', desc: 'Gói chuẩn 1 tuần làm nhiệm vụ', rateMultiplier: 1.00, icon: '🛡️' },
  14: { id: 'term_14', days: 14, label: '14 Ngày', desc: 'Thong thả 2 tuần làm việc', rateMultiplier: 1.10, icon: '⏳' },
  30: { id: 'term_30', days: 30, label: '30 Ngày', desc: 'Dài hạn 1 tháng, thảnh thơi trả dần', rateMultiplier: 1.20, icon: '👑' }
};

const DAILY_DEPOSIT_INTEREST_CAP = 8; // Trần tối đa 8 Vàng lãi / ngày
let selectedDepositTerm = 0; // Mặc định 0 ngày: Linh hoạt
let selectedBorrowTerm = 7; // Mặc định 7 ngày: Chuẩn

function calculateEffectiveDepositBase(amount) {
  const a = Math.max(0, parseInt(amount, 10) || 0);
  if (a <= 100) return a;
  if (a <= 500) return 100 + (a - 100) * 0.70;
  if (a <= 2000) return 380 + (a - 500) * 0.40;
  return 980 + (a - 2000) * 0.10;
}

function calculateDisciplineMultiplier(profile = {}) {
  const streak = Math.max(0, parseInt(profile?.streak, 10) || 0);
  if (streak >= 7) return { multiplier: 1.5, label: 'Chiến Binh Kỷ Luật (Streak ≥ 7)', icon: '🔥', bonusPct: 50 };
  if (streak >= 3) return { multiplier: 1.3, label: 'Duy Trì Thói Quen (Streak ≥ 3)', icon: '⚡', bonusPct: 30 };
  if (streak >= 1) return { multiplier: 1.15, label: 'Khởi Động Ngày Mới (Streak ≥ 1)', icon: '🌱', bonusPct: 15 };
  return { multiplier: 0.8, label: 'Chưa Có Chuỗi Kỷ Luật (Streak 0)', icon: '⚠️', bonusPct: -20 };
}

function normalizeBankDeposits(bank, now = Date.now()) {
  if (!bank || typeof bank !== 'object') return bank;

  if (!Array.isArray(bank.deposits)) {
    const dep = Math.max(0, parseInt(bank.deposited, 10) || 0);
    const int = Math.max(0, parseInt(bank.depositInterest, 10) || 0);
    if (dep > 0 || int > 0) {
      bank.deposits = [{
        id: bank.lastDepositAt ? `dep_legacy_${bank.lastDepositAt}` : `dep_legacy_${now}`,
        amount: dep,
        termDays: 0,
        interest: int,
        createdAt: parseInt(bank.lastDepositAt, 10) || now,
        lastAccruedAt: parseInt(bank.lastDepositAt, 10) || now,
        maturityAt: 0,
        status: 'active'
      }];
    } else {
      bank.deposits = [];
    }
  }

  bank.deposits = bank.deposits.filter(d => {
    if (!d) return false;
    const amount = parseInt(d.amount, 10) || 0;
    const interest = parseInt(d.interest, 10) || 0;
    if (amount <= 0 && interest <= 0) return false;
    if (!d.status) {
      d.status = (d.termDays > 0 && d.maturityAt && now >= d.maturityAt) ? 'matured' : 'active';
    }
    return d.status === 'active' || d.status === 'matured';
  });
  bank.deposited = bank.deposits.reduce((sum, d) => sum + (parseInt(d.amount, 10) || 0), 0);
  bank.depositInterest = bank.deposits.reduce((sum, d) => sum + (parseInt(d.interest, 10) || 0), 0);
  return bank;
}

function calculateLocalBankRates(poolState) {
  const poolGold = Math.max(0, parseInt(poolState?.poolGold, 10) || 0);
  const totalBorrowed = Math.max(0, parseInt(poolState?.totalBorrowed, 10) || 0);
  const totalLiquidity = poolGold + totalBorrowed;
  const utilization = totalLiquidity > 0 ? Math.min(1.0, Math.max(0.0, totalBorrowed / totalLiquidity)) : 0;
  // Cân bằng cho nền kinh tế RPG: Lãi cơ sở 0.12% đến 0.25%/ngày
  const depositRate = Number((Math.min(0.0025, Math.max(0.0010, 0.0012 + 0.0013 * utilization))).toFixed(4));
  const borrowRate = Number((Math.min(0.18, Math.max(0.04, 0.05 + 0.10 * utilization))).toFixed(4));
  return {
    utilization,
    depositRate,
    borrowRate,
    spread: Number((borrowRate - depositRate).toFixed(4))
  };
}

function calculateLocalCreditLimit(profile, autoDeductPercent = 0.50) {
  const level = Math.max(1, parseInt(profile?.level, 10) || 1);
  const streak = Math.max(0, parseInt(profile?.streak, 10) || 0);
  const totalEarned = Math.max(20, parseInt(profile?.totalCoinsEarned, 10) || 20);
  const rawBase = level * 25 + streak * 5 + Math.floor(totalEarned * 0.1);
  const baseLimit = Math.min(400, rawBase);
  const rate = Math.min(0.80, Math.max(0.20, Number(autoDeductPercent) || 0.50));
  const kDeduct = 0.7 + ((Math.max(0.30, rate) - 0.30) / 0.50) * 0.8;
  return Math.max(20, Math.floor(baseLimit * kDeduct));
}

function accrueLocalUserBank(bank, pool, now = Date.now(), profile = appState.profile) {
  if (!bank || typeof bank !== 'object') return bank;

  const rates = pool?.depositRate !== undefined ? pool : calculateLocalBankRates(pool);
  normalizeBankDeposits(bank, now);

  const baseRate = Math.min(0.0025, Math.max(0.0010, Number(rates?.depositRate) || 0.0015));
  const { multiplier: disciplineMult } = calculateDisciplineMultiplier(profile);

  // 1. Accrue deposit interest cho từng sổ
  if (Array.isArray(bank.deposits) && bank.deposits.length > 0) {
    for (const dep of bank.deposits) {
      const amount = Math.max(0, parseInt(dep.amount, 10) || 0);
      if (amount <= 0) continue;

      const termDays = parseInt(dep.termDays, 10) || 0;
      const termConfig = BANK_TERMS[termDays] || BANK_TERMS[0];
      const termMult = termConfig.rateMultiplier || 1.0;

      const lastAcc = parseInt(dep.lastAccruedAt, 10) || parseInt(dep.createdAt, 10) || now;
      let targetNow = now;

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
          dep.interest = (parseInt(dep.interest, 10) || 0) + earned;
          const daysConsumed = cappedDailyInterest > 0 ? (earned / cappedDailyInterest) : elapsedDays;
          dep.lastAccruedAt = Math.min(targetNow, lastAcc + Math.round(daysConsumed * 24 * 60 * 60 * 1000));
        }
        if (termDays > 0 && dep.maturityAt && targetNow === dep.maturityAt && now >= dep.maturityAt) {
          dep.lastAccruedAt = dep.maturityAt;
        }
      }
    }

    bank.deposited = bank.deposits.reduce((sum, d) => sum + (parseInt(d.amount, 10) || 0), 0);
    bank.depositInterest = bank.deposits.reduce((sum, d) => sum + (parseInt(d.interest, 10) || 0), 0);
    bank.lastDepositAt = now;
  }

  // 2. Accrue loan debt interest & check overdue
  if (bank.loan && parseInt(bank.loan.debt, 10) > 0) {
    const loanTermDays = Math.max(1, parseInt(bank.loan.termDays, 10) || 7);
    const loan = {
      ...bank.loan,
      principal: Math.max(0, parseInt(bank.loan.principal, 10) || 0),
      debt: Math.max(0, parseInt(bank.loan.debt, 10) || 0),
      termDays: loanTermDays,
      borrowRate: Number(bank.loan.borrowRate) || Number(rates?.borrowRate) || 0.06,
      autoDeductPercent: Math.min(0.80, Math.max(0.20, Number(bank.loan.autoDeductPercent) || 0.50)),
      isOverdue: Boolean(bank.loan.isOverdue)
    };

    const borrowedAt = parseInt(loan.borrowedAt, 10) || now;
    const lastAcc = parseInt(loan.lastAccruedAt, 10) || borrowedAt;
    const elapsedDays = Math.max(0, (now - lastAcc) / (24 * 60 * 60 * 1000));

    if ((now - borrowedAt) >= loanTermDays * 24 * 60 * 60 * 1000) {
      loan.isOverdue = true;
      bank.isFrozen = true;
    }

    if (elapsedDays >= 1) {
      const daysCount = Math.min(365, Math.floor(elapsedDays));
      for (let d = 0; d < daysCount; d++) {
        const dailyInterest = Math.ceil(loan.debt * loan.borrowRate);
        loan.debt += dailyInterest;
      }
      loan.lastAccruedAt = lastAcc + (daysCount * 24 * 60 * 60 * 1000);
    }

    bank.loan = loan;
  }

  return bank;
}

function ensureUserBankProfile() {
  if (!appState.profile) appState.profile = {};
  if (!appState.profile.bank) {
    appState.profile.bank = {
      deposited: 0,
      depositInterest: 0,
      lastDepositAt: Date.now(),
      deposits: [],
      loan: null,
      isFrozen: false
    };
  }
  normalizeBankDeposits(appState.profile.bank);
  accrueLocalUserBank(appState.profile.bank, currentBankPool);
  return appState.profile.bank;
}

async function loadBankState() {
  const isManual = Boolean(arguments[0]);
  const btnRefresh = document.getElementById('btn-refresh-bank');
  const icon = document.getElementById('btn-refresh-bank-icon');
  if (isManual && btnRefresh) {
    btnRefresh.disabled = true;
    if (icon) icon.classList.add('animate-spin');
  }

  const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
  ensureUserBankProfile();

  let poolData = currentBankPool;
  let userBank = appState.profile.bank;
  let creditLimit = calculateLocalCreditLimit(appState.profile, userBank.loan?.autoDeductPercent || 0.50);

  let fetchSuccess = false;
  try {
    const res = await fetch(`/api/sync?action=bank_state&token=${encodeURIComponent(token || '')}&ts=${Date.now()}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data.pool) {
        currentBankPool = data.pool;
        poolData = data.pool;
      }
      if (data.userBank) {
        appState.profile.bank = data.userBank;
        userBank = data.userBank;
      }
      if (data.creditLimit) {
        creditLimit = data.creditLimit;
      }
      fetchSuccess = true;
    } else {
      userBank = accrueLocalUserBank(appState.profile.bank, currentBankPool);
    }
  } catch (err) {
    console.warn('Không thể kết nối đến máy chủ Ngân Hàng, sử dụng dữ liệu cục bộ:', err);
    userBank = accrueLocalUserBank(appState.profile.bank, currentBankPool);
  } finally {
    if (isManual && btnRefresh) {
      setTimeout(() => {
        btnRefresh.disabled = false;
        if (icon) icon.classList.remove('animate-spin');
      }, 350);
    }
  }

  renderBankUI(poolData, userBank, creditLimit);
  renderLedger();
  loadBankAiCommentary(poolData);

  if (isManual) {
    if (fetchSuccess) {
      showToast('Đã cập nhật dữ liệu Ngân Hàng mới nhất!', 'info');
    } else {
      showToast('Không thể kết nối máy chủ Ngân Hàng, đang sử dụng dữ liệu lưu tạm.', 'warning');
    }
  }
}

function renderBankUI(pool, userBank, creditLimit) {
  // 1. Kiểm tra nợ quá hạn theo kỳ hạn
  const loanTermDays = Math.max(1, parseInt(userBank?.loan?.termDays, 10) || 7);
  const isOverdue = userBank?.loan?.isOverdue || (userBank?.loan && (Date.now() - (parseInt(userBank.loan.borrowedAt, 10) || Date.now())) >= loanTermDays * 24 * 60 * 60 * 1000);
  if (isOverdue && userBank?.loan) {
    userBank.loan.isOverdue = true;
    userBank.isFrozen = true;
    appState.profile.title = 'Con Nợ Quá Hạn ⚠️';
  }

  const overdueBanner = document.getElementById('bank-overdue-banner');
  const overdueTitle = document.getElementById('bank-overdue-title');
  if (overdueBanner) {
    if (userBank?.isFrozen || isOverdue) {
      overdueBanner.classList.remove('hidden');
      if (overdueTitle) {
        overdueTitle.textContent = `CẢNH BÁO: KHOẢN VAY ĐÃ QUÁ HẠN ${loanTermDays} NGÀY!`;
      }
    } else {
      overdueBanner.classList.add('hidden');
    }
  }

  // 2. Chỉ số AMM Bể Vàng & Lãi suất động
  const rates = pool.depositRate !== undefined ? pool : calculateLocalBankRates(pool);

  const elPoolGold = document.getElementById('bank-pool-gold');
  if (elPoolGold) elPoolGold.textContent = (pool.poolGold ?? 500).toLocaleString('vi-VN');

  const elBorrowed = document.getElementById('bank-total-borrowed');
  if (elBorrowed) elBorrowed.textContent = (pool.totalBorrowed ?? 0).toLocaleString('vi-VN');

  const elUtil = document.getElementById('bank-utilization-pct');
  if (elUtil) elUtil.textContent = Math.round((rates.utilization || 0) * 100) + '%';

  const elDepRate = document.getElementById('bank-deposit-rate');
  if (elDepRate) elDepRate.textContent = ((Math.min(0.0025, rates.depositRate || 0.0015)) * 100).toFixed(2) + '%/ngày';

  const elBorRate = document.getElementById('bank-borrow-rate');
  if (elBorRate) elBorRate.textContent = ((rates.borrowRate || 0.05) * 100).toFixed(1) + '%/ngày';

  const elReserve = document.getElementById('bank-reserve-fund');
  if (elReserve) elReserve.textContent = (pool.reserveFund ?? 150).toLocaleString('vi-VN');

  const elBailout = document.getElementById('bank-bailout-status');
  if (elBailout) {
    if ((pool.bailoutDebt || 0) > 0) {
      elBailout.className = 'text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5 flex items-center gap-1';
      elBailout.innerHTML = `<span>⚠️</span> <span class="inline-flex items-center gap-1">Kho Bạc bảo lãnh (${pool.bailoutDebt} ${COIN_ICON_HTML})</span>`;
    } else {
      elBailout.className = 'text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 flex items-center gap-1';
      elBailout.innerHTML = `<span>🛡️</span> <span>Kho Bạc an toàn</span>`;
    }
  }

  // 3. Sổ Tiết Kiệm (Depositor)
  userBank = accrueLocalUserBank(userBank, rates);
  const elUserDep = document.getElementById('bank-user-deposited');
  if (elUserDep) elUserDep.textContent = (userBank?.deposited || 0).toLocaleString('vi-VN');

  const elUserInt = document.getElementById('bank-user-interest');
  if (elUserInt) elUserInt.textContent = '+' + (userBank?.depositInterest || 0).toLocaleString('vi-VN');

  // Badge Kỷ luật Streak (Gọn gàng, tối giản)
  const disc = calculateDisciplineMultiplier(appState.profile || {});
  const elDiscipline = document.getElementById('bank-discipline-badge');
  if (elDiscipline) {
    if (disc.bonusPct > 0) {
      elDiscipline.className = 'p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 text-xs mb-3';
      elDiscipline.innerHTML = `
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="text-sm shrink-0">${disc.icon}</span>
          <span class="font-bold text-amber-700 dark:text-amber-300 truncate">${disc.label}</span>
        </div>
        <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs shrink-0">+${disc.bonusPct}% Lãi</span>
      `;
    } else {
      elDiscipline.className = 'p-2 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-between gap-2 text-xs mb-3';
      elDiscipline.innerHTML = `
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="text-sm shrink-0">🔥</span>
          <span class="text-slate-600 dark:text-slate-400 truncate">Chuỗi kỷ luật: 0 ngày</span>
        </div>
        <span class="text-[10px] text-slate-400 shrink-0">Làm NV để tăng lãi</span>
      `;
    }
  }

  renderBankDepositsList(userBank);
  updateDepositTermButtons(rates);
  updateDepositCalculator(rates.depositRate);

  // 4. Quầy Vay Vàng (Borrower)
  const isNegotiated = Boolean(bankNegotiatedTerms && bankNegotiatedTerms.creditLimit);
  const effectiveLimit = isNegotiated
    ? Math.max(bankNegotiatedTerms.creditLimit, creditLimit)
    : creditLimit;
  const elBadge = document.getElementById('bank-credit-limit-badge');
  if (elBadge) {
    if (isNegotiated) {
      elBadge.innerHTML = `<span>Hạn mức: ${effectiveLimit}</span> ${COIN_ICON_HTML} <span class="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold ml-1">Ưu đãi</span>`;
    } else {
      elBadge.innerHTML = `<span>Hạn mức: ${effectiveLimit}</span> ${COIN_ICON_HTML}`;
    }
  }

  const negotiatedBadge = document.getElementById('bank-negotiated-badge');
  const negotiatedTermsSpan = document.getElementById('bank-negotiated-terms');
  if (negotiatedBadge && negotiatedTermsSpan && bankNegotiatedTerms) {
    negotiatedTermsSpan.textContent = `Lãi ${(bankNegotiatedTerms.borrowRate * 100).toFixed(1)}%/ngày • Hạn mức ${bankNegotiatedTerms.creditLimit} Vàng • Trích ${Math.round(bankNegotiatedTerms.autoDeductPercent * 100)}%`;
    negotiatedBadge.classList.remove('hidden');
  }

  const activeBox = document.getElementById('bank-loan-active-box');
  const formBox = document.getElementById('bank-loan-form-box');
  const btnBorrow = document.getElementById('btn-bank-borrow');
  const btnRepay = document.getElementById('btn-bank-repay');

  if (userBank?.loan && (userBank.loan.debt || 0) > 0) {
    if (activeBox) activeBox.classList.remove('hidden');
    if (formBox) formBox.classList.add('hidden');
    if (btnBorrow) {
      btnBorrow.disabled = true;
      btnBorrow.classList.add('opacity-50', 'cursor-not-allowed');
    }
    if (btnRepay) {
      btnRepay.disabled = false;
      btnRepay.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    const elDebt = document.getElementById('bank-current-debt');
    if (elDebt) elDebt.innerHTML = `${userBank.loan.debt} ${COIN_ICON_HTML}`;

    const principal = Math.max(0, parseInt(userBank.loan.principal, 10) || 0);
    const debt = Math.max(0, parseInt(userBank.loan.debt, 10) || 0);
    const accruedInterest = Math.max(0, debt - principal);
    const elPrincipal = document.getElementById('bank-loan-principal');
    if (elPrincipal) elPrincipal.innerHTML = `${principal.toLocaleString('vi-VN')} ${COIN_ICON_HTML}`;
    const elAccrued = document.getElementById('bank-loan-accrued-interest');
    if (elAccrued) elAccrued.innerHTML = `+${accruedInterest.toLocaleString('vi-VN')} ${COIN_ICON_HTML}`;
    const elRate = document.getElementById('bank-active-borrow-rate');
    if (elRate) elRate.textContent = `${((userBank.loan.borrowRate || rates.borrowRate || 0.05) * 100).toFixed(1)}%/ngày`;

    const elDeductRate = document.getElementById('bank-active-deduct-rate');
    if (elDeductRate) elDeductRate.textContent = `${Math.round((userBank.loan.autoDeductPercent || 0.5) * 100)}%`;

    const elDaysLeft = document.getElementById('bank-loan-days-left');
    if (elDaysLeft) {
      const termDays = Math.max(1, parseInt(userBank.loan.termDays, 10) || 7);
      const daysPassed = Math.floor((Date.now() - (parseInt(userBank.loan.borrowedAt, 10) || Date.now())) / (24 * 60 * 60 * 1000));
      const daysLeft = Math.max(0, termDays - daysPassed);
      if (userBank.loan.isOverdue || daysLeft === 0) {
        elDaysLeft.textContent = 'Đã quá hạn ⚠️';
        elDaysLeft.className = 'font-bold text-rose-600';
      } else {
        elDaysLeft.textContent = `${daysLeft} / ${termDays} ngày`;
        elDaysLeft.className = 'font-semibold text-amber-600';
      }
    }

    const elPenalty = document.getElementById('bank-early-repay-penalty-label');
    if (elPenalty) {
      elPenalty.textContent = userBank.loan.isOverdue
        ? 'Đã quá hạn (Không phạt tất toán sớm)'
        : '5% phí trả trước hạn';
    }
  } else {
    if (activeBox) activeBox.classList.add('hidden');
    if (formBox) formBox.classList.remove('hidden');
    if (btnBorrow) {
      btnBorrow.disabled = false;
      btnBorrow.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    if (btnRepay) {
      btnRepay.disabled = true;
      btnRepay.classList.add('opacity-50', 'cursor-not-allowed');
    }
    updateBorrowTermButtons(rates);
    updateBorrowCalculator();
  }

  // 5. Cập nhật bảng đo lường vĩ mô AMM chi tiết trong Admin Dashboard (nếu có)
  renderAdminBankTelemetry(pool, rates);
}

function renderAdminBankTelemetry(pool, rates) {
  if (!pool) return;
  const pRates = rates || (pool.depositRate !== undefined ? pool : calculateLocalBankRates(pool));

  const elAdminPool = document.getElementById('admin-bank-pool-gold');
  if (elAdminPool) elAdminPool.textContent = (pool.poolGold ?? 500).toLocaleString('vi-VN');

  const elAdminBorrowed = document.getElementById('admin-bank-total-borrowed');
  if (elAdminBorrowed) elAdminBorrowed.textContent = (pool.totalBorrowed ?? 0).toLocaleString('vi-VN');

  const uPct = Math.round((pRates.utilization || 0) * 100);
  const elAdminUtil = document.getElementById('admin-bank-utilization-pct');
  if (elAdminUtil) elAdminUtil.textContent = `${uPct}%`;

  const elAdminUtilBar = document.getElementById('admin-bank-utilization-bar');
  if (elAdminUtilBar) {
    elAdminUtilBar.style.width = `${Math.min(100, Math.max(0, uPct))}%`;
    if (uPct > 80) {
      elAdminUtilBar.className = 'bg-rose-500 h-1.5 rounded-full transition-all duration-300';
    } else if (uPct > 50) {
      elAdminUtilBar.className = 'bg-amber-500 h-1.5 rounded-full transition-all duration-300';
    } else {
      elAdminUtilBar.className = 'bg-blue-600 h-1.5 rounded-full transition-all duration-300';
    }
  }

  const elAdminReserve = document.getElementById('admin-bank-reserve-fund');
  if (elAdminReserve) elAdminReserve.textContent = (pool.reserveFund ?? 150).toLocaleString('vi-VN');

  const elAdminBailoutDebt = document.getElementById('admin-bank-bailout-debt');
  if (elAdminBailoutDebt) elAdminBailoutDebt.textContent = (pool.bailoutDebt ?? 0).toLocaleString('vi-VN');

  const elAdminBailoutText = document.getElementById('admin-bank-bailout-status-text');
  const elAdminHealth = document.getElementById('admin-bank-health-badge');
  if ((pool.bailoutDebt || 0) > 0) {
    if (elAdminBailoutText) {
      elAdminBailoutText.innerHTML = `Kho Bạc Đang Cứu Trợ (${pool.bailoutDebt} ${COIN_ICON_HTML})`;
      elAdminBailoutText.className = 'text-[9px] text-amber-600 dark:text-amber-400 font-bold inline-flex items-center gap-1';
    }
    if (elAdminHealth) {
      elAdminHealth.className = 'text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1';
      elAdminHealth.innerHTML = '<span>⚠️</span> <span>Cứu Trợ Kích Hoạt</span>';
    }
  } else {
    if (elAdminBailoutText) {
      elAdminBailoutText.textContent = 'Kho Bạc An Toàn';
      elAdminBailoutText.className = 'text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold';
    }
    if (elAdminHealth) {
      elAdminHealth.className = 'text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1';
      elAdminHealth.innerHTML = '<span>🛡️</span> <span>Hệ Thống An Toàn</span>';
    }
  }

  const elAdminDepRate = document.getElementById('admin-bank-deposit-rate');
  if (elAdminDepRate) elAdminDepRate.textContent = ((Math.min(0.0025, pRates.depositRate || 0.0015)) * 100).toFixed(2) + '%/ngày';

  const elAdminBorRate = document.getElementById('admin-bank-borrow-rate');
  if (elAdminBorRate) elAdminBorRate.textContent = ((pRates.borrowRate || 0.05) * 100).toFixed(1) + '%/ngày';

  const elAdminSpread = document.getElementById('admin-bank-spread');
  if (elAdminSpread) {
    const spreadVal = pRates.spread !== undefined ? pRates.spread : ((pRates.borrowRate || 0.05) - (pRates.depositRate || 0.0015));
    elAdminSpread.textContent = (spreadVal * 100).toFixed(1) + '%';
  }

  const elAdminTotalDep = document.getElementById('admin-bank-total-deposited');
  if (elAdminTotalDep) elAdminTotalDep.textContent = (pool.totalDeposited ?? 0).toLocaleString('vi-VN');
}

async function loadBankAiCommentary(pool) {
  const elCommentary = document.getElementById('bank-ai-commentary');
  if (!elCommentary || elCommentary.closest('.hidden')) return;

  // Cache bản tin trong 2 phút để tối ưu hiệu năng
  if (bankCommentaryCache.text && Date.now() - bankCommentaryCache.timestamp < 120000) {
    elCommentary.textContent = bankCommentaryCache.text;
    return;
  }

  try {
    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    const res = await fetch('/api/ai', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        action: 'bank_market_commentary',
        payload: { poolState: pool }
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.commentary) {
        bankCommentaryCache = { text: data.commentary, timestamp: Date.now() };
        elCommentary.textContent = data.commentary;
        return;
      }
    }
  } catch (_) {}

  const rates = calculateLocalBankRates(pool);
  let fallback = '';
  if ((pool.bailoutDebt || 0) > 0) {
    fallback = `Kho Bạc Hệ Thống đang bảo trợ ${pool.bailoutDebt} Vàng an toàn 100%! Hãy hoàn thành nhiệm vụ và gửi tiết kiệm để nhận mức lãi suất hấp dẫn ${(rates.depositRate * 100).toFixed(1)}%/ngày!`;
  } else if (rates.utilization > 0.6) {
    fallback = `Quỹ Vàng đang có nhu cầu vốn cao! Lãi suất gửi tiết kiệm đang ở mức tốt ${(rates.depositRate * 100).toFixed(1)}%/ngày. Cơ hội thuận lợi để bạn gửi Vàng tích lũy!`;
  } else {
    fallback = `Quỹ Vàng đang rất dồi dào! Lãi suất vay ưu đãi chỉ ${(rates.borrowRate * 100).toFixed(1)}%/ngày. Bạn có thể vay Vàng nhẹ nhàng nếu cần đổi quà nạp lại năng lượng!`;
  }
  bankCommentaryCache = { text: fallback, timestamp: Date.now() };
  elCommentary.textContent = fallback;
}

function updateDepositTermButtons(rates) {
  const pRates = rates || (currentBankPool?.depositRate !== undefined ? currentBankPool : calculateLocalBankRates(currentBankPool));
  const rawBase = pRates.depositRate || 0.0015;
  const baseRate = Math.min(0.0025, Math.max(0.0010, rawBase));
  const disc = calculateDisciplineMultiplier(appState.profile || {});

  [0, 7, 14, 30].forEach(days => {
    const termConfig = BANK_TERMS[days] || BANK_TERMS[0];
    const finalDailyRate = baseRate * termConfig.rateMultiplier * disc.multiplier;
    const elRate = document.getElementById(`bank-term-rate-${days}`);
    if (elRate) {
      elRate.textContent = `${(finalDailyRate * 100).toFixed(2)}%/ngày`;
    }
  });
}

function selectDepositTerm(days) {
  selectedDepositTerm = [0, 7, 14, 30].includes(Number(days)) ? Number(days) : 0;
  const termButtons = document.querySelectorAll('.bank-term-select-btn');
  termButtons.forEach(btn => {
    const bDays = Number(btn.getAttribute('data-term-days'));
    if (bDays === selectedDepositTerm) {
      btn.className = 'bank-term-select-btn flex-1 py-2 px-1 rounded-xl text-center font-bold text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500 transition cursor-pointer shadow-xs';
    } else {
      btn.className = 'bank-term-select-btn flex-1 py-2 px-1 rounded-xl text-center font-medium text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 transition cursor-pointer';
    }
  });

  const termConfig = BANK_TERMS[selectedDepositTerm] || BANK_TERMS[0];
  const elTermNote = document.getElementById('bank-deposit-term-note');
  if (elTermNote) {
    if (selectedDepositTerm === 0) {
      elTermNote.innerHTML = '🍃 <strong>Linh hoạt:</strong> Rút bất kỳ lúc nào, bảo toàn 100% gốc & lãi.';
    } else {
      elTermNote.innerHTML = `${termConfig.icon} <strong>Gói ${termConfig.label}:</strong> Khóa ${termConfig.days} ngày nhận lãi suất cao nhất. Rút trước hạn mất toàn bộ lãi tích lũy.`;
    }
  }

  // Cập nhật số ngày trên máy tính nếu là kỳ hạn cố định
  const inputDays = document.getElementById('calc-deposit-days');
  if (inputDays && selectedDepositTerm > 0) {
    inputDays.value = selectedDepositTerm;
  }

  updateDepositTermButtons();
  updateDepositCalculator();
}
window.selectDepositTerm = selectDepositTerm;
window.updateDepositTermButtons = updateDepositTermButtons;

function updateBorrowTermButtons(rates) {
  const pRates = rates || (currentBankPool?.borrowRate !== undefined ? currentBankPool : calculateLocalBankRates(currentBankPool));
  const rawBase = bankNegotiatedTerms?.borrowRate ?? (pRates.borrowRate || 0.05);

  [3, 7, 14, 30].forEach(days => {
    const termConfig = LOAN_TERMS[days] || LOAN_TERMS[7];
    const finalDailyRate = Number((rawBase * termConfig.rateMultiplier).toFixed(4));
    const elRate = document.getElementById(`bank-borrow-term-rate-${days}`);
    if (elRate) {
      elRate.textContent = `${(finalDailyRate * 100).toFixed(1)}%/ngày`;
    }
  });
}

function selectBorrowTerm(days) {
  selectedBorrowTerm = [3, 7, 14, 30].includes(Number(days)) ? Number(days) : 7;
  const termButtons = document.querySelectorAll('.bank-borrow-term-btn');
  termButtons.forEach(btn => {
    const bDays = Number(btn.getAttribute('data-borrow-term-days'));
    if (bDays === selectedBorrowTerm) {
      btn.className = 'bank-borrow-term-btn flex-1 py-2 px-1 rounded-xl text-center font-bold text-xs bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-500 transition cursor-pointer shadow-xs';
    } else {
      btn.className = 'bank-borrow-term-btn flex-1 py-2 px-1 rounded-xl text-center font-medium text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 transition cursor-pointer';
    }
  });

  const termConfig = LOAN_TERMS[selectedBorrowTerm] || LOAN_TERMS[7];
  const elTermNoteText = document.getElementById('bank-borrow-term-note-text');
  if (elTermNoteText) {
    elTermNoteText.innerHTML = `${termConfig.icon} <strong>Gói ${termConfig.label}:</strong> ${termConfig.desc}. Sau ${termConfig.days} ngày chưa tất toán sẽ tạm đóng băng Cửa Hàng.`;
  }

  updateBorrowTermButtons();
  updateBorrowCalculator();
}
window.selectBorrowTerm = selectBorrowTerm;
window.updateBorrowTermButtons = updateBorrowTermButtons;

function updateDepositCalculator(overrideRate) {
  const inputDeposit = document.getElementById('input-deposit-amount');
  const inputCoins = document.getElementById('calc-deposit-coins');
  const inputDays = document.getElementById('calc-deposit-days');
  const elRateLabel = document.getElementById('calc-deposit-rate-label');
  const elInterest = document.getElementById('calc-deposit-result-interest');
  const elTotal = document.getElementById('calc-deposit-result-total');
  const elDisciplineBadge = document.getElementById('calc-deposit-discipline-badge');

  let coins = 0;
  if (inputDeposit && inputDeposit.value !== '') {
    coins = Math.max(0, parseInt(inputDeposit.value, 10) || 0);
    if (inputCoins) inputCoins.value = coins;
  } else if (inputCoins) {
    coins = Math.max(0, parseInt(inputCoins.value, 10) || 0);
  }

  const termConfig = BANK_TERMS[selectedDepositTerm] || BANK_TERMS[0];
  const days = selectedDepositTerm > 0 ? selectedDepositTerm : (Math.max(1, parseInt(inputDays?.value, 10) || 7));
  if (inputDays) inputDays.value = days;

  const rates = currentBankPool?.depositRate !== undefined ? currentBankPool : calculateLocalBankRates(currentBankPool);
  const rawBase = typeof overrideRate === 'number' ? overrideRate : (rates.depositRate || 0.0015);
  // Khống chế lãi suất cơ sở trong khoảng [0.10%, 0.25%]/ngày chuẩn kinh tế RPG
  const baseRate = Math.min(0.0025, Math.max(0.0010, rawBase));

  const disc = calculateDisciplineMultiplier(appState.profile || {});
  const effectiveDailyRate = baseRate * termConfig.rateMultiplier * disc.multiplier;

  if (elRateLabel) {
    const bonusText = termConfig.rateMultiplier > 1 ? ` (Thưởng x${termConfig.rateMultiplier})` : '';
    elRateLabel.textContent = `${(effectiveDailyRate * 100).toFixed(2)}%/ngày (${termConfig.label}${bonusText})`;
  }

  if (elDisciplineBadge) {
    elDisciplineBadge.innerHTML = `${disc.icon} ${disc.label} (Hệ số x${disc.multiplier})`;
  }

  // Áp dụng bậc thang (Tiered APR) và Trần ngày (Cap 8 Vàng/ngày)
  const effectiveBase = calculateEffectiveDepositBase(coins);
  const cappedDailyInterest = Math.min(DAILY_DEPOSIT_INTEREST_CAP, effectiveBase * effectiveDailyRate);
  const interest = Math.floor(cappedDailyInterest * days);
  const total = coins + interest;

  if (elInterest) elInterest.textContent = interest.toLocaleString('vi-VN');
  if (elTotal) elTotal.textContent = total.toLocaleString('vi-VN');
}

function setCalcDays(days) {
  const d = Math.max(1, parseInt(days, 10) || 7);
  const inputDays = document.getElementById('calc-deposit-days');
  if (inputDays) {
    inputDays.value = d;
  }
  // Tự động đồng bộ với gói kỳ hạn tương ứng nếu bấm 7, 14, 30 ngày
  if ([7, 14, 30].includes(d)) {
    selectDepositTerm(d);
  } else {
    selectDepositTerm(0);
  }
}

function onDepositAmountInput(val) {
  const coins = parseInt(val, 10);
  const calcCoins = document.getElementById('calc-deposit-coins');
  if (calcCoins) {
    calcCoins.value = !isNaN(coins) && coins > 0 ? coins : 0;
  }
  updateDepositCalculator();
}

function setDepositAmount(amount) {
  const input = document.getElementById('input-deposit-amount');
  if (input) {
    input.value = amount;
    onDepositAmountInput(amount);
  }
}

function setDepositMax() {
  const input = document.getElementById('input-deposit-amount');
  const maxCoins = Math.max(0, appState.profile?.coins || 0);
  if (input) {
    input.value = maxCoins;
    onDepositAmountInput(maxCoins);
  }
}

function updateBorrowCalculator() {
  const inputAmount = document.getElementById('input-borrow-amount');
  const elRateLabel = document.getElementById('calc-borrow-rate-label');
  const elDaily = document.getElementById('calc-borrow-daily-interest');
  const elTotal = document.getElementById('calc-borrow-total-debt');
  const elTotalLabel = document.getElementById('calc-borrow-total-label');

  const amount = Math.max(0, parseInt(inputAmount?.value, 10) || 0);
  const rates = currentBankPool?.borrowRate !== undefined ? currentBankPool : calculateLocalBankRates(currentBankPool);
  const baseBorrowRate = bankNegotiatedTerms?.borrowRate ?? (rates.borrowRate || 0.05);

  const termDays = [3, 7, 14, 30].includes(Number(selectedBorrowTerm)) ? Number(selectedBorrowTerm) : 7;
  const termConfig = LOAN_TERMS[termDays] || LOAN_TERMS[7];
  const borrowRate = Number((baseBorrowRate * termConfig.rateMultiplier).toFixed(4));

  if (elRateLabel) {
    const isNegotiated = Boolean(bankNegotiatedTerms?.borrowRate);
    elRateLabel.textContent = `${(borrowRate * 100).toFixed(1)}%/ngày${isNegotiated ? ' (Ưu Đãi AI)' : ''}`;
  }

  if (elTotalLabel) {
    elTotalLabel.textContent = `Tổng hoàn trả sau ${termDays} ngày:`;
  }

  const initialDaily = amount > 0 ? Math.ceil(amount * borrowRate) : 0;

  // Tính lũy kế theo kỳ hạn vay theo công thức lãi vay hàng ngày của game
  let simDebt = amount;
  for (let d = 0; d < termDays; d++) {
    simDebt += Math.ceil(simDebt * borrowRate);
  }
  const totalInterest = simDebt - amount;

  if (elDaily) {
    elDaily.innerHTML = `+${initialDaily.toLocaleString('vi-VN')} ${COIN_ICON_HTML}/ngày`;
  }
  if (elTotal) {
    if (amount > 0) {
      elTotal.innerHTML = `${simDebt.toLocaleString('vi-VN')} ${COIN_ICON_HTML} <span class="text-[10px] text-slate-400 font-normal">(+${totalInterest.toLocaleString('vi-VN')} lãi)</span>`;
    } else {
      elTotal.innerHTML = `0 ${COIN_ICON_HTML}`;
    }
  }
}

function setBorrowAmount(amount) {
  const input = document.getElementById('input-borrow-amount');
  if (input) {
    input.value = amount;
    updateBorrowCalculator();
  }
}

function setBorrowMax() {
  const input = document.getElementById('input-borrow-amount');
  const deductPct = parseInt(document.getElementById('input-deduct-percent')?.value, 10) || 50;
  const standardLimit = calculateLocalCreditLimit(appState.profile, deductPct / 100);
  const effectiveLimit = bankNegotiatedTerms?.creditLimit || standardLimit;
  if (input) {
    input.value = effectiveLimit;
    updateBorrowCalculator();
  }
}

let isBankActionPending = false;

async function executeBankDeposit() {
  if (isBankActionPending) return;
  isBankActionPending = true;
  const input = document.getElementById('input-deposit-amount');
  try {
    const amount = parseInt(input?.value, 10);
    if (!amount || amount <= 0) {
      showToast('Vui lòng nhập số Vàng muốn gửi hợp lệ (> 0)!', 'error');
      return;
    }
    if (amount > (appState.profile?.coins || 0)) {
      showToast(`Số dư không đủ! Bạn chỉ có ${appState.profile?.coins || 0} Vàng trong ví.`, 'error');
      return;
    }

    const termConfig = BANK_TERMS[selectedDepositTerm] || BANK_TERMS[0];
    const isTerm = selectedDepositTerm > 0;

    const ok = await confirmAction({
      title: `Gửi Tiết Kiệm ${termConfig.label}?`,
      message: `Bạn có chắc muốn gửi ${amount} Vàng vào gói ${termConfig.label} để sinh lời mỗi ngày?`,
      detail: `💰 Vàng trong ví: ${appState.profile.coins} ➔ Còn lại: ${appState.profile.coins - amount}\n${isTerm ? `⏳ Kỳ hạn: ${selectedDepositTerm} ngày (Rút trước hạn mất toàn bộ lãi tích lũy).` : '🍃 Kỳ hạn: Linh hoạt (Rút bất kỳ lúc nào, bảo toàn gốc & lãi).'}\n🛡️ Vốn được bảo lãnh 100% từ Kho Bạc Hệ Thống.`,
      confirmText: 'Gửi Ngay 📥',
      cancelText: 'Hủy',
      icon: termConfig.icon,
      btnColor: 'emerald'
    });
    if (!ok) return;

    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    if (!token) {
      showToast('Vui lòng đăng nhập tài khoản Google để gửi tiết kiệm và bảo toàn tài sản!', 'warning');
      return;
    }
    let serverSuccess = false;

    if (token) {
      try {
        const res = await fetch('/api/sync?action=bank_deposit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount, termDays: selectedDepositTerm })
        });
        if (res.ok) {
          const data = await res.json();
          appState.profile.coins = data.coins;
          appState.profile.bank = data.userBank;
          currentBankPool = data.pool;
        if (Array.isArray(data.ledger)) {
          appState.ledger = data.ledger;
        }
          serverSuccess = true;
          showToast(data.message || `Đã gửi ${amount} Vàng vào sổ tiết kiệm (${termConfig.label})!`, 'success');
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Giao dịch thất bại trên máy chủ!', 'error');
          return;
        }
      } catch (e) {
        console.warn('Lỗi kết nối khi gửi tiết kiệm, thực hiện lưu cục bộ:', e);
      }
    }

    if (!serverSuccess) {
      ensureUserBankProfile();
      const now = Date.now();
      const maturityAt = selectedDepositTerm > 0 ? (now + selectedDepositTerm * 24 * 60 * 60 * 1000) : 0;

      if (!Array.isArray(appState.profile.bank.deposits)) {
        appState.profile.bank.deposits = [];
      }

      // Hợp nhất vào sổ linh hoạt có sẵn nếu gửi linh hoạt (termDays === 0)
      if (selectedDepositTerm === 0) {
        const existingFlexible = appState.profile.bank.deposits.find(d => Number(d.termDays) === 0);
        if (existingFlexible) {
          existingFlexible.amount = (parseInt(existingFlexible.amount, 10) || 0) + amount;
          existingFlexible.status = 'active';
        } else {
          appState.profile.bank.deposits.push({
            id: `dep_${now}_${Math.random().toString(36).substring(2, 7)}`,
            amount: amount,
            termDays: 0,
            interest: 0,
            createdAt: now,
            lastAccruedAt: now,
            maturityAt: 0,
            status: 'active'
          });
        }
      } else {
        const newDeposit = {
          id: `dep_${now}_${Math.random().toString(36).substring(2, 7)}`,
          amount: amount,
          termDays: selectedDepositTerm,
          interest: 0,
          createdAt: now,
          lastAccruedAt: now,
          maturityAt,
          status: 'active'
        };
        appState.profile.bank.deposits.push(newDeposit);
      }
      normalizeBankDeposits(appState.profile.bank, now);

      appState.profile.coins -= amount;
      currentBankPool.poolGold = (currentBankPool.poolGold || 0) + amount;
      currentBankPool.totalDeposited = (currentBankPool.totalDeposited || 0) + amount;

      addLedgerEntry({
        id: 'bank_dep_' + now,
        type: 'spend',
        category: 'bank_deposit',
        amount: amount,
        title: `Gửi tiết kiệm ${termConfig.label}`,
        description: `🏦 Đã gửi ${amount} Vàng vào Sổ tiết kiệm ${termConfig.label} (Chế độ cục bộ).`,
        timestamp: now
      });
      showToast(`Đã gửi ${amount} Vàng vào sổ tiết kiệm (${termConfig.label})!`, 'success');
    }

    sfx.playCoin();
    if (input) input.value = '';
    triggerSave(true);
    renderHeader();
    renderLedger();
    loadBankState();
  } finally {
    isBankActionPending = false;
  }
}

function getBankAvailableFunds(userBank, now = Date.now()) {
  normalizeBankDeposits(userBank, now);
  const deposits = userBank?.deposits || [];
  let safeDeposited = 0;
  let safeInterest = 0;
  let lockedDeposited = 0;
  let lockedInterest = 0;

  for (const dep of deposits) {
    const isTerm = dep.termDays > 0;
    const isMatured = isTerm && (dep.status === 'matured' || now >= dep.maturityAt || (dep.maturityAt - now) <= 5000);
    if (!isTerm || isMatured) {
      safeDeposited += (parseInt(dep.amount, 10) || 0);
      safeInterest += (parseInt(dep.interest, 10) || 0);
    } else {
      lockedDeposited += (parseInt(dep.amount, 10) || 0);
      lockedInterest += (parseInt(dep.interest, 10) || 0);
    }
  }

  return {
    safeDeposited,
    safeInterest,
    safeTotal: safeDeposited + safeInterest,
    lockedDeposited,
    lockedInterest,
    lockedTotal: lockedDeposited + lockedInterest,
    totalDeposited: safeDeposited + lockedDeposited,
    totalInterest: safeInterest + lockedInterest
  };
}

function openBankWithdrawModal() {
  ensureUserBankProfile();
  const bank = appState.profile.bank || {};
  const funds = getBankAvailableFunds(bank);

  if (funds.safeTotal <= 0) {
    if (funds.lockedTotal > 0) {
      showToast('Bạn chỉ có sổ tiết kiệm kỳ hạn chưa đáo hạn! Vui lòng bấm "Rút Sớm" trên từng sổ nếu muốn tất toán trước hạn.', 'warning');
    } else {
      showToast('Bạn không có Vàng gửi tiết kiệm hoặc tiền lãi để rút!', 'info');
    }
    return;
  }

  const elDeposited = document.getElementById('withdraw-modal-deposited');
  const elInterest = document.getElementById('withdraw-modal-interest');
  const elTotal = document.getElementById('withdraw-modal-total');
  const inputAmt = document.getElementById('input-withdraw-amount');

  if (elDeposited) elDeposited.textContent = funds.safeDeposited.toLocaleString('vi-VN');
  if (elInterest) elInterest.textContent = funds.safeInterest.toLocaleString('vi-VN');
  if (elTotal) elTotal.textContent = funds.safeTotal.toLocaleString('vi-VN');
  if (inputAmt) {
    inputAmt.max = funds.safeTotal;
    inputAmt.value = '';
  }

  onWithdrawAmountInput(0);
  openModal('modal-bank-withdraw');
}
window.openBankWithdrawModal = openBankWithdrawModal;

function onWithdrawAmountInput(val) {
  ensureUserBankProfile();
  const bank = appState.profile.bank || {};
  const funds = getBankAvailableFunds(bank);
  const deposited = funds.safeDeposited;
  const interest = funds.safeInterest;
  const totalAvailable = funds.safeTotal;

  let amount = parseInt(val, 10);
  if (isNaN(amount) || amount < 0) amount = 0;

  const withdrawAmt = Math.min(totalAvailable, amount);

  // Phân tách thông minh: Ưu tiên rút hết lãi trước, vượt quá mới trừ vào gốc
  let interestWithdrawn = 0;
  let principalWithdrawn = 0;
  if (withdrawAmt >= totalAvailable) {
    interestWithdrawn = interest;
    principalWithdrawn = deposited;
  } else if (withdrawAmt <= interest) {
    interestWithdrawn = withdrawAmt;
    principalWithdrawn = 0;
  } else {
    interestWithdrawn = interest;
    principalWithdrawn = withdrawAmt - interest;
  }

  const remainingPrincipal = Math.max(0, deposited - principalWithdrawn);

  const elAllocInterest = document.getElementById('withdraw-alloc-interest');
  const elAllocPrincipal = document.getElementById('withdraw-alloc-principal');
  const elAllocTotal = document.getElementById('withdraw-alloc-total');
  const elRemaining = document.getElementById('withdraw-remaining-principal');
  const elNote = document.getElementById('withdraw-explanation-note');

  if (elAllocInterest) elAllocInterest.textContent = `+${interestWithdrawn.toLocaleString('vi-VN')} Vàng`;
  if (elAllocPrincipal) elAllocPrincipal.textContent = `${principalWithdrawn.toLocaleString('vi-VN')} Vàng`;
  if (elAllocTotal) elAllocTotal.textContent = `${withdrawAmt.toLocaleString('vi-VN')} Vàng`;
  if (elRemaining) elRemaining.textContent = remainingPrincipal.toLocaleString('vi-VN');

  if (elNote) {
    const lockedMsg = funds.lockedTotal > 0
      ? `<br><span class="text-[10px] text-amber-500 font-medium">🔒 Lưu ý: Bạn còn ${funds.lockedDeposited.toLocaleString('vi-VN')} Vàng gốc (+${funds.lockedInterest.toLocaleString('vi-VN')} lãi) trong sổ kỳ hạn đang khóa sinh lời.</span>`
      : '';
    if (amount <= 0) {
      elNote.innerHTML = `💡 <strong>Hướng dẫn:</strong> Nhập số Vàng bạn muốn rút hoặc nhấn các nút chọn nhanh bên trên để xem bảng phân bổ chi tiết.${lockedMsg}`;
    } else if (amount > totalAvailable) {
      elNote.innerHTML = `<span class="text-rose-500 font-bold">⚠️ Chú ý:</span> Số Vàng bạn nhập (${amount}) vượt quá tổng số dư khả dụng (${totalAvailable} Vàng)! Tối đa có thể rút là ${totalAvailable} Vàng.${lockedMsg}`;
    } else if (principalWithdrawn === 0) {
      elNote.innerHTML = `💡 <strong>Ưu đãi bảo toàn vốn:</strong> Bạn đang rút <strong class="text-emerald-500 font-bold">${interestWithdrawn} Vàng</strong> từ Tiền Lãi tích lũy. Toàn bộ <strong class="text-amber-400 font-bold">${remainingPrincipal} Vàng</strong> Vốn Gốc được bảo toàn 100% để tiếp tục sinh lời mỗi ngày!${lockedMsg}`;
    } else {
      elNote.innerHTML = `💡 <strong>Phân bổ thông minh:</strong> Hệ thống rút hết <strong class="text-emerald-500 font-bold">${interestWithdrawn} Vàng</strong> tiền lãi và trích thêm <strong class="text-slate-200 font-bold">${principalWithdrawn} Vàng</strong> từ vốn gốc. ${remainingPrincipal > 0 ? `Phần gốc còn lại <strong class="text-amber-400 font-bold">${remainingPrincipal} Vàng</strong> vẫn tiếp tục sinh lãi!` : 'Bạn đã chọn tất toán toàn bộ gốc và lãi khả dụng.'}${lockedMsg}`;
    }
  }
}
window.onWithdrawAmountInput = onWithdrawAmountInput;

function setWithdrawAmountPreset(preset) {
  ensureUserBankProfile();
  const bank = appState.profile.bank || {};
  const funds = getBankAvailableFunds(bank);
  const totalAvailable = funds.safeTotal;

  if (totalAvailable <= 0) return;

  let targetAmt = 0;
  if (preset === 'interest') {
    if (funds.safeInterest <= 0) {
      showToast('Hiện tại bạn chưa có tiền lãi tích lũy khả dụng để rút!', 'info');
      return;
    }
    targetAmt = funds.safeInterest;
  } else if (preset === 'all') {
    targetAmt = totalAvailable;
  } else if (typeof preset === 'number') {
    targetAmt = Math.max(1, Math.round(totalAvailable * preset));
  }

  const input = document.getElementById('input-withdraw-amount');
  if (input) {
    input.value = targetAmt;
    onWithdrawAmountInput(targetAmt);
  }
}
window.setWithdrawAmountPreset = setWithdrawAmountPreset;

function confirmAndExecuteWithdraw() {
  const input = document.getElementById('input-withdraw-amount');
  const amount = parseInt(input?.value, 10);
  ensureUserBankProfile();
  const bank = appState.profile.bank || {};
  const funds = getBankAvailableFunds(bank);
  const totalAvailable = funds.safeTotal;

  if (!amount || amount <= 0) {
    showToast('Vui lòng nhập số Vàng muốn rút hợp lệ (> 0)!', 'error');
    return;
  }
  if (amount > totalAvailable) {
    showToast(`Số Vàng muốn rút (${amount}) vượt quá số dư khả dụng (${totalAvailable} Vàng)!`, 'error');
    return;
  }

  const modal = document.getElementById('modal-bank-withdraw');
  if (modal) modal.classList.add('hidden');

  executeBankWithdraw(amount);
}
window.confirmAndExecuteWithdraw = confirmAndExecuteWithdraw;

function renderBankDepositsList(userBank) {
  const container = document.getElementById('bank-deposits-list');
  if (!container) return;

  normalizeBankDeposits(userBank);
  const deposits = userBank?.deposits || [];

  if (deposits.length === 0) {
    container.innerHTML = `
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center">
        <span class="text-xl block mb-1">🌱</span>
        <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Chưa có sổ tiết kiệm nào</span>
      </div>
    `;
    return;
  }

  const now = Date.now();
  let html = '<div class="space-y-2">';

  for (const dep of deposits) {
    const termConfig = BANK_TERMS[dep.termDays] || BANK_TERMS[0];
    const isTerm = dep.termDays > 0;
    const isMatured = isTerm && (dep.status === 'matured' || now >= dep.maturityAt || (dep.maturityAt - now) <= 5000);
    const msLeft = isTerm ? Math.max(0, dep.maturityAt - now) : 0;

    let timeLeftStr = '';
    if (msLeft > 0 && !isMatured) {
      const days = Math.floor(msLeft / 86400000);
      const hours = Math.floor((msLeft % 86400000) / 3600000);
      const minutes = Math.floor((msLeft % 3600000) / 60000);
      if (days >= 1) {
        timeLeftStr = `Còn ${days} ngày ${hours > 0 ? `${hours}h` : ''}`;
      } else if (hours >= 1) {
        timeLeftStr = `Còn ${hours} giờ ${minutes}p`;
      } else {
        timeLeftStr = `Còn ${Math.max(1, minutes)} phút`;
      }
    }

    let statusBadge = '';
    if (!isTerm) {
      statusBadge = '<span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/30">🍃 Linh Hoạt</span>';
    } else if (isMatured) {
      statusBadge = '<span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30 animate-pulse">🎉 Đã Đáo Hạn</span>';
    } else {
      statusBadge = `<span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">⏳ ${timeLeftStr}</span>`;
    }

    const actionBtnText = (!isTerm || isMatured) ? 'Tất Toán 📤' : 'Rút Sớm ⚠️';
    const actionBtnClass = (!isTerm || isMatured)
      ? 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shadow-xs active:scale-95'
      : 'px-2 py-1 rounded-lg text-[10px] font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition cursor-pointer';

    html += `
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2.5 hover:border-emerald-500/40 transition">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="text-xl shrink-0 p-1.5 rounded-lg bg-emerald-500/10">${termConfig.icon}</span>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-bold text-xs text-slate-800 dark:text-slate-200">${termConfig.label}</span>
              ${statusBadge}
            </div>
            <div class="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <span>Gốc: <strong class="text-slate-700 dark:text-slate-300 font-mono">${(dep.amount || 0).toLocaleString('vi-VN')}</strong></span>
              <span>Lãi: <strong class="text-emerald-600 dark:text-emerald-400 font-mono">+${(dep.interest || 0).toLocaleString('vi-VN')}</strong></span>
            </div>
          </div>
        </div>
        <button type="button" onclick="withdrawSingleDeposit('${dep.id}')" class="${actionBtnClass} shrink-0">
          ${actionBtnText}
        </button>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}
window.renderBankDepositsList = renderBankDepositsList;

async function withdrawSingleDeposit(depositId) {
  if (isBankActionPending) return;
  ensureUserBankProfile();
  const bank = appState.profile.bank || {};
  normalizeBankDeposits(bank);
  const deposits = bank.deposits || [];
  const dep = deposits.find(d => d.id === depositId);
  if (!dep) {
    showToast('Không tìm thấy sổ tiết kiệm này!', 'error');
    return;
  }

  const now = Date.now();
  const isEarly = dep.termDays > 0 && dep.status !== 'matured' && (dep.maturityAt - now) > 5000;
  const termConfig = BANK_TERMS[dep.termDays] || BANK_TERMS[0];

  if (isEarly) {
    const msLeft = Math.max(0, dep.maturityAt - now);
    const daysLeft = Math.floor(msLeft / 86400000);
    const hoursLeft = Math.floor((msLeft % 86400000) / 3600000);
    const timeLeftNotice = daysLeft >= 1
      ? `${daysLeft} ngày ${hoursLeft > 0 ? `${hoursLeft} giờ` : ''}`
      : `${Math.max(1, Math.round(msLeft / 3600000))} giờ`;
    const ok = await confirmAction({
      title: '⚠️ Rút Sổ Tiết Kiệm Trước Hạn?',
      message: `Sổ kỳ hạn ${dep.termDays} ngày (${termConfig.label}) này chưa đến ngày đáo hạn! Còn lại ${timeLeftNotice}.`,
      detail: `❌ Phạt rút non: HỦY TOÀN BỘ +${dep.interest} Vàng tiền lãi tích lũy!\n💰 Vốn gốc nhận về ví: +${dep.amount} Vàng.\n\n💡 Bạn có chắc chắn muốn rút ngay bây giờ không?`,
      confirmText: 'Chấp Nhận Phạt & Rút Sớm ⚠️',
      cancelText: 'Giữ Lại Đợi Đáo Hạn',
      icon: '⚠️',
      btnColor: 'rose'
    });
    if (!ok) return;
    await executeBankWithdraw(dep.amount, dep.id, true, true);
  } else {
    const totalGet = dep.amount + dep.interest;
    const ok = await confirmAction({
      title: 'Tất Toán Sổ Tiết Kiệm?',
      message: `Tất toán sổ ${termConfig.label} để nhận trọn vẹn cả gốc và lãi về ví?`,
      detail: `💰 Nhận về ví: +${totalGet} Vàng (${dep.amount} Vàng gốc + ${dep.interest} Vàng lãi).\n🛡️ Vốn và lãi đã hoàn thành kỳ hạn an toàn 100%!`,
      confirmText: 'Tất Toán Về Ví 📤',
      cancelText: 'Đóng',
      icon: termConfig.icon,
      btnColor: 'emerald'
    });
    if (!ok) return;
    await executeBankWithdraw(totalGet, dep.id, false, true);
  }
}
window.withdrawSingleDeposit = withdrawSingleDeposit;

async function executeBankWithdraw() {
  if (isBankActionPending) return;
  isBankActionPending = true;
  try {
    const reqAmt = arguments[0] !== undefined ? arguments[0] : 'all';
    const depositId = arguments[1] || null;
    const confirmEarly = Boolean(arguments[2]);
    const skipConfirm = Boolean(arguments[3]);

    ensureUserBankProfile();
    const bank = appState.profile.bank || {};
    normalizeBankDeposits(bank);
    const deposits = bank.deposits || [];

    let withdrawAmt = 0;
    let principalWithdrawn = 0;
    let interestWithdrawn = 0;
    let penaltyNotice = '';

    if (depositId) {
      const dep = deposits.find(d => d.id === depositId);
      if (!dep) {
        showToast('Không tìm thấy sổ tiết kiệm này!', 'error');
        return;
      }
      const now = Date.now();
      const isEarly = dep.termDays > 0 && dep.status !== 'matured' && (dep.maturityAt - now) > 5000;

      if (isEarly) {
        principalWithdrawn = dep.amount;
        interestWithdrawn = 0;
        withdrawAmt = principalWithdrawn;
        penaltyNotice = ` (Phạt tất toán sớm gói ${dep.termDays} ngày: Hủy ${dep.interest} Vàng lãi)`;
      } else {
        principalWithdrawn = dep.amount;
        interestWithdrawn = dep.interest;
        withdrawAmt = principalWithdrawn + interestWithdrawn;
      }
    } else {
      // Rút nhanh từ các sổ an toàn (Linh hoạt & Đã đáo hạn)
      const now = Date.now();
      const safeDeposits = deposits.filter(d => d.termDays === 0 || d.status === 'matured' || now >= d.maturityAt || (d.maturityAt - now) <= 5000);
      safeDeposits.sort((a, b) => (a.termDays || 0) - (b.termDays || 0));
      const safeTotalAvailable = safeDeposits.reduce((sum, d) => sum + (d.amount || 0) + (d.interest || 0), 0);

      if (safeTotalAvailable <= 0) {
        if (deposits.some(d => d.termDays > 0 && d.status !== 'matured' && (d.maturityAt - now) > 5000)) {
          showToast('Bạn chỉ có sổ kỳ hạn chưa đáo hạn. Vui lòng bấm "Rút Sớm" trên từng sổ nếu muốn tất toán trước hạn!', 'warning');
        } else {
          showToast('Bạn không có Vàng gửi hoặc tiền lãi khả dụng để rút!', 'info');
        }
        return;
      }

      withdrawAmt = (reqAmt === 'all' || !reqAmt)
        ? safeTotalAvailable
        : Math.min(safeTotalAvailable, Math.max(1, parseInt(reqAmt, 10) || safeTotalAvailable));

      let remaining = withdrawAmt;
      for (const dep of safeDeposits) {
        if (remaining <= 0) break;
        if (dep.interest > 0) {
          const draw = Math.min(dep.interest, remaining);
          interestWithdrawn += draw;
          remaining -= draw;
        }
      }
      for (const dep of safeDeposits) {
        if (remaining <= 0) break;
        if (dep.amount > 0) {
          const draw = Math.min(dep.amount, remaining);
          principalWithdrawn += draw;
          remaining -= draw;
        }
      }

      if (!skipConfirm) {
        const isFull = withdrawAmt >= safeTotalAvailable;
        const ok = await confirmAction({
          title: isFull ? 'Rút Toàn Bộ Tiết Kiệm Khả Dụng?' : 'Rút Một Phần Tiết Kiệm?',
          message: isFull
            ? `Rút toàn bộ ${safeTotalAvailable} Vàng (${principalWithdrawn} Vàng gốc + ${interestWithdrawn} Vàng lãi) về ví?`
            : `Rút ${withdrawAmt} Vàng (${principalWithdrawn} gốc + ${interestWithdrawn} lãi) về ví?`,
          detail: `💰 Số dư ví: ${appState.profile.coins} ➔ ${appState.profile.coins + withdrawAmt} Vàng.\n🛡️ Các sổ kỳ hạn chưa đáo hạn (nếu có) vẫn được bảo toàn tiếp tục sinh lời.`,
          confirmText: isFull ? 'Rút Toàn Bộ 📤' : 'Rút Về Ví 📤',
          cancelText: 'Giữ Lại Sinh Lời',
          icon: '📤',
          btnColor: 'emerald'
        });
        if (!ok) return;
      }
    }

    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    if (!token) {
      showToast('Vui lòng đăng nhập tài khoản Google để rút tiền tiết kiệm!', 'warning');
      return;
    }
    let serverSuccess = false;

    if (token) {
      try {
        const res = await fetch('/api/sync?action=bank_withdraw', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(depositId ? { depositId, confirmEarly } : { amount: withdrawAmt })
        });
        if (res.ok) {
          const data = await res.json();
          appState.profile.coins = data.coins;
          appState.profile.bank = data.userBank;
          if (data.totalCoinsEarned !== undefined) {
            appState.profile.totalCoinsEarned = data.totalCoinsEarned;
          } else {
            appState.profile.totalCoinsEarned += interestWithdrawn;
          }
          currentBankPool = data.pool;
          if (Array.isArray(data.ledger)) {
            appState.ledger = data.ledger;
          }
          serverSuccess = true;
          showToast(data.message || `Đã rút thành công ${withdrawAmt} Vàng!`, 'gold');
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Rút tiền thất bại trên máy chủ!', 'error');
          return;
        }
      } catch (e) {
        console.warn('Lỗi kết nối khi rút tiết kiệm, thực hiện lưu cục bộ:', e);
      }
    }

    if (!serverSuccess) {
      let bailoutInjected = 0;
      if (currentBankPool.poolGold < withdrawAmt) {
        bailoutInjected = withdrawAmt - currentBankPool.poolGold;
        currentBankPool.bailoutDebt = (currentBankPool.bailoutDebt || 0) + bailoutInjected;
        currentBankPool.poolGold += bailoutInjected;
      }
      currentBankPool.poolGold = Math.max(0, currentBankPool.poolGold - withdrawAmt);
      currentBankPool.totalDeposited = Math.max(0, (currentBankPool.totalDeposited || 0) - principalWithdrawn);

      if (depositId) {
        const depIdx = bank.deposits.findIndex(d => d.id === depositId);
        if (depIdx !== -1) bank.deposits.splice(depIdx, 1);
      } else {
        const now = Date.now();
        const safeDeposits = bank.deposits.filter(d => d.termDays === 0 || d.status === 'matured' || now >= d.maturityAt || (d.maturityAt - now) <= 5000);
        safeDeposits.sort((a, b) => (a.termDays || 0) - (b.termDays || 0));
        let rem = withdrawAmt;
        for (const dep of safeDeposits) {
          if (rem <= 0) break;
          const drawInt = Math.min(dep.interest, rem);
          dep.interest -= drawInt;
          rem -= drawInt;
        }
        for (const dep of safeDeposits) {
          if (rem <= 0) break;
          const drawAmt = Math.min(dep.amount, rem);
          dep.amount -= drawAmt;
          rem -= drawAmt;
        }
        bank.deposits = bank.deposits.filter(d => d.amount > 0 || d.interest > 0);
      }

      normalizeBankDeposits(bank);
      appState.profile.coins += withdrawAmt;
      appState.profile.totalCoinsEarned += interestWithdrawn;

      const bailoutNotice = bailoutInjected > 0 ? ` (Bảo lãnh 100% từ Kho Bạc Hệ Thống: Cứu trợ ${bailoutInjected} Vàng)` : '';
      addLedgerEntry({
        id: 'bank_wit_' + Date.now(),
        type: 'earn',
        category: 'bank_withdraw',
        amount: withdrawAmt,
        title: 'Rút tiền gửi Ngân Hàng',
        description: `🏦 Đã rút ${withdrawAmt} Vàng (${principalWithdrawn} gốc + ${interestWithdrawn} lãi) từ Ngân Hàng.${penaltyNotice}${bailoutNotice}`,
        timestamp: Date.now()
      });
      showToast(`Đã rút thành công ${withdrawAmt} Vàng!${bailoutInjected > 0 ? ' Kho Bạc đã bảo lãnh 100% thanh khoản!' : ''}`, 'gold');
    }

    sfx.playCoin();
    triggerSave(true);
    renderHeader();
    renderLedger();
    loadBankState();
  } finally {
    isBankActionPending = false;
  }
}

function openCreditLimitModal() {
  const profile = appState.profile || {};
  const inputDeduct = document.getElementById('input-deduct-percent');
  const deductVal = parseInt(inputDeduct?.value, 10) || (profile.bank?.loan?.autoDeductPercent ? Math.round(profile.bank.loan.autoDeductPercent * 100) : 50);
  const autoDeduct = deductVal / 100;

  const level = Math.max(1, parseInt(profile.level, 10) || 1);
  const streak = Math.max(0, parseInt(profile.streak, 10) || 0);
  const totalEarned = Math.max(20, parseInt(profile.totalCoinsEarned, 10) || 20);

  const levelPoints = level * 25;
  const streakPoints = streak * 5;
  const earnedPoints = Math.floor(totalEarned * 0.1);

  const rawBase = levelPoints + streakPoints + earnedPoints;
  const baseLimit = Math.min(400, rawBase);

  const clampedRate = Math.min(0.80, Math.max(0.20, autoDeduct));
  const kDeduct = 0.7 + ((Math.max(0.30, clampedRate) - 0.30) / 0.50) * 0.8;
  const totalLimit = Math.max(20, Math.floor(baseLimit * kDeduct));

  const elTotal = document.getElementById('modal-credit-limit-total');
  const elKDeduct = document.getElementById('modal-credit-limit-kdeduct');
  const elLevel = document.getElementById('modal-credit-calc-level');
  const elLevelVal = document.getElementById('modal-credit-calc-level-val');
  const elStreak = document.getElementById('modal-credit-calc-streak');
  const elStreakVal = document.getElementById('modal-credit-calc-streak-val');
  const elEarned = document.getElementById('modal-credit-calc-earned');
  const elEarnedVal = document.getElementById('modal-credit-calc-earned-val');
  const elBase = document.getElementById('modal-credit-calc-base');
  const elDeductRate = document.getElementById('modal-credit-calc-deduct-rate');

  if (elTotal) elTotal.innerHTML = `${totalLimit} ${COIN_ICON_HTML}`;
  if (elKDeduct) elKDeduct.textContent = `x${kDeduct.toFixed(2)}`;
  if (elLevel) elLevel.textContent = `LV. ${level}`;
  if (elLevelVal) elLevelVal.textContent = `+${levelPoints} Vàng`;
  if (elStreak) elStreak.textContent = `${streak} ngày`;
  if (elStreakVal) elStreakVal.textContent = `+${streakPoints} Vàng`;
  if (elEarned) elEarned.textContent = (profile.totalCoinsEarned || 0).toLocaleString('vi-VN');
  if (elEarnedVal) elEarnedVal.textContent = `+${earnedPoints} Vàng`;
  if (elBase) elBase.textContent = `${baseLimit} Vàng${rawBase > 400 ? ' (Đạt trần 400)' : ''}`;
  if (elDeductRate) elDeductRate.textContent = `${deductVal}% thưởng nhiệm vụ`;

  if (typeof sfx !== 'undefined' && sfx.playClick) {
    sfx.playClick();
  }
  const modal = document.getElementById('modal-credit-limit-info');
  if (modal) modal.classList.remove('hidden');
}
window.openCreditLimitModal = openCreditLimitModal;

function openBankRulesModal(targetSectionId) {
  if (typeof sfx !== 'undefined' && sfx.playClick) {
    sfx.playClick();
  }
  const modal = document.getElementById('modal-bank-rules-info');
  if (modal) {
    modal.classList.remove('hidden');
    if (targetSectionId) {
      setTimeout(() => {
        const sec = document.getElementById(targetSectionId);
        if (sec) {
          sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          sec.classList.add('ring-2', 'ring-emerald-500/60');
          setTimeout(() => sec.classList.remove('ring-2', 'ring-emerald-500/60'), 1500);
        }
      }, 50);
    }
  }
}
window.openBankRulesModal = openBankRulesModal;

function onDeductPercentChange(val) {
  const numVal = parseInt(val, 10) || 50;
  const label = document.getElementById('deduct-percent-label');
  if (label) label.textContent = `${numVal}%`;

  const standardLimit = calculateLocalCreditLimit(appState.profile, numVal / 100);
  const isNegotiated = Boolean(bankNegotiatedTerms && bankNegotiatedTerms.creditLimit);
  const finalLimit = isNegotiated
    ? Math.max(bankNegotiatedTerms.creditLimit, standardLimit)
    : standardLimit;

  const badge = document.getElementById('bank-credit-limit-badge');
  if (badge) {
    if (isNegotiated) {
      badge.innerHTML = `<span>Hạn mức: ${finalLimit}</span> ${COIN_ICON_HTML} <span class="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold ml-1">Ưu đãi</span>`;
    } else {
      badge.innerHTML = `<span>Hạn mức: ${finalLimit}</span> ${COIN_ICON_HTML}`;
    }
  }

  const appraisalText = document.getElementById('bank-appraisal-text');
  if (appraisalText) {
    if (numVal >= 70) {
      appraisalText.innerHTML = `🔥 <strong>Trích ${numVal}%:</strong> Hạn mức tối đa (${finalLimit} Vàng)`;
    } else if (numVal <= 40) {
      appraisalText.innerHTML = `🌿 <strong>Trích ${numVal}%:</strong> Trả thong thả (${finalLimit} Vàng)`;
    } else {
      appraisalText.innerHTML = `💡 <strong>Trích ${numVal}%:</strong> Cân bằng lý tưởng (${finalLimit} Vàng)`;
    }
  }

  updateBorrowCalculator();
}

// ==========================================
// BANK AI LOAN ASSISTANT & NEGOTIATION
// ==========================================
let bankNegotiatedTerms = null; // { amount, borrowRate, autoDeductPercent, creditLimit, signature }
let currentBankDebateHistory = [];
let isDebatingBankLoan = false;
let bankConsultationCache = { data: null, timestamp: 0 };

function calculateUserEarningsCapacity() {
  const ledger = Array.isArray(appState.ledger) ? appState.ledger : [];
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();
  const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  let todayEarned = 0;
  let last3DaysEarned = 0;
  let last7DaysEarned = 0;
  let recentCompletedQuests = 0;

  for (const entry of ledger) {
    if (entry.type === 'earn') {
      const amt = parseInt(entry.amount, 10) || 0;
      const ts = parseInt(entry.timestamp, 10) || now;
      if (ts >= todayMs) todayEarned += amt;
      if (ts >= threeDaysAgo) last3DaysEarned += amt;
      if (ts >= sevenDaysAgo) last7DaysEarned += amt;
      if (entry.category === 'quest_reward' || (entry.title && entry.title.includes('nhiệm vụ'))) {
        recentCompletedQuests++;
      }
    }
  }

  const profile = appState.profile || {};
  const totalEarned = parseInt(profile.totalCoinsEarned, 10) || 0;
  const streak = Math.max(1, parseInt(profile.streak, 10) || 1);

  let avgDailyIncome = 0;
  if (last7DaysEarned > 0) {
    avgDailyIncome = Math.round(last7DaysEarned / 7);
  } else if (last3DaysEarned > 0) {
    avgDailyIncome = Math.round(last3DaysEarned / 3);
  } else if (totalEarned > 0) {
    avgDailyIncome = Math.max(15, Math.round(totalEarned / Math.min(30, streak)));
  } else {
    avgDailyIncome = 15;
  }

  return {
    todayEarned,
    last3DaysEarned,
    last7DaysEarned,
    avgDailyIncome: Math.max(10, avgDailyIncome),
    recentCompletedQuests
  };
}

async function loadBankLoanConsultation(forceRefresh = true) {
  const consultCard = document.getElementById('bank-ai-consult-card');
  const incomeTag = document.getElementById('bank-ai-daily-income-tag');
  const inputBorrow = document.getElementById('input-borrow-amount');
  const inputDeduct = document.getElementById('input-deduct-percent');
  const btnAnalyze = document.getElementById('btn-analyze-loan-roadmap');
  const btnText = document.getElementById('btn-analyze-loan-text');

  if (!consultCard) return;

  if (btnAnalyze) {
    btnAnalyze.disabled = true;
    btnAnalyze.classList.add('opacity-75', 'cursor-wait');
  }
  if (btnText) {
    btnText.textContent = 'Đang phân tích ví Vàng & nhiệm vụ...';
  }

  const earnings = calculateUserEarningsCapacity();
  if (incomeTag) incomeTag.textContent = `Thu nhập: ~${earnings.avgDailyIncome} Vàng/ngày`;

  if (!forceRefresh && bankConsultationCache.data && (Date.now() - bankConsultationCache.timestamp < 120000)) {
    applyBankConsultationData(bankConsultationCache.data);
    return;
  }

  const profile = appState.profile || {};
  const activeQuests = (appState.quests || []).filter(q => q.status === 'active').slice(0, 8).map(q => ({
    title: q.title,
    rewardCoins: q.rewardCoins,
    type: q.type,
    targetMinutes: q.targetMinutes,
    isRepeatable: q.isRepeatable,
    timesCompleted: q.timesCompleted
  }));

  const shopItems = (appState.shopItems || []).slice(0, 6).map(s => ({
    name: s.name,
    price: s.price,
    tier: s.tier
  }));

  const deductVal = parseInt(inputDeduct?.value, 10) || 50;
  const currentReqAmt = parseInt(inputBorrow?.value, 10) || 0;

  try {
    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    const res = await fetch('/api/ai', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        action: 'bank_consult_loan',
        payload: {
          profile,
          autoDeductPercent: deductVal / 100,
          requestedAmount: currentReqAmt,
          poolState: currentBankPool,
          quests: activeQuests,
          shopItems,
          earningsStats: earnings
        }
      })
    });

    if (res.ok) {
      const data = await res.json();
      bankConsultationCache = { data, timestamp: Date.now() };
      applyBankConsultationData(data);
      return;
    }
  } catch (err) {
    console.warn('Không thể tải tư vấn AI khoản vay từ máy chủ:', err);
  }

  // Fallback local consultation
  const creditLimit = calculateLocalCreditLimit(profile, deductVal / 100);
  const userCoins = parseInt(profile.coins, 10) || 0;
  const shouldBorrow = userCoins < 40;
  const recommendedAmount = Math.min(creditLimit, Math.max(15, Math.floor(earnings.avgDailyIncome * 2)));
  const borrowRate = 0.05;
  const autoDeduct = deductVal / 100;
  const estDays = Math.min(5, Math.max(2, Math.ceil(recommendedAmount / Math.max(5, earnings.avgDailyIncome * autoDeduct))));
  const estimatedInterest = Math.ceil(recommendedAmount * borrowRate * estDays);
  const totalDebt = recommendedAmount + estimatedInterest;

  let fallbackPlan = '';
  if (activeQuests.length > 0) {
    const q1 = activeQuests[0];
    const coinsNeeded = Math.ceil(totalDebt / autoDeduct);
    const times = Math.max(1, Math.ceil(coinsNeeded / Math.max(1, q1.rewardCoins || 10)));
    fallbackPlan = `Bạn chỉ cần hoàn thành nhiệm vụ "${q1.title}" khoảng ${times} lần trong ${estDays} ngày (thu về ~${coinsNeeded} Vàng, trích ra trả ~${totalDebt} Vàng gồm ${recommendedAmount} Vàng gốc + ${estimatedInterest} Vàng phí lãi) là sạch nợ nhẹ nhàng!`;
  } else {
    fallbackPlan = `Khoản vay ${recommendedAmount} Vàng dự kiến thêm ${estimatedInterest} Vàng phí lãi trong ${estDays} ngày (tổng ~${totalDebt} Vàng). Bạn hãy tạo 1-2 nhiệm vụ và làm đều đặn trong ${estDays} ngày, hệ thống sẽ tự động trích thưởng trả hết nhé!`;
  }

  const localData = {
    shouldBorrow,
    creditLimit,
    recommendedAmount,
    borrowRate,
    autoDeductPercent: autoDeduct,
    estimatedDaysToRepay: estDays,
    estimatedInterest,
    totalEstimatedDebt: totalDebt,
    repaymentPlan: fallbackPlan,
    advice: shouldBorrow
      ? `Bạn đang có chuỗi chăm chỉ ${profile.streak || 0} ngày. Vay ${recommendedAmount} Vàng là mức vừa vặn giúp bạn đạt mục tiêu mà không bị áp lực nợ!`
      : `Bạn đang có ${userCoins} Vàng trong ví, đủ để đổi các món quà nhỏ mà không cần vay mượn. Nếu cần món lớn hơn thì hãy vay một khoản nhỏ nhé!`,
    options: [
      {
        id: 1,
        label: `Gói an toàn: Vay ${Math.max(15, Math.floor(recommendedAmount * 0.7))} Vàng (Trích 50%)`,
        argument: `Mình chọn gói an toàn vay ${Math.max(15, Math.floor(recommendedAmount * 0.7))} Vàng với tỷ lệ trích 50%`,
        newAmount: Math.max(15, Math.floor(recommendedAmount * 0.7)),
        newBorrowRate: 0.05,
        newAutoDeductPercent: 0.50,
        newCreditLimit: creditLimit
      },
      {
        id: 2,
        label: `Gói tăng tốc: Vay ${Math.min(creditLimit, Math.floor(recommendedAmount * 1.3))} Vàng (Trích 70%)`,
        argument: `Mình chọn gói tăng tốc vay ${Math.min(creditLimit, Math.floor(recommendedAmount * 1.3))} Vàng với tỷ lệ trích 70%`,
        newAmount: Math.min(creditLimit, Math.floor(recommendedAmount * 1.3)),
        newBorrowRate: 0.05,
        newAutoDeductPercent: 0.70,
        newCreditLimit: creditLimit
      }
    ]
  };

  bankConsultationCache = { data: localData, timestamp: Date.now() };
  applyBankConsultationData(localData);
}

function applyBankConsultationData(data) {
  if (!data) return;
  const btnAnalyze = document.getElementById('btn-analyze-loan-roadmap');
  const btnText = document.getElementById('btn-analyze-loan-text');
  const hintText = document.getElementById('bank-ai-consult-hint');
  const adviceText = document.getElementById('bank-ai-advice-text');
  const roadmapBox = document.getElementById('bank-ai-roadmap-box');
  const planText = document.getElementById('bank-ai-repayment-plan');
  const estDaysEl = document.getElementById('bank-ai-est-days');
  const recommendTag = document.getElementById('bank-ai-recommend-tag');
  const inputBorrow = document.getElementById('input-borrow-amount');

  if (btnAnalyze) {
    btnAnalyze.disabled = false;
    btnAnalyze.classList.remove('opacity-75', 'cursor-wait');
  }
  if (btnText) {
    btnText.textContent = 'Phân tích lại lộ trình';
  }
  if (hintText) {
    hintText.classList.add('hidden');
  }
  if (adviceText) {
    adviceText.classList.remove('hidden');
    if (data.advice) adviceText.textContent = data.advice;
  }
  if (roadmapBox) {
    roadmapBox.classList.remove('hidden');
  }

  if (recommendTag) {
    recommendTag.classList.remove('hidden');
    if (data.shouldBorrow) {
      recommendTag.textContent = 'Nên vay vừa sức';
      recommendTag.className = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30';
    } else {
      recommendTag.textContent = 'Chưa cần vay';
      recommendTag.className = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30';
    }
  }

  if (planText && data.repaymentPlan) planText.textContent = data.repaymentPlan;
  if (estDaysEl && data.estimatedDaysToRepay) estDaysEl.textContent = `${data.estimatedDaysToRepay} ngày`;

  if (inputBorrow && (!inputBorrow.value || parseInt(inputBorrow.value, 10) === 0)) {
    if (data.recommendedAmount) inputBorrow.value = data.recommendedAmount;
  }
}

function toggleBankAiDebate() {
  const container = document.getElementById('bank-debate-container');
  const btnText = document.getElementById('btn-toggle-bank-ai-text');
  if (!container) return;

  const isHidden = container.classList.contains('hidden');
  if (isHidden) {
    container.classList.remove('hidden');
    if (btnText) btnText.textContent = 'Thu Gọn';
    initBankDebateChat();
  } else {
    container.classList.add('hidden');
    if (btnText) btnText.textContent = 'Thương Lượng';
  }
}
window.toggleBankAiDebate = toggleBankAiDebate;

function initBankDebateChat(forceReset = false) {
  const chatLogs = document.getElementById('bank-debate-chat-logs');
  if (!chatLogs) return;
  if (!forceReset && chatLogs.children.length > 0) return;

  const consultData = bankConsultationCache.data;
  const initialOptions = consultData?.options || [];
  const rates = calculateLocalBankRates(currentBankPool);
  const currentRatePct = ((rates.borrowRate || 0.05) * 100).toFixed(1);

  chatLogs.innerHTML = `
    <div class="flex justify-start items-start gap-2 message-fade-in">
      <div class="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">🤖</div>
      <div class="max-w-[90%] sm:max-w-[92%] bg-blue-50/80 dark:bg-slate-900 border border-blue-200/80 dark:border-slate-800 rounded-2xl rounded-tl-xs p-3.5 sm:p-4 text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 shadow-xs leading-relaxed space-y-2">
        <div class="font-bold text-xs sm:text-[13px] text-blue-600 dark:text-blue-400">Trợ Lý Vay Vàng AI:</div>
        <div>
          Chào bạn! Mình là Trợ Lý Vay Vàng của Ngân Hàng LevelUp. Lãi suất niêm yết hiện tại là <strong>${currentRatePct}%/ngày</strong>.
        </div>
        <div class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
          💡 Bạn có thể chọn một phương án định sẵn bên dưới, bấm vào các gợi ý nhanh hoặc đưa ra lý do (như chuỗi chăm chỉ, cam kết trả nợ sớm) để thương lượng giảm lãi suất và nâng hạn mức nhé!
        </div>
        ${initialOptions.length > 0 ? `
          <div class="mt-2 pt-2 border-t border-blue-200/70 dark:border-slate-800/80 space-y-1.5">
            <div class="text-[11px] font-bold text-blue-700 dark:text-blue-400 tracking-wide flex items-center gap-1">
              <span>💡</span><span>Phương án đề xuất sẵn cho bạn:</span>
            </div>
            <div class="flex flex-col sm:flex-row flex-wrap gap-1.5">
              ${initialOptions.map((opt, idx) => `
                <button type="button" data-bank-opt-idx="${idx}" class="bank-debate-option-btn group text-left px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-950/60 active:scale-95 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700/80 transition-all flex items-center gap-2 shadow-xs cursor-pointer">
                  <span class="w-5 h-5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-300 flex items-center justify-center text-[11px] font-black shrink-0 group-hover:scale-110 transition-transform">👉</span>
                  <span class="font-medium">${escapeHtml(opt.label || `Gói ${idx + 1}`)}</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  chatLogs.querySelectorAll('.bank-debate-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-bank-opt-idx'), 10);
      const opt = initialOptions[idx];
      if (opt) {
        chatLogs.querySelectorAll('.bank-debate-option-btn').forEach(b => {
          b.disabled = true;
          b.classList.add('opacity-50', 'pointer-events-none');
        });
        btn.classList.remove('opacity-50');
        btn.classList.add('ring-2', 'ring-blue-500', 'bg-blue-100', 'dark:bg-blue-900/40');
        sendBankDebateMessage(opt.argument || `Chốt ${opt.label || ('Gói ' + (idx + 1))}`, opt);
      }
    });
  });

  chatLogs.scrollTo({ top: 0, behavior: 'smooth' });
}

async function sendBankDebateMessage(customArg = null, selectedOption = null) {
  if (isDebatingBankLoan) return;

  const argInput = document.getElementById('input-bank-debate-arg');
  const argument = (typeof customArg === 'string' && customArg.trim())
    ? customArg.trim()
    : (argInput ? argInput.value.trim() : '');
  if (!argument) return;

  const chatLogs = document.getElementById('bank-debate-chat-logs');
  const btnSend = document.getElementById('btn-send-bank-debate');

  isDebatingBankLoan = true;
  if (argInput) {
    argInput.disabled = true;
    argInput.value = '';
  }
  if (btnSend) {
    btnSend.disabled = true;
    btnSend.innerHTML = `<span class="inline-flex gap-1 items-center"><span class="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style="animation-delay: 0ms"></span><span class="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style="animation-delay: 150ms"></span><span class="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style="animation-delay: 300ms"></span></span>`;
  }

  appendUserChatBubble(chatLogs, argument);

  const loadingBubble = createDebateLoadingBubble('loan');
  chatLogs.appendChild(loadingBubble);
  chatLogs.scrollTo({ top: chatLogs.scrollHeight, behavior: 'smooth' });

  try {
    const profile = appState.profile || {};
    const inputBorrow = document.getElementById('input-borrow-amount');
    const inputDeduct = document.getElementById('input-deduct-percent');
    const currentAmount = parseInt(inputBorrow?.value, 10) || 30;
    const currentDeduct = (parseInt(inputDeduct?.value, 10) || 50) / 100;
    const rates = calculateLocalBankRates(currentBankPool);
    const currentRate = bankNegotiatedTerms?.borrowRate ?? rates.borrowRate;
    const currentLimit = bankNegotiatedTerms?.creditLimit ?? calculateLocalCreditLimit(profile, currentDeduct);

    const activeQuests = (appState.quests || []).filter(q => q.status === 'active').slice(0, 8).map(q => ({
      title: q.title,
      rewardCoins: q.rewardCoins,
      type: q.type,
      targetMinutes: q.targetMinutes
    }));

    const shopItems = (appState.shopItems || []).slice(0, 6).map(s => ({
      name: s.name,
      price: s.price
    }));

    const earnings = calculateUserEarningsCapacity();

    const currentLoanState = {
      amount: currentAmount,
      borrowRate: currentRate,
      autoDeductPercent: currentDeduct,
      creditLimit: currentLimit
    };

    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    const data = await fetchDebateStream('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        action: 'bank_debate_loan',
        payload: {
          loan: currentLoanState,
          argument,
          history: currentBankDebateHistory,
          profile,
          poolState: currentBankPool,
          quests: activeQuests,
          shopItems,
          earningsStats: earnings,
          selectedOption,
          stream: true
        }
      })
    }, (stepData) => {
      if (loadingBubble && loadingBubble.updateStep) loadingBubble.updateStep(stepData);
    });

    if (loadingBubble && loadingBubble.cleanup) loadingBubble.cleanup();
    loadingBubble.remove();

    if (data && typeof data.reply === 'string' && (data.reply.trim().startsWith('{') || data.reply.trim().startsWith('```json'))) {
      try {
        let raw = data.reply.trim();
        if (raw.startsWith('```json')) raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
        else if (raw.startsWith('```')) raw = raw.replace(/^```\s*/i, '').replace(/```\s*$/, '');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.reply === 'string') {
          data.reply = parsed.reply;
          if ((!data.options || data.options.length === 0) && Array.isArray(parsed.options)) {
            data.options = parsed.options;
          }
        }
      } catch (_) {}
    }

    const diffTags = [];
    if (data.accepted) {
      if (data.newBorrowRate !== undefined && Number(data.newBorrowRate) > 0.30) {
        data.newBorrowRate = Number(data.newBorrowRate) / 100;
      }
      if (data.newAutoDeductPercent !== undefined && Number(data.newAutoDeductPercent) > 1.0) {
        data.newAutoDeductPercent = Number(data.newAutoDeductPercent) / 100;
      }

      if (data.newBorrowRate && Number(data.newBorrowRate) !== currentRate) {
        diffTags.push(`📉 Lãi suất: ${(currentRate * 100).toFixed(1)}% ➔ ${(Number(data.newBorrowRate) * 100).toFixed(1)}%/ngày`);
      }
      if (data.newCreditLimit && Number(data.newCreditLimit) !== currentLimit) {
        diffTags.push(`🚀 Hạn mức: ${currentLimit} ➔ ${data.newCreditLimit} Vàng`);
      }
      if (data.newAmount && Number(data.newAmount) !== currentAmount) {
        diffTags.push(`💰 Vay: ${currentAmount} ➔ ${data.newAmount} Vàng`);
      }
      if (data.newAutoDeductPercent && Number(data.newAutoDeductPercent) !== currentDeduct) {
        diffTags.push(`✂️ Trích nợ: ${Math.round(currentDeduct * 100)}% ➔ ${Math.round(Number(data.newAutoDeductPercent) * 100)}%`);
      }
    }

    appendAiChatBubble(chatLogs, {
      reply: data.reply,
      accepted: data.accepted,
      diffTags,
      botName: 'Trợ Lý Vay Vàng AI',
      botIcon: '🤖',
      options: data.options,
      mode: 'loan',
      toolsExecuted: data.toolsExecuted,
      onSelectOption: (opt) => sendBankDebateMessage(opt.argument || `Chốt phương án ${opt.id}`, opt)
    });

    currentBankDebateHistory.push({ user: argument, arbiter: data.reply });

    if (data.accepted) {
      bankNegotiatedTerms = {
        amount: data.newAmount,
        borrowRate: data.newBorrowRate,
        autoDeductPercent: data.newAutoDeductPercent,
        creditLimit: data.newCreditLimit,
        signature: data.signature
      };

      if (inputBorrow && data.newAmount) {
        inputBorrow.value = data.newAmount;
      }
      if (inputDeduct && data.newAutoDeductPercent) {
        const pct = Math.round(data.newAutoDeductPercent * 100);
        inputDeduct.value = pct;
        onDeductPercentChange(pct);
      }

      const badge = document.getElementById('bank-negotiated-badge');
      const termsSpan = document.getElementById('bank-negotiated-terms');
      if (badge && termsSpan) {
        termsSpan.textContent = `Lãi ${(data.newBorrowRate * 100).toFixed(1)}%/ngày • Hạn mức ${data.newCreditLimit} Vàng • Trích ${Math.round(data.newAutoDeductPercent * 100)}%`;
        badge.classList.remove('hidden');
      }

      const elLimitBadge = document.getElementById('bank-credit-limit-badge');
      if (elLimitBadge && data.newCreditLimit) {
        elLimitBadge.innerHTML = `<span>Hạn mức: ${data.newCreditLimit}</span> ${COIN_ICON_HTML} <span class="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1 py-0.2 rounded font-bold ml-1">Ưu đãi</span>`;
      }

      showToast('Thương lượng thành công! AI đã áp dụng điều khoản ưu đãi.', 'gold');
      if (typeof sfx !== 'undefined' && sfx.playFanfare) sfx.playFanfare();
    }
  } catch (err) {
    if (loadingBubble && loadingBubble.cleanup) loadingBubble.cleanup();
    loadingBubble.remove();
    const errRow = document.createElement('div');
    errRow.className = 'flex justify-start items-start gap-2 message-fade-in';
    errRow.innerHTML = `
      <div class="w-6 h-6 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">⚠️</div>
      <div class="max-w-[85%] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl rounded-tl-xs p-3 text-xs text-rose-700 dark:text-rose-300 shadow-xs">
        <strong>Lỗi thương lượng:</strong> ${escapeHtml(err.message || 'Không thể kết nối với AI. Vui lòng thử lại.')}
      </div>
    `;
    chatLogs.appendChild(errRow);
    chatLogs.scrollTo({ top: chatLogs.scrollHeight, behavior: 'smooth' });
    showToast('Lỗi thương lượng: ' + (err.message || 'Vui lòng thử lại'), 'error');
  } finally {
    isDebatingBankLoan = false;
    if (argInput) {
      argInput.disabled = false;
      argInput.focus();
    }
    if (btnSend) {
      btnSend.disabled = false;
      btnSend.innerHTML = `<span>Gửi</span><span class="text-[10px]">➤</span>`;
    }
  }
}
window.sendBankDebateMessage = sendBankDebateMessage;
window.loadBankLoanConsultation = loadBankLoanConsultation;

async function executeBankBorrow() {
  if (isBankActionPending) return;
  isBankActionPending = true;
  try {
    ensureUserBankProfile();
    const bank = appState.profile.bank;
    if (bank.loan && (bank.loan.debt || 0) > 0) {
      showToast('Bạn đang có khoản vay chưa thanh toán! Vui lòng trả hết nợ trước khi vay thêm.', 'error');
      return;
    }

    const inputAmount = document.getElementById('input-borrow-amount');
    const inputDeduct = document.getElementById('input-deduct-percent');
    const borrowAmt = parseInt(inputAmount?.value, 10);
    const deductPct = parseInt(inputDeduct?.value, 10) || 50;
    const autoDeduct = deductPct / 100;

    if (!borrowAmt || borrowAmt <= 0) {
      showToast('Vui lòng nhập số Vàng muốn vay hợp lệ (> 0)!', 'error');
      return;
    }

    const standardLimit = calculateLocalCreditLimit(appState.profile, autoDeduct);
    const effectiveLimit = bankNegotiatedTerms?.creditLimit || standardLimit;
    if (borrowAmt > effectiveLimit) {
      showToast(`Số Vàng vay (${borrowAmt}) vượt quá hạn mức tối đa (${effectiveLimit}) của bạn!`, 'error');
      return;
    }

    const termDays = [3, 7, 14, 30].includes(Number(selectedBorrowTerm)) ? Number(selectedBorrowTerm) : 7;
    const termConfig = LOAN_TERMS[termDays] || LOAN_TERMS[7];
    const rates = currentBankPool?.borrowRate !== undefined ? currentBankPool : calculateLocalBankRates(currentBankPool);
    const baseBorrowRate = bankNegotiatedTerms?.borrowRate ?? (rates.borrowRate || 0.05);
    const borrowRate = Number((baseBorrowRate * termConfig.rateMultiplier).toFixed(4));
    const dailyInterestEst = Math.ceil(borrowAmt * borrowRate);
    let simDebt = borrowAmt;
    for (let d = 0; d < termDays; d++) {
      simDebt += Math.ceil(simDebt * borrowRate);
    }
    const negotiatedRateText = bankNegotiatedTerms?.borrowRate
      ? ` (Ưu đãi thương lượng AI)`
      : '';

    const ok = await confirmAction({
      title: 'Xác Nhận Vay Vàng Tức Thời?',
      message: `Vay ${borrowAmt} Vàng từ Ngân Hàng Hệ Thống?`,
      detail: `⚡ Nhận ngay vào ví: +${borrowAmt} Vàng\n⏱️ Kỳ hạn vay: ${termConfig.label} (${termDays} ngày)\n📈 Lãi suất vay: ${(borrowRate * 100).toFixed(1)}%/ngày${negotiatedRateText} (~+${dailyInterestEst} Vàng/ngày)\n🧮 Tổng hoàn trả sau ${termDays} ngày: ~${simDebt} Vàng (nếu không làm nhiệm vụ trả sớm)\n✂️ Tự động trích: ${deductPct}% Vàng thưởng mỗi khi hoàn thành nhiệm vụ (miễn 100% phí phạt)\n⚠️ Sau ${termDays} ngày chưa tất toán: Tạm đóng băng Cửa Hàng để thu hồi nợ.\n💡 Phí phạt tất toán sớm: 5% nếu tự trả nợ bằng ví Vàng trước hạn (làm việc trả dần được miễn 100% phí phạt).`,
      confirmText: 'Vay Ngay ⚡',
      cancelText: 'Hủy',
      icon: '⚡',
      btnColor: 'blue'
    });
    if (!ok) return;

    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    if (!token) {
      showToast('Vui lòng đăng nhập tài khoản Google để vay Vàng và lưu trữ an toàn!', 'warning');
      return;
    }
    let serverSuccess = false;

    if (token) {
      try {
        const res = await fetch('/api/sync?action=bank_borrow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: borrowAmt,
            termDays: termDays,
            autoDeductPercent: autoDeduct,
            loanSignature: bankNegotiatedTerms?.signature,
            borrowRate: borrowRate,
            negotiatedRate: bankNegotiatedTerms?.borrowRate,
            creditLimit: bankNegotiatedTerms?.creditLimit,
            negotiatedLimit: bankNegotiatedTerms?.creditLimit
          })
        });
        if (res.ok) {
          const data = await res.json();
          appState.profile.coins = data.coins;
          appState.profile.bank.loan = data.loan;
          appState.profile.bank.isFrozen = false;
          currentBankPool = data.pool;
          if (Array.isArray(data.ledger)) {
            appState.ledger = data.ledger;
          }
          serverSuccess = true;
          showToast(data.message || `Giải ngân thành công ${borrowAmt} Vàng!`, 'success');
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Vay Vàng thất bại trên máy chủ!', 'error');
          return;
        }
      } catch (e) {
        console.warn('Lỗi kết nối khi vay Vàng, thực hiện lưu cục bộ:', e);
      }
    }

    if (!serverSuccess) {
      const rates = calculateLocalBankRates(currentBankPool);
      const finalRate = borrowRate;
      let bailoutInjected = 0;
      if (currentBankPool.poolGold < borrowAmt) {
        bailoutInjected = borrowAmt - currentBankPool.poolGold;
        currentBankPool.bailoutDebt = (currentBankPool.bailoutDebt || 0) + bailoutInjected;
        currentBankPool.poolGold += bailoutInjected;
      }
      currentBankPool.poolGold = Math.max(0, currentBankPool.poolGold - borrowAmt);
      currentBankPool.totalBorrowed = (currentBankPool.totalBorrowed || 0) + borrowAmt;

      appState.profile.coins += borrowAmt;
      appState.profile.bank.loan = {
        principal: borrowAmt,
        debt: borrowAmt,
        termDays: termDays,
        borrowRate: finalRate,
        autoDeductPercent: autoDeduct,
        borrowedAt: Date.now(),
        lastAccruedAt: Date.now(),
        isOverdue: false
      };
      appState.profile.bank.isFrozen = false;

      addLedgerEntry({
        id: 'bank_bor_' + Date.now(),
        type: 'earn',
        category: 'bank_borrow',
        amount: borrowAmt,
        title: 'Vay Vàng Ngân Hàng',
        description: `🏦 Đã vay ${borrowAmt} Vàng (Kỳ hạn: ${termConfig.label}, Lãi suất: ${(finalRate * 100).toFixed(1)}%/ngày, trích nợ: ${deductPct}% mỗi nhiệm vụ).`,
        timestamp: Date.now()
      });
      showToast(`Giải ngân thành công ${borrowAmt} Vàng!`, 'success');
    }

    bankNegotiatedTerms = null;
    const negBadge = document.getElementById('bank-negotiated-badge');
    if (negBadge) negBadge.classList.add('hidden');

    sfx.playFanfare();
    if (inputAmount) inputAmount.value = '';
    triggerSave(true);
    renderHeader();
    renderLedger();
    loadBankState();
  } finally {
    isBankActionPending = false;
  }
}

async function executeBankRepay() {
  if (isBankActionPending) return;
  isBankActionPending = true;
  try {
    ensureUserBankProfile();
    const loan = appState.profile.bank.loan;
    const currentDebt = loan?.debt || 0;
    if (!loan || currentDebt <= 0) {
      showToast('Bạn không có khoản nợ nào cần thanh toán!', 'info');
      return;
    }
    const userCoins = appState.profile.coins || 0;
    if (userCoins <= 0) {
      showToast('Ví của bạn không còn Vàng để trả nợ!', 'error');
      return;
    }

    // Lãi suất phạt tất toán sớm (5% phí trả trước hạn, tối thiểu 1 Vàng khi chưa quá hạn)
    const isOverdue = Boolean(loan.isOverdue);
    const penaltyRate = isOverdue ? 0 : 0.05;
    let payAmt = Math.min(userCoins, currentDebt);
    let penaltyFee = (!isOverdue && payAmt > 0) ? Math.max(1, Math.round(payAmt * penaltyRate)) : 0;

    if (payAmt + penaltyFee > userCoins) {
      // Điều chỉnh payAmt sao cho tổng chi (payAmt + penaltyFee) <= userCoins
      payAmt = Math.max(1, Math.floor((userCoins - (penaltyRate > 0 ? 1 : 0)) / (1 + penaltyRate)));
      penaltyFee = (!isOverdue && payAmt > 0) ? Math.max(1, Math.round(payAmt * penaltyRate)) : 0;
      while (payAmt > 0 && payAmt + penaltyFee > userCoins) {
        payAmt--;
        penaltyFee = (!isOverdue && payAmt > 0) ? Math.max(1, Math.round(payAmt * penaltyRate)) : 0;
      }
    }

    const totalDeduct = payAmt + penaltyFee;
    if (totalDeduct <= 0 || totalDeduct > userCoins) {
      showToast('Số Vàng trong ví không đủ để thanh toán nợ kèm phí phạt tất toán sớm!', 'error');
      return;
    }

    const isFullSettlement = payAmt >= currentDebt;
    const ok = await confirmAction({
      title: isFullSettlement ? 'Tất Toán Nợ Sớm?' : 'Trả Nợ Sớm?',
      message: isFullSettlement
        ? (penaltyFee > 0
            ? `Tất toán toàn bộ ${payAmt} Vàng nợ với phí phạt tất toán sớm 5% (+${penaltyFee} Vàng)?`
            : `Tất toán toàn bộ ${payAmt} Vàng nợ quá hạn?`)
        : (penaltyFee > 0
            ? `Dùng ${payAmt} Vàng trả nợ + ${penaltyFee} Vàng phí phạt tất toán sớm (5%)?`
            : `Dùng ${payAmt} Vàng trong ví để trả bớt khoản nợ?`),
      detail: `💰 Vàng trong ví: ${userCoins} ➔ ${userCoins - totalDeduct}\n💳 Số nợ thanh toán: -${payAmt} Vàng${penaltyFee > 0 ? `\n⚡ Phí phạt tất toán sớm (5%): +${penaltyFee} Vàng` : ''}\n📉 Nợ còn lại: ${Math.max(0, currentDebt - payAmt)} Vàng.${penaltyFee > 0 ? '\n\n💡 Mẹo: Bạn có thể tiếp tục hoàn thành nhiệm vụ để hệ thống tự trích nợ dần hoàn toàn miễn phí phạt (0%)!' : ''}`,
      confirmText: `Trả Nợ (${totalDeduct} 🪙)`,
      cancelText: 'Hủy',
      icon: '💳',
      btnColor: 'amber'
    });
    if (!ok) return;

    const token = appState.profile?.sessionToken || appState.profile?.googleToken || appState.profile?.token;
    if (!token) {
      showToast('Vui lòng đăng nhập tài khoản Google để trả nợ Ngân Hàng!', 'warning');
      return;
    }
    let serverSuccess = false;

    if (token) {
      try {
        const res = await fetch('/api/sync?action=bank_repay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: payAmt,
            penaltyFee
          })
        });
        if (res.ok) {
          const data = await res.json();
          appState.profile.coins = data.coins;
          appState.profile.bank.loan = data.loan;
          appState.profile.bank.isFrozen = false;
          currentBankPool = data.pool;
          if (Array.isArray(data.ledger)) {
            appState.ledger = data.ledger;
          }
          serverSuccess = true;
          showToast(data.message || `Đã thanh toán ${payAmt} Vàng nợ!`, 'success');
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Thanh toán nợ thất bại trên máy chủ!', 'error');
          return;
        }
      } catch (e) {
        console.warn('Lỗi kết nối khi thanh toán nợ, thực hiện lưu cục bộ:', e);
      }
    }

    if (!serverSuccess) {
      appState.profile.coins -= totalDeduct;

      const principal = Math.max(0, parseInt(loan.principal, 10) || 0);
      const accruedInterest = Math.max(0, (parseInt(loan.debt, 10) || 0) - principal);
      const interestPaid = Math.min(accruedInterest, payAmt);
      const principalPaid = Math.min(principal, Math.max(0, payAmt - interestPaid));

      loan.debt = Math.max(0, (parseInt(loan.debt, 10) || 0) - payAmt);
      loan.principal = Math.max(0, principal - principalPaid);
      currentBankPool.totalBorrowed = Math.max(0, (currentBankPool.totalBorrowed || 0) - principalPaid);

      // Hoàn nợ kho bạc nếu có
      let treasuryRepay = 0;
      if (currentBankPool.bailoutDebt > 0) {
        treasuryRepay = Math.min(currentBankPool.bailoutDebt, Math.floor(payAmt * 0.5) + penaltyFee);
        currentBankPool.bailoutDebt -= treasuryRepay;
      }
      const remainingPaid = totalDeduct - treasuryRepay;
      const goldToPool = Math.min(principalPaid, remainingPaid);
      currentBankPool.poolGold = (currentBankPool.poolGold || 0) + goldToPool;
      const goldToReserve = remainingPaid - goldToPool;
      if (goldToReserve > 0) {
        currentBankPool.reserveFund = (currentBankPool.reserveFund || 0) + goldToReserve;
      }

      let loanCleared = false;
      if (loan.debt <= 0) {
        loanCleared = true;
        appState.profile.bank.loan = null;
        appState.profile.bank.isFrozen = false;
        if (appState.profile.title === 'Con Nợ Quá Hạn ⚠️') {
          updateTitleByLevel();
        }
      }

      addLedgerEntry({
        id: 'bank_rep_' + Date.now(),
        type: 'spend',
        category: 'bank_repay',
        amount: totalDeduct,
        title: 'Trả nợ sớm Ngân Hàng',
        description: `🏦 Đã trả ${payAmt} Vàng nợ${penaltyFee > 0 ? ` + ${penaltyFee} Vàng phí phạt tất toán sớm (5%)` : ''}.${loanCleared ? ' Khoản nợ đã được tất toán!' : ` Nợ còn lại: ${loan.debt} Vàng.`}`,
        timestamp: Date.now()
      });
      showToast(`Đã trả thành công ${payAmt} Vàng${penaltyFee > 0 ? ` (phí phạt: ${penaltyFee} Vàng)` : ''}!${loanCleared ? ' Chúc mừng bạn đã tất toán toàn bộ nợ!' : ''}`, 'success');
    }

    sfx.playCoin();
    triggerSave(true);
    renderHeader();
    renderLedger();
    loadBankState();
  } finally {
    isBankActionPending = false;
  }
}

window.loadBankState = loadBankState;
window.renderAdminBankTelemetry = renderAdminBankTelemetry;
window.updateDepositCalculator = updateDepositCalculator;
window.setCalcDays = setCalcDays;
window.onDepositAmountInput = onDepositAmountInput;
window.setDepositAmount = setDepositAmount;
window.setDepositMax = setDepositMax;
window.executeBankDeposit = executeBankDeposit;
window.executeBankWithdraw = executeBankWithdraw;
window.openBankWithdrawModal = openBankWithdrawModal;
window.setWithdrawAmountPreset = setWithdrawAmountPreset;
window.onWithdrawAmountInput = onWithdrawAmountInput;
window.confirmAndExecuteWithdraw = confirmAndExecuteWithdraw;
window.onDeductPercentChange = onDeductPercentChange;
window.executeBankBorrow = executeBankBorrow;
window.executeBankRepay = executeBankRepay;
window.selectBorrowTerm = selectBorrowTerm;
window.updateBorrowTermButtons = updateBorrowTermButtons;
window.updateBorrowCalculator = updateBorrowCalculator;
window.setBorrowAmount = setBorrowAmount;
window.setBorrowMax = setBorrowMax;
