/**
 * User & Game State Repository
 * Provides clean CRUD and synchronization abstractions via Drizzle ORM
 */
import { eq, desc, and, ne, sql } from 'drizzle-orm';
import { getDb, schema } from '../index.js';

/**
 * Calculate net worth for user ranking and financial statistics
 */
export function calculateNetWorth(profile = {}) {
  const coins = Math.max(0, parseInt(profile?.coins, 10) || 0);
  const bank = profile?.bank || {};
  const deposited = Math.max(0, parseInt(bank.deposited, 10) || 0);
  const depositInterest = Math.max(0, parseInt(bank.depositInterest, 10) || 0);
  const debt = Math.max(0, parseInt(bank.loan?.debt, 10) || 0);
  return Math.max(0, coins + deposited + depositInterest - debt);
}

const { users, userGameStates, notes: notesTable } = schema;

/**
 * Retrieve user by Google Sub ID
 */
export async function getUserById(subId) {
  const db = getDb();
  if (!db || !subId) return null;

  try {
    const result = await db
      .select()
      .from(users)
      .leftJoin(userGameStates, eq(users.id, userGameStates.userId))
      .where(eq(users.id, String(subId)))
      .limit(1);

    if (!result || result.length === 0) return null;

    const row = result[0];
    const u = row.users;
    const s = row.user_game_states;

    const state = s?.state || {};
    const profile = {
      ...(state.profile || {}),
      nickname: u.nickname || state.profile?.nickname || '',
      level: u.level ?? state.profile?.level ?? 1,
      exp: u.exp ?? state.profile?.exp ?? 0,
      coins: u.coins ?? state.profile?.coins ?? 20,
      totalCoinsEarned: u.totalCoinsEarned ?? state.profile?.totalCoinsEarned ?? 20,
      totalCoinsSpent: u.totalCoinsSpent ?? state.profile?.totalCoinsSpent ?? 0,
      streak: u.streak ?? state.profile?.streak ?? 0,
      role: u.role || state.profile?.role || 'adventurer',
      title: u.title || state.profile?.title || 'Tân Binh Cấp 1',
      avatar: u.avatar || state.profile?.avatar || '',
      email: u.email || state.profile?.email || '',
      googleId: u.id
    };

    return {
      ...state,
      profile,
      googleId: u.id,
      email: u.email,
      isCheater: u.isCheater,
      activeTimer: s?.activeTimer || null,
      lastSyncedAt: s?.lastSyncedAt ? new Date(s.lastSyncedAt).getTime() : Date.now(),
      lastModified: s?.lastModified ? new Date(s.lastModified).getTime() : Date.now(),
    };
  } catch (err) {
    console.error('[DB] Error in getUserById:', err.message);
    return null;
  }
}

/**
 * Retrieve user by Nickname (case-insensitive)
 */
export async function getUserByNickname(nickname) {
  const db = getDb();
  if (!db || !nickname) return null;

  try {
    const norm = String(nickname).trim().toLowerCase();
    const result = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`LOWER(${users.nickname}) = ${norm}`)
      .limit(1);

    if (!result || result.length === 0) return null;
    return await getUserById(result[0].id);
  } catch (err) {
    console.error('[DB] Error in getUserByNickname:', err.message);
    return null;
  }
}

/**
 * Check if a nickname is already claimed by another user
 */
export async function isNicknameTaken(nickname, excludeSub = '') {
  const db = getDb();
  if (!db || !nickname) return false;

  try {
    const norm = String(nickname).trim().toLowerCase();
    let query = db
      .select({ id: users.id })
      .from(users)
      .where(sql`LOWER(${users.nickname}) = ${norm}`);

    if (excludeSub) {
      query = db
        .select({ id: users.id })
        .from(users)
        .where(and(sql`LOWER(${users.nickname}) = ${norm}`, ne(users.id, String(excludeSub))));
    }

    const rows = await query.limit(1);
    return rows.length > 0;
  } catch (err) {
    console.error('[DB] Error in isNicknameTaken:', err.message);
    return false;
  }
}

/**
 * Upsert User Profile and Game State atomically using a database transaction
 */
export async function upsertUser(subId, userPayload = {}, activeTimer = null) {
  const db = getDb();
  if (!db || !subId) return false;

  try {
    const profile = userPayload.profile || {};
    const email = (userPayload.email || profile.email || `${subId}@levelup.local`).toLowerCase().trim();
    const nickname = (profile.nickname || '').trim() || null;
    const name = profile.name || userPayload.name || nickname || '';
    const avatar = profile.avatar || userPayload.picture || '';
    const role = profile.role === 'admin' ? 'admin' : 'adventurer';
    const title = profile.title || 'Tân Binh Cấp 1';
    const level = parseInt(profile.level, 10) || 1;
    const exp = parseInt(profile.exp, 10) || 0;
    const coins = parseInt(profile.coins, 10) || 20;
    const totalCoinsEarned = parseInt(profile.totalCoinsEarned, 10) || 20;
    const totalCoinsSpent = parseInt(profile.totalCoinsSpent, 10) || 0;
    const streak = parseInt(profile.streak, 10) || 0;
    const netWorth = calculateNetWorth(userPayload);
    const isCheater = Boolean(userPayload.isCheater || profile.isCheater);
    const now = new Date();

    await db.transaction(async (tx) => {
      // 1. Upsert users table
      await tx
        .insert(users)
        .values({
          id: String(subId),
          email,
          nickname,
          name,
          avatar,
          role,
          title,
          level,
          exp,
          coins,
          totalCoinsEarned,
          totalCoinsSpent,
          streak,
          netWorth,
          isCheater,
          lastSyncedAt: now,
          lastOnlineAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email,
            nickname: nickname || sql`${users.nickname}`,
            name: name || sql`${users.name}`,
            avatar: avatar || sql`${users.avatar}`,
            role,
            title,
            level,
            exp,
            coins,
            totalCoinsEarned,
            totalCoinsSpent,
            streak,
            netWorth,
            isCheater,
            lastSyncedAt: now,
            lastOnlineAt: now,
            updatedAt: now,
          },
        });

      // 2. Upsert user_game_states table
      const cleanedState = { ...userPayload };
      delete cleanedState.activeTimer;

      await tx
        .insert(userGameStates)
        .values({
          userId: String(subId),
          state: cleanedState,
          activeTimer: activeTimer || null,
          lastSyncedAt: now,
          lastModified: userPayload.lastModified ? new Date(userPayload.lastModified) : now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userGameStates.userId,
          set: {
            state: cleanedState,
            activeTimer: activeTimer !== undefined ? activeTimer : sql`${userGameStates.activeTimer}`,
            lastSyncedAt: now,
            lastModified: userPayload.lastModified ? new Date(userPayload.lastModified) : now,
            updatedAt: now,
          },
        });

      // 3. Sync notes table if notes array exists
      if (Array.isArray(userPayload.notes) && userPayload.notes.length > 0) {
        for (const note of userPayload.notes) {
          if (!note || !note.id || !note.title) continue;
          await tx
            .insert(notesTable)
            .values({
              id: String(note.id),
              userId: String(subId),
              title: String(note.title).slice(0, 500),
              content: String(note.content || ''),
              category: String(note.category || 'general').slice(0, 64),
              isPinned: Boolean(note.isPinned),
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: notesTable.id,
              set: {
                title: String(note.title).slice(0, 500),
                content: String(note.content || ''),
                category: String(note.category || 'general').slice(0, 64),
                isPinned: Boolean(note.isPinned),
                updatedAt: now,
              },
            });
        }
      }
    });

    return true;
  } catch (err) {
    console.error('[DB] Error in upsertUser:', err.message);
    return false;
  }
}

/**
 * Fetch Leaderboard ranked by Net Worth / Coins
 */
export async function getLeaderboard(limit = 50) {
  const db = getDb();
  if (!db) return [];

  try {
    const rows = await db
      .select({
        id: users.id,
        nickname: users.nickname,
        name: users.name,
        avatar: users.avatar,
        level: users.level,
        coins: users.coins,
        totalCoinsEarned: users.totalCoinsEarned,
        streak: users.streak,
        netWorth: users.netWorth,
        title: users.title,
        lastOnlineAt: users.lastOnlineAt,
        lastSyncedAt: users.lastSyncedAt
      })
      .from(users)
      .where(eq(users.isCheater, false))
      .orderBy(desc(users.netWorth), desc(users.coins))
      .limit(limit);

    return rows.map(r => ({
      key: r.id,
      googleId: r.id,
      nickname: r.nickname || r.name || 'Chiến Binh',
      level: r.level || 1,
      coins: r.coins || 20,
      totalCoinsEarned: r.totalCoinsEarned || 20,
      netWorth: r.netWorth || r.coins || 20,
      streak: r.streak || 0,
      title: r.title || 'Tân Binh Cấp 1',
      avatar: r.avatar || '🛡️',
      lastActive: r.lastOnlineAt ? new Date(r.lastOnlineAt).getTime() : 0,
    }));
  } catch (err) {
    console.error('[DB] Error in getLeaderboard:', err.message);
    return [];
  }
}

/**
 * Fetch Cheaters list
 */
export async function getCheaters(limit = 50) {
  const db = getDb();
  if (!db) return [];

  try {
    const rows = await db
      .select({
        id: users.id,
        nickname: users.nickname,
        name: users.name,
        avatar: users.avatar,
        level: users.level,
        coins: users.coins,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(eq(users.isCheater, true))
      .orderBy(desc(users.updatedAt))
      .limit(limit);

    return rows.map(r => ({
      key: r.id,
      googleId: r.id,
      nickname: r.nickname || r.name || 'Kẻ Gian Lận',
      level: r.level || 1,
      coins: r.coins || 0,
      avatar: r.avatar || '⚠️',
      updatedAt: r.updatedAt ? new Date(r.updatedAt).getTime() : Date.now()
    }));
  } catch (err) {
    console.error('[DB] Error in getCheaters:', err.message);
    return [];
  }
}

/**
 * Set user cheater flag
 */
export async function setCheaterStatus(subId, isCheater = true) {
  const db = getDb();
  if (!db || !subId) return false;

  try {
    await db
      .update(users)
      .set({ isCheater: Boolean(isCheater), updatedAt: new Date() })
      .where(eq(users.id, String(subId)));
    return true;
  } catch (err) {
    console.error('[DB] Error in setCheaterStatus:', err.message);
    return false;
  }
}

/**
 * Delete user from database (cascades to states, notes, sessions)
 */
export async function deleteUser(subId) {
  const db = getDb();
  if (!db || !subId) return false;

  try {
    await db.delete(users).where(eq(users.id, String(subId)));
    return true;
  } catch (err) {
    console.error('[DB] Error in deleteUser:', err.message);
    return false;
  }
}
