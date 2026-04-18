# Tài Liệu Hướng Dẫn Sử Dụng & Kỹ Thuật MailFlow Pro

Chào mừng bạn đến với tài liệu chi tiết của **MailFlow Pro** - Hệ thống Marketing Automation, AI Chatbot và Quản lý Khách hàng toàn diện. Tài liệu này mô tả toàn bộ các phân hệ chức năng, cách thức hoạt động và hướng dẫn tích hợp cho đội ngũ kỹ thuật và vận hành.

---

## MỤC LỤC

1. [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2. [Quản Lý Đối Tượng (Audience)](#2-quản-lý-đối-tượng-audience)
3. [Automation (Quy Trình Tự Động)](#3-automation-quy-trình-tự-động)
4. [Email Marketing (Campaigns)](#4-email-marketing-campaigns)
5. [AI Chatbot & Training](#5-ai-chatbot--training)
6. [Hội Thoại Đa Kênh (Unified Chat)](#6-hội-thoại-đa-kênh-unified-chat)
7. [Web Tracking & Analytics](#7-web-tracking--analytics)
8. [Forms & Thu Thập Lead](#8-forms--thu-thập-lead)
9. [API & Tích Hợp Hệ Thống](#9-api--tích-hợp-hệ-thống)

---

## 1. TỔNG QUAN HỆ THỐNG

MailFlow Pro là nền tảng **All-in-One** giúp doanh nghiệp:
- **Thu thập dữ liệu**: Từ Website, Facebook, Zalo, Form, API.
- **Nuôi dưỡng khách hàng**: Bằng Email Automation, Chatbot AI 24/7.
- **Phân tích hành vi**: Tracking chi tiết hành trình khách hàng (Pageview, Click, Purchase).
- **Tối ưu chuyển đổi**: Chấm điểm tiềm năng (Lead Scoring) và cá nhân hóa trải nghiệm.

---

## 2. QUẢN LÝ ĐỐI TƯỢNG (AUDIENCE)

Đây là trái tim của hệ thống, nơi lưu trữ hồ sơ khách hàng 360 độ.

### 2.1. Danh Sách Liên Hệ (Contacts)
- **Hồ sơ hợp nhất**: Lưu trữ thông tin Email, SĐT, Facebook PSID, Zalo User ID trong cùng một hồ sơ.
- **Bộ lọc nâng cao**: Lọc theo Tag, Trạng thái (Verified/Unverified), Danh sách, Segment, Hội thoại (Có/Không), Sinh nhật, Hoạt động gần đây.
- **Import/Export**: Hỗ trợ nhập liệu từ Excel/CSV số lượng lớn, xử lý trùng lặp thông minh.

### 2.2. Phân Khúc (Segments) & Tag
- **Dynamic Segments**: Tự động nhóm khách hàng dựa trên hành vi (VD: "Đã mở email trong 7 ngày qua", "Có Lead Score > 50", "Đến từ nguồn QC Facebook").
- **Tags**: Gắn nhãn thủ công hoặc tự động qua Flow để phân loại khách hàng (VD: `VIP`, `Khách mới`, `Đã mua hàng`).

### 2.3. Lịch Sử Hoạt Động (Customer Journey)
- Xem chi tiết từng điểm chạm: Khách xem trang nào, chat nội dung gì, mở email nào, click link nào.
- Hệ thống chấm điểm (Lead Score) dựa trên các tương tác này.

---

## 3. AUTOMATION (QUY TRÌNH TỰ ĐỘNG)

Xây dựng kịch bản chăm sóc khách hàng tự động với giao diện **Kéo & Thả (Visual Builder)**.

### 3.1. Triggers (Kích Hoạt)
Quy trình có thể bắt đầu khi:
- **Người dùng đăng ký mới** (Form, API).
- **Gắn Tag mới**: VD khi tư vấn viên gắn thẻ `Quan tâm`.
- **Tham gia Danh sách**: Khi import hoặc đăng ký news.
- **Sinh nhật**: Kịch bản chúc mừng sinh nhật.
- **Sự kiện Web**: Khách xem trang báo giá > 2 lần.
- **Webhook**: Nhận tín hiệu từ phần mềm khác (KiotViet, Haravan...).

### 3.2. Actions (Hành Động)
- **Gửi Email**: Gửi email cá nhân hóa (Chào mừng, Khuyến mãi).
- **Gửi Zalo ZNS/Tin nhắn**: Gửi tin nhắn CSKH qua Zalo OA.
- **AI Agent**: Gọi AI xử lý, phân tích hoặc trả lời.
- **Wait (Chờ)**: Đợi X giờ/ngày hoặc đợi đến giờ cụ thể.
- **Condition (Rẽ nhánh)**: Nếu (Đã mở email / Có Tag X) thì làm A, ngược lại làm B.
- **Add/Remove Tag/List**: Cập nhật hồ sơ khách hàng.

---

## 4. EMAIL MARKETING (CAMPAIGNS)

Gửi email hàng loạt (Broadcast) cho các chiến dịch Marketing.
- **Template Builder**: Soạn thảo email kéo thả hoặc HTML raw.
- **Cá nhân hóa**: Chèn tên `{first_name}`, thông tin riêng vào nội dung.
- **Lên lịch gửi**: Set thời gian gửi cụ thể.
- **Thống kê**: Open Rate, Click Rate, Bounce, Unsubscribe.

---

## 5. AI CHATBOT & TRAINING

Hệ thống AI thông minh tích hợp sâu với Meta (Facebook) và Zalo.

### 5.1. Training (Huấn Luyện AI)
- **Text Training**: Nhập trực tiếp các đoạn văn bản kiến thức.
- **Q&A Training**: Nhập cặp Câu hỏi - Câu trả lời mẫu.
- **File Training**: Upload tài liệu (PDF, Docx) để AI học.
- **Website Crawl**: Quét nội dung website để tự học sản phẩm/dịch vụ.

### 5.2. Cấu Hình Bot
- **Prompt System**: Thiết lập vai trò (Persona), giọng văn (Tone), quy tắc trả lời.
- **Kịch bản chào (Automation Scenarios)**:
  - **Fulltime AI**: AI trả lời 24/7.
  - **Giờ hành chính**: Trong giờ làm việc nhân viên trực, ngoài giờ AI trực.
  - **Theo từ khóa**: Kích hoạt kịch bản cụ thể khi khách gõ từ khóa.

### 5.3. Kết Nối Đa Kênh
- **Meta (Facebook Fanpage)**: Tự động trả lời Comment, Inbox, ẩn comment chứa SĐT.
- **Zalo OA**: Tự động trả lời tin nhắn người quan tâm.

---

## 6. HỘI THOẠI ĐA KÊNH (UNIFIED CHAT)

Giao diện Chat tập trung cho CSKH/Sale.
- **Gom tin nhắn**: Facebook, Zalo, Web Livechat đổ về 1 nơi.
- **Hỗ trợ AI**:
  - Gợi ý câu trả lời.
  - Tự động tóm tắt nhu cầu khách hàng.
  - Phân tích cảm xúc (Sentiment Analysis).
- **Xử lý đơn hàng**: Tạo đơn, gắn tag, cập nhật thông tin ngay khung chat.

---

## 7. WEB TRACKING & ANALYTICS

Hệ thống theo dõi hành vi người dùng trên Website (tương tự Google Analytics/Pixel).
- **Mã Tracking**: Nhúng script JS vào website.
- **Định danh khách hàng**: Tự động khớp khách truy cập với Database (qua Email clicked, Form submit).
- **Heatmap & Scrollmap**: (Tính năng nâng cao) Xem khách dừng lại ở đâu.
- **Trigger theo hành vi**: (Sắp ra mắt) Tự động popup/chat khi khách có ý định thoát trang.

---

## 8. FORMS & THU THẬP LEAD

- **Form Builder**: Tạo form đăng ký (Popup, Embedded, Floating Bar).
- **Tích hợp Flow**: Điền form -> Kích hoạt Automation (Gửi quà, Email xác nhận).
- **Double Opt-in**: Cơ chế xác thực email 2 bước để lọc rác.

---

## 9. API & TÍCH HỢP HỆ THỐNG

Dành cho Developer để kết nối hệ thống bên thứ 3.

### 9.1. API Endpoints Chính
Base URL: `https://[your-domain]/api`

| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| **POST** | `/webhook.php` | Nhận dữ liệu Lead từ bên ngoài (JSON) |
| **POST** | `/subscribers.php` | Tạo/Cập nhật Contact thủ công |
| **GET** | `/subscribers.php?email=...` | Lấy thông tin Contact |
| **POST** | `/track.php` | Gửi sự kiện tracking (Server-side) |
| **POST** | `/api/meta_webhook.php` | Webhook cho Facebook Messenger |
| **POST** | `/api/zalo_webhook.php` | Webhook cho Zalo OA |

### 9.2. Webhook Payload Mẫu (Incoming)
Gửi POST request tới `/api/webhook.php`:
```json
{
  "email": "khachhang@example.com",
  "first_name": "Nguyen",
  "phone": "0912345678",
  "tags": ["dang-ky-web", "hot-lead"],
  "custom_fields": {
    "source": "landing-page-1"
  }
}
```

### 9.3. Tracking Script (Client-side)
Nhúng đoạn mã sau vào thẻ `<head>` của website:
```html
<script defer src="https://[your-domain]/tracking.js"></script>
```

---
*Tài liệu được tạo ngày 03/02/2026 bởi Đội ngũ Phát triển MailFlow Pro.*
