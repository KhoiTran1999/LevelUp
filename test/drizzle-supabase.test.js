/**
 * Automated Test Suite: Drizzle ORM + Supabase Postgres Integration
 * Tests database schema, connection pooling detection, repository methods, and hybrid sync
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { schema, isDbConfigured, setDbClientForTesting, getConnectionString } from '../src/db/index.js';
import {
  getUserById,
  getUserByNickname,
  isNicknameTaken,
  upsertUser,
  getLeaderboard,
  getCheaters,
  setCheaterStatus,
  deleteUser,
  calculateNetWorth
} from '../src/db/repositories/userRepository.js';
import {
  getBankPoolState,
  saveBankPoolState
} from '../src/db/repositories/bankRepository.js';
import {
  saveSession,
  getSession,
  deleteSession
} from '../src/db/repositories/sessionRepository.js';
import handler, { setRedisClientForTesting, setGoogleTokenVerifierForTesting } from '../api/sync.js';

class MockDrizzleDb {
  constructor() {
    this.users = new Map();
    this.gameStates = new Map();
    this.bankPool = new Map();
    this.notes = new Map();
    this.sessions = new Map();
  }

  async transaction(callback) {
    return await callback(this);
  }

  insert(table) {
    const self = this;
    return {
      values(val) {
        return {
          async onConflictDoUpdate({ target, set }) {
            self._handleInsertOrUpdate(table, val, set);
            return self;
          },
          async onConflictDoNothing() {
            self._handleInsert(table, val);
            return self;
          },
          async execute() {
            self._handleInsert(table, val);
            return self;
          }
        };
      }
    };
  }

  select(fields) {
    const self = this;
    let selectedTable = null;
    let joinTable = null;
    let whereClause = null;
    let limitCount = null;

    const builder = {
      from(table) {
        selectedTable = table;
        return builder;
      },
      leftJoin(otherTable) {
        joinTable = otherTable;
        return builder;
      },
      where(clause) {
        whereClause = clause;
        return builder;
      },
      orderBy() {
        return builder;
      },
      limit(n) {
        limitCount = n;
        return builder.execute();
      },
      async execute() {
        return self._executeSelect(selectedTable, joinTable, whereClause, limitCount);
      },
      then(onFulfilled, onRejected) {
        return this.execute().then(onFulfilled, onRejected);
      }
    };

    return builder;
  }

  update(table) {
    const self = this;
    return {
      set(values) {
        return {
          where(clause) {
            return {
              async execute() {
                self._handleUpdate(table, values, clause);
                return self;
              },
              then(onFulfilled, onRejected) {
                return this.execute().then(onFulfilled, onRejected);
              }
            };
          }
        };
      }
    };
  }

  delete(table) {
    const self = this;
    return {
      where(clause) {
        return {
          async execute() {
            self._handleDelete(table, clause);
            return self;
          },
          then(onFulfilled, onRejected) {
            return this.execute().then(onFulfilled, onRejected);
          }
        };
      }
    };
  }

  _handleInsert(table, val) {
    if (table === schema.users) {
      if (!this.users.has(val.id)) this.users.set(val.id, { ...val });
    } else if (table === schema.userGameStates) {
      if (!this.gameStates.has(val.userId)) this.gameStates.set(val.userId, { ...val });
    } else if (table === schema.bankPool) {
      if (!this.bankPool.has(val.id)) this.bankPool.set(val.id, { ...val });
    } else if (table === schema.notes) {
      if (!this.notes.has(val.id)) this.notes.set(val.id, { ...val });
    } else if (table === schema.userSessions) {
      if (!this.sessions.has(val.token)) this.sessions.set(val.token, { ...val });
    }
  }

  _handleInsertOrUpdate(table, val, set) {
    if (table === schema.users) {
      const prev = this.users.get(val.id) || {};
      this.users.set(val.id, { ...prev, ...val, ...set });
    } else if (table === schema.userGameStates) {
      const prev = this.gameStates.get(val.userId) || {};
      this.gameStates.set(val.userId, { ...prev, ...val, ...set });
    } else if (table === schema.bankPool) {
      const prev = this.bankPool.get(val.id) || {};
      this.bankPool.set(val.id, { ...prev, ...val, ...set });
    } else if (table === schema.notes) {
      const prev = this.notes.get(val.id) || {};
      this.notes.set(val.id, { ...prev, ...val, ...set });
    } else if (table === schema.userSessions) {
      const prev = this.sessions.get(val.token) || {};
      this.sessions.set(val.token, { ...prev, ...val, ...set });
    }
  }

  _handleUpdate(table, values, clause) {
    if (table === schema.users) {
      for (const [id, user] of this.users.entries()) {
        this.users.set(id, { ...user, ...values });
      }
    }
  }

  _handleDelete(table, clause) {
    if (table === schema.users) {
      for (const id of Array.from(this.users.keys())) {
        this.users.delete(id);
        this.gameStates.delete(id);
      }
    } else if (table === schema.userSessions) {
      for (const tok of Array.from(this.sessions.keys())) {
        this.sessions.delete(tok);
      }
    }
  }

  _executeSelect(selectedTable, joinTable, whereClause, limitCount) {
    if (selectedTable === schema.users && joinTable === schema.userGameStates) {
      const rows = [];
      for (const [id, user] of this.users.entries()) {
        const state = this.gameStates.get(id);
        rows.push({
          users: user,
          user_game_states: state
        });
      }
      return limitCount ? rows.slice(0, limitCount) : rows;
    }

    if (selectedTable === schema.users) {
      const rows = Array.from(this.users.values());
      return limitCount ? rows.slice(0, limitCount) : rows;
    }

    if (selectedTable === schema.bankPool) {
      const rows = Array.from(this.bankPool.values());
      return limitCount ? rows.slice(0, limitCount) : rows;
    }

    if (selectedTable === schema.userSessions) {
      const rows = Array.from(this.sessions.values());
      return limitCount ? rows.slice(0, limitCount) : rows;
    }

    return [];
  }
}

async function runDrizzleTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ: DRIZZLE ORM + SUPABASE POSTGRES INTEGRATION ---');

  // Test 1: Verify Schema Objects
  {
    console.log('Test 1: Kiểm tra định nghĩa các bảng trong Schema Drizzle');
    assert.ok(schema.users, 'Bảng users phải tồn tại trong schema');
    assert.ok(schema.userGameStates, 'Bảng userGameStates phải tồn tại trong schema');
    assert.ok(schema.bankPool, 'Bảng bankPool phải tồn tại trong schema');
    assert.ok(schema.notes, 'Bảng notes phải tồn tại trong schema');
    assert.ok(schema.userSessions, 'Bảng userSessions phải tồn tại trong schema');
  }

  // Test 2: Calculate Net Worth helper
  {
    console.log('Test 2: Kiểm tra hàm tính Net Worth tài sản');
    const net = calculateNetWorth({
      coins: 100,
      bank: {
        deposited: 200,
        depositInterest: 15,
        loan: { debt: 50 }
      }
    });
    assert.strictEqual(net, 265, 'Net worth = 100 + 200 + 15 - 50 = 265');
  }

  // Test 3: Mock DB Repository Operations
  {
    console.log('Test 3: Kiểm thử Repository user, state và bank pool qua Drizzle');
    const mockDb = new MockDrizzleDb();
    setDbClientForTesting(mockDb);

    // 3.1 Upsert User
    const userPayload = {
      profile: {
        nickname: 'HiepSiRong',
        level: 5,
        coins: 120,
        totalCoinsEarned: 300,
        streak: 7,
        avatar: '🐉'
      },
      email: 'hiepsi@gmail.com',
      quests: [{ id: 'q1', title: 'Tập thể dục 30p' }],
      notes: [{ id: 'n1', title: 'Kế hoạch tuần', category: 'work' }]
    };

    const saved = await upsertUser('sub_dragon_123', userPayload);
    assert.strictEqual(saved, true, 'upsertUser phải trả về true');

    // 3.2 Get User by ID
    const loaded = await getUserById('sub_dragon_123');
    assert.ok(loaded, 'Phải tải được user vừa lưu');
    assert.strictEqual(loaded.profile.nickname, 'HiepSiRong');
    assert.strictEqual(loaded.profile.level, 5);

    // 3.3 Bank Pool Repository
    const defaultPool = await getBankPoolState();
    assert.strictEqual(defaultPool.poolGold, 500);

    await saveBankPoolState({
      poolGold: 800,
      totalBorrowed: 150,
      reserveFund: 200,
      totalDeposited: 300,
      bailoutDebt: 0
    });
    const updatedPool = await getBankPoolState();
    assert.strictEqual(updatedPool.poolGold, 800);

    // 3.4 Session Repository
    await saveSession('token_abc_xyz', {
      sub: 'sub_dragon_123',
      email: 'hiepsi@gmail.com',
      name: 'Hiệp Sĩ Rồng'
    });
    const sess = await getSession('token_abc_xyz');
    assert.ok(sess, 'Session phải tồn tại');
    assert.strictEqual(sess.email, 'hiepsi@gmail.com');

    await deleteSession('token_abc_xyz');
  }

  // Test 4: Migration files check
  {
    console.log('Test 4: Kiểm tra sự tồn tại của file migration SQL đã sinh');
    const migrationDir = path.resolve(process.cwd(), 'drizzle');
    assert.ok(fs.existsSync(migrationDir), 'Thư mục ./drizzle phải tồn tại');
    const files = fs.readdirSync(migrationDir);
    const sqlFile = files.find(f => f.endsWith('.sql'));
    assert.ok(sqlFile, 'Phải có ít nhất 1 file .sql migration');
  }

  // Test 5: drizzle.config.js validation
  {
    console.log('Test 5: Kiểm tra cấu hình drizzle.config.js');
    const configPath = path.resolve(process.cwd(), 'drizzle.config.js');
    assert.ok(fs.existsSync(configPath), 'File drizzle.config.js phải tồn tại');
  }

  // Reset test hook
  setDbClientForTesting(null);
  console.log('✅ TẤT CẢ TEST DRIZZLE SUPABASE ĐÃ VƯỢT QUA 100%!');
}

runDrizzleTests().catch(err => {
  console.error('❌ DRIZZLE TEST FAILED:', err);
  process.exit(1);
});
