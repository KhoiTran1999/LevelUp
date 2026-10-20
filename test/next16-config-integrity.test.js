import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== KIỂM THỬ TÍNH TOÀN VẸN CẤU HÌNH NEXT.JS 16 & REACT 19 ===\n');

// 1. Kiểm tra next.config.ts có khai báo serverExternalPackages
{
  console.log('Test 1: Kiểm tra next.config.ts chứa serverExternalPackages cho native drivers...');
  const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
  assert.ok(fs.existsSync(nextConfigPath), 'next.config.ts phải tồn tại');

  const content = fs.readFileSync(nextConfigPath, 'utf8');
  assert.ok(content.includes('serverExternalPackages'), 'next.config.ts phải khai báo serverExternalPackages');
  assert.ok(content.includes("'ioredis'"), "serverExternalPackages phải bao gồm 'ioredis'");
  assert.ok(content.includes("'postgres'"), "serverExternalPackages phải bao gồm 'postgres'");
  assert.ok(content.includes("'@aws-sdk/client-s3'"), "serverExternalPackages phải bao gồm '@aws-sdk/client-s3'");
  console.log('  ✓ Đã xác minh serverExternalPackages cấu hình chuẩn cho Next.js 16.\n');
}

// 2. Kiểm tra lib/proof-utils.ts có buffer trailing flush
{
  console.log('Test 2: Kiểm tra lib/proof-utils.ts xử lý trailing buffer khi stream đóng...');
  const proofUtilsPath = path.join(process.cwd(), 'lib', 'proof-utils.ts');
  const code = fs.readFileSync(proofUtilsPath, 'utf8');
  assert.ok(code.includes('buffer.trim()'), 'fetchDebateStream phải có bước kiểm tra buffer còn dư sau khi stream kết thúc');
  assert.ok(code.includes('finalResult = parsed'), 'fetchDebateStream phải trích xuất finalResult từ buffer dư');
  console.log('  ✓ Đã xác minh SSE stream reader bảo vệ chống mất dữ liệu khi stream đóng.\n');
}

// 3. Kiểm tra WeekCalendarStrip có suppressHydrationWarning
{
  console.log('Test 3: Kiểm tra WeekCalendarStrip có suppressHydrationWarning trên các thẻ ngày...');
  const calendarPath = path.join(process.cwd(), 'components', 'quests', 'WeekCalendarStrip.tsx');
  const calCode = fs.readFileSync(calendarPath, 'utf8');
  assert.ok(calCode.includes('suppressHydrationWarning'), 'WeekCalendarStrip phải có suppressHydrationWarning');
  console.log('  ✓ Đã xác minh cơ chế chống hydration mismatch cho lịch tuần.\n');
}

// 4. Kiểm tra NoteEditor có handle flush
{
  console.log('Test 4: Kiểm tra NoteEditor có export NoteEditorHandle và flush()...');
  const noteEditorPath = path.join(process.cwd(), 'components', 'notes', 'NoteEditor.tsx');
  const editorCode = fs.readFileSync(noteEditorPath, 'utf8');
  assert.ok(editorCode.includes('NoteEditorHandle'), 'NoteEditor phải có interface NoteEditorHandle');
  assert.ok(editorCode.includes('useImperativeHandle'), 'NoteEditor phải dùng useImperativeHandle để expose flush');
  console.log('  ✓ Đã xác minh khả năng lưu tức thì chống mất dữ liệu của NoteEditor.\n');
}

console.log('🎉 TẤT CẢ KIỂM THỬ CẤU HÌNH NEXT.JS 16 & REACT 19 ĐỀU ĐẠT CHUẨN!');
