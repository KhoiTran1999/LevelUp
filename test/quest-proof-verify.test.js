import assert from 'node:assert';
import {
  signQuest,
  signQuestLegacy,
  verifyQuestSignature
} from '../api/sync.js';
import aiHandler, { sanitizeEvaluatedQuest, parseBool } from '../api/ai.js';

// Domain flow simulation matching public/app.js completeQuest logic
function simulateCompleteQuest(quest, profile) {
  if (quest.requiresProof && !quest._proofVerified) {
    return { success: false, reason: 'requires_proof' };
  }

  if (quest._proofVerified) {
    delete quest._proofVerified;
  }

  quest.completedCount = (quest.completedCount || 0) + 1;
  quest.status = 'completed';
  profile.coins += quest.rewardCoins;
  profile.exp += quest.rewardCoins * 3;

  return { success: true };
}

console.log('--- Bắt đầu kiểm thử: AI Quyết Định Ảnh Bằng Chứng & Thẩm Định ---');

// Test 1: Chữ ký HMAC SHA-256 bao gồm requiresProof
{
  const sigWithProof = signQuest('Dọn phòng', 'focus', 25, 20, true);
  const sigWithoutProof = signQuest('Dọn phòng', 'focus', 25, 20, false);

  assert.notStrictEqual(
    sigWithProof,
    sigWithoutProof,
    'Chữ ký khi có requiresProof: true và requiresProof: false phải khác nhau để chống bypass'
  );

  const questWithProof = {
    id: 'q_test_1',
    title: 'Dọn phòng',
    type: 'focus',
    targetMinutes: 25,
    rewardCoins: 20,
    requiresProof: true,
    signature: sigWithProof
  };
  assert.strictEqual(verifyQuestSignature(questWithProof), true, 'Nhiệm vụ có proof hợp lệ phải verify thành công');

  const questWithoutProof = {
    id: 'q_test_2',
    title: 'Dọn phòng',
    type: 'focus',
    targetMinutes: 25,
    rewardCoins: 20,
    requiresProof: false,
    signature: sigWithoutProof
  };
  assert.strictEqual(verifyQuestSignature(questWithoutProof), true, 'Nhiệm vụ không proof hợp lệ phải verify thành công');

  console.log('✓ Test 1: Chữ ký HMAC SHA-256 tích hợp requiresProof chính xác.');
}

// Test 2: Chống gian lận (Anti-Cheat) khi cố tình gỡ bỏ requiresProof ở client
{
  const legitimateSig = signQuest('Bài tập lớn', 'focus', 60, 30, true);
  const tamperedQuest = {
    id: 'q_tamper',
    title: 'Bài tập lớn',
    type: 'focus',
    targetMinutes: 60,
    rewardCoins: 30,
    requiresProof: false, // Kẻ gian tự đổi requiresProof từ true thành false để né chụp ảnh
    signature: legitimateSig
  };

  assert.strictEqual(
    verifyQuestSignature(tamperedQuest),
    false,
    'Hệ thống phải phát hiện gian lận và từ chối khi requiresProof bị sửa đổi'
  );
  console.log('✓ Test 2: Phát hiện và chặn đứng hành vi tự ý sửa requiresProof.');
}

// Test 3: Tính tương thích ngược (Backward Compatibility) với nhiệm vụ cũ đã lưu
{
  const legacySig = signQuestLegacy('Uống 2 lít nước', 'bounty', 0, 5);
  const legacyQuest = {
    id: 'q_legacy',
    title: 'Uống 2 lít nước',
    type: 'bounty',
    targetMinutes: 0,
    rewardCoins: 5,
    requiresProof: false,
    signature: legacySig
  };

  assert.strictEqual(
    verifyQuestSignature(legacyQuest),
    true,
    'Nhiệm vụ cũ ký bằng signQuestLegacy vẫn phải verify hợp lệ'
  );
  console.log('✓ Test 3: Tương thích ngược hoàn hảo với các nhiệm vụ cũ đã có trong hệ thống.');
}

// Test 4: Ràng buộc hoàn thành: Nhiệm vụ có requiresProof bị chặn cho tới khi AI duyệt ảnh
{
  const profile = { coins: 50, exp: 100 };
  const quest = {
    id: 'q_high_value',
    title: 'Luyện tập thể hình 45p',
    rewardCoins: 25,
    requiresProof: true
  };

  // Thử hoàn thành khi chưa có bằng chứng
  const res1 = simulateCompleteQuest(quest, profile);
  assert.strictEqual(res1.success, false, 'Không được cho phép hoàn thành khi chưa có bằng chứng');
  assert.strictEqual(res1.reason, 'requires_proof');
  assert.strictEqual(profile.coins, 50, 'Số Vàng không được thay đổi');
  assert.strictEqual(profile.exp, 100, 'Kinh nghiệm không được thay đổi');

  // Sau khi AI Vision thẩm định thành công
  quest._proofVerified = true;
  const res2 = simulateCompleteQuest(quest, profile);
  assert.strictEqual(res2.success, true, 'Hoàn thành thành công sau khi đã có xác nhận');
  assert.strictEqual(profile.coins, 75, 'Được cộng đủ 25 Vàng');
  assert.strictEqual(profile.exp, 175, 'Được cộng đủ 75 EXP');
  assert.strictEqual(quest._proofVerified, undefined, 'Cờ _proofVerified phải được dọn sạch để lần sau bắt buộc chụp ảnh tiếp');

  console.log('✓ Test 4: Logic hoàn thành nhiệm vụ ràng buộc ảnh bằng chứng chặt chẽ.');
}

// Test 5: API /api/ai action verify_proof kiểm tra payload đầu vào
{
  function createMockReqRes(body) {
    let statusCode = 200;
    let jsonResult = null;
    return {
      req: {
        method: 'POST',
        headers: { 'x-levelup-user': 'test-user-id' },
        body
      },
      res: {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonResult = data;
          return this;
        }
      },
      getStatus: () => statusCode,
      getJSON: () => jsonResult
    };
  }

  // 5.1 Thiếu tiêu đề nhiệm vụ
  const ctx1 = createMockReqRes({
    action: 'verify_proof',
    payload: { imageBase64: 'data:image/jpeg;base64,abc' }
  });
  await aiHandler(ctx1.req, ctx1.res);
  assert.strictEqual(ctx1.getStatus(), 400);
  assert.ok(ctx1.getJSON()?.error?.includes('title'));

  // 5.2 Thiếu ảnh chụp bằng chứng
  const ctx2 = createMockReqRes({
    action: 'verify_proof',
    payload: { title: 'Dọn dẹp bàn học', imageBase64: '' }
  });
  await aiHandler(ctx2.req, ctx2.res);
  assert.strictEqual(ctx2.getStatus(), 400);
  assert.ok(ctx2.getJSON()?.error?.includes('ảnh chụp bằng chứng'));

  console.log('✓ Test 5: Endpoint verify_proof validate payload chặt chẽ.');
}

// Test 6: Sanitizer tránh bẫy regex trên từ "trọng tâm" trong mô tả bài học và chia nhỏ chuẩn
{
  const macroStudyTask = {
    title: 'Đọc kỹ & tóm tắt Chương 1 môn Kinh tế Vĩ mô',
    description: 'Nghiên cứu các khái niệm nền tảng trong Chương 1, ghi chú các công thức, thuật ngữ trọng tâm và tóm tắt lại nội dung cốt lõi.',
    type: 'focus',
    targetMinutes: 50,
    rewardCoins: 20,
    rank: 'B',
    requiresProof: false, // Giả lập trường hợp LLM lỡ tay trả về false
    proofGuidance: ''
  };

  const sanitized = sanitizeEvaluatedQuest(
    macroStudyTask,
    'Đọc hết toàn bộ 10 chương môn kinh tế vĩ mô để chuẩn bị cho kì thi sắp tới',
    'Nghiên cứu các khái niệm nền tảng trong Chương 1, ghi chú các công thức, thuật ngữ trọng tâm và tóm tắt lại nội dung cốt lõi.'
  );

  assert.strictEqual(sanitized.type, 'focus', 'Nhiệm vụ học tập phải giữ loại focus, không bị biến thành bounty');
  assert.strictEqual(sanitized.targetMinutes, 50, 'Thời gian phải là 50 phút tập trung');
  assert.strictEqual(sanitized.rewardCoins, 20, 'Thưởng phải là 20 Vàng');
  assert.strictEqual(sanitized.requiresProof, true, 'Nhiệm vụ học tập lớn phải yêu cầu ảnh bằng chứng');
  assert.ok(sanitized.proofGuidance.length > 0, 'Phải có câu hướng dẫn chụp ảnh');
  assert.ok(!sanitized.verdict.includes('Thói quen sinh hoạt cơ bản'), 'Không được nhầm từ "trọng tâm" thành thói quen sinh hoạt tắm rửa');
  assert.ok(sanitized.title.includes('Chương 1'), 'Phải chia nhỏ về Chương 1');

  console.log('✓ Test 6: Loại bỏ hoàn toàn lỗi false-positive trên từ "trọng tâm" và giữ vững phân loại học tập.');
}

// Test 7: Thương lượng cập nhật requiresProof hoạt động chính xác cả hai chiều (bật/tắt)
{
  // 7.1 Người dùng thương lượng xin chụp ảnh (newRequiresProof: true)
  const currentVerdict = {
    title: 'Đọc kỹ & tóm tắt Chương 1 môn Kinh tế Vĩ mô',
    description: 'Nghiên cứu các khái niệm nền tảng trong Chương 1, ghi chú các công thức, thuật ngữ trọng tâm và tóm tắt lại nội dung cốt lõi.',
    type: 'focus',
    targetMinutes: 50,
    rewardCoins: 20,
    rank: 'B',
    requiresProof: false // Hiện tại chưa có ảnh
  };

  const debateResultAddProof = {
    accepted: true,
    reply: 'Tuyệt vời! Mình đã bật yêu cầu chụp ảnh bằng chứng cho bạn rồi nhé.',
    newTitle: 'Đọc kỹ & tóm tắt Chương 1 môn Kinh tế Vĩ mô',
    newDescription: 'Nghiên cứu các khái niệm nền tảng trong Chương 1, ghi chú các công thức, thuật ngữ trọng tâm và tóm tắt lại nội dung cốt lõi.',
    newType: 'focus',
    newTargetMinutes: 50,
    newRewardCoins: 20,
    newRank: 'B',
    newRequiresProof: true,
    newProofGuidance: 'Chụp ảnh vở ghi chép'
  };

  // Giả lập logic trong debate_quest
  const hasExplicit = debateResultAddProof.newRequiresProof !== undefined;
  const negotiatedProof = hasExplicit
    ? parseBool(debateResultAddProof.newRequiresProof, currentVerdict.requiresProof)
    : parseBool(currentVerdict.requiresProof, false);

  const rawDebate = {
    title: debateResultAddProof.newTitle || currentVerdict.title,
    description: debateResultAddProof.newDescription,
    type: debateResultAddProof.newType,
    targetMinutes: debateResultAddProof.newTargetMinutes,
    rewardCoins: debateResultAddProof.newRewardCoins,
    rank: debateResultAddProof.newRank,
    requiresProof: negotiatedProof,
    proofGuidance: debateResultAddProof.newProofGuidance
  };

  const clean = sanitizeEvaluatedQuest(rawDebate, currentVerdict.title, currentVerdict.description);
  const finalProof = (hasExplicit && !clean.isTrivialTask) ? negotiatedProof : clean.requiresProof;
  const sig = signQuest(clean.title, clean.type, clean.targetMinutes, clean.rewardCoins, finalProof);

  assert.strictEqual(finalProof, true, 'Thương lượng xin chụp ảnh phải giữ nguyên requiresProof = true');
  assert.strictEqual(verifyQuestSignature({
    title: clean.title,
    type: clean.type,
    targetMinutes: clean.targetMinutes,
    rewardCoins: clean.rewardCoins,
    requiresProof: finalProof,
    signature: sig
  }), true, 'Chữ ký nhiệm vụ sau thương lượng phải hợp lệ');

  // 7.2 Người dùng thương lượng xin miễn chụp ảnh (newRequiresProof: false)
  const debateResultRemoveProof = {
    accepted: true,
    newRequiresProof: false,
    newProofGuidance: ''
  };
  const negotiatedProofOff = parseBool(debateResultRemoveProof.newRequiresProof, true);
  assert.strictEqual(negotiatedProofOff, false, 'parseBool chuyển đổi chính xác false');

  console.log('✓ Test 7: Luồng thương lượng cập nhật requiresProof hai chiều hoạt động chuẩn xác.');
}

console.log('🎉 TẤT CẢ CÁC KIỂM THỬ CHO TÍNH NĂNG ẢNH BẰNG CHỨNG ĐÃ THÀNH CÔNG RỰC RỠ!\n');
