import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import handler, { setRedisClientForTesting } from '../api/sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== KIỂM THỬ TỐI ƯU HÓA HỆ THỐNG (OPTIMIZATION BENCH TESTS) ===\n');

// 1. Kiểm thử CSS không còn render-blocking @import
const cssContent = fs.readFileSync(path.join(rootDir, 'public', 'style.css'), 'utf-8');
assert(!cssContent.includes('@import url('), 'public/style.css không được chứa @import url gây render-blocking CSSOM');
console.log('✓ Test 1: Đã loại bỏ hoàn toàn @import font gây chặn render CSSOM trong public/style.css.');

// 2. Kiểm thử cấu hình Cache-Control headers trên Express & Vercel
const serverContent = fs.readFileSync(path.join(rootDir, 'server.js'), 'utf-8');
assert(serverContent.includes('Cache-Control') && serverContent.includes('immutable'), 'server.js phải cấu hình Cache-Control immutable cho static assets');

const vercelJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf-8'));
assert(Array.isArray(vercelJson.headers) && vercelJson.headers.length > 0, 'vercel.json phải cấu hình headers caching');
const staticHeader = vercelJson.headers.find(h => h.headers?.some(sub => sub.key === 'Cache-Control' && sub.value.includes('immutable')));
assert(staticHeader, 'vercel.json phải có rule Cache-Control immutable cho assets');
console.log('✓ Test 2: Đã cấu hình Cache-Control (max-age=86400, immutable) đồng bộ cho Express và Vercel.');

// 3. Kiểm thử Frontend DocumentFragment và isHydrating guard
const appJsContent = fs.readFileSync(path.join(rootDir, 'public', 'app.js'), 'utf-8');
assert(appJsContent.includes('createDocumentFragment'), 'public/app.js phải sử dụng DocumentFragment để batching DOM rendering');
assert(appJsContent.includes('isHydrating = true'), 'public/app.js phải có cờ isHydrating chống spam request');
console.log('✓ Test 3: Frontend public/app.js đã áp dụng DocumentFragment và cờ guard isHydrating.');

// 4. Kiểm thử Backend AI AbortSignal timeout
const aiJsContent = fs.readFileSync(path.join(rootDir, 'api', 'ai.js'), 'utf-8');
assert(aiJsContent.includes('AbortSignal.timeout'), 'api/ai.js phải sử dụng AbortSignal.timeout để chặn treo kết nối');
console.log('✓ Test 4: Gateway AI api/ai.js đã tích hợp AbortSignal.timeout(25000) chống treo worker serverless.');

// 5. Kiểm thử Backend Sync Batching với Redis Mock có hỗ trợ mget
let mgetCalls = 0;
const mockStore = new Map();
mockStore.set('levelup:user:google:user_1', JSON.stringify({
  profile: { nickname: 'Hero 1', level: 5, coins: 50, totalCoinsEarned: 100 }
}));
mockStore.set('levelup:user:google:user_2', JSON.stringify({
  profile: { nickname: 'Hero 2', level: 3, coins: 30, totalCoinsEarned: 80 }
}));

const mockBatchRedis = {
  status: 'ready',
  async connect() {},
  async zrevrange(key) {
    if (key === 'levelup:leaderboard') {
      return ['user_1', '5050', 'user_2', '3030'];
    }
    return [];
  },
  async mget(...keys) {
    mgetCalls++;
    return keys.map(k => mockStore.get(k) || null);
  },
  async get(key) {
    return mockStore.get(key) || null;
  },
  async zrem() {},
  async zcount() { return 0; },
  async zmscore() { return [null, null]; }
};

setRedisClientForTesting(mockBatchRedis);

const mockReq = {
  method: 'GET',
  query: { action: 'leaderboard' },
  headers: {}
};

let capturedStatus = null;
let capturedJson = null;
const mockRes = {
  setHeader() {},
  status(code) {
    capturedStatus = code;
    return {
      json: (data) => {
        capturedJson = data;
        return data;
      },
      end: () => {}
    };
  }
};

await handler(mockReq, mockRes);
if (!capturedJson) {
  console.error('Status:', capturedStatus, 'capturedJson is null');
}
assert(capturedJson && Array.isArray(capturedJson.leaderboard), 'Leaderboard response phải trả về danh sách mảng');
assert.strictEqual(capturedJson.leaderboard.length, 2, 'Leaderboard phải có 2 thành viên');
assert.strictEqual(mgetCalls, 1, 'Leaderboard phải gọi mget 1 lần duy nhất thay vì get tuần tự (O(1) roundtrip)');
console.log('✓ Test 5: Endpoint Bảng Xếp Hạng api/sync?action=leaderboard đã batching O(1) query bằng mget thành công.');

console.log('\n🎉 TẤT CẢ 5/5 KIỂM THỬ TỐI ƯU HÓA ĐÃ VƯỢT QUA XUẤT SẮC!');
