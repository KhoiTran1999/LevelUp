import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isSupabaseConfigured, isR2Configured, isStorageConfigured, uploadProofImage } from '../api/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const appJsContent = fs.readFileSync(path.join(rootDir, 'public', 'app.js'), 'utf8');
const indexHtmlContent = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');
const aiJsContent = fs.readFileSync(path.join(rootDir, 'api', 'ai.js'), 'utf8');

test('Supabase Storage: isSupabaseConfigured trả về false khi chưa set biến môi trường', () => {
  const origUrl = process.env.SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const origAnon = process.env.SUPABASE_KEY;

  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_KEY;

  assert.equal(isSupabaseConfigured(), false);

  if (origUrl) process.env.SUPABASE_URL = origUrl;
  if (origKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  if (origAnon) process.env.SUPABASE_KEY = origAnon;
});

test('Supabase Storage: isSupabaseConfigured trả về true khi có đủ URL và Key', () => {
  const origUrl = process.env.SUPABASE_URL;
  const origKey = process.env.SUPABASE_KEY;

  process.env.SUPABASE_URL = 'https://mockproject.supabase.co';
  process.env.SUPABASE_KEY = 'mock_key_secret';

  assert.equal(isSupabaseConfigured(), true);
  assert.equal(isStorageConfigured(), true);

  if (origUrl) process.env.SUPABASE_URL = origUrl; else delete process.env.SUPABASE_URL;
  if (origKey) process.env.SUPABASE_KEY = origKey; else delete process.env.SUPABASE_KEY;
});

test('R2 Storage: isR2Configured trả về false khi thiếu biến môi trường', () => {
  const originalAccount = process.env.R2_ACCOUNT_ID;
  delete process.env.R2_ACCOUNT_ID;

  assert.equal(isR2Configured(), false);

  if (originalAccount) {
    process.env.R2_ACCOUNT_ID = originalAccount;
  }
});

test('Storage: uploadProofImage trả về null an toàn khi chưa cấu hình cloud storage (Graceful Fallback)', async () => {
  const origR2Account = process.env.R2_ACCOUNT_ID;
  const origSupaUrl = process.env.SUPABASE_URL;
  delete process.env.R2_ACCOUNT_ID;
  delete process.env.SUPABASE_URL;

  const result = await uploadProofImage({
    imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    questId: 'test_quest',
    userId: 'user_123'
  });

  assert.equal(result, null, 'uploadProofImage phải trả về null và không throw error khi unconfigured');

  if (origR2Account) process.env.R2_ACCOUNT_ID = origR2Account;
  if (origSupaUrl) process.env.SUPABASE_URL = origSupaUrl;
});

test('Storage: uploadProofImage từ chối dữ liệu ảnh rỗng', async () => {
  const result = await uploadProofImage({
    imageBase64: '',
    questId: 'test_quest'
  });
  assert.equal(result, null);
});

test('Storage: verify_proof trong api/ai.js tích hợp uploadProofImage', () => {
  assert.ok(
    aiJsContent.includes("import { uploadProofImage } from './storage.js';"),
    'api/ai.js phải import uploadProofImage'
  );
  assert.ok(
    aiJsContent.includes('proofImageUrl = await uploadProofImage({'),
    'verify_proof phải gọi uploadProofImage khi AI duyệt thành công'
  );
  assert.ok(
    aiJsContent.includes('proofImageUrl'),
    'verify_proof phải trả về proofImageUrl trong payload phản hồi'
  );
});

test('Storage UI: public/index.html có modal modal-proof-viewer', () => {
  assert.match(indexHtmlContent, /id="modal-proof-viewer"/, 'index.html phải có modal-proof-viewer');
  assert.match(indexHtmlContent, /id="proof-viewer-img"/, 'index.html phải có thẻ img cho viewer');
  assert.match(indexHtmlContent, /id="proof-viewer-title"/, 'index.html phải có title viewer');
});

test('Storage UI: public/app.js có hàm openProofViewerModal và nút btn-view-proof-img', () => {
  assert.ok(
    appJsContent.includes('function openProofViewerModal('),
    'app.js phải chứa hàm openProofViewerModal'
  );
  assert.ok(
    appJsContent.includes('btn-view-proof-img'),
    'app.js phải chứa class btn-view-proof-img để mở modal xem ảnh'
  );
});
