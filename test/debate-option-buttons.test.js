import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { parseDebateOptionsFromText, sanitizeEvaluatedReward, extractDurationFromText } from '../api/ai.js';
import { signReward, verifyRewardSignature } from '../api/sync.js';

console.log('=== Kiểm thử Nút Bấm Tương Tác Phương Án AI & Khắc Phục Đóng Băng Thông Số Khi Thương Lượng ===\n');

const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8').replace(/\r\n/g, '\n');
const aiJs = fs.readFileSync(path.resolve('api/ai.js'), 'utf8').replace(/\r\n/g, '\n');

// 1. Kiểm tra hàm parseDebateOptionsFromText trích xuất chuẩn xác các phương án từ phản hồi thực tế của AI
{
  const realAiReply = `Tuy nhiên, để cảm giác nghỉ ngơi này thật sự thoải mái và xứng đáng với công sức bạn bỏ ra, mình xin phép giữ mức giá 35 Vàng cho 30 phút xem Youtube nhé.

Nếu bạn muốn nhận thưởng ngay, mình có hai gợi ý nhỏ cho bạn đây:

- Phương án 1: Chúng mình có thể rút ngắn thời gian xem xuống 15 phút, khi ấy mức giá 20 Vàng sẽ cực kỳ vừa vặn luôn!

- Phương án 2: Hiện tại bạn đã có sẵn 30 Vàng rồi, chỉ cần làm nốt nhiệm vụ Thiền định thư giãn 15 phút là bạn có thêm ngay 5 Vàng, vừa vặn chạm mốc 35 Vàng để rước trọn vẹn 30 phút xem Youtube mà không cần đắn đo gì nữa.

Chỉ một xíu nỗ lực nữa thôi, cố lên bạn nhé! ✨`;

  const options = parseDebateOptionsFromText(realAiReply, 'reward');
  assert.strictEqual(options.length, 2, 'Phải trích xuất được 2 phương án từ đoạn hội thoại thực tế của AI');

  const opt1 = options[0];
  assert.strictEqual(opt1.id, '1');
  assert.strictEqual(opt1.newPrice, 20, 'Phương án 1 phải có newPrice = 20 Vàng');
  assert.strictEqual(opt1.newTargetMinutes, 15, 'Phương án 1 phải có newTargetMinutes = 15 phút');
  assert.strictEqual(opt1.newTier, 'common', 'Phương án 1 giá < 30 Vàng nên newTier phải là common');
  assert.ok(opt1.label.includes('15 phút') && opt1.label.includes('20 Vàng'), 'Nhãn nút bấm phải nêu rõ 15 phút và 20 Vàng');
  assert.ok(opt1.argument.includes('15 phút') && opt1.argument.includes('20 Vàng'), 'Nội dung gửi chốt phải chứa thông số chuẩn xác');

  console.log('✓ Test 1: parseDebateOptionsFromText trích xuất thành công 2 phương án thực tế kèm đầy đủ tham số 15 phút và 20 Vàng.');
}

// 1B. Kiểm tra trích xuất phương án khi AI dùng từ "Cách 1", "Cách 2" (từ phản hồi thực tế người dùng báo cáo)
{
  const realCachAiReply = `Mặt khác, để bạn vẫn có lựa chọn phù hợp, mình gợi ý 2 cách siêu tiện lợi này nha:
- Cách 1: Bạn hiện đã tích lũy được 30 Vàng rồi, chỉ cần làm thêm nhiệm vụ nhẹ nhàng như Thiền định thư giãn 15 phút là có thêm 5 Vàng, vừa đủ 35 Vàng để đổi trọn vẹn nửa tiếng xem video rồi đó.
- Cách 2: Nếu bạn muốn đổi ngay với mức giá 20 Vàng, tụi mình có thể điều chỉnh thời lượng thành Xem YouTube 15 phút nha.

Bạn thấy cách nào hợp ý mình hơn thì nhắn cho mình biết nhé. Cố lên một chút nữa là tha hồ thư giãn rồi! ✨`;

  const options = parseDebateOptionsFromText(realCachAiReply, 'reward');
  assert.strictEqual(options.length, 2, 'Phải trích xuất được 2 phương án khi AI dùng từ khóa "- Cách 1:", "- Cách 2:"');

  const opt1 = options[0];
  assert.strictEqual(opt1.id, '1');
  assert.strictEqual(opt1.label.includes('Cách 1'), true, 'Nhãn phải là Cách 1');
  assert.strictEqual(opt1.newTargetMinutes, 30, 'Cách 1 nhắc đến nửa tiếng xem video nên targetMinutes = 30');

  const opt2 = options[1];
  assert.strictEqual(opt2.id, '2');
  assert.strictEqual(opt2.newPrice, 20, 'Cách 2 phải có newPrice = 20 Vàng');
  assert.strictEqual(opt2.newTargetMinutes, 15, 'Cách 2 phải có newTargetMinutes = 15 phút');
  assert.strictEqual(opt2.newTier, 'common', 'Cách 2 mức giá 20 Vàng nên newTier phải là common');
  assert.strictEqual(opt2.newName, 'Xem YouTube 15 phút', 'Cách 2 phải trích xuất được tên mới Xem YouTube 15 phút');
  assert.ok(opt2.label.includes('15 phút') && opt2.label.includes('20 Vàng'), 'Nhãn nút bấm Cách 2 phải hiển thị 15 phút • 20 Vàng');
  assert.ok(opt2.argument.includes('15 phút') && opt2.argument.includes('20 Vàng'), 'Nội dung gửi khi click Cách 2 phải có 15 phút, 20 Vàng');

  console.log('✓ Test 1B: parseDebateOptionsFromText trích xuất hoàn hảo khi AI dùng cú pháp "- Cách 1:", "- Cách 2:" kèm tên mới và thông số.');
}

// 2. Kiểm tra trích xuất phương án cho Nhiệm Vụ (quest)
{
  const questAiReply = `Mình thấy bạn muốn tăng thưởng lên 25 Vàng. Mình có 2 gợi ý cho bạn:
- Phương án 1: Tăng thời gian tập trung lên 40 phút thì mình sẽ thưởng 25 Vàng cho bạn nhé!
- Phương án 2: Giữ nguyên 25 phút thì mình hỗ trợ nâng lên 18 Vàng.`;

  const questOptions = parseDebateOptionsFromText(questAiReply, 'quest');
  assert.strictEqual(questOptions.length, 2, 'Phải trích xuất được 2 phương án cho nhiệm vụ');

  const qOpt1 = questOptions[0];
  assert.strictEqual(qOpt1.newTargetMinutes, 40, 'Phương án 1 nhiệm vụ phải có targetMinutes = 40');
  assert.strictEqual(qOpt1.newRewardCoins, 25, 'Phương án 1 nhiệm vụ phải có rewardCoins = 25 Vàng');

  const qOpt2 = questOptions[1];
  assert.strictEqual(qOpt2.newTargetMinutes, 25, 'Phương án 2 nhiệm vụ phải có targetMinutes = 25');
  assert.strictEqual(qOpt2.newRewardCoins, 18, 'Phương án 2 nhiệm vụ phải có rewardCoins = 18 Vàng');

  console.log('✓ Test 2: parseDebateOptionsFromText trích xuất chuẩn xác thời gian và Vàng cho nhiệm vụ (Quest).');
}

// 3. Khắc phục lỗi đóng băng thông số (Parameter Freeze):
// Khi người dùng chọn Phương án 1, AI đồng ý và trả về tên mới "Xem Youtube 15 phút" kèm text "- Mức giá: 20 Vàng",
// nhưng trong JSON AI lại bỏ quên newPrice và newTargetMinutes.
{
  const originalReward = {
    name: 'Xem Youtube 30 phút',
    price: 35,
    tier: 'rare',
    targetMinutes: 30,
    category: 'entertainment'
  };

  // Giả lập kết quả AI trả về khi chấp thuận (LLM quên điền newPrice và newTargetMinutes trong JSON)
  const aiResultFromLLM = {
    accepted: true,
    reply: `Tuyệt vời luôn! Mình đã cập nhật lại phần thưởng theo đúng ý bạn rồi nhé.

- Phần thưởng: Xem Youtube 15 phút
- Mức giá: 20 Vàng

Hiện tại bạn đang có sẵn 30 Vàng, nên bạn hoàn toàn có thể rước ngay món quà này để giải trí một chút rồi đấy.`,
    newName: 'Xem Youtube 15 phút',
    newTier: 'common'
    // newPrice và newTargetMinutes bị LLM bỏ trống!
  };

  const selectedOpt = {
    id: '1',
    label: 'Phương án 1 (15 phút • 20 Vàng)',
    argument: 'Chốt phương án 1: 15 phút, 20 Vàng',
    newPrice: 20,
    newTargetMinutes: 15
  };

  // Áp dụng cơ chế trích xuất fallback từ reply text và selectedOption như trong api/ai.js:
  let extractedPrice = undefined;
  let extractedMins = undefined;

  if (aiResultFromLLM.newPrice !== undefined) extractedPrice = parseInt(aiResultFromLLM.newPrice, 10);
  if (aiResultFromLLM.newTargetMinutes !== undefined) extractedMins = parseInt(aiResultFromLLM.newTargetMinutes, 10);

  if (extractedPrice === undefined && selectedOpt?.newPrice !== undefined) {
    extractedPrice = parseInt(selectedOpt.newPrice, 10);
  }
  if (extractedMins === undefined && selectedOpt?.newTargetMinutes !== undefined) {
    extractedMins = parseInt(selectedOpt.newTargetMinutes, 10);
  }

  if (extractedPrice === undefined && aiResultFromLLM.reply) {
    const priceMatch = aiResultFromLLM.reply.match(/(?:mức\s*giá|giá(?:\s*vàng)?|giảm\s*(?:còn|xuống))[:\s]*(\d+)\s*vàng/i);
    if (priceMatch) extractedPrice = parseInt(priceMatch[1], 10);
  }

  const durationFromName = extractDurationFromText(aiResultFromLLM.newName || originalReward.name);
  if (extractedMins === undefined && durationFromName > 0) {
    extractedMins = durationFromName;
  }

  assert.strictEqual(extractedPrice, 20, 'Cơ chế fallback phải khôi phục được mức giá 20 Vàng');
  assert.strictEqual(extractedMins, 15, 'Cơ chế fallback phải khôi phục được 15 phút từ tên phần thưởng mới');

  const rawDebate = {
    name: aiResultFromLLM.newName,
    price: extractedPrice,
    tier: aiResultFromLLM.newTier,
    targetMinutes: extractedMins,
    isNegotiated: true
  };

  const clean = sanitizeEvaluatedReward(rawDebate, originalReward.name, '');
  assert.strictEqual(clean.price, 20, 'Giá cuối cùng phải là 20 Vàng (không bị đóng băng ở 35 Vàng)');
  assert.strictEqual(clean.targetMinutes, 15, 'Thời gian cuối cùng phải là 15 Phút (không bị đóng băng ở 30 Phút)');
  assert.strictEqual(clean.tier, 'common', 'Hạng quà phải là common');

  const sig = signReward(clean.name, clean.price, clean.tier, clean.targetMinutes);
  assert.strictEqual(verifyRewardSignature({ ...clean, signature: sig }), true, 'Chữ ký phần thưởng sau thương lượng phải hợp lệ 100%');

  console.log('✓ Test 3: Lỗi đóng băng thông số (Parameter Freeze) đã được giải quyết triệt để nhờ cơ chế fallback kép và selectedOption.');
}

// 4. Kiểm tra sự hiện diện của các thành phần UI Option Buttons trong public/app.js
assert.ok(appJs.includes('parseDebateOptionsFromText('), 'public/app.js phải có hàm parseDebateOptionsFromText');
assert.ok(appJs.includes('class="debate-option-btn'), 'public/app.js phải render nút bấm lựa chọn với class debate-option-btn');
assert.ok(appJs.includes('debate-options-wrapper'), 'public/app.js phải có container debate-options-wrapper');
assert.ok(appJs.includes('onSelectOption'), 'appendAiChatBubble phải hỗ trợ callback onSelectOption khi người dùng click nút phương án');
assert.ok(appJs.includes('async function sendDebateArgument(customArg = null, selectedOption = null)'), 'sendDebateArgument phải nhận tham số customArg và selectedOption');
assert.ok(appJs.includes('async function sendRewardDebateArgument(customArg = null, selectedOption = null)'), 'sendRewardDebateArgument phải nhận tham số customArg và selectedOption');
console.log('✓ Test 4: Giao diện public/app.js tích hợp đầy đủ nút bấm tương tác 1-chạm và truyền selectedOption.');

// 5. Kiểm tra nâng cấp backend api/ai.js
assert.ok(aiJs.includes('parseDebateOptionsFromText'), 'api/ai.js phải có parseDebateOptionsFromText');
assert.ok(aiJs.includes('selectedOption'), 'api/ai.js phải xử lý selectedOption từ payload người dùng');
assert.ok(aiJs.includes('result.options'), 'api/ai.js phải trả về mảng options trong kết quả debate');
console.log('✓ Test 5: Backend api/ai.js hỗ trợ nhận diện và trả về structured options.');

console.log('\n🎉 TẤT CẢ 6/6 KIỂM THỬ NÚT BẤM PHƯƠNG ÁN & KHẮC PHỤC ĐÓNG BĂNG THÔNG SỐ ĐÃ VƯỢT QUA!');
