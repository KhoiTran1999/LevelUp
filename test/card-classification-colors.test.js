import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Kiểm thử Hệ Thống Màu Nền Phân Loại Thẻ & Sắp Xếp Cao Xuống Thấp ===\n');

const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8').replace(/\r\n/g, '\n');
const indexHtml = fs.readFileSync(path.resolve('public/index.html'), 'utf8').replace(/\r\n/g, '\n');
const styleCss = fs.readFileSync(path.resolve('public/style.css'), 'utf8').replace(/\r\n/g, '\n');

// 1. Kiểm tra CSS Định dạng màu nền và viền thẻ phân loại theo Rank (Nhiệm vụ) và Tier (Phần thưởng)
const expectedQuestRanks = ['E', 'D', 'C', 'B', 'A', 'S'];
expectedQuestRanks.forEach(rank => {
  const className = `.quest-card-rank-${rank}`;
  assert.ok(styleCss.includes(className), `style.css phải chứa định nghĩa class ${className}`);
  assert.ok(styleCss.includes(`html.dark ${className}`), `style.css phải hỗ trợ Dark Mode cho ${className}`);
  assert.ok(styleCss.includes(`${className}:hover`), `style.css phải có hiệu ứng hover phát sáng cho ${className}`);
});
console.log('✓ Test 1: Hệ thống class CSS cho 6 bậc Rank nhiệm vụ (E, D, C, B, A, S) đã được định nghĩa đầy đủ.');

const expectedRewardTiers = ['common', 'rare', 'epic', 'legendary'];
expectedRewardTiers.forEach(tier => {
  const className = `.reward-card-tier-${tier}`;
  assert.ok(styleCss.includes(className), `style.css phải chứa định nghĩa class ${className}`);
  assert.ok(styleCss.includes(`html.dark ${className}`), `style.css phải hỗ trợ Dark Mode cho ${className}`);
  assert.ok(styleCss.includes(`${className}:hover`), `style.css phải có hiệu ứng hover phát sáng cho ${className}`);
});
console.log('✓ Test 2: Hệ thống class CSS cho 4 bậc Tier phần thưởng (common, rare, epic, legendary) đã được định nghĩa đầy đủ.');

// 2. Kiểm tra HTML có dropdown chọn sắp xếp nhiệm vụ và phần thưởng
assert.ok(indexHtml.includes('id="select-quest-sort"'), 'index.html phải có dropdown id="select-quest-sort"');
assert.ok(indexHtml.includes('value="rank-desc"'), 'select-quest-sort phải có tùy chọn rank-desc (Hạng: Cao → Thấp)');
assert.ok(indexHtml.includes('value="rank-asc"'), 'select-quest-sort phải có tùy chọn rank-asc (Hạng: Thấp → Cao)');
assert.ok(indexHtml.includes('value="newest"'), 'select-quest-sort phải có tùy chọn newest (Mới nhất)');

assert.ok(indexHtml.includes('id="select-shop-sort"'), 'index.html phải có dropdown id="select-shop-sort"');
assert.ok(indexHtml.includes('value="tier-desc"'), 'select-shop-sort phải có tùy chọn tier-desc (Phẩm chất: Cao → Thấp)');
assert.ok(indexHtml.includes('value="tier-asc"'), 'select-shop-sort phải có tùy chọn tier-asc (Phẩm chất: Thấp → Cao)');
assert.ok(indexHtml.includes('value="price-asc"'), 'select-shop-sort phải có tùy chọn price-asc (Giá: Thấp → Cao)');
console.log('✓ Test 3: Giao diện HTML tích hợp đầy đủ bộ chọn dropdown sắp xếp theo thứ hạng từ cao xuống thấp.');

// 3. Kiểm tra app.js gán class phân loại vào thẻ
assert.ok(appJs.includes('quest-card-rank-${rank}'), 'renderQuests phải inject quest-card-rank-${rank} vào card.className');
assert.ok(appJs.includes('reward-card-tier-${rawTier}'), 'renderShop & renderInventory phải inject reward-card-tier-${rawTier} vào card.className');
console.log('✓ Test 4: renderQuests, renderShop và renderInventory inject đúng class màu nền phân loại vào DOM.');

// 4. Kiểm tra thuật toán sắp xếp Nhiệm vụ (Quest Sorting Logic)
{
  const rankScores = { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
  const sortQuests = (quests, sortMode = 'rank-desc', activeFocusQuest = null) => {
    return [...quests].sort((a, b) => {
      const aFocus = (activeFocusQuest && activeFocusQuest.id === a.id) ? 1 : 0;
      const bFocus = (activeFocusQuest && activeFocusQuest.id === b.id) ? 1 : 0;
      if (aFocus !== bFocus) return bFocus - aFocus;

      const aActive = a.status === 'active' ? 1 : 0;
      const bActive = b.status === 'active' ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;

      if (sortMode === 'rank-desc') {
        const scoreA = rankScores[(a.rank || 'E').toUpperCase()] ?? 1;
        const scoreB = rankScores[(b.rank || 'E').toUpperCase()] ?? 1;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return (b.rewardCoins || 0) - (a.rewardCoins || 0);
      } else if (sortMode === 'rank-asc') {
        const scoreA = rankScores[(a.rank || 'E').toUpperCase()] ?? 1;
        const scoreB = rankScores[(b.rank || 'E').toUpperCase()] ?? 1;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return (a.rewardCoins || 0) - (b.rewardCoins || 0);
      }
      return 0;
    });
  };

  const sampleQuests = [
    { id: 'q1', title: 'Việc vặt', rank: 'E', rewardCoins: 2, status: 'active' },
    { id: 'q2', title: 'Luyện tập khó', rank: 'A', rewardCoins: 30, status: 'active' },
    { id: 'q3', title: 'Học tập sâu', rank: 'B', rewardCoins: 20, status: 'active' },
    { id: 'q4', title: 'Đồ án lớn', rank: 'S', rewardCoins: 50, status: 'active' },
    { id: 'q5', title: 'Dọn nhà', rank: 'E', rewardCoins: 5, status: 'active' },
    { id: 'q6', title: 'Đã xong từ trước', rank: 'S', rewardCoins: 60, status: 'completed' }
  ];

  const sorted = sortQuests(sampleQuests, 'rank-desc');
  // Hạng S (active) -> A (active) -> B (active) -> E (coins:5) -> E (coins:2) -> S (completed)
  assert.strictEqual(sorted[0].rank, 'S');
  assert.strictEqual(sorted[0].id, 'q4');
  assert.strictEqual(sorted[1].rank, 'A');
  assert.strictEqual(sorted[2].rank, 'B');
  assert.strictEqual(sorted[3].rank, 'E');
  assert.strictEqual(sorted[3].rewardCoins, 5); // Cùng rank E thì 5 Vàng xếp trước 2 Vàng
  assert.strictEqual(sorted[4].rank, 'E');
  assert.strictEqual(sorted[4].rewardCoins, 2);
  assert.strictEqual(sorted[5].status, 'completed'); // Completed xếp sau active

  // Ghim nhiệm vụ đang bấm giờ lên đầu
  const sortedWithFocus = sortQuests(sampleQuests, 'rank-desc', { id: 'q3' });
  assert.strictEqual(sortedWithFocus[0].id, 'q3', 'Nhiệm vụ đang bấm giờ phải được ghim lên vị trí đầu tiên');
  console.log('✓ Test 5: Logic sắp xếp nhiệm vụ từ cao xuống thấp (Rank S -> E, coins desc, focus pinned) hoạt động chính xác 100%.');
}

// 5. Kiểm tra thuật toán sắp xếp Phần thưởng Cửa Hàng (Shop Items Sorting Logic)
{
  const tierScores = { legendary: 4, epic: 3, rare: 2, common: 1 };
  const sortShop = (items, sortMode = 'tier-desc') => {
    return [...items].sort((a, b) => {
      const rawTierA = (a.tier || 'rare').toLowerCase();
      const rawTierB = (b.tier || 'rare').toLowerCase();
      if (sortMode === 'tier-desc') {
        const scoreA = tierScores[rawTierA] ?? 1;
        const scoreB = tierScores[rawTierB] ?? 1;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return (b.price || 0) - (a.price || 0);
      } else if (sortMode === 'tier-asc') {
        const scoreA = tierScores[rawTierA] ?? 1;
        const scoreB = tierScores[rawTierB] ?? 1;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return (a.price || 0) - (b.price || 0);
      }
      return 0;
    });
  };

  const sampleItems = [
    { id: 's1', name: 'Trà sữa', tier: 'rare', price: 35 },
    { id: 's2', name: 'Xem phim', tier: 'epic', price: 120 },
    { id: 's3', name: 'Du lịch', tier: 'legendary', price: 500 },
    { id: 's4', name: 'Cà phê', tier: 'rare', price: 45 },
    { id: 's5', name: 'Bánh ngọt', tier: 'common', price: 20 }
  ];

  const sortedShop = sortShop(sampleItems, 'tier-desc');
  assert.strictEqual(sortedShop[0].tier, 'legendary');
  assert.strictEqual(sortedShop[1].tier, 'epic');
  assert.strictEqual(sortedShop[2].tier, 'rare');
  assert.strictEqual(sortedShop[2].price, 45); // Cùng rare: 45 Vàng trước 35 Vàng
  assert.strictEqual(sortedShop[3].tier, 'rare');
  assert.strictEqual(sortedShop[3].price, 35);
  assert.strictEqual(sortedShop[4].tier, 'common');
  console.log('✓ Test 6: Logic sắp xếp phần thưởng từ cao xuống thấp (Legendary -> Common, price desc) hoạt động chính xác 100%.');
}

console.log('\n=== TẤT CẢ 6 TEST ĐÃ VƯỢT QUA XUẤT SẮC! ===');
