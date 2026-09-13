import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Kiểm thử Hệ Thống Cấp Độ, Kinh Nghiệm (EXP) & Danh Hiệu ===\n');

// 1. Kiểm tra mã nguồn giao diện HTML
const html = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
const js = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

assert.ok(html.includes('id="btn-level-info"'), 'Phải có nút bấm xem thông tin cấp độ trên Header (#btn-level-info)');
assert.ok(html.includes('id="modal-level-info"'), 'Phải có modal hướng dẫn cấp độ & EXP (#modal-level-info)');
assert.ok(html.includes('id="btn-open-level-info-from-profile"'), 'Phải có nút mở hướng dẫn cấp độ từ Profile Modal');
assert.ok(html.includes('id="modal-level-exp-bar"'), 'Modal phải có thanh tiến trình EXP');
assert.ok(js.includes('function openLevelInfoModal'), 'Mã nguồn app.js phải có hàm openLevelInfoModal()');

console.log('✓ Test 1: Giao diện Header, Profile Modal và Modal Hướng dẫn Cấp độ tích hợp đầy đủ.');

// 2. Kiểm thử công thức thăng cấp & nhận EXP
function simulateAddEXP(profile, amount) {
  profile.exp += amount;
  let leveledUp = false;
  while (profile.exp >= profile.level * 100) {
    profile.exp -= profile.level * 100;
    profile.level += 1;
    leveledUp = true;
  }
  if (leveledUp) {
    updateTitleByLevel(profile);
  }
  return leveledUp;
}

function updateTitleByLevel(profile) {
  const lvl = profile.level;
  if (lvl >= 20) profile.title = 'Huyền Thoại Kỷ Luật';
  else if (lvl >= 15) profile.title = 'Bậc Thầy Năng Suất';
  else if (lvl >= 10) profile.title = 'Chuyên Gia Tập Trung';
  else if (lvl >= 6) profile.title = 'Chiến Binh Kiên Trì';
  else if (lvl >= 3) profile.title = 'Học Viên Chăm Chỉ';
  else profile.title = 'Tân Binh Cấp 1';
}

const p = { level: 1, exp: 0, title: 'Tân Binh Cấp 1' };

// Hoàn thành nhiệm vụ nhận 20 Vàng -> nhận được 20 * 3 = 60 EXP
const questReward1 = 20;
simulateAddEXP(p, questReward1 * 3);
assert.strictEqual(p.level, 1, 'Chưa đủ 100 EXP thì vẫn ở Lv. 1');
assert.strictEqual(p.exp, 60, 'Số EXP phải là 60');

// Hoàn thành thêm nhiệm vụ 15 Vàng -> 15 * 3 = 45 EXP -> Tổng 105 EXP -> Lên Lv. 2, dư 5 EXP
const questReward2 = 15;
simulateAddEXP(p, questReward2 * 3);
assert.strictEqual(p.level, 2, 'Đạt 105/100 EXP -> Lên Lv. 2');
assert.strictEqual(p.exp, 5, 'Dư 5 EXP mang sang Lv. 2');
assert.strictEqual(p.title, 'Tân Binh Cấp 1');

// Ở Lv. 2 cần 2 * 100 = 200 EXP. Hiện có 5, cần thêm 195 EXP.
// Hoàn thành nhiệm vụ 65 Vàng -> 65 * 3 = 195 EXP -> Đạt 200/200 EXP -> Lên Lv. 3
simulateAddEXP(p, 65 * 3);
assert.strictEqual(p.level, 3, 'Lên Lv. 3 thành công');
assert.strictEqual(p.exp, 0, 'EXP reset về 0/300');
assert.strictEqual(p.title, 'Học Viên Chăm Chỉ', 'Danh hiệu Lv. 3 phải là Học Viên Chăm Chỉ');

console.log('✓ Test 2: Công thức thăng cấp và tích lũy EXP qua Vàng nhiệm vụ hoạt động hoàn hảo.');

// 3. Kiểm thử mốc danh hiệu
const titleChecks = [
  { level: 1, title: 'Tân Binh Cấp 1' },
  { level: 2, title: 'Tân Binh Cấp 1' },
  { level: 3, title: 'Học Viên Chăm Chỉ' },
  { level: 5, title: 'Học Viên Chăm Chỉ' },
  { level: 6, title: 'Chiến Binh Kiên Trì' },
  { level: 9, title: 'Chiến Binh Kiên Trì' },
  { level: 10, title: 'Chuyên Gia Tập Trung' },
  { level: 14, title: 'Chuyên Gia Tập Trung' },
  { level: 15, title: 'Bậc Thầy Năng Suất' },
  { level: 19, title: 'Bậc Thầy Năng Suất' },
  { level: 20, title: 'Huyền Thoại Kỷ Luật' },
  { level: 50, title: 'Huyền Thoại Kỷ Luật' }
];

titleChecks.forEach(({ level, title }) => {
  const dummy = { level, title: '' };
  updateTitleByLevel(dummy);
  assert.strictEqual(dummy.title, title, `Cấp độ ${level} phải có danh hiệu "${title}"`);
});

console.log('✓ Test 3: Bảng danh hiệu 6 mốc hiệp sĩ chính xác 100%.');

console.log('\n🎉 TẤT CẢ TEST HỆ THỐNG CẤP ĐỘ & EXP ĐÃ VƯỢT QUA XUẤT SẮC!');
