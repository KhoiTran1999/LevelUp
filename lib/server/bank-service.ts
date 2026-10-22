import { isDbConfigured } from '../../src/db/index.js';
import {
  getBankPoolState as getDbBankPoolState,
  saveBankPoolState as saveDbBankPoolState
} from '../../src/db/repositories/bankRepository.js';
import type { BankPoolState } from '@/types/levelup';

export interface ExtendedBankPoolState extends BankPoolState {
  lastAccruedAt?: number;
}

export async function reconcileGlobalBankPool(redis: any, poolState: ExtendedBankPoolState): Promise<ExtendedBankPoolState> {
  if (!redis || !poolState) return poolState;
  try {
    let totalRealBorrowed = 0;
    let totalRealDeposited = 0;

    const keySet = new Set<string>();
    if (typeof redis.smembers === 'function') {
      try {
        const members = await redis.smembers('levelup:all_users');
        if (Array.isArray(members)) {
          members.forEach((m: string) => m && keySet.add(`levelup:user:google:${m}`));
        }
      } catch (_) {}
    }
    if (typeof redis.keys === 'function') {
      try {
        const kList = await redis.keys('levelup:user:*');
        if (Array.isArray(kList)) {
          kList.forEach((k: string) => k && keySet.add(k));
        }
      } catch (_) {}
    }
    const userKeys = Array.from(keySet);

    if (userKeys.length > 0) {
      for (const k of userKeys) {
        let raw = await redis.get(k);
        if (!raw && k.startsWith('levelup:user:google:')) {
          raw = await redis.get(k.replace(':google:', ':'));
        }
        if (!raw) continue;
        try {
          const u = JSON.parse(raw);
          const b = u?.profile?.bank;
          if (b) {
            if (b.loan && ((parseInt(String(b.loan.principal), 10) || 0) > 0 || (parseInt(String(b.loan.debt), 10) || 0) > 0)) {
              totalRealBorrowed += Math.max(0, parseInt(String(b.loan.principal || b.loan.debt), 10) || 0);
            }
            if ((parseInt(String(b.deposited), 10) || 0) > 0) {
              totalRealDeposited += Math.max(0, parseInt(String(b.deposited), 10) || 0);
            }
          }
        } catch (_) {}
      }

      let changed = false;
      if (poolState.totalBorrowed !== totalRealBorrowed) {
        poolState.totalBorrowed = totalRealBorrowed;
        changed = true;
      }
      if (poolState.totalDeposited !== totalRealDeposited) {
        poolState.totalDeposited = totalRealDeposited;
        changed = true;
      }
      if (changed) {
        await saveGlobalBankState(redis, poolState);
      }
    }
  } catch (_) {}
  return poolState;
}

export async function getGlobalBankState(redis: any, autoReconcile: boolean = false): Promise<ExtendedBankPoolState> {
  const defaultBank: ExtendedBankPoolState = {
    poolGold: 500, // Kho bạc bảo chứng ban đầu
    totalBorrowed: 0,
    reserveFund: 150, // Quỹ dự phòng ban đầu
    totalDeposited: 0,
    bailoutDebt: 0, // Nợ cứu trợ kho bạc
    lastAccruedAt: Date.now()
  };

  // 1. Ưu tiên đọc từ Postgres (Drizzle ORM) nếu được cấu hình
  if (isDbConfigured()) {
    try {
      const dbState = await getDbBankPoolState();
      if (dbState) {
        if (redis) {
          try {
            await redis.set('levelup:bank:pool', JSON.stringify(dbState));
          } catch (_) {}
        }
        return dbState as ExtendedBankPoolState;
      }
    } catch (_) {}
  }

  if (!redis) return defaultBank;
  try {
    const raw = await redis.get('levelup:bank:pool');
    if (raw) {
      const parsed = JSON.parse(raw);
      const state: ExtendedBankPoolState = {
        poolGold: Math.max(0, parseInt(String(parsed.poolGold), 10) || 0),
        totalBorrowed: Math.max(0, parseInt(String(parsed.totalBorrowed), 10) || 0),
        reserveFund: Math.max(0, parseInt(String(parsed.reserveFund), 10) || 0),
        totalDeposited: Math.max(0, parseInt(String(parsed.totalDeposited), 10) || 0),
        bailoutDebt: Math.max(0, parseInt(String(parsed.bailoutDebt), 10) || 0),
        lastAccruedAt: parseInt(String(parsed.lastAccruedAt), 10) || Date.now()
      };
      if (autoReconcile) {
        return await reconcileGlobalBankPool(redis, state);
      }
      return state;
    }
    await redis.set('levelup:bank:pool', JSON.stringify(defaultBank));
  } catch (_) {}
  return defaultBank;
}

export async function saveGlobalBankState(redis: any, bankState: any): Promise<void> {
  if (!bankState) return;

  // 1. Lưu bền vững vào Postgres (Drizzle ORM)
  if (isDbConfigured()) {
    try {
      await saveDbBankPoolState(bankState);
    } catch (_) {}
  }

  // 2. Lưu đồng thời vào Redis L1 cache
  if (!redis) return;
  try {
    await redis.set('levelup:bank:pool', JSON.stringify(bankState));
  } catch (_) {}
}
