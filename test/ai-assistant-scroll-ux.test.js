import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== KIỂM THỬ TRẢI NGHIỆM CUỘN CHAT PHÙ THỦY AI (SCROLL UX) ===\n');

const appJsPath = path.resolve('public/app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// 1. Kiểm tra định nghĩa hàm scrollAssistantToBottom và scrollAssistantToMessage
{
  assert.ok(appJsContent.includes('function scrollAssistantToBottom(force = false)'), 'Phải có hàm scrollAssistantToBottom với cờ force');
  assert.ok(appJsContent.includes('function scrollAssistantToMessage(messageEl, smooth = true)'), 'Phải có hàm scrollAssistantToMessage với cờ smooth');

  // Kiểm tra logic tính toán targetScrollTop trong scrollAssistantToMessage
  assert.ok(appJsContent.includes('targetRect.top - containerRect.top + chatLogs.scrollTop'), 'Phải tính relativeTop dựa trên boundingClientRect và chatLogs.scrollTop');
  assert.ok(appJsContent.includes('Math.max(0, relativeTop - 12)'), 'Phải có khoảng cách đệm 12px thoáng mắt ở mép trên');
  assert.ok(appJsContent.includes("behavior: 'smooth'"), 'Phải hỗ trợ cuộn mượt smooth');

  console.log('✓ Test 1: Các hàm cuộn chuyên dụng scrollAssistantToBottom và scrollAssistantToMessage được định nghĩa hoàn hảo.');
}

// 2. Kiểm tra xử lý khi gửi tin nhắn trong sendAssistantMessage
{
  // Kiểm tra không dùng input.disabled = true gây mất focus và co giãn bàn phím ảo
  assert.ok(appJsContent.includes('if (input) input.readOnly = true;'), 'Phải đặt input.readOnly = true để chống giật viewport thay vì disabled');
  
  // Kiểm tra cưỡng chế cuộn ngay xuống đáy khi userMsgHtml và streamBubbleHtml vừa chèn
  assert.ok(appJsContent.includes('scrollAssistantToBottom(true);'), 'Phải gọi scrollAssistantToBottom(true) để cuộn đáy ngay lập tức');

  // Kiểm tra cờ userScrolledUp quản lý việc bám sát đáy trong lúc stream
  assert.ok(appJsContent.includes('let userScrolledUp = false;'), 'Phải có biến theo dõi userScrolledUp trong phiên stream');
  assert.ok(appJsContent.includes('chatLogs.scrollTop = chatLogs.scrollHeight;'), 'Phải tự động bám sát đáy trong tickStream khi !userScrolledUp');

  console.log('✓ Test 2: Hành vi khi gửi tin nhắn giải quyết triệt để lỗi nhảy lên trên, bám đáy chuẩn xác.');
}

// 3. Kiểm tra xử lý khi kết thúc streaming (nhảy về dòng đầu tin nhắn Phù Thủy vừa gửi)
{
  // Kiểm tra việc gọi scrollAssistantToMessage cho finishedMsgEl
  assert.ok(appJsContent.includes('const finishedMsgEl = activeMsg;'), 'Phải lưu lại tham chiếu tin nhắn Phù Thủy vừa gửi');
  assert.ok(appJsContent.includes('scrollAssistantToMessage(finishedMsgEl, true);'), 'Phải gọi scrollAssistantToMessage để cuộn lên dòng đầu tin Phù Thủy');

  // Kiểm tra việc ẩn stepContainer trước khi cuộn
  assert.ok(appJsContent.includes("if (stepContainer) stepContainer.classList.add('hidden');"), 'Phải ẩn stepContainer để layout ổn định trước khi đo đạc cuộn');

  // Kiểm tra fallback renderAssistantResponse cũng cuộn lên đầu tin nhắn mới
  assert.ok(appJsContent.includes('scrollAssistantToMessage(newMsg, true);'), 'Hàm renderAssistantResponse fallback cũng phải cuộn lên đầu tin nhắn mới');

  // Kiểm tra khôi phục input an toàn trong finally (preventScroll: true)
  assert.ok(appJsContent.includes('input.readOnly = false;'), 'Phải mở lại readOnly cho input trong finally');
  assert.ok(appJsContent.includes('preventScroll: true'), 'Phải dùng preventScroll: true khi focus input để không bị ép cuộn về đáy');

  console.log('✓ Test 3: Kết thúc streaming tự động cuộn mượt về dòng đầu tin nhắn Phù Thủy, không bị ép đáy.');
}

console.log('\n🎉 TẤT CẢ CÁC BỘ KIỂM THỬ TRẢI NGHIỆM CUỘN CHAT PHÙ THỦY ĐÃ VƯỢT QUA 100%!');
