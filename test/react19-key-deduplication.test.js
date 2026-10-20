import assert from 'node:assert';
import { dedupeById } from '../api/sync.js';

console.log('=== KIỂM THỬ KHẢ NĂNG KHỬ TRÙNG LẶP ID (REACT 19 KEY DEDUPLICATION) ===\n');

// 1. Kiểm tra hàm dedupeById
{
  console.log('Test 1: dedupeById loại bỏ các phần tử trùng lặp theo id hoặc questId...');
  const sampleQuests = [
    { id: 'q_1792471890083_wnot', title: 'Đọc sách 25p' },
    { id: 'q_seed_1', title: 'Tập thể dục' },
    { id: 'q_1792471890083_wnot', title: 'Đọc sách 25p (duplicate)' },
    { questId: 'q_legacy_1', title: 'Ghi chép' },
    { id: 'q_legacy_1', title: 'Ghi chép (duplicate)' }
  ];

  const deduped = dedupeById(sampleQuests);
  assert.strictEqual(deduped.length, 3, 'Phải còn lại chính xác 3 phần tử duy nhất');
  assert.strictEqual(deduped[0].id, 'q_1792471890083_wnot');
  assert.strictEqual(deduped[0].title, 'Đọc sách 25p', 'Phải giữ lại bản ghi đầu tiên');
  assert.strictEqual(deduped[1].id, 'q_seed_1');
  assert.strictEqual(deduped[2].questId, 'q_legacy_1');
  console.log('  ✓ Đã xác minh dedupeById khử trùng id chính xác 100%.\n');
}

// 2. Kiểm tra xử lý trường hợp mảng rỗng hoặc invalid input
{
  console.log('Test 2: dedupeById xử lý dữ liệu null/undefined/rỗng an toàn...');
  assert.deepStrictEqual(dedupeById(null), []);
  assert.deepStrictEqual(dedupeById(undefined), []);
  assert.deepStrictEqual(dedupeById([]), []);
  assert.deepStrictEqual(dedupeById([{ id: '' }, { id: '' }]), [{ id: '' }, { id: '' }]);
  console.log('  ✓ Đã xác minh tính chịu lỗi của dedupeById.\n');
}

// 3. Kiểm thử mô phỏng luồng bridge giữa React và Vanilla CustomEvent
{
  console.log('Test 3: Mô phỏng merge state từ CustomEvent levelup:state-updated khử trùng lặp và không hồi sinh thẻ đã xóa...');
  const prevQuests = [
    { id: 'q_1792471890083_wnot', title: 'Nhiệm vụ vừa tạo' },
    { id: 'q_seed_1', title: 'Nhiệm vụ mẫu' },
    { id: 'q_to_delete', title: 'Nhiệm vụ sắp xóa' }
  ];

  // Trường hợp 3a: Incoming mang dữ liệu mới và đã xóa q_to_delete
  const incomingDetailQuests = [
    { id: 'q_1792471890083_wnot', title: 'Nhiệm vụ vừa tạo (sync từ app.js)' },
    { id: 'q_seed_1', title: 'Nhiệm vụ mẫu' },
    { id: 'q_new_remote', title: 'Nhiệm vụ từ máy khác' },
    { id: 'q_new_remote', title: 'Nhiệm vụ từ máy khác (duplicate)' }
  ];

  const nextQuests = Array.isArray(incomingDetailQuests)
    ? dedupeById(incomingDetailQuests)
    : prevQuests;

  assert.strictEqual(nextQuests.length, 3, 'Danh sách chỉ được có 3 nhiệm vụ duy nhất');
  assert.strictEqual(nextQuests.some(q => q.id === 'q_to_delete'), false, 'Nhiệm vụ đã xóa tuyệt đối không được hồi sinh');
  const ids = nextQuests.map(q => q.id);
  assert.strictEqual(new Set(ids).size, 3, 'Tất cả các key phải là duy nhất');

  // Trường hợp 3b: Người dùng xóa hết sạch nhiệm vụ
  const emptyIncoming = [];
  const emptyNextQuests = Array.isArray(emptyIncoming)
    ? dedupeById(emptyIncoming)
    : prevQuests;
  assert.strictEqual(emptyNextQuests.length, 0, 'Phải cập nhật mảng rỗng chính xác khi xóa toàn bộ');
  console.log('  ✓ Đã xác minh luồng merge CustomEvent loại bỏ trùng lặp triệt để và cho phép xóa thẻ an toàn.\n');
}

console.log('🎉 TẤT CẢ KIỂM THỬ KHỬ TRÙNG LẶP REACT 19 KEY ĐỀU THÀNH CÔNG!');
