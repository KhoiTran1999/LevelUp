# ⚔️ LevelUp — RPG Productivity & Habit Guild

Trang web game hóa (Gamification) công việc và học tập, kết hợp **Trọng tài AI siêu khắt khe (Anti-Inflation Arbiter)** và **Cơ chế lưu trữ kép (LocalStorage + Redis Cloud)**.

Deploy sẵn sàng trên **Vercel** chỉ với 1 click!

---

## 🌟 Tính Năng Cốt Lõi

### 1. ⚖️ Thẩm Phán AI Khó Tính (Chống Lạm Phát Tiền Ảo)
* **Ép loại hình:** Việc học bài, ôn thi, đọc sách, lập trình... bắt buộc phải đo bằng **Đồng hồ Focus (Pomodoro)** để chống gian lận. Chỉ những việc có kết quả rõ ràng (dọn phòng, rửa bát) mới được tính theo đầu việc (Bounty).
* **Định giá khắt khe:** Tự động cắt giảm các mức tiền thưởng tự định giá quá cao (chuẩn: ~10-12 Vàng cho 25 phút tập trung).
* **Tranh biện & Kháng cáo:** Cho phép người chơi chat giải trình lý do với Thẩm phán nếu gặp bài quá khó để xin tăng thưởng.

### 2. 🏪 Tiệm Phần Thưởng & Kinh Tế Khép Kín (Tavern Shop)
* Thêm các món quà bạn ao ước (ăn kem, xem phim, uống trà sữa, mua đồ xịn).
* AI phân tích mức độ cám dỗ và đặt giá Vàng xứng đáng với thời gian bạn phải cày cuốc.
* Mua quà $\rightarrow$ Đưa vào **Chiến Lợi Phẩm (Inventory)** $\rightarrow$ Bấm "Hưởng thụ ngay" khi bắt đầu xả hơi không chút tội lỗi.

### 3. ☁️ Dual-Storage: LocalStorage + Redis Cloud
* **LocalStorage:** Lưu trữ tức thì 0ms, hoạt động mượt mà kể cả khi mất mạng.
* **Redis Cloud (Đồng bộ theo Nickname):** Chỉ cần nhập Nickname, toàn bộ dữ liệu (Level, EXP, Vàng, Quests, Inventory) được tự động đồng bộ lên Redis Cloud.
* **Đấu trường Xếp hạng (Leaderboard):** Bảng xếp hạng cộng đồng theo điểm tích lũy.

### 4. 🎮 Trải Nghiệm RPG Đỉnh Cao
* Giao diện Dark Fantasy Guild huyền ảo, mượt mà, responsive trên cả điện thoại và máy tính.
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

2. Cấu hình file `.env` (đã có mẫu trong `.env.example`):
   ```env
   USE_CUSTOM_AI=true
   CUSTOM_AI_BASE_URL=https://...
   CUSTOM_AI_API_KEY=your_key
   CUSTOM_AI_MODEL=gpt-4o-mini
   MODEL_WORKER=gpt-4o-mini      # Worker: Tắt thinking để gọi tool siêu tốc (< 1s)
   MODEL_BRAIN=gpt-4o-mini       # Brain: Bật thinking (low) để thẩm định sâu và chặt chẽ
   REDIS_URL=redis://...
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
   * `REDIS_URL`
4. Bấm **Deploy** $\rightarrow$ Web hoạt động ngay lập tức!
