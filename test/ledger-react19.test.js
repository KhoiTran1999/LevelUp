import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import {
  getAllProofPhotos,
  calculateLedgerStats,
  groupLedgerByDate,
  filterLedgerEntries,
  getLedgerCategoryConfig,
  LEDGER_PAGE_SIZE,
} from '../components/ledger/ledger-utils.ts';

console.log('=== Bắt đầu kiểm thử Toàn Diện React 19 Ledger & Proof Album ===\n');

// -------------------------------------------------------------
// Test 1: Kiểm tra hàm getAllProofPhotos (Khử trùng lặp & Sắp xếp)
// -------------------------------------------------------------
console.log('Test 1: Thuật toán getAllProofPhotos gom ảnh và khử trùng lặp');
const mockProofPhotos = [
  { id: 'p1', proofImageUrl: 'https://r2.example.com/img1.jpg', timestamp: 3000, questTitle: 'Chạy bộ 5km' },
  { id: 'p2', proofImageUrl: 'https://r2.example.com/img2.jpg', timestamp: 1000, questTitle: 'Đọc sách 30p' },
];
const mockLedger = [
  { id: 'l1', amount: 15, type: 'earn', category: 'quest', title: 'Tập gym', description: '', timestamp: 2000, proofImageUrl: 'https://r2.example.com/img3.jpg' },
  { id: 'l2', amount: 10, type: 'earn', category: 'quest', title: 'Chạy bộ trùng', description: '', timestamp: 2500, proofImageUrl: 'https://r2.example.com/img1.jpg' }, // Duplicate URL
];
const mockQuests = [
  { id: 'q1', title: 'Học tiếng Anh', description: '', type: 'focus', rank: 'B', rewardCoins: 12, targetMinutes: 30, completedCount: 1, status: 'completed', createdAt: 500, proofImageUrl: 'https://r2.example.com/img4.jpg' },
  { id: 'q2', title: 'Đọc sách trùng', description: '', type: 'focus', rank: 'C', rewardCoins: 8, targetMinutes: 20, completedCount: 1, status: 'completed', createdAt: 400, proofImageUrl: 'https://r2.example.com/img2.jpg' }, // Duplicate URL
];

const aggregatedPhotos = getAllProofPhotos(mockProofPhotos, mockLedger, mockQuests);
assert.strictEqual(aggregatedPhotos.length, 4, 'Phải có đúng 4 ảnh sau khi khử trùng lặp 2 URL');
assert.strictEqual(aggregatedPhotos[0].proofImageUrl, 'https://r2.example.com/img1.jpg', 'Ảnh mới nhất (timestamp 3000) phải ở đầu danh sách');
assert.strictEqual(aggregatedPhotos[1].proofImageUrl, 'https://r2.example.com/img3.jpg', 'Ảnh thứ 2 (timestamp 2000)');
assert.strictEqual(aggregatedPhotos[2].proofImageUrl, 'https://r2.example.com/img2.jpg', 'Ảnh thứ 3 (timestamp 1000)');
assert.strictEqual(aggregatedPhotos[3].proofImageUrl, 'https://r2.example.com/img4.jpg', 'Ảnh thứ 4 (timestamp 500)');
console.log('  -> Thuật toán tổng hợp ảnh bằng chứng hoạt động chuẩn xác 100%: OK\n');

// -------------------------------------------------------------
// Test 2: Kiểm tra tính toán thống kê thu chi và số dư ngân hàng
// -------------------------------------------------------------
console.log('Test 2: Kiểm tra calculateLedgerStats (Thu/Chi hôm nay & Ngân Hàng)');
const now = Date.now();
const yesterday = now - 86400000;
const testLedger = [
  { id: 't1', amount: 25, type: 'earn', category: 'quest', title: 'Làm quest', description: '', timestamp: now },
  { id: 't2', amount: 10, type: 'spend', category: 'reward', title: 'Đổi quà', description: '', timestamp: now },
  { id: 't3', amount: 50, type: 'earn', category: 'quest', title: 'Hôm qua', description: '', timestamp: yesterday },
  { id: 't4', amount: 30, type: 'spend', category: 'reward', title: 'Hôm qua', description: '', timestamp: yesterday },
];
const testBank = {
  deposited: 200,
  depositInterest: 18,
  loan: {
    amount: 50,
    debt: 45,
    principal: 40,
    borrowRate: 0.05,
    termDays: 7,
    autoDeductPercent: 0.3,
    borrowedAt: now,
    lastAccruedAt: now,
    dueTimestamp: now + 7 * 86400000,
  },
};

const stats = calculateLedgerStats(testLedger, testBank);
assert.strictEqual(stats.todayEarn, 25, 'Thu hôm nay phải là 25');
assert.strictEqual(stats.todaySpend, 10, 'Chi hôm nay phải là 10');
assert.strictEqual(stats.totalBankDeposits, 218, 'Tổng tiết kiệm phải là 200 + 18 = 218');
assert.strictEqual(stats.currentBankDebt, 45, 'Dư nợ hiện tại phải là 45');
console.log('  -> Thống kê thu chi và ngân hàng tính toán chính xác: OK\n');

// -------------------------------------------------------------
// Test 3: Kiểm tra gom nhóm theo ngày (Date Grouping)
// -------------------------------------------------------------
console.log('Test 3: Kiểm tra groupLedgerByDate');
const grouped = groupLedgerByDate(testLedger);
assert(Boolean(grouped['Hôm nay']), 'Phải có nhóm Hôm nay');
assert.strictEqual(grouped['Hôm nay'].length, 2, 'Nhóm Hôm nay phải có 2 giao dịch');
assert(Boolean(grouped['Hôm qua']), 'Phải có nhóm Hôm qua');
assert.strictEqual(grouped['Hôm qua'].length, 2, 'Nhóm Hôm qua phải có 2 giao dịch');
console.log('  -> Gom nhóm giao dịch theo ngày hoạt động chuẩn xác: OK\n');

// -------------------------------------------------------------
// Test 4: Kiểm tra bộ lọc giao dịch (filterLedgerEntries)
// -------------------------------------------------------------
console.log('Test 4: Kiểm tra filterLedgerEntries (all / earn / spend / bank)');
const sampleLedger = [
  { id: '1', amount: 10, type: 'earn', category: 'quest', title: 'Q1', description: '', timestamp: now },
  { id: '2', amount: 15, type: 'spend', category: 'reward', title: 'R1', description: '', timestamp: now },
  { id: '3', amount: 50, type: 'spend', category: 'bank_deposit', title: 'Gửi', description: '', timestamp: now },
  { id: '4', amount: 30, type: 'earn', category: 'bank_borrow', title: 'Vay', description: '', timestamp: now },
  { id: '5', amount: 5, type: 'spend', category: 'bank_deduct', title: 'Trích', description: '', timestamp: now },
];

assert.strictEqual(filterLedgerEntries(sampleLedger, 'all').length, 5);
assert.strictEqual(filterLedgerEntries(sampleLedger, 'earn').length, 2);
assert.strictEqual(filterLedgerEntries(sampleLedger, 'spend').length, 3);
assert.strictEqual(filterLedgerEntries(sampleLedger, 'bank').length, 3);
console.log('  -> Các bộ lọc giao dịch phân loại chuẩn xác: OK\n');

// -------------------------------------------------------------
// Test 5: Kiểm tra cấu hình danh mục getLedgerCategoryConfig
// -------------------------------------------------------------
console.log('Test 5: Cấu hình danh mục hiển thị (icon, nhãn, màu sắc)');
const depCfg = getLedgerCategoryConfig({ id: 'a', amount: 1, type: 'spend', category: 'bank_deposit', title: '', description: '', timestamp: 0 });
assert.strictEqual(depCfg.icon, '🏦');
assert.strictEqual(depCfg.label, 'Tiết Kiệm');

const borrowCfg = getLedgerCategoryConfig({ id: 'b', amount: 1, type: 'earn', category: 'bank_borrow', title: '', description: '', timestamp: 0 });
assert.strictEqual(borrowCfg.icon, '⚡');
assert.strictEqual(borrowCfg.label, 'Vay Vàng');

const deductCfg = getLedgerCategoryConfig({ id: 'c', amount: 1, type: 'spend', category: 'bank_deduct', title: '', description: '', timestamp: 0 });
assert.strictEqual(deductCfg.icon, '✂️');
assert.strictEqual(deductCfg.label, 'Trích Nợ');
console.log('  -> Badge danh mục và icon phân loại đầy đủ: OK\n');

// -------------------------------------------------------------
// Test 6: Kiểm tra DOM IDs trong các component React 19
// -------------------------------------------------------------
console.log('Test 6: Kiểm tra DOM IDs của các component React 19');
const containerCode = fs.readFileSync('components/ledger/LedgerContainer.tsx', 'utf8');
const statsCode = fs.readFileSync('components/ledger/LedgerStatsSummary.tsx', 'utf8');
const transCode = fs.readFileSync('components/ledger/TransactionsView.tsx', 'utf8');
const photosCode = fs.readFileSync('components/ledger/ProofPhotosView.tsx', 'utf8');

// Subtabs
assert(containerCode.includes('id="btn-ledger-subtab-transactions"'), 'Phải có id="btn-ledger-subtab-transactions"');
assert(containerCode.includes('id="btn-ledger-subtab-photos"'), 'Phải có id="btn-ledger-subtab-photos"');
assert(containerCode.includes('id="ledger-photos-badge"'), 'Phải có id="ledger-photos-badge"');

// Stats Cards
assert(statsCode.includes('id="ledger-stat-earn"'), 'Phải có id="ledger-stat-earn"');
assert(statsCode.includes('id="ledger-stat-spend"'), 'Phải có id="ledger-stat-spend"');
assert(statsCode.includes('id="ledger-stat-bank-deposit"'), 'Phải có id="ledger-stat-bank-deposit"');
assert(statsCode.includes('id="ledger-stat-bank-debt"'), 'Phải có id="ledger-stat-bank-debt"');

// Transactions View & Filters & Pagination
assert(transCode.includes('id="view-ledger-transactions"'), 'Phải có id="view-ledger-transactions"');
assert(transCode.includes('id="ledger-filter-all"'), 'Phải có id="ledger-filter-all"');
assert(transCode.includes('id="ledger-filter-earn"'), 'Phải có id="ledger-filter-earn"');
assert(transCode.includes('id="ledger-filter-spend"'), 'Phải có id="ledger-filter-spend"');
assert(transCode.includes('id="ledger-filter-bank"'), 'Phải có id="ledger-filter-bank"');
assert(transCode.includes('id="ledger-list"'), 'Phải có id="ledger-list"');
assert(transCode.includes('id="ledger-pagination"'), 'Phải có id="ledger-pagination"');
assert(transCode.includes('id="ledger-prev-btn"'), 'Phải có id="ledger-prev-btn"');
assert(transCode.includes('id="ledger-page-info"'), 'Phải có id="ledger-page-info"');
assert(transCode.includes('id="ledger-next-btn"'), 'Phải có id="ledger-next-btn"');
assert(transCode.includes('btn-view-proof-img'), 'Phải có class btn-view-proof-img');

// Proof Photos View
assert(photosCode.includes('id="view-ledger-photos"'), 'Phải có id="view-ledger-photos"');
assert(photosCode.includes('id="ledger-photos-summary"'), 'Phải có id="ledger-photos-summary"');
assert(photosCode.includes('id="ledger-photos-count"'), 'Phải có id="ledger-photos-count"');
assert(photosCode.includes('id="ledger-photos-grid"'), 'Phải có id="ledger-photos-grid"');
assert(photosCode.includes('id="ledger-photos-empty"'), 'Phải có id="ledger-photos-empty"');
assert(photosCode.includes('proof-photo-card'), 'Phải có class proof-photo-card');
console.log('  -> Tất cả các DOM IDs và classes theo hợp đồng đều có mặt 100%: OK\n');

// -------------------------------------------------------------
// Test 7: Kiểm tra page.tsx tích hợp tab-ledger và loại bỏ template cũ
// -------------------------------------------------------------
console.log('Test 7: Kiểm tra page.tsx tích hợp tab-ledger');
const pageCode = fs.readFileSync('app/page.tsx', 'utf8');
assert(pageCode.includes('<section id="tab-ledger"'), 'page.tsx phải có <section id="tab-ledger"');
assert(pageCode.includes('<LedgerContainer />'), 'page.tsx phải chứa <LedgerContainer />');
assert(pageCode.includes('replace(/<section\\s+id="tab-ledger"'), 'page.tsx phải lọc tab-ledger cũ');
console.log('  -> page.tsx kết nối hoàn hảo với React 19 LedgerContainer: OK\n');

console.log('🎉 TẤT CẢ KIỂM THỬ REACT 19 LEDGER & PROOF ALBUM ĐÃ VƯỢT QUA 100%!');
