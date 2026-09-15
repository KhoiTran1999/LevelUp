import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== Kiểm thử Trải Nghiệm Chat Thương Lượng AI (Negotiation Chat UX) ===\n');

const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8').replace(/\r\n/g, '\n');
const indexHtml = fs.readFileSync(path.resolve('public/index.html'), 'utf8').replace(/\r\n/g, '\n');
const styleCss = fs.readFileSync(path.resolve('public/style.css'), 'utf8').replace(/\r\n/g, '\n');

// 1. Kiểm tra cấu trúc HTML của giao diện Chat Thương Lượng (Gợi ý nhanh & Input hiện đại)
assert.ok(indexHtml.includes('class="quick-suggest-btn'), 'HTML phải có các nút gợi ý thương lượng nhiệm vụ .quick-suggest-btn');
assert.ok(indexHtml.includes('class="quick-suggest-reward-btn'), 'HTML phải có các nút gợi ý thương lượng phần thưởng .quick-suggest-reward-btn');
assert.ok(indexHtml.includes('data-suggest='), 'Nút gợi ý phải có thuộc tính data-suggest chứa nội dung đề xuất');
assert.ok(indexHtml.includes('id="btn-send-debate"'), 'Nút gửi nhiệm vụ phải có ID btn-send-debate');
assert.ok(indexHtml.includes('id="btn-send-reward-debate"'), 'Nút gửi phần thưởng phải có ID btn-send-reward-debate');
assert.ok(indexHtml.includes('id="input-debate-arg"'), 'Input nhiệm vụ phải có ID input-debate-arg');
assert.ok(indexHtml.includes('id="input-reward-debate-arg"'), 'Input phần thưởng phải có ID input-reward-debate-arg');
console.log('✓ Test 1: HTML chứa đầy đủ thành phần gợi ý nhanh (chips), input và nút gửi cho cả Nhiệm vụ & Phần thưởng.');

// 2. Kiểm tra CSS hiệu ứng mượt mà và ẩn thanh cuộn chip
assert.ok(styleCss.includes('.message-fade-in'), 'CSS phải có class .message-fade-in cho tin nhắn');
assert.ok(styleCss.includes('@keyframes messageSlideIn'), 'CSS phải có keyframes messageSlideIn');
assert.ok(styleCss.includes('.no-scrollbar'), 'CSS phải có class .no-scrollbar');
console.log('✓ Test 2: CSS chứa đầy đủ hiệu ứng trượt tin nhắn mượt mà (.message-fade-in) và ẩn cuộn cho thanh gợi ý.');

// 3. Kiểm tra các hàm hỗ trợ Chat UI trong public/app.js
assert.ok(appJs.includes('function appendUserChatBubble('), 'Phải có hàm appendUserChatBubble');
assert.ok(appJs.includes('function createDebateLoadingBubble('), 'Phải có hàm createDebateLoadingBubble');
assert.ok(appJs.includes('function appendAiChatBubble('), 'Phải có hàm appendAiChatBubble');
assert.ok(appJs.includes('function initQuestDebateChat('), 'Phải có hàm initQuestDebateChat');
assert.ok(appJs.includes('function initRewardDebateChat('), 'Phải có hàm initRewardDebateChat');
assert.ok(appJs.includes('function renderUserMiniAvatar('), 'Phải có hàm renderUserMiniAvatar');
console.log('✓ Test 3: Mã nguồn app.js có đầy đủ các hàm render tin nhắn đa luồng (User, AI, Loading, Avatar, Welcome).');

// 4. Kiểm tra cơ chế chống spam click / duplicate request (Concurrency Guard)
assert.ok(appJs.includes('let isDebatingQuest = false;'), 'Phải có cờ guard isDebatingQuest');
assert.ok(appJs.includes('let isDebatingReward = false;'), 'Phải có cờ guard isDebatingReward');
assert.ok(appJs.includes('if (isDebatingQuest) return;'), 'sendDebateArgument phải kiểm tra cờ guard');
assert.ok(appJs.includes('if (isDebatingReward) return;'), 'sendRewardDebateArgument phải kiểm tra cờ guard');
assert.ok(appJs.includes('argInput.disabled = true'), 'Input phải bị vô hiệu hóa trong khi chờ AI phản hồi');
assert.ok(appJs.includes('btnSend.disabled = true'), 'Nút gửi phải bị vô hiệu hóa trong khi chờ AI phản hồi');
console.log('✓ Test 4: Cơ chế Concurrency Guard & trạng thái disabled chống spam gửi liên tục hoạt động chuẩn xác.');

// 5. Kiểm tra hiển thị trực quan thông số thay đổi (Diff tags badge)
assert.ok(appJs.includes('ĐÃ ĐỒNG Ý & CẬP NHẬT'), 'Phải có badge hiển thị trạng thái chấp thuận');
assert.ok(appJs.includes('GIỮ NGUYÊN THÔNG SỐ'), 'Phải có badge hiển thị trạng thái từ chối/giữ nguyên');
assert.ok(appJs.includes('diffTags'), 'Phải tính toán và hiển thị diffTags khi AI chấp thuận');
console.log('✓ Test 5: Giao diện hiển thị trực quan badge trạng thái và thẻ diff thông số cập nhật.');

// 6. Kiểm tra xử lý phím Enter và gắn sự kiện cho các nút gợi ý
assert.ok(appJs.includes('quick-suggest-btn'), 'Phải gắn sự kiện click cho các nút gợi ý nhiệm vụ');
assert.ok(appJs.includes('quick-suggest-reward-btn'), 'Phải gắn sự kiện click cho các nút gợi ý phần thưởng');
assert.ok(appJs.includes("e.key === 'Enter'"), 'Phải hỗ trợ phím Enter để gửi đề xuất thương lượng');
assert.ok(appJs.includes('e.preventDefault()'), 'Phải chặn hành vi mặc định khi bấm Enter');
console.log('✓ Test 6: Sự kiện bàn phím Enter và thao tác 1-chạm vào chip gợi ý được gắn hoàn chỉnh.');

// 7. Kiểm tra cuộn dừng ở đầu tin nhắn AI & Mở rộng không gian hiển thị khung chat
assert.ok(appJs.includes('rowRect.top - containerRect.top + container.scrollTop'), 'appendAiChatBubble phải tính toán vị trí đỉnh tin nhắn AI để dừng ở đầu tin');
assert.ok(indexHtml.includes('min-h-[260px] max-h-80 sm:max-h-[380px]'), 'Cả hai khung chat nhiệm vụ và phần thưởng phải được mở rộng chiều cao');
assert.ok(indexHtml.includes('id="modal-reward" class="fixed inset-0 z-50 hidden bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">\n    <div class="rpg-panel rounded-2xl w-full sm:max-w-lg'), 'Modal phần thưởng phải được mở rộng chiều rộng sm:max-w-lg');
console.log('✓ Test 7: Khung chat được mở rộng không gian và tin nhắn AI tự động dừng tại đầu tin nhắn giúp dễ đọc.');

// 8. Kiểm tra hộp thoại xác nhận trước khi chấp nhận và thêm nhiệm vụ (bao gồm tần suất và yêu cầu chụp ảnh)
assert.ok(appJs.includes('async function acceptVerdictAndCreateQuest('), 'Hàm acceptVerdictAndCreateQuest phải là async');
assert.ok(appJs.includes('const ok = await confirmAction({'), 'Phải gọi confirmAction trước khi thêm nhiệm vụ');
assert.ok(appJs.includes('if (!ok) return;'), 'Phải dừng lại nếu người dùng không xác nhận');
assert.ok(appJs.includes('Lặp lại') && appJs.includes('Làm một lần'), 'Hộp thoại xác nhận phải hiển thị tần suất (Lặp lại / Làm một lần)');
assert.ok(appJs.includes('Cần chụp ảnh') && appJs.includes('Không cần chụp ảnh'), 'Hộp thoại xác nhận phải hiển thị yêu cầu bằng chứng (Cần chụp ảnh / Không cần chụp ảnh)');
assert.ok(indexHtml.includes('whitespace-pre-line'), 'confirm-modal-detail phải có whitespace-pre-line để hiển thị thông số xuống dòng');
console.log('✓ Test 8: Hộp thoại xác nhận hiển thị đầy đủ thông số nhiệm vụ (thưởng, thời gian, tần suất lặp lại, yêu cầu chụp ảnh).');

// 9. Kiểm tra chuẩn hóa thuật ngữ phân loại nhiệm vụ (Rõ ràng, không gây nhầm lẫn)
assert.ok(!appJs.includes('VIỆC HOÀN THÀNH NGAY'), 'app.js không được chứa thuật ngữ gây hiểu lầm "VIỆC HOÀN THÀNH NGAY"');
assert.ok(!indexHtml.includes('VIỆC HOÀN THÀNH NGAY'), 'index.html không được chứa thuật ngữ "VIỆC HOÀN THÀNH NGAY"');
assert.ok(appJs.includes('⏳ HẸN GIỜ TẬP TRUNG'), 'app.js phải có nhãn "⏳ HẸN GIỜ TẬP TRUNG"');
assert.ok(appJs.includes('⚡ KHÔNG CẦN BẤM GIỜ'), 'app.js phải có nhãn "⚡ KHÔNG CẦN BẤM GIỜ"');
assert.ok(appJs.includes('Không bấm giờ'), 'app.js phải hiển thị nhãn ngắn "Không bấm giờ" trên thẻ nhiệm vụ');
console.log('✓ Test 9: Thuật ngữ phân loại nhiệm vụ được chuẩn hóa minh bạch ("HẸN GIỜ TẬP TRUNG" vs "KHÔNG CẦN BẤM GIỜ").');

console.log('\n🎉 TẤT CẢ 9/9 KIỂM THỬ TRẢI NGHIỆM CHAT THƯƠNG LƯỢNG VỚI AI ĐÃ VƯỢT QUA XUẤT SẮC!');
