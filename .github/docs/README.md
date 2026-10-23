# ⚔️ LevelUp — Gamified Productivity & Habit RPG Guild

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](package.json)
[![Tests](https://img.shields.io/badge/tests-66%2F66%20passed%20(100%25)-brightgreen.svg)](test/run-all.js)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-purple.svg)](public/manifest.json)
[![Design](https://img.shields.io/badge/Design-Material%20Design%203-indigo.svg)](tailwind.config.js)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](#giấy-phép--bản-quyền)

**LevelUp** là ứng dụng Web RPG game hóa (Gamification) toàn diện công việc, học tập và thói quen hàng ngày. Dự án kết hợp công nghệ **Trợ lý Phù Thủy AI 2 tầng (Brain & Worker)**, **Trọng tài AI chống lạm phát (Anti-Inflation Arbiter)** với ký số mật mã học HMAC, **Thẩm định bằng chứng thị giác (AI Vision & Cloud Storage)**, **Ngân hàng tự động AMM đa kỳ hạn**, và **Đồng bộ thời gian thực qua Redis Cloud**.

Ứng dụng hỗ trợ chuẩn **Progressive Web App (PWA)** cài đặt như Native App trên iOS/Android và sẵn sàng triển khai lên **Vercel Serverless** chỉ với 1 cú click!

---

## 📑 Mục Lục
1. [Kiến Trúc Tổng Thể](#-kiến-trúc-tổng-thể)
2. [Tính Năng Cốt Lõi](#-tính-năng-cốt-lõi)
3. [Cấu Trúc Thư Mục](#-cấu-trúc-thư-mục)
4. [Hệ Thống 19 Module Client](#-hệ-thống-19-module-client-srcjs)
5. [Hướng Dẫn Cài Đặt & Chạy Cục Bộ](#-hướng-dẫn-cài-đặt--chạy-cục-bộ-local-development)
6. [Cấu Hình Biến Môi Trường (.env)](#-cấu-hình-biến-môi-trường-env)
7. [Kiểm Thử Tự Động (66 Test Suites)](#-kiểm-thử-tự-động-automated-testing)
8. [Hướng Dẫn Deploy Lên Vercel](#-hướng-dẫn-deploy-lên-vercel)
9. [Bảo Mật & Cơ Chế Anti-Cheat](#-bảo-mật--cơ-chế-anti-cheat)
10. [Giấy Phép & Bản Quyền](#-giấy-phép--bản-quyền)

---

## 🏛️ Kiến Trúc Tổng Thể

```mermaid
flowchart TD
    subgraph Client ["Client Layer (PWA & Material Design 3)"]
        UI["Giao diện RPG Guild (HTML5 / Tailwind M3)"]
        Modules["Archived legacy fixtures (test/fixtures/legacy-client/)"]
        Timer["Đồng hồ Pomodoro & Audio Synthesizer 8-bit"]
        LocalStore["localStorage Cache (Anti-FOUT / Anti-FOUC)"]
    end

    subgraph Serverless ["Serverless API Layer (Express / Vercel Edge)"]
        APIAI["/api/ai.js\n(Trọng tài, Trợ lý, Vision & Tranh biện)"]
        APISync["/api/sync.js\n(Xác thực, Ký số HMAC & Đồng bộ Redis)"]
        APIStorage["/api/storage.js\n(Quản lý tải ảnh bằng chứng)"]
        Valibot["Valibot Schemas\n(Type-safety & Payload Validation)"]
    end

    subgraph External ["Dịch Vụ Đám Mây & AI Models"]
        Brain["Model Brain (Thinking ON)\nSuy luận chiến lược & đàm phán"]
        Worker["Model Worker (Thinking OFF)\n9 Tools Function Calling (< 1s)"]
        Redis["Redis Cloud / Upstash\n(Presence, Leaderboard, Sync Timer)"]
        Google["Google Identity Services\n(Xác thực OAuth 2.0 an toàn)"]
        CloudStorage["Supabase Storage / Cloudflare R2\n(Lưu ảnh bằng chứng nhiệm vụ)"]
    end

    UI --> Modules
    Modules --> LocalStore
    Modules --> Timer
    Modules -->|Fetch & SSE Stream| Serverless

    APIAI --> Valibot
    APISync --> Valibot
    APIAI --> Brain
    APIAI --> Worker
    APIAI --> CloudStorage
    APISync --> Redis
    APISync --> Google
    APIStorage --> CloudStorage
```

---

## 🌟 Tính Năng Cốt Lõi

### 1. 🧙‍♂️ Trợ Lý Phù Thủy AI — Kiến Trúc Brain & Worker
* **Mô hình 2 tầng tối ưu chi phí & tốc độ:**
  * **Model Worker (Thinking OFF):** Thực thi 9 công cụ chuyên biệt siêu tốc (< 1s) để truy vấn hồ sơ mạo hiểm giả, tra cứu nhiệm vụ, kiểm tra kho bạc, tạo quest/reward tự động hoặc tính toán nợ ngân hàng.
  * **Model Brain (Thinking ON):** Tổng hợp dữ liệu chuyên sâu, phân tích tâm lý người chơi và vạch ra chiến lược phát triển bản thân đậm chất nhập vai.
* **Server-Sent Events (SSE) Streaming:** Truyền dữ liệu từng token theo thời gian thực kèm trực quan hóa tiến trình 4 bước của AI.
* **Hỗ trợ 9 Tools Function Calling:**
  1. `get_user_profile`: Đọc cấp độ, vàng, chuỗi ngày, danh hiệu.
  2. `get_user_quests`: Lấy danh sách nhiệm vụ đang mở.
  3. `get_user_shop`: Xem tiệm phần thưởng và kho đồ.
  4. `get_bank_account`: Kiểm tra tiền gửi, nợ vay, hạn mức tín dụng.
  5. `get_user_ledger`: Tra cứu lịch sử thu chi tài chính.
  6. `get_project_knowledge`: Đọc cơ chế luật chơi và kinh tế guild.
  7. `create_quest`: Tạo nhiệm vụ trực tiếp vào danh sách.
  8. `create_reward`: Thêm phần thưởng mong muốn vào tiệm.
  9. `suggest_action_plan`: Đề xuất lộ trình hành động kỷ luật.

### 2. ⚖️ Thẩm Phán AI Khó Tính (Anti-Inflation Arbiter)
* **Quy chuẩn định giá chống lạm phát:** Tự động cắt giảm các mức tiền thưởng tự định giá phi thực tế (chuẩn: ~10-12 Vàng cho 25 phút tập trung).
* **Phân loại nhiệm vụ nghiêm ngặt:**
  * Nhiệm vụ học tập, đọc sách, viết code, nghiên cứu... bắt buộc phải đo bằng **Đồng hồ Pomodoro Focus**.
  * Chỉ những công việc có kết quả đầu ra cụ thể, kiểm chứng được (dọn phòng, tập gym, giao hàng) mới được tạo dưới dạng **Bounty**.
* **Tranh biện & Đàm phán (Debate Modal):** Cho phép người chơi chat giải trình lý do với Thẩm phán nếu gặp việc quá khó hoặc đột xuất để xin nâng thưởng.

### 3. 📸 Thẩm Định Bằng Chứng Thị Giác (Quest Proof & AI Vision)
* **Bằng chứng đa phương thức:** Hỗ trợ chụp ảnh trực tiếp qua Web Camera, tải file ảnh từ thiết bị hoặc nhập mô tả kết quả hoàn thành.
* **Lưu trữ đám mây tốc độ cao:** Tự động upload ảnh lên **Supabase Storage** (không cần thẻ ngân hàng) hoặc **Cloudflare R2** (qua AWS S3 SDK).
* **AI Vision Arbitration:** Model AI Vision phân tích ảnh thực tế để xác nhận nhiệm vụ đã hoàn thành trung thực trước khi phát thưởng.
* **Lịch sử bằng chứng (Proof History):** Xem lại toàn bộ ảnh và mô tả bằng chứng đã nộp kèm kết luận thẩm định từ AI.

### 4. 🛡️ Cơ Chế Bảo Mật & Ký Số Mật Mã Chống Gian Lận
* **Chữ ký điện tử HMAC-SHA256:** Mọi nhiệm vụ, phần thưởng và hợp đồng vay đều được ký số phía server (`signQuest`, `signReward`, `signLoanOffer`). Client không thể tự ý sửa đổi thưởng trong `localStorage`.
* **Phát hiện can thiệp số dư (Balance Tampering):** Máy chủ kiểm tra tính toán toàn vẹn giữa Vàng hiện tại, tổng vàng tích lũy và lịch sử giao dịch.
* **Xử phạt nghiêm khắc:** Tự động trừ phạt Vàng, tước danh hiệu thành *"Kẻ Gian Lận ⚠️"* và tống vào **Sổ Đen Gian Lận** (`levelup:cheaters`), loại khỏi Bảng Xếp Hạng.
* **Thử thách chuộc tội (Redemption Quest):** Kẻ gian lận muốn hoàn lương phải hoàn thành nghiêm túc **5 phiên Pomodoro Focus (≥ 25 phút)** để chuộc tội và lấy lại danh dự.

### 5. 🔥 Chuỗi Ngày Kiên Trì (Daily Streak) & Biểu Đồ Thói Quen (Tracker)
* **Hệ số nhân thưởng theo chuỗi:** Tự động tích lũy chuỗi ngày, nhân thưởng Vàng và EXP từ **x1.05 đến x1.50+**.
* **Thang danh hiệu 7 cấp bậc:** Từ *Tân Binh Cấp 1*, *Học Viên Chăm Chỉ*, *Chiến Binh Kiên Trì*, *Chuyên Gia Tập Trung*, *Bậc Thầy Năng Suất* đến *Huyền Thoại Kỷ Luật*.
* **Theo dõi tần suất (Frequency Habit Tracker):** Biểu đồ Heatmap và ma trận tần suất giúp theo dõi mức độ kỷ luật qua từng tuần và tháng.

### 6. 🏦 Ngân Hàng Bang Hội LevelUp AI Bank (Mô Hình AMM Đa Kỳ Hạn)
* **Sổ Tiết Kiệm Đa Kỳ Hạn Sinh Lời Theo Giờ:**
  * Hỗ trợ gửi linh hoạt (không kỳ hạn) và gửi có kỳ hạn (3 ngày, 7 ngày, 14 ngày, 30 ngày).
  * Lãi suất thả nổi theo mô hình AMM Utilization Rate (1% - 8%/ngày).
  * Bảo hiểm lãi sàn: Gửi $\ge$ 10 Vàng qua $\ge$ 24h luôn nhận tối thiểu 1 Vàng lãi.
  * Bảo toàn thời gian dở dang khi nạp thêm tiền.
* **Quầy Vay Vốn Tức Thời:**
  * Hạn mức tín dụng tự động phê duyệt dựa trên Cấp độ, Chuỗi ngày Streak và Tỷ lệ trích nợ cam kết.
  * Tự động trích nợ 0% phí phạt mỗi khi người chơi hoàn thành nhiệm vụ có thưởng.
* **Kho Bạc Bảo Chứng 100% (Reserve & Bailout Pool):** Cơ chế quỹ dự phòng khẩn cấp đảm bảo thanh khoản an toàn tuyệt đối cho người gửi tiền.
* **Sổ Cái Tài Chính (Ledger):** Nhật ký biến động số dư minh bạch, phân loại thu/chi chi tiết.

### 7. 🏪 Tiệm Quán Trọ (Tavern Shop) & Kho Đồ (Inventory)
* Đưa vào danh sách các phần thưởng mong muốn (xem phim, ăn trà sữa, mua đồ công nghệ).
* AI thẩm định độ cám dỗ và ấn định mức Vàng tương xứng với công sức.
* Mua quà $\rightarrow$ Lưu vào **Chiến Lợi Phẩm (Inventory)** $\rightarrow$ Bấm "Hưởng thụ ngay" khi bắt đầu xả hơi không chút tội lỗi. Có chức năng hoàn tiền (Refund) và hoàn tác (Undo).

### 8. 🎨 Hệ Thống Thiết Kế Material Design 3 (M3)
* **Hệ thống Color Tokens M3:** Hỗ trợ đầy đủ các vai trò màu `primary`, `surface-container`, `outline`, cùng các token RPG đồng bộ (`gold`, `mana`, `streak`, `xp`).
* **Dynamic Palette Switcher:** Dễ dàng đổi chủ đề màu sắc (Modern Indigo, Emerald, Amber, Rose...) kèm chuyển đổi Dark/Light mode không nháy hình (Anti-FOUT & Anti-FOUC).
* **M3 Motion & Progress:** Áp dụng đường cong chuyển động M3 (Standard, Decelerate, Accelerate) và thanh tiến trình mượt mà.

### 9. 📱 Trải Nghiệm PWA & Di Động Đỉnh Cao
* **Cài đặt như Native App:** Hỗ trợ Progressive Web App với bộ icon chuẩn Apple HIG cho iOS Safari (180x180 px) và Android Chrome (Maskable 192x192, 512x512 px).
* **Đồng hồ Focus đa nền tảng:** Đồng bộ timer thời gian thực đa thiết bị qua Redis, tích hợp Screen Wake Lock API và Web Notifications khi hết giờ.
* **Âm thanh 8-bit sống động:** Tạo trực tiếp bằng Web Audio API, không tốn băng thông tải file âm thanh ngoài.
* **Phím tắt tiện dụng:** `Alt + A` mở Trợ Lý AI, `Space` kích hoạt/dừng Pomodoro, `Escape` đóng nhanh modal.

---

## 📁 Cấu Trúc Thư Mục

```text
LevelUp/
├── api/                           # Serverless Functions (Vercel Edge / Node.js)
│   ├── ai.js                      # Trợ lý Brain & Worker, Thẩm phán AI, Vision & Đàm phán
│   ├── storage.js                 # Upload ảnh bằng chứng lên Supabase Storage / Cloudflare R2
│   └── sync.js                    # Xác thực Google, Đồng bộ Redis, Ký số HMAC & Anti-cheat
├── src/                           # Mã nguồn phát triển giao diện & logic
│   ├── js/                        # 19 Module nghiệp vụ chuyên biệt
│   ├── schemas/                   # Khai báo Schema xác thực dữ liệu bằng Valibot
│   │   ├── ai.js                  # Schemas cho kết quả thẩm định, đàm phán, trợ lý AI
│   │   └── game.js                # Schemas cho Quest, Reward, Bank, Loan & State Sync
│   └── tailwind.css               # Nguồn cấu hình Tailwind CSS & Custom RPG Tokens
├── public/                        # Thư mục Web tĩnh & PWA Assets
│   ├── index.html                 # Khung giao diện chính và các modal RPG
│   ├── (không có app.js)          # Legacy bundle đã được gỡ khỏi production
│   ├── tailwind.min.css           # File CSS đã compile và minify
│   ├── style.css                  # Tùy biến hoạt họa và giao diện M3 RPG
│   ├── manifest.json              # Khai báo Progressive Web App
│   ├── apple-touch-icon.png       # Icon chuẩn Apple HIG cho iOS Safari
│   ├── icon-192.png               # Icon PWA độ phân giải 192x192
│   └── logo.svg                   # Vector logo thương hiệu LevelUp
├── scripts/                       # Scripts tự động hóa và bảo trì
│   └── reset-data.js              # Script dọn dẹp và reset dữ liệu Redis & Cloud Storage
├── test/                          # Bộ kiểm thử tự động toàn diện (66 Test Suites)
│   ├── run-all.js                 # Test runner thực thi toàn bộ 66 bài kiểm tra
│   └── *.test.js                  # Các bộ test chuyên biệt từng tính năng
├── .env.example                   # Tệp mẫu hướng dẫn cấu hình biến môi trường
├── package.json                   # Cấu hình dự án, scripts và dependencies
├── server.js                      # Máy chủ phát triển cục bộ (Express + API Proxy)
├── tailwind.config.js             # Cấu hình Tailwind CSS với hệ thống Material 3
├── tsconfig.json                  # Cấu hình kiểm tra kiểu TypeScript (type-check)
├── vercel.json                    # Cấu hình định tuyến và Security Headers cho Vercel
└── vite.config.js                 # Cấu hình dự phòng Vite Dev Server
```

---

## 🧩 Archived Legacy Client Fixtures

Các module dưới đây là bản lưu lịch sử để phục vụ test hồi quy; logic giao diện hiện tại thuộc Next.js/React và không đọc các file này:

| STT | Tệp Module | Phân Vùng Chức Năng & Nghiệp Vụ |
| :---: | :--- | :--- |
| 1 | `01-sound.js` | **Web Audio Synthesizer:** Giả lập hiệu ứng âm thanh 8-bit RPG (coin, gong, fanfare, click) hoàn toàn bằng code. |
| 2 | `02-state.js` | **State & Initial Seed:** Khởi tạo trạng thái mặc định của mạo hiểm giả, cấp độ, danh hiệu và bảng thiết lập ban đầu. |
| 3 | `03-storage.js` | **Storage & Sync Manager:** Quản lý `localStorage`, phòng chống nhấp nháy FOUC/FOUT, điều khiển Dark/Light mode và đồng bộ Redis. |
| 4 | `04-toast.js` | **Toast & Celebrations:** Hệ thống thông báo toast notification, modal xác nhận hành động và hiệu ứng ăn mừng pháo hoa Confetti. |
| 5 | `05-streak.js` | **Daily Streak Engine:** Quản lý chuỗi ngày kỷ luật, tính toán hệ số nhân thưởng Vàng/EXP và bảo vệ múi giờ chống gian lận. |
| 6 | `06-timer.js` | **Pomodoro Focus Timer:** Đồng hồ đếm ngược delta-time, chạy ngầm ổn định ở background tab, hỗ trợ Wake Lock và đồng bộ đa thiết bị. |
| 7 | `07-quest.js` | **Quest Management:** Thêm, xóa, hoàn thành nhiệm vụ, hỗ trợ hoàn tác (Undo), nhiệm vụ lặp lại hàng ngày (Repeatable) và phân loại thẻ. |
| 8 | `08-proof.js` | **Quest Proof & Camera Vision:** Xử lý bằng chứng hoàn thành nhiệm vụ (chụp ảnh camera, upload ảnh, nhập mô tả kết quả) cho AI Vision thẩm định. |
| 9 | `09-shop.js` | **Tavern Shop & Inventory:** Mua chiến lợi phẩm, quản lý kho đồ cá nhân, hỗ trợ hoàn tiền và hoàn tác sử dụng quà. |
| 10 | `10-arbiter.js` | **AI Arbiter & Auto-Suggestions:** Trọng tài AI thẩm định định giá nhiệm vụ khắt khe, tranh biện xin tăng thưởng và gợi ý nhiệm vụ thông minh. |
| 11 | `11-reward-ai.js` | **AI Reward Appraisal:** Thẩm định mức độ cám dỗ và ấn định giá Vàng hợp lý cho phần thưởng do người chơi tự đề xuất. |
| 12 | `12-leaderboard.js` | **Leaderboard & Presence:** Bảng vàng vinh danh Top 3 hiệp sĩ, tìm kiếm mạo hiểm giả, trạng thái online thời gian thực và Sổ Đen Gian Lận. |
| 13 | `13-admin.js` | **Guildmaster Dashboard:** Bảng điều khiển dành riêng cho Quản trị viên điều chỉnh cấp độ, thưởng/phạt vàng, xóa tài khoản và quản trị sổ cái. |
| 14 | `14-render.js` | **DOM Render Engine:** Render toàn bộ danh sách nhiệm vụ, tiệm phần thưởng, kho đồ, thanh tiến trình EXP, avatar và huy hiệu danh hiệu. |
| 15 | `15-modal.js` | **Modal & Navigation:** Quản lý đóng/mở bottom sheet, modal RPG, điều hướng tab trên Mobile/Desktop và hệ thống phím tắt toàn cục. |
| 16 | `16-tour.js` | **Onboarding Tour:** Hướng dẫn 7 bước tương tác trực quan dẫn dắt người chơi mới làm quen với quy tắc bang hội. |
| 17 | `17-bank.js` | **LevelUp AI Bank & AMM:** Sổ tiết kiệm đa kỳ hạn sinh lời theo giờ, quầy vay vốn tín chấp thông minh kèm trích nợ tự động 0% phí phạt. |
| 18 | `18-events.js` | **Global Event Listeners:** Gắn kết các sự kiện bàn phím, sự kiện click, vòng đời ứng dụng và giao tiếp đa tab qua `BroadcastChannel`. |
| 19 | `19-assistant.js` | **Guild Companion AI:** Giao diện trò chuyện tương tác với Phù Thủy Guild qua streaming thời gian thực và gọi công cụ chuyên sâu. |

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Local Development)

### Yêu cầu hệ thống:
* **Node.js:** Phiên bản v18.0.0 trở lên.
* **NPM:** Phiên bản v9.0.0 trở lên.

### Các bước cài đặt:

1. **Clone repository về máy:**
   ```bash
   git clone https://github.com/your-username/levelup.git
   cd levelup
   ```

2. **Cài đặt các gói phụ thuộc:**
   ```bash
   npm install
   ```

3. **Cấu hình biến môi trường:**
   Tạo file `.env` từ file mẫu:
   ```bash
   cp .env.example .env
   ```
   *(Điền các thông tin API Key, Redis URL theo hướng dẫn bên dưới).*

4. **Đóng gói mã nguồn Client & CSS:**
   ```bash
   npm run build
   ```

5. **Khởi chạy máy chủ phát triển (Development Server):**
   ```bash
   npm run dev
   ```
   Mở trình duyệt và truy cập: **`http://localhost:3000`**

### Các lệnh hữu ích khác:

| Lệnh | Ý Nghĩa Chức Năng |
| :--- | :--- |
| `npm run dev` | Biên dịch CSS rồi chạy Next.js với Turbopack. |
| `npm run build` | Biên dịch Tailwind CSS và tạo production build bằng Next.js. |
| `npm run build:css` | Biên dịch file Tailwind CSS với chế độ nén tối ưu (Minify). |
| `npm run watch:css` | Lắng nghe thay đổi trong CSS và HTML để tự động biên dịch lại Tailwind CSS. |
| `npm run type-check` | Kiểm tra tính toàn vẹn kiểu dữ liệu bằng TypeScript compiler mà không xuất file (`tsc --noEmit`). |
| `npm test` | Thực thi toàn bộ bộ kiểm thử tự động (66 test suites). |
| `npm run reset-data` | Dọn dẹp dữ liệu cũ trên Redis và Cloud Storage, đưa kho bạc về trạng thái ban đầu. |

---

## ⚙️ Cấu Hình Biến Môi Trường (.env)

Tạo file `.env` tại thư mục gốc với các khóa sau:

```env
# =============================================================================
# 1. Cấu hình AI (Tương thích OpenAI, OpenRouter hoặc Custom Gateway)
# =============================================================================
USE_CUSTOM_AI=true
CUSTOM_AI_BASE_URL=https://api.openai.com/v1
CUSTOM_AI_API_KEY=sk-your-openai-or-openrouter-key
CUSTOM_AI_MODEL=gpt-4o-mini
MODEL_WORKER=gpt-4o-mini      # Worker: Tắt thinking để gọi tool siêu tốc (< 1s)
MODEL_BRAIN=gpt-4o-mini       # Brain: Bật thinking để phân tích chiến lược sâu

# =============================================================================
# 2. Cơ Sở Dữ Liệu Redis Cloud (Lưu trữ trạng thái, Leaderboard & Sync Timer)
# =============================================================================
REDIS_URL=redis://default:password@your-redis-host:port

# =============================================================================
# 3. Xác Thực Google Identity Services (Google OAuth 2.0)
# =============================================================================
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com

# =============================================================================
# 4. Phân Quyền Quản Trị Viên Bang Hội (Guildmaster Admin)
# =============================================================================
ADMIN_EMAILS=guildmaster@gmail.com,admin@gmail.com
ADMIN_NICKNAMES=guildmaster,admin
ADMIN_TOKEN=your_super_secret_admin_token

# =============================================================================
# 5. Lưu Trữ Ảnh Bằng Chứng (Cloud Storage - Chọn 1 trong 2 tùy chọn)
# =============================================================================
# Tùy chọn 1: Supabase Storage (100% Miễn phí, KHÔNG CẦN THẺ - Khuyên dùng)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_or_anon_key
SUPABASE_BUCKET_NAME=proofs

# Tùy chọn 2: Cloudflare R2 Storage (Sử dụng chuẩn AWS S3 Client)
# R2_ACCOUNT_ID=your_cloudflare_account_id
# R2_ACCESS_KEY_ID=your_r2_access_key_id
# R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
# R2_BUCKET_NAME=levelup-proofs
# R2_PUBLIC_URL=https://pub-yourhash.r2.dev
```

---

## 🧪 Kiểm Thử Tự Động (Automated Testing)

Dự án áp dụng quy chuẩn kiểm thử nghiêm ngặt với **66 test suites tự động**, bao phủ 100% các luồng nghiệp vụ quan trọng:

* **Bảo mật & Ký số:** Xác thực HMAC, chống giả mạo số dư, cơ chế chuộc tội cho kẻ gian lận.
* **Trí tuệ nhân tạo:** Kiến trúc Brain & Worker, Server-Sent Events, cấu trúc JSON an toàn và AI Vision thẩm định ảnh.
* **Kinh tế & Ngân hàng:** AMM Utilization Rate, gửi tiết kiệm đa kỳ hạn, hạn mức vay vốn tín chấp, cứu trợ kho bạc.
* **Giao diện & Trải nghiệm:** Material Design 3 Color Tokens, Motion curves, Loading indicators, PWA Icons Apple HIG và phím tắt Pomodoro.

```bash
# Chạy toàn bộ 66 bộ kiểm thử:
npm test

# Hoặc chạy kiểm tra từng tính năng đơn lẻ:
node test/daily-streak-system.test.js
node test/ai-assistant-brain-worker.test.js
node test/bank-multi-term-savings.test.js
node test/quest-proof-ai-arbitration.test.js
node test/material-3-color-system.test.js
```

---

## ☁️ Hướng Dẫn Deploy Lên Vercel

Hệ thống được thiết kế theo kiến trúc chuẩn **Serverless Monorepo** sẵn sàng chạy trên Vercel:

1. Đẩy mã nguồn lên tài khoản GitHub / GitLab cá nhân.
2. Đăng nhập [Vercel Dashboard](https://vercel.com) $\rightarrow$ Chọn **Add New Project** $\rightarrow$ Import repository `LevelUp`.
3. Trong mục **Build and Output Settings**:
   * **Build Command:** `npm run build`
   * **Output Directory:** `public`
4. Cấu hình các biến môi trường trong mục **Environment Variables** (sao chép giá trị từ `.env`):
   * `CUSTOM_AI_BASE_URL`
   * `CUSTOM_AI_API_KEY`
   * `CUSTOM_AI_MODEL`
   * `MODEL_WORKER`
   * `MODEL_BRAIN`
   * `REDIS_URL`
   * `GOOGLE_CLIENT_ID`
   * `ADMIN_EMAILS`
   * `ADMIN_NICKNAMES`
   * `ADMIN_TOKEN`
   * `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` (hoặc cấu hình R2 tương ứng)
5. Nhấn **Deploy** $\rightarrow$ Hệ thống sẽ biên dịch CSS, đóng gói JS và triển khai toàn bộ Serverless Functions tại `/api/*` chỉ trong vòng chưa đầy 1 phút!

---

## 🔒 Bảo Mật & Cơ Chế Anti-Cheat

Hệ sinh thái LevelUp được thiết kế để bảo vệ tính công bằng tuyệt đối:

1. **HMAC Cryptographic Signatures:** Mọi nhiệm vụ và phần thưởng đều được băm mật mã từ máy chủ. Kẻ gian lận thay đổi dữ liệu trong `localStorage` sẽ lập tức bị máy chủ phát hiện chữ ký không hợp lệ khi đồng bộ.
2. **Deterministic Fallback Engine:** Nếu dịch vụ AI bên ngoài gặp sự cố, hệ thống tự động kích hoạt thuật toán thẩm định dự phòng cục bộ, đảm bảo người chơi không bị gián đoạn trải nghiệm.
3. **Thử thách Chuộc Tội (Redemption Path):** Người chơi bị phát hiện gian lận sẽ không thể xóa dữ liệu để trốn tránh. Hệ thống lưu vết vi phạm và chỉ gỡ phạt sau khi hoàn thành chuỗi 5 phiên tập trung kỷ luật có kiểm chứng.
4. **Rate Limiting & Token Extraction:** Bảo vệ toàn diện các API `/api/ai`, `/api/sync` và `/api/storage` chống tấn công spam hoặc lạm dụng tài nguyên.

---

## 📄 Giấy Phép & Bản Quyền

Dự án được phân phối dưới giấy phép **MIT License**. Bạn được toàn quyền sử dụng, sửa đổi và triển khai cho mục đích cá nhân hoặc thương mại.

---

<div align="center">
  <sub>Phát triển với tất cả tâm huyết vì tinh thần tự giác, kỷ luật và niềm vui trong cuộc sống! ⚔️🛡️</sub>
</div>
