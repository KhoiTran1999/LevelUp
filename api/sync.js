import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

let redisClient = null;

// ponytail: test hook for hermetic in-memory mock testing without network
export function setRedisClientForTesting(client) {
  redisClient = client;
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

function sanitizeNickname(raw) {
  if (!raw || typeof raw !== 'string') return '';
  // Normalize Vietnamese accents and special characters to clean ASCII for Redis key indexing
  const normalized = raw
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
  return normalized.toLowerCase().replace(/[^a-z0-9_\-\.]/gi, '').slice(0, 30);
}

function extractToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return req.body?.token || req.query?.token || '';
}

function getAdminConfig() {
  const nicks = (process.env.ADMIN_NICKNAMES || 'admin,guildmaster')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const token = (process.env.ADMIN_TOKEN || '').trim();
  return { nicks, token };
}

export default async function handler(req, res) {
  const { nicks: ADMIN_NICKS, token: ADMIN_TOKEN } = getAdminConfig();
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
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

    // GET /api/sync?action=leaderboard
    // GET /api/sync?nickname=anhduc
    if (req.method === 'GET') {
      const action = req.query?.action;
      const token = extractToken(req);

      // 1. Kiểm tra nhanh tính khả dụng của nickname (check_nickname)
      if (action === 'check_nickname') {
        const nickname = sanitizeNickname(req.query?.nickname);
        if (!nickname) {
          return res.status(400).json({ error: 'Missing nickname parameter.' });
        }
        // Chặn đăng ký biệt danh Admin nếu không có ADMIN_TOKEN
        if (ADMIN_NICKS.includes(nickname) && ADMIN_TOKEN && token !== ADMIN_TOKEN) {
          return res.status(200).json({
            available: false,
            isOwner: false,
            message: 'Nickname này được bảo lưu riêng cho Hội đồng Quản trị.'
          });
        }
        const rawData = await redis.get(`levelup:user:${nickname}`);
        if (!rawData) {
          return res.status(200).json({ available: true, isOwner: true });
        }
        try {
          const parsed = JSON.parse(rawData);
          const isOwner = Boolean(token && parsed.ownerToken && parsed.ownerToken === token);
          return res.status(200).json({
            available: isOwner,
            isOwner,
            message: isOwner ? 'Nickname thuộc về bạn.' : 'Nickname đã có người sở hữu.'
          });
        } catch {
          return res.status(200).json({ available: false, isOwner: false });
        }
      }

      // 2. Tìm tài khoản theo Token (Khôi phục / Chuyển tài khoản tự động)
      if (action === 'find_by_token') {
        if (!token) {
          return res.status(400).json({ error: 'Mã Token là bắt buộc.' });
        }
        const targetNick = await redis.get(`levelup:token:${token}`);
        if (!targetNick) {
          return res.status(404).json({ found: false, error: 'Không tìm thấy tài khoản nào khớp với Mã Token này.' });
        }
        const rawData = await redis.get(`levelup:user:${targetNick}`);
        if (!rawData) {
          return res.status(404).json({ found: false, error: 'Dữ liệu tài khoản đã hết hạn hoặc không tồn tại.' });
        }
        const data = JSON.parse(rawData);
        if (data.ownerToken && data.ownerToken !== token) {
          return res.status(403).json({ found: false, error: 'Mã Token không trùng khớp với chủ tài khoản.' });
        }
        const { ownerToken, ...safeData } = data;
        const isAdmin = ADMIN_NICKS.includes(targetNick) && (!ADMIN_TOKEN || token === ADMIN_TOKEN);
        const displayNickname = data.profile?.nickname || targetNick;
        return res.status(200).json({
          found: true,
          nickname: displayNickname,
          targetNick,
          role: isAdmin ? 'admin' : 'adventurer',
          data: {
            ...safeData,
            profile: {
              ...(safeData.profile || {}),
              nickname: displayNickname
            }
          }
        });
      }

      // 3. Lấy Bảng xếp hạng (leaderboard)
      if (action === 'leaderboard') {
        const topUsers = await redis.zrevrange('levelup:leaderboard', 0, 19, 'WITHSCORES');
        const leaderboard = [];
        const seenTokens = new Set();
        for (let i = 0; i < topUsers.length; i += 2) {
          const nick = topUsers[i];
          const score = parseInt(topUsers[i + 1], 10);
          const rawData = await redis.get(`levelup:user:${nick}`);
          if (!rawData) {
            await redis.zrem('levelup:leaderboard', nick);
            continue;
          }
          let profile = { nickname: nick, level: 1, title: 'Tập sự' };
          let ownerToken = null;
          try {
            const parsed = JSON.parse(rawData);
            ownerToken = parsed.ownerToken;
            if (parsed.profile) {
              profile = {
                nickname: parsed.profile.nickname || nick,
                avatar: parsed.profile.avatar || '⚔️',
                level: parsed.profile.level || 1,
                title: parsed.profile.title || 'Tập sự',
                role: ADMIN_NICKS.includes(nick) ? 'admin' : (parsed.profile.role || 'adventurer'),
                totalCoinsEarned: parsed.profile.totalCoinsEarned || score
              };
            }
          } catch (e) {}

          // Loại bỏ bản ghi trùng nếu cùng một tài khoản (token)
          if (ownerToken) {
            if (seenTokens.has(ownerToken)) {
              await redis.zrem('levelup:leaderboard', nick);
              continue;
            }
            seenTokens.add(ownerToken);
          }

          leaderboard.push({ ...profile, key: nick, score });
          if (leaderboard.length >= 10) break;
        }
        return res.status(200).json({ leaderboard });
      }

      // 4. Tải hồ sơ người dùng theo nickname
      const nickname = sanitizeNickname(req.query?.nickname);
      if (!nickname) {
        return res.status(400).json({ error: 'Missing or invalid nickname query parameter.' });
      }

      const rawData = await redis.get(`levelup:user:${nickname}`);
      if (!rawData) {
        return res.status(200).json({ found: false, nickname });
      }

      const data = JSON.parse(rawData);
      const isOwner = Boolean(token && data.ownerToken && data.ownerToken === token);

      if (!isOwner) {
        // Bảo vệ dữ liệu cá nhân: Người lạ chỉ được xem thông tin hồ sơ công khai, không lộ quests/habits/inventory
        return res.status(200).json({
          found: true,
          isOwner: false,
          nickname,
          profile: {
            nickname: data.profile?.nickname || nickname,
            avatar: data.profile?.avatar || '⚔️',
            level: data.profile?.level || 1,
            title: data.profile?.title || 'Tập sự',
            role: ADMIN_NICKS.includes(nickname) ? 'admin' : 'adventurer'
          }
        });
      }

      // Chủ sở hữu chính xác: Trả về đầy đủ dữ liệu an toàn (loại bỏ ownerToken)
      const { ownerToken, ...safeData } = data;
      return res.status(200).json({ found: true, isOwner: true, data: safeData });
    }

    // POST /api/sync: Save state / Admin actions
    if (req.method === 'POST') {
      const { nickname: rawNick, oldNickname: rawOldNick, state } = req.body || {};
      const token = extractToken(req);
      const nickname = sanitizeNickname(rawNick);
      const oldNickname = sanitizeNickname(rawOldNick);
      const action = req.query?.action;

      // Admin action: Xóa tài khoản gian lận khỏi Leaderboard
      if (action === 'admin_remove') {
        const targetNick = sanitizeNickname(req.body?.targetNickname);
        const isAdmin = ADMIN_NICKS.includes(nickname) && (!ADMIN_TOKEN || token === ADMIN_TOKEN);
        if (!isAdmin) {
          return res.status(403).json({ error: 'Chỉ Trưởng Hội (Admin) có thẩm quyền mới có quyền này.' });
        }
        // Kiểm tra token có khớp với ownerToken của admin đã lưu không
        const adminRaw = await redis.get(`levelup:user:${nickname}`);
        if (adminRaw) {
          try {
            const adminData = JSON.parse(adminRaw);
            if (adminData.ownerToken && adminData.ownerToken !== token) {
              return res.status(403).json({ error: 'Mã Token Admin không chính xác.' });
            }
          } catch (e) {}
        }
        if (targetNick) {
          const targetRaw = await redis.get(`levelup:user:${targetNick}`);
          if (targetRaw) {
            try {
              const targetData = JSON.parse(targetRaw);
              if (targetData.ownerToken) {
                await redis.del(`levelup:token:${targetData.ownerToken}`);
              }
            } catch (e) {}
          }
          await redis.del(`levelup:user:${targetNick}`);
          await redis.zrem('levelup:leaderboard', targetNick);
        }
        return res.status(200).json({ success: true, removed: targetNick });
      }

      if (!nickname) {
        return res.status(400).json({ error: 'Valid nickname is required.' });
      }

      if (!token) {
        return res.status(400).json({ error: 'Mã định danh (Token) là bắt buộc để phân quyền tài khoản.' });
      }

      // Chặn tạo tài khoản Admin mạo danh nếu không khớp ADMIN_TOKEN
      if (ADMIN_NICKS.includes(nickname) && ADMIN_TOKEN && token !== ADMIN_TOKEN) {
        return res.status(403).json({ error: 'Bạn không có quyền đăng ký hoặc sử dụng tài khoản Quản trị viên.' });
      }

      if (!state || typeof state !== 'object') {
        return res.status(400).json({ error: 'State payload is required.' });
      }

      // 1. Kiểm tra tính duy nhất: Nickname đích đã có ai sở hữu chưa?
      const existingRaw = await redis.get(`levelup:user:${nickname}`);
      if (existingRaw) {
        try {
          const existingUser = JSON.parse(existingRaw);
          if (!existingUser.ownerToken || existingUser.ownerToken !== token) {
            return res.status(409).json({
              error: `Nickname "${nickname}" đã có người sử dụng. Vui lòng chọn nickname khác!`
            });
          }
        } catch (e) {}
      }

      // 2. Kiểm tra quyền đổi tên hoặc dọn dẹp key cũ liên kết với token này
      // ponytail: sequential del + zrem; upgrade to MULTI/EXEC pipeline if high-concurrency rename races occur
      const priorNick = await redis.get(`levelup:token:${token}`);
      const effectiveOldNick = oldNickname || (priorNick && priorNick !== nickname ? priorNick : null);
      if (effectiveOldNick && effectiveOldNick !== nickname) {
        const oldRaw = await redis.get(`levelup:user:${effectiveOldNick}`);
        if (oldRaw) {
          try {
            const oldUser = JSON.parse(oldRaw);
            if (oldUser.ownerToken && oldUser.ownerToken !== token) {
              return res.status(403).json({
                error: `Bạn không có quyền đổi tên cho tài khoản "${effectiveOldNick}".`
              });
            }
          } catch (e) {}
        }
        await redis.del(`levelup:user:${effectiveOldNick}`);
        await redis.zrem('levelup:leaderboard', effectiveOldNick);
      }

      // 3. Gắn quyền role: Khóa chặt, không cho phép client tự leo thang đặc quyền
      const isAdmin = ADMIN_NICKS.includes(nickname) && (!ADMIN_TOKEN || token === ADMIN_TOKEN);
      const userRole = isAdmin ? 'admin' : 'adventurer';

      // 4. Lưu dữ liệu với ownerToken
      const serverTimestamp = Date.now();
      const payloadToSave = {
        ...state,
        ownerToken: token,
        profile: {
          ...(state.profile || {}),
          nickname: state.profile?.nickname || rawNick || nickname,
          role: userRole
        },
        lastSyncedAt: serverTimestamp
      };

      const key = `levelup:user:${nickname}`;
      await redis.set(key, JSON.stringify(payloadToSave), 'EX', 180 * 24 * 3600);

      // Lưu index ánh xạ ngược token -> nickname (180 ngày)
      await redis.set(`levelup:token:${token}`, nickname, 'EX', 180 * 24 * 3600);

      // Update leaderboard: Score = (level * 1000) + totalCoinsEarned
      const level = payloadToSave.profile?.level || 1;
      const totalCoins = payloadToSave.profile?.totalCoinsEarned || 0;
      const score = (level * 1000) + totalCoins;

      await redis.zadd('levelup:leaderboard', score, nickname);

      return res.status(200).json({
        success: true,
        nickname,
        role: userRole,
        syncedAt: serverTimestamp
      });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    console.error('API /api/sync error:', err);
    return res.status(500).json({
      error: 'Redis Sync Internal Error',
      details: err.message
    });
  }
}
