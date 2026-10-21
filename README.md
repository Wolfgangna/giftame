# Góc Tâm Thư

## Chạy local

Yêu cầu Node.js. Từ thư mục dự án, chạy:

```powershell
npm start
```

Trang chính mở tại `http://localhost:3000`.

## Mở trang quản trị

Trang quản trị nằm tại `http://localhost:3000/admin.html`. Trước khi khởi động máy chủ, cấu hình biến môi trường `ADMIN_PASSWORD` bằng một mật khẩu riêng có ít nhất 16 ký tự:

```powershell
$env:ADMIN_PASSWORD = "<thay-bang-mat-khau-rieng-tu-16-ky-tu-tro-len>"
npm start
```

Thay giá trị mẫu bằng mật khẩu riêng trước khi chạy; không lưu mật khẩu vào source code hoặc gửi mật khẩu qua tin nhắn. Nếu chưa cấu hình mật khẩu hợp lệ, các API quản trị sẽ bị khóa. Máy chủ giới hạn số yêu cầu quản trị theo địa chỉ IP.

Kết nối HTTP chỉ phù hợp khi chạy local hoặc trên mạng riêng đáng tin cậy. Khi triển khai công khai, đặt máy chủ sau HTTPS.

## Hiệu ứng chuyển động

Trang tôn trọng cài đặt “Giảm chuyển động” của hệ điều hành/trình duyệt, tự giảm hiệu ứng nền trên thiết bị cảm ứng, và chỉ tải nhạc sau khi người dùng chủ động bật.
