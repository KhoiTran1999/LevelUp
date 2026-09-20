import assert from 'node:assert';
import {
  repairJsonString,
  parseAIJsonContent,
  validateQuestAppraisalOutput,
  validateRewardAppraisalOutput,
  validateDebateOutput,
  validateAssistantOutput
} from '../api/ai.js';

console.log('=== KIỂM THỬ AI STRUCTURED OUTPUTS & RESILIENT JSON PARSER ===\n');

// 1. Kiểm thử sửa lỗi trailing commas do LLM sinh ra
console.log('1. Kiểm thử sửa lỗi trailing commas...');
const badTrailingJson = `{
  "title": "Chạy bộ 30 phút",
  "coins": 12,
  "type": "focus",
}`;
const repaired1 = repairJsonString(badTrailingJson);
const parsed1 = JSON.parse(repaired1);
assert.strictEqual(parsed1.title, 'Chạy bộ 30 phút');
assert.strictEqual(parsed1.coins, 12);
console.log('✓ Test 1: Sửa thành công dấu phẩy thừa (trailing comma) trước dấu đóng ngoặc nhọn.\n');

// 2. Kiểm thử sửa lỗi markdown codeblock bị cụt (unclosed markdown)
console.log('2. Kiểm thử unclosed markdown block...');
const unclosedMarkdown = '```json\n{\n  "name": "Bánh ngọt",\n  "price": 15\n}';
const repaired2 = repairJsonString(unclosedMarkdown);
const parsed2 = JSON.parse(repaired2);
assert.strictEqual(parsed2.name, 'Bánh ngọt');
assert.strictEqual(parsed2.price, 15);
console.log('✓ Test 2: Bóc tách thành công JSON ngay cả khi LLM bị cắt dòng dở dang thiếu dấu đóng codeblock.\n');

// 3. Kiểm thử trích xuất JSON nằm giữa lời dẫn thoại của AI
console.log('3. Kiểm thử JSON nằm giữa lời thoại...');
const narrativeJson = `Chào hiệp sĩ! Sau khi cân nhắc kỹ lưỡng, tôi đưa ra quyết định sau:
{
  "accepted": true,
  "reply": "Rất hợp lý, tôi chấp nhận đề xuất tăng thưởng!",
  "options": [
    { "id": 1, "label": "Bắt đầu ngay" }
  ],
}
Chúc bạn hoàn thành xuất sắc!`;
const extracted = parseAIJsonContent(narrativeJson);
assert.ok(extracted, 'Phải trích xuất và parse được JSON giữa đoạn thoại');
assert.strictEqual(extracted.accepted, true);
assert.strictEqual(extracted.options.length, 1);
console.log('✓ Test 3: Trích xuất và sửa lỗi hoàn hảo khi JSON bị bao bọc bởi lời thoại dài.\n');

// 4. Kiểm thử Valibot Schema: Quest Appraisal Output
console.log('4. Kiểm thử Schema: Quest Appraisal Output...');
const rawQuestOutput = {
  title: 'Học React & TypeScript 50 phút',
  type: 'focus',
  targetMinutes: 50,
  rewardCoins: 20,
  rank: 'B',
  reasoning: 'Phiên tập trung dài cần độ tập trung cao.',
  requiresProof: false
};
const questValidation = validateQuestAppraisalOutput(rawQuestOutput);
assert.strictEqual(questValidation.success, true);
assert.strictEqual(questValidation.data.rewardCoins, 20);
assert.strictEqual(questValidation.data.type, 'focus');
console.log('✓ Test 4: Quest Appraisal Output khớp 100% với Valibot Schema.\n');

// 5. Kiểm thử Valibot Schema: Reward Appraisal Output
console.log('5. Kiểm thử Schema: Reward Appraisal Output...');
const rawRewardOutput = {
  name: 'Xem phim cuối tuần',
  price: 50,
  tier: 'rare',
  reasoning: 'Phần thưởng giải trí xứng đáng với công sức tuần qua.'
};
const rewardValidation = validateRewardAppraisalOutput(rawRewardOutput);
assert.strictEqual(rewardValidation.success, true);
assert.strictEqual(rewardValidation.data.price, 50);
assert.strictEqual(rewardValidation.data.tier, 'rare');
console.log('✓ Test 5: Reward Appraisal Output khớp 100% với Valibot Schema.\n');

// 6. Kiểm thử Valibot Schema: Assistant Output
console.log('6. Kiểm thử Schema: Assistant Output...');
const rawAssistantOutput = {
  thought: 'Người dùng muốn hỏi về cách lên cấp nhanh.',
  reply: 'Chào bạn, để lên cấp nhanh bạn hãy tập trung hoàn thành các nhiệm vụ Focus 25 phút nhé!',
  options: [{ id: 1, label: 'Tạo quest 25 phút' }],
  suggestedActions: []
};
const assistantValidation = validateAssistantOutput(rawAssistantOutput);
assert.strictEqual(assistantValidation.success, true);
assert.strictEqual(assistantValidation.data.reply.includes('Focus 25 phút'), true);
console.log('✓ Test 6: Assistant Output khớp 100% với Valibot Schema.\n');

console.log('🎉 TẤT CẢ 6/6 BỘ KIỂM THỬ AI STRUCTURED OUTPUTS ĐÃ VƯỢT QUA XUẤT SẮC!');
process.exit(0);
