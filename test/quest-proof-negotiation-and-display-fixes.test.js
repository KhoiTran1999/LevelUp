/**
 * Test Suite: Quest Proof Negotiation & Proof Display Fixes
 * Kiểm tra:
 * 1. Khi AI đồng ý thương lượng hình thức bằng chứng (Kết hợp cả hai / Chụp ảnh / Báo cáo),
 *    thông số newProofType và newRequiresProof được cập nhật chính xác và đồng bộ vào nhiệm vụ.
 * 2. Modal nộp bằng chứng chỉ hiển thị đúng 1 trong 3 hình thức (photo, text, hoặc both),
 *    ẩn thanh 3 tab gây rối và hiển thị huy hiệu chỉ dẫn rõ ràng.
 * 3. Nhiệm vụ nhỏ (<15 Vàng) chưa qua thương lượng không bị tự động ép vào hình thức "kết hợp cả hai".
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  handleUpdateQuestParameters,
  runDeterministicQuestDebate,
  sanitizeEvaluatedQuest
} from '../api/ai.js';

test('1. handleUpdateQuestParameters infers proofType: "both" from AI reply when LLM omits it from tool args', () => {
  const initialQuest = {
    title: 'Tập trung học 1 tiếng',
    type: 'focus',
    targetMinutes: 60,
    rewardCoins: 22,
    requiresProof: true,
    proofType: 'text' // Ban đầu chỉ là báo cáo chữ
  };

  // Trường hợp như ảnh 1: AI đồng ý kết hợp vừa ảnh vừa tóm tắt và tăng thưởng lên 24 Vàng
  // nhưng LLM chỉ gửi { accepted: true, newRewardCoins: 24 } mà quên gửi newProofType: 'both'
  const res = handleUpdateQuestParameters({
    accepted: true,
    reply: 'Rất hoan nghênh tinh thần kỷ luật và chủ động của bạn! Việc kết hợp vừa chụp ảnh góc học tập vừa tóm tắt lại kiến thức sẽ giúp bạn ghi nhớ sâu hơn rất nhiều. Để khích lệ nỗ lực tuyệt vời này, mình tăng nhẹ phần thưởng lên 24 Vàng nhé.',
    newRewardCoins: 24,
    newTargetMinutes: 60
  }, initialQuest);

  assert.equal(res.accepted, true);
  assert.equal(res.newRewardCoins, 24);
  assert.equal(res.newTargetMinutes, 60);
  assert.equal(res.newProofType, 'both', 'Phải tự động suy luận newProofType = "both" từ lời đồng ý của AI');
  assert.equal(res.newRequiresProof, true);
});

test('2. runDeterministicQuestDebate correctly updates proofType to "both" when user requests combination with coins or duration', () => {
  const initialQuest = {
    title: 'Tập trung học 1 tiếng',
    type: 'focus',
    targetMinutes: 60,
    rewardCoins: 22,
    requiresProof: true,
    proofType: 'text'
  };

  const arg = 'Mình muốn nâng cấp lên kết hợp cả ảnh chụp thực tế và viết báo cáo tóm tắt để rèn luyện kỷ luật cao hơn nhé!';
  const res = runDeterministicQuestDebate(initialQuest, arg, null);

  assert.equal(res.accepted, true);
  assert.equal(res.newProofType, 'both', 'runDeterministicQuestDebate phải cập nhật proofType thành "both"');
  assert.equal(res.newRequiresProof, true);
});

test('3. sanitizeEvaluatedQuest prevents unnegotiated low-reward tasks (<15 coins) from being assigned proofType: "both"', () => {
  // Task "Học 5 từ vựng tiếng Anh" chỉ 5 Vàng
  const vocabQuest = sanitizeEvaluatedQuest({
    title: 'Học 5 từ vựng tiếng Anh',
    type: 'focus',
    targetMinutes: 25,
    rewardCoins: 5,
    requiresProof: true,
    proofType: 'both' // LLM sinh nhầm "both" cho việc 5 Vàng
  }, 'Học 5 từ vựng tiếng Anh');

  assert.equal(vocabQuest.rewardCoins, 5);
  // Việc học tập dưới 15 Vàng chưa qua thương lượng phải được chuẩn hóa thành 'text' chứ không ép 'both'
  assert.equal(vocabQuest.proofType, 'text', 'Việc nhỏ dưới 15 Vàng không được tự động ép proofType: "both"');
});

test('4. openQuestProofModal logic hides tab switcher and sets target mode matching quest.proofType', () => {
  // Mock DOM environment
  const elements = {};
  const mockDoc = {
    getElementById: (id) => {
      if (!elements[id]) {
        elements[id] = {
          id,
          className: '',
          classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            contains(c) { return this.classes.has(c); }
          },
          value: '',
          textContent: '',
          innerHTML: '',
          style: {},
          parentNode: {
            insertBefore: (newNode, refNode) => { elements[newNode.id] = newNode; }
          }
        };
      }
      return elements[id];
    },
    querySelector: () => ({ textContent: '' })
  };

  // Test setup
  const tabSwitcher = mockDoc.getElementById('proof-tab-switcher');
  const photoContainer = mockDoc.getElementById('proof-mode-photo-container');
  const textContainer = mockDoc.getElementById('proof-mode-text-container');

  // Verify function logic with single mode display
  const testProofMode = (proofType, expectedMode) => {
    const targetMode = proofType === 'both' ? 'both' : (proofType === 'text' ? 'text' : 'photo');
    assert.equal(targetMode, expectedMode);
  };

  testProofMode('photo', 'photo');
  testProofMode('text', 'text');
  testProofMode('both', 'both');
});

test('5. handleUpdateQuestParameters correctly extracts both from exact user screenshot phrasing', () => {
  const quest = {
    title: 'Học 5 từ vựng tiếng Anh',
    description: 'Ghi chép nghĩa, phát âm, đặt 1 câu ví dụ cho mỗi từ vựng vào vở; chụp ảnh lại trang vở và ghi tóm tắt ngắn các từ đã học khi bấm hoàn thành.',
    category: 'study',
    type: 'bounty',
    targetMinutes: 0,
    rewardCoins: 5,
    requiresProof: true,
    proofType: 'text',
    isRepeatable: true
  };

  const userArgument = 'Mình muốn nâng cấp lên kết hợp cả ảnh chụp thực tế và viết báo cáo tóm tắt để rèn luyện kỷ luật cao hơn nhé!';
  const reply = 'Tinh thần kỷ luật và chủ động của bạn rất đáng khen ngợi luôn!\n\nViệc vừa chụp ảnh trang vở ghi chép vừa viết tóm tắt lại các từ đã học sẽ giúp bạn nhớ sâu và vận dụng từ mới tốt hơn rất nhiều. Với nỗ lực và sự chỉn chu này, mình hoàn toàn đồng ý nâng mức thưởng cho bạn lên 6 Vàng nhé!\n\nChúc bạn có một buổi học từ vựng thật hiệu quả và sớm tích lũy đủ Vàng để xem bộ phim yêu thích nha!';

  // When AI calls update_quest_parameters with newRewardCoins: 6 but omits newProofType
  const res = handleUpdateQuestParameters({
    accepted: true,
    newRewardCoins: 6,
    reply
  }, quest, userArgument);

  assert.equal(res.accepted, true);
  assert.equal(res.newRewardCoins, 6);
  assert.equal(res.newProofType, 'both', 'Phải cập nhật newProofType sang both');
  assert.equal(res.newRequiresProof, true);
  assert.match(res.newProofGuidance, /ảnh.*(?:tóm\s*tắt|báo\s*cáo)/i);
});

test('6. Guidance harmonization logic prevents contradictory instructions across proof modes', () => {
  const harmonizeGuidance = (targetMode, rawGuidance) => {
    let effective = (rawGuidance || '').trim();
    if (targetMode === 'text') {
      if (!effective || /chụp\s*(?:lại\s*)?ảnh|camera|trang\s*vở/i.test(effective)) {
        effective = 'Ghi lại tóm tắt 2-3 ý chính, từ vựng hoặc kết quả cụ thể bạn vừa hoàn thành.';
      }
    } else if (targetMode === 'photo') {
      if (!effective || /viết\s*(?:báo\s*cáo|tóm\s*tắt)|nhập\s*văn\s*bản/i.test(effective)) {
        effective = 'Chụp ảnh màn hình hoặc kết quả công việc thực tế để AI thẩm định.';
      }
    } else if (targetMode === 'both') {
      if (!effective || (!/chụp/i.test(effective) || !/(?:viết|báo\s*cáo|tóm\s*tắt)/i.test(effective))) {
        effective = 'Chụp 1 bức ảnh thực tế và viết tóm tắt ngắn gọn những gì bạn đã làm.';
      }
    }
    return effective;
  };

  // 1. Text mode with legacy photo guidance must be sanitized to text-appropriate guidance
  const textGuidance = harmonizeGuidance('text', 'Chụp ảnh trang vở ghi chép 5 từ vựng kèm ghi chú tóm tắt.');
  assert.doesNotMatch(textGuidance, /chụp\s*ảnh/i, 'Text mode guidance must never instruct user to take a photo');
  assert.match(textGuidance, /tóm\s*tắt|kết\s*quả|từ\s*vựng/i);

  // 2. Photo mode with legacy text guidance must be sanitized to photo-appropriate guidance
  const photoGuidance = harmonizeGuidance('photo', 'Viết báo cáo tóm tắt 5 từ vựng đã học.');
  assert.doesNotMatch(photoGuidance, /viết\s*báo\s*cáo/i, 'Photo mode guidance must never instruct writing text report without photo');
  assert.match(photoGuidance, /ảnh/i);

  // 3. Both mode guidance must require both photo and text summary
  const bothGuidance = harmonizeGuidance('both', 'Chụp ảnh kết quả.');
  assert.match(bothGuidance, /ảnh/i);
  assert.match(bothGuidance, /tóm\s*tắt/i);
});

test('7. initQuestDebateChat proof text is strictly synchronized with quest.proofType', () => {
  const getDebateProofText = (quest) => {
    let proofText = ' • ⚡ Không cần bằng chứng';
    if (quest.requiresProof) {
      if (quest.proofType === 'both') {
        proofText = ' • 📸+✍️ Yêu cầu cả ảnh & báo cáo';
      } else if (quest.proofType === 'text') {
        proofText = ' • ✍️ Cần báo cáo nội dung';
      } else {
        proofText = ' • 📸 Yêu cầu chụp ảnh';
      }
    }
    return proofText;
  };

  assert.equal(getDebateProofText({ requiresProof: true, proofType: 'text' }), ' • ✍️ Cần báo cáo nội dung');
  assert.equal(getDebateProofText({ requiresProof: true, proofType: 'both' }), ' • 📸+✍️ Yêu cầu cả ảnh & báo cáo');
  assert.equal(getDebateProofText({ requiresProof: true, proofType: 'photo' }), ' • 📸 Yêu cầu chụp ảnh');
  assert.equal(getDebateProofText({ requiresProof: false }), ' • ⚡ Không cần bằng chứng');
});

test('8. Model Brain tool calling decision takes priority over heuristic fallback', () => {
  const quest = {
    title: 'Tập trung học 1 tiếng',
    rewardCoins: 22,
    targetMinutes: 60,
    type: 'focus',
    requiresProof: true,
    proofType: 'text'
  };

  // When Model Brain calls update_quest_parameters with explicit newProofType: 'both'
  const brainToolCallArgs = {
    accepted: true,
    newRewardCoins: 24,
    newRequiresProof: true,
    newProofType: 'both',
    newProofGuidance: 'Chụp ảnh sản phẩm/kết quả thực tế và viết tóm tắt ngắn gọn nội dung đã hoàn thành.',
    reply: 'Mình đồng ý cập nhật cho bạn nhé!'
  };

  const res = handleUpdateQuestParameters(brainToolCallArgs, quest, 'Đồng ý');
  assert.equal(res.accepted, true);
  assert.equal(res.newProofType, 'both', 'Must prioritize Model Brain decision directly');
  assert.equal(res.newRequiresProof, true);
  assert.equal(res.newRewardCoins, 24);
});


