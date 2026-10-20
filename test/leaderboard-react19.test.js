import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const component = fs.readFileSync(path.join(process.cwd(), 'components', 'leaderboard', 'Leaderboard.tsx'), 'utf8');
const page = fs.readFileSync(path.join(process.cwd(), 'app', 'page.tsx'), 'utf8');

console.log('=== KIỂM THỬ LEADERBOARD REACT MIGRATION ===\n');

assert.ok(page.includes("import { Leaderboard } from '@/components/leaderboard/Leaderboard'"));
assert.ok(page.includes('<Leaderboard />'), 'Next.js page phải render Leaderboard React');
assert.ok(page.includes("rawHtml.indexOf('<section id=\"tab-admin\"')"), 'Legacy bridge phải bắt đầu sau Leaderboard đã migrate');
assert.ok(!page.includes("rawHtml.indexOf('<section id=\"tab-leaderboard\"')"), 'Legacy Leaderboard không được render trùng');

assert.ok(component.includes('id="tab-leaderboard"'), 'Component phải giữ tab ID hiện tại');
assert.ok(component.includes('/api/sync?action=leaderboard'), 'Component phải giữ API bảng xếp hạng hiện tại');
assert.ok(component.includes('/api/sync?action=cheaters'), 'Component phải giữ API Sổ Đen');
assert.ok(component.includes("action: 'admin_remove' | 'admin_pardon'"), 'Component phải giữ thao tác moderation');
assert.ok(component.includes("profile.role === 'admin'"), 'Thao tác đặc quyền chỉ hiển thị cho admin');
assert.ok(component.includes('credentials: \'include\''), 'Các request phải gửi session cookies');
assert.ok(component.includes('AbortController'), 'Request phải được hủy khi rời tab');
assert.ok(component.includes('setSearch(event.target.value)'), 'Tìm kiếm phải lọc danh sách React');
assert.ok(component.includes('Không thể tải bảng xếp hạng'), 'Lỗi tải dữ liệu phải hiển thị');

console.log('✓ Leaderboard React thay legacy section, giữ API/subtab/search/admin actions và lifecycle requests.');
