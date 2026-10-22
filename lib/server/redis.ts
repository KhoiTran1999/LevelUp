import Redis from 'ioredis';

// ponytail: Redis client or in-memory mock during tests. Upgrade path: pooled Redis cluster.
let redisClient: Redis | null = null;

export function setRedisClientForTesting(client: any): void {
  redisClient = client;
}

export function getRedis(): Redis | null {
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
    redisClient.on('error', (err: Error) => console.warn('Redis socket warning:', err.message));
  }
  return redisClient;
}

export async function updateUserPresence(redis: any, userSub?: string | null): Promise<void> {
  if (!redis || !userSub || typeof redis.zadd !== 'function') return;
  try {
    await redis.zadd('levelup:online_users', Date.now(), String(userSub));
  } catch (_) {}
}

export async function setOfflineUserPresence(redis: any, userSub?: string | null): Promise<void> {
  if (!redis || !userSub || typeof redis.zadd !== 'function') return;
  try {
    // Set score to 46s ago so user immediately registers as offline while preserving accurate recent timestamp
    await redis.zadd('levelup:online_users', Date.now() - 46000, String(userSub));
  } catch (_) {}
}

export interface OnlinePresenceResult {
  isOnlineMap: Map<string, boolean>;
  lastActiveMap: Map<string, number>;
  onlineCount: number;
}

export async function getOnlineUsersPresence(
  redis: any,
  memberKeys: string[] = [],
  thresholdMs: number = 45000
): Promise<OnlinePresenceResult> {
  const result: OnlinePresenceResult = {
    isOnlineMap: new Map<string, boolean>(),
    lastActiveMap: new Map<string, number>(),
    onlineCount: 0
  };
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

export async function checkRateLimit(
  redis: any,
  identifier: string,
  limit: number = 60,
  windowSec: number = 60
): Promise<boolean> {
  if (!redis || !identifier || typeof redis.incr !== 'function') return true;
  try {
    const key = `levelup:ratelimit:${identifier}`;
    const count = await redis.incr(key);
    if (count === 1 && typeof redis.expire === 'function') {
      await redis.expire(key, windowSec);
    } else if (typeof redis.ttl === 'function') {
      const ttl = await redis.ttl(key);
      if (ttl === -1) {
        await redis.expire(key, windowSec);
      }
    }
    return count <= limit;
  } catch (_) {
    return true; // Fail open on transient network hiccups
  }
}
