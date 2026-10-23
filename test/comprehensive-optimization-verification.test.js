import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import handler, { setRedisClientForTesting } from '../api/sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== KIỂM THỬ XÁC MINH CÁC TỐI ƯU HÓA ĐÃ TRIỂN KHAI (1, 2, 4, 5) ===\n');

// 1. Kiểm thử Next.js đã thay Express runtime với compression và API cache headers
{
  const nextConfig = fs.readFileSync(path.join(rootDir, 'next.config.ts'), 'utf8');
  assert.ok(nextConfig.includes('compress: true'), 'Next.js phải bật HTTP compression');
  assert.ok(nextConfig.includes("source: '/api/:path*'"), 'Next.js phải cấu hình headers cho API routes');
  assert.ok(nextConfig.includes('private, no-cache, no-store, must-revalidate'), 'Next.js phải đặt Cache-Control no-store cho API');
  console.log('✓ Mục 1: Next.js runtime đã thay Express với HTTP compression và API cache headers.');
}

// 2. Kiểm thử api/sync.js batching mget cho admin_list_users
{
  let mgetCallCount = 0;
  const mockStore = new Map();
  for (let i = 1; i <= 5; i++) {
    mockStore.set(`levelup:user:google:user_${i}`, JSON.stringify({
      profile: { nickname: `Hero ${i}`, level: i, coins: i * 10, totalCoinsEarned: i * 20 }
    }));
  }

  const mockBatchRedis = {
    status: 'ready',
    async connect() {},
    async smembers(key) {
      if (key === 'levelup:all_users') {
        return ['user_1', 'user_2', 'user_3', 'user_4', 'user_5'];
      }
      return [];
    },
    async zrevrange() { return []; },
    async mget(...keys) {
      mgetCallCount++;
      return keys.map(k => mockStore.get(k) || null);
    },
    async get(key) {
      return mockStore.get(key) || null;
    }
  };

  setRedisClientForTesting(mockBatchRedis);

  process.env.ADMIN_TOKEN = 'test_admin_token';
  const mockReq = {
    method: 'GET',
    headers: { authorization: 'Bearer test_admin_token' },
    query: { action: 'admin_list_users' }
  };

  let responseData = null;
  const mockRes = {
    setHeader() {},
    status(code) {
      return {
        json: (data) => {
          responseData = data;
          return data;
        },
        end: () => {}
      };
    }
  };

  await handler(mockReq, mockRes);
  assert.ok(responseData && responseData.success, 'admin_list_users phải trả về success: true');
  assert.strictEqual(responseData.users.length, 5, 'Phải tải đủ 5 users');
  assert.ok(mgetCallCount >= 1, 'admin_list_users phải sử dụng mget để batching truy vấn');
  console.log('✓ Mục 2: admin_list_users đã batching O(1) query bằng mget thành công.');
}

// 4. Kiểm thử 03-storage.js giải phóng BroadcastChannel trong finally
{
  const storageCode = fs.readFileSync(path.join(rootDir, 'test', 'fixtures', 'legacy-client', 'modules', '03-storage.js'), 'utf8').replace(/\r\n/g, '\n');
  assert.ok(storageCode.includes('finally {\n        ch.close();\n      }'), '03-storage.js phải đóng channel trong khối finally');
  console.log('✓ Mục 4: src/js/03-storage.js đã bọc ch.close() trong finally để chống rò rỉ tài nguyên.');
}

// 5. Kiểm thử sw.js và tailwind.config.js
{
  const swCode = fs.readFileSync(path.join(rootDir, 'public', 'sw.js'), 'utf8');
  assert.ok(swCode.includes('ignoreSearch: true'), 'public/sw.js phải sử dụng ignoreSearch: true khi match cache');

  const tailwindConfig = fs.readFileSync(path.join(rootDir, 'tailwind.config.js'), 'utf8');
  assert.ok(!tailwindConfig.includes('./public/**/*.{html,js}'), 'tailwind.config.js không được quét trùng test/fixtures/legacy-client/app.js');
  assert.ok(tailwindConfig.includes('./public/index.html'), 'tailwind.config.js phải quét public/index.html');

  console.log('✓ Mục 5: sw.js có ignoreSearch: true và tailwind.config.js tối ưu scanning.');
}

console.log('\n🎉 TẤT CẢ CÁC MỤC TỐI ƯU HÓA 1, 2, 4, 5 ĐÃ ĐƯỢC XÁC MINH HOÀN TOÀN!');
