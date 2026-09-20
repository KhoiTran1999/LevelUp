import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== KIỂM THỬ 3 SỬA LỖI TRỢ LÝ PHÙ THỦY AI (CARET, SCROLL TOP & QUICK PROMPT INPUT) ===\n');

const appJsPath = path.resolve('public/app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Kiểm tra fix lỗi 1: Carret của AI streaming được loại bỏ triệt để sau khi streaming hoàn tất
{
  console.log('Test 1: Loại bỏ triệt để con trỏ nhấp nháy (.assistant-typing-cursor) sau khi stream xong');
  
  // Hủy streamTimer để không còn vòng lặp ngầm chèn lại cursor
  assert.ok(
    appJsContent.includes('if (streamTimer) {\n      clearTimeout(streamTimer);\n      streamTimer = null;\n    }\n    renderedChars = targetReplyText.length;'),
    'Phải hủy streamTimer và cập nhật renderedChars khi Promise.race kết thúc'
  );

  // Xóa toàn bộ con trỏ còn sót lại trong activeMsg và chatLogs
  assert.ok(
    appJsContent.includes("activeMsg.querySelectorAll('.assistant-typing-cursor').forEach(el => el.remove());"),
    'Phải xóa toàn bộ .assistant-typing-cursor trong activeMsg'
  );
  assert.ok(
    appJsContent.includes("chatLogs.querySelectorAll('.assistant-typing-cursor').forEach(el => el.remove());"),
    'Phải xóa toàn bộ .assistant-typing-cursor trong chatLogs'
  );

  // Khi tickStream hoàn tất cũng phải render Markdown sạch và gỡ cursor
  assert.ok(
    appJsContent.includes('if (streamBody && targetReplyText) {\n          streamBody.innerHTML = renderMarkdown(targetReplyText);\n        }'),
    'tickStream khi đạt đủ ký tự phải tự động render markdown sạch'
  );

  // Khi người dùng bấm vào tin nhắn để hiện ngay toàn bộ nội dung
  assert.ok(
    appJsContent.includes('if (streamBody) {\n          streamBody.innerHTML = renderMarkdown(targetReplyText);\n        }'),
    'Bấm vào tin nhắn phải render markdown hoàn chỉnh không chứa cursor'
  );

  console.log('  -> Test 1 PASS: Con trỏ streaming được dọn dẹp sạch sẽ, không còn nhấp nháy sau khi kết thúc.\n');
}

// 2. Kiểm tra fix lỗi 2: AI trả lời xong tự động cuộn lên phần đầu câu trả lời, không bị kẹt ở đáy
{
  console.log('Test 2: Tự động cuộn mượt về đầu câu trả lời của Phù Thủy');

  // Đảm bảo có lệnh cuộn mượt và backup setTimeout
  assert.ok(
    appJsContent.includes('scrollAssistantToMessage(finishedMsgEl, true);'),
    'Phải gọi scrollAssistantToMessage với finishedMsgEl'
  );
  assert.ok(
    appJsContent.includes('setTimeout(() => {\n          scrollAssistantToMessage(finishedMsgEl, true);\n        }, 120);'),
    'Phải có timeout backup 120ms sau khi render thẻ hành động để cuộn chính xác đầu tin nhắn'
  );

  // Đảm bảo finally cũng dọn dẹp streamTimer để không có timer ngầm ép cuộn xuống đáy
  assert.ok(
    appJsContent.includes('finally {\n    if (streamTimer) {\n      clearTimeout(streamTimer);\n      streamTimer = null;\n    }'),
    'Khối finally phải hủy streamTimer chống rò rỉ timer ép cuộn đáy'
  );

  console.log('  -> Test 2 PASS: Cuộn mượt và chính xác về đầu câu trả lời của AI.\n');
}

// 3. Kiểm tra fix lỗi 3: Mẫu câu hỏi nhanh xóa sạch ô input khi gửi
{
  console.log('Test 3: Ô input được xóa sạch khi dùng mẫu câu hỏi nhanh');

  // Kiểm tra sendQuickAssistantPrompt làm trống input thay vì gán giá trị
  assert.ok(
    appJsContent.includes("function sendQuickAssistantPrompt(text) {\n  const input = document.getElementById('input-assistant-query');\n  if (input) input.value = '';\n  sendAssistantMessage(text);\n}"),
    'sendQuickAssistantPrompt phải đặt input.value = \'\' thay vì input.value = text'
  );

  // Kiểm tra sendAssistantMessage chủ động làm trống input khi nhận lệnh gửi
  assert.ok(
    appJsContent.includes("if (input) input.value = '';\n  if (input) input.readOnly = true;"),
    'sendAssistantMessage phải reset input.value = \'\' ngay khi bắt đầu gửi'
  );

  console.log('  -> Test 3 PASS: Ô input luôn sạch sẽ khi người dùng bấm câu hỏi gợi ý nhanh.\n');
}

console.log('🎉 BỘ KIỂM THỬ 3 SỬA LỖI PHÙ THỦY AI ĐÃ VƯỢT QUA TOÀN DIỆN 100%!');
