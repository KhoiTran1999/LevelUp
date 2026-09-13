import dotenv from 'dotenv';
import Redis from 'ioredis';
import crypto from 'node:crypto';

dotenv.config();

let redisClient = null;
let googleTokenVerifierForTesting = null;

// ponytail: test hook for hermetic in-memory mock testing without network
export function setRedisClientForTesting(client) {
  redisClient = client;
}

// ponytail: test hook for mocking Google Token Verification in unit tests
export function setGoogleTokenVerifierForTesting(verifier) {
  googleTokenVerifierForTesting = verifier;
}

/**
 * Anti-Cheat: Validate and derive legitimate coin balance from quests, ledger, and inventory
 * Prevents client DevTools manipulation of gold values.
 */
export function deriveLegitimateBalance(state, existingState = null) {
  const quests = Array.isArray(state?.quests) ? state.quests : [];
  const inventory = Array.isArray(state?.inventory) ? state.inventory : [];
  const ledger = Array.isArray(state?.ledger) ? state.ledger : [];

  let rawTotal = parseInt(state?.profile?.totalCoinsEarned, 10);
  let rawCoins = parseInt(state?.profile?.coins, 10);
  if (isNaN(rawTotal)) rawTotal = 20;
  if (isNaN(rawCoins)) rawCoins = rawTotal;

  let tampered = false;

  // 1. Quản lý tiền thưởng từ nhiệm vụ
  let questEarned = 20; // Thưởng khởi đầu tân binh
  for (const q of quests) {
    const reward = Math.max(1, parseInt(q.rewardCoins, 10) || 10);
    const count = q.isRepeatable
      ? Math.max(0, parseInt(q.completedCount, 10) || 0)
      : ((q.status === 'completed' || q.completed === true) ? 1 : 0);
    questEarned += reward * count;
  }

  // 2. Kiểm tra nhật ký giao dịch ledger
  let ledgerEarned = 0;
  for (const entry of ledger) {
    if (entry && entry.type === 'earn') {
      ledgerEarned += Math.max(0, parseInt(entry.amount, 10) || 0);
    }
  }
  const maxTrackedEarned = Math.max(questEarned, ledgerEarned, 20);

  // 3. Tổng chi tiêu cho vật phẩm kho đồ
  let totalSpent = 0;
  for (const item of inventory) {
    totalSpent += Math.max(0, parseInt(item.price, 10) || 0);
  }

  // ponytail: Giới hạn mức tăng tối đa giữa 2 lần đồng bộ (500 vàng ~ 10 nhiệm vụ S-rank tối đa)
  // Ngăn chặn hành vi vào DevTools gán 999,999 Vàng
  const existingTotal = parseInt(existingState?.profile?.totalCoinsEarned, 10) || 0;
  const maxAllowedCeiling = existingTotal > 0
    ? Math.max(existingTotal + 500, maxTrackedEarned)
    : Math.max(maxTrackedEarned, 1000);

  if (rawTotal > maxAllowedCeiling) {
    rawTotal = Math.max(maxTrackedEarned, existingTotal || 20);
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

  return { coins: rawCoins, totalCoinsEarned: rawTotal, tampered };
}

function getRedis() {
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

function extractToken(req) {
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

function getAdminConfig() {
  const nicks = (process.env.ADMIN_NICKNAMES || 'admin,guildmaster')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const emails = (process.env.ADMIN_EMAILS || 'admin@gmail.com,guildmaster@gmail.com')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const token = (process.env.ADMIN_TOKEN || '').trim();
  return { nicks, emails, token };
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
      const isAdmin = ADMIN_EMAILS.includes(email) || (ADMIN_TOKEN && token === ADMIN_TOKEN);
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
        const level = userState.profile?.level || 1;
        const totalCoins = userState.profile?.totalCoinsEarned || 20;
        const score = (level * 1000) + totalCoins;
        await redis.zadd('levelup:leaderboard', score, sub);
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

      // 2.2 Kiểm tra tính khả dụng của Nickname (check_nickname)
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
          const isAdminCaller = callerSub && token === ADMIN_TOKEN;
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

        if (token === ADMIN_TOKEN) {
          isCallerAdmin = true;
        } else if (token) {
          const caller = await authenticateCaller(token, redis, { token: ADMIN_TOKEN, emails: ADMIN_EMAILS });
          if (caller) {
            callerEmail = caller.email || '';
            isCallerAdmin = ADMIN_EMAILS.includes(callerEmail);
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
        }

        return res.status(200).json({ success: true, removed: targetSubToDelete });
      }

      // 3.2 Đăng xuất tài khoản (Xóa session token trên Redis và xóa Cookie)
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
      const isAdmin = (userEmail && ADMIN_EMAILS.includes(userEmail)) || token === ADMIN_TOKEN;
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

      const payloadToSave = {
        ...state,
        googleId: userSub,
        lastModified: incomingModified || serverTimestamp,
        profile: {
          ...(state.profile || {}),
          nickname: state.profile?.nickname || rawNick || userName || nickname,
          role: userRole,
          googleId: userSub,
          googleEmail: userEmail || state.profile?.googleEmail || '',
          googlePicture: userPicture || state.profile?.googlePicture || '',
          coins: balanceCheck.coins,
          totalCoinsEarned: balanceCheck.totalCoinsEarned
        },
        lastSyncedAt: serverTimestamp
      };

      await redis.set(userKey, JSON.stringify(payloadToSave), 'EX', 180 * 24 * 3600);

      // Cập nhật Leaderboard với userSub và điểm số chuẩn xác đã kiểm định
      const level = payloadToSave.profile?.level || 1;
      const totalCoins = balanceCheck.totalCoinsEarned;
      const score = (level * 1000) + totalCoins;

      await redis.zadd('levelup:leaderboard', score, userSub);

      return res.status(200).json({
        success: true,
        conflict: false,
        googleId: userSub,
        nickname: payloadToSave.profile.nickname,
        role: userRole,
        syncedAt: serverTimestamp,
        coins: balanceCheck.coins,
        totalCoinsEarned: balanceCheck.totalCoinsEarned
      });
    }

    return res.status(405).json({ error: 'Phương thức không được hỗ trợ.' });
  } catch (err) {
    console.error('API /api/sync error:', err);
    return res.status(500).json({
      error: 'Lỗi máy chủ Redis Sync',
      details: err.message
    });
  }
}
