# Next.js AI Coding Agent Protocol

Khi phát triển tính năng mới hoặc sửa bug trong dự án LevelUp, luôn tuân thủ quy chuẩn Next.js 16 AI Coding Agent (`next.agent.config.json`):

1. **Kiến trúc Next.js 16 & Server Actions**:
   - Tra cứu quy chuẩn từ `node_modules/next/dist/docs/`.
   - Ưu tiên React Server Components (RSC); chỉ dùng `'use client'` ở các component lá có tương tác.
   - Nghiệp vụ dữ liệu phải qua Server Actions (`app/actions/`), dùng `'use server'`, validate đầu vào và trả về `ActionResponse<T>`.
   - Tuân thủ React 19: Mọi side-effect (CustomEvent, âm thanh, Web Storage) phải chạy trong `queueMicrotask` hoặc `startTransition`, không dispatch trong render phase.

2. **Chu trình Kiểm chứng Bắt buộc (`next-dev-loop`)**:
   - Mọi thay đổi mã nguồn trước khi kết thúc lượt làm việc phải tự động xác thực:
     1. `npm run type-check` (0 lỗi TypeScript).
     2. `npm test` (đảm bảo 100% test suites vượt qua).
   - Khi dev server đang bật, tận dụng endpoint `/_next/mcp` để kiểm tra compile issues tức thì.
