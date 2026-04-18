# Hướng dẫn Tối ưu & Sửa lỗi Backend

Tôi đã rà soát và thực hiện các tối ưu quan trọng cho hệ thống.

## 1. Cải thiện Hiệu suất Database (SQL Performance)
Tôi đã tạo một script tự động thêm các Index (chỉ mục) còn thiếu cho database. Điều này sẽ giúp tăng tốc độ load danh sách chat, danh sách user Zalo và broadcast tin nhắn lên đáng kể (tránh scan toàn bộ bảng).

**Hành động cần làm:**
Bởi vì tôi không thể chạy lệnh trực tiếp trên máy của bạn (do lỗi đường dẫn PHP), bạn vui lòng **chạy script sau trên trình duyệt**:

1. Mở trình duyệt (nơi bạn đang test web app).
2. Truy cập vào đường dẫn: `http://localhost/YOUR_PATH/api/optimize_indexes_final.php`
   *(Thay `YOUR_PATH` bằng đường dẫn thực tế của project trên localhost, ví dụ: `/copy-of-mailflow-pro...`)*
3. Nếu thấy thông báo "Optimization Complete", tức là DB đã được tối ưu.

## 2. Khắc phục Logic Gửi Broadcast (Broadcasting Fix)
Logic gửi tin nhắn Zalo hàng loạt trước đây chạy vòng lặp (loop) và gọi API trực tiếp. Điều này gây ra 2 vấn đề:
- **Treo trình duyệt/Timeout** khi gửi danh sách lớn (>50 người).
- **Delay** rất lâu.

**Giải pháp đã áp dụng:**
- Chuyển toàn bộ việc gửi broadcast sang chế độ **Background Queue**.
- Khi bấm gửi, hệ thống sẽ trả về thành công ngay lập tức và tin nhắn sẽ được worker xử lý ngầm.

## 3. Sửa lỗi Worker Localhost
Tôi phát hiện file `db_connect.php` đang trỏ cứng về `automation.ideas.edu.vn` cho Worker API. Điều này khiến việc test trên Localhost không kích hoạt được queue (do queue nằm ở local nhưng lệnh kích hoạt lại bắn lên server thật).
-> **Đã fix:** Tự động nhận diện localhost để gọi đúng API local.

## Các file đã thay đổi:
- `api/db_connect.php`
- `api/zalo_audience.php`
- `api/worker_queue.php`
- [MỚI] `api/optimize_indexes_final.php`
