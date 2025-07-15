# Hướng dẫn Quản lý 30 Phiên Giao Dịch Tương Lai

## Tổng quan

Chức năng này cho phép admin **biết trước kết quả của 30 phiên giao dịch sắp tới với độ chính xác 100%**. Kết quả admin đặt sẽ được sử dụng chính xác khi phiên kết thúc.

## Tính năng chính

### 1. Tự động tạo 30 phiên tương lai
- Hệ thống tự động tạo 30 phiên giao dịch sắp tới
- Mỗi phiên cách nhau 1 phút
- Mỗi phiên kéo dài 1 phút
- Trạng thái ban đầu: `ACTIVE` (chưa có kết quả)

### 2. Đặt kết quả chính xác 100%
- Admin có thể đặt kết quả `UP` hoặc `DOWN` cho từng phiên
- Kết quả được đặt sẽ được sử dụng chính xác khi phiên kết thúc
- Trạng thái chuyển thành `PREDICTED` sau khi đặt kết quả

### 3. Quản lý hàng loạt
- Đặt kết quả cho nhiều phiên cùng lúc
- Tạo lại 30 phiên tương lai khi cần

## API Endpoints

### GET `/api/admin/session-results/future`
Lấy danh sách 30 phiên giao dịch tương lai

**Parameters:**
- `page`: Số trang (mặc định: 1)
- `limit`: Số phiên mỗi trang (mặc định: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "_id": "session_id",
        "sessionId": "202412011200",
        "startTime": "2024-12-01T12:00:00.000Z",
        "endTime": "2024-12-01T12:01:00.000Z",
        "status": "ACTIVE|PREDICTED",
        "result": "UP|DOWN|null",
        "createdBy": "admin|system",
        "createdAt": "2024-12-01T11:00:00.000Z",
        "updatedAt": "2024-12-01T11:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 30,
      "page": 1,
      "totalPages": 1,
      "limit": 30
    }
  }
}
```

### POST `/api/admin/session-results/future`

#### Action: `set_future_result`
Đặt kết quả cho một phiên tương lai

**Body:**
```json
{
  "action": "set_future_result",
  "sessionId": "202412011200",
  "result": "UP|DOWN"
}
```

#### Action: `bulk_set_future_results`
Đặt kết quả hàng loạt cho nhiều phiên

**Body:**
```json
{
  "action": "bulk_set_future_results",
  "sessionIds": ["202412011200", "202412011201", "202412011202"],
  "results": ["UP", "DOWN", "UP"]
}
```

#### Action: `generate_future_sessions`
Tạo lại 30 phiên giao dịch tương lai

**Body:**
```json
{
  "action": "generate_future_sessions"
}
```

## Giao diện người dùng

### Trang chính: `/admin/session-results/future`

#### Tính năng:
1. **Hiển thị danh sách 30 phiên tương lai**
   - Mã phiên
   - Thời gian bắt đầu/kết thúc
   - Thời gian còn lại đến khi bắt đầu
   - Trạng thái (ACTIVE/PREDICTED)
   - Kết quả đã đặt
   - Người đặt (Admin/System)

2. **Đặt kết quả từng phiên**
   - Nút "Đặt kết quả" cho phiên chưa có kết quả
   - Dialog chọn UP/DOWN
   - Xác nhận và lưu

3. **Đặt kết quả hàng loạt**
   - Nút "Đặt kết quả hàng loạt"
   - Dialog hiển thị tất cả phiên
   - Chọn kết quả cho từng phiên
   - Xác nhận và lưu hàng loạt

4. **Tạo lại 30 phiên**
   - Nút "Tạo lại 30 phiên"
   - Xóa phiên cũ và tạo phiên mới

#### Trạng thái hiển thị:
- **ACTIVE**: Chưa có kết quả (màu xanh)
- **PREDICTED**: Đã đặt kết quả (màu xanh lá)
- **UP**: Kết quả LÊN (màu xanh lá)
- **DOWN**: Kết quả XUỐNG (màu đỏ)

## Quy trình sử dụng

### 1. Truy cập trang
```
/admin/session-results/future
```

### 2. Xem danh sách 30 phiên tương lai
- Hệ thống tự động tạo 30 phiên nếu chưa có
- Hiển thị thời gian còn lại đến khi bắt đầu
- Phân biệt phiên đã có kết quả và chưa có

### 3. Đặt kết quả từng phiên
1. Click nút "Đặt kết quả" bên cạnh phiên
2. Chọn UP hoặc DOWN trong dialog
3. Click "Xác nhận"
4. Kết quả được lưu với độ chính xác 100%

### 4. Đặt kết quả hàng loạt
1. Click nút "Đặt kết quả hàng loạt"
2. Chọn kết quả cho từng phiên trong dialog
3. Click "Đặt kết quả hàng loạt"
4. Tất cả kết quả được lưu cùng lúc

### 5. Tạo lại 30 phiên
1. Click nút "Tạo lại 30 phiên"
2. Hệ thống xóa phiên cũ và tạo phiên mới
3. Danh sách được cập nhật

## Tích hợp với hệ thống

### 1. Khi phiên kết thúc
- Hệ thống kiểm tra xem có kết quả admin đặt không
- Nếu có: Sử dụng kết quả admin đặt (100% chính xác)
- Nếu không: Tạo kết quả ngẫu nhiên

### 2. Cập nhật trạng thái
- `ACTIVE` → `PREDICTED`: Khi admin đặt kết quả
- `PREDICTED` → `COMPLETED`: Khi phiên kết thúc

### 3. Lưu trữ thông tin
- `createdBy`: "admin" khi admin đặt, "system" khi tự động tạo
- `result`: Kết quả đã đặt (UP/DOWN)
- `updatedAt`: Thời gian cập nhật cuối

## Lưu ý quan trọng

### 1. Độ chính xác 100%
- Kết quả admin đặt sẽ được sử dụng chính xác
- Không có yếu tố ngẫu nhiên khi admin đã đặt kết quả
- Đảm bảo tính minh bạch và kiểm soát

### 2. Thời gian thực
- Hiển thị thời gian còn lại đến khi phiên bắt đầu
- Cập nhật real-time
- Cảnh báo khi phiên sắp bắt đầu

### 3. Bảo mật
- Chỉ admin mới có quyền truy cập
- Xác thực token cho mọi request
- Log lại mọi thay đổi

### 4. Hiệu suất
- Tối ưu query database
- Phân trang cho danh sách lớn
- Cache thông tin phiên

## Test Script

Sử dụng script test để kiểm tra chức năng:

```bash
node scripts/test-future-sessions.js
```

Script sẽ test:
1. GET future sessions
2. Generate future sessions
3. Set individual result
4. Bulk set results
5. Verify results

## Troubleshooting

### 1. Không hiển thị phiên tương lai
- Kiểm tra quyền admin
- Chạy lại "Tạo lại 30 phiên"
- Kiểm tra database connection

### 2. Không thể đặt kết quả
- Kiểm tra phiên có tồn tại không
- Kiểm tra trạng thái phiên (phải là ACTIVE)
- Kiểm tra quyền admin

### 3. Kết quả không được sử dụng
- Kiểm tra logic session closing
- Kiểm tra trạng thái PREDICTED
- Kiểm tra thời gian phiên

### 4. Lỗi database
- Kiểm tra connection string
- Kiểm tra collection trading_sessions
- Kiểm tra indexes

## Kết luận

Chức năng này cung cấp cho admin khả năng kiểm soát hoàn toàn kết quả của 30 phiên giao dịch sắp tới với độ chính xác 100%. Điều này đảm bảo tính minh bạch và cho phép admin quản lý hệ thống một cách hiệu quả. 