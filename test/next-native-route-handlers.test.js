/**
 * Automated Test Suite: Native Next.js 16 Route Handlers (Web Streams & Drizzle ORM)
 * Tests Native Request/Response APIs, CORS, Web Streams ReadableStream SSE, and Drizzle ORM integration
 */
import assert from 'node:assert';
import { GET as syncGet, POST as syncPost, OPTIONS as syncOptions } from '../app/api/sync/route.ts';
import { GET as aiGet, POST as aiPost, OPTIONS as aiOptions } from '../app/api/ai/route.ts';
import { setRedisClientForTesting, setGoogleTokenVerifierForTesting } from '../api/sync.js';
import { isDbConfigured, setDbClientForTesting } from '../src/db/index.js';
import { handleGetMyUserData, handleGetBankMarketStatus } from '../api/ai.js';

console.log('=== KIỂM THỬ NATIVE NEXT.JS 16 ROUTE HANDLERS & WEB STREAMS ===\n');

class InMemoryRedisMock {
  constructor() {
    this.store = new Map();
  }
  async get(key) {
    return this.store.get(key) || null;
  }
  async set(key, val) {
    this.store.set(key, val);
    return 'OK';
  }
  async del(key) {
    this.store.delete(key);
    return 1;
  }
  async zrevrange() {
    return [];
  }
  async zadd() {
    return 1;
  }
  async zrem() {
    return 1;
  }
  async sadd() {
    return 1;
  }
  async smembers() {
    return [];
  }
}

const redisMock = new InMemoryRedisMock();
setRedisClientForTesting(redisMock);

// -----------------------------------------------------------------------------
// 1. Kiểm thử Native OPTIONS (CORS Preflight)
// -----------------------------------------------------------------------------
{
  console.log('Test 1: Kiểm thử Native CORS OPTIONS cho cả hai Route Handlers...');
  const syncOptRes = await syncOptions();
  assert.strictEqual(syncOptRes.status, 204, 'Sync OPTIONS phải trả về HTTP 204 No Content');
  assert.strictEqual(syncOptRes.headers.get('access-control-allow-origin'), '*', 'Phải có header Access-Control-Allow-Origin');
  assert.ok(syncOptRes.headers.get('access-control-allow-methods').includes('POST'), 'Phải cho phép POST');

  const aiOptRes = await aiOptions();
  assert.strictEqual(aiOptRes.status, 204, 'AI OPTIONS phải trả về HTTP 204 No Content');
  assert.strictEqual(aiOptRes.headers.get('access-control-allow-origin'), '*', 'Phải có header Access-Control-Allow-Origin');
  console.log('✓ Test 1: Native CORS Preflight OPTIONS hoạt động chuẩn mực.\n');
}

// -----------------------------------------------------------------------------
// 2. Kiểm thử Native Sync GET (/api/sync)
// -----------------------------------------------------------------------------
{
  console.log('Test 2: Kiểm thử Native Sync GET actions...');
  
  // 2a. action=auth_config
  const reqAuthConfig = new Request('http://localhost:3000/api/sync?action=auth_config', {
    method: 'GET'
  });
  const resAuthConfig = await syncGet(reqAuthConfig);
  assert.strictEqual(resAuthConfig.status, 200, 'auth_config phải trả về HTTP 200');
  const jsonAuthConfig = await resAuthConfig.json();
  assert.ok(jsonAuthConfig.googleClientId !== undefined, 'Phải có trường googleClientId');

  // 2b. action=bank_state
  const reqBankState = new Request('http://localhost:3000/api/sync?action=bank_state', {
    method: 'GET'
  });
  const resBankState = await syncGet(reqBankState);
  assert.strictEqual(resBankState.status, 200, 'bank_state phải trả về HTTP 200');
  const jsonBankState = await resBankState.json();
  assert.ok(jsonBankState.pool, 'bank_state phải trả về pool');
  assert.ok(jsonBankState.pool.borrowRate !== undefined, 'bank_state pool phải có borrowRate');

  // 2c. action=check_nickname
  const reqNick = new Request('http://localhost:3000/api/sync?action=check_nickname&nickname=Hero2026', {
    method: 'GET'
  });
  const resNick = await syncGet(reqNick);
  assert.strictEqual(resNick.status, 200, 'check_nickname phải trả về HTTP 200');
  const jsonNick = await resNick.json();
  assert.strictEqual(typeof jsonNick.available, 'boolean', 'Phải có trường available kiểu boolean');

  console.log('✓ Test 2: Native Sync GET các endpoint thành công xuất sắc.\n');
}

// -----------------------------------------------------------------------------
// 3. Kiểm thử Native AI GET & POST Không Hợp Lệ
// -----------------------------------------------------------------------------
{
  console.log('Test 3: Kiểm thử từ chối Method không hợp lệ trên AI Route...');
  const resGet = await aiGet();
  assert.strictEqual(resGet.status, 405, 'GET /api/ai phải bị từ chối 405 Method Not Allowed');

  const malformedAiRequest = new Request('http://localhost:3000/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{'
  });
  const malformedAiResponse = await aiPost(malformedAiRequest);
  assert.strictEqual(malformedAiResponse.status, 400, 'JSON không hợp lệ trên /api/ai phải trả HTTP 400');
  assert.strictEqual(
    malformedAiResponse.headers.get('access-control-allow-origin'),
    '*',
    'Phản hồi JSON không hợp lệ của /api/ai phải giữ CORS headers'
  );
  assert.ok((await malformedAiResponse.json()).error, 'Phản hồi JSON không hợp lệ của /api/ai phải có thông báo lỗi');

  const malformedSyncRequest = new Request('http://localhost:3000/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{'
  });
  const malformedSyncResponse = await syncPost(malformedSyncRequest);
  assert.strictEqual(malformedSyncResponse.status, 400, 'JSON không hợp lệ trên /api/sync phải trả HTTP 400');
  assert.strictEqual(
    malformedSyncResponse.headers.get('access-control-allow-origin'),
    '*',
    'Phản hồi JSON không hợp lệ của /api/sync phải giữ CORS headers'
  );
  assert.strictEqual(
    malformedSyncResponse.headers.get('cache-control'),
    'private, no-cache, no-store, must-revalidate',
    'Phản hồi JSON không hợp lệ của /api/sync phải giữ cache policy'
  );
  assert.ok((await malformedSyncResponse.json()).error, 'Phản hồi JSON không hợp lệ của /api/sync phải có thông báo lỗi');

  const reqUnauth = new Request('http://localhost:3000/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'evaluate_quest', payload: { title: 'Tập thể dục' } })
  });
  const resUnauth = await aiPost(reqUnauth);
  assert.strictEqual(resUnauth.status, 401, 'POST /api/ai khi chưa đăng nhập phải trả về HTTP 401');
  const jsonUnauth = await resUnauth.json();
  assert.ok(jsonUnauth.error, 'Phải có thông báo lỗi chưa đăng nhập');

  console.log('✓ Test 3: Bảo vệ an ninh và từ chối method không hợp lệ hoạt động chuẩn xác.\n');
}

// -----------------------------------------------------------------------------
// 4. Kiểm thử Native AI Web Streams (ReadableStream SSE)
// -----------------------------------------------------------------------------
{
  console.log('Test 4: Kiểm thử Native Web Streams ReadableStream SSE (/api/ai)...');

  // Giả lập session admin đã xác thực
  const adminToken = process.env.ADMIN_TOKEN || 'admin_master_secret_2026_levelup';
  
  const reqStream = new Request('http://localhost:3000/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
      'Accept': 'text/event-stream'
    },
    body: JSON.stringify({
      action: 'ask_assistant',
      payload: {
        message: 'Chào bạn, hôm nay tôi nên rèn luyện thế nào?',
        history: [],
        stream: true
      }
    })
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              thought: 'Đã phân tích xong câu hỏi.',
              reply: 'Chào bạn! Hôm nay là một ngày tuyệt vời để chinh phục các nhiệm vụ trong LevelUp.',
              options: [{ id: 1, label: 'Bắt đầu ngay', argument: 'Bắt đầu ngay' }]
            })
          }
        }
      ]
    })
  });

  try {
    const resStream = await aiPost(reqStream);
    assert.strictEqual(resStream.status, 200, 'Streaming SSE phải trả về HTTP 200');
    const contentType = resStream.headers.get('content-type') || '';
    assert.ok(contentType.includes('text/event-stream'), 'Content-Type phải là text/event-stream');
    assert.ok(resStream.body, 'Phải có Web Streams body (ReadableStream)');

    // Đọc dữ liệu trực tiếp từ ReadableStream chuẩn W3C
    const reader = resStream.body.getReader();
    const decoder = new TextDecoder();
    let receivedText = '';
    let readChunks = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      readChunks++;
      receivedText += decoder.decode(value, { stream: true });
      if (receivedText.includes('event: result') || receivedText.includes('event: error')) {
        break;
      }
    }

    assert.ok(readChunks > 0, 'Phải đọc được ít nhất 1 chunk từ ReadableStream');
    assert.ok(receivedText.includes('event: reply_start') || receivedText.includes('event: chunk') || receivedText.includes('event: result'), 'Phải nhận được sự kiện SSE');
    console.log(`✓ Test 4: Web Streams ReadableStream hoạt động hoàn hảo (đọc thành công ${readChunks} chunks SSE).\n`);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// -----------------------------------------------------------------------------
// 5. Kiểm thử Tích Hợp Trực Tiếp Drizzle ORM trong API AI
// -----------------------------------------------------------------------------
{
  console.log('Test 5: Kiểm thử Drizzle ORM query trực tiếp trong handleGetMyUserData & handleGetBankMarketStatus...');

  // Mock Drizzle DB Client
  const mockDbUser = {
    id: 'test_sub_123',
    nickname: 'Chiến Binh Rồng',
    level: 5,
    coins: 150,
    totalCoinsEarned: 200,
    streak: 7,
    title: 'Chiến Binh Kiên Trì',
    email: 'test@example.com'
  };

  const mockDb = {
    select(fields) {
      return {
        from(tbl) {
          return {
            leftJoin() {
              return {
                where() {
                  return {
                    limit() {
                      return Promise.resolve([
                        {
                          users: mockDbUser,
                          user_game_states: {
                            state: {
                              profile: mockDbUser,
                              quests: [{ id: 'q1', title: 'Đọc sách 30p', type: 'focus', targetMinutes: 30, rewardCoins: 12 }],
                              shopItems: [{ name: 'Trà sữa', price: 25, tier: 'common' }],
                              bank: { deposited: 50, depositInterest: 2, loan: null }
                            }
                          }
                        }
                      ]);
                    }
                  };
                }
              };
            },
            where() {
              return {
                limit() {
                  return Promise.resolve([
                    {
                      id: 1,
                      poolGold: 500,
                      totalBorrowed: 100,
                      reserveFund: 150,
                      totalDeposited: 200,
                      bailoutDebt: 0,
                      lastAccruedAt: new Date()
                    }
                  ]);
                }
              };
            }
          };
        }
      };
    }
  };

  setDbClientForTesting(mockDb);

  const userData = await handleGetMyUserData('all', 'test_sub_123', null, {});
  assert.strictEqual(userData.profile.level, 5, 'Dữ liệu level phải lấy từ Drizzle ORM');
  assert.strictEqual(userData.profile.coins, 150, 'Dữ liệu coins phải lấy từ Drizzle ORM');
  assert.strictEqual(userData.currentQuestsCount, 1, 'Số nhiệm vụ phải đọc từ Drizzle ORM');

  const bankStatus = await handleGetBankMarketStatus(null, 'test_sub_123', {});
  assert.ok(bankStatus.standardBorrowRate !== undefined, 'Phải tính toán được lãi suất từ Drizzle bank pool');
  assert.strictEqual(bankStatus.depositFloor, 0.02, 'Lãi suất sàn tiền gửi phải chính xác');

  // Reset testing hook
  setDbClientForTesting(null);
  console.log('✓ Test 5: Drizzle ORM truy vấn trực tiếp cho AI Context và Bank Market thành công 100%.\n');
}

console.log('=== TẤT CẢ 5/5 BÀI KIỂM THỬ NATIVE NEXT.JS 16 ROUTE HANDLERS ĐÃ VƯỢT QUA 100%! ===');
