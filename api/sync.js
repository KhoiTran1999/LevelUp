import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

let redisClient = null;

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
  // Normalize: alphanumeric, underscores, hyphens, lowercase, max 30 chars
  return raw.trim().toLowerCase().replace(/[^a-z0-9_\-\.]/gi, '').slice(0, 30);
}

export default async function handler(req, res) {
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
      if (action === 'leaderboard') {
        // Fetch top 10 adventurers from Redis sorted set
        const topUsers = await redis.zrevrange('levelup:leaderboard', 0, 9, 'WITHSCORES');
        const leaderboard = [];
        for (let i = 0; i < topUsers.length; i += 2) {
          const nick = topUsers[i];
          const score = parseInt(topUsers[i + 1], 10);

          // Get brief summary of the user
          const rawData = await redis.get(`levelup:user:${nick}`);
          let profile = { nickname: nick, level: 1, title: 'Tập sự' };
          if (rawData) {
            try {
              const parsed = JSON.parse(rawData);
              if (parsed.profile) {
                profile = {
                  nickname: parsed.profile.nickname || nick,
                  avatar: parsed.profile.avatar || '⚔️',
                  level: parsed.profile.level || 1,
                  title: parsed.profile.title || 'Tập sự',
                  totalCoinsEarned: parsed.profile.totalCoinsEarned || score
                };
              }
            } catch (e) {}
          }
          leaderboard.push({ ...profile, score });
        }
        return res.status(200).json({ leaderboard });
      }

      const nickname = sanitizeNickname(req.query?.nickname);
      if (!nickname) {
        return res.status(400).json({ error: 'Missing or invalid nickname query parameter.' });
      }

      const rawData = await redis.get(`levelup:user:${nickname}`);
      if (!rawData) {
        return res.status(200).json({ found: false, nickname });
      }

      const data = JSON.parse(rawData);
      return res.status(200).json({ found: true, data });
    }

    // POST /api/sync: Save state
    if (req.method === 'POST') {
      const { nickname: rawNick, state } = req.body || {};
      const nickname = sanitizeNickname(rawNick);

      if (!nickname) {
        return res.status(400).json({ error: 'Valid nickname is required.' });
      }

      if (!state || typeof state !== 'object') {
        return res.status(400).json({ error: 'State payload is required.' });
      }

      // Add timestamp
      const serverTimestamp = Date.now();
      const payloadToSave = {
        ...state,
        lastSyncedAt: serverTimestamp
      };

      // Save user state in Redis with 180 days retention
      const key = `levelup:user:${nickname}`;
      await redis.set(key, JSON.stringify(payloadToSave), 'EX', 180 * 24 * 3600);

      // Update leaderboard: Score = (level * 1000) + totalCoinsEarned
      const level = payloadToSave.profile?.level || 1;
      const totalCoins = payloadToSave.profile?.totalCoinsEarned || 0;
      const score = (level * 1000) + totalCoins;

      await redis.zadd('levelup:leaderboard', score, nickname);

      return res.status(200).json({
        success: true,
        nickname,
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
