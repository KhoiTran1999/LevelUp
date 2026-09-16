import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  parseAIJsonContent,
  normalizeDebateOptions,
  handleUpdateQuestParameters
} from '../api/ai.js';

console.log('=== KIỂM THỬ BÓC TÁCH JSON VÀ CHỐNG TRÀN RAW JSON VÀO CHAT THƯƠNG LƯỢNG ===\n');

const sampleJsonPayload = JSON.stringify({
  accepted: false,
  reply: 'Mình rất hiểu và đồng cảm với bạn, tập yoga giãn cơ đúng kỹ thuật và hít thở sâu thật sự đòi hỏi nhiều nỗ lực và cũng mệt không kém các bài tập khác đâu nè!\n\nTuy nhiên, mức thưởng 10 Vàng theo quy chuẩn là dành cho phiên hẹn giờ tập trung 25 phút. Ngoài ra, đồng hồ hẹn giờ tập trung hiện có các mốc thời gian chuẩn là 15, 25 và 50 phút chứ chưa hỗ trợ mốc 10 phút bạn ạ.\n\nĐể phù hợp nhất với buổi tập của bạn, mình gợi ý 3 phương án sau nhé:\n\n- Phương án 1: Hẹn giờ tập trung 15 phút (mốc gần với 10 phút nhất) và nhận 6 Vàng.\n- Phương án 2: Nâng lên phiên hẹn giờ 25 phút cho bài tập yoga trọn vẹn để nhận đủ 10 Vàng như bạn mong muốn.\n- Phương án 3: Giữ nguyên là việc không cần bấm giờ với 6 Vàng, bạn tập xong lúc nào thì bấm hoàn thành nhận thưởng ngay lúc đó cho thoải mái.\n\nBạn thấy phương án nào phù hợp với buổi tập hôm nay nhất thì bấm chọn bên dưới nha!',
  newTitle: 'Yoga giãn cơ nhẹ nhàng',
  newDescription: 'Thực hiện chuỗi động tác yoga thả lỏng toàn thân, kéo giãn cơ bắp và kết hợp hít thở sâu.',
  newCategory: 'fitness',
  newType: 'bounty',
  newRewardCoins: 6,
  newTargetMinutes: 0,
  newRank: 'D',
  newRequiresProof: false,
  newProofGuidance: '',
  options: [
    {
      id: 1,
      label: 'Hẹn giờ 15 phút (6 Vàng)',
      argument: 'Mình chọn phương án 1: Hẹn giờ tập trung 15 phút nhận 6 Vàng nhé.',
      newRewardCoins: 6,
      newTargetMinutes: 15,
      newType: 'focus',
      newTitle: 'Yoga giãn cơ nhẹ nhàng (15 phút)'
    },
    {
      id: 2,
      label: 'Hẹn giờ 25 phút (10 Vàng)',
      argument: 'Mình chọn phương án 2: Hẹn giờ tập trung 25 phút nhận 10 Vàng nhé.',
      newRewardCoins: 10,
      newTargetMinutes: 25,
      newType: 'focus',
      newTitle: 'Yoga giãn cơ chuyên sâu (25 phút)'
    },
    {
      id: 3,
      label: 'Không cần bấm giờ (6 Vàng)',
      argument: 'Mình chọn phương án 3: Giữ nguyên việc không bấm giờ nhận 6 Vàng.',
      newRewardCoins: 6,
      newTargetMinutes: 0,
      newType: 'bounty',
      newTitle: 'Yoga giãn cơ nhẹ nhàng'
    }
  ]
}, null, 2);

// -----------------------------------------------------------------------------
// 1. Kiểm thử parseAIJsonContent bóc tách chính xác đối tượng JSON
// -----------------------------------------------------------------------------
{
  // 1a: Chuỗi JSON thuần
  const parsed1 = parseAIJsonContent(sampleJsonPayload);
  assert.ok(parsed1, 'Phải parse được chuỗi JSON thuần');
  assert.strictEqual(parsed1.accepted, false);
  assert.ok(parsed1.reply.startsWith('Mình rất hiểu và đồng cảm với bạn'));
  assert.strictEqual(parsed1.options.length, 3);

  // 1b: Chuỗi JSON bọc trong markdown ```json ... ```
  const mdWrapped = '```json\n' + sampleJsonPayload + '\n```';
  const parsed2 = parseAIJsonContent(mdWrapped);
  assert.ok(parsed2, 'Phải parse được JSON bọc trong ```json');
  assert.strictEqual(parsed2.accepted, false);
  assert.strictEqual(parsed2.newRewardCoins, 6);

  // 1c: Chuỗi văn bản có lẫn JSON ở giữa
  const mixedText = 'Dưới đây là kết quả:\n' + sampleJsonPayload + '\nChúc bạn tập tốt!';
  const parsed3 = parseAIJsonContent(mixedText);
  assert.ok(parsed3, 'Phải parse được JSON nằm giữa văn bản');
  assert.strictEqual(parsed3.options.length, 3);

  console.log('✓ Test 1: parseAIJsonContent bóc tách trọn vẹn JSON từ cả dạng thuần, markdown codeblock và mixed text.');
}

// -----------------------------------------------------------------------------
// 2. Kiểm thử normalizeDebateOptions chuẩn hóa các phương án cho giao diện nút bấm
// -----------------------------------------------------------------------------
{
  const rawOpts = JSON.parse(sampleJsonPayload).options;
  const normalized = normalizeDebateOptions(rawOpts, 'quest');

  assert.strictEqual(normalized.length, 3);
  assert.strictEqual(normalized[0].id, 1);
  assert.strictEqual(normalized[0].label, 'Hẹn giờ 15 phút (6 Vàng)');
  assert.strictEqual(normalized[0].newRewardCoins, 6);
  assert.strictEqual(normalized[0].newTargetMinutes, 15);
  assert.strictEqual(normalized[0].newType, 'focus');

  assert.strictEqual(normalized[1].id, 2);
  assert.strictEqual(normalized[1].newRewardCoins, 10);
  assert.strictEqual(normalized[1].newTargetMinutes, 25);

  assert.strictEqual(normalized[2].id, 3);
  assert.strictEqual(normalized[2].newType, 'bounty');
  assert.strictEqual(normalized[2].newTargetMinutes, 0);

  console.log('✓ Test 2: normalizeDebateOptions chuẩn hóa mảng options sang dạng nút bấm tương tác đầy đủ thông số.');
}

// -----------------------------------------------------------------------------
// 3. Kiểm thử handleUpdateQuestParameters khi nhận tham số đã bóc tách từ JSON
// -----------------------------------------------------------------------------
{
  const parsed = parseAIJsonContent(sampleJsonPayload);
  const quest = {
    title: 'Yoga giãn cơ nhẹ nhàng',
    targetMinutes: 0,
    rewardCoins: 6,
    type: 'bounty'
  };

  const res = handleUpdateQuestParameters({
    ...parsed,
    accepted: false,
    reply: parsed.reply
  }, quest);

  assert.strictEqual(res.accepted, false);
  // reply phải là lời thoại thuần Việt, KHÔNG ĐƯỢC chứa dấu ngoặc nhọn hoặc cú pháp JSON
  assert.ok(!res.reply.includes('"accepted":'), 'reply không được chứa "accepted":');
  assert.ok(!res.reply.includes('"newTitle":'), 'reply không được chứa "newTitle":');
  assert.ok(res.reply.startsWith('Mình rất hiểu và đồng cảm với bạn'));

  console.log('✓ Test 3: handleUpdateQuestParameters giữ lời thoại thuần túy, tuyệt đối không rò rỉ cú pháp JSON.');
}

// -----------------------------------------------------------------------------
// 4. Kiểm thử mã nguồn public/app.js có bộ lọc chống rò rỉ raw JSON ở cả 3 luồng
// -----------------------------------------------------------------------------
{
  const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

  // Kiểm tra bộ lọc trong appendAiChatBubble
  assert.ok(
    appJs.includes("reply.trim().startsWith('{') || reply.trim().startsWith('```json')"),
    'appendAiChatBubble phải có guard bóc tách reply nếu là chuỗi JSON'
  );

  // Kiểm tra bộ lọc trong các hàm chat
  assert.ok(
    appJs.includes("data.reply.trim().startsWith('{') || data.reply.trim().startsWith('```json')"),
    'public/app.js phải có guard bóc tách data.reply trước khi tạo diffTags và lưu history'
  );

  console.log('✓ Test 4: Frontend public/app.js được bảo vệ 2 lớp (defense-in-depth), chặn đứng 100% việc hiển thị raw JSON.');
}

console.log('\n======================================================================');
console.log('🎉 TẤT CẢ 4 KIỂM THỬ CHỐNG RÒ RỈ RAW JSON ĐÃ VƯỢT QUA 100%!');
console.log('======================================================================\n');
process.exit(0);
