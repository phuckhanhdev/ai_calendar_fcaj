#!/bin/bash

# Thiết lập màu sắc hiển thị
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== BẮT ĐẦU CÀI ĐẶT DỰ ÁN AI CALENDAR ===${NC}\n"

# 1. Kiểm tra và copy file cấu hình môi trường
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}[1/2] Tạo file cấu hình .env.local từ .env.example...${NC}"
    cp .env.example .env.local
    echo -e "${GREEN}✔ Đã tạo file .env.local thành công! Bạn hãy mở file này ra và điền các thông tin của bạn vào.${NC}\n"
else
    echo -e "${GREEN}[1/2] File .env.local đã tồn tại, bỏ qua bước tạo mới để giữ nguyên cấu hình hiện tại của bạn.${NC}\n"
fi

# 2. Cài đặt các modules cần thiết (node_modules)
echo -e "${YELLOW}[2/2] Đang chạy 'npm install' để tải các modules cần thiết...${NC}"
npm install

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✔ Cài đặt các thư viện thành công!${NC}"
    echo -e "\n${BLUE}=======================================${NC}"
    echo -e "${GREEN}Dự án đã sẵn sàng!${NC}"
    echo -e "1. Hãy cập nhật các thông số cần thiết trong file ${YELLOW}.env.local${NC}"
    echo -e "2. Chạy lệnh sau để khởi động dự án ở môi trường dev:"
    echo -e "   ${YELLOW}npm run dev${NC}"
    echo -e "${BLUE}=======================================${NC}"
else
    echo -e "\n${RED}✘ Quá trình chạy 'npm install' gặp lỗi. Vui lòng kiểm tra lại Node.js và npm trên máy của bạn.${NC}"
fi
