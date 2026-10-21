/**
 * Automated Test Suite: Next.js 16 Server Actions CRUD (Quests, Rewards, Notes)
 * Tests Server Actions trust boundaries, auth checks, creation, updates, and deletion.
 */
import assert from 'node:assert/strict';
import {
  saveQuestAction,
  deleteQuestAction,
  saveShopItemAction,
  deleteShopItemAction,
  saveNoteAction,
  deleteNoteAction,
  getUserStateAction,
} from '../app/actions/crud.ts';
import { setRedisClientForTesting } from '../api/sync.js';

console.log('=== KIỂM THỬ NEXT.JS SERVER ACTIONS CRUD ===\n');

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
}

const redisMock = new InMemoryRedisMock();
setRedisClientForTesting(redisMock);

const TEST_SUB = 'google_test_user_server_actions';
const TEST_TOKEN = 'test_session_token_12345';

// Pre-seed session in mock Redis
await redisMock.set(`levelup:session:${TEST_TOKEN}`, JSON.stringify({
  sub: TEST_SUB,
  email: 'hero@levelup.local',
  name: 'Hiệp Sĩ Test',
  picture: '⚔️'
}));

// Pre-seed initial user state
await redisMock.set(`levelup:user:google:${TEST_SUB}`, JSON.stringify({
  profile: {
    nickname: 'HeroTester',
    coins: 50,
    level: 1,
    googleId: TEST_SUB,
  },
  quests: [],
  shopItems: [],
  notes: [],
  inventory: [],
  ledger: [],
}));

// -----------------------------------------------------------------------------
// 1. Kiểm thử Bảo mật: Từ chối người dùng chưa xác thực
// -----------------------------------------------------------------------------
{
  console.log('Test 1: Từ chối Server Actions khi chưa xác thực...');
  const resQuest = await saveQuestAction({ title: 'Hack Quest' });
  assert.strictEqual(resQuest.success, false, 'Phải từ chối khi không có session');
  assert.ok(resQuest.error?.includes('Chưa đăng nhập'), 'Thông báo lỗi chưa đăng nhập');

  const resDelete = await deleteQuestAction('q_fake');
  assert.strictEqual(resDelete.success, false, 'Phải từ chối xóa khi không có session');

  const resShop = await saveShopItemAction({ name: 'Hack Item' });
  assert.strictEqual(resShop.success, false, 'Phải từ chối shop khi không có session');

  const resNote = await saveNoteAction({ title: 'Hack Note' });
  assert.strictEqual(resNote.success, false, 'Phải từ chối note khi không có session');
  console.log('  -> PASS: Đã chặn truy cập trái phép.');
}

// -----------------------------------------------------------------------------
// 2. Kiểm thử CRUD Nhiệm vụ (Quests)
// -----------------------------------------------------------------------------
{
  console.log('Test 2: Thêm, sửa, xóa Nhiệm vụ (Quests) qua Server Actions...');

  // Validation: empty title
  const emptyRes = await saveQuestAction({ title: '   ' }, TEST_TOKEN);
  assert.strictEqual(emptyRes.success, false, 'Phải bắt lỗi tiêu đề rỗng');

  // Create Quest
  const createdRes = await saveQuestAction({
    title: 'Học Next.js Server Actions',
    type: 'focus',
    rank: 'A',
    rewardCoins: 25,
    targetMinutes: 30,
  }, TEST_TOKEN);

  assert.strictEqual(createdRes.success, true, 'Tạo nhiệm vụ thành công');
  assert.ok(createdRes.data?.id, 'Nhiệm vụ phải có ID sinh ra');
  assert.strictEqual(createdRes.data?.title, 'Học Next.js Server Actions');
  assert.strictEqual(createdRes.data?.rewardCoins, 25);
  const questId = createdRes.data.id;

  // Update Quest
  const updatedRes = await saveQuestAction({
    id: questId,
    title: 'Học Next.js Server Actions (Đã cập nhật)',
    rewardCoins: 40,
  }, TEST_TOKEN);

  assert.strictEqual(updatedRes.success, true, 'Cập nhật nhiệm vụ thành công');
  assert.strictEqual(updatedRes.data?.title, 'Học Next.js Server Actions (Đã cập nhật)');
  assert.strictEqual(updatedRes.data?.rewardCoins, 40);

  // Verify in Redis
  const rawState = JSON.parse(await redisMock.get(`levelup:user:google:${TEST_SUB}`));
  assert.strictEqual(rawState.quests.length, 1, 'Redis phải lưu 1 nhiệm vụ');
  assert.strictEqual(rawState.quests[0].title, 'Học Next.js Server Actions (Đã cập nhật)');

  // Delete Quest
  const deleteRes = await deleteQuestAction(questId, TEST_TOKEN);
  assert.strictEqual(deleteRes.success, true, 'Xóa nhiệm vụ thành công');

  const stateAfterDelete = JSON.parse(await redisMock.get(`levelup:user:google:${TEST_SUB}`));
  assert.strictEqual(stateAfterDelete.quests.length, 0, 'Redis phải không còn nhiệm vụ nào');
  console.log('  -> PASS: CRUD Quests hoạt động chuẩn xác.');
}

// -----------------------------------------------------------------------------
// 3. Kiểm thử CRUD Phần thưởng Cửa hàng (Shop Items)
// -----------------------------------------------------------------------------
{
  console.log('Test 3: Thêm, sửa, xóa Phần thưởng (Shop Items) qua Server Actions...');

  // Validation: empty name
  const emptyRes = await saveShopItemAction({ name: '' }, TEST_TOKEN);
  assert.strictEqual(emptyRes.success, false, 'Phải bắt lỗi tên phần thưởng rỗng');

  // Create Shop Item
  const createdRes = await saveShopItemAction({
    name: '1 Ly Trà Đào',
    price: 30,
    tier: 'rare',
    icon: '🍑',
  }, TEST_TOKEN);

  assert.strictEqual(createdRes.success, true, 'Tạo phần thưởng thành công');
  assert.ok(createdRes.data?.id, 'Phần thưởng phải có ID sinh ra');
  assert.strictEqual(createdRes.data?.name, '1 Ly Trà Đào');
  assert.strictEqual(createdRes.data?.price, 30);
  const itemId = createdRes.data.id;

  // Update Shop Item
  const updatedRes = await saveShopItemAction({
    id: itemId,
    name: '1 Ly Trà Đào Cam Sả',
    price: 35,
  }, TEST_TOKEN);

  assert.strictEqual(updatedRes.success, true, 'Cập nhật phần thưởng thành công');
  assert.strictEqual(updatedRes.data?.name, '1 Ly Trà Đào Cam Sả');
  assert.strictEqual(updatedRes.data?.price, 35);

  // Delete Shop Item
  const deleteRes = await deleteShopItemAction(itemId, TEST_TOKEN);
  assert.strictEqual(deleteRes.success, true, 'Xóa phần thưởng thành công');

  const rawState = JSON.parse(await redisMock.get(`levelup:user:google:${TEST_SUB}`));
  assert.strictEqual(rawState.shopItems.length, 0, 'Redis phải không còn phần thưởng nào');
  console.log('  -> PASS: CRUD Shop Items hoạt động chuẩn xác.');
}

// -----------------------------------------------------------------------------
// 4. Kiểm thử CRUD Ghi chú (Notes / Brain Dump)
// -----------------------------------------------------------------------------
{
  console.log('Test 4: Thêm, sửa, xóa Ghi chú (Notes) qua Server Actions...');

  // Create Note
  const createdRes = await saveNoteAction({
    title: 'Ghi chú kiến trúc Next.js',
    content: '<p>Server Actions chạy trên Node.js runtime</p>',
    topic: 'Kiến Trúc',
    pinned: true,
  }, TEST_TOKEN);

  assert.strictEqual(createdRes.success, true, 'Tạo ghi chú thành công');
  assert.ok(createdRes.data?.id, 'Ghi chú phải có ID sinh ra');
  assert.strictEqual(createdRes.data?.title, 'Ghi chú kiến trúc Next.js');
  assert.strictEqual(createdRes.data?.pinned, true);
  const noteId = createdRes.data.id;

  // Update Note
  const updatedRes = await saveNoteAction({
    id: noteId,
    content: '<p>Server Actions tích hợp trực tiếp với React 19 transitions</p>',
  }, TEST_TOKEN);

  assert.strictEqual(updatedRes.success, true, 'Cập nhật ghi chú thành công');
  assert.ok(updatedRes.data?.content.includes('React 19'));

  // Delete Note
  const deleteRes = await deleteNoteAction(noteId, TEST_TOKEN);
  assert.strictEqual(deleteRes.success, true, 'Xóa ghi chú thành công');

  const rawState = JSON.parse(await redisMock.get(`levelup:user:google:${TEST_SUB}`));
  assert.strictEqual(rawState.notes.length, 0, 'Redis phải không còn ghi chú nào');
  console.log('  -> PASS: CRUD Notes hoạt động chuẩn xác.');
}

// -----------------------------------------------------------------------------
// 5. Kiểm thử Lấy dữ liệu người chơi (getUserStateAction)
// -----------------------------------------------------------------------------
{
  console.log('Test 5: Lấy toàn bộ trạng thái người chơi qua Server Action...');
  const stateRes = await getUserStateAction(TEST_TOKEN);
  assert.strictEqual(stateRes.success, true, 'Lấy state thành công');
  assert.strictEqual(stateRes.data?.profile?.nickname, 'HeroTester');
  assert.ok(Array.isArray(stateRes.data?.quests), 'Quests phải là array');
  assert.ok(Array.isArray(stateRes.data?.shopItems), 'ShopItems phải là array');
  assert.ok(Array.isArray(stateRes.data?.notes), 'Notes phải là array');
  console.log('  -> PASS: getUserStateAction hoạt động chuẩn xác.');
}

console.log('\n=== TẤT CẢ CÁC KIỂM THỬ NEXT.JS SERVER ACTIONS CRUD ĐÃ ĐẠT 100%! ===');
