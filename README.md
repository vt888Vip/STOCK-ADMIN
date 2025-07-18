# Financial Platform - Admin Dashboard

Ứng dụng giao dịch tài chính với trang quản trị admin đầy đủ tính năng.

## 🚀 Tính năng chính

### Trang Admin
- **Dashboard tổng quan**: Thống kê người dùng, giao dịch, doanh thu
- **Quản lý người dùng**: Xem danh sách, thông tin CCCD, ngân hàng, trạng thái
- **Lịch sử giao dịch**: Theo dõi tất cả giao dịch nạp/rút tiền
- **Nạp tiền**: Nạp tiền thủ công cho user, duyệt yêu cầu nạp tiền
- **Quản lý ngân hàng**: Thêm/sửa thông tin ngân hàng để user chuyển khoản
- **Bảo mật**: Role-based access control, xác thực JWT

### Trang Người dùng
- Giao dịch chứng khoán real-time
- Nạp/rút tiền
- Lịch sử giao dịch
- Quản lý tài khoản

## 🛠️ Cài đặt và chạy

### 1. Cài đặt MongoDB
- Tải và cài đặt [MongoDB Community Server](https://www.mongodb.com/try/download/community)
- Cài đặt [MongoDB Compass](https://www.mongodb.com/try/download/compass) để quản lý database

### 2. Cấu hình môi trường
Tạo file `.env.local` trong thư mục gốc:

```env
MONGODB_URI=mongodb://localhost:27017/financial_platform
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

### 3. Cài đặt dependencies
```bash
pnpm install
```

### 4. Khởi tạo database
```bash
# Dọn dẹp database cũ (nếu có)
node scripts/cleanup-personal-data.js

# Thêm tài khoản admin
node scripts/add-admin-safe.js
```

### 5. Chạy ứng dụng
```bash
pnpm dev
```

Ứng dụng sẽ chạy tại: http://localhost:3000

## 🔐 Đăng nhập Admin

Sau khi chạy script thêm admin, bạn có thể đăng nhập với:

- **URL**: http://localhost:3000/admin
- **Username**: admin
- **Password**: admin123

## 📱 Giao diện

### Trang Admin
- **Responsive design**: Hoạt động tốt trên desktop và mobile
- **Dark/Light theme**: Tự động theo hệ thống
- **Real-time updates**: Dữ liệu cập nhật theo thời gian thực
- **Intuitive UI**: Giao diện trực quan, dễ sử dụng

### Tính năng bảo mật
- JWT authentication
- Role-based access control
- Session management
- CSRF protection

## 🗂️ Cấu trúc dự án

```
src/
├── app/
│   ├── (admin)/          # Trang admin
│   ├── (auth)/           # Trang đăng nhập/đăng ký
│   ├── (user)/           # Trang người dùng
│   └── api/              # API endpoints
├── components/           # React components
├── lib/                  # Utilities và helpers
└── models/               # Database models
```

## 🔧 Scripts hữu ích

```bash
# Dọn dẹp database
node scripts/cleanup-personal-data.js

# Thêm tài khoản admin
node scripts/add-admin-safe.js

# Chạy development server
pnpm dev

# Build production
pnpm build

# Start production
pnpm start
```

## 🐛 Xử lý lỗi thường gặp

### Lỗi kết nối MongoDB
- Đảm bảo MongoDB service đang chạy
- Kiểm tra MONGODB_URI trong .env.local
- Thử kết nối qua MongoDB Compass

### Lỗi đăng nhập admin
- Chạy lại script `add-admin-safe.js`
- Kiểm tra console browser để xem lỗi
- Xóa localStorage và thử lại

### Lỗi chuyển hướng
- Kiểm tra file `useAuth.tsx`
- Đảm bảo token được lưu đúng cách
- Kiểm tra role của user trong database

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra console browser (F12)
2. Kiểm tra terminal nơi chạy server
3. Kiểm tra MongoDB Compass để xem dữ liệu
4. Chạy lại các script khởi tạo

## 🎯 Tính năng đã hoàn thành

- ✅ Dashboard tổng quan với thống kê
- ✅ Quản lý người dùng với thông tin đầy đủ
- ✅ Lịch sử giao dịch nạp/rút tiền
- ✅ Nạp tiền thủ công cho user
- ✅ Quản lý ngân hàng
- ✅ Responsive design
- ✅ Real-time updates

## 🎯 Tính năng sắp tới

- [ ] Thêm biểu đồ thống kê
- [ ] Export dữ liệu ra Excel
- [ ] Push notifications
- [ ] Multi-language support
- [ ] Advanced filtering
- [ ] Bulk operations
- [ ] Quản lý rút tiền
- [ ] Báo cáo chi tiết
