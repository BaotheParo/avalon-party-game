# AVALON: CUỘC CHIẾN BÀN TRÒN (9-PLAYER "NO-SLEEP" PARTY EDITION)

> **Web Game Ẩn Vai Suy Luận Đỉnh Cao Dành Cho 9 Người Chơi Trên Điện Thoại Di Động**  
> Bản tiếng Việt hoàn chỉnh • Đồng bộ thời gian thực P2P WebRTC không cần cấu hình backend • Đóng gói 1 file HTML duy nhất nhúng được vào Google Sites / Vercel / GitHub Pages.

---

## 🌟 TÍNH NĂNG NỔI BẬT

### 1. Đồng Bộ Thời Gian Thực Không Cần Backend (Zero-Config Serverless WebRTC)
- **Kiến trúc Star Topology qua PeerJS:**
  - **Chủ Phòng (Host):** Nhấn **"Tạo Phòng Mới (Host)"**, hệ thống tự động tạo mã phòng 4 chữ số (VD: `8899`) và mở một Peer Node độc quyền `avalon-party-2026-[ROOM_CODE]`.
  - **Người Chơi (Client):** 8 người chơi còn lại chỉ cần quét mã QR hoặc nhập mã 4 chữ số trên điện thoại của mình để kết nối thẳng tới Host.
  - **Không tốn phí, không cần database server:** Hoạt động hoàn toàn qua WebRTC P2P miễn phí trên hạ tầng PeerJS Cloud Server + Google STUN.
- **Mã QR Quét Vào Ngay (Quick Join):**
  - Màn hình sảnh của Chủ phòng tự động vẽ mã QR độ nét cao chứa liên kết `?room=[ROOM_CODE]`. Bạn bè chỉ cần giơ camera điện thoại quét là tự động vào phòng!
- **Khôi Phục Phiên Chơi Khi F5 / Mất Mạng (Session Persistence):**
  - Lưu trữ `playerId`, `playerName`, `skinId`, `roomCode` trong `localStorage`.
  - Người chơi lỡ tắt trình duyệt, khóa màn hình điện thoại hay tải lại trang sẽ được tự động nhận diện lại đúng ghế ngồi và vai trò bí mật của mình mà không làm gián đoạn ván chơi.

### 2. Tùy Biến Thân Phận RPG Pixel & Danh Hiệu
- **12 Skin Pixel RPG Độc Đáo:** *Thánh Kỵ Sĩ, Pháp Sư Cổ Ngữ, Sát Thủ Huyết Nguyệt, Hộ Vệ Ánh Sáng, Chiêu Hồn Sư, Cung Thủ Tinh Linh, Nữ Chiến Thần, Chiến Binh Cuồng Nộ, Đức Vua Camelot, Phù Thủy Hắc Ám, Thợ Săn Bóng Đêm, Long Kỵ Sĩ*.
- **5 Khung Avatar Huyền Ảo:** *Cốc Thánh Hoàng Kim, Hào Quang Pháp Thuật, Lửa Địa Ngục, Rừng Thiêng Avalon, Bóng Tối Hư Không*.
- Đổi tên hiển thị (tối đa 16 ký tự) và danh hiệu trong sảnh, đồng bộ tức thì lên tất cả điện thoại.

### 3. Luật Chơi Chuẩn Quốc Tế Indie Boards & Cards (5–10 Người, Chuẩn 9 Người)
- **Tỷ lệ Phe Tiệc 9 Người:** 6 Phe Thiện vs 3 Phe Ác.
  - **Phe Thiện:** 1 Merlin Đại Pháp Sư, 1 Hộ Vệ Percival, 4 Hiệp Sĩ Bàn Tròn.
  - **Phe Ác:** 1 Phù Thủy Morgana, 1 Sát Thủ (Assassin), 1 Trùm Cuối Mordred (Ẩn mình trước Merlin).
  - **Tùy chọn mở rộng:** Bóng Ma Oberon (Phe Ác đơn độc), Nữ Thần Hồ Nước (Lady of the Lake), Chọn Nhiệm Vụ Tự Do (Targeting).
- **Cơ chế "Không Cần Nhắm Mắt" (Zero-Sleep Secret Engine):**
  - Không cần quản trò đọc lệnh nhắm mắt/mở mắt.
  - Mỗi người chơi **Nhấn & Giữ** thẻ bài 3D trên màn hình điện thoại của mình để xem tình báo mật:
    - **Merlin:** Thấy rõ mặt toàn bộ Phe Ác (ngoại trừ Mordred).
    - **Percival:** Thấy 2 ứng viên ("Merlin hoặc Morgana") để quan sát và phân định.
    - **Phe Ác:** Nhận diện toàn bộ đồng bọn Phe Ác.
    - **Hiệp Sĩ:** Nhận gợi ý suy luận chiến thuật.
- **Ma Trận 5 Nhiệm Vụ Chuẩn 9 Người:**
  - `Q1`: 3 người • `Q2`: 4 người • `Q3`: 4 người • `Q4`: 5 người (**Cần tối thiểu 2 lá Thất Bại mới hỏng**) • `Q5`: 5 người.
- **Biểu Quyết Công Khai (Public Team Vote):**
  - Bỏ phiếu Đồng ý (Trắng) / Phản đối (Đen) đồng loạt, mở thẻ cùng lúc kèm bộ đếm từ chối (Từ chối 5 lần liên tiếp $\to$ Phe Ác thắng ngay).
- **Thực Hiện Nhiệm Vụ Ẩn & Chống Nhìn Trộm (Anti-Thumb Tracking):**
  - Phe Thiện chỉ được chọn Thành Công (Cốc Vàng).
  - Vị trí nút bấm đảo ngẫu nhiên trái/phải để người ngồi cạnh không thể đoán được lá bài dựa trên góc đặt ngón tay cái!
  - Lật mở Cốc Thánh tuần tự với hiệu ứng kịch tính.
- **Pha Ám Sát Cuối Game (Assassination):**
  - Nếu Phe Thiện thắng 3 nhiệm vụ, Sát Thủ Phe Ác chọn 1 người để ám sát. Trúng Merlin $\to$ Phe Ác lật ngược thế cờ!
- **Nữ Thần Hồ Nước (Lady of the Lake):**
  - Kích hoạt sau nhiệm vụ 2, 3, 4. Soi rõ lòng trung thành (Phe Thiện / Phe Ác) của một người chơi chưa từng giữ token.

### 4. Đồ Họa PixelFX & Âm Thanh Web Audio API
- **Hiệu ứng hạt Canvas Particle:**
  - `holy_pillar`: Cột sáng hoàng kim bay lên khi Nhiệm Vụ Thành Công.
  - `dark_slash`: Nhát chém đỏ máu rực lửa khi Nhiệm Vụ Thất Bại.
  - `arcane_water`: Vòng xoáy sóng nước khi soi Nữ Thần Hồ Nước.
  - `blood_dagger`: Tia chớp đỏ khi Sát Thủ tung nhát kiếm quyết định.
- **Âm thanh Synthesizer:** Tiếng chuông thánh ca, trống dồn, hiệu ứng gõ thẻ và âm hưởng khải hoàn.

### 5. Chế Độ 1 Máy / Quản Trò (Pass & Play)
- Tích hợp sẵn công tắc chuyển đổi giữa **"Chế Độ Nhiều Điện Thoại (Online)"** và **"Chế Độ 1 Máy (Pass & Play)"** để làm phương án dự phòng khi có người hết pin hoặc mất mạng.

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY LOCAL

Yêu cầu: Đã cài đặt **Node.js $\ge 18$** và **pnpm** (hoặc npm).

```bash
# 1. Di chuyển vào thư mục dự án
cd "d:/Project CV/AVALON"

# 2. Cài đặt thư viện phụ thuộc
pnpm install

# 3. Chạy môi trường phát triển (Local Server)
pnpm run dev
# -> Mở http://localhost:5173 trên trình duyệt máy tính hoặc điện thoại cùng mạng Wi-Fi
```

---

## 📦 HƯỚNG DẪN XUẤT BẢN & NHÚNG GOOGLE SITES

### Cách 1: Nhúng Trực Tiếp Vào Google Sites (Single File HTML)
Nhờ plugin `vite-plugin-singlefile`, toàn bộ mã nguồn JavaScript, CSS, âm thanh và hình ảnh SVG được nén thành **đúng 1 file duy nhất**: `dist/index.html`.

1. Chạy lệnh build:
   ```bash
   pnpm run build
   ```
2. Mở file `dist/index.html` trong Notepad hoặc VS Code, nhấn `Ctrl + A` rồi `Ctrl + C` để sao chép toàn bộ nội dung.
3. Vào trang quản trị **Google Sites**:
   - Chọn mục **Chèn (Insert)** $\to$ **Nhúng (Embed)** $\to$ Chọn tab **Nhúng mã (Embed code)**.
   - Dán toàn bộ nội dung vừa copy vào và nhấn **Tiếp theo (Next)** $\to$ **Chèn (Insert)**.
   - Kéo khung nhúng toàn màn hình. Ứng dụng sẽ chạy ngay lập tức mà không cần bất kỳ backend hay server nào!

### Cách 2: Triển Khai Miễn Phí Lên Vercel / Netlify / GitHub Pages
- **Vercel:**
  ```bash
  npx vercel --prod
  ```
- **Netlify:**
  - Kéo thả thư mục `dist/` vào trang quản lý https://app.netlify.com/drop.
- **GitHub Pages:**
  - Đẩy thư mục `dist/` lên branch `gh-pages` của kho lưu trữ.

---

## 🏰 CẤU TRÚC DỰ ÁN

```
d:/Project CV/AVALON/
├── dist/
│   └── index.html               # File build độc lập duy nhất (850 KB) nhúng Google Sites
├── src/
│   ├── App.tsx                  # Toàn bộ Game Engine, PeerJS WebRTC, State Machine & UI
│   ├── main.tsx                 # React DOM Root
│   └── index.css                # Tailwind CSS + 3D Card Animation Styles
├── index.html                   # HTML Entry template
├── package.json                 # Dependencies & Build scripts
├── vite.config.ts               # Cấu hình Vite Singlefile (base: './')
├── tailwind.config.js           # Cấu hình chủ đề Medieval Fantasy
├── tsconfig.json                # TypeScript compiler config
└── README.md                    # Tài liệu hướng dẫn chi tiết
```
