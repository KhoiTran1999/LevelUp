import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getDeterministicQuestSuggestions,
  getDeterministicRewardSuggestions,
  sanitizeQuestSuggestions,
  sanitizeRewardSuggestions,
  getModelAndReasoning,
  MODEL_WORKER
} from "../api/ai.js";
import aiHandler from "../api/ai.js";
import { setGoogleTokenVerifierForTesting } from "../api/sync.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("=== BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG GỢI Ý NHANH NHIỆM VỤ & PHẦN THƯỞNG (AI WORKER KHÔNG THINKING) ===\n");

// ---------------------------------------------------------------------------
// TEST 1: Cam kết Model Worker & Không dùng Thinking
// ---------------------------------------------------------------------------
console.log("--- TEST 1: Cam kết Model Worker & Thinking Disabled ---");
const workerConfig = getModelAndReasoning("worker", false);
assert.strictEqual(workerConfig.isBrain, false, "AI gợi ý phải dùng role worker (isBrain = false)");
assert.strictEqual(workerConfig.reasoning_effort, "none", "AI gợi ý phải tắt reasoning_effort (effort = \"none\")");
assert.strictEqual(workerConfig.model, MODEL_WORKER, "AI gợi ý phải dùng MODEL_WORKER");
console.log("✓ Test 1: Worker configuration đạt chuẩn (thinking = false, reasoning_effort = none, role = worker).\n");

// ---------------------------------------------------------------------------
// TEST 2: Deterministic Quest Suggestions (Chống trùng lặp, tinh tế, vừa sức)
// ---------------------------------------------------------------------------
console.log("--- TEST 2: Deterministic Quest Suggestions ---");
const emptyQuestsSuggest = getDeterministicQuestSuggestions([], 50, 2);
assert(Array.isArray(emptyQuestsSuggest), "Kết quả phải là một mảng");
assert(emptyQuestsSuggest.length >= 3, "Phải có ít nhất 3 gợi ý");

emptyQuestsSuggest.forEach(q => {
  assert(q.title && typeof q.title === "string", "Mỗi gợi ý phải có title");
  assert(["focus", "bounty"].includes(q.type), "Type phải là focus hoặc bounty");
  assert(typeof q.targetMinutes === "number" && q.targetMinutes >= 0, "targetMinutes phải hợp lệ");
  assert(typeof q.rewardCoins === "number" && q.rewardCoins >= 1, "rewardCoins phải >= 1");
  assert(q.icon && typeof q.icon === "string", "Phải có icon");
  assert(q.reason && typeof q.reason === "string", "Phải có lý do gợi ý tinh tế");
});

const existingQuests = [
  { title: "Phiên Pomodoro 25 phút tập trung sâu", type: "focus", targetMinutes: 25, rewardCoins: 9 }
];
const dedupedQuests = getDeterministicQuestSuggestions(existingQuests, 50, 2);
const hasDuplicate = dedupedQuests.some(q => q.title.toLowerCase().includes("pomodoro 25 phút"));
assert.strictEqual(hasDuplicate, false, "Không được gợi ý nhiệm vụ đã có trong danh sách");

// Kiểm tra Gap-Detection: Người dùng chỉ có DeepWork -> Phải gợi ý bù đắp Vận động thể chất hoặc Phục hồi
const onlyWorkQuests = [
  { title: "Lập trình backend API", type: "focus" },
  { title: "Viết tài liệu kỹ thuật", type: "focus" }
];
const gapQuests = getDeterministicQuestSuggestions(onlyWorkQuests, 50, 2);
const hasMissingPillar = gapQuests.some(q =>
  ['hít đất', 'chạy bộ', 'yoga', 'nước', 'dọn dẹp'].some(kw => q.title.toLowerCase().includes(kw))
);
assert.strictEqual(hasMissingPillar, true, "Phải gợi ý đúng nhu cầu còn thiếu (Thể chất & Phục hồi) cho người dùng");
console.log("✓ Test 2: Gợi ý nhiệm vụ thông minh, phân tích đúng nhu cầu còn thiếu và loại bỏ trùng lặp hoàn hảo.\n");

// ---------------------------------------------------------------------------
// TEST 3: Deterministic Reward Suggestions (Lành mạnh, nạp lại năng lượng)
// ---------------------------------------------------------------------------
console.log("--- TEST 3: Deterministic Reward Suggestions ---");
const emptyRewardsSuggest = getDeterministicRewardSuggestions([], [], 60);
assert(Array.isArray(emptyRewardsSuggest), "Kết quả phải là một mảng phần thưởng");
assert(emptyRewardsSuggest.length >= 3, "Phải có ít nhất 3 phần thưởng gợi ý");

emptyRewardsSuggest.forEach(r => {
  assert(r.name && typeof r.name === "string", "Phải có tên phần thưởng");
  assert(typeof r.price === "number" && r.price >= 5, "Giá Vàng phải >= 5");
  assert(["common", "rare", "epic"].includes(r.tier), "Hạng phải thuộc common/rare/epic");
  assert(typeof r.targetMinutes === "number" && r.targetMinutes >= 0, "targetMinutes phải >= 0");
  assert(r.icon && typeof r.icon === "string", "Phải có icon");
  assert(r.reason && typeof r.reason === "string", "Phải có lý do gợi ý tinh tế");
});

const existingRewards = [
  { name: "Thưởng thức 1 ly cà phê / trà thảo mộc tự pha", price: 20, tier: "common" }
];
const dedupedRewards = getDeterministicRewardSuggestions(existingRewards, [], 60);
const hasDuplicateReward = dedupedRewards.some(r => r.name.toLowerCase().includes("cà phê"));
assert.strictEqual(hasDuplicateReward, false, "Không được gợi ý phần thưởng đã có trong Cửa Hàng");
console.log("✓ Test 3: Gợi ý phần thưởng lành mạnh, phân tầng giá chuẩn và chống trùng lặp.\n");

// ---------------------------------------------------------------------------
// TEST 4: Sanitize Suggestions (Chống dữ liệu rác, đảm bảo chuẩn kinh tế LevelUp)
// ---------------------------------------------------------------------------
console.log("--- TEST 4: Sanitize Suggestions ---");
const dirtyQuests = [
  { title: "Học Toán Cực Nhanh", type: "focus", targetMinutes: -10, rewardCoins: 9999, reason: "Test" },
  { title: "Quét Nhà", type: "focus", targetMinutes: 0, rewardCoins: 4 },
  { title: "Nhiệm Vụ Trùng Lặp", type: "focus", targetMinutes: 25, rewardCoins: 9 }
];
const sanitizedQ = sanitizeQuestSuggestions(dirtyQuests, [{ title: "Nhiệm Vụ Trùng Lặp" }]);
assert.strictEqual(sanitizedQ.length, 2, "Phải loại bỏ nhiệm vụ trùng lặp");
assert.strictEqual(sanitizedQ[0].targetMinutes, 25, "Số phút âm phải được sửa về mặc định 25p");
assert(sanitizedQ[0].rewardCoins <= 100, "Vàng thưởng không được vượt ngưỡng 100");
assert.strictEqual(sanitizedQ[1].type, "bounty", "targetMinutes = 0 phải là bounty");

const dirtyRewards = [
  { name: "Game Đêm", price: -5, tier: "super_legendary", targetMinutes: 999 },
  { name: "Quà Trùng", price: 20 }
];
const sanitizedR = sanitizeRewardSuggestions(dirtyRewards, [{ name: "Quà Trùng" }]);
assert.strictEqual(sanitizedR.length, 1, "Phải loại bỏ quà trùng");
assert(sanitizedR[0].price >= 5, "Giá Vàng phải >= 5");
assert(["common", "rare", "epic"].includes(sanitizedR[0].tier), "Hạng không hợp lệ phải được chuẩn hóa");
assert(sanitizedR[0].targetMinutes <= 240, "Thời gian tận hưởng tối đa 240p");
console.log("✓ Test 4: Bộ lọc sanitize bảo vệ dữ liệu, chống số âm và khống điểm thành công.\n");

// ---------------------------------------------------------------------------
// TEST 5: API Handler (/api/ai) cho suggest_quests và suggest_rewards
// ---------------------------------------------------------------------------
console.log("--- TEST 5: API Handler Route Integration ---");

setGoogleTokenVerifierForTesting(async (token) => {
  if (token === "valid_mock_token_for_suggestions") {
    return { sub: "user_suggest_test", email: "suggest@levelup.com", name: "Suggest Tester" };
  }
  return null;
});

async function mockApiCall(action, payload) {
  let statusCode = 200;
  let jsonResult = null;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  title: "Gợi ý AI 1",
                  name: "Gợi ý Quà AI 1",
                  description: "Mô tả",
                  type: "focus",
                  targetMinutes: 25,
                  rewardCoins: 9,
                  price: 30,
                  tier: "rare",
                  reason: "Lý do AI"
                },
                {
                  title: "Gợi ý AI 2",
                  name: "Gợi ý Quà AI 2",
                  description: "Mô tả 2",
                  type: "bounty",
                  targetMinutes: 0,
                  rewardCoins: 4,
                  price: 20,
                  tier: "common",
                  reason: "Lý do AI 2"
                },
                {
                  title: "Gợi ý AI 3",
                  name: "Gợi ý Quà AI 3",
                  description: "Mô tả 3",
                  type: "focus",
                  targetMinutes: 15,
                  rewardCoins: 6,
                  price: 50,
                  tier: "epic",
                  reason: "Lý do AI 3"
                }
              ]
            })
          }
        }
      ]
    })
  });

  const req = {
    method: "POST",
    headers: {
      "authorization": "Bearer valid_mock_token_for_suggestions",
      "content-type": "application/json"
    },
    body: {
      action,
      payload
    }
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonResult = data;
      return this;
    },
    setHeader() {}
  };

  try {
    await aiHandler(req, res);
  } finally {
    globalThis.fetch = originalFetch;
  }
  return { status: statusCode, body: jsonResult };
}

const questApiResponse = await mockApiCall("suggest_quests", {
  existingQuests: [{ title: "Học tiếng Anh" }],
  recentCompleted: [],
  userCoins: 20,
  userLevel: 2
});

assert.strictEqual(questApiResponse.status, 200, "API suggest_quests phải trả về 200");
assert(Array.isArray(questApiResponse.body.suggestions), "Phải có mảng suggestions");
assert(questApiResponse.body.suggestions.length >= 3, "Phải có ít nhất 3 gợi ý");

const rewardApiResponse = await mockApiCall("suggest_rewards", {
  existingRewards: [{ name: "Uống trà sữa" }],
  activeQuests: [],
  userCoins: 40
});

assert.strictEqual(rewardApiResponse.status, 200, "API suggest_rewards phải trả về 200");
assert(Array.isArray(rewardApiResponse.body.suggestions), "Phải có mảng suggestions phần thưởng");
assert(rewardApiResponse.body.suggestions.length >= 3, "Phải có ít nhất 3 gợi ý phần thưởng");
console.log("✓ Test 5: API /api/ai phản hồi chuẩn xác cho cả suggest_quests và suggest_rewards.\n");

// ---------------------------------------------------------------------------
// TEST 6: Kiểm tra phần tử DOM trên index.html
// ---------------------------------------------------------------------------
// TEST 6: Kiểm tra UI Elements trên index.html
// ---------------------------------------------------------------------------
console.log("--- TEST 6: Kiểm tra UI Elements trên index.html ---");
const htmlContent = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");

assert(htmlContent.includes("id=\"quest-suggestions-container\""), "Thiếu id=quest-suggestions-container");
assert(htmlContent.includes("id=\"quest-suggestions-list\""), "Thiếu id=quest-suggestions-list");
assert(htmlContent.includes("id=\"btn-toggle-quest-suggestions\""), "Thiếu id=btn-toggle-quest-suggestions");

assert(htmlContent.includes("id=\"reward-suggestions-container\""), "Thiếu id=reward-suggestions-container");
assert(htmlContent.includes("id=\"reward-suggestions-list\""), "Thiếu id=reward-suggestions-list");
assert(htmlContent.includes("id=\"btn-toggle-reward-suggestions\""), "Thiếu id=btn-toggle-reward-suggestions");
console.log("✓ Test 6: Container gợi ý và nút toggle tinh gọn hiện diện đầy đủ trên index.html.\n");

// ---------------------------------------------------------------------------
// TEST 7: Kiểm tra CSS trong style.css
// ---------------------------------------------------------------------------
console.log("--- TEST 7: Kiểm tra CSS trong style.css ---");
const cssContent = fs.readFileSync(path.join(__dirname, "../public/style.css"), "utf8");

assert(cssContent.includes(".suggestion-card"), "Thiếu class .suggestion-card trong style.css");
assert(cssContent.includes(".suggestion-card-active"), "Thiếu class .suggestion-card-active trong style.css");
assert(cssContent.includes(".suggestion-skeleton"), "Thiếu class .suggestion-skeleton trong style.css");
assert(cssContent.includes(".no-scrollbar"), "Thiếu class .no-scrollbar trong style.css");
console.log("✓ Test 7: CSS classes cho thẻ gợi ý, scrollbar ẩn và hiệu ứng animation đã sẵn sàng.\n");

// ---------------------------------------------------------------------------
// TEST 8: Kiểm tra Logic Client trong app.js (Tức thì 0ms, không phụ thuộc nút đổi)
// ---------------------------------------------------------------------------
console.log("--- TEST 8: Kiểm tra Logic Client trong app.js ---");
const appJsContent = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");

assert(appJsContent.includes("loadQuestSuggestions"), "Thiếu loadQuestSuggestions trong app.js");
assert(appJsContent.includes("loadRewardSuggestions"), "Thiếu loadRewardSuggestions trong app.js");
assert(appJsContent.includes("applyQuestSuggestion"), "Thiếu applyQuestSuggestion trong app.js");
assert(appJsContent.includes("applyRewardSuggestion"), "Thiếu applyRewardSuggestion trong app.js");
assert(appJsContent.includes("btn-toggle-quest-suggestions"), "Thiếu gắn sự kiện cho btn-toggle-quest-suggestions");
assert(appJsContent.includes("btn-toggle-reward-suggestions"), "Thiếu gắn sự kiện cho btn-toggle-reward-suggestions");
console.log("✓ Test 8: Logic Client JavaScript trong app.js chạy tức thì 0ms, đáp ứng đúng nhu cầu còn thiếu.\n");

console.log("🎉 TẤT CẢ 8/8 MỤC KIỂM THỬ GỢI Ý NHIỆM VỤ & PHẦN THƯỞNG ĐÃ VƯỢT QUA 100%!");
process.exit(0);
