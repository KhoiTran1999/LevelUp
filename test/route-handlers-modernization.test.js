import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { GET as aiGet, POST as aiPost, OPTIONS as aiOptions } from '../app/api/ai/route.ts';
import { GET as syncGet, POST as syncPost, OPTIONS as syncOptions } from '../app/api/sync/route.ts';
import { setRedisClientForTesting } from '../api/sync.js';

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

setRedisClientForTesting(new InMemoryRedisMock());

test('Step 3: Route Handlers Modernization & Typing', async () => {
  const root = process.cwd();

  // 1. Types definition verification
  const serverApiPath = path.join(root, 'types', 'server-api.ts');
  const apiModulesPath = path.join(root, 'types', 'api-modules.d.ts');
  assert.ok(fs.existsSync(serverApiPath), 'types/server-api.ts must exist');
  assert.ok(fs.existsSync(apiModulesPath), 'types/api-modules.d.ts must exist');

  const serverApiCode = fs.readFileSync(serverApiPath, 'utf8');
  assert.ok(serverApiCode.includes('interface LegacyApiRequest'), 'Must export LegacyApiRequest');
  assert.ok(serverApiCode.includes('interface LegacyApiResponse'), 'Must export LegacyApiResponse');
  assert.ok(serverApiCode.includes('interface ServerSentEventBroadcaster'), 'Must export ServerSentEventBroadcaster');

  // 2. Eliminate // @ts-ignore verification
  const aiRouteCode = fs.readFileSync(path.join(root, 'app', 'api', 'ai', 'route.ts'), 'utf8');
  const syncRouteCode = fs.readFileSync(path.join(root, 'app', 'api', 'sync', 'route.ts'), 'utf8');

  assert.ok(!aiRouteCode.includes('// @ts-ignore'), 'app/api/ai/route.ts must not have // @ts-ignore');
  assert.ok(!syncRouteCode.includes('// @ts-ignore'), 'app/api/sync/route.ts must not have // @ts-ignore');

  // 3. Test OPTIONS preflight
  const aiOpt = await aiOptions();
  assert.equal(aiOpt.status, 204);
  assert.equal(aiOpt.headers.get('Access-Control-Allow-Origin'), '*');

  const syncOpt = await syncOptions();
  assert.equal(syncOpt.status, 204);
  assert.equal(syncOpt.headers.get('Access-Control-Allow-Origin'), '*');

  // 4. Test GET method restrictions
  const aiGetRes = await aiGet();
  assert.equal(aiGetRes.status, 405);

  const syncGetReq = new Request('http://localhost:3000/api/sync?action=auth_config', { method: 'GET' });
  const syncGetRes = await syncGet(syncGetReq);
  assert.equal(syncGetRes.status, 200);
  const syncData = await syncGetRes.json();
  assert.ok(syncData.googleClientId !== undefined);

  // 5. Test JSON validation
  const badReq = new Request('http://localhost:3000/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'bad_json{'
  });
  const badRes = await aiPost(badReq);
  assert.equal(badRes.status, 400);

  const badSyncReq = new Request('http://localhost:3000/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'bad_json{'
  });
  const badSyncRes = await syncPost(badSyncReq);
  assert.equal(badSyncRes.status, 400);
});
