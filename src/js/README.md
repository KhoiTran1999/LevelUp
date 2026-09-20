# ⚔️ LevelUp Client Modules (`src/js/`)

Thư mục này chứa toàn bộ mã nguồn giao diện và logic client của **LevelUp RPG Guild**, được module hóa thành 19 tệp chuyên biệt theo từng miền nghiệp vụ:

| Tệp Module | Phân vùng chức năng & Nhiệm vụ |
| :--- | :--- |
| `01-sound.js` | **Web Audio Synthesizer (SoundFX):** Hiệu ứng âm thanh 8-bit RPG (coin, gong, fanfare, click) không tải asset media ngoài. |
| `02-state.js` | **Default State & Initial Seed:** Khởi tạo dữ liệu người chơi, bảng cấp độ, danh hiệu mặc định và cấu trúc lưu trữ. |
| `03-storage.js` | **Storage & Sync Manager:** Quản lý `localStorage`, cache chống nháy Anti-FOUC, Dark/Light theme và đồng bộ Redis Cloud. |
| `04-toast.js` | **Toast & RPG Helpers:** Hệ thống thông báo toast notification, dialog xác nhận (`openConfirmModal`), hiệu ứng celebration `triggerRpgCelebration`. |
| `05-streak.js` | **Daily Streak Engine:** Tính chuỗi ngày kiên trì, hệ số nhân thưởng vàng/exp, lịch sử 7 ngày và cơ chế anti-cheat múi giờ. |
| `06-timer.js` | **Pomodoro Focus Timer:** Đồng hồ đếm ngược delta-time, chạy ngầm (background tab), Wake Lock API và đồng bộ timer đa thiết bị qua Redis. |
| `07-quest.js` | **Quest Interactions:** Thêm, xóa, hoàn thành nhiệm vụ, hoàn tác (undo), nhiệm vụ lặp lại hàng ngày (repeatable) và phân loại màu thẻ. |
| `08-proof.js` | **Quest Proof & Camera Vision:** Bằng chứng hoàn thành nhiệm vụ (chụp ảnh camera, upload ảnh) cho AI Vision thẩm định. |
| `09-shop.js` | **Tavern Shop & Inventory:** Mua chiến lợi phẩm, kho đồ cá nhân (Inventory), hoàn tiền (refund), hoàn tác sử dụng quà. |
| `10-arbiter.js` | **AI Arbiter & Auto-Suggestions:** Trọng tài AI định giá nhiệm vụ khắt khe, tranh biện xin tăng thưởng (Debate modal) và gợi ý nhiệm vụ thông minh. |
| `11-reward-ai.js` | **AI Reward Appraisal:** Thẩm định độ cám dỗ và định giá vàng tự động cho phần thưởng do người chơi tạo. |
| `12-leaderboard.js` | **Leaderboard & Presence:** Bảng vàng vinh danh Top 3 mạo hiểm giả, tìm kiếm thành viên, trạng thái online và Bảng người gian lận. |
| `13-admin.js` | **Guildmaster Admin Dashboard:** Bảng điều khiển quản trị, tinh chỉnh cấp độ/vàng, xóa tài khoản, tra cứu & dọn dẹp sổ cái thu chi. |
| `14-render.js` | **DOM Render Engines:** Render danh sách nhiệm vụ, tiệm phần thưởng, kho đồ, thanh exp, avatar và huy hiệu. |
| `15-modal.js` | **Navigation & Modal Controllers:** Quản lý điều hướng tab trên mobile/desktop, đóng/mở modal và phím tắt (`Alt+A`, `Space`, `Escape`). |
| `16-tour.js` | **Onboarding Interactive Tour:** Hướng dẫn 7 bước tương tác trực quan cho hiệp sĩ mới gia nhập Guild. |
| `17-bank.js` | **LevelUp AI Bank & AMM:** Sổ tiết kiệm sinh lời theo giờ, quầy vay vốn tức thời với trích nợ tự động, và sổ cái thu chi minh bạch. |
| `18-events.js` | **Event Listeners Attachment:** Gắn kết sự kiện `DOMContentLoaded`, phím tắt toàn cục, đồng bộ đa tab qua BroadcastChannel. |
| `19-assistant.js` | **AI Guild Companion (Brain & Worker):** Trợ lý Phù Thủy AI 2 tầng với phản hồi streaming thời gian thực và thực thi công cụ siêu tốc. |

---

## 🛠️ Quy trình Lập trình (Developer Workflow)

1. **Chỉnh sửa mã nguồn:** Lập trình viên chỉ cần mở và sửa đúng tệp module trong `src/js/`.
2. **Đóng gói tự động:**
   ```bash
   # Build một lần (tốc độ < 20ms):
   npm run build:js

   # Chế độ theo dõi tự động đóng gói khi lưu file:
   npm run watch:js
   ```
3. **Kiểm tra kiểm thử tự động:**
   ```bash
   npm test
   ```
Mọi thay đổi trong `src/js/` sẽ được tự động đóng gói và kiểm tra cú pháp an toàn trước khi chạy!
