# Chrome Web Store Listing — LevelUp Focus Shield

> Last Updated: 2026-10-18

## Store Listing

**Extension Name** [REQUIRED]
LevelUp — Khiên Chặn Xao Nhãng (Focus Shield)

**Short Description** [REQUIRED]
Tự động chặn các website gây xao nhãng khi bật Pomodoro Focus trên LevelUp. Kỷ luật thép bảo vệ chuỗi ngày và vàng!

**Detailed Description** [REQUIRED]
LevelUp Focus Shield là tiện ích mở rộng tập trung vào việc chặn các website giải trí trong phiên Pomodoro.

Khi phiên Focus đang chạy, extension dùng Declarative Net Request để chặn hoặc chuyển hướng các tên miền nằm trong Blacklist. Khi phiên kết thúc hoặc chuyển sang giờ nghỉ, khiên tự động hạ.

Các tính năng nổi bật:
- Đồng bộ trạng thái Focus với ứng dụng LevelUp
- Chặn mạng xã hội và website giải trí theo Blacklist
- Hỗ trợ Whitelist cho website phục vụ công việc và học tập
- Cho phép chọn chế độ chuyển hướng hoặc chặn yêu cầu chính
- Chế độ Kỷ Luật Thép (Strict Discipline Mode)

Hướng dẫn sử dụng:
1. Mở ứng dụng LevelUp và bắt đầu một phiên Pomodoro Focus
2. Tiện ích sẽ tự động kích hoạt huy hiệu bảo vệ trên thanh công cụ
3. Tập trung hoàn thành nhiệm vụ mà không lo bị xao nhãng bởi các trang mạng giải trí
4. Hết giờ, tiện ích sẽ tự động hạ khiên để bạn thoải mái nghỉ ngơi

Cam kết quyền riêng tư:
Tiện ích hoạt động cục bộ trên trình duyệt của bạn, không đọc nội dung duyệt web, không theo dõi lịch sử và không gửi bất kỳ dữ liệu cá nhân nào ra bên ngoài.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Chặn các trang web gây xao nhãng khi người dùng đang trong phiên tập trung Pomodoro của LevelUp.

**Primary Language** [REQUIRED]
Vietnamese

---

## Permissions Justification

**declarativeNetRequest** [REQUIRED]
Dùng để tự động chuyển hướng các yêu cầu truy cập đến những trang web nằm trong danh sách đen (Blacklist) sang trang cảnh báo tập trung (blocked.html) trong suốt thời gian phiên Pomodoro đang diễn ra, mà không cần đọc nội dung trang web của người dùng.

**storage** [REQUIRED]
Dùng để lưu trữ cục bộ danh sách tên miền cần chặn (Blacklist), danh sách ngoại lệ (Whitelist), trạng thái đếm giờ và số lần ngăn chặn cám dỗ thành công trong ngày.

**alarms** [REQUIRED]
Dùng để duy trì nhịp đếm giờ ngầm định kỳ nhằm đồng bộ chính xác thời gian còn lại của phiên tập trung ngay cả khi thẻ ứng dụng web bị thu nhỏ hoặc tạm ngưng.

**tabs** [REQUIRED]
Dùng để tự động tìm kiếm, kích hoạt và chuyển người dùng quay trở lại thẻ làm việc LevelUp đang mở khi họ nhấn nút "Quay Lại Trận Chiến" trên trang cảnh báo.

**scripting** [REQUIRED]
Dùng để tự động kết nối và đồng bộ với thẻ làm việc LevelUp đang mở ngay khi cài đặt tiện ích mà người dùng không cần phải tải lại trang thủ công.

---

## Host Permissions Justification

**<all_urls>** [REQUIRED]
Cần thiết để cơ chế Declarative Net Request và trình theo dõi điều hướng có quyền chuyển hướng (redirect) các yêu cầu truy cập từ những trang web nằm trong danh sách đen của người dùng (như youtube.com, facebook.com) sang trang cảnh báo tập trung (blocked.html).

---

## Privacy & Data Use

**Single Purpose Compliance**: Tiện ích chỉ phục vụ một mục đích duy nhất là hỗ trợ duy trì sự tập trung và kỷ luật bằng cách ngăn chặn các trang web xao nhãng khi đếm giờ Pomodoro.

**Data Collection**:
- Does the extension collect user data? **No**
- Does the extension transmit data to external servers? **No**
- Data stored locally in `chrome.storage.local`: Danh sách tên miền chặn do người dùng cấu hình và trạng thái đếm giờ Pomodoro.

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| 1.3.0 | 2026-10-19 | Nâng cấp chuyển động & UI Khiên Kỷ Luật: Con nhộng bay viền màn hình chậm rãi liên tục (border-to-border), viền đỏ tỏa sóng mượt mà (smooth ripple wave aura), cơ chế tự động quét phiên bản và ép buộc cập nhật để đồng bộ tính năng mới nhất. |
| 1.2.0 | 2026-10-19 | Mini RPG Floating HUD / Guild Mascot (Thú cưng đồng hành) — Linh vật pixel art 8-bit vung kiếm luyện công, Thẩm Phán AI nhắc nhở bong bóng thoại khi mở web xao nhãng, linh vật hóa đá xám xịt và pháo hoa 8-bit nổ chúc mừng kèm âm thanh chiptune khi hoàn thành Pomodoro! |
| 1.1.0 | 2026-10-18 | Mini Floating Capsule Timer — Bong bóng đếm ngược Pomodoro siêu nhỏ gọn nổi trên mọi tab, kéo thả tự do, không chiếm diện tích màn hình & nút 1-click quay về tab LevelUp. |
| 1.0.0 | 2026-10-18 | Initial release — Đồng bộ Pomodoro thời gian thực, DNR rule redirection, RPG blocked page, Popup HUD, Options manager. |
