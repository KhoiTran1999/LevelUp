import { isDbConfigured } from '../../src/db/index.js';
import { getSession as getDbSession } from '../../src/db/repositories/sessionRepository.js';

export interface AuthenticatedCaller {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  isGuest?: boolean;
}

export interface AdminConfig {
  nicks: string[];
  emails: string[];
  token: string;
}

let googleTokenVerifierForTesting: ((token: string) => Promise<AuthenticatedCaller | null>) | null = null;

export function setGoogleTokenVerifierForTesting(
  verifier: ((token: string) => Promise<AuthenticatedCaller | null>) | null
): void {
  googleTokenVerifierForTesting = verifier;
}

export function sanitizeNickname(raw?: string | null): string {
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

export function extractToken(req: any): string {
  if (!req) return '';
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

export function getAdminConfig(): AdminConfig {
  const nicks = (process.env.ADMIN_NICKNAMES || 'admin,guildmaster,khoitran,khoi tran,khôi trần')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const emails = (process.env.ADMIN_EMAILS || 'admin@gmail.com,guildmaster@gmail.com,tranquockhoi1999@gmail.com,khoitran200199@gmail.com')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  // ponytail: fallback admin token in test env enables offline/CI test execution
  const token = (process.env.ADMIN_TOKEN || (process.env.NODE_ENV === 'test' ? 'admin_master_secret_2026_levelup' : '')).trim();
  return { nicks, emails, token };
}

/**
 * Verify Google ID Token via Google's official tokeninfo endpoint
 * Uses native Node.js fetch (stdlib-first, zero extra npm dependencies)
 */
export async function verifyGoogleToken(idToken?: string | null): Promise<AuthenticatedCaller | null> {
  if (!idToken || typeof idToken !== 'string') return null;

  if (googleTokenVerifierForTesting) {
    return await googleTokenVerifierForTesting(idToken);
  }

  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken.trim())}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
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
  } catch (err: any) {
    console.error('Error verifying Google Token:', err?.message || err);
    return null;
  }
}

/**
 * Universal authentication helper supporting:
 * 1. Redis-backed persistent sessions (90-day validity across devices)
 * 2. Fresh Google ID Tokens (OAuth JWT)
 * 3. Master Admin tokens
 */
export async function authenticateCaller(
  token?: string | null,
  redis?: any,
  adminConfig?: Partial<AdminConfig>
): Promise<AuthenticatedCaller | null> {
  if (!token || typeof token !== 'string') return null;
  const cleanToken = token.trim();

  // 1. Kiểm tra session token trong Redis (session sống 90 ngày)
  if (redis) {
    try {
      const sessionRaw = await redis.get(`levelup:session:${cleanToken}`);
      if (sessionRaw) {
        const sessionData = JSON.parse(sessionRaw);
        if (sessionData && sessionData.sub && !sessionData.isGuest && !String(sessionData.sub).startsWith('guest_')) {
          return sessionData;
        }
      }
    } catch (_) {}
  }

  // 1.1 Kiểm tra session trong Postgres (Drizzle ORM bền vững)
  if (isDbConfigured()) {
    try {
      const dbSession = await getDbSession(cleanToken);
      if (dbSession && dbSession.sub && !dbSession.isGuest && !String(dbSession.sub).startsWith('guest_')) {
        if (redis) {
          try {
            await redis.set(`levelup:session:${cleanToken}`, JSON.stringify(dbSession), 'EX', 90 * 24 * 3600);
          } catch (_) {}
        }
        return dbSession;
      }
    } catch (_) {}
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
      email: (adminConfig.emails && adminConfig.emails[0]) || 'admin@guildmaster.com',
      name: 'Bang Chủ',
      picture: ''
    };
  }

  return null;
}

export async function verifyIsAdmin(
  token?: string | null,
  redis?: any,
  adminConfig?: Partial<AdminConfig>
): Promise<boolean> {
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
