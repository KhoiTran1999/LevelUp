import { cookies } from 'next/headers';
import { authenticateCaller } from '@/lib/server/auth';
import { getRedis } from '@/lib/server/redis';
import { getUserById, upsertUser } from '../../src/db/repositories/userRepository.js';
import { isDbConfigured } from '../../src/db/index.js';
import type { LevelUpAppState } from '@/types/levelup';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ponytail: Resolve user session from Next.js cookies or explicit test token. Upgrade path: NextAuth / Auth.js session integration.
export async function resolveAuthenticatedUser(explicitToken?: string) {
  let token = explicitToken;
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get('levelup_session')?.value;
    } catch {
      // Non-request contexts (CLI / test runner)
    }
  }
  if (!token) return null;
  const redis = getRedis();
  const caller = await authenticateCaller(token, redis, {
    token: ADMIN_TOKEN,
    emails: ADMIN_EMAILS,
  });
  return caller?.sub ? caller : null;
}

// ponytail: Reads state from Redis with PostgreSQL fallback. Upgrade path: single multi-tenant state service.
export async function fetchUserState(userSub: string): Promise<LevelUpAppState> {
  const redis = getRedis();
  let state: LevelUpAppState | null = null;
  if (redis) {
    try {
      const raw = await redis.get(`levelup:user:google:${userSub}`);
      if (raw) state = JSON.parse(raw);
    } catch (_) {}
  }
  if (!state && isDbConfigured()) {
    try {
      state = (await getUserById(userSub)) as LevelUpAppState | null;
    } catch (_) {}
  }
  if (!state) {
    state = {
      profile: {
        nickname: userSub,
        avatar: '⚔️',
        level: 1,
        exp: 0,
        coins: 20,
        totalCoinsEarned: 20,
        totalCoinsSpent: 0,
        totalFocusSessions: 0,
        title: 'Tân Binh Cấp 1',
        streak: 0,
        lastStreakDate: '',
        streakHistory: [],
        soundEnabled: true,
        theme: 'dark',
        role: 'adventurer',
        googleId: userSub,
        bank: {
          deposited: 0,
          depositInterest: 0,
          lastDepositAt: Date.now(),
          loan: null,
          isFrozen: false,
        },
      },
      quests: [],
      shopItems: [],
      inventory: [],
      completedQuestIds: [],
      proofPhotos: [],
      ledger: [],
      activeTimer: null,
      notes: [],
      activeNoteId: '',
      focusNotes: '',
      lastTimerClearedAt: 0,
      lastSyncedAt: Date.now(),
    };
  }
  return state;
}

// ponytail: Unified persistence across Redis cache & PostgreSQL. Upgrade path: granular Drizzle relational table queries.
export async function commitUserState(userSub: string, state: LevelUpAppState): Promise<void> {
  state.lastModified = Date.now();
  state.lastSyncedAt = Date.now();
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(`levelup:user:google:${userSub}`, JSON.stringify(state), 'EX', 180 * 24 * 3600);
    } catch (_) {}
  }
  if (isDbConfigured()) {
    try {
      await upsertUser(userSub, state);
    } catch (_) {}
  }
}
