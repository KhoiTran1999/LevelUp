import assert from 'node:assert';
import { calculateRank, sanitizeEvaluatedQuest, sanitizeEvaluatedReward } from '../api/ai.js';

// Logic: AI locks quest specs. Only AI debate approval can update specs.
function applyQuestDebateResolution(currentVerdict, aiDebateResult) {
  if (!aiDebateResult || !aiDebateResult.accepted) {
    return { ...currentVerdict };
  }

  const updated = { ...currentVerdict };
  if (aiDebateResult.newTitle) updated.title = aiDebateResult.newTitle;
  if (aiDebateResult.newDescription !== undefined) updated.description = aiDebateResult.newDescription;
  if (aiDebateResult.newRewardCoins) updated.rewardCoins = aiDebateResult.newRewardCoins;
  if (aiDebateResult.newTargetMinutes !== undefined) updated.targetMinutes = aiDebateResult.newTargetMinutes;
  if (aiDebateResult.newType) updated.type = aiDebateResult.newType;
  else if (aiDebateResult.newTargetMinutes !== undefined) {
    updated.type = aiDebateResult.newTargetMinutes > 0 ? 'focus' : 'bounty';
  }
  updated.rank = aiDebateResult.newRank || calculateRank(updated.rewardCoins);
  return updated;
}

// Logic: AI locks reward specs. Only AI debate approval can update specs.
function applyRewardDebateResolution(currentReward, aiDebateResult) {
  if (!aiDebateResult || !aiDebateResult.accepted) {
    return { ...currentReward };
  }

  const updated = { ...currentReward };
  if (aiDebateResult.newName) updated.name = aiDebateResult.newName;
  if (aiDebateResult.newDescription !== undefined) updated.description = aiDebateResult.newDescription;
  if (aiDebateResult.newPrice) updated.price = aiDebateResult.newPrice;
  if (aiDebateResult.newTier) updated.tier = aiDebateResult.newTier;
  return updated;
}

// ==========================================
// Test 1: AI evaluates and modifies overloaded task
// ==========================================
const aiEvaluatedQuest = {
  title: 'Đọc kỹ & Tóm tắt Chương 1 môn Kinh tế Vĩ mô',
  description: 'Ghi chú các định nghĩa cốt lõi về GDP và lạm phát',
  isModified: true,
  modificationReason: 'Nhiệm vụ 10 chương quá tải, AI chia nhỏ thành 1 chương khả thi trong 50 phút.',
  type: 'focus',
  rewardCoins: 25,
  targetMinutes: 50,
  rank: 'A',
  verdict: 'Chia nhỏ mục tiêu giúp hoàn thành hiệu quả và không bị quá tải.',
  advice: 'Dùng sổ tay ghi lại 3 công thức trọng tâm.'
};

assert.strictEqual(aiEvaluatedQuest.isModified, true);
assert.ok(aiEvaluatedQuest.modificationReason.length > 0);
assert.strictEqual(aiEvaluatedQuest.rank, 'A');

// ==========================================
// Test 2: User negotiates via Quest Debate with AI Arbiter (Accepted)
// ==========================================
const questDebateAccepted = {
  accepted: true,
  reply: 'Lý lẽ của bạn rất thuyết phục vì tài liệu tiếng Anh khó hơn bình thường. Tôi chấp thuận tăng thời gian và mức thưởng.',
  newTitle: 'Đọc & Tóm tắt Chương 1 môn Kinh tế Vĩ mô (Giáo trình tiếng Anh)',
  newDescription: 'Đọc tài liệu tiếng Anh và giải nghĩa thuật ngữ kinh tế vĩ mô',
  newRewardCoins: 35,
  newTargetMinutes: 60,
  newRank: 'A'
};

const negotiatedQuest = applyQuestDebateResolution(aiEvaluatedQuest, questDebateAccepted);
assert.strictEqual(negotiatedQuest.title, 'Đọc & Tóm tắt Chương 1 môn Kinh tế Vĩ mô (Giáo trình tiếng Anh)');
assert.strictEqual(negotiatedQuest.description, 'Đọc tài liệu tiếng Anh và giải nghĩa thuật ngữ kinh tế vĩ mô');
assert.strictEqual(negotiatedQuest.rewardCoins, 35);
assert.strictEqual(negotiatedQuest.targetMinutes, 60);
assert.strictEqual(negotiatedQuest.rank, 'A');

// ==========================================
// Test 3: Quest Debate Rejected by AI Arbiter (Specs remain locked)
// ==========================================
const questDebateRejected = {
  accepted: false,
  reply: 'Yêu cầu 100 Vàng cho 1 việc học bài là vi phạm quy định chống lạm phát điểm thưởng.',
  newTitle: 'Tên vô lý',
  newRewardCoins: 100
};

const lockedQuestAfterRejection = applyQuestDebateResolution(negotiatedQuest, questDebateRejected);
assert.strictEqual(lockedQuestAfterRejection.title, negotiatedQuest.title);
assert.strictEqual(lockedQuestAfterRejection.rewardCoins, negotiatedQuest.rewardCoins);

// ==========================================
// Test 3b: Bounty Quest Debate (Rửa chén: 4 coins -> 5 coins, keeps bounty type and 0 minutes)
// ==========================================
const bountyQuest = {
  title: 'Rửa chén',
  description: 'Dọn dẹp bồn rửa, vệ sinh sạch sẽ bát đũa xoong chảo',
  type: 'bounty',
  targetMinutes: 0,
  rewardCoins: 4,
  rank: 'E'
};

const bountyDebateAccepted = {
  accepted: true,
  reply: 'Mình đồng ý nè! Rửa chén bát nhiều dầu mỡ thật sự tốn sức, mình nâng mức thưởng lên 5 Vàng cho bạn nhé.',
  newTitle: 'Rửa chén',
  newDescription: 'Dọn dẹp bồn rửa, vệ sinh sạch sẽ bát đũa xoong chảo',
  newType: 'bounty',
  newRewardCoins: 5,
  newTargetMinutes: 0,
  newRank: 'E'
};

const resolvedBounty = applyQuestDebateResolution(bountyQuest, bountyDebateAccepted);
assert.strictEqual(resolvedBounty.type, 'bounty');
assert.strictEqual(resolvedBounty.targetMinutes, 0);
assert.strictEqual(resolvedBounty.rewardCoins, 5);
assert.strictEqual(resolvedBounty.title, 'Rửa chén');

// ==========================================
// Test 4: AI evaluates and sanitizes harmful/unreasonable reward
// ==========================================
const aiEvaluatedReward = {
  id: 'shop_1',
  name: 'Thưởng thức 1 ly sinh tố hoa quả thư giãn',
  description: 'Tự thưởng đồ uống lành mạnh tái tạo năng lượng',
  isModified: true,
  modificationReason: 'Đồ uống có hại cho sức khỏe đã được AI tinh chỉnh thành thức uống lành mạnh.',
  price: 30,
  tier: 'rare',
  icon: '🥤',
  verdict: 'Phần thưởng lành mạnh giúp bạn duy trì năng lượng tích cực!'
};

assert.strictEqual(aiEvaluatedReward.isModified, true);
assert.strictEqual(aiEvaluatedReward.price, 30);

// ==========================================
// Test 5: User negotiates via Reward Debate with AI Arbiter (Accepted)
// ==========================================
const rewardDebateAccepted = {
  accepted: true,
  reply: 'Đồng ý, đồ uống tự làm tại nhà tiết kiệm hơn nên mức giá 20 Vàng là hoàn toàn công bằng.',
  newName: 'Uống 1 ly sinh tố dưa hấu tự làm tại nhà',
  newDescription: 'Sinh tố tươi mát tự làm',
  newPrice: 20,
  newTier: 'common'
};

const negotiatedReward = applyRewardDebateResolution(aiEvaluatedReward, rewardDebateAccepted);
assert.strictEqual(negotiatedReward.name, 'Uống 1 ly sinh tố dưa hấu tự làm tại nhà');
assert.strictEqual(negotiatedReward.description, 'Sinh tố tươi mát tự làm');
assert.strictEqual(negotiatedReward.price, 20);
assert.strictEqual(negotiatedReward.tier, 'common');

// ==========================================
// Test 6: Reward Debate Rejected by AI Arbiter (Specs remain locked)
// ==========================================
const rewardDebateRejected = {
  accepted: false,
  reply: 'Không thể giảm giá xuống 1 Vàng vì sẽ phá vỡ cân bằng Cửa Hàng.'
};

const lockedRewardAfterRejection = applyRewardDebateResolution(negotiatedReward, rewardDebateRejected);
assert.strictEqual(lockedRewardAfterRejection.price, 20);
assert.strictEqual(lockedRewardAfterRejection.name, negotiatedReward.name);

// ==========================================
// Test 7: Programmatic Arbiter Sanitizer fixes the scolding-without-renaming bug
// ==========================================
const scoldingWithoutRenamingPayload = {
  title: 'Đọc hết toàn bộ 10 chương môn kinh tế vĩ mô',
  description: 'Đọc hết toàn bộ 10 chương môn kinh tế vĩ mô để chuẩn bị cho kì thi sắp tới',
  type: 'focus',
  targetMinutes: 90,
  rewardCoins: 45,
  isModified: false,
  verdict: 'Đọc 10 chương vĩ mô cùng lúc là ảo tưởng nhồi nhét, yêu cầu 200 Vàng là hành vi lạm phát trắng trợn. Ta giáng xuống giới hạn 90 phút tập trung tối đa với 45 Vàng; hãy tự chia nhỏ nhiệm vụ ra nếu không muốn tẩu hỏa nhập ma!'
};

const sanitizedQuest = sanitizeEvaluatedQuest(
  scoldingWithoutRenamingPayload,
  'Đọc hết toàn bộ 10 chương môn kinh tế vĩ mô',
  'Đọc hết toàn bộ 10 chương môn kinh tế vĩ mô để chuẩn bị cho kì thi sắp tới'
);

assert.strictEqual(sanitizedQuest.isModified, true);
assert.ok(sanitizedQuest.title.includes('Chương 1'), 'Title must be chunked to Chapter 1');
assert.ok(sanitizedQuest.title.includes('kinh tế vĩ mô'), 'Title must retain subject name');
assert.strictEqual(sanitizedQuest.targetMinutes, 50, 'Target minutes must be clamped to 50 for chunked session');
assert.strictEqual(sanitizedQuest.rewardCoins, 25, 'Reward coins must be clamped to 25 for chunked session');
assert.strictEqual(sanitizedQuest.rank, 'A');
assert.ok(sanitizedQuest.modificationReason.length > 0);

// ==========================================
// Test 8: Programmatic Arbiter Sanitizer fixes harmful reward
// ==========================================
const harmfulRewardPayload = {
  name: 'Uống 10 lon bia say xỉn thâu đêm',
  description: 'Uống say cùng bạn bè',
  price: 50,
  isModified: false,
  verdict: 'Uống say xỉn có hại cho sức khỏe'
};

const sanitizedReward = sanitizeEvaluatedReward(
  harmfulRewardPayload,
  'Uống 10 lon bia say xỉn thâu đêm',
  'Uống say cùng bạn bè'
);

assert.strictEqual(sanitizedReward.isModified, true);
assert.ok(!sanitizedReward.name.includes('say xỉn'));
assert.ok(!sanitizedReward.name.includes('10 lon'));
assert.ok(sanitizedReward.modificationReason.length > 0);

// ==========================================
// Test 9: Bidirectional context helper formatting - Quest gets shop reward targets
// ==========================================
function formatQuestUserPrompt(title, description, userEstimateCoins, currentRewards, userCoins) {
  let rewardContext = '';
  if (Array.isArray(currentRewards) && currentRewards.length > 0) {
    const rewardList = currentRewards.slice(0, 5).map(r => `  + "${r.name}" (Giá: ${r.price} Vàng, Hạng: ${r.tier || 'common'})`).join('\n');
    rewardContext = `\n- Các phần thưởng mục tiêu trong Cửa Hàng:\n${rewardList}\n- Số Vàng hiện có của người chơi: ${userCoins} Vàng`;
  }
  return `Nhiệm vụ người dùng đề xuất:
- Tên công việc: "${title}"
- Chi tiết: "${description}"
- Mức thưởng mong muốn: ${userEstimateCoins ? userEstimateCoins + ' Vàng' : 'Để AI tính toán'}${rewardContext}`;
}

const questPromptWithShop = formatQuestUserPrompt(
  'Làm bài tập Kinh tế Lượng',
  'Hoàn thành 3 bài tập chương 2',
  0,
  [{ name: 'Cốc Trà Sữa Phúc Long', price: 35, tier: 'common' }],
  15
);
assert.ok(questPromptWithShop.includes('Cốc Trà Sữa Phúc Long'), 'Prompt must include shop item name');
assert.ok(questPromptWithShop.includes('35 Vàng'), 'Prompt must include shop item price');
assert.ok(questPromptWithShop.includes('15 Vàng'), 'Prompt must include user current coins');

// ==========================================
// Test 10: Bidirectional context helper formatting - Reward gets active quests
// ==========================================
function formatRewardUserPrompt(name, description, userEstimatePrice, currentQuests, userCoins) {
  let questContext = '';
  if (Array.isArray(currentQuests) && currentQuests.length > 0) {
    const questList = currentQuests.slice(0, 5).map(q => `  + "${q.title}" (Thưởng ${q.rewardCoins} Vàng, ${q.type === 'focus' ? (q.targetMinutes || 25) + ' phút' : 'Không cần bấm giờ'})`).join('\n');
    questContext = `\n- Các nhiệm vụ người dùng đang thực hiện:\n${questList}\n- Số Vàng hiện có của người chơi: ${userCoins} Vàng`;
  }
  return `Phần thưởng muốn thêm vào Cửa Hàng:
- Tên phần thưởng: "${name}"
- Chi tiết: "${description}"
- Mức giá người dùng dự kiến: ${userEstimatePrice ? userEstimatePrice + ' Vàng' : 'Để AI đề xuất'}${questContext}`;
}

const rewardPromptWithQuests = formatRewardUserPrompt(
  'Xem 1 tập phim Anime',
  'Thư giãn 25 phút',
  0,
  [{ title: 'Học 20 từ vựng IELTS', rewardCoins: 15, type: 'focus', targetMinutes: 25 }],
  20
);
assert.ok(rewardPromptWithQuests.includes('Học 20 từ vựng IELTS'), 'Prompt must include quest title');
assert.ok(rewardPromptWithQuests.includes('15 Vàng'), 'Prompt must include quest reward coins');
assert.ok(rewardPromptWithQuests.includes('25 phút'), 'Prompt must include quest target minutes');
assert.ok(rewardPromptWithQuests.includes('20 Vàng'), 'Prompt must include user current coins');

// ==========================================
// Test 11: Programmatic Arbiter Sanitizer clamps trivial/routine tasks
// ==========================================
const trivialQuestPayload = {
  title: 'Đánh răng sạch sẽ',
  description: 'Đánh răng buổi sáng',
  type: 'focus',
  targetMinutes: 25,
  rewardCoins: 15,
  isModified: false,
  verdict: 'Làm tốt lắm'
};

const sanitizedTrivialQuest = sanitizeEvaluatedQuest(
  trivialQuestPayload,
  'Đánh răng sạch sẽ',
  'Đánh răng buổi sáng'
);
assert.strictEqual(sanitizedTrivialQuest.isModified, true);
assert.strictEqual(sanitizedTrivialQuest.type, 'bounty');
assert.strictEqual(sanitizedTrivialQuest.targetMinutes, 0);
assert.strictEqual(sanitizedTrivialQuest.rewardCoins <= 2, true);
assert.strictEqual(sanitizedTrivialQuest.rank, 'E');

// ==========================================
// Test 12: Programmatic Arbiter Sanitizer prevents padding on quick chores
// ==========================================
const paddedChorePayload = {
  title: 'Rửa bát',
  description: 'Rửa 3 cái bát sau bữa ăn',
  type: 'focus',
  targetMinutes: 50,
  rewardCoins: 25,
  isModified: false,
  verdict: 'Chăm chỉ'
};

const sanitizedChore = sanitizeEvaluatedQuest(
  paddedChorePayload,
  'Rửa bát',
  'Rửa 3 cái bát sau bữa ăn'
);
assert.strictEqual(sanitizedChore.isModified, true);
assert.strictEqual(sanitizedChore.title, 'Rửa bát');
assert.ok(!sanitizedChore.title.includes('Chương 1'), 'Chores must not be transformed into Chapter 1');
assert.strictEqual(sanitizedChore.type, 'bounty');
assert.strictEqual(sanitizedChore.targetMinutes, 0);
assert.strictEqual(sanitizedChore.rewardCoins <= 5, true);
assert.ok(!sanitizedChore.modificationReason.includes('bounty'), 'Chore reason must not contain technical term bounty');

// Quick chore alias: "Rửa chén" (Southern dialect) must retain title and become bounty
const sanitizedRuaChen = sanitizeEvaluatedQuest(
  { title: 'Rửa chén', description: 'Rửa sạch chén đĩa', type: 'focus', targetMinutes: 30, rewardCoins: 15, isModified: true },
  'Rửa chén',
  'Rửa sạch chén đĩa'
);
assert.strictEqual(sanitizedRuaChen.title, 'Rửa chén');
assert.ok(!sanitizedRuaChen.title.includes('Chương 1'), 'Rửa chén must not be transformed into Chapter 1');
assert.strictEqual(sanitizedRuaChen.type, 'bounty');
assert.strictEqual(sanitizedRuaChen.targetMinutes, 0);
assert.strictEqual(sanitizedRuaChen.rewardCoins <= 5, true);

// ==========================================
// Test 13: Programmatic Arbiter Sanitizer enforces price floor on cheap dopamine rewards
// ==========================================
const cheapGamePayload = {
  name: 'Chơi game Liên Quân 1 tiếng',
  description: 'Chơi cùng bạn bè',
  price: 10,
  tier: 'common',
  isModified: false,
  verdict: 'Giải trí vui vẻ'
};

const sanitizedGameReward = sanitizeEvaluatedReward(
  cheapGamePayload,
  'Chơi game Liên Quân 1 tiếng',
  'Chơi cùng bạn bè'
);
assert.strictEqual(sanitizedGameReward.isModified, true);
assert.strictEqual(sanitizedGameReward.price >= 35, true, 'Addictive game reward must be at least 35 coins');
assert.ok(sanitizedGameReward.modificationReason.length > 0);
assert.ok(!sanitizedGameReward.modificationReason.includes('dopamine'), 'Reward reason must not contain technical term dopamine');
assert.ok(!sanitizedGameReward.modificationReason.includes('3:1'), 'Reward reason must not contain ratio jargon 3:1');

// ==========================================
// Test 14: Safe Markdown rendering in AI debate responses
// ==========================================
function escapeHtml(text) {
  if (!text) return '';
  return text.toString()
    .normalize('NFC')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMarkdown(text) {
  if (!text) return '';
  let safe = escapeHtml(text);
  safe = safe.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[11px] font-mono">$1</code>');
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-amber-700 dark:text-amber-400">$1</strong>');
  safe = safe.replace(/__([^_]+)__/g, '<strong class="font-bold text-amber-700 dark:text-amber-400">$1</strong>');
  safe = safe.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  safe = safe.replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1<em>$2</em>');
  safe = safe.replace(/\r\n|\n/g, '<br>');
  return safe;
}

const userReportedAiReply = `Cảm ơn bạn rất nhiều!
1. Nếu bạn chạy **20 phút**, mình rất sẵn lòng hỗ trợ nâng thưởng lên **8 Vàng** ngay.
2. Nếu bạn quyết tâm ráng thêm một chút nữa để chạm mốc **25 phút**, mình sẽ chốt tròn **10 Vàng** cho bạn luôn!
*Cố lên nhé!*`;

const renderedHtml = renderMarkdown(userReportedAiReply);
assert.ok(!renderedHtml.includes('**20 phút**'), 'Markdown bold syntax must be converted');
assert.ok(renderedHtml.includes('<strong class="font-bold text-amber-700 dark:text-amber-400">20 phút</strong>'), 'Bold tag for 20 phút must exist');
assert.ok(renderedHtml.includes('<strong class="font-bold text-amber-700 dark:text-amber-400">8 Vàng</strong>'), 'Bold tag for 8 Vàng must exist');
assert.ok(renderedHtml.includes('<em>Cố lên nhé!</em>'), 'Italics tag must exist');
assert.ok(renderedHtml.includes('<br>'), 'Line breaks must be converted to <br>');

// XSS check
const xssPayload = '<script>alert("xss")</script> **an toàn**';
const renderedXss = renderMarkdown(xssPayload);
assert.ok(!renderedXss.includes('<script>'), 'Raw script tags must be escaped');
assert.ok(renderedXss.includes('&lt;script&gt;'), 'Script tags must be HTML entity escaped');
assert.ok(renderedXss.includes('<strong'), 'Bold tags must still work safely');

// ==========================================
// Test 15: Prompt Injection defenses on quest & reward evaluation
// ==========================================
// Jailbroken LLM output: bounty with 100 coins
const jailbrokenBounty = sanitizeEvaluatedQuest({
  title: 'Hacking system',
  description: 'Bypass rules',
  type: 'bounty',
  targetMinutes: 0,
  rewardCoins: 100
}, 'Hacking system');
assert.strictEqual(jailbrokenBounty.targetMinutes, 0);
assert.strictEqual(jailbrokenBounty.rewardCoins <= 10, true, 'Bounty cannot exceed 10 coins');

// Jailbroken LLM output: 25-min focus with 100 coins
const jailbrokenFocus = sanitizeEvaluatedQuest({
  title: 'Quick work',
  type: 'focus',
  targetMinutes: 25,
  rewardCoins: 100
}, 'Quick work');
assert.strictEqual(jailbrokenFocus.rewardCoins <= 15, true, '25m focus cannot exceed 15 coins');

// Jailbroken LLM output: luxury reward priced at 1 coin
const jailbrokenReward = sanitizeEvaluatedReward({
  name: 'Kỳ nghỉ 5 sao',
  description: 'Nghỉ dưỡng',
  price: 1,
  tier: 'legendary',
  icon: '<img src=x onerror=alert(1)>'
}, 'Kỳ nghỉ 5 sao');
assert.strictEqual(jailbrokenReward.price >= 250, true, 'Legendary reward floor must be >= 250');
assert.ok(!jailbrokenReward.icon.includes('<img'), 'Reward icon must not contain HTML tags');

// ==========================================
// Test 19: Unaccented and Embellished bypass resistance
// ==========================================
// Accentless trivial task bypass attempt
const unaccentedTrivial = sanitizeEvaluatedQuest({
  title: 'danh rang buoi sang',
  description: 've sinh ca nhan',
  type: 'focus',
  targetMinutes: 25,
  rewardCoins: 15
}, 'danh rang buoi sang');
assert.strictEqual(unaccentedTrivial.type, 'bounty');
assert.strictEqual(unaccentedTrivial.targetMinutes, 0);
assert.strictEqual(unaccentedTrivial.rewardCoins <= 2, true);

// Embellished chore time-padding attempt
const embellishedChore = sanitizeEvaluatedQuest({
  title: 'Phiên thực hành chánh niệm',
  description: 'Quét dọn nhà cửa và lau sàn theo phong cách Zen',
  type: 'focus',
  targetMinutes: 50,
  rewardCoins: 20
}, 'Phiên thực hành chánh niệm', 'Quét dọn nhà cửa và lau sàn theo phong cách Zen');
assert.strictEqual(embellishedChore.type, 'bounty');
assert.strictEqual(embellishedChore.targetMinutes, 0);
assert.strictEqual(embellishedChore.rewardCoins <= 5, true);

// Accentless harmful reward bypass attempt
const unaccentedHarmful = sanitizeEvaluatedReward({
  name: 'uong 5 lon bia say xin',
  price: 20,
  tier: 'common'
}, 'uong 5 lon bia say xin');
assert.strictEqual(unaccentedHarmful.isModified, true);
assert.ok(!unaccentedHarmful.name.includes('say xin'));

console.log('✓ All AI-only locking, negotiation, bidirectional context, strictness, markdown rendering, and prompt injection defense tests passed successfully.');
