# Archived LevelUp Client Modules

Thư mục này chỉ lưu fixture lịch sử phục vụ hồi quy trong `test/`. Đây không phải source runtime và không được nạp bởi Next.js.

> **Trạng thái:** ứng dụng web và API chạy bằng Next.js. React/Server Actions là runtime duy nhất. Fixture này không được build, bundle hoặc deploy.

| Tệp Module | Phân vùng chức năng & Nhiệm vụ |
| :--- | :--- |
| `01-sound.js` | **Web Audio Synthesizer (SoundFX):** Hiệu ứng âm thanh 8-bit RPG (coin, gong, fanfare, click) không tải asset media ngoài. |
| `02-state.js` | **Default State & Initial Seed:** Khởi tạo dữ liệu người chơi, bảng cấp độ, danh hiệu mặc định và cấu trúc lưu trữ. |
| `03-storage.js` | **Storage & Sync Manager:** Quản lý `localStorage`, cache chống nháy Anti-FOUC, Dark/Light theme, đồng bộ Redis Cloud và color engine còn dùng bởi React Palette Studio. |
| `04-toast.js` | **Toast & RPG Helpers:** Hệ thống thông báo toast notification, dialog xác nhận (`openConfirmModal`), hiệu ứng celebration `triggerRpgCelebration`. |
| `05-streak.js` | **Daily Streak Engine:** Tính chuỗi ngày kiên trì, hệ số nhân thưởng vàng/exp, lịch sử 7 ngày và cơ chế anti-cheat múi giờ. |
| `06-timer.js` | **Pomodoro Focus Timer:** Đồng hồ đếm ngược delta-time, chạy ngầm (background tab), Wake Lock API và đồng bộ timer đa thiết bị qua Redis; timer adjustment và focus-completion UI chuyển sang React. |
| `07-quest.js` | **Quest Interactions:** Thêm, xóa, hoàn thành nhiệm vụ, hoàn tác (undo), nhiệm vụ lặp lại hàng ngày (repeatable) và phân loại màu thẻ. |
| `08-proof.js` | **Quest Proof & Camera Vision:** Bằng chứng hoàn thành nhiệm vụ (chụp ảnh camera, upload ảnh) cho AI Vision thẩm định. |
| `09-shop.js` | **Tavern Shop & Inventory:** Mua chiến lợi phẩm, kho đồ cá nhân (Inventory), hoàn tiền (refund), hoàn tác sử dụng quà. |
| `10-arbiter.js` | **AI Arbiter & Auto-Suggestions:** Trọng tài AI định giá nhiệm vụ khắt khe, tranh biện xin tăng thưởng (Debate modal) và gợi ý nhiệm vụ thông minh. |
| `11-reward-ai.js` | **AI Reward Appraisal:** Thẩm định độ cám dỗ và định giá vàng tự động cho phần thưởng do người chơi tạo. |
| `12-leaderboard.js` | **Legacy Leaderboard Logic:** Giao diện web đã chuyển sang `components/leaderboard/Leaderboard.tsx`; module cũ còn trong bundle chuyển tiếp cho tới khi hoàn tất gỡ legacy. |
| `13-admin.js` | **Guildmaster Admin Dashboard:** Bảng điều khiển quản trị, tinh chỉnh cấp độ/vàng, xóa tài khoản, tra cứu & dọn dẹp sổ cái thu chi. |
| `14-render.js` | **DOM Render Engines:** Render danh sách nhiệm vụ, tiệm phần thưởng, kho đồ, thanh exp, avatar và huy hiệu; quest/reward/frequency detail được mở qua event để React sở hữu dialog, không còn DOM detail renderer legacy. |
| `15-modal.js` | **Legacy Navigation & Modal Helpers:** Quản lý điều hướng tab, animation và các helper modal dùng chung. Dialog Level/EXP, streak, Palette Studio, frequency detail, quest/reward detail, timer adjustment và focus completion đã chuyển UI sang React; domain actions cùng bottom-sheet gesture/animation vẫn được tái sử dụng trong giai đoạn chuyển tiếp. |
| `16-tour.js` | **Onboarding Interactive Tour:** Hướng dẫn 7 bước tương tác trực quan cho hiệp sĩ mới gia nhập Guild. |
| `17-bank.js` | **LevelUp AI Bank & AMM:** Sổ tiết kiệm sinh lời theo giờ, quầy vay vốn tức thời với trích nợ tự động, và sổ cái thu chi minh bạch. |
| `18-events.js` | **Event Listeners Attachment:** Gắn sự kiện cho runtime còn legacy, phím tắt toàn cục và đồng bộ đa tab qua BroadcastChannel; controller click cho timer adjustment/focus-completion dialog đã gỡ vì React tự xử lý. |
| `19-assistant.js` | **AI Guild Companion (Brain & Worker):** Trợ lý Phù Thủy AI 2 tầng với phản hồi streaming thời gian thực và thực thi công cụ siêu tốc. |

---

Các tính năng mới phải viết trong `components/`, `app/actions/` hoặc `app/api/`. Chỉ xóa fixture này khi toàn bộ test hồi quy lịch sử đã được chuyển sang test hành vi React.
