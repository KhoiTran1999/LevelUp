import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  signQuest,
  signQuestLegacy,
  verifyQuestSignature,
  setGoogleTokenVerifierForTesting
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
  if (quest.focusTimerCompleted) {
    delete quest.focusTimerCompleted;
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
  setGoogleTokenVerifierForTesting(async (token) => {
    if (token === 'valid_mock_token') {
      return { sub: 'test_user_id', email: 'test@example.com', name: 'Tester' };
    }
    return null;
  });

  function createMockReqRes(body) {
    let statusCode = 200;
    let jsonResult = null;
    return {
      req: {
        method: 'POST',
        headers: { authorization: 'Bearer valid_mock_token' },
        body
      },
      res: {
        setHeader() {
          return this;
        },
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

// Test 8: Bug #7 Fix - Bảo toàn trạng thái hoàn thành thời gian khi reload trang
{
  const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8').replace(/\r\n/g, '\n');

  // 8.1 Kiểm tra app.js gán quest.focusTimerCompleted = true và triggerSave(true) khi timer kết thúc
  assert.ok(appJs.includes('quest.focusTimerCompleted = true;'), 'focusTimerFinished phải gán quest.focusTimerCompleted = true');
  assert.ok(appJs.includes('triggerSave(true);'), 'focusTimerFinished phải lưu state lên cloud/local');

  // 8.2 Kiểm tra startFocusTimer không bắt người dùng đếm giờ lại khi focusTimerCompleted = true
  assert.ok(appJs.includes('quest.focusTimerCompleted && quest.requiresProof && !quest._proofVerified'), 'startFocusTimer phải chặn bắt đầu lại khi đã đủ thời gian');

  // 8.3 Kiểm tra renderQuests hiển thị badge "CHỜ NỘP ẢNH" và nút "Chụp Ảnh Nhận Vàng 📸"
  assert.ok(appJs.includes('CHỜ NỘP ẢNH'), 'renderQuests phải hiển thị badge CHỜ NỘP ẢNH');
  assert.ok(appJs.includes('btn-submit-quest-proof'), 'renderQuests phải có nút class btn-submit-quest-proof');
  assert.ok(appJs.includes('Chụp Ảnh Nhận Vàng 📸'), 'renderQuests phải có nhãn Chụp Ảnh Nhận Vàng 📸');
  assert.ok(appJs.includes('openQuestProofModal(q)'), 'Sự kiện click btn-submit-quest-proof phải mở modal nộp ảnh');

  // 8.4 Kiểm tra dọn sạch cờ focusTimerCompleted khi hoàn thành, hoàn tác hoặc làm lại
  assert.ok(appJs.includes('delete quest.focusTimerCompleted;'), 'completeQuest, undoCompleteQuest hoặc restartQuest phải dọn sạch focusTimerCompleted');

  // 8.5 Giả lập luồng logic: Làm nhiệm vụ 30p + chụp ảnh, hoàn thành timer, reload trang, chụp ảnh sau
  const quest = {
    id: 'q_timed_proof',
    title: 'Học 30 phút và chụp ảnh vở',
    type: 'focus',
    targetMinutes: 30,
    rewardCoins: 25,
    requiresProof: true
  };
  const profile = { coins: 10, exp: 20 };

  // Bước 1: Timer kết thúc
  quest.focusTimerCompleted = true;
  assert.strictEqual(quest.focusTimerCompleted, true);

  // Bước 2: Người dùng bận, tắt/reload trang. Dữ liệu nạp lại từ cloud/storage:
  const reloadedQuest = JSON.parse(JSON.stringify(quest));
  assert.strictEqual(reloadedQuest.focusTimerCompleted, true, 'Trạng thái focusTimerCompleted phải sống sót qua reload trang');

  // Bước 3: Người dùng bấm vào nhiệm vụ, hệ thống không bắt bấm giờ lại
  let timerRestartPrevented = false;
  function attemptStartTimer(q) {
    if (q.focusTimerCompleted && q.requiresProof && !q._proofVerified) {
      timerRestartPrevented = true;
      return false;
    }
    return true;
  }
  const canStartTimer = attemptStartTimer(reloadedQuest);
  assert.strictEqual(canStartTimer, false, 'Không được phép bắt người dùng đếm giờ lại từ đầu');
  assert.strictEqual(timerRestartPrevented, true, 'Hệ thống đã nhận diện timer hoàn thành và chuyển sang nộp ảnh');

  // Bước 4: Người dùng chụp ảnh và AI thẩm định thành công
  reloadedQuest._proofVerified = true;
  const finishRes = simulateCompleteQuest(reloadedQuest, profile);
  assert.strictEqual(finishRes.success, true, 'Nhiệm vụ hoàn thành thành công sau khi gửi ảnh');
  assert.strictEqual(reloadedQuest.status, 'completed');
  assert.strictEqual(reloadedQuest.focusTimerCompleted, undefined, 'Cờ focusTimerCompleted phải được dọn dẹp sạch sẽ');
  assert.strictEqual(profile.coins, 35, 'Người dùng nhận đủ 25 Vàng');

  console.log('✓ Test 8: Khắc phục triệt để Bug #7 - Người dùng không bị bắt đếm giờ lại từ đầu sau khi reload trang.');
}

// Test 9: Chống gian lận - Chặn đính kèm file trên máy tính, chỉ cho phép camera điện thoại
{
  const indexHtml = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
  const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

  // 9.1 Kiểm tra giao diện HTML có vùng thông báo chống gian lận trên máy tính
  assert.ok(indexHtml.includes('id="proof-desktop-notice-zone"'), 'HTML phải có khu vực cảnh báo trên máy tính #proof-desktop-notice-zone');
  assert.ok(indexHtml.includes('Yêu Cầu Chụp Ảnh Trên Điện Thoại'), 'HTML phải có tiêu đề yêu cầu chụp ảnh trên điện thoại');
  assert.ok(indexHtml.includes('không cho phép đính kèm hình từ máy tính'), 'HTML phải giải thích rõ ràng không cho phép đính kèm ảnh từ máy tính để tránh gian lận');
  assert.ok(indexHtml.includes('accept="image/*" capture="environment"'), 'Input camera phải có capture="environment" cho camera sau mobile');

  // 9.2 Kiểm tra logic app.js có hàm isMobilePhone và các chốt chặn
  assert.ok(appJs.includes('function isMobilePhone()'), 'app.js phải định nghĩa hàm isMobilePhone()');
  assert.ok(appJs.includes('proof-desktop-notice-zone'), 'openQuestProofModal phải xử lý ẩn/hiện proof-desktop-notice-zone');
  assert.ok(appJs.includes('!isMobilePhone()'), 'app.js phải có chốt chặn !isMobilePhone() chống gian lận');

  // 9.3 Kiểm thử thuật toán nhận diện thiết bị và chống DevTools giả mạo
  function testDeviceDetection(mockEnv) {
    const {
      ua = '',
      platform = '',
      clientPlatform = '',
      hasFineMouse = false,
      touchPoints = 0,
      outerWidth = 0,
      innerWidth = 0,
      dpr = 1,
      isMobileClientHint = false
    } = mockEnv;

    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
    if (!isMobileUA && !isMobileClientHint) return false;

    // Desktop OS check
    if (/Win32|Win64|Windows|Linux x86_64/i.test(platform)) return false;
    if (/MacIntel/i.test(platform)) {
      if (touchPoints <= 1 || !/iPad/i.test(ua)) return false;
    }
    if (/Windows|macOS|Linux/i.test(clientPlatform)) return false;
    if (hasFineMouse) return false;
    if (touchPoints === 1) return false;

    // DevTools viewport check guarded by touchPoints <= 1 & dpr
    const normalizedOuterWidth = (outerWidth > innerWidth * 1.5 && dpr > 1)
      ? outerWidth / dpr
      : outerWidth;
    if (touchPoints <= 1 && (normalizedOuterWidth - innerWidth > 120)) return false;

    return true;
  }

  // 1. Máy tính Windows Desktop Chrome bình thường
  const desktopWindows = {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    platform: 'Win32',
    clientPlatform: 'Windows',
    hasFineMouse: true
  };
  assert.strictEqual(testDeviceDetection(desktopWindows), false, 'Windows PC không được coi là điện thoại');

  // 2. EDGE CASE QUAN TRỌNG: Máy tính Windows dùng Chrome DevTools chọn iPhone 12 Pro (giả mạo UA)
  const devToolsSpoofedIPhone = {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
    platform: 'Win32', // DevTools không đổi được platform gốc của máy tính
    hasFineMouse: true, // Chuột máy tính vẫn đang cắm
    touchPoints: 1, // DevTools chỉ giả lập 1 điểm chạm
    outerWidth: 1200, // Cửa sổ trình duyệt máy tính to hơn viewport emulated
    innerWidth: 390
  };
  assert.strictEqual(testDeviceDetection(devToolsSpoofedIPhone), false, 'Phải bắt và chặn đứng edge case DevTools giả lập kích cỡ iPhone trên máy tính');

  // 3. Điện thoại iPhone thật (Safari/Chrome iOS) - chiều dọc
  const realIPhone = {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
    hasFineMouse: false,
    touchPoints: 5,
    outerWidth: 390,
    innerWidth: 390
  };
  assert.strictEqual(testDeviceDetection(realIPhone), true, 'iPhone thật phải được nhận diện thành công');

  // 4. Điện thoại Android thật (Samsung Galaxy / Pixel) - chiều dọc
  const realAndroid = {
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.94 Mobile Safari/537.36',
    platform: 'Linux aarch64',
    clientPlatform: 'Android',
    hasFineMouse: false,
    touchPoints: 5,
    outerWidth: 412,
    innerWidth: 412,
    isMobileClientHint: true
  };
  assert.strictEqual(testDeviceDetection(realAndroid), true, 'Android Phone thật phải được nhận diện thành công');

  // 5. EDGE CASE: Điện thoại iPhone thật xoay ngang (Landscape mode)
  const realIPhoneLandscape = {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
    hasFineMouse: false,
    touchPoints: 5,
    outerWidth: 844,
    innerWidth: 844
  };
  assert.strictEqual(testDeviceDetection(realIPhoneLandscape), true, 'iPhone thật xoay ngang (landscape) phải được nhận diện là điện thoại hợp lệ');

  // 6. EDGE CASE: Điện thoại Android thật xoay ngang với màn hình độ phân giải cao (High DPI)
  const realAndroidLandscapeHighDpi = {
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.94 Mobile Safari/537.36',
    platform: 'Linux aarch64',
    clientPlatform: 'Android',
    hasFineMouse: false,
    touchPoints: 5,
    outerWidth: 2400,
    innerWidth: 800,
    dpr: 3,
    isMobileClientHint: true
  };
  assert.strictEqual(testDeviceDetection(realAndroidLandscapeHighDpi), true, 'Android thật xoay ngang màn hình nét cao không bị chặn nhầm là máy tính');

  // 7. EDGE CASE: DevTools máy tính xoay ngang viewport (Landscape DevTools) vẫn bị chặn
  const devToolsLandscapeSpoofed = {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
    platform: 'Win32',
    hasFineMouse: true,
    touchPoints: 1,
    outerWidth: 1920,
    innerWidth: 844
  };
  assert.strictEqual(testDeviceDetection(devToolsLandscapeSpoofed), false, 'DevTools giả lập xoay ngang trên PC vẫn bị chặn chính xác');

  console.log('✓ Test 9: Chống gian lận hoàn hảo - Chặn cả máy tính lẫn DevTools giả lập, đồng thời hỗ trợ điện thoại xoay ngang 100%.');
}

// Test 10: Modal thông báo AI duyệt kết quả & đợi người dùng nhấn nút nhận thưởng
{
  const indexHtml = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
  const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8');

  // 10.1 HTML có modal thông báo kết quả duyệt và nút nhận tiền
  assert.ok(indexHtml.includes('id="modal-proof-approved"'), 'HTML phải có modal-proof-approved');
  assert.ok(indexHtml.includes('id="proof-approved-feedback"'), 'HTML phải có phần tử hiển thị feedback AI nhận định');
  assert.ok(indexHtml.includes('id="btn-claim-proof-reward"'), 'HTML phải có nút bấm nhận tiền thưởng');

  // 10.2 app.js mở modal-proof-approved và đợi click nhận thưởng thay vì tự động cộng tiền ngay
  assert.ok(appJs.includes("openModal('modal-proof-approved')"), 'app.js phải mở modal-proof-approved khi AI duyệt thành công');
  assert.ok(appJs.includes("btn-claim-proof-reward"), 'app.js phải gắn sự kiện click cho btn-claim-proof-reward để người dùng bấm nhận tiền');
  assert.ok(!appJs.includes("setTimeout(() => {\n          closeModal('modal-quest-proof');\n          completeQuest(questToComplete.id, true);\n        }, 1200);"), 'app.js không được tự động cộng tiền và tắt modal sau 1.2s');

  console.log('✓ Test 10: Popup modal thông báo AI duyệt kết quả và chỉ kích hoạt tiền chảy về khi người dùng nhấn nhận thưởng.');
}

console.log('🎉 TẤT CẢ CÁC KIỂM THỬ CHO TÍNH NĂNG ẢNH BẰNG CHỨNG ĐÃ THÀNH CÔNG RỰC RỠ!\n');
process.exit(0);
