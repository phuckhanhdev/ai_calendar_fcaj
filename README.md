# Hướng dẫn chạy dự án AI Calendar

Dự án này được xây dựng bằng Next.js. Dưới đây là hướng dẫn cài đặt và khởi chạy dự án ở môi trường local.

## 1. Cài đặt tự động (Khuyến nghị)
Bạn chỉ cần chạy script `setup.sh` để hệ thống tự động thiết lập file `.env.local` (nếu chưa có) và tải các modules cần thiết về:

Chạy lệnh sau tại thư mục gốc của dự án:
```bash
./setup.sh
```

---

## 2. Cài đặt thủ công (Nếu không dùng script tự động)

### Bước A: Cài đặt các thư viện (Dependencies)
Dự án sử dụng các thư viện ngoài được liệt kê trong `package.json`. Để cài đặt toàn bộ thư viện cần thiết mà không cần tải thư mục `node_modules` nặng nề lên Git, chạy lệnh sau ở terminal tại thư mục gốc của dự án:
```bash
npm install
```

### Bước B: Cấu hình biến môi trường (Environment Variables)
1. Copy file `.env.example` thành file `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Mở file `.env.local` vừa tạo và cập nhật các cấu hình kết nối Database, API keys (Gemini, Bedrock) và cấu hình email theo đúng thông số của bạn.

---

## 3. Khởi chạy dự án ở môi trường phát triển (Development)
Sau khi cài đặt xong thư viện và cấu hình môi trường, chạy lệnh sau để khởi động dev server:

```bash
npm run dev
```

Server sẽ chạy tại địa chỉ: [http://localhost:3000](http://localhost:3000).

---

## Quản lý mã nguồn với Git

Để tối ưu bộ nhớ và bảo mật, dự án đã cấu hình file `.gitignore` để phân loại:

### Những thứ CẦN đưa lên Git:
- Thư mục nguồn: `src/` (chứa toàn bộ logic code, components, database schema...)
- Thư mục tĩnh: `public/` (ảnh, icon, font...)
- Cấu hình dự án: `package.json`, `package-lock.json`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `docker-compose.yml`, `README.md`, `.gitignore`, `.env.example`, `setup.sh`

### Những thứ KHÔNG NÊN đưa lên Git (sẽ được tải/sinh ra khi chạy):
- `node_modules/`: Thư mục chứa thư viện đã tải (tải lại bằng script hoặc lệnh `npm install`).
- `.next/`, `out/`, `build/`: Các file được sinh ra sau khi build dự án (sinh ra khi chạy `npm run build`).
- `.env.local`, `.env.*.local`: Các file cấu hình chứa API Key, mật khẩu database (tránh lộ thông tin bảo mật).
- `.DS_Store` (trên macOS): File hệ thống tự sinh.