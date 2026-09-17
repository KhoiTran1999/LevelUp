# ⚔️ LevelUp — RPG Productivity & Habit Guild

Trang web game hóa (Gamification) công việc và học tập, kết hợp **Trọng tài AI siêu khắt khe (Anti-Inflation Arbiter)**, **Hệ thống Tài Chính & Ngân Hàng 3 Bên (LevelUp AI Bank & AMM)** và **Đồng bộ thời gian thực qua Redis Cloud**.

Deploy sẵn sàng trên **Vercel** chỉ với 1 click!

---

## 🌟 Tính Năng Cốt Lõi

### 1. ⚖️ Thẩm Phán AI Khó Tính (Chống Lạm Phát Tiền Ảo)
* **Ép loại hình:** Việc học bài, ôn thi, đọc sách, lập trình... bắt buộc phải đo bằng **Đồng hồ Focus (Pomodoro)** để chống gian lận. Chỉ những việc có kết quả rõ ràng (dọn phòng, rửa bát) mới được tính theo đầu việc (Bounty).
* **Định giá khắt khe:** Tự động cắt giảm các mức tiền thưởng tự định giá quá cao (chuẩn: ~10-12 Vàng cho 25 phút tập trung).
* **Tranh biện & Kháng cáo:** Cho phép người chơi chat giải trình lý do với Thẩm phán nếu gặp bài quá khó để xin tăng thưởng.

### 2. 🏦 Hệ Thống Tài Chính & Ngân Hàng 3 Bên (LevelUp AI Bank & AMM)
* **Sổ Tiết Kiệm Sinh Lời:** 
  * Lãi suất tiền gửi biến thiên linh hoạt theo tỷ lệ sử dụng vốn AMM (Utilization Rate $1\% - 8\%$/ngày).
  * **Bảo hiểm lãi sàn:** Khoản gửi từ $\ge 10$ Vàng qua $\ge 24$h luôn đảm bảo nhận tối thiểu $1$ Vàng lãi/ngày.
  * **Bảo toàn thời gian lẻ:** Tích lũy liên tục theo chu kỳ, không bị mất thời gian ngày lẻ dở dang khi nạp thêm tiền.
  * Tự động sinh lãi trong mọi chu kỳ đồng bộ và hỗ trợ tính lãi cục bộ phía Client (Offline & Local mode).
* **Quầy Vay Vàng Tức Thời:**
  * Cấp hạn mức tín dụng tự động dựa trên Cấp độ, Chuỗi ngày chăm chỉ (Streak) và Tỷ lệ trích nợ cam kết.
  * Trợ lý AI tư vấn và thương lượng lãi suất/hạn mức vay linh hoạt.
  * Tự động trích nợ $0\%$ phí phạt khi người chơi hoàn thành nhiệm vụ.
* **Kho Bạc Hệ Thống Bảo Lãnh 100%:** Cơ chế cứu trợ khẩn cấp (Reversible Bailout) bảo đảm an toàn thanh khoản tuyệt đối cho người gửi tiền.
* **Sổ Cái Thu Chi (Ledger):** Nhật ký biến động số dư minh bạch, phân loại thu chi và theo dõi dòng tiền.

### 3. 🏪 Tiệm Phần Thưởng & Kinh Tế Khép Kín (Tavern Shop)
* Thêm các món quà bạn ao ước (ăn kem, xem phim, uống trà sữa, mua đồ xịn).
* AI phân tích mức độ cám dỗ và đặt giá Vàng xứng đáng với thời gian bạn phải cày cuốc.
* Mua quà $\rightarrow$ Đưa vào **Chiến Lợi Phẩm (Inventory)** $\rightarrow$ Bấm "Hưởng thụ ngay" khi bắt đầu xả hơi không chút tội lỗi.

### 4. ☁️ Xác Thực Google & Đồng Bộ Redis Cloud
* **Đăng nhập Google an toàn:** Xác thực tài khoản bằng Google OAuth Identity Services và cấp phiên làm việc 90 ngày.
* **Đồng bộ thời gian thực:** Lưu trữ và đồng bộ tức thì trên Redis Cloud, chống xung đột dữ liệu đa thiết bị (Last-Write-Wins).
* **Hệ thống Anti-Cheat & Chuộc Tội:** Ngăn chặn can thiệp sửa số dư Vàng hay EXP qua DevTools; cơ chế thử thách 5 phiên tập trung kỷ luật để phục hồi danh dự hiệp sĩ.
* **Đấu trường Xếp hạng (Leaderboard):** Bảng xếp hạng cộng đồng theo điểm tích lũy.

### 5. 🎮 Trải Nghiệm RPG Đỉnh Cao
* Giao diện Dark Fantasy Guild huyền ảo, mượt mà, responsive trên cả điện thoại, máy tính bảng và máy tính.
* **Âm thanh 8-bit sống động** tạo trực tiếp bằng Web Audio API (không cần tải file mp3).
* Hệ thống Rank (E $\rightarrow$ S), thanh EXP, Level Up, danh hiệu mạo hiểm giả.

---

## 🚀 Hướng Dẫn Chạy Cục Bộ (Local Development)

### Yêu cầu:
* Node.js v18+ 

### Các bước:
1. Cài đặt dependencies:
   ```bash
   npm install
   ```

2. Cấu hình file `.env` (tham khảo mẫu trong `.env.example`):
   ```env
   USE_CUSTOM_AI=true
   CUSTOM_AI_BASE_URL=https://api.openai.com/v1
   CUSTOM_AI_API_KEY=your_key
   CUSTOM_AI_MODEL=gpt-4o-mini
   MODEL_WORKER=gpt-4o-mini      # Worker: Tắt thinking để gọi tool siêu tốc (< 1s)
   MODEL_BRAIN=gpt-4o-mini       # Brain: Bật thinking để thẩm định sâu và chặt chẽ
   REDIS_URL=redis://default:password@host:port
   GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   ```

3. Khởi động server:
   ```bash
   npm run dev
   ```
4. Mở trình duyệt tại: `http://localhost:3000`

---

## ☁️ Hướng Dẫn Deploy Lên Vercel

Dự án được tối ưu theo kiến trúc Serverless All-in-one:
* Frontend tĩnh nằm trong thư mục `public/` $\rightarrow$ Vercel CDN phân phối tốc độ cao.
* API serverless nằm trong thư mục `api/` (`api/ai.js` và `api/sync.js`) $\rightarrow$ Tự động chạy trên Vercel Edge/Serverless.

1. Đẩy mã nguồn lên GitHub.
2. Truy cập [Vercel Dashboard](https://vercel.com) $\rightarrow$ Import repository.
3. Thêm các **Environment Variables** (giống trong file `.env`):
   * `CUSTOM_AI_BASE_URL`
   * `CUSTOM_AI_API_KEY`
   * `CUSTOM_AI_MODEL`
   * `MODEL_WORKER`
   * `MODEL_BRAIN`
   * `REDIS_URL`
   * `GOOGLE_CLIENT_ID`
4. Bấm **Deploy** $\rightarrow$ Web hoạt động ngay lập tức!
