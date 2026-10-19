/**
 * Session Repository
 * Manages Google OAuth session persistence in PostgreSQL via Drizzle ORM
 */
import { eq, gt, and } from 'drizzle-orm';
import { getDb, schema } from '../index.js';

const { userSessions } = schema;

/**
 * Save or refresh user session
 */
export async function saveSession(token, userPayload, ttlMs = 90 * 24 * 60 * 60 * 1000) {
  const db = getDb();
  if (!db || !token || !userPayload || !userPayload.sub) return false;

  try {
    const expiresAt = new Date(Date.now() + ttlMs);
    await db
      .insert(userSessions)
      .values({
        token: String(token),
        userId: String(userPayload.sub),
        email: String(userPayload.email || '').toLowerCase().trim(),
        name: userPayload.name || '',
        picture: userPayload.picture || '',
        expiresAt,
      })
      .onConflictDoUpdate({
        target: userSessions.token,
        set: {
          email: String(userPayload.email || '').toLowerCase().trim(),
          name: userPayload.name || '',
          picture: userPayload.picture || '',
          expiresAt,
        },
      });

    return true;
  } catch (err) {
    console.error('[DB] Error in saveSession:', err.message);
    return false;
  }
}

/**
 * Retrieve active session by token
 */
export async function getSession(token) {
  const db = getDb();
  if (!db || !token) return null;

  try {
    const rows = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.token, String(token)), gt(userSessions.expiresAt, new Date())))
      .limit(1);

    if (!rows || rows.length === 0) return null;
    const s = rows[0];
    return {
      sub: s.userId,
      email: s.email,
      name: s.name,
      picture: s.picture,
    };
  } catch (err) {
    console.error('[DB] Error in getSession:', err.message);
    return null;
  }
}

/**
 * Delete session (e.g. on logout)
 */
export async function deleteSession(token) {
  const db = getDb();
  if (!db || !token) return false;

  try {
    await db.delete(userSessions).where(eq(userSessions.token, String(token)));
    return true;
  } catch (err) {
    console.error('[DB] Error in deleteSession:', err.message);
    return false;
  }
}
