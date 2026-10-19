/**
 * Bank Pool Repository
 * Manages the macro-economic liquidity pool state for LevelUp 3-party AMM finance
 */
import { eq } from 'drizzle-orm';
import { getDb, schema } from '../index.js';

const { bankPool } = schema;

const DEFAULT_BANK_POOL = {
  poolGold: 500,
  totalBorrowed: 0,
  reserveFund: 150,
  totalDeposited: 0,
  bailoutDebt: 0,
  lastAccruedAt: Date.now()
};

/**
 * Retrieve global AMM bank pool state
 */
export async function getBankPoolState() {
  const db = getDb();
  if (!db) return DEFAULT_BANK_POOL;

  try {
    const rows = await db.select().from(bankPool).where(eq(bankPool.id, 1)).limit(1);

    if (rows && rows.length > 0) {
      const row = rows[0];
      return {
        poolGold: Math.max(0, parseInt(row.poolGold, 10) || 0),
        totalBorrowed: Math.max(0, parseInt(row.totalBorrowed, 10) || 0),
        reserveFund: Math.max(0, parseInt(row.reserveFund, 10) || 0),
        totalDeposited: Math.max(0, parseInt(row.totalDeposited, 10) || 0),
        bailoutDebt: Math.max(0, parseInt(row.bailoutDebt, 10) || 0),
        lastAccruedAt: row.lastAccruedAt ? new Date(row.lastAccruedAt).getTime() : Date.now()
      };
    }

    // Insert initial singleton row
    await db.insert(bankPool).values({
      id: 1,
      poolGold: DEFAULT_BANK_POOL.poolGold,
      totalBorrowed: DEFAULT_BANK_POOL.totalBorrowed,
      reserveFund: DEFAULT_BANK_POOL.reserveFund,
      totalDeposited: DEFAULT_BANK_POOL.totalDeposited,
      bailoutDebt: DEFAULT_BANK_POOL.bailoutDebt,
      lastAccruedAt: new Date(DEFAULT_BANK_POOL.lastAccruedAt),
    }).onConflictDoNothing();

    return DEFAULT_BANK_POOL;
  } catch (err) {
    console.error('[DB] Error in getBankPoolState:', err.message);
    return DEFAULT_BANK_POOL;
  }
}

/**
 * Save updated AMM bank pool state
 */
export async function saveBankPoolState(poolData = {}) {
  const db = getDb();
  if (!db || !poolData) return false;

  try {
    const now = new Date();
    const lastAcc = poolData.lastAccruedAt ? new Date(poolData.lastAccruedAt) : now;

    await db
      .insert(bankPool)
      .values({
        id: 1,
        poolGold: Math.max(0, parseInt(poolData.poolGold, 10) || 0),
        totalBorrowed: Math.max(0, parseInt(poolData.totalBorrowed, 10) || 0),
        reserveFund: Math.max(0, parseInt(poolData.reserveFund, 10) || 0),
        totalDeposited: Math.max(0, parseInt(poolData.totalDeposited, 10) || 0),
        bailoutDebt: Math.max(0, parseInt(poolData.bailoutDebt, 10) || 0),
        lastAccruedAt: lastAcc,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: bankPool.id,
        set: {
          poolGold: Math.max(0, parseInt(poolData.poolGold, 10) || 0),
          totalBorrowed: Math.max(0, parseInt(poolData.totalBorrowed, 10) || 0),
          reserveFund: Math.max(0, parseInt(poolData.reserveFund, 10) || 0),
          totalDeposited: Math.max(0, parseInt(poolData.totalDeposited, 10) || 0),
          bailoutDebt: Math.max(0, parseInt(poolData.bailoutDebt, 10) || 0),
          lastAccruedAt: lastAcc,
          updatedAt: now,
        },
      });

    return true;
  } catch (err) {
    console.error('[DB] Error in saveBankPoolState:', err.message);
    return false;
  }
}
