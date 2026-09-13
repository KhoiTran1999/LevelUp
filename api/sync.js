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
  if (q.id === 'q_seed_1') {
    return (parseInt(q.rewardCoins, 10) || 0) === 12 && (parseInt(q.targetMinutes, 10) || 0) === 25 && q.type === 'focus';
  }
  if (q.id === 'q_seed_2') {
    return (parseInt(q.rewardCoins, 10) || 0) === 5 && (parseInt(q.targetMinutes, 10) || 0) === 0 && q.type === 'bounty';
  }
  if (!q.signature) return false;
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
  return false;
}

export function signReward(name, price, tier) {
  const normName = (name || '').normalize('NFC').trim().toLowerCase();
  const p = parseInt(price, 10) || 0;
  const tr = (tier || 'common').toLowerCase();
  const payload = `reward:${normName}:${p}:${tr}`;
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex').slice(0, 16);
}

export function verifyRewardSignature(r) {
  if (!r || typeof r !== 'object') return false;
  if (r.signature) {
    const expected = signReward(r.name, r.price, r.tier);
    if (r.signature === expected) return true;
  }
  if (r.id === 'shop_seed_1') return (parseInt(r.price, 10) || 0) === 35 && (r.tier || '').toLowerCase() === 'rare';
  if (r.id === 'shop_seed_2') return (parseInt(r.price, 10) || 0) === 20 && (r.tier || '').toLowerCase() === 'common';
  if (r.id === 'shop_seed_3') return [90, 120].includes(parseInt(r.price, 10) || 0) && (r.tier || '').toLowerCase() === 'epic';
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
    const isLegit = verifyQuestSignature(q);
    if (!isLegit) {
      // Chữ ký sai hoặc không có chữ ký AI -> 0 Vàng
      tampered = true;
      continue;
    }
    const reward = Math.min(40, Math.max(1, parseInt(q.rewardCoins, 10) || 10));
    // ponytail: cap repeatable count to 20 between syncs
    const count = q.isRepeatable
      ? Math.min(20, Math.max(0, parseInt(q.completedCount, 10) || 0))
      : Math.min(20, Math.max(
          parseInt(q.completedCount, 10) || 0,
          (q.status === 'completed' || q.completed === true) ? 1 : 0
        ));
    questEarned += reward * count;
  }

  // 2. Nguồn thu nhập hợp lệ duy nhất là từ nhiệm vụ đã kiểm định (chống giả mạo ledger)
  const maxTrackedEarned = Math.max(20, questEarned);

  // 3. Tổng chi tiêu cho vật phẩm kho đồ (bảo vệ giá phần thưởng chuẩn)
  let totalSpent = 0;
  for (const item of inventory) {
    const sigStatus = verifyRewardSignature(item);
    let price = Math.max(0, parseInt(item.price, 10) || 0);
    if (sigStatus === false) {
      // Bị sửa giá trong DevTools (ví dụ từ 50 xuống 1) -> Khôi phục giá tối thiểu theo Tier
      const tierMin = { common: 20, rare: 40, epic: 80, legendary: 150 };
      const fallbackPrice = tierMin[item.tier?.toLowerCase()] || 25;
      price = Math.max(price, fallbackPrice);
      tampered = true;
    }
    totalSpent += price;
  }

  // ponytail: Giới hạn mức tăng tối đa giữa 2 lần đồng bộ (500 vàng ~ 10 nhiệm vụ S-rank tối đa)
  // Ngăn chặn hành vi vào DevTools gán 999,999 Vàng hoặc bơm hàng ngàn quest giả
  const existingTotal = parseInt(existingState?.profile?.totalCoinsEarned, 10) || 0;
  const maxAllowedCeiling = existingTotal > 0
    ? existingTotal + 500
    : maxTrackedEarned;

  if (rawTotal > maxAllowedCeiling) {
    rawTotal = existingTotal > 0 ? Math.min(existingTotal + 500, maxTrackedEarned) : maxTrackedEarned;
    tampered = true;
  }
  if (rawTotal < 0) {
    rawTotal = 0;
    tampered = true;
  }

  // Số coin hiện tại không thể lớn hơn (tổng kiếm được - tổng đã tiêu)
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
  const maxAllowedLevel = existingTotal > 0
    ? existingLevel + 2
    : Math.min(10, Math.max(existingLevel, Math.floor(rawTotal / 40) + 1));

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
  const nicks = (process.env.ADMIN_NICKNAMES || 'admin,guildmaster')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const emails = (process.env.ADMIN_EMAILS || '')
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
            amount: 20,
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
          const totalCoins = userState.profile?.totalCoinsEarned || 20;
          const score = (level * 1000) + totalCoins;
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

          try {
            const parsed = JSON.parse(rawData);
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
                totalCoinsEarned: parsed.profile.totalCoinsEarned || score
              };
            }
          } catch (e) {}

          if (seenSubs.has(subId)) {
            await redis.zrem('levelup:leaderboard', memberKey);
            continue;
          }
          seenSubs.add(subId);

          leaderboard.push({ ...profile, key: memberKey, score });
          if (leaderboard.length >= 50) break;
        }

        return res.status(200).json({ leaderboard });
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

      // 2.3 Tải hồ sơ người dùng theo Google ID Token hoặc Session Token
      if (!token) {
        return res.status(401).json({ error: 'Cần đăng nhập tài khoản Google để tải dữ liệu.' });
      }

      const caller = await authenticateCaller(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS });
      const targetSub = caller ? caller.sub : null;

      if (!targetSub) {
        return res.status(401).json({ error: 'Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn.' });
      }

      const rawData = await redis.get(`levelup:user:google:${targetSub}`);
      if (!rawData) {
        return res.status(200).json({ found: false, googleId: targetSub });
      }

      const data = JSON.parse(rawData);
      return res.status(200).json({
        found: true,
        isOwner: true,
        data
      });
    }

    // 3. POST /api/sync: Lưu game state hoặc Admin Actions
    if (req.method === 'POST') {
      const { nickname: rawNick, oldNickname: rawOldNick, state } = req.body || {};

      // 3.1 Admin Action: Xóa tài khoản gian lận khỏi Leaderboard
      if (action === 'admin_remove') {
        const target = req.body?.targetSub || req.body?.targetNickname;
        let callerEmail = '';
        let isCallerAdmin = false;

        if (ADMIN_TOKEN && token === ADMIN_TOKEN) {
          isCallerAdmin = true;
        } else if (token) {
          const caller = await authenticateCaller(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS });
          if (caller) {
            callerEmail = caller.email || '';
            isCallerAdmin = ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(callerEmail);
          }
        }

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
        }

        return res.status(200).json({ success: true, removed: targetSubToDelete });
      }

      // 3.2 Admin Action: Ân xá tài khoản gian lận (Khôi phục danh hiệu, xóa cờ vi phạm, đưa lại Leaderboard)
      if (action === 'admin_pardon') {
        const target = req.body?.targetSub || req.body?.targetNickname;
        let callerEmail = '';
        let isCallerAdmin = false;

        if (ADMIN_TOKEN && token === ADMIN_TOKEN) {
          isCallerAdmin = true;
        } else if (token) {
          const caller = await authenticateCaller(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS });
          if (caller) {
            callerEmail = caller.email || '';
            isCallerAdmin = ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(callerEmail);
          }
        }

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
          amount: 0,
          description: '🕊️ ÂN XÁ TỪ QUẢN TRỊ VIÊN: Tài khoản đã được xóa án phạt và khôi phục danh dự hiệp sĩ!',
          timestamp: Date.now()
        };
        userData.ledger = [pardonRecord, ...(Array.isArray(userData.ledger) ? userData.ledger : [])];

        await redis.set(userKey, JSON.stringify(userData), 'EX', 180 * 24 * 3600);
        await redis.zrem('levelup:cheaters', targetSub);

        const level = userData.profile?.level || 1;
        const totalCoins = userData.profile?.totalCoinsEarned || 20;
        const score = (level * 1000) + totalCoins;
        await redis.zadd('levelup:leaderboard', score, targetSub);

        return res.status(200).json({
          success: true,
          pardoned: targetSub,
          title: userData.profile.title,
          message: `Đã ân xá thành công cho tài khoản "${userData.profile.nickname || targetSub}".`
        });
      }

      // 3.3 Đăng xuất tài khoản (Xóa session token trên Redis và xóa Cookie)
      if (action === 'logout') {
        if (token) {
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

      const userRole = isAdmin ? 'admin' : 'adventurer';
      const serverTimestamp = Date.now();
      const userKey = `levelup:user:google:${userSub}`;

      let existingState = null;
      const rawExisting = await redis.get(userKey);
      if (rawExisting) {
        try { existingState = JSON.parse(rawExisting); } catch (_) {}
      }

      // Anti-Cheat: Validate and derive legitimate coin balance from quest completions and inventory
      const balanceCheck = deriveLegitimateBalance(state, existingState);

      const incomingModified = Number(state.lastModified || state.lastSyncedAt || 0);
      const existingModified = Number(existingState?.lastModified || existingState?.lastSyncedAt || 0);

      // Conflict Resolution: If incoming state has timestamp and cloud state is strictly newer,
      // return existing cloud state without overwriting it with stale data
      if (existingState && incomingModified > 0 && existingModified > incomingModified) {
        return res.status(200).json({
          success: true,
          conflict: true,
          googleId: userSub,
          nickname: existingState.profile?.nickname || nickname,
          role: userRole,
          syncedAt: existingState.lastSyncedAt || serverTimestamp,
          state: existingState,
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
          amount: balanceCheck.fine,
          description: `⚠️ ÁN PHẠT ANTI-CHEAT: Trừ sạch ${balanceCheck.fine} Vàng (100%) & tước danh hiệu do phát hiện can thiệp dữ liệu trái phép`,
          timestamp: serverTimestamp
        });
      }

      // Tự động khôi phục danh dự cho người dùng bị bắt oan do bug 0 || 25 trên nhiệm vụ bounty
      const hadHealedBounty = Array.isArray(state.quests) && state.quests.some(q => q._healed);
      if (hadHealedBounty && !balanceCheck.tampered) {
        if (state.profile) {
          state.profile.isCheater = false;
          if (state.profile.title === 'Kẻ Gian Lận ⚠️') {
            state.profile.title = deriveTitleForLevel(balanceCheck.level);
          }
        }
        if (existingState?.profile) {
          existingState.profile.isCheater = false;
          if (existingState.profile.title === 'Kẻ Gian Lận ⚠️') {
            existingState.profile.title = deriveTitleForLevel(balanceCheck.level);
          }
          existingState.profile.cheatStrikes = 0;
        }
        await redis.zrem('levelup:cheaters', userSub);
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

      const payloadToSave = {
        ...state,
        shopItems: sanitizedShopItems,
        ledger: updatedLedger,
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
        const totalCoins = balanceCheck.totalCoinsEarned;
        const score = (level * 1000) + totalCoins;
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
