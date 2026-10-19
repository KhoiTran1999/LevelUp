import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Sổ Ghi Chú — Tự Động Nhận Diện & Định Dạng Markdown (Markdown Recognition)', () => {
  const modalJs = fs.readFileSync(path.join(rootDir, 'src/js/15-modal.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'public/index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(rootDir, 'public/app.js'), 'utf8');

  it('1. Đảm bảo các hàm nhận diện và chuyển đổi Markdown được định nghĩa đầy đủ', () => {
    assert.ok(modalJs.includes('function isMarkdownText('), '15-modal.js phải định nghĩa isMarkdownText');
    assert.ok(modalJs.includes('function parseInlineMarkdown('), '15-modal.js phải định nghĩa parseInlineMarkdown');
    assert.ok(modalJs.includes('function convertMarkdownToEditorHtml('), '15-modal.js phải định nghĩa convertMarkdownToEditorHtml');
    assert.ok(modalJs.includes('function formatMarkdownInActiveEditor('), '15-modal.js phải định nghĩa formatMarkdownInActiveEditor');
    assert.ok(modalJs.includes("e.key === 'm' || e.key === 'M'"), '15-modal.js phải hỗ trợ phím tắt Ctrl+Shift+M');
    assert.ok(appJs.includes('formatMarkdownInActiveEditor'), 'app.js đã đóng gói formatMarkdownInActiveEditor');
  });

  it('2. Nút bấm chuyển đổi Markdown đã được trang bị trên thanh công cụ', () => {
    assert.ok(indexHtml.includes('id="btn-format-markdown"'), 'index.html phải có nút #btn-format-markdown trên thanh công cụ ghi chú');
    assert.ok(indexHtml.includes('formatMarkdownInActiveEditor()'), 'index.html phải gọi formatMarkdownInActiveEditor khi click');
  });

  it('3. Thuật toán parse Markdown nhận diện chính xác đoạn văn bản mẫu của người dùng', () => {
    // Trích xuất hàm trực tiếp từ modalJs hoặc chạy mô phỏng
    const sampleText = `Không hiếm, trên thực tế trường hợp này diễn ra **hàng ngày, hàng giờ** trong cơ thể một người khỏe mạnh.

Mọi người thường nghĩ vi khuẩn chỉ xâm nhập vào những lúc đổ bệnh, nhưng thực tế cơ thể liên tục tiếp xúc với mầm bệnh qua đường thở, ăn uống, và các vết xước nhỏ. Đa phần các cuộc chạm trán này đều kết thúc trong âm thầm nhờ hai tầng phòng thủ:

* **Hàng rào vật lý và miễn dịch bẩm sinh tại chỗ:** Da, niêm mạc, dịch nhầy, axit dạ dày và các đại thực bào thường trú tiêu diệt vi khuẩn ngay tại cửa ngõ. Trận chiến diễn ra cục bộ nên không kích hoạt cytokine toàn thân để gây sốt.
* **Miễn dịch đặc hiệu (trí nhớ miễn dịch):** Khi gặp lại loại vi khuẩn/virus cơ thể từng tiếp xúc hoặc đã tiêm vắc-xin, tế bào B và kháng thể có sẵn trung hòa mầm bệnh gần như ngay lập tức trước khi chúng kịp nhân lên đủ số lượng để kích hoạt cơn sốt.

Lý do nhiều người tưởng trường hợp này "hiếm" là vì:

1. **Khái niệm "nhiễm khuẩn" bị nhầm lẫn với "phát bệnh":** Vi khuẩn xâm nhập (infection) không đồng nghĩa với việc phát thành bệnh nhiễm trùng lâm sàng (clinical disease). Hầu hết các đợt xâm nhập đều bị chặn đứng dưới dạng **nhiễm trùng thể ẩn (asymptomatic)** — mầm bệnh bị tiêu diệt hoàn toàn mà người mắc không hề hay biết.
2. **Thiên kiến chú ý:** Mọi người chỉ nhớ đến những lần mầm bệnh quá mới, độc lực quá cao hoặc số lượng quá lớn khiến cơ thể phải "bật báo động đỏ" (sốt, mệt mỏi dữ dội). Những ngày sống bình thường khỏe mạnh chính là minh chứng cho việc hệ miễn dịch đang âm thầm giải quyết vi khuẩn mà không cần phải sốt.`;

    // Khởi tạo ngữ cảnh kiểm thử
    const evalScope = {};
    const codeToEval = `
      function escapeHtml(text) {
        if (!text) return '';
        return text.toString()
          .normalize('NFC')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }
      ${modalJs.slice(modalJs.indexOf('function isMarkdownText('), modalJs.indexOf('// 18. Lắng nghe phím Enter'))}
      evalScope.isMarkdownText = isMarkdownText;
      evalScope.parseInlineMarkdown = parseInlineMarkdown;
      evalScope.convertMarkdownToEditorHtml = convertMarkdownToEditorHtml;
    `;
    new Function('evalScope', 'window', codeToEval)(evalScope, {});

    // Kiểm tra nhận diện Markdown
    assert.strictEqual(evalScope.isMarkdownText(sampleText), true, 'Văn bản của người dùng phải được nhận diện là Markdown');
    assert.strictEqual(evalScope.isMarkdownText('Chỉ là một câu bình thường'), false, 'Văn bản thường không bị nhận diện nhầm');

    // Chuyển đổi sang HTML
    const html = evalScope.convertMarkdownToEditorHtml(sampleText);

    // Kiểm tra cấu trúc HTML sinh ra
    assert.ok(html.includes('<strong>hàng ngày, hàng giờ</strong>'), 'Chữ in đậm **hàng ngày, hàng giờ** phải chuyển thành thẻ strong');
    assert.ok(html.includes('<ul><li><strong>Hàng rào vật lý'), 'Danh sách dấu * phải chuyển thành thẻ <ul><li>');
    assert.ok(html.includes('<ol><li><strong>Khái niệm'), 'Danh sách số 1. 2. phải chuyển thành thẻ <ol><li>');
    assert.ok(html.includes('<strong>nhiễm trùng thể ẩn (asymptomatic)</strong>'), 'Chữ in đậm lồng bên trong danh sách phải được parse đầy đủ');
  });

  it('4. Hỗ trợ toàn diện To-Do Checklist, Code Block, Blockquote, Links', () => {
    const evalScope = {};
    const codeToEval = `
      function escapeHtml(text) {
        if (!text) return '';
        return text.toString()
          .normalize('NFC')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }
      ${modalJs.slice(modalJs.indexOf('function isMarkdownText('), modalJs.indexOf('// 18. Lắng nghe phím Enter'))}
      evalScope.convertMarkdownToEditorHtml = convertMarkdownToEditorHtml;
    `;
    new Function('evalScope', 'window', codeToEval)(evalScope, {});

    const complexMd = `
# Tiêu Đề Chính
- [ ] Nhiệm vụ cần làm
- [x] Nhiệm vụ đã xong
> Trích dẫn một ý tưởng
[Google](https://google.com)
\`\`\`javascript
const x = 42;
\`\`\`
---
    `.trim();

    const html = evalScope.convertMarkdownToEditorHtml(complexMd);
    assert.ok(html.includes('<h1>Tiêu Đề Chính</h1>'), 'Hỗ trợ Heading 1');
    assert.ok(html.includes('class="note-todo-item"'), 'Hỗ trợ To-Do checklist chưa hoàn thành');
    assert.ok(html.includes('class="note-todo-item is-done"'), 'Hỗ trợ To-Do checklist đã hoàn thành');
    assert.ok(html.includes('<blockquote>'), 'Hỗ trợ Blockquote');
    assert.ok(html.includes('<a href="https://google.com" target="_blank"'), 'Hỗ trợ Links');
    assert.ok(html.includes('<pre class="note-code-block"'), 'Hỗ trợ Code block');
    assert.ok(html.includes('<hr>'), 'Hỗ trợ Horizontal rule');
  });

  it('5. Tự động nhận diện khi dán (Paste) vào vùng soạn thảo', () => {
    assert.ok(modalJs.includes("if (isMarkdownText(text))"), '15-modal.js phải tự động kiểm tra isMarkdownText khi Paste');
    assert.ok(modalJs.includes("showToast('✨ Đã tự động nhận diện và chuyển đổi cú pháp Markdown!', 'success')"), 'Có toast thông báo tiện ích cho người dùng khi paste Markdown');
  });
});
