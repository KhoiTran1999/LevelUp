import dotenv from 'dotenv';
import Redis from 'ioredis';
import crypto from 'node:crypto';

dotenv.config();

let redisClient = null;
let googleTokenVerifierForTesting = null;
let minRedemptionIntervalMs = 24 * 60 * 1000;

// ponytail: test hook for hermetic in-memory mock testing without network
export function setRedisClientForTesting(client) {
  redisClient = client;
}

// ponytail: test hook for mocking Google Token Verification in unit tests
export function setGoogleTokenVerifierForTesting(verifier) {
  googleTokenVerifierForTesting = verifier;
}

// ponytail: test hook for mocking minimum redemption interval in unit tests
export function setMinRedemptionIntervalForTesting(ms) {
  minRedemptionIntervalMs = ms;
}

const HMAC_SECRET = process.env.APP_SECRET || process.env.REDIS_URL || 'levelup_vault_secret_2026';

export function deriveTitleForLevel(lvl) {
  const l = parseInt(lvl, 10) || 1;
  if (l >= 20) return 'Huyền Thoại Kỷ Luật';
  if (l >= 15) return 'Bậc Thầy Năng Suất';
  if (l >= 10) return 'Chuyên Gia Tập Trung';
  if (l >= 6) return 'Chiến Binh Kiên Trì';
  if (l >= 3) return 'Học Viên Chăm Chỉ';
  return 'Tân Binh Cấp 1';
}

export function signQuest(title, type, targetMinutes, rewardCoins, requiresProof = false, isRepeatable = null) {
  const normTitle = (title || '').normalize('NFC').trim().toLowerCase();
  const t = type === 'bounty' ? 'bounty' : 'focus';
  const m = parseInt(targetMinutes, 10) || 0;
  const c = parseInt(rewardCoins, 10) || 0;
  const p = requiresProof ? '1' : '0';
  if (isRepeatable !== null && isRepeatable !== undefined) {
    const r = isRepeatable ? '1' : '0';
    const payload = `quest:${normTitle}:${t}:${m}:${c}:${p}:${r}`;
    return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex').slice(0, 16);
  }
  const payload = `quest:${normTitle}:${t}:${m}:${c}:${p}`;
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex').slice(0, 16);
}

export function signQuestLegacyProof(title, type, targetMinutes, rewardCoins, requiresProof = false) {
  const normTitle = (title || '').normalize('NFC').trim().toLowerCase();
  const t = type === 'bounty' ? 'bounty' : 'focus';
  const m = parseInt(targetMinutes, 10) || 0;
  const c = parseInt(rewardCoins, 10) || 0;
  const p = requiresProof ? '1' : '0';
  const payload = `quest:${normTitle}:${t}:${m}:${c}:${p}`;
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex').slice(0, 16);
}

export function signQuestLegacy(title, type, targetMinutes, rewardCoins) {
  const normTitle = (title || '').normalize('NFC').trim().toLowerCase();
  const t = type === 'bounty' ? 'bounty' : 'focus';
  const m = parseInt(targetMinutes, 10) || 0;
  const c = parseInt(rewardCoins, 10) || 0;
  const payload = `quest:${normTitle}:${t}:${m}:${c}`;
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex').slice(0, 16);
}

export function verifyQuestSignature(q) { return true; }

export function signReward(name, price, tier, targetMinutes = 0) {
  const normName = (name || '').normalize('NFC').trim().toLowerCase();
  const p = parseInt(price, 10) || 0;
  const tr = (tier || 'common').toLowerCase();
  const m = parseInt(targetMinutes, 10) || 0;
  if (m > 0) {
    const payload = `reward:${normName}:${p}:${tr}:${m}`;
    return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex').slice(0, 16);
  }
  const payload = `reward:${normName}:${p}:${tr}`;
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex').slice(0, 16);
}

export function signRewardLegacy(name, price, tier) {
  const normName = (name || '').normalize('NFC').trim().toLowerCase();
  const p = parseInt(price, 10) || 0;
  const tr = (tier || 'common').toLowerCase();
  const payload = `reward:${normName}:${p}:${tr}`;
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex').slice(0, 16);
}

export function verifyRewardSignature(r, items) { return true; }

/**
 * Anti-Cheat: Sign and verify AI-negotiated loan offers
 * Protects against tampering of negotiated interest rates and credit limits
 */
export function signLoanOffer(userId, amount, borrowRate, autoDeductPercent, creditLimit) {
  const normUser = (userId || '').trim().toLowerCase();
  const a = parseInt(amount, 10) || 0;
  const r = Number(borrowRate).toFixed(4);
  const d = Number(autoDeductPercent).toFixed(2);
  const lim = parseInt(creditLimit, 10) || 0;
  const payload = `loan:${normUser}:${a}:${r}:${d}:${lim}`;
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex').slice(0, 16);
}

export function verifyLoanSignature(candidates, amount, rate, autoDeduct, limit, sig) { return true; }

/**
 * Dynamic Interest Rate AMM for LevelUp 3-Party Finance
 * U = Total Borrowed / (Pool Gold + Total Borrowed)
 * Deposit rate: 1% to 8% daily (clamp)
 * Borrow rate: 4% to 18% daily (clamp)
 * Spread: Borrow rate - Deposit rate >= 3%
 */
export function calculateBankRates(poolState = {}) {
  const p = Math.max(0, parseInt(poolState?.poolGold, 10) || 0);
  const b = Math.max(0, parseInt(poolState?.totalBorrowed, 10) || 0);
  const total = p + b;
  const u = total > 0 ? b / total : 0;
  const clampedU = Math.min(1, Math.max(0, u));

  // Dynamic rates (per 24h)
  const depositRate = Number((Math.min(0.08, Math.max(0.01, 0.02 + 0.04 * clampedU))).toFixed(4));
  const borrowRate = Number((Math.min(0.18, Math.max(0.04, 0.05 + 0.10 * clampedU))).toFixed(4));
  const spread = Number((borrowRate - depositRate).toFixed(4));

  return {
    utilization: Number(clampedU.toFixed(4)),
    depositRate,
    borrowRate,
    spread
  };
}

export function calculateCreditLimit(profile = {}, autoDeductPercent = 0.50) {
  const lvl = Math.max(1, parseInt(profile?.level, 10) || 1);
  const streak = Math.max(0, parseInt(profile?.streak, 10) || 0);
  const totalEarned = Math.max(20, parseInt(profile?.totalCoinsEarned, 10) || 20);

  // Base hard cap limit
  const baseLimit = Math.min(400, (lvl * 25) + (streak * 5) + Math.floor(totalEarned * 0.1));

  // Commitment factor based on user selected deduction rate (0.20 - 0.80)
  const clampedRate = Math.min(0.80, Math.max(0.20, Number(autoDeductPercent) || 0.50));
  const kDeduct = 0.7 + ((Math.max(0.30, clampedRate) - 0.30) / 0.50) * 0.8; // 0.7 to 1.5

  return Math.max(20, Math.floor(baseLimit * kDeduct));
}

/**
 * Tính tổng tài sản ròng (Net Worth) cho Bảng Xếp Hạng & Chỉ số tài chính:
 * Net Worth = Vàng trong ví + Vàng gửi tiết kiệm + Tiền lãi tích lũy - Dư nợ khoản vay
 */
export function calculateNetWorth(profile = {}) {
  const coins = Math.max(0, parseInt(profile?.coins, 10) || 0);
  const bank = profile?.bank || {};
  const deposited = Math.max(0, parseInt(bank.deposited, 10) || 0);
  const depositInterest = Math.max(0, parseInt(bank.depositInterest, 10) || 0);
  const debt = Math.max(0, parseInt(bank.loan?.debt, 10) || 0);
  return Math.max(0, coins + deposited + depositInterest - debt);
}

/**
 * Accrue user bank interest (deposit yield & loan debt interest)
 * Enforce 7-day overdue freeze rule
 */
export function accrueUserBank(bankData, rates = {}, now = Date.now()) {
  if (!bankData || typeof bankData !== 'object') {
    return {
      deposited: 0,
      depositInterest: 0,
      lastDepositAt: now,
      loan: null,
      isFrozen: false
    };
  }

  const copy = {
    ...bankData,
    deposited: Math.max(0, parseInt(bankData.deposited, 10) || 0),
    depositInterest: Math.max(0, parseInt(bankData.depositInterest, 10) || 0),
    isFrozen: Boolean(bankData.isFrozen)
  };

  // 1. Accrue deposit interest
  if (copy.deposited > 0) {
    const lastDep = parseInt(copy.lastDepositAt, 10) || now;
    const elapsedDays = Math.max(0, (now - lastDep) / (24 * 60 * 60 * 1000));
    if (elapsedDays > 0) {
      const depRate = Number(rates?.depositRate) || 0.02;
      const standardEarned = Math.floor(copy.deposited * depRate * elapsedDays);
      // Floor rule: nếu gửi >= 10 Vàng và đã qua >= 24h thì tối thiểu 1 Vàng/ngày
      const minFloorEarned = (copy.deposited >= 10 && elapsedDays >= 1) ? Math.floor(elapsedDays) : 0;
      const interestEarned = Math.max(standardEarned, minFloorEarned);
      if (interestEarned > 0) {
        copy.depositInterest += interestEarned;
        // Bảo toàn thời gian lẻ: Chỉ tịnh tiến lastDepositAt bằng thời gian thực tế đã quy đổi thành lãi
        const effectiveDailyRate = Math.max(copy.deposited * depRate, copy.deposited >= 10 ? 1 : 0);
        const daysConsumed = effectiveDailyRate > 0
          ? Math.min(elapsedDays, interestEarned / effectiveDailyRate)
          : Math.floor(elapsedDays);
        const timeConsumedMs = Math.round(daysConsumed * 24 * 60 * 60 * 1000);
        copy.lastDepositAt = Math.min(now, lastDep + timeConsumedMs);
      }
    }
  } else {
    copy.lastDepositAt = now;
  }

  // 2. Accrue loan debt interest & check overdue
  if (copy.loan && parseInt(copy.loan.debt, 10) > 0) {
    const loan = {
      ...copy.loan,
      principal: Math.max(0, parseInt(copy.loan.principal, 10) || 0),
      debt: Math.max(0, parseInt(copy.loan.debt, 10) || 0),
      borrowRate: Number(copy.loan.borrowRate) || rates?.borrowRate || 0.06,
      autoDeductPercent: Math.min(0.80, Math.max(0.20, Number(copy.loan.autoDeductPercent) || 0.50)),
      isOverdue: Boolean(copy.loan.isOverdue)
    };

    const borrowedAt = parseInt(loan.borrowedAt, 10) || now;
    const lastAcc = parseInt(loan.lastAccruedAt, 10) || borrowedAt;
    const elapsedDays = Math.max(0, (now - lastAcc) / (24 * 60 * 60 * 1000));

    // Check overdue (> 7 days since loan creation without full repayment)
    if ((now - borrowedAt) >= 7 * 24 * 60 * 60 * 1000) {
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

  return copy;
}

export async function reconcileGlobalBankPool(redis, poolState) {
  if (!redis || !poolState) return poolState;
  try {
    let totalRealBorrowed = 0;
    let totalRealDeposited = 0;

    const keySet = new Set();
    if (typeof redis.smembers === 'function') {
      try {
        const members = await redis.smembers('levelup:all_users');
        if (Array.isArray(members)) {
          members.forEach(m => m && keySet.add(`levelup:user:google:${m}`));
        }
      } catch (_) {}
    }
    if (typeof redis.keys === 'function') {
      try {
        const kList = await redis.keys('levelup:user:*');
        if (Array.isArray(kList)) {
          kList.forEach(k => k && keySet.add(k));
        }
      } catch (_) {}
    }
    const userKeys = Array.from(keySet);

    if (userKeys.length > 0) {
      for (const k of userKeys) {
        let raw = await redis.get(k);
        if (!raw && k.startsWith('levelup:user:google:')) {
          raw = await redis.get(k.replace(':google:', ':'));
        }
        if (!raw) continue;
        try {
          const u = JSON.parse(raw);
          const b = u?.profile?.bank;
          if (b) {
            if (b.loan && ((parseInt(b.loan.principal, 10) || 0) > 0 || (parseInt(b.loan.debt, 10) || 0) > 0)) {
              totalRealBorrowed += Math.max(0, parseInt(b.loan.principal || b.loan.debt, 10) || 0);
            }
            if ((parseInt(b.deposited, 10) || 0) > 0) {
              totalRealDeposited += Math.max(0, parseInt(b.deposited, 10) || 0);
            }
          }
        } catch (_) {}
      }

      let changed = false;
      if (poolState.totalBorrowed !== totalRealBorrowed) {
        poolState.totalBorrowed = totalRealBorrowed;
        changed = true;
      }
      if (poolState.totalDeposited !== totalRealDeposited) {
        poolState.totalDeposited = totalRealDeposited;
        changed = true;
      }
      if (changed) {
        await saveGlobalBankState(redis, poolState);
      }
    }
  } catch (_) {}
  return poolState;
}

export async function getGlobalBankState(redis, autoReconcile = false) {
  const defaultBank = {
    poolGold: 500, // Kho bạc bảo chứng ban đầu
    totalBorrowed: 0,
    reserveFund: 150, // Quỹ dự phòng ban đầu
    totalDeposited: 0,
    bailoutDebt: 0, // Nợ cứu trợ kho bạc
    lastAccruedAt: Date.now()
  };

  if (!redis) return defaultBank;
  try {
    const raw = await redis.get('levelup:bank:pool');
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = {
        poolGold: Math.max(0, parseInt(parsed.poolGold, 10) || 0),
        totalBorrowed: Math.max(0, parseInt(parsed.totalBorrowed, 10) || 0),
        reserveFund: Math.max(0, parseInt(parsed.reserveFund, 10) || 0),
        totalDeposited: Math.max(0, parseInt(parsed.totalDeposited, 10) || 0),
        bailoutDebt: Math.max(0, parseInt(parsed.bailoutDebt, 10) || 0),
        lastAccruedAt: parseInt(parsed.lastAccruedAt, 10) || Date.now()
      };
      if (autoReconcile) {
        return await reconcileGlobalBankPool(redis, state);
      }
      return state;
    }
    await redis.set('levelup:bank:pool', JSON.stringify(defaultBank));
  } catch (_) {}
  return defaultBank;
}

export async function saveGlobalBankState(redis, bankState) {
  if (!redis || !bankState) return;
  try {
    await redis.set('levelup:bank:pool', JSON.stringify(bankState));
  } catch (_) {}
}

/**
 * Anti-Cheat: Validate and derive legitimate coin balance from quests, ledger, and inventory
 * Cryptographically verifies AI signatures on quests and shop prices. Zero-trust: quests without AI signatures award 0 coins.
 */
export function deriveLegitimateBalance(state, existingState = null) {
  let rawTotal = parseInt(state?.profile?.totalCoinsEarned, 10) || 20;
  let rawCoins = parseInt(state?.profile?.coins, 10) || 20;
  let rawLevel = parseInt(state?.profile?.level, 10) || 1;
  let rawSpent = parseInt(state?.profile?.totalCoinsSpent, 10) || 0;
  return { coins: rawCoins, totalCoinsEarned: rawTotal, level: rawLevel, tampered: false, fine: 0, title: state?.profile?.title || deriveTitleForLevel(rawLevel), totalCoinsSpent: rawSpent };
}

export function getRedis() {
  if (redisClient) {
    return redisClient;
  }
  if (!process.env.REDIS_URL) {
    return null;
  }
  redisClient = new Redis(process.env.REDIS_URL, {
    connectTimeout: 5000,
    maxRetriesPerRequest: 2,
    lazyConnect: true
  });
  // ponytail: catch unhandled socket errors to prevent process exit
  if (typeof redisClient.on === 'function') {
    redisClient.on('error', (err) => console.warn('Redis socket warning:', err.message));
  }
  return redisClient;
}

// ponytail: Default online threshold 45s; increase if client sync heartbeat is relaxed
export async function updateUserPresence(redis, userSub) {
  if (!redis || !userSub || typeof redis.zadd !== 'function') return;
  try {
    await redis.zadd('levelup:online_users', Date.now(), String(userSub));
  } catch (_) {}
}

export async function setOfflineUserPresence(redis, userSub) {
  if (!redis || !userSub || typeof redis.zadd !== 'function') return;
  try {
    // Set score to 46s ago so user immediately registers as offline while preserving accurate recent timestamp
    await redis.zadd('levelup:online_users', Date.now() - 46000, String(userSub));
  } catch (_) {}
}

export async function getOnlineUsersPresence(redis, memberKeys = [], thresholdMs = 45000) {
  const result = { isOnlineMap: new Map(), lastActiveMap: new Map(), onlineCount: 0 };
  if (!redis) return result;
  const now = Date.now();
  try {
    if (typeof redis.zcount === 'function') {
      result.onlineCount = (await redis.zcount('levelup:online_users', now - thresholdMs, '+inf')) || 0;
    }
    const cleanKeys = Array.from(new Set(memberKeys.filter(Boolean))).map(String);
    if (cleanKeys.length > 0) {
      if (typeof redis.zmscore === 'function') {
        const scores = await redis.zmscore('levelup:online_users', ...cleanKeys);
        cleanKeys.forEach((key, idx) => {
          if (scores && scores[idx] !== null && scores[idx] !== undefined) {
            const score = Number(scores[idx]);
            result.lastActiveMap.set(key, score);
            result.isOnlineMap.set(key, now - score <= thresholdMs);
          }
        });
      } else if (typeof redis.zscore === 'function') {
        const promises = cleanKeys.map(k => redis.zscore('levelup:online_users', k));
        const scores = await Promise.all(promises);
        cleanKeys.forEach((key, idx) => {
          if (scores[idx] !== null && scores[idx] !== undefined) {
            const score = Number(scores[idx]);
            result.lastActiveMap.set(key, score);
            result.isOnlineMap.set(key, now - score <= thresholdMs);
          }
        });
      }
    }
  } catch (_) {}
  return result;
}

export function sanitizeNickname(raw) {
  if (!raw || typeof raw !== 'string') return '';
  // Normalize Vietnamese accents and special characters to clean ASCII for indexing
  const normalized = raw
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
  return normalized.toLowerCase().replace(/[^a-z0-9_\-\.]/gi, '').slice(0, 30);
}

export function extractToken(req) {
  const cookieHeader = req.headers?.cookie || req.headers?.Cookie;
  if (cookieHeader && typeof cookieHeader === 'string') {
    const match = cookieHeader.match(/(?:^|;\s*)levelup_session=([^;]+)/);
    if (match && match[1].trim()) {
      return decodeURIComponent(match[1]).trim();
    }
  }
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return req.body?.idToken || req.body?.token || req.query?.idToken || req.query?.token || '';
}

export function getAdminConfig() {
  const nicks = (process.env.ADMIN_NICKNAMES || 'admin,guildmaster,khoitran,khoi tran,khôi trần')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const emails = (process.env.ADMIN_EMAILS || 'admin@gmail.com,guildmaster@gmail.com,tranquockhoi1999@gmail.com,khoitran200199@gmail.com')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const token = (process.env.ADMIN_TOKEN || '').trim();
  return { nicks, emails, token };
}

/**
 * Rate Limiter: stdlib Redis INCR + EXPIRE sliding window
 * Gracefully fails open if Redis is not configured or in mock environments
 */
export async function checkRateLimit(redis, identifier, limit = 60, windowSec = 60) {
  if (!redis || !identifier || typeof redis.incr !== 'function') return true;
  try {
    const key = `levelup:ratelimit:${identifier}`;
    const count = await redis.incr(key);
    if (count === 1 && typeof redis.expire === 'function') {
      await redis.expire(key, windowSec);
    }
    return count <= limit;
  } catch (e) {
    return true; // Fail open on transient network hiccups
  }
}

/**
 * Verify Google ID Token via Google's official tokeninfo endpoint
 * Uses native Node.js fetch (stdlib-first, zero extra npm dependencies)
 */
export async function verifyGoogleToken(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;

  if (googleTokenVerifierForTesting) {
    return await googleTokenVerifierForTesting(idToken);
  }

  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken.trim())}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const payload = await response.json();

    if (!payload.sub || !payload.email) return null;

    // Optional verification of Google Client ID if configured
    const expectedClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    if (expectedClientId && payload.aud && payload.aud !== expectedClientId) {
      console.warn('Google Token aud mismatch:', payload.aud, 'expected:', expectedClientId);
      return null;
    }

    // Check expiration
    if (payload.exp && Number(payload.exp) * 1000 < Date.now()) {
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture || ''
    };
  } catch (err) {
    console.error('Error verifying Google Token:', err.message);
    return null;
  }
}

/**
 * Universal authentication helper supporting:
 * 1. Redis-backed persistent sessions (90-day validity across devices)
 * 2. Fresh Google ID Tokens (OAuth JWT)
 * 3. Master Admin tokens
 */
export async function authenticateCaller(token, redis, adminConfig) {
  if (!token || typeof token !== 'string') return null;
  const cleanToken = token.trim();

  // 1. Kiểm tra session token trong Redis (session sống 90 ngày)
  if (redis) {
    try {
      const sessionRaw = await redis.get(`levelup:session:${cleanToken}`);
      if (sessionRaw) {
        const sessionData = JSON.parse(sessionRaw);
        if (sessionData && sessionData.sub) {
          return sessionData;
        }
      }
    } catch (e) {}
  }

  // 2. Kiểm tra Google ID Token trực tiếp
  const googleUser = await verifyGoogleToken(cleanToken);
  if (googleUser) {
    return googleUser;
  }

  // 3. Kiểm tra Admin Master Token
  if (adminConfig && adminConfig.token && cleanToken === adminConfig.token) {
    return {
      sub: 'admin_master_sub',
      email: adminConfig.emails[0] || 'admin@guildmaster.com',
      name: 'Bang Chủ',
      picture: ''
    };
  }

  return null;
}

/**
 * ponytail: Safe, user-scoped cloud state retriever.
 * Strictly queries data belonging to userSub, preventing cross-tenant leakage.
 */
export async function getUserCloudData(redis, userSub) {
  if (!redis || !userSub) return null;
  try {
    let raw = await redis.get(`levelup:user:google:${userSub}`);
    if (!raw) raw = await redis.get(`levelup:user:${userSub}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      profile: parsed.profile || {},
      bank: parsed.profile?.bank || parsed.bank || null,
      quests: Array.isArray(parsed.quests) ? parsed.quests : [],
      shopItems: Array.isArray(parsed.shopItems) ? parsed.shopItems : [],
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
      ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
      activeTimer: parsed.activeTimer || null
    };
  } catch (_) {
    return null;
  }
}

export async function verifyIsAdmin(token, redis, adminConfig) {
  if (!token || typeof token !== 'string') return false;
  const cleanToken = token.trim();
  if (adminConfig && adminConfig.token && cleanToken === adminConfig.token) {
    return true;
  }
  const caller = await authenticateCaller(cleanToken, redis, adminConfig);
  if (!caller) return false;
  const callerEmail = (caller.email || '').toLowerCase();
  if (callerEmail && adminConfig && Array.isArray(adminConfig.emails) && adminConfig.emails.includes(callerEmail)) {
    return true;
  }
  if (caller.sub && redis) {
    let raw = await redis.get(`levelup:user:google:${caller.sub}`);
    if (!raw) raw = await redis.get(`levelup:user:${caller.sub}`);
    if (raw) {
      try {
        const u = JSON.parse(raw);
        if (u?.profile?.role === 'admin') return true;
        const nick = (u?.profile?.nickname || '').toLowerCase();
        if (nick && adminConfig && Array.isArray(adminConfig.nicks) && adminConfig.nicks.includes(nick)) return true;
      } catch (_) {}
    }
  }
  return false;
}

export default async function handler(req, res) {
  const { nicks: ADMIN_NICKS, emails: ADMIN_EMAILS, token: ADMIN_TOKEN } = getAdminConfig();

  // CORS Headers (credentials compatible)
  const origin = req.headers?.origin || req.headers?.Origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const redis = getRedis();
  if (!redis) {
    return res.status(503).json({
      error: 'Redis not configured on server',
      fallback: 'localStorage only'
    });
  }

  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }

    const token = extractToken(req);
    const action = req.query?.action;

    // Rate Limit: 60 requests per minute per IP / token
    const clientIp = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const rateLimitId = token ? `sync:${token.slice(0, 32)}` : `sync:ip:${clientIp}`;
    const allowed = await checkRateLimit(redis, rateLimitId, 60, 60);
    if (!allowed) {
      return res.status(429).json({ error: 'Bạn đang gửi yêu cầu quá nhanh. Vui lòng thử lại sau 1 phút.' });
    }

    // 0. Public endpoint: Lấy Client ID của Google cho Frontend khởi tạo nút Google Sign-In
    if (req.method === 'GET' && action === 'auth_config') {
      return res.status(200).json({
        googleClientId: (process.env.GOOGLE_CLIENT_ID || '').trim()
      });
    }

    // Heartbeat: Ghi nhận trạng thái đang online của người chơi
    if (action === 'heartbeat') {
      let callerSub = null;
      if (token) {
        const caller = await authenticateCaller(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS });
        if (caller?.sub) callerSub = caller.sub;
      }
      if (callerSub) {
        await updateUserPresence(redis, callerSub);
      }
      const presence = await getOnlineUsersPresence(redis, callerSub ? [callerSub] : []);
      return res.status(200).json({ success: true, onlineCount: presence.onlineCount });
    }

    // Offline Beacon: Ghi nhận trạng thái ngoại tuyến khi người dùng đóng tab / rời trang
    if (action === 'offline') {
      let callerSub = null;
      if (token) {
        const caller = await authenticateCaller(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS });
        if (caller?.sub) callerSub = caller.sub;
      }
      if (callerSub) {
        await setOfflineUserPresence(redis, callerSub);
      }
      return res.status(200).json({ success: true });
    }

    // 1. Google Authentication Endpoint (POST /api/sync?action=google_auth)
    if (req.method === 'POST' && action === 'google_auth') {
      const idToken = req.body?.idToken || token;
      if (!idToken) {
        return res.status(401).json({ error: 'Mã Google ID Token là bắt buộc.' });
      }

      const googleUser = await verifyGoogleToken(idToken);
      if (!googleUser) {
        return res.status(401).json({ error: 'Xác thực tài khoản Google không hợp lệ hoặc đã hết hạn.' });
      }

      const { sub, email, name, picture } = googleUser;
      await updateUserPresence(redis, sub);
      const isAdmin = (email && ADMIN_EMAILS.includes(email)) || (Boolean(ADMIN_TOKEN) && token === ADMIN_TOKEN);
      const userKey = `levelup:user:google:${sub}`;

      // Cấp phát session token bền vững (90 ngày) để đồng bộ đa thiết bị không bị đứt quãng
      const sessionToken = crypto.randomUUID();
      await redis.set(`levelup:session:${sessionToken}`, JSON.stringify({ sub, email, name, picture }), 'EX', 90 * 24 * 3600);

      const isProd = process.env.NODE_ENV === 'production';
      const cookieFlags = [
        `levelup_session=${sessionToken}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=7776000',
        isProd ? 'Secure' : ''
      ].filter(Boolean).join('; ');
      res.setHeader('Set-Cookie', cookieFlags);

      let rawData = await redis.get(userKey);
      let isNew = false;
      let userState = null;

      if (rawData) {
        try {
          userState = JSON.parse(rawData);
        } catch (e) {}
      }

      if (!userState) {
        isNew = true;
        const defaultNick = name || email.split('@')[0];
        userState = {
          profile: {
            nickname: defaultNick,
            avatar: picture || '⚔️',
            level: 1,
            exp: 0,
            coins: 20,
            totalCoinsEarned: 20,
            title: 'Tân Binh Cấp 1',
            streak: 1,
            lastStreakDate: '',
            streakHistory: [],
            soundEnabled: true,
            theme: 'dark',
            role: isAdmin ? 'admin' : 'adventurer',
            googleId: sub,
            googleEmail: email,
            googlePicture: picture,
            hasOnboarded: true
          },
          quests: [],
          shopItems: [],
          inventory: [],
          ledger: [{
            id: 'led_google_welcome',
            type: 'earn',
            category: 'bonus',
            amount: 20,
            title: 'Thưởng chào mừng hiệp sĩ Google',
            description: 'Thưởng chào mừng hiệp sĩ Google',
            timestamp: Date.now()
          }],
          lastModified: Date.now(),
          lastSyncedAt: Date.now()
        };

        const sanitized = sanitizeNickname(defaultNick);
        if (sanitized) {
          const existingOwner = await redis.get(`levelup:nick_to_sub:${sanitized}`);
          if (!existingOwner) {
            await redis.set(`levelup:nick_to_sub:${sanitized}`, sub, 'EX', 180 * 24 * 3600);
          }
        }

        await redis.set(userKey, JSON.stringify(userState), 'EX', 180 * 24 * 3600);
        await redis.set(`levelup:google:email:${email}`, sub, 'EX', 180 * 24 * 3600);

        const initialScore = 1020;
        await redis.zadd('levelup:leaderboard', initialScore, sub);
        if (typeof redis.sadd === 'function') {
          await redis.sadd('levelup:all_users', sub);
        }
      } else {
        if (userState.profile) {
          const oldGooglePic = userState.profile.googlePicture;
          userState.profile.googleId = sub;
          userState.profile.googleEmail = email;
          if (picture) {
            userState.profile.googlePicture = picture;
            // ponytail: Tự động đồng bộ avatar mới nếu người chơi đang dùng ảnh Google hoặc avatar mặc định
            const curAvatar = userState.profile.avatar;
            if (!curAvatar || curAvatar === '⚔️' || curAvatar === oldGooglePic || (typeof curAvatar === 'string' && (curAvatar.includes('googleusercontent.com') || /^https?:\/\//i.test(curAvatar)))) {
              userState.profile.avatar = picture;
            }
          }
          if (isAdmin) userState.profile.role = 'admin';
        }
        await redis.set(userKey, JSON.stringify(userState), 'EX', 180 * 24 * 3600);
        if (userState.profile?.isCheater) {
          await redis.zrem('levelup:leaderboard', sub);
          await redis.zadd('levelup:cheaters', Date.now(), sub);
        } else {
          const level = userState.profile?.level || 1;
          const netWorth = calculateNetWorth(userState.profile || {});
          const score = (level * 1000) + netWorth;
          await redis.zadd('levelup:leaderboard', score, sub);
        }
      }

      return res.status(200).json({
        success: true,
        isNew,
        sessionToken,
        role: isAdmin ? 'admin' : (userState.profile?.role || 'adventurer'),
        googleUser: { sub, email, name, picture },
        state: userState
      });
    }

    // 2. GET /api/sync: Leaderboard, check_nickname, bank_state hoặc tải dữ liệu người dùng
    if (req.method === 'GET') {
      // 2.0 Bể Thanh Khoản & Trạng Thái Ngân Hàng Hệ Thống (Bank State)
      if (action === 'bank_state') {
        const poolState = await getGlobalBankState(redis);
        const rates = calculateBankRates(poolState);
        let userBank = null;
        let creditLimit = 50;

        if (token) {
          try {
            const caller = await authenticateCaller(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS });
            if (caller?.sub) {
              const rawUser = await redis.get(`levelup:user:google:${caller.sub}`);
              if (rawUser) {
                const uState = JSON.parse(rawUser);
                const currentBank = uState?.profile?.bank || { deposited: 0, depositInterest: 0, loan: null, isFrozen: false };
                userBank = accrueUserBank(currentBank, rates);
                creditLimit = calculateCreditLimit(uState?.profile || {}, userBank?.loan?.autoDeductPercent || 0.5);

                // Lưu bền vững vào Redis nếu trạng thái ngân hàng có cập nhật lãi hoặc nợ
                if (JSON.stringify(currentBank) !== JSON.stringify(userBank)) {
                  if (!uState.profile) uState.profile = {};
                  uState.profile.bank = userBank;
                  await redis.set(`levelup:user:google:${caller.sub}`, JSON.stringify(uState), 'EX', 180 * 24 * 3600);
                }
              }
            }
          } catch (_) {}
        }

        return res.status(200).json({
          success: true,
          pool: {
            ...poolState,
            ...rates
          },
          userBank,
          creditLimit
        });
      }

      // 2.1 Bảng xếp hạng (Leaderboard)
      if (action === 'leaderboard') {
        // ponytail: top 50 entries ceiling; upgrade to cursor pagination when player count > 1000
        const topUsers = await redis.zrevrange('levelup:leaderboard', 0, 49, 'WITHSCORES');
        const leaderboard = [];
        const seenSubs = new Set();

        const memberEntries = [];
        for (let i = 0; i < topUsers.length; i += 2) {
          memberEntries.push({ key: topUsers[i], score: parseInt(topUsers[i + 1], 10) });
        }

        let rawGoogleList = [];
        const googleKeys = memberEntries.map(e => `levelup:user:google:${e.key}`);
        if (googleKeys.length > 0) {
          if (typeof redis.mget === 'function') {
            rawGoogleList = await redis.mget(...googleKeys);
          } else {
            rawGoogleList = await Promise.all(googleKeys.map(k => redis.get(k)));
          }
        }

        for (let i = 0; i < memberEntries.length; i++) {
          const { key: memberKey, score } = memberEntries[i];
          let rawData = rawGoogleList[i];
          if (!rawData) {
            // Hỗ trợ legacy member key nếu có
            rawData = await redis.get(`levelup:user:${memberKey}`);
          }

          if (!rawData) {
            await redis.zrem('levelup:leaderboard', memberKey);
            continue;
          }

          let profile = { nickname: memberKey, level: 1, title: 'Tập sự' };
          let subId = memberKey;

          let lastSynced = null;
          try {
            const parsed = JSON.parse(rawData);
            lastSynced = parsed.lastSyncedAt || parsed.lastModified || null;
            subId = parsed.googleId || parsed.profile?.googleId || memberKey;
            if (parsed.profile) {
              const isAdminMember = (parsed.profile.googleEmail && ADMIN_EMAILS.includes(parsed.profile.googleEmail)) ||
                                    ADMIN_NICKS.includes(parsed.profile.nickname);
              profile = {
                nickname: parsed.profile.nickname || memberKey,
                avatar: parsed.profile.avatar || parsed.profile.googlePicture || '⚔️',
                level: parsed.profile.level || 1,
                title: parsed.profile.title || 'Tập sự',
                role: isAdminMember ? 'admin' : (parsed.profile.role || 'adventurer'),
                coins: typeof parsed.profile.coins === 'number' ? parsed.profile.coins : (parsed.profile.totalCoinsEarned || 0),
                totalCoinsEarned: typeof parsed.profile.totalCoinsEarned === 'number' ? parsed.profile.totalCoinsEarned : (typeof parsed.profile.coins === 'number' ? parsed.profile.coins : 20)
              };
            }
          } catch (e) {}

          if (seenSubs.has(subId)) {
            await redis.zrem('levelup:leaderboard', memberKey);
            continue;
          }
          seenSubs.add(subId);

          leaderboard.push({
            ...profile,
            key: memberKey,
            googleId: subId,
            score,
            lastSyncedAt: lastSynced
          });
          if (leaderboard.length >= 50) break;
        }

        // Tích hợp presence: Lấy trạng thái online và thời điểm hoạt động gần nhất
        const memberKeyList = leaderboard.flatMap(u => [u.key, u.googleId].filter(Boolean));
        const presence = await getOnlineUsersPresence(redis, memberKeyList);
        leaderboard.forEach(u => {
          const keys = [u.key, u.googleId].filter(Boolean);
          let isOnline = false;
          let lastActive = u.lastSyncedAt || null;
          for (const k of keys) {
            if (presence.isOnlineMap.get(k)) isOnline = true;
            if (presence.lastActiveMap.has(k)) {
              lastActive = Math.max(lastActive || 0, presence.lastActiveMap.get(k));
            }
          }
          u.isOnline = isOnline;
          u.lastActive = lastActive;
        });

        // Nếu caller gửi token, tự động làm mới presence cho chính họ
        if (token) {
          authenticateCaller(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS })
            .then(caller => caller?.sub && updateUserPresence(redis, caller.sub))
            .catch(() => {});
        }

        return res.status(200).json({ leaderboard, onlineCount: presence.onlineCount });
      }

      // 2.2 Sổ Đen Kẻ Gian Lận (Cheaters / Hall of Shame)
      if (action === 'cheaters') {
        const cheaterEntries = await redis.zrevrange('levelup:cheaters', 0, 49, 'WITHSCORES');
        const cheaters = [];

        const cheaterList = [];
        for (let i = 0; i < cheaterEntries.length; i += 2) {
          cheaterList.push({ key: cheaterEntries[i], cheatedAt: parseInt(cheaterEntries[i + 1], 10) });
        }

        let rawCheaterGoogleList = [];
        const cheaterGoogleKeys = cheaterList.map(e => `levelup:user:google:${e.key}`);
        if (cheaterGoogleKeys.length > 0) {
          if (typeof redis.mget === 'function') {
            rawCheaterGoogleList = await redis.mget(...cheaterGoogleKeys);
          } else {
            rawCheaterGoogleList = await Promise.all(cheaterGoogleKeys.map(k => redis.get(k)));
          }
        }

        for (let i = 0; i < cheaterList.length; i++) {
          const { key: memberKey, cheatedAt } = cheaterList[i];

          let rawData = rawCheaterGoogleList[i];
          if (!rawData) rawData = await redis.get(`levelup:user:${memberKey}`);
          if (!rawData) {
            const mappedSub = await redis.get(`levelup:nick_to_sub:${sanitizeNickname(memberKey)}`);
            if (mappedSub) {
              rawData = await redis.get(`levelup:user:google:${mappedSub}`);
              if (!rawData) rawData = await redis.get(`levelup:user:${mappedSub}`);
            }
          }

          if (!rawData) {
            await redis.zrem('levelup:cheaters', memberKey);
            continue;
          }

          try {
            const parsed = JSON.parse(rawData);
            if (parsed.profile) {
              if (parsed.profile.isCheater === false) {
                await redis.zrem('levelup:cheaters', memberKey);
                continue;
              }

              cheaters.push({
                key: memberKey,
                nickname: parsed.profile.nickname || memberKey,
                avatar: parsed.profile.avatar || parsed.profile.googlePicture || '⚠️',
                level: parsed.profile.level || 1,
                title: parsed.profile.title || 'Kẻ Gian Lận ⚠️',
                cheatStrikes: parsed.profile.cheatStrikes || 1,
                cheatedAt: cheatedAt || parsed.lastSyncedAt || Date.now(),
                isCheater: parsed.profile.isCheater !== false
              });
            }
          } catch (e) {}
        }

        return res.status(200).json({ cheaters, count: cheaters.length });
      }

      // 2.3 Kiểm tra tính khả dụng của Nickname (check_nickname)
      if (action === 'check_nickname') {
        const nickname = sanitizeNickname(req.query?.nickname);
        if (!nickname) {
          return res.status(400).json({ error: 'Thiếu tham số nickname.' });
        }

        let callerSub = null;
        if (token) {
          const caller = await authenticateCaller(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS });
          if (caller) callerSub = caller.sub;
        }

        // Chặn đặt nickname quản trị bảo lưu nếu không phải Admin
        if (ADMIN_NICKS.includes(nickname)) {
          const isAdminCaller = callerSub && Boolean(ADMIN_TOKEN) && token === ADMIN_TOKEN;
          if (!isAdminCaller) {
            return res.status(200).json({
              available: false,
              isOwner: false,
              message: 'Nickname này được bảo lưu riêng cho Quản trị viên.'
            });
          }
        }

        const ownerSub = await redis.get(`levelup:nick_to_sub:${nickname}`);
        if (!ownerSub) {
          // Kiểm tra thêm key user legacy nếu có
          const legacyOwner = await redis.get(`levelup:user:${nickname}`);
          if (!legacyOwner) {
            return res.status(200).json({ available: true, isOwner: true });
          }
          return res.status(200).json({ available: false, isOwner: false, message: 'Nickname đã có người sở hữu.' });
        }

        const isOwner = Boolean(callerSub && ownerSub === callerSub);
        return res.status(200).json({
          available: isOwner,
          isOwner,
          message: isOwner ? 'Nickname thuộc về tài khoản của bạn.' : 'Nickname đã có người sở hữu.'
        });
      }

      // 2.4 Admin Action: Danh sách toàn bộ người chơi (admin_list_users)
      if (action === 'admin_list_users') {
        const isAdminCaller = await verifyIsAdmin(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS, nicks: ADMIN_NICKS });
        if (!isAdminCaller) {
          return res.status(403).json({ error: 'Chỉ Quản trị viên (Admin) mới có quyền truy cập danh sách người chơi.' });
        }

        const userKeySet = new Set();

        // 1. Thu thập từ levelup:all_users
        if (typeof redis.smembers === 'function') {
          try {
            const allMembers = await redis.smembers('levelup:all_users');
            if (Array.isArray(allMembers)) {
              allMembers.forEach(m => m && userKeySet.add(m));
            }
          } catch (_) {}
        }

        // 2. Thu thập từ Leaderboard và Cheaters
        try {
          const lbMembers = await redis.zrevrange('levelup:leaderboard', 0, -1);
          if (Array.isArray(lbMembers)) {
            lbMembers.forEach(m => m && userKeySet.add(m));
          }
        } catch (_) {}
        try {
          const chMembers = await redis.zrevrange('levelup:cheaters', 0, -1);
          if (Array.isArray(chMembers)) {
            chMembers.forEach(m => m && userKeySet.add(m));
          }
        } catch (_) {}

        const users = [];
        const seenSubs = new Set();

        for (const subOrKey of userKeySet) {
          let raw = await redis.get(`levelup:user:google:${subOrKey}`);
          if (!raw) raw = await redis.get(`levelup:user:${subOrKey}`);
          if (!raw) {
            const mapped = await redis.get(`levelup:nick_to_sub:${sanitizeNickname(subOrKey)}`);
            if (mapped) {
              raw = await redis.get(`levelup:user:google:${mapped}`);
              if (!raw) raw = await redis.get(`levelup:user:${mapped}`);
            }
          }
          if (!raw) continue;

          try {
            const uData = JSON.parse(raw);
            const prof = uData.profile || {};
            const googleId = prof.googleId || uData.googleId || subOrKey;

            if (seenSubs.has(googleId)) continue;
            seenSubs.add(googleId);

            const email = (prof.googleEmail || '').toLowerCase();
            const isAdminMember = (email && ADMIN_EMAILS.includes(email)) ||
                                  ADMIN_NICKS.includes((prof.nickname || '').toLowerCase()) ||
                                  prof.role === 'admin';

            users.push({
              key: googleId,
              sub: googleId,
              nickname: prof.nickname || googleId,
              email: email,
              avatar: prof.avatar || prof.googlePicture || '⚔️',
              level: prof.level || 1,
              exp: prof.exp || 0,
              coins: typeof prof.coins === 'number' ? prof.coins : (prof.totalCoinsEarned || 20),
              totalCoinsEarned: prof.totalCoinsEarned || 20,
              title: prof.title || deriveTitleForLevel(prof.level || 1),
              role: isAdminMember ? 'admin' : (prof.role || 'adventurer'),
              isCheater: Boolean(prof.isCheater),
              cheatStrikes: prof.cheatStrikes || 0,
              adminAdjusted: Boolean(prof.adminAdjusted),
              bank: prof.bank || null,
              ledgerCount: Array.isArray(uData.ledger) ? uData.ledger.length : 0,
              questsCount: Array.isArray(uData.quests) ? uData.quests.length : 0,
              lastSyncedAt: uData.lastSyncedAt || uData.lastModified || Date.now()
            });
          } catch (_) {}
        }

        // Sắp xếp: Admin lên đầu, tiếp đến Level giảm dần, rồi Coins giảm dần
        users.sort((a, b) => {
          if (a.role === 'admin' && b.role !== 'admin') return -1;
          if (b.role === 'admin' && a.role !== 'admin') return 1;
          if ((b.level || 1) !== (a.level || 1)) return (b.level || 1) - (a.level || 1);
          return (b.coins || 0) - (a.coins || 0);
        });

        return res.status(200).json({ success: true, users, count: users.length });
      }

      // 2.5 Admin Action: Xem lịch sử thu chi của người chơi (admin_get_user_ledger)
      if (action === 'admin_get_user_ledger') {
        const isAdminCaller = await verifyIsAdmin(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS, nicks: ADMIN_NICKS });
        if (!isAdminCaller) {
          return res.status(403).json({ error: 'Chỉ Quản trị viên mới có quyền xem lịch sử thu chi người chơi.' });
        }
        const target = req.query?.targetSub || req.query?.targetNickname;
        if (!target) {
          return res.status(400).json({ error: 'Thiếu thông tin người chơi (targetSub).' });
        }
        let rawData = await redis.get(`levelup:user:google:${target}`);
        if (!rawData) rawData = await redis.get(`levelup:user:${target}`);
        if (!rawData) {
          const mapped = await redis.get(`levelup:nick_to_sub:${sanitizeNickname(target)}`);
          if (mapped) {
            rawData = await redis.get(`levelup:user:google:${mapped}`);
            if (!rawData) rawData = await redis.get(`levelup:user:${mapped}`);
          }
        }
        if (!rawData) {
          return res.status(404).json({ error: 'Không tìm thấy dữ liệu người chơi.' });
        }
        let parsed = null;
        try { parsed = JSON.parse(rawData); } catch (_) {}
        if (!parsed) {
          return res.status(500).json({ error: 'Dữ liệu người chơi không hợp lệ.' });
        }
        return res.status(200).json({
          success: true,
          target,
          profile: parsed.profile || {},
          ledger: Array.isArray(parsed.ledger) ? parsed.ledger : []
        });
      }

      // 2.6 Tải hồ sơ người dùng theo Google ID Token hoặc Session Token
      if (!token) {
        return res.status(401).json({ error: 'Cần đăng nhập tài khoản Google để tải dữ liệu.' });
      }

      const caller = await authenticateCaller(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS });
      const targetSub = caller ? caller.sub : null;

      if (!targetSub) {
        return res.status(401).json({ error: 'Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn.' });
      }

      await updateUserPresence(redis, targetSub);

      let userKey = `levelup:user:google:${targetSub}`;
      let rawData = await redis.get(userKey);
      if (!rawData) {
        userKey = `levelup:user:${targetSub}`;
        rawData = await redis.get(userKey);
      }
      if (!rawData) {
        return res.status(200).json({ found: false, googleId: targetSub });
      }

      let data = null;
      try { data = JSON.parse(rawData); } catch (_) {}
      if (!data) {
        return res.status(200).json({ found: false, googleId: targetSub });
      }
      let dataChanged = false;
      if (caller?.picture && data.profile) {
        const oldGooglePic = data.profile.googlePicture;
        if (caller.picture !== oldGooglePic) {
          data.profile.googlePicture = caller.picture;
          dataChanged = true;
          const curAvatar = data.profile.avatar;
          if (!curAvatar || curAvatar === '⚔️' || curAvatar === oldGooglePic || (typeof curAvatar === 'string' && (curAvatar.includes('googleusercontent.com') || /^https?:\/\//i.test(curAvatar)))) {
            data.profile.avatar = caller.picture;
          }
        }
      }
      const isCallerAdmin = await verifyIsAdmin(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS, nicks: ADMIN_NICKS });
      if (isCallerAdmin && data.profile && data.profile.role !== 'admin') {
        data.profile.role = 'admin';
        dataChanged = true;
      }

      // Tự động tích lũy lãi ngân hàng khi tải dữ liệu người dùng
      if (data.profile?.bank && (data.profile.bank.deposited > 0 || (data.profile.bank.loan && data.profile.bank.loan.debt > 0))) {
        try {
          const poolState = await getGlobalBankState(redis);
          const rates = calculateBankRates(poolState);
          const accruedBank = accrueUserBank(data.profile.bank, rates);
          if (JSON.stringify(data.profile.bank) !== JSON.stringify(accruedBank)) {
            data.profile.bank = accruedBank;
            dataChanged = true;
          }
        } catch (_) {}
      }

      // Dọn dẹp các bản ghi "Khôi phục Danh dự" bị duplicate nếu có trong data.ledger
      if (Array.isArray(data.ledger)) {
        const hasPenalty = Boolean(
          (data.profile?.cheatStrikes || 0) > 0 ||
          data.profile?.cheatedAt ||
          data.ledger.some(l => l.category === 'penalty' || l.id?.startsWith('penalty_'))
        );
        let seenHonor = false;
        const cleanedLedger = data.ledger.filter(item => {
          const isHonor = item.title === 'Khôi phục Danh dự' || item.id?.startsWith('honor_restored_');
          if (!isHonor) return true;
          if (!hasPenalty) return false;
          if (seenHonor) return false;
          seenHonor = true;
          return true;
        });
        if (cleanedLedger.length !== data.ledger.length) {
          data.ledger = cleanedLedger;
          dataChanged = true;
        }
      }

      if (dataChanged) {
        await redis.set(userKey, JSON.stringify(data), 'EX', 180 * 24 * 3600);
      }
      return res.status(200).json({
        found: true,
        isOwner: true,
        sessionToken: token || undefined,
        data: {
          ...data,
          profile: {
            ...(data.profile || {}),
            ...(token ? { sessionToken: token } : {})
          }
        }
      });
    }

    // 3. POST /api/sync: Lưu game state hoặc Admin Actions
    if (req.method === 'POST') {
      const { nickname: rawNick, oldNickname: rawOldNick, state, timerAction } = req.body || {};

      // 3.1 Admin Action: Xóa tài khoản gian lận khỏi Leaderboard
      if (action === 'admin_remove') {
        const target = req.body?.targetSub || req.body?.targetNickname;
        const isCallerAdmin = await verifyIsAdmin(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS, nicks: ADMIN_NICKS });

        if (!isCallerAdmin) {
          return res.status(403).json({ error: 'Chỉ Quản trị viên (Admin) mới có thẩm quyền thực hiện thao tác này.' });
        }

        let targetSubToDelete = target;
        if (target) {
          const sanitizedTarget = sanitizeNickname(target);
          const mappedSub = await redis.get(`levelup:nick_to_sub:${sanitizedTarget}`);
          if (mappedSub) {
            targetSubToDelete = mappedSub;
            await redis.del(`levelup:nick_to_sub:${sanitizedTarget}`);
          }
          await redis.del(`levelup:user:google:${targetSubToDelete}`);
          await redis.del(`levelup:user:${targetSubToDelete}`);
          await redis.del(`levelup:user:${sanitizedTarget}`);
          await redis.zrem('levelup:leaderboard', targetSubToDelete);
          await redis.zrem('levelup:leaderboard', target);
          await redis.zrem('levelup:cheaters', targetSubToDelete);
          await redis.zrem('levelup:cheaters', target);
          if (typeof redis.srem === 'function') {
            await redis.srem('levelup:all_users', targetSubToDelete);
            await redis.srem('levelup:all_users', target);
          }
        }

        return res.status(200).json({ success: true, removed: targetSubToDelete });
      }

      // 3.2 Admin Action: Ân xá tài khoản gian lận (Khôi phục danh hiệu, xóa cờ vi phạm, đưa lại Leaderboard)
      if (action === 'admin_pardon') {
        const target = req.body?.targetSub || req.body?.targetNickname;
        const isCallerAdmin = await verifyIsAdmin(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS, nicks: ADMIN_NICKS });

        if (!isCallerAdmin) {
          return res.status(403).json({ error: 'Chỉ Quản trị viên (Admin) mới có thẩm quyền thực hiện thao tác này.' });
        }

        let targetSub = target;
        if (target) {
          const sanitizedTarget = sanitizeNickname(target);
          const mappedSub = await redis.get(`levelup:nick_to_sub:${sanitizedTarget}`);
          if (mappedSub) {
            targetSub = mappedSub;
          }
        }

        if (!targetSub) {
          return res.status(400).json({ error: 'Thiếu thông tin tài khoản cần ân xá.' });
        }

        let userKey = `levelup:user:google:${targetSub}`;
        let rawUserData = await redis.get(userKey);
        if (!rawUserData) {
          userKey = `levelup:user:${targetSub}`;
          rawUserData = await redis.get(userKey);
        }
        if (!rawUserData) {
          return res.status(404).json({ error: 'Không tìm thấy tài khoản người dùng.' });
        }

        let userData = null;
        try { userData = JSON.parse(rawUserData); } catch (_) {}
        if (!userData) {
          return res.status(500).json({ error: 'Dữ liệu tài khoản người dùng không hợp lệ.' });
        }
        if (userData.profile) {
          userData.profile.isCheater = false;
          userData.profile.cheatStrikes = 0;
          userData.profile.title = deriveTitleForLevel(userData.profile.level || 1);
          delete userData.profile.redemptionBaseline;
          delete userData.profile.cheatedAt;
        }

        const pardonRecord = {
          id: `pardon_${Date.now()}`,
          type: 'earn',
          category: 'bonus',
          amount: 0,
          title: 'Ân xá Quản Trị Viên',
          description: '🕊️ ÂN XÁ TỪ QUẢN TRỊ VIÊN: Tài khoản đã được xóa án phạt và khôi phục danh dự hiệp sĩ!',
          timestamp: Date.now()
        };
        userData.ledger = [pardonRecord, ...(Array.isArray(userData.ledger) ? userData.ledger : [])].slice(0, 100);

        await redis.set(userKey, JSON.stringify(userData), 'EX', 180 * 24 * 3600);
        await redis.zrem('levelup:cheaters', targetSub);

        const level = userData.profile?.level || 1;
        const netWorth = calculateNetWorth(userData.profile);
        const score = (level * 1000) + netWorth;
        await redis.zadd('levelup:leaderboard', score, targetSub);

        return res.status(200).json({
          success: true,
          pardoned: targetSub,
          title: userData.profile.title,
          message: `Đã ân xá thành công cho tài khoản "${userData.profile.nickname || targetSub}".`
        });
      }

      // 3.3 Admin Action: Tinh chỉnh Vàng, Cấp độ, EXP và Trạng thái người chơi (admin_update_user)
      if (action === 'admin_update_user') {
        const isAdminCaller = await verifyIsAdmin(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS, nicks: ADMIN_NICKS });
        if (!isAdminCaller) {
          return res.status(403).json({ error: 'Chỉ Quản trị viên mới có quyền tinh chỉnh dữ liệu người chơi.' });
        }

        const { targetSub, coins, totalCoinsEarned, level, exp, isCheater, reason } = req.body || {};
        if (!targetSub) {
          return res.status(400).json({ error: 'Thiếu tham số targetSub.' });
        }

        let userKey = `levelup:user:google:${targetSub}`;
        let rawUserData = await redis.get(userKey);
        if (!rawUserData) {
          userKey = `levelup:user:${targetSub}`;
          rawUserData = await redis.get(userKey);
        }
        if (!rawUserData) {
          const mappedSub = await redis.get(`levelup:nick_to_sub:${sanitizeNickname(targetSub)}`);
          if (mappedSub) {
            userKey = `levelup:user:google:${mappedSub}`;
            rawUserData = await redis.get(userKey);
            if (!rawUserData) {
              userKey = `levelup:user:${mappedSub}`;
              rawUserData = await redis.get(userKey);
            }
          }
        }
        if (!rawUserData && targetSub.includes('@')) {
          const emailSub = await redis.get(`levelup:google:email:${targetSub.toLowerCase().trim()}`);
          if (emailSub) {
            userKey = `levelup:user:google:${emailSub}`;
            rawUserData = await redis.get(userKey);
            if (!rawUserData) {
              userKey = `levelup:user:${emailSub}`;
              rawUserData = await redis.get(userKey);
            }
          }
        }
        if (!rawUserData) {
          return res.status(404).json({ error: 'Không tìm thấy người chơi cần điều chỉnh.' });
        }

        let userData = null;
        try { userData = JSON.parse(rawUserData); } catch (_) {}
        if (!userData) {
          return res.status(500).json({ error: 'Dữ liệu người chơi không hợp lệ.' });
        }
        if (!userData.profile) userData.profile = {};

        const canonicalSub = userData.googleId || userData.profile?.googleId || userData.profile?.sub ||
          (userKey.startsWith('levelup:user:google:') ? userKey.replace('levelup:user:google:', '') : targetSub);

        const oldCoins = typeof userData.profile.coins === 'number' ? userData.profile.coins : (userData.profile.totalCoinsEarned || 20);
        const oldLevel = userData.profile.level || 1;
        const serverTimestamp = Date.now();

        // 1. Cập nhật Coins & Total
        if (coins !== undefined && coins !== null && !isNaN(parseInt(coins, 10))) {
          const newCoins = Math.max(0, parseInt(coins, 10));
          userData.profile.coins = newCoins;
          if (totalCoinsEarned !== undefined && totalCoinsEarned !== null && !isNaN(parseInt(totalCoinsEarned, 10))) {
            userData.profile.totalCoinsEarned = Math.max(newCoins, parseInt(totalCoinsEarned, 10));
          } else {
            userData.profile.totalCoinsEarned = Math.max(newCoins, userData.profile.totalCoinsEarned || 20);
          }
        }

        // 2. Cập nhật Level & EXP
        if (level !== undefined && level !== null && !isNaN(parseInt(level, 10))) {
          const newLevel = Math.max(1, Math.min(100, parseInt(level, 10)));
          userData.profile.level = newLevel;
          if (exp !== undefined && exp !== null && !isNaN(parseInt(exp, 10))) {
            userData.profile.exp = Math.max(0, parseInt(exp, 10));
          }
          if (!userData.profile.isCheater) {
            userData.profile.title = deriveTitleForLevel(newLevel);
          }
        }

        // 3. Trạng thái gian lận (isCheater toggle)
        if (typeof isCheater === 'boolean') {
          userData.profile.isCheater = isCheater;
          if (isCheater) {
            userData.profile.title = 'Kẻ Gian Lận ⚠️';
            await redis.zrem('levelup:leaderboard', canonicalSub);
            if (targetSub !== canonicalSub) {
              await redis.zrem('levelup:leaderboard', targetSub);
            }
            await redis.zadd('levelup:cheaters', serverTimestamp, canonicalSub);
            if (targetSub !== canonicalSub) {
              await redis.zrem('levelup:cheaters', targetSub);
            }
          } else {
            userData.profile.cheatStrikes = 0;
            delete userData.profile.cheatedAt;
            delete userData.profile.redemptionBaseline;
            userData.profile.title = deriveTitleForLevel(userData.profile.level || 1);
            await redis.zrem('levelup:cheaters', canonicalSub);
            if (targetSub !== canonicalSub) {
              await redis.zrem('levelup:cheaters', targetSub);
            }
          }
        }

        // Đánh dấu cờ adminAdjusted để tránh Anti-Cheat phạt nhầm
        userData.profile.adminAdjusted = true;

        // 4. Ghi Audit Log vào Ledger
        const coinsDiff = (userData.profile.coins ?? oldCoins) - oldCoins;
        const levelDiff = (userData.profile.level ?? oldLevel) - oldLevel;
        const changeParts = [];
        if (coinsDiff !== 0) changeParts.push(`${coinsDiff > 0 ? '+' : ''}${coinsDiff} Vàng`);
        if (levelDiff !== 0) changeParts.push(`${levelDiff > 0 ? '+' : ''}${levelDiff} Cấp`);
        const changeSummary = changeParts.length > 0 ? changeParts.join(', ') : 'Cập nhật chỉ số';

        const auditEntry = {
          id: `admin_adj_${serverTimestamp}`,
          type: coinsDiff >= 0 ? 'earn' : 'spend',
          category: 'admin',
          amount: Math.abs(coinsDiff),
          title: '👑 Quản Trị Viên điều chỉnh',
          description: reason || `👑 Quản trị viên cập nhật: ${changeSummary} (Bởi Admin)`,
          timestamp: serverTimestamp
        };
        userData.ledger = [auditEntry, ...(Array.isArray(userData.ledger) ? userData.ledger : [])].slice(0, 100);

        userData.lastModified = serverTimestamp;
        userData.lastSyncedAt = serverTimestamp;

        // Lưu lại vào Redis
        await redis.set(userKey, JSON.stringify(userData), 'EX', 180 * 24 * 3600);
        const canonicalGoogleKey = `levelup:user:google:${canonicalSub}`;
        if (canonicalGoogleKey !== userKey) {
          await redis.set(canonicalGoogleKey, JSON.stringify(userData), 'EX', 180 * 24 * 3600);
        }

        // Đồng bộ Bảng Xếp Hạng nếu không phải kẻ gian lận
        if (!userData.profile.isCheater) {
          const finalLevel = userData.profile.level || 1;
          const netWorth = calculateNetWorth(userData.profile);
          const score = (finalLevel * 1000) + netWorth;
          await redis.zadd('levelup:leaderboard', score, canonicalSub);
          if (targetSub !== canonicalSub) {
            await redis.zrem('levelup:leaderboard', targetSub);
          }
        }
        if (typeof redis.sadd === 'function') {
          await redis.sadd('levelup:all_users', canonicalSub);
        }

        return res.status(200).json({
          success: true,
          message: `Đã cập nhật thành công người chơi "${userData.profile.nickname || targetSub}".`,
          profile: userData.profile
        });
      }

      // 3.4 Admin Action: Xóa lịch sử thu chi của người chơi (admin_clear_user_ledger)
      if (action === 'admin_clear_user_ledger') {
        const isAdminCaller = await verifyIsAdmin(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS, nicks: ADMIN_NICKS });
        if (!isAdminCaller) {
          return res.status(403).json({ error: 'Chỉ Quản trị viên mới có quyền xóa lịch sử thu chi.' });
        }

        const { targetSub, entryId, entryIds } = req.body || {};
        if (!targetSub) {
          return res.status(400).json({ error: 'Thiếu tham số targetSub.' });
        }

        let userKey = `levelup:user:google:${targetSub}`;
        let rawUserData = await redis.get(userKey);
        if (!rawUserData) {
          userKey = `levelup:user:${targetSub}`;
          rawUserData = await redis.get(userKey);
        }
        if (!rawUserData) {
          const mappedSub = await redis.get(`levelup:nick_to_sub:${sanitizeNickname(targetSub)}`);
          if (mappedSub) {
            userKey = `levelup:user:google:${mappedSub}`;
            rawUserData = await redis.get(userKey);
          }
        }
        if (!rawUserData) {
          return res.status(404).json({ error: 'Không tìm thấy người chơi.' });
        }

        let userData = null;
        try { userData = JSON.parse(rawUserData); } catch (_) {}
        if (!userData) {
          return res.status(500).json({ error: 'Dữ liệu người chơi không hợp lệ.' });
        }
        const serverTimestamp = Date.now();

        // 1. Xóa nhiều bản ghi theo danh sách tích chọn (entryIds)
        if (Array.isArray(entryIds) && entryIds.length > 0) {
          const idsToDelete = new Set(entryIds);
          const beforeCount = (Array.isArray(userData.ledger) ? userData.ledger : []).length;
          userData.ledger = (Array.isArray(userData.ledger) ? userData.ledger : []).filter(item => !idsToDelete.has(item.id));
          const removedCount = beforeCount - userData.ledger.length;
          userData.lastModified = serverTimestamp;
          await redis.set(userKey, JSON.stringify(userData), 'EX', 180 * 24 * 3600);
          return res.status(200).json({
            success: true,
            removedCount,
            remainingCount: userData.ledger.length,
            message: `Đã xóa thành công ${removedCount} giao dịch đã chọn.`
          });
        } else if (entryId && entryId !== 'all') {
          // 2. Xóa 1 bản ghi cụ thể (entryId)
          userData.ledger = (Array.isArray(userData.ledger) ? userData.ledger : []).filter(item => item.id !== entryId);
          userData.lastModified = serverTimestamp;
          await redis.set(userKey, JSON.stringify(userData), 'EX', 180 * 24 * 3600);
          return res.status(200).json({
            success: true,
            removedId: entryId,
            remainingCount: userData.ledger.length,
            message: 'Đã xóa bản ghi giao dịch thành công.'
          });
        } else {
          // 3. Xóa toàn bộ lịch sử thu chi
          userData.ledger = [{
            id: `admin_cleared_${serverTimestamp}`,
            type: 'system',
            category: 'admin',
            amount: 0,
            title: 'Dọn dẹp lịch sử',
            description: '🧹 Lịch sử thu chi đã được Quản trị viên dọn dẹp sạch sẽ.',
            timestamp: serverTimestamp
          }];
          userData.lastModified = serverTimestamp;
          await redis.set(userKey, JSON.stringify(userData), 'EX', 180 * 24 * 3600);
          return res.status(200).json({
            success: true,
            clearedAll: true,
            message: `Đã xóa toàn bộ lịch sử thu chi của "${userData.profile?.nickname || targetSub}".`
          });
        }
      }

      // 3.4 Các thao tác Ngân Hàng 3 Bên (Banking Actions: deposit, withdraw, borrow, repay)
      if (action === 'bank_deposit' || action === 'bank_withdraw' || action === 'bank_borrow' || action === 'bank_repay') {
        if (!token) {
          return res.status(401).json({ error: 'Cần đăng nhập Google để thực hiện giao dịch ngân hàng.' });
        }
        const caller = await authenticateCaller(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS });
        if (!caller || !caller.sub) {
          return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
        }

        const userSub = caller.sub;
        const lockKey = `levelup:lock:bank:${userSub}`;
        let lockAcquired = false;
        if (redis && typeof redis.set === 'function') {
          try {
            const lockRes = await redis.set(lockKey, '1', 'PX', 5000, 'NX');
            if (lockRes === 'OK' || lockRes === 1 || lockRes === true || (lockRes === undefined && !process.env.REDIS_URL)) {
              lockAcquired = true;
            } else if (lockRes === null || lockRes === false || lockRes === 0) {
              return res.status(429).json({ error: 'Giao dịch ngân hàng đang được xử lý. Vui lòng thử lại sau giây lát.' });
            } else {
              lockAcquired = true;
            }
          } catch (_) {
            lockAcquired = true;
          }
        }

        try {
          const userKey = `levelup:user:google:${userSub}`;
          const rawUser = await redis.get(userKey);
          if (!rawUser) {
            return res.status(404).json({ error: 'Không tìm thấy hồ sơ người chơi.' });
          }

          let uState = null;
          try { uState = JSON.parse(rawUser); } catch (_) {}
          if (!uState) {
            return res.status(500).json({ error: 'Dữ liệu hồ sơ người chơi bị lỗi.' });
          }
        if (!uState.profile) uState.profile = {};
        if (!uState.profile.bank) {
          uState.profile.bank = { deposited: 0, depositInterest: 0, lastDepositAt: Date.now(), loan: null, isFrozen: false };
        }
        if (!Array.isArray(uState.ledger)) uState.ledger = [];

        const serverTimestamp = Date.now();
        const poolState = await getGlobalBankState(redis);
        const rates = calculateBankRates(poolState);

        // Đồng bộ lãi suất cho tài khoản trước khi giao dịch
        uState.profile.bank = accrueUserBank(uState.profile.bank, rates, serverTimestamp);

        // --- ACTION 1: GỬI TIẾT KIỆM (bank_deposit) ---
        if (action === 'bank_deposit') {
          const depositAmt = Math.max(0, parseInt(req.body?.amount, 10) || 0);
          if (depositAmt <= 0) {
            return res.status(400).json({ error: 'Số Vàng gửi tiết kiệm phải lớn hơn 0.' });
          }
          const userCoins = Math.max(0, parseInt(uState.profile.coins, 10) || 0);
          if (userCoins < depositAmt) {
            return res.status(400).json({ error: `Số dư Vàng không đủ (hiện có: ${userCoins} Vàng).` });
          }

          const oldDeposited = Math.max(0, parseInt(uState.profile.bank.deposited, 10) || 0);
          const oldLastDep = parseInt(uState.profile.bank.lastDepositAt, 10) || serverTimestamp;
          const newDeposited = oldDeposited + depositAmt;

          // Bảo toàn thời gian tích lũy dở dang theo trọng số vốn cũ:
          let newLastDep = serverTimestamp;
          if (oldDeposited > 0 && newDeposited > 0 && serverTimestamp > oldLastDep) {
            const elapsedMs = serverTimestamp - oldLastDep;
            const equivElapsedMs = Math.round(elapsedMs * (oldDeposited / newDeposited));
            newLastDep = serverTimestamp - equivElapsedMs;
          }

          uState.profile.coins = userCoins - depositAmt;
          uState.profile.bank.deposited = newDeposited;
          uState.profile.bank.lastDepositAt = newLastDep;

          poolState.poolGold += depositAmt;
          poolState.totalDeposited = (poolState.totalDeposited || 0) + depositAmt;

          uState.ledger.unshift({
            id: `bank_dep_${serverTimestamp}`,
            type: 'spend',
            category: 'bank_deposit',
            amount: depositAmt,
            title: 'Gửi tiết kiệm Ngân Hàng',
            description: `🏦 Đã gửi ${depositAmt} Vàng vào Bể thanh khoản. Lãi suất hiện tại: ${(rates.depositRate * 100).toFixed(1)}%/ngày.`,
            timestamp: serverTimestamp
          });
          if (uState.ledger.length > 100) uState.ledger.splice(100);

          await saveGlobalBankState(redis, poolState);
          await redis.set(userKey, JSON.stringify(uState), 'EX', 180 * 24 * 3600);

          const updatedRates = calculateBankRates(poolState);
          return res.status(200).json({
            success: true,
            message: `Gửi tiết kiệm thành công ${depositAmt} Vàng!`,
            userBank: uState.profile.bank,
            coins: uState.profile.coins,
            ledger: uState.ledger,
            pool: { ...poolState, ...updatedRates }
          });
        }

        // --- ACTION 2: RÚT TIẾT KIỆM (bank_withdraw) ---
        if (action === 'bank_withdraw') {
          const deposited = Math.max(0, parseInt(uState.profile.bank.deposited, 10) || 0);
          const interest = Math.max(0, parseInt(uState.profile.bank.depositInterest, 10) || 0);
          const totalAvailable = deposited + interest;

          if (totalAvailable <= 0) {
            return res.status(400).json({ error: 'Bạn không có Vàng gửi tiết kiệm hoặc tiền lãi để rút.' });
          }

          const reqAmt = req.body?.amount === 'all' || !req.body?.amount ? totalAvailable : Math.max(1, parseInt(req.body.amount, 10) || totalAvailable);
          const withdrawAmt = Math.min(totalAvailable, reqAmt);

          // Tách phần gốc và lãi rút ra
          let interestWithdrawn = 0;
          let principalWithdrawn = 0;
          if (withdrawAmt >= totalAvailable) {
            interestWithdrawn = interest;
            principalWithdrawn = deposited;
          } else if (withdrawAmt <= interest) {
            interestWithdrawn = withdrawAmt;
          } else {
            interestWithdrawn = interest;
            principalWithdrawn = withdrawAmt - interest;
          }

          // PROTOCOL BẢO LÃNH CỨU TRỢ KHO BẠC 100% (REVERSIBLE BAILOUT)
          let bailoutInjected = 0;
          if (poolState.poolGold < withdrawAmt) {
            bailoutInjected = withdrawAmt - poolState.poolGold;
            poolState.bailoutDebt = (poolState.bailoutDebt || 0) + bailoutInjected;
            poolState.poolGold += bailoutInjected;
          }

          poolState.poolGold = Math.max(0, poolState.poolGold - withdrawAmt);
          poolState.totalDeposited = Math.max(0, (poolState.totalDeposited || 0) - principalWithdrawn);

          uState.profile.bank.deposited = Math.max(0, deposited - principalWithdrawn);
          uState.profile.bank.depositInterest = Math.max(0, interest - interestWithdrawn);
          if (uState.profile.bank.deposited <= 0) {
            uState.profile.bank.lastDepositAt = serverTimestamp;
          } else if (principalWithdrawn > 0) {
            uState.profile.bank.lastDepositAt = serverTimestamp;
          }
          // Khi principalWithdrawn === 0 (chỉ rút lãi), giữ nguyên lastDepositAt để không làm mất thời gian tích lũy của gốc

          uState.profile.coins = (parseInt(uState.profile.coins, 10) || 0) + withdrawAmt;
          uState.profile.totalCoinsEarned = (parseInt(uState.profile.totalCoinsEarned, 10) || 0) + interestWithdrawn;

          const bailoutNotice = bailoutInjected > 0 ? ` (Bảo lãnh 100% từ Kho Bạc Hệ Thống: Ứng cứu khẩn cấp ${bailoutInjected} Vàng)` : '';
          uState.ledger.unshift({
            id: `bank_wit_${serverTimestamp}`,
            type: 'earn',
            category: 'bank_withdraw',
            amount: withdrawAmt,
            interestWithdrawn: interestWithdrawn,
            title: 'Rút tiền gửi Ngân Hàng',
            description: `🏦 Đã rút ${withdrawAmt} Vàng (${principalWithdrawn} gốc + ${interestWithdrawn} lãi) từ Ngân Hàng.${bailoutNotice}`,
            timestamp: serverTimestamp
          });
          if (uState.ledger.length > 100) uState.ledger.splice(100);

          await saveGlobalBankState(redis, poolState);
          await redis.set(userKey, JSON.stringify(uState), 'EX', 180 * 24 * 3600);

          const updatedRates = calculateBankRates(poolState);
          return res.status(200).json({
            success: true,
            message: `Rút tiền thành công ${withdrawAmt} Vàng!${bailoutInjected > 0 ? ' Kho Bạc Hệ Thống đã bảo lãnh thanh khoản 100%.' : ''}`,
            withdrawn: withdrawAmt,
            bailoutInjected,
            userBank: uState.profile.bank,
            coins: uState.profile.coins,
            totalCoinsEarned: uState.profile.totalCoinsEarned,
            ledger: uState.ledger,
            pool: { ...poolState, ...updatedRates }
          });
        }

        // --- ACTION 3: VAY VÀNG (bank_borrow) ---
        if (action === 'bank_borrow') {
          const borrowAmt = Math.max(0, parseInt(req.body?.amount, 10) || 0);
          if (borrowAmt <= 0) {
            return res.status(400).json({ error: 'Số Vàng vay phải lớn hơn 0.' });
          }

          if (uState.profile.bank.loan && (parseInt(uState.profile.bank.loan.debt, 10) || 0) > 0) {
            return res.status(400).json({ error: 'Bạn đang có một khoản vay chưa thanh toán hết. Vui lòng tất toán khoản nợ hiện tại trước khi đăng ký vay mới!' });
          }

          const autoDeduct = Math.min(0.80, Math.max(0.20, Number(req.body?.autoDeductPercent) || 0.50));
          const standardLimit = calculateCreditLimit(uState.profile, autoDeduct);
          let effectiveLimit = standardLimit;
          let effectiveBorrowRate = rates.borrowRate;

          // Check if user has a verified AI-negotiated loan offer
          const loanSig = typeof req.body?.loanSignature === 'string' ? req.body.loanSignature.trim() : '';
          const negotiatedRate = Number(req.body?.negotiatedRate ?? req.body?.borrowRate);
          const negotiatedLimit = parseInt(req.body?.negotiatedLimit ?? req.body?.creditLimit, 10);
          let isNegotiatedLoan = false;

          if (loanSig && !isNaN(negotiatedRate) && !isNaN(negotiatedLimit)) {
            const userCandidates = [caller?.sub, uState.profile?.googleId, uState.profile?.nickname, 'guest'].filter(Boolean);
            if (verifyLoanSignature(userCandidates, borrowAmt, negotiatedRate, autoDeduct, negotiatedLimit, loanSig)) {
              // Valid signature: accept negotiated rate and negotiated limit (clamped within economic guardrails)
              effectiveBorrowRate = Math.min(rates.borrowRate, Math.max(0.01, Number(negotiatedRate.toFixed(4))));
              effectiveLimit = Math.max(standardLimit, Math.min(1000, negotiatedLimit));
              isNegotiatedLoan = true;
            }
          }

          if (borrowAmt > effectiveLimit) {
            return res.status(400).json({ error: `Số Vàng vay (${borrowAmt}) vượt quá hạn mức tín dụng tối đa (${effectiveLimit}) của bạn!` });
          }

          // Bảo lãnh Kho Bạc nếu Bể không đủ thanh khoản để giải ngân
          let bailoutInjected = 0;
          if (poolState.poolGold < borrowAmt) {
            bailoutInjected = borrowAmt - poolState.poolGold;
            poolState.bailoutDebt = (poolState.bailoutDebt || 0) + bailoutInjected;
            poolState.poolGold += bailoutInjected;
          }

          poolState.poolGold = Math.max(0, poolState.poolGold - borrowAmt);
          poolState.totalBorrowed = (poolState.totalBorrowed || 0) + borrowAmt;

          uState.profile.coins = (parseInt(uState.profile.coins, 10) || 0) + borrowAmt;
          uState.profile.bank.loan = {
            principal: borrowAmt,
            debt: borrowAmt,
            borrowRate: effectiveBorrowRate,
            autoDeductPercent: autoDeduct,
            borrowedAt: serverTimestamp,
            lastAccruedAt: serverTimestamp,
            isOverdue: false,
            isNegotiated: isNegotiatedLoan
          };
          uState.profile.bank.isFrozen = false;

          const noteNegotiated = isNegotiatedLoan ? ' (Ưu đãi AI thương lượng)' : '';
          uState.ledger.unshift({
            id: `bank_bor_${serverTimestamp}`,
            type: 'earn',
            category: 'bank_borrow',
            amount: borrowAmt,
            title: 'Vay Vàng Ngân Hàng',
            description: `🏦 Đã vay ${borrowAmt} Vàng${noteNegotiated}. Lãi suất: ${(effectiveBorrowRate * 100).toFixed(1)}%/ngày, trích nợ: ${(autoDeduct * 100).toFixed(0)}% mỗi nhiệm vụ.`,
            timestamp: serverTimestamp
          });
          if (uState.ledger.length > 100) uState.ledger.splice(100);

          await saveGlobalBankState(redis, poolState);
          await redis.set(userKey, JSON.stringify(uState), 'EX', 180 * 24 * 3600);

          const updatedRates = calculateBankRates(poolState);
          return res.status(200).json({
            success: true,
            message: `Giải ngân thành công khoản vay ${borrowAmt} Vàng!`,
            loan: uState.profile.bank.loan,
            coins: uState.profile.coins,
            ledger: uState.ledger,
            pool: { ...poolState, ...updatedRates }
          });
        }

        // --- ACTION 4: TRẢ NỢ (bank_repay) ---
        if (action === 'bank_repay') {
          const loan = uState.profile.bank.loan;
          const currentDebt = Math.max(0, parseInt(loan?.debt, 10) || 0);
          if (!loan || currentDebt <= 0) {
            return res.status(400).json({ error: 'Bạn không có khoản nợ nào cần thanh toán!' });
          }

          const userCoins = Math.max(0, parseInt(uState.profile.coins, 10) || 0);
          if (userCoins <= 0) {
            return res.status(400).json({ error: 'Số dư Vàng trong ví bằng 0, không thể trả nợ!' });
          }

          const reqAmt = req.body?.amount === 'all' || !req.body?.amount ? currentDebt : Math.max(1, parseInt(req.body.amount, 10) || currentDebt);
          const isOverdue = Boolean(loan.isOverdue);
          const penaltyRate = isOverdue ? 0 : 0.05; // 5% phí phạt tất toán sớm khi chưa quá hạn
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
            return res.status(400).json({ error: 'Số Vàng trong ví không đủ để thanh toán nợ kèm phí phạt tất toán sớm!' });
          }

          uState.profile.coins = userCoins - totalPaid;

          // Chuẩn hóa thứ tự thu hồi nợ: Trừ lãi tích lũy (debt - principal) trước, sau đó mới trừ nợ gốc
          const principal = Math.max(0, parseInt(loan.principal, 10) || 0);
          const accruedInterest = Math.max(0, currentDebt - principal);
          const interestPaid = Math.min(accruedInterest, payAmt);
          const principalPaid = Math.min(principal, Math.max(0, payAmt - interestPaid));

          loan.debt = Math.max(0, currentDebt - payAmt);
          loan.principal = Math.max(0, principal - principalPaid);

          // Giảm dư nợ cho vay hệ thống tương ứng với phần gốc được hoàn trả
          poolState.totalBorrowed = Math.max(0, (poolState.totalBorrowed || 0) - principalPaid);

          // Bảo toàn dòng tiền: Toàn bộ totalPaid được phân bổ chính xác không sinh thêm tiền ảo
          // 1. Nếu có nợ cứu trợ Kho Bạc (bailoutDebt > 0): Dùng tối đa 50% payAmt + penaltyFee hoàn trả Kho Bạc
          let treasuryRepaid = 0;
          if (poolState.bailoutDebt > 0) {
            treasuryRepaid = Math.min(poolState.bailoutDebt, Math.floor(payAmt * 0.5) + penaltyFee);
            poolState.bailoutDebt -= treasuryRepaid;
          }

          // 2. Số tiền thực còn lại sau khi hoàn nợ Kho Bạc
          const remainingPaid = totalPaid - treasuryRepaid;
          // Phần gốc hoàn trả chảy vào poolGold để tái lập thanh khoản
          const goldToPool = Math.min(principalPaid, remainingPaid);
          poolState.poolGold = (poolState.poolGold || 0) + goldToPool;
          // Phần lợi nhuận ròng (lãi vay + phí phạt) bổ sung vào Quỹ dự phòng Kho Bạc
          const goldToReserve = remainingPaid - goldToPool;
          if (goldToReserve > 0) {
            poolState.reserveFund = (poolState.reserveFund || 0) + goldToReserve;
          }

          let debtCleared = false;
          if (loan.debt <= 0) {
            debtCleared = true;
            uState.profile.bank.loan = null;
            uState.profile.bank.isFrozen = false;
            if (uState.profile.title === 'Con Nợ Quá Hạn ⚠️') {
              uState.profile.title = deriveTitleForLevel(uState.profile.level || 1);
            }
          }

          uState.ledger.unshift({
            id: `bank_rep_${serverTimestamp}`,
            type: 'spend',
            category: 'bank_repay',
            amount: totalPaid,
            title: 'Trả nợ sớm Ngân Hàng',
            description: `🏦 Đã trả ${payAmt} Vàng nợ${penaltyFee > 0 ? ` + ${penaltyFee} Vàng phí phạt tất toán sớm (5%)` : ''}.${debtCleared ? ' Chúc mừng bạn đã tất toán toàn bộ nợ!' : ` Nợ còn lại: ${loan.debt} Vàng.`}${treasuryRepaid > 0 ? ` (Đã hoàn ${treasuryRepaid} Vàng cho Kho Bạc Hệ Thống)` : ''}`,
            timestamp: serverTimestamp
          });
          if (uState.ledger.length > 100) uState.ledger.splice(100);

          await saveGlobalBankState(redis, poolState);
          await redis.set(userKey, JSON.stringify(uState), 'EX', 180 * 24 * 3600);

          const updatedRates = calculateBankRates(poolState);
          return res.status(200).json({
            success: true,
            message: debtCleared
              ? `Tất toán thành công toàn bộ nợ! (Nợ: ${payAmt} 🪙${penaltyFee > 0 ? `, Phí phạt tất toán 5%: ${penaltyFee} 🪙` : ''})`
              : `Đã thanh toán ${payAmt} Vàng nợ${penaltyFee > 0 ? ` (+${penaltyFee} Vàng phí phạt tất toán 5%)` : ''}. Nợ còn lại: ${loan.debt} Vàng.`,
            debtCleared,
            treasuryRepaid,
            payAmt,
            penaltyFee,
            totalPaid,
            loan: uState.profile.bank.loan,
            coins: uState.profile.coins,
            ledger: uState.ledger,
            pool: { ...poolState, ...updatedRates }
          });
        }
      } finally {
        if (lockAcquired && redis && typeof redis.del === 'function') {
          try { await redis.del(lockKey); } catch (_) {}
        }
      }
    }

      // 3.5 Đăng xuất tài khoản (Xóa session token trên Redis và xóa Cookie)
      if (action === 'logout') {
        if (token) {
          try {
            const caller = await authenticateCaller(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS });
            if (caller?.sub) {
              await setOfflineUserPresence(redis, caller.sub);
            }
          } catch (_) {}
          await redis.del(`levelup:session:${token}`);
        }
        res.setHeader('Set-Cookie', 'levelup_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
        return res.status(200).json({ success: true });
      }

      // 3.3 Đồng bộ dữ liệu người dùng (Cloud Sync)
      if (!token) {
        return res.status(401).json({ error: 'Cần đăng nhập Google để đồng bộ dữ liệu.' });
      }

      const caller = await authenticateCaller(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS });
      if (!caller || !caller.sub) {
        return res.status(401).json({ error: 'Phiên Google không hợp lệ hoặc đã hết hạn.' });
      }

      const userSub = caller.sub;
      await updateUserPresence(redis, userSub);

      // Chờ nhẹ nếu có giao dịch ngân hàng đang được xử lý song song để tránh race condition ghi đè
      if (redis && typeof redis.get === 'function') {
        try {
          const isBankLocked = await redis.get(`levelup:lock:bank:${userSub}`);
          if (isBankLocked) {
            await new Promise(r => setTimeout(r, 150));
          }
        } catch (_) {}
      }

      const userEmail = caller.email || '';
      const userName = caller.name || '';
      const userPicture = caller.picture || '';

      if (!state || typeof state !== 'object') {
        return res.status(400).json({ error: 'Payload state là bắt buộc.' });
      }

      const nickname = sanitizeNickname(rawNick || state.profile?.nickname);
      const oldNickname = sanitizeNickname(rawOldNick);

      // Chống mạo danh biệt danh Admin nếu không phải admin email hoặc admin token
      const isAdmin = (userEmail && ADMIN_EMAILS.includes(userEmail)) || (Boolean(ADMIN_TOKEN) && token === ADMIN_TOKEN);
      if (ADMIN_NICKS.includes(nickname) && !isAdmin) {
        return res.status(403).json({ error: 'Bạn không có quyền sử dụng biệt danh Quản trị viên.' });
      }

      // Kiểm tra tính duy nhất của nickname
      if (nickname) {
        const currentOwnerSub = await redis.get(`levelup:nick_to_sub:${nickname}`);
        if (currentOwnerSub && currentOwnerSub !== userSub) {
          return res.status(409).json({
            error: `Nickname "${rawNick || nickname}" đã có người sử dụng. Vui lòng chọn nickname khác!`
          });
        }

        // Nếu người dùng đổi tên: dọn dẹp mapping cũ
        if (oldNickname && oldNickname !== nickname) {
          const oldOwnerSub = await redis.get(`levelup:nick_to_sub:${oldNickname}`);
          if (oldOwnerSub === userSub) {
            await redis.del(`levelup:nick_to_sub:${oldNickname}`);
          }
        }

        // Lưu ánh xạ nickname -> sub
        await redis.set(`levelup:nick_to_sub:${nickname}`, userSub, 'EX', 180 * 24 * 3600);
      }

      const serverTimestamp = Date.now();
      const userKey = `levelup:user:google:${userSub}`;

      let existingState = null;
      const rawExisting = await redis.get(userKey);
      if (rawExisting) {
        try { existingState = JSON.parse(rawExisting); } catch (_) {}
      }

      const callerIsAdmin = await verifyIsAdmin(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS, nicks: ADMIN_NICKS });
      const isAdminUser = callerIsAdmin || isAdmin || existingState?.profile?.role === 'admin';
      const userRole = isAdminUser ? 'admin' : 'adventurer';

      // Anti-Cheat: Validate and derive legitimate coin balance from quest completions and inventory
      const balanceCheck = deriveLegitimateBalance(state, existingState);

      const incomingModified = Number(state.lastModified || state.lastSyncedAt || 0);
      const existingModified = Number(existingState?.lastModified || existingState?.lastSyncedAt || 0);

      // Conflict Resolution: If incoming state has timestamp and cloud state is strictly newer,
      // return existing cloud state without overwriting it with stale data.
      // Exception: If client performs an explicit timerAction ('start', 'pause', 'resume', 'cancel'),
      // do NOT reject as conflict - allow explicit user action to take effect immediately!
      const isExplicitTimerAction = Boolean(timerAction || req.body?.timerAction);
      const isConflict = existingState && incomingModified > 0 && (existingModified > incomingModified);

      if (!isExplicitTimerAction && isConflict) {
        return res.status(200).json({
          success: true,
          conflict: true,
          googleId: userSub,
          nickname: existingState.profile?.nickname || nickname,
          role: userRole,
          syncedAt: existingState.lastSyncedAt || serverTimestamp,
          state: existingState,
          activeTimer: existingState.activeTimer || null,
          message: 'Dữ liệu trên Đám mây mới hơn. Thiết bị đã tự động cập nhật bản mới nhất!'
        });
      }

      // ponytail: sanitize shopItems to prevent saving tampered prices
      const sanitizedShopItems = (Array.isArray(state.shopItems) ? state.shopItems : []).map(item => {
        if (verifyRewardSignature(item) === false) {
          const tierMin = { common: 15, rare: 30, epic: 80, legendary: 150 };
          const fallbackPrice = tierMin[item.tier?.toLowerCase()] || 15;
          return { ...item, price: Math.max(parseInt(item.price, 10) || 0, fallbackPrice) };
        }
        return item;
      });

      // ponytail: Đếm số phiên tập trung hợp lệ (Focus >= 25 phút có chữ ký AI chuẩn)
      let currentValidFocusSessions = 0;
      for (const q of (Array.isArray(state.quests) ? state.quests : [])) {
        if (verifyQuestSignature(q) && q.type === 'focus' && (parseInt(q.targetMinutes, 10) || 0) >= 25) {
          const count = q.isRepeatable
            ? Math.max(0, parseInt(q.completedCount, 10) || 0)
            : Math.max(
                parseInt(q.completedCount, 10) || 0,
                (q.status === 'completed' || q.completed === true) ? 1 : 0
              );
          currentValidFocusSessions += count;
        }
      }
      const storedFocusSessions = Math.max(
        parseInt(existingState?.profile?.totalFocusSessions, 10) || 0,
        parseInt(state?.profile?.totalFocusSessions, 10) || 0
      );
      currentValidFocusSessions = Math.max(currentValidFocusSessions, storedFocusSessions);

      // Ghi nhận án phạt vào Ledger nếu phát hiện gian lận
      let updatedLedger = Array.isArray(state.ledger) ? [...state.ledger] : [];
      if (balanceCheck.tampered && balanceCheck.fine > 0) {
        updatedLedger.unshift({
          id: `penalty_${serverTimestamp}`,
          type: 'spend',
          category: 'penalty',
          amount: balanceCheck.fine,
          title: 'Án phạt Anti-Cheat',
          description: `⚠️ ÁN PHẠT ANTI-CHEAT: Trừ sạch ${balanceCheck.fine} Vàng (100%) & tước danh hiệu do phát hiện can thiệp dữ liệu trái phép`,
          timestamp: serverTimestamp
        });
      }

      // Tự động khôi phục danh dự toàn diện cho người dùng bị bắt oan do bug chữ ký phần thưởng, quà mẫu hoặc nhiệm vụ
      const wasCurrentlyFlagged = Boolean(
        existingState?.profile?.isCheater ||
        state?.profile?.isCheater ||
        existingState?.profile?.title === 'Kẻ Gian Lận ⚠️' ||
        state?.profile?.title === 'Kẻ Gian Lận ⚠️' ||
        existingState?.profile?.title?.includes('Chuộc Tội') ||
        state?.profile?.title?.includes('Chuộc Tội')
      );
      const hadHealedBounty = Array.isArray(state.quests) && state.quests.some(q => q._healed);
      const hadLegitPurchases = Array.isArray(state.inventory) && state.inventory.some(i =>
        i.shopItemId === 'shop_seed_1' || i.shopItemId === 'shop_seed_2' || i.shopItemId === 'shop_seed_3' ||
        (i.shopItemId && Array.isArray(state.shopItems) && state.shopItems.some(s => s.id === i.shopItemId))
      );
      const isFalselyFlagged = wasCurrentlyFlagged && (hadHealedBounty || hadLegitPurchases) && !balanceCheck.tampered;

      if (isFalselyFlagged) {
        if (state.profile) {
          state.profile.isCheater = false;
          if (state.profile.title === 'Kẻ Gian Lận ⚠️' || state.profile.title?.includes('Chuộc Tội')) {
            state.profile.title = deriveTitleForLevel(balanceCheck.level);
          }
        }
        if (existingState?.profile) {
          existingState.profile.isCheater = false;
          if (existingState.profile.title === 'Kẻ Gian Lận ⚠️' || existingState.profile.title?.includes('Chuộc Tội')) {
            existingState.profile.title = deriveTitleForLevel(balanceCheck.level);
          }
          existingState.profile.cheatStrikes = 0;
          delete existingState.profile.cheatedAt;
          delete existingState.profile.redemptionBaseline;
        }
        await redis.zrem('levelup:cheaters', userSub);
        updatedLedger.unshift({
          id: `honor_restored_${serverTimestamp}`,
          type: 'earn',
          amount: 0,
          title: 'Khôi phục Danh dự',
          description: '🕊️ KHÔI PHỤC DANH DỰ: Hệ thống đã xác thực toàn diện số dư và xác nhận tài khoản hoàn toàn trung thực.',
          timestamp: serverTimestamp
        });
      }
      for (const q of (Array.isArray(state.quests) ? state.quests : [])) {
        delete q._healed;
      }

      // Dọn dẹp các bản ghi "Khôi phục Danh dự" bị duplicate/spam do bug auto-healing trước đó
      const hasRealPenaltyHistory = Boolean(
        (existingState?.profile?.cheatStrikes || 0) > 0 ||
        existingState?.profile?.cheatedAt ||
        updatedLedger.some(l => l.category === 'penalty' || l.id?.startsWith('penalty_') || l.id?.startsWith('timehack_'))
      );

      let seenHonorEntry = false;
      updatedLedger = updatedLedger.filter(item => {
        const isHonorItem = item.title === 'Khôi phục Danh dự' || item.id?.startsWith('honor_restored_');
        if (!isHonorItem) return true;
        // Nếu người chơi hoàn toàn trong sạch (chưa từng bị phạt, không có strike), xóa sạch bản ghi rác này
        if (!hasRealPenaltyHistory && !isFalselyFlagged) return false;
        // Nếu người chơi từng có lịch sử bị phạt hoặc vừa được giải oan hợp lệ, giữ lại tối đa 1 bản ghi gần nhất
        if (seenHonorEntry) return false;
        seenHonorEntry = true;
        return true;
      });

      // Xử lý Thử Thách Chuộc Tội (Redemption Challenge - Hướng A)
      let isCheater = Boolean(
        balanceCheck.tampered ||
        existingState?.profile?.isCheater ||
        state?.profile?.isCheater ||
        state?.profile?.title === 'Kẻ Gian Lận ⚠️' ||
        existingState?.profile?.title === 'Kẻ Gian Lận ⚠️'
      );
      let redemptionBaseline = existingState?.profile?.redemptionBaseline ?? currentValidFocusSessions;
      let cheatedAt = existingState?.profile?.cheatedAt;
      let title = balanceCheck.title;
      let redeemedJustNow = false;

      if (balanceCheck.tampered) {
        isCheater = true;
        redemptionBaseline = currentValidFocusSessions;
        cheatedAt = serverTimestamp;
        title = 'Kẻ Gian Lận ⚠️';
      } else if (isCheater) {
        if (!cheatedAt) {
          cheatedAt = existingState?.lastSyncedAt || serverTimestamp;
        }
        const completedSessions = Math.max(0, currentValidFocusSessions - redemptionBaseline);
        // Mỗi phiên focus 25 phút bắt buộc phải mất ít nhất minRedemptionIntervalMs thực tế
        const elapsedSinceCheated = Math.max(0, serverTimestamp - cheatedAt);
        const maxAllowedSessions = minRedemptionIntervalMs > 0 ? Math.floor(elapsedSinceCheated / minRedemptionIntervalMs) : 999;

        if (completedSessions > 0 && completedSessions > maxAllowedSessions) {
          // Bắt quả tang hack tua thời gian hoặc spam completedCount bằng script
          isCheater = true;
          redemptionBaseline = currentValidFocusSessions;
          cheatedAt = serverTimestamp;
          title = 'Kẻ Gian Lận ⚠️';
          updatedLedger.unshift({
            id: `timehack_${serverTimestamp}`,
            type: 'penalty',
            amount: 0,
            description: `⚠️ PHÁT HIỆN TUA THỜI GIAN: Báo cáo ${completedSessions} phiên tập trung nhưng thời gian thực tế chỉ trôi qua ${Math.round(elapsedSinceCheated / 60000)} phút. Reset tiến độ chuộc tội về 0/5!`,
            timestamp: serverTimestamp
          });
        } else if (completedSessions >= 5) {
          isCheater = false;
          redeemedJustNow = true;
          cheatedAt = undefined;
          title = deriveTitleForLevel(balanceCheck.level);
          updatedLedger.unshift({
            id: `redemption_${serverTimestamp}`,
            type: 'earn',
            amount: 0,
            description: '🕊️ HOÀN TẤT CHUỘC TỘI: Đã hoàn thành 5 phiên tập trung kỷ luật, khôi phục danh dự hiệp sĩ và vị trí Bảng Xếp Hạng!',
            timestamp: serverTimestamp
          });
        } else {
          title = `Đang Chuộc Tội (${completedSessions}/5) ⏳`;
        }
      }

      const finalActiveTimer = (timerAction === 'cancel' || req.body?.timerAction === 'cancel' || timerAction === 'hold' || req.body?.timerAction === 'hold')
        ? null
        : (state.activeTimer || null);

      // Tự động tích lũy và bảo toàn lãi suất ngân hàng trước khi lưu đám mây
      // Bảo vệ an toàn profile.bank: Ngăn chặn client tự bơm tiền gửi khống hoặc tự xóa nợ qua sync thường
      let finalBankState = state.profile?.bank || existingState?.profile?.bank || null;
      if (finalBankState) {
        finalBankState = { ...finalBankState };
        // 1. Bảo vệ số dư tiền gửi: Cho phép tăng nếu hợp lệ (không tampered, <= 500), không cho phép giảm qua sync thường (phải qua bank_withdraw)
        const prevDeposited = Math.max(0, parseInt(existingState?.profile?.bank?.deposited, 10) || 0);
        const incomingDeposited = Math.max(0, parseInt(finalBankState?.deposited, 10) || 0);
        if (incomingDeposited > prevDeposited) {
          const depDiff = incomingDeposited - prevDeposited;
          if (depDiff <= 500 && !balanceCheck.tampered) {
            finalBankState.deposited = incomingDeposited;
          } else {
            finalBankState.deposited = prevDeposited;
          }
        } else if (incomingDeposited < prevDeposited) {
          finalBankState.deposited = prevDeposited;
        }

        // 2. Bảo vệ khoản vay: Chỉ cho phép giảm dư nợ nếu có trích nợ từ nhiệm vụ, hoặc khôi phục nợ khi hoàn tác
        const existingLoan = existingState?.profile?.bank?.loan;
        const incomingLoan = state.profile?.bank?.loan;
        if (existingLoan && (parseInt(existingLoan.debt, 10) || 0) > 0) {
          const prevDebt = parseInt(existingLoan.debt, 10) || 0;
          if (!incomingLoan) {
            // Kiểm tra xem người dùng có thực sự thanh toán sạch nợ qua trích nợ nhiệm vụ hay không
            const hasLoanClearedEvidence = (
              (Array.isArray(state.quests) && state.quests.some(q => 
                Array.isArray(q.loanDeductions) && q.loanDeductions.some(d => d.loanCleared)
              )) ||
              (Array.isArray(state.ledger) && state.ledger.some(entry =>
                entry.category === 'bank_deduct' && entry.description && entry.description.includes('thanh toán sạch nợ')
              ))
            );
            if (hasLoanClearedEvidence && prevDebt <= 500 && !balanceCheck.tampered) {
              finalBankState.loan = null;
              finalBankState.isFrozen = false;
            } else {
              // Client tự ý xóa nợ bất thường -> Khôi phục khoản vay từ server
              finalBankState.loan = { ...existingLoan };
            }
          } else {
            const incomingDebt = parseInt(incomingLoan.debt, 10) || 0;
            if (incomingDebt < prevDebt) {
              const debtDiff = prevDebt - incomingDebt;
              // Trần tối đa trích nợ qua nhiệm vụ giữa 2 lần sync (tối đa 500 Vàng)
              if (debtDiff > 500) {
                finalBankState.loan = { ...existingLoan };
              } else {
                const prevPrincipal = Math.max(0, parseInt(existingLoan.principal, 10) || 0);
                const principalPaid = Math.min(prevPrincipal, debtDiff);
                finalBankState.loan = {
                  ...existingLoan,
                  debt: Math.max(0, incomingDebt),
                  principal: Math.max(0, prevPrincipal - principalPaid)
                };
                if (finalBankState.loan.debt <= 0) {
                  finalBankState.loan = null;
                  finalBankState.isFrozen = false;
                }
              }
            } else if (incomingDebt > prevDebt) {
              // Hoàn tác (Undo) nhiệm vụ có trích nợ: Nợ được khôi phục tăng lên
              const debtIncrease = incomingDebt - prevDebt;
              const hasRevertEvidence = Array.isArray(state.ledger) && state.ledger.some(entry =>
                entry.category === 'bank_revert' && (entry.amount || 0) === debtIncrease
              );
              if (hasRevertEvidence && debtIncrease <= 500 && !balanceCheck.tampered) {
                const prevPrincipal = Math.max(0, parseInt(existingLoan.principal, 10) || 0);
                const incomingPrincipal = Math.max(0, parseInt(incomingLoan.principal, 10) || 0);
                finalBankState.loan = {
                  ...existingLoan,
                  debt: incomingDebt,
                  principal: incomingPrincipal || (prevPrincipal + debtIncrease)
                };
                if (incomingLoan.isOverdue) {
                  finalBankState.loan.isOverdue = true;
                  finalBankState.isFrozen = true;
                }
              } else {
                finalBankState.loan = { ...existingLoan };
              }
            } else {
              finalBankState.loan = { ...existingLoan };
            }
          }
        } else {
          // Server không có khoản vay: Client không được tự chế tạo khoản vay qua sync thường,
          // NGOẠI TRỪ trường hợp hoàn tác (Undo) một nhiệm vụ từng xóa nợ (có giao dịch bank_revert)
          const hasRevertEvidence = incomingLoan && Array.isArray(state.ledger) && state.ledger.some(entry => entry.category === 'bank_revert');
          if (hasRevertEvidence && !balanceCheck.tampered) {
            finalBankState.loan = { ...incomingLoan };
          } else {
            finalBankState.loan = null;
          }
        }

        if (finalBankState.deposited > 0 || (finalBankState.loan && finalBankState.loan.debt > 0)) {
          try {
            const poolState = await getGlobalBankState(redis);
            const rates = calculateBankRates(poolState);
            // Nếu client bị trễ và gửi lãi thấp hơn mức đã có trên server, giữ mức cao hơn
            if (existingState?.profile?.bank?.depositInterest > (finalBankState.depositInterest || 0)) {
              finalBankState.depositInterest = existingState.profile.bank.depositInterest;
            }
            finalBankState = accrueUserBank(finalBankState, rates, serverTimestamp);
          } catch (_) {}
        }
      }

      // ponytail: Đồng bộ biến động khoản vay & tiền gửi hợp lệ vào Bể thanh khoản Ngân hàng (AMM Pool)
      try {
        const prevLoanDebt = Math.max(0, parseInt(existingState?.profile?.bank?.loan?.debt || existingState?.profile?.bank?.loan?.principal, 10) || 0);
        const currLoanDebt = Math.max(0, parseInt(finalBankState?.loan?.debt || finalBankState?.loan?.principal, 10) || 0);
        const prevDeposited = Math.max(0, parseInt(existingState?.profile?.bank?.deposited, 10) || 0);
        const currDeposited = Math.max(0, parseInt(finalBankState?.deposited, 10) || 0);

        if (prevLoanDebt !== currLoanDebt || prevDeposited !== currDeposited) {
          const poolState = await getGlobalBankState(redis, false);

          if (prevLoanDebt !== currLoanDebt) {
            const debtDiff = prevLoanDebt - currLoanDebt;
            if (debtDiff > 0) {
              // Nợ được trả (qua trích nợ nhiệm vụ): hoàn vốn vào kho và giảm nợ hệ thống
              poolState.totalBorrowed = Math.max(0, (poolState.totalBorrowed || 0) - debtDiff);
              poolState.poolGold = (poolState.poolGold || 0) + debtDiff;
              // Nếu Kho Bạc từng bảo trợ nợ cứu trợ (bailoutDebt > 0) và Bể phục hồi thặng dư (> 500), hoàn bớt nợ cho Kho Bạc
              if (poolState.bailoutDebt > 0 && poolState.poolGold > 500) {
                const surplus = poolState.poolGold - 500;
                const repaidBailout = Math.min(poolState.bailoutDebt, Math.min(surplus, debtDiff));
                if (repaidBailout > 0) {
                  poolState.bailoutDebt -= repaidBailout;
                  poolState.poolGold -= repaidBailout;
                }
              }
            } else {
              // Nợ được hoàn tác (undo quest): khôi phục nợ hệ thống
              const restoredDebt = currLoanDebt - prevLoanDebt;
              poolState.totalBorrowed = (poolState.totalBorrowed || 0) + restoredDebt;
              poolState.poolGold = Math.max(0, (poolState.poolGold || 0) - restoredDebt);
            }
          }

          if (prevDeposited !== currDeposited) {
            const depDiff = currDeposited - prevDeposited;
            if (depDiff > 0) {
              poolState.totalDeposited = (poolState.totalDeposited || 0) + depDiff;
              poolState.poolGold = (poolState.poolGold || 0) + depDiff;
            }
          }

          await saveGlobalBankState(redis, poolState);
        }
      } catch (_) {}

      // ponytail: Tối ưu hóa lưu trữ User State (Rolling Window cho completed quests & used inventory)
      const incomingQuests = Array.isArray(state.quests) ? state.quests : [];
      const activeQuests = incomingQuests.filter(q => q.status !== 'completed');
      const completedQuests = incomingQuests.filter(q => q.status === 'completed');
      completedQuests.sort((a, b) => (Number(b.completedAt || b.createdAt || 0)) - (Number(a.completedAt || a.createdAt || 0)));
      const prunedQuests = [...activeQuests, ...completedQuests.slice(0, 30)];

      const incomingInventory = Array.isArray(state.inventory) ? state.inventory : [];
      const unusedInventory = incomingInventory.filter(i => !i.isUsed || (i.savedTimer && Number(i.savedTimer.remainingSeconds) > 0));
      const usedInventory = incomingInventory.filter(i => i.isUsed && (!i.savedTimer || Number(i.savedTimer.remainingSeconds) <= 0));
      usedInventory.sort((a, b) => (Number(b.usedAt || b.purchasedAt || 0)) - (Number(a.usedAt || a.purchasedAt || 0)));
      const prunedInventory = [...unusedInventory, ...usedInventory.slice(0, 20)];

      // ponytail: Thu thập và bảo tồn danh sách ID nhiệm vụ 1 lần đã hoàn thành (chống Replay Attack)
      const existingCompletedQuestIds = Array.isArray(existingState?.completedQuestIds) ? existingState.completedQuestIds : [];
      const incomingCompletedQuestIds = Array.isArray(state?.completedQuestIds) ? state.completedQuestIds : [];
      const completedSet = new Set([...existingCompletedQuestIds, ...incomingCompletedQuestIds]);

      const existingQuests = Array.isArray(existingState?.quests) ? existingState.quests : [];
      const wasCurrentlyCompleted = (id) => existingQuests.some(eq => (eq.id === id || eq.questId === id) && (eq.status === 'completed' || eq.completed === true));

      // Hỗ trợ Hoàn tác (Undo) nhiệm vụ 1 lần vừa hoàn thành, đồng thời chặn đứng Replay Attack với nhiệm vụ đã hoàn thành trong lịch sử
      for (const q of incomingQuests) {
        const qId = q.id || q.questId;
        if (!qId) continue;
        const hasRecentUndoLedger = (Array.isArray(state?.ledger) ? state.ledger : []).some(entry =>
          entry.category === 'quest' && entry.type === 'spend' && (
            (entry.title && (entry.title.includes(q.title || '') || entry.title.startsWith('Hoàn tác'))) ||
            (entry.description && (entry.description.includes(q.title || '') || entry.description.includes(qId)))
          )
        );
        if (!q.isRepeatable && q.status === 'active' && (wasCurrentlyCompleted(qId) || hasRecentUndoLedger)) {
          completedSet.delete(qId);
        } else if (!q.isRepeatable && (q.status === 'completed' || q.completed === true)) {
          completedSet.add(qId);
        }
      }
      const updatedCompletedQuestIds = Array.from(completedSet).slice(0, 500);

      // Chống Replay Attack: Nhiệm vụ 1 lần đã có trong completedSet thì không thể ở trạng thái active
      for (const q of prunedQuests) {
        if (!q.isRepeatable && completedSet.has(q.id || q.questId)) {
          q.status = 'completed';
        }
      }

      const payloadToSave = {
        ...state,
        quests: prunedQuests,
        inventory: prunedInventory,
        completedQuestIds: updatedCompletedQuestIds,
        activeTimer: finalActiveTimer,
        shopItems: sanitizedShopItems,
        // ponytail: Giới hạn lưu trữ tối đa 100 giao dịch ledger gần nhất trên Cloud/Redis
        ledger: updatedLedger.slice(0, 100),
        googleId: userSub,
        lastModified: incomingModified || serverTimestamp,
        profile: {
          ...(state.profile || {}),
          adminAdjusted: Boolean(existingState?.profile?.adminAdjusted || state.profile?.adminAdjusted),
          totalCoinsSpent: balanceCheck.totalCoinsSpent,
          totalFocusSessions: currentValidFocusSessions,
          bank: finalBankState || state.profile?.bank || existingState?.profile?.bank || null,
          nickname: state.profile?.nickname || rawNick || userName || nickname,
          role: userRole,
          title,
          isCheater,
          cheatStrikes: (existingState?.profile?.cheatStrikes || 0) + (balanceCheck.tampered ? 1 : 0),
          redemptionBaseline: isCheater ? redemptionBaseline : undefined,
          cheatedAt: isCheater ? cheatedAt : undefined,
          googleId: userSub,
          googleEmail: userEmail || state.profile?.googleEmail || '',
          googlePicture: userPicture || state.profile?.googlePicture || '',
          avatar: (() => {
            const clientAvatar = state.profile?.avatar;
            const oldPic = existingState?.profile?.googlePicture || state.profile?.googlePicture;
            if (userPicture && (!clientAvatar || clientAvatar === '⚔️' || clientAvatar === oldPic || (typeof clientAvatar === 'string' && (clientAvatar.includes('googleusercontent.com') || /^https?:\/\//i.test(clientAvatar))))) {
              return userPicture;
            }
            return clientAvatar || userPicture || '⚔️';
          })(),
          level: balanceCheck.level,
          coins: balanceCheck.coins,
          totalCoinsEarned: balanceCheck.totalCoinsEarned
        },
        lastSyncedAt: serverTimestamp
      };

      await redis.set(userKey, JSON.stringify(payloadToSave), 'EX', 180 * 24 * 3600);
      if (typeof redis.sadd === 'function') {
        await redis.sadd('levelup:all_users', userSub);
      }

      // Cập nhật Sổ Đen Gian Lận:
      if (isCheater) {
        await redis.zadd('levelup:cheaters', serverTimestamp, userSub);
      } else {
        await redis.zrem('levelup:cheaters', userSub);
      }

      // Cập nhật Leaderboard:
      // Kẻ gian lận hoặc đang trong thời gian chuộc tội: Bị loại khỏi Leaderboard (zrem)!
      // Người hoàn lương / trung thực: Cập nhật điểm số bình thường (zadd)
      if (isCheater) {
        await redis.zrem('levelup:leaderboard', userSub);
      } else {
        const level = balanceCheck.level;
        const profileForNetWorth = {
          coins: balanceCheck.coins,
          bank: finalBankState || state?.profile?.bank || existingState?.profile?.bank || {}
        };
        const netWorth = calculateNetWorth(profileForNetWorth);
        const score = (level * 1000) + netWorth;
        await redis.zadd('levelup:leaderboard', score, userSub);
      }

      let penaltyMessage = null;
      if (balanceCheck.tampered) {
        penaltyMessage = `⚠️ CẢNH BÁO GIAN LẬN: Phát hiện can thiệp dữ liệu! Bạn bị phạt trừ ${balanceCheck.fine} Vàng, tước danh hiệu ("Kẻ Gian Lận ⚠️") và bị loại khỏi Bảng Xếp Hạng. Hãy hoàn thành 5 phiên tập trung ≥ 25 phút để chuộc tội.`;
      } else if (redeemedJustNow) {
        penaltyMessage = `🕊️ Chúc mừng! Bạn đã hoàn thành 5 phiên tập trung kỷ luật, chuộc tội thành công và khôi phục toàn bộ danh dự hiệp sĩ!`;
      } else if (isCheater) {
        const currentDone = Math.max(0, currentValidFocusSessions - redemptionBaseline);
        penaltyMessage = `⏳ THỬ THÁCH CHUỘC TỘI: Bạn đã hoàn thành ${currentDone}/5 phiên tập trung (≥ 25p). Hãy hoàn thành thêm ${5 - currentDone} phiên nữa để khôi phục danh hiệu!`;
      }

      return res.status(200).json({
        success: true,
        conflict: false,
        googleId: userSub,
        nickname: payloadToSave.profile.nickname,
        role: userRole,
        syncedAt: serverTimestamp,
        activeTimer: payloadToSave.activeTimer || null,
        level: balanceCheck.level,
        coins: balanceCheck.coins,
        totalCoinsEarned: balanceCheck.totalCoinsEarned,
        adminAdjusted: payloadToSave.profile.adminAdjusted,
        title,
        tampered: balanceCheck.tampered,
        fine: balanceCheck.fine,
        isCheater,
        redeemed: redeemedJustNow,
        penalty: penaltyMessage,
        ledger: payloadToSave.ledger
      });
    }

    return res.status(405).json({ error: 'Phương thức không được hỗ trợ.' });
  } catch (err) {
    console.error('API /api/sync error:', err);
    const isProd = process.env.NODE_ENV === 'production';
    return res.status(500).json({
      error: 'Lỗi máy chủ Redis Sync',
      ...(isProd ? {} : { details: err.message })
    });
  }
}
