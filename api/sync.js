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

export function signQuest(title, type, targetMinutes, rewardCoins, requiresProof = false) {
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

export function verifyQuestSignature(q) {
  if (!q || typeof q !== 'object') return false;
  const canonicalId = q.questId || q.id;

  // 1. Kiểm tra chữ ký HMAC trước (ưu tiên chữ ký AI khi đã thẩm định hoặc thương lượng)
  if (q.signature) {
    const expected = signQuest(q.title, q.type, q.targetMinutes, q.rewardCoins, Boolean(q.requiresProof));
    if (q.signature === expected) return true;
    const legacyExpected = signQuestLegacy(q.title, q.type, q.targetMinutes, q.rewardCoins);
    if (q.signature === legacyExpected) return true;

    // Self-healing: if quest is type 'bounty' but client suffered 0 || 25 bug (targetMinutes === 25),
    // verify against targetMinutes = 0 and auto-repair
    if (q.type === 'bounty' && (parseInt(q.targetMinutes, 10) || 0) === 25) {
      const healingExpected = signQuest(q.title, 'bounty', 0, q.rewardCoins, Boolean(q.requiresProof));
      if (q.signature === healingExpected || q.signature === signQuestLegacy(q.title, 'bounty', 0, q.rewardCoins)) {
        q.targetMinutes = 0;
        q._healed = true;
        return true;
      }
    }
  }

  // 2. Kiểm tra nhiệm vụ mẫu mặc định (seed quests khi chưa thương lượng)
  if (canonicalId === 'q_seed_1') {
    return (parseInt(q.rewardCoins, 10) || 0) === 12 && (parseInt(q.targetMinutes, 10) || 0) === 25 && q.type === 'focus';
  }
  if (canonicalId === 'q_seed_2') {
    return (parseInt(q.rewardCoins, 10) || 0) === 5 && (parseInt(q.targetMinutes, 10) || 0) === 0 && q.type === 'bounty';
  }

  return false;
}

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

export function verifyRewardSignature(r, shopItems = []) {
  if (!r || typeof r !== 'object') return false;
  // Canonical ID: hỗ trợ cả Shop Item lẫn Inventory Item (r.shopItemId)
  const canonicalId = r.shopItemId || r.id;

  // 1. Kiểm tra chữ ký HMAC trước (ưu tiên chữ ký AI khi đã thẩm định hoặc thương lượng)
  const sig = r.signature || (Array.isArray(shopItems) && shopItems.find(s => s.id === canonicalId)?.signature);
  if (sig) {
    const targetM = parseInt(r.targetMinutes, 10) || 0;
    if (sig === signReward(r.name, r.price, r.tier, targetM)) return true;
    if (sig === signRewardLegacy(r.name, r.price, r.tier)) return true;
    if (targetM !== 0 && sig === signReward(r.name, r.price, r.tier, 0)) return true;

    // Đối chiếu với món quà gốc trong shopItems nếu là inventory item
    if (Array.isArray(shopItems) && canonicalId) {
      const parent = shopItems.find(s => s.id === canonicalId);
      if (parent) {
        const parentM = parseInt(parent.targetMinutes, 10) || 0;
        if (sig === signReward(parent.name, r.price, parent.tier, parentM)) return true;
        if (parent.signature && (sig === parent.signature || verifyRewardSignature(parent))) {
          if ((parseInt(r.price, 10) || 0) === (parseInt(parent.price, 10) || 0)) return true;
        }
      }
    }
  }

  // 2. Kiểm tra vật phẩm mẫu mặc định (seed items khi chưa thương lượng)
  if (canonicalId === 'shop_seed_1') return (parseInt(r.price, 10) || 0) === 35 && (r.tier || '').toLowerCase() === 'rare';
  if (canonicalId === 'shop_seed_2') return (parseInt(r.price, 10) || 0) === 20 && (r.tier || '').toLowerCase() === 'common';
  if (canonicalId === 'shop_seed_3') return [90, 120].includes(parseInt(r.price, 10) || 0) && (r.tier || '').toLowerCase() === 'epic';

  // 3. Kế thừa tính xác thực từ Cửa Hàng (Provenance cross-reference)
  if (Array.isArray(shopItems) && canonicalId) {
    const parent = shopItems.find(s => s.id === canonicalId);
    if (parent && (parseInt(r.price, 10) || 0) === (parseInt(parent.price, 10) || 0)) {
      return verifyRewardSignature(parent);
    }
  }

  return false;
}

/**
 * Anti-Cheat: Validate and derive legitimate coin balance from quests, ledger, and inventory
 * Cryptographically verifies AI signatures on quests and shop prices. Zero-trust: quests without AI signatures award 0 coins.
 */
export function deriveLegitimateBalance(state, existingState = null) {
  const quests = Array.isArray(state?.quests) ? state.quests : [];
  const inventory = Array.isArray(state?.inventory) ? state.inventory : [];

  let rawTotal = parseInt(state?.profile?.totalCoinsEarned, 10);
  let rawCoins = parseInt(state?.profile?.coins, 10);
  if (isNaN(rawTotal)) rawTotal = 20;
  if (isNaN(rawCoins)) rawCoins = rawTotal;

  let tampered = false;

  // 1. Quản lý tiền thưởng từ nhiệm vụ (Zero-Trust: 100% nhiệm vụ phải có chữ ký AI hợp lệ)
  let questEarned = 20; // Thưởng khởi đầu tân binh
  for (const q of quests) {
    // ponytail: cap repeatable count to 1000 to allow long-term habit tracking while preventing numeric overflow
    const count = q.isRepeatable
      ? Math.min(1000, Math.max(0, parseInt(q.completedCount, 10) || 0))
      : Math.min(1000, Math.max(
          parseInt(q.completedCount, 10) || 0,
          (q.status === 'completed' || q.completed === true) ? 1 : 0
        ));
    const isLegit = verifyQuestSignature(q);
    if (!isLegit) {
      // Chỉ phạt khi người dùng đã nhận thưởng (count > 0) từ nhiệm vụ không có chữ ký hợp lệ
      if (count > 0) {
        tampered = true;
      }
      continue;
    }
    const reward = Math.min(40, Math.max(1, parseInt(q.rewardCoins, 10) || 10));
    questEarned += reward * count;
  }

  // 2. Nguồn thu nhập hợp lệ duy nhất là từ nhiệm vụ đã kiểm định (chống giả mạo ledger)
  const maxTrackedEarned = Math.max(20, questEarned);

  // 3. Tổng chi tiêu cho vật phẩm kho đồ (bảo vệ giá phần thưởng chuẩn)
  const shopItems = Array.isArray(state?.shopItems) ? state.shopItems : [];
  let totalSpent = 0;
  for (const item of inventory) {
    const sigStatus = verifyRewardSignature(item, shopItems);
    let price = Math.max(0, parseInt(item.price, 10) || 0);
    if (sigStatus === false) {
      // Bị sửa giá trong DevTools (ví dụ từ 50 xuống 1) -> Khôi phục giá tối thiểu theo Tier
      const tierMin = { common: 20, rare: 40, epic: 80, legendary: 150 };
      const fallbackPrice = tierMin[item.tier?.toLowerCase()] || 25;
      price = Math.max(price, fallbackPrice);
      const declaredPrice = parseInt(item.price, 10) || 0;
      if (declaredPrice < fallbackPrice) {
        tampered = true;
      }
    }
    totalSpent += price;
  }

  // ponytail: Giới hạn mức tăng tối đa giữa 2 lần đồng bộ (500 vàng ~ 10 nhiệm vụ S-rank tối đa)
  // Ngăn chặn hành vi vào DevTools gán 999,999 Vàng hoặc bơm hàng ngàn quest giả
  const existingTotal = parseInt(existingState?.profile?.totalCoinsEarned, 10) || 0;
  const isAdminAdjusted = Boolean(
    existingState?.profile?.adminAdjusted ||
    state?.profile?.adminAdjusted ||
    existingState?.profile?.role === 'admin' ||
    state?.profile?.role === 'admin'
  );
  const maxAllowedCeiling = isAdminAdjusted
    ? Math.max(rawTotal, maxTrackedEarned)
    : (existingTotal > 0 ? existingTotal + 500 : maxTrackedEarned);

  if (rawTotal > maxAllowedCeiling) {
    rawTotal = existingTotal > 0 ? Math.min(existingTotal + 500, maxTrackedEarned) : maxTrackedEarned;
    tampered = true;
  }
  if (rawTotal < 0) {
    rawTotal = 0;
    tampered = true;
  }

  // Số coin hiện tại không thể lớn hơn (tổng kiếm được - tổng đã tiêu)
  if (isAdminAdjusted && rawCoins > rawTotal - totalSpent) {
    rawTotal = rawCoins + totalSpent;
  }
  const maxCurrent = Math.max(0, rawTotal - totalSpent);
  if (rawCoins > maxCurrent) {
    rawCoins = maxCurrent;
    tampered = true;
  }
  if (rawCoins < 0) {
    rawCoins = 0;
    tampered = true;
  }

  // 4. Anti-Cheat Level: Ngăn chặn can thiệp level 999,999 để thao túng Leaderboard
  let rawLevel = parseInt(state?.profile?.level, 10);
  if (isNaN(rawLevel) || rawLevel < 1) rawLevel = 1;
  const existingLevel = Math.max(1, parseInt(existingState?.profile?.level, 10) || 1);
  const maxAllowedLevel = isAdminAdjusted
    ? Math.max(rawLevel, existingLevel)
    : (existingTotal > 0
      ? existingLevel + 2
      : Math.min(10, Math.max(existingLevel, Math.floor(rawTotal / 40) + 1)));

  if (rawLevel > maxAllowedLevel) {
    rawLevel = existingTotal > 0 ? existingLevel + 1 : Math.min(maxAllowedLevel, 5);
    tampered = true;
  }
  rawLevel = Math.max(1, Math.min(100, rawLevel));

  // 5. Hình phạt trừng phạt gian lận (Anti-Cheat Sanctions)
  let title = deriveTitleForLevel(rawLevel);
  let fine = 0;
  if (tampered) {
    // Phạt trừ 100% số Vàng (tịch thu toàn bộ số Vàng về 0)
    fine = rawCoins;
    rawCoins = 0;
    title = 'Kẻ Gian Lận ⚠️';
  }

  return { coins: rawCoins, totalCoinsEarned: rawTotal, level: rawLevel, tampered, fine, title };
}

export function getRedis() {
  if (!process.env.REDIS_URL) {
    return null;
  }
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      connectTimeout: 5000,
      maxRetriesPerRequest: 2,
      lazyConnect: true
    });
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
          userState.profile.googleId = sub;
          userState.profile.googleEmail = email;
          if (picture && !userState.profile.googlePicture) {
            userState.profile.googlePicture = picture;
          }
          if (isAdmin) userState.profile.role = 'admin';
        }
        await redis.set(userKey, JSON.stringify(userState), 'EX', 180 * 24 * 3600);
        if (userState.profile?.isCheater) {
          await redis.zrem('levelup:leaderboard', sub);
          await redis.zadd('levelup:cheaters', Date.now(), sub);
        } else {
          const level = userState.profile?.level || 1;
          const currentCoins = typeof userState.profile?.coins === 'number' ? userState.profile.coins : (userState.profile?.totalCoinsEarned || 20);
          const score = (level * 1000) + currentCoins;
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

    // 2. GET /api/sync: Leaderboard, check_nickname, hoặc tải dữ liệu người dùng
    if (req.method === 'GET') {
      // 2.1 Bảng xếp hạng (Leaderboard)
      if (action === 'leaderboard') {
        // ponytail: top 50 entries ceiling; upgrade to cursor pagination when player count > 1000
        const topUsers = await redis.zrevrange('levelup:leaderboard', 0, 49, 'WITHSCORES');
        const leaderboard = [];
        const seenSubs = new Set();

        for (let i = 0; i < topUsers.length; i += 2) {
          const memberKey = topUsers[i];
          const score = parseInt(topUsers[i + 1], 10);

          let rawData = await redis.get(`levelup:user:google:${memberKey}`);
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
                totalCoinsEarned: parsed.profile.totalCoinsEarned || score
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
        // Tự động rà soát và đưa các tài khoản gian lận trước đó vào Sorted Set levelup:cheaters
        try {
          if (typeof redis.keys === 'function') {
            const userKeys = await redis.keys('levelup:user:*');
            for (const uKey of userKeys) {
              const raw = await redis.get(uKey);
              if (!raw) continue;
              try {
                const uData = JSON.parse(raw);
                if (uData.profile && (
                  uData.profile.isCheater === true ||
                  uData.profile.title === 'Kẻ Gian Lận ⚠️' ||
                  (typeof uData.profile.title === 'string' && uData.profile.title.startsWith('Đang Chuộc Tội'))
                )) {
                  const subOrKey = uData.profile.googleId || uKey.replace(/^levelup:user:(google:)?/, '');
                  const cheatedTime = uData.lastSyncedAt || uData.profile.cheatedAt || Date.now();
                  await redis.zadd('levelup:cheaters', cheatedTime, subOrKey);
                }
              } catch (_) {}
            }
          }
        } catch (_) {}

        const cheaterEntries = await redis.zrevrange('levelup:cheaters', 0, 49, 'WITHSCORES');
        const cheaters = [];

        for (let i = 0; i < cheaterEntries.length; i += 2) {
          const memberKey = cheaterEntries[i];
          const cheatedAt = parseInt(cheaterEntries[i + 1], 10);

          let rawData = await redis.get(`levelup:user:google:${memberKey}`);
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

        // 3. Thu thập từ keys pattern 'levelup:user:*'
        if (typeof redis.keys === 'function') {
          try {
            const keys = await redis.keys('levelup:user:*');
            if (Array.isArray(keys)) {
              for (const k of keys) {
                const subOrKey = k.replace(/^levelup:user:(google:)?/, '');
                if (subOrKey) userKeySet.add(subOrKey);
              }
            }
          } catch (_) {}
        }

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
        const parsed = JSON.parse(rawData);
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

      const data = JSON.parse(rawData);
      const isCallerAdmin = await verifyIsAdmin(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS, nicks: ADMIN_NICKS });
      if (isCallerAdmin && data.profile && data.profile.role !== 'admin') {
        data.profile.role = 'admin';
        await redis.set(userKey, JSON.stringify(data), 'EX', 180 * 24 * 3600);
      }
      return res.status(200).json({
        found: true,
        isOwner: true,
        data
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

        const userData = JSON.parse(rawUserData);
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
        const currentCoins = typeof userData.profile?.coins === 'number' ? userData.profile.coins : (userData.profile?.totalCoinsEarned || 20);
        const score = (level * 1000) + currentCoins;
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

        const userData = JSON.parse(rawUserData);
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
          const finalCoins = userData.profile.coins || 0;
          const score = (finalLevel * 1000) + finalCoins;
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

        const userData = JSON.parse(rawUserData);
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
          const tierMin = { common: 20, rare: 40, epic: 80, legendary: 150 };
          const fallbackPrice = tierMin[item.tier?.toLowerCase()] || 25;
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
      const hadHealedBounty = Array.isArray(state.quests) && state.quests.some(q => q._healed);
      const hadLegitPurchases = Array.isArray(state.inventory) && state.inventory.some(i =>
        i.shopItemId === 'shop_seed_1' || i.shopItemId === 'shop_seed_2' || i.shopItemId === 'shop_seed_3' ||
        (i.shopItemId && Array.isArray(state.shopItems) && state.shopItems.some(s => s.id === i.shopItemId))
      );
      const isFalselyFlagged = (hadHealedBounty || hadLegitPurchases) && !balanceCheck.tampered;

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

      const finalActiveTimer = (timerAction === 'cancel' || req.body?.timerAction === 'cancel')
        ? null
        : (state.activeTimer || null);

      const payloadToSave = {
        ...state,
        activeTimer: finalActiveTimer,
        shopItems: sanitizedShopItems,
        // ponytail: Giới hạn lưu trữ tối đa 100 giao dịch ledger gần nhất trên Cloud/Redis
        ledger: updatedLedger.slice(0, 100),
        googleId: userSub,
        lastModified: incomingModified || serverTimestamp,
        profile: {
          ...(state.profile || {}),
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
        const currentCoins = balanceCheck.coins;
        const score = (level * 1000) + currentCoins;
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
        title,
        tampered: balanceCheck.tampered,
        fine: balanceCheck.fine,
        isCheater,
        redeemed: redeemedJustNow,
        penalty: penaltyMessage
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
