import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import handler, {
  setRedisClientForTesting,
  setGoogleTokenVerifierForTesting,
  deriveLegitimateBalance,
  calculateBankRates,
  signQuest
} from '../api/sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Bắt đầu kiểm thử Toàn Diện Đồng Bộ Trạng Thái & Khắc Phục Bug ===\n');

// Mock Redis client
class MockRedis {
  constructor() {
    this.store = new Map();
    this.sets = new Map();
    this.sortedSets = new Map();
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async set(key, val) {
    this.store.set(key, String(val));
    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    this.sets.delete(key);
    this.sortedSets.delete(key);
    return 1;
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter(k => regex.test(k));
  }

  async sadd(key, val) {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    this.sets.get(key).add(String(val));
    return 1;
  }

  async smembers(key) {
    if (!this.sets.has(key)) return [];
    return Array.from(this.sets.get(key));
  }

  async srem(key, val) {
    if (!this.sets.has(key)) return 0;
    return this.sets.get(key).delete(String(val)) ? 1 : 0;
  }

  async zadd(key, score, val) {
    if (!this.sortedSets.has(key)) this.sortedSets.set(key, new Map());
    this.sortedSets.get(key).set(String(val), Number(score));
    return 1;
  }

  async zrem(key, val) {
    if (!this.sortedSets.has(key)) return 0;
    return this.sortedSets.get(key).delete(String(val)) ? 1 : 0;
  }

  async zrevrange(key, start, stop, withScores) {
    if (!this.sortedSets.has(key)) return [];
    const entries = Array.from(this.sortedSets.get(key).entries()).sort((a, b) => b[1] - a[1]);
    const sliced = entries.slice(start, stop === -1 ? undefined : stop + 1);
    if (withScores === 'WITHSCORES') {
      const res = [];
      for (const [v, s] of sliced) {
        res.push(v, String(s));
      }
      return res;
    }
    return sliced.map(e => e[0]);
  }

  async mget(...keys) {
    return keys.map(k => this.store.get(k) || null);
  }
}

const mockRedis = new MockRedis();
setRedisClientForTesting(mockRedis);

setGoogleTokenVerifierForTesting(async (token) => {
  if (token) {
    return {
      sub: 'google_user_' + token,
      email: token + '@gmail.com',
      name: 'HeroTester',
      picture: 'https://avatar.png'
    };
  }
  return null;
});

function createMockRes() {
  let resData = null;
  const res = {
    statusCode: 200,
    setHeader: () => res,
    status: (code) => {
      res.statusCode = code;
      return {
        json: (data) => {
          resData = { code, data };
          return resData;
        }
      };
    },
    json: (data) => {
      resData = { code: res.statusCode, data };
      return resData;
    }
  };
  return { res, getResult: () => resData };
}

async function runTests() {
  // -------------------------------------------------------------
  // Test 1: Hoàn tác nhiệm vụ 1 lần không bị kẹt status 'completed'
  // -------------------------------------------------------------
  {
    const token = 'token_undo_onetime';
    const googleId = `google_user_${token}`;
    const userKey = `levelup:user:google:${googleId}`;

    const questSig = signQuest('quest_undo_1', 20, false);
    const quest1 = {
      id: 'quest_undo_1',
      title: 'Nhiệm vụ 1 lần thử thách',
      rewardCoins: 20,
      isRepeatable: false,
      status: 'completed',
      completed: true,
      completedAt: Date.now() - 5000,
      signature: questSig
    };

    // DB ban đầu: Nhiệm vụ 1 lần đã hoàn thành
    const existingState = {
      profile: {
        nickname: 'KnightUndoer',
        coins: 40,
        totalCoinsEarned: 40,
        level: 1
      },
      completedQuestIds: ['quest_undo_1'],
      quests: [{ ...quest1 }],
      inventory: [],
      ledger: []
    };
    await mockRedis.set(userKey, JSON.stringify(existingState));
    await mockRedis.sadd('levelup:all_users', googleId);

    // Client hoàn tác nhiệm vụ
    const undoneQuest = {
      ...quest1,
      status: 'active',
      completed: false
    };
    delete undoneQuest.completedAt;

    const undoReq = {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: {
        nickname: 'KnightUndoer',
        token,
        state: {
          profile: {
            nickname: 'KnightUndoer',
            coins: 20,
            totalCoinsEarned: 20,
            level: 1
          },
          completedQuestIds: [],
          quests: [undoneQuest],
          inventory: [],
          ledger: []
        }
      }
    };

    const { res: res1, getResult: getRes1 } = createMockRes();
    await handler(undoReq, res1);

    const savedAfterUndo = JSON.parse(await mockRedis.get(userKey));
    const savedQuest = savedAfterUndo.quests.find(q => q.id === 'quest_undo_1');
    assert.strictEqual(savedQuest.status, 'active', 'Nhiệm vụ 1 lần sau khi hoàn tác phải giữ trạng thái active!');
    assert.strictEqual(savedAfterUndo.completedQuestIds.includes('quest_undo_1'), false, 'completedQuestIds không được chứa ID đã hoàn tác!');

    // Chống Replay Attack với nhiệm vụ lịch sử đã hoàn thành và cắt tỉa
    const replaySig = signQuest('quest_pruned_hist', 25, false);
    const replayState = {
      ...savedAfterUndo,
      completedQuestIds: ['quest_pruned_hist'],
      quests: []
    };
    await mockRedis.set(userKey, JSON.stringify(replayState));

    const hackerReq = {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: {
        nickname: 'KnightUndoer',
        token,
        state: {
          ...replayState,
          quests: [{
            id: 'quest_pruned_hist',
            title: 'Nhiệm vụ hack replay',
            rewardCoins: 25,
            isRepeatable: false,
            status: 'active',
            signature: replaySig
          }]
        }
      }
    };

    const { res: resHack, getResult: getResHack } = createMockRes();
    await handler(hackerReq, resHack);
    const savedAfterHack = JSON.parse(await mockRedis.get(userKey));
    const hackedQuest = savedAfterHack.quests.find(q => q.id === 'quest_pruned_hist');
    assert.strictEqual(hackedQuest.status, 'completed', 'Replay Attack với nhiệm vụ lịch sử đã hoàn thành phải bị chặn và ép về completed!');
    console.log('✓ Test 1: Hoàn tác nhiệm vụ 1 lần thành công, đồng thời Replay Attack vẫn bị chặn đứng 100%.');
  }

  // -------------------------------------------------------------
  // Test 2: admin_list_users trả về thuộc tính bank (overdueCount)
  // -------------------------------------------------------------
  {
    process.env.ADMIN_TOKEN = 'secret_admin_master_token';
    const borrowerUser = {
      profile: {
        googleId: 'borrower_sub_1',
        nickname: 'Nợ Quá Hạn',
        level: 2,
        coins: 10,
        totalCoinsEarned: 50,
        bank: {
          deposited: 0,
          loan: {
            principal: 50,
            debt: 60,
            isOverdue: true
          },
          isFrozen: true
        }
      },
      quests: [],
      inventory: [],
      ledger: []
    };

    await mockRedis.set('levelup:user:google:borrower_sub_1', JSON.stringify(borrowerUser));
    await mockRedis.sadd('levelup:all_users', 'borrower_sub_1');

    const req = {
      method: 'GET',
      headers: { authorization: `Bearer secret_admin_master_token` },
      query: { action: 'admin_list_users' }
    };

    const { res, getResult } = createMockRes();
    await handler(req, res);
    const result = getResult();
    assert.strictEqual(result?.code, 200);
    const users = result.data.users;
    const foundBorrower = users.find(u => u.sub === 'borrower_sub_1');
    assert.ok(foundBorrower, 'Phải tìm thấy borrower');
    assert.ok(foundBorrower.bank, 'Phải có thuộc tính bank');
    assert.strictEqual(foundBorrower.bank.loan?.isOverdue, true, 'isOverdue phải là true');

    // Kiểm tra client tính overdueCount
    let clientOverdueCount = 0;
    users.forEach(u => {
      if (u.bank?.loan?.isOverdue || u.bank?.isFrozen) clientOverdueCount++;
    });
    assert.strictEqual(clientOverdueCount, 1, 'Client phải tính được chính xác 1 tài khoản quá hạn/đóng băng!');
    console.log('✓ Test 2: admin_list_users trả về dữ liệu bank, giải quyết triệt để lỗi overdueCount = 0.');
  }

  // -------------------------------------------------------------
  // Test 3: deriveLegitimateBalance Client & Server đồng nhất
  // -------------------------------------------------------------
  {
    const clientAppFile = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
    const startIdx = clientAppFile.indexOf('function deriveLegitimateBalance(state) {');
    assert.ok(startIdx !== -1, 'Phải tìm thấy deriveLegitimateBalance trong app.js');
    const endIdx = clientAppFile.indexOf('async function syncWithCloud', startIdx);
    const clientFuncCode = clientAppFile.slice(startIdx, endIdx);
    const clientDeriveFn = new Function('state', `${clientFuncCode}; return deriveLegitimateBalance(state);`);

    const testState = {
      profile: {
        nickname: 'AdminBlessedUser',
        adminAdjusted: true,
        coins: 60, // Admin cấp thêm 40 Vàng (tổng trong ví là 60)
        totalCoinsEarned: 40,
        level: 1,
        bank: {
          deposited: 80, // Đang gửi 80 Vàng trong ngân hàng
          loan: null
        }
      },
      quests: [],
      inventory: [],
      ledger: []
    };

    const serverResult = deriveLegitimateBalance(testState, null);
    assert.strictEqual(serverResult.tampered, false, 'Server không được đánh dấu tampered');
    assert.strictEqual(serverResult.coins, 60, 'Server phải bảo toàn 60 Vàng');

    const clientResult = clientDeriveFn(testState);
    assert.strictEqual(clientResult.tampered, false, 'Client không được đánh dấu tampered');
    assert.strictEqual(clientResult.coins, 60, 'Client phải bảo toàn 60 Vàng không bị trừ phạt');
    console.log('✓ Test 3: deriveLegitimateBalance phía Client & Server đồng nhất tuyệt đối khi tài khoản có tiền gửi.');
  }

  // -------------------------------------------------------------
  // Test 4: Đồng bộ Bể thanh khoản AMM khi người chơi gửi tiết kiệm
  // -------------------------------------------------------------
  {
    const pool = {
      poolGold: 500,
      totalBorrowed: 0,
      totalDeposited: 0,
      reserveFund: 150,
      bailoutDebt: 0
    };
    await mockRedis.set('levelup:bank:pool', JSON.stringify(pool));

    const token = 'token_saver_test';
    const googleId = `google_user_${token}`;
    const userKey = `levelup:user:google:${googleId}`;

    const existingState = {
      profile: {
        nickname: 'Saver',
        coins: 100,
        totalCoinsEarned: 100,
        level: 2,
        bank: {
          deposited: 0,
          depositInterest: 0
        }
      },
      quests: [],
      inventory: [],
      ledger: []
    };
    await mockRedis.set(userKey, JSON.stringify(existingState));
    await mockRedis.sadd('levelup:all_users', googleId);

    // User gửi 50 Vàng tiết kiệm
    const syncReq = {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: {
        nickname: 'Saver',
        token,
        state: {
          profile: {
            nickname: 'Saver',
            coins: 50,
            totalCoinsEarned: 100,
            level: 2,
            bank: {
              deposited: 50,
              depositInterest: 0
            }
          },
          quests: [],
          inventory: [],
          ledger: []
        }
      }
    };

    const { res, getResult } = createMockRes();
    await handler(syncReq, res);
    const updatedPool = JSON.parse(await mockRedis.get('levelup:bank:pool'));
    assert.strictEqual(updatedPool.totalDeposited, 50, 'totalDeposited trong pool phải tăng lên 50');
    assert.strictEqual(updatedPool.poolGold, 550, 'poolGold trong pool phải tăng từ 500 lên 550');
    console.log('✓ Test 4: Đồng bộ tiền gửi tiết kiệm và tài sản Bể AMM (totalDeposited & poolGold) thành công.');
  }

  // -------------------------------------------------------------
  // Test 5: Hoàn nợ Kho Bạc (bailoutDebt) khi trả nợ qua quest
  // -------------------------------------------------------------
  {
    await mockRedis.del('levelup:user:google:borrower_sub_1');
    await mockRedis.srem('levelup:all_users', 'borrower_sub_1');

    const pool = {
      poolGold: 505,
      totalBorrowed: 40,
      totalDeposited: 0,
      reserveFund: 150,
      bailoutDebt: 30
    };
    await mockRedis.set('levelup:bank:pool', JSON.stringify(pool));

    const token = 'token_debtor_test';
    const googleId = `google_user_${token}`;
    const userKey = `levelup:user:google:${googleId}`;

    const existingState = {
      profile: {
        nickname: 'Debtor',
        coins: 10,
        totalCoinsEarned: 40,
        level: 2,
        bank: {
          loan: {
            principal: 40,
            debt: 40
          }
        }
      },
      quests: [],
      inventory: [],
      ledger: []
    };
    await mockRedis.set(userKey, JSON.stringify(existingState));
    await mockRedis.sadd('levelup:all_users', googleId);

    // Nhiệm vụ trích nợ 20 Vàng (nợ giảm từ 40 về 20)
    const syncReq = {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: {
        nickname: 'Debtor',
        token,
        state: {
          profile: {
            nickname: 'Debtor',
            coins: 10,
            totalCoinsEarned: 60,
            level: 2,
            bank: {
              loan: {
                principal: 20,
                debt: 20
              }
            }
          },
          quests: [],
          inventory: [],
          ledger: []
        }
      }
    };

    const { res, getResult } = createMockRes();
    await handler(syncReq, res);
    const updatedPool = JSON.parse(await mockRedis.get('levelup:bank:pool'));
    assert.strictEqual(updatedPool.totalBorrowed, 20, 'totalBorrowed phải giảm còn 20');
    assert.strictEqual(updatedPool.bailoutDebt, 10, 'bailoutDebt phải được hoàn 20 Vàng, còn lại 10');
    assert.strictEqual(updatedPool.poolGold, 505, 'poolGold sau khi hoàn trả nợ cứu trợ là 505');
    console.log('✓ Test 5: Hoàn nợ cứu trợ Kho Bạc (bailoutDebt) tự động khi có thặng dư trả nợ qua Quest.');
  }

  console.log('\n🎉 TẤT CẢ 5 BỘ KIỂM THỬ ĐỒNG BỘ TRẠNG THÁI ĐÃ VƯỢT QUA 100%!');
}

runTests().catch(err => {
  console.error('❌ Lỗi kiểm thử:', err);
  process.exit(1);
});
