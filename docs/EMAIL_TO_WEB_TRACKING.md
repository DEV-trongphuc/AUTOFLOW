# Email-to-Web Tracking Integration

## 📧 Tổng quan

Tính năng **Email-to-Web Tracking** cho phép bạn theo dõi hành trình khách hàng từ email campaign đến website, tự động nhận diện visitor dựa trên email của họ.

## 🎯 Lợi ích

- ✅ **Tự động nhận diện** visitor khi họ click từ email
- ✅ **Liên kết dữ liệu** giữa email subscriber và web visitor
- ✅ **Theo dõi customer journey** hoàn chỉnh
- ✅ **Cá nhân hóa** trải nghiệm web dựa trên email data
- ✅ **Attribution chính xác** cho email campaigns

## 🚀 Cách sử dụng

### Phương án 1: Tự động (Khuyến nghị)

Thêm script vào email template của bạn:

```html
<!-- Trong <head> hoặc cuối <body> của email template -->
<script src="https://automation.ideas.edu.vn/email-link-tracker.js"></script>
<script>
  // Cấu hình domains được tracking
  window._emailTrackerConfig = {
    domains: ['ideas.edu.vn', 'yourdomain.com'],
    email: '{{subscriber.email}}' // Template variable từ email service
  };
</script>
```

Script sẽ tự động:
1. Tìm tất cả links trong email
2. Kiểm tra xem link có thuộc domain được tracking không
3. Thêm `?email={{subscriber.email}}` vào URL
4. Khi user click → Web tracker tự động nhận diện

### Phương án 2: Manual (Cho từng link)

Thêm tham số email trực tiếp vào link:

```html
<!-- Email template -->
<a href="https://ideas.edu.vn/courses?email={{subscriber.email}}">
  Xem khóa học
</a>

<a href="https://ideas.edu.vn/pricing?email={{subscriber.email}}&utm_source=email&utm_campaign=promo">
  Xem giá
</a>
```

### Phương án 3: Server-side (Cho email service tùy chỉnh)

Nếu bạn tự build email service, thêm email vào links khi render:

```php
// PHP example
function addEmailToLink($url, $email) {
    $separator = (strpos($url, '?') !== false) ? '&' : '?';
    return $url . $separator . 'email=' . urlencode($email);
}

$link = addEmailToLink('https://ideas.edu.vn/courses', $subscriber['email']);
```

```javascript
// Node.js example
function addEmailToLink(url, email) {
    const urlObj = new URL(url);
    urlObj.searchParams.set('email', email);
    return urlObj.toString();
}

const link = addEmailToLink('https://ideas.edu.vn/courses', subscriber.email);
```

## 🔧 Cấu hình Web Tracker

Web tracker (`tracker.js`) đã được cập nhật để tự động đọc email từ URL. Hỗ trợ các tham số:

- `?email=user@example.com` (khuyến nghị)
- `?e=user@example.com` (rút gọn)
- `?subscriber_email=user@example.com` (tường minh)

### Ví dụ URLs hợp lệ:

```
https://ideas.edu.vn/courses?email=john@example.com
https://ideas.edu.vn/pricing?email=jane@example.com&utm_source=email
https://ideas.edu.vn/?e=user@example.com
```

## 📊 Dữ liệu được thu thập

Khi visitor được nhận diện từ email:

```json
{
  "visitor_id": "uuid-xxx",
  "email": "user@example.com",
  "source": "email_campaign",
  "priority": 10,
  "identified_at": "2026-01-09T20:00:00Z",
  "traffic_source": {
    "utm_source": "email",
    "utm_medium": "campaign",
    "utm_campaign": "promo_jan_2026"
  }
}
```

## 🔒 Bảo mật & Privacy

### 1. Domain Whitelist
Chỉ thêm email vào links thuộc domains đã xác thực:

```javascript
var trackedDomains = [
    'ideas.edu.vn',
    'yourdomain.com'
];
```

### 2. Email Validation
Tracker tự động validate email format trước khi lưu.

### 3. URL Cleaning (Tùy chọn)
Có thể xóa email khỏi URL sau khi đã capture:

```javascript
// Trong tracker.js, uncomment dòng này:
var cleanUrl = window.location.pathname + window.location.hash;
history.replaceState({}, document.title, cleanUrl);
```

### 4. GDPR Compliance
- ✅ Email chỉ được sử dụng cho tracking nội bộ
- ✅ Không share với third-party
- ✅ User có thể opt-out bằng cách xóa cookies

## 📈 Use Cases

### 1. Email Campaign Attribution
```
Email: "Khóa học mới" 
→ Click CTA 
→ Landing page (auto-identified)
→ Browse courses
→ Purchase
= Attribution: Email campaign "Khóa học mới"
```

### 2. Personalized Web Experience
```javascript
// Trên website, kiểm tra nếu visitor đã được identify
if (window._mfTracker && window._mfTracker.identifiedEmail) {
    // Show personalized content
    document.querySelector('.welcome').textContent = 
        'Chào ' + window._mfTracker.identifiedEmail;
}
```

### 3. Abandoned Cart Recovery
```
Email: "Giỏ hàng của bạn còn 3 sản phẩm"
→ Click "Hoàn tất đơn hàng"
→ Website tự động load lại giỏ hàng
→ Checkout seamlessly
```

## 🧪 Testing

### Test 1: Manual URL
```
1. Mở: https://yourdomain.com/?email=test@example.com
2. Mở Console
3. Check: localStorage.getItem('_mf_identity')
4. Kết quả: {"email":"test@example.com","priority":10,...}
```

### Test 2: Email Template
```
1. Gửi test email với link có {{subscriber.email}}
2. Click link từ email
3. Check Web Tracking dashboard
4. Visitor sẽ hiển thị với email đã nhận diện
```

## 🐛 Troubleshooting

### Email không được nhận diện?

**Kiểm tra:**
1. ✅ URL có chứa `?email=...` không?
2. ✅ Email format có hợp lệ không?
3. ✅ Tracker.js đã load chưa?
4. ✅ Console có lỗi không?

**Debug:**
```javascript
// Trong browser console
console.log(new URLSearchParams(window.location.search).get('email'));
console.log(localStorage.getItem('_mf_identity'));
```

### Link không được thêm email?

**Kiểm tra:**
1. ✅ Domain có trong whitelist không?
2. ✅ Email template variable đã render đúng chưa?
3. ✅ Script `email-link-tracker.js` đã load chưa?

## 📚 API Reference

### Tracker Methods

```javascript
// Manual identify (nếu cần)
window._mfIdentify('user@example.com', '0123456789');

// Check current identity
var identity = JSON.parse(localStorage.getItem('_mf_identity'));
console.log(identity.email); // "user@example.com"
```

### Server-side API

```php
// Get visitor by email
GET /mail_api/web_tracking?action=visitor_by_email&email=user@example.com

// Response
{
  "success": true,
  "visitor": {
    "id": "uuid-xxx",
    "email": "user@example.com",
    "first_visit_at": "2026-01-09T10:00:00Z",
    "last_visit_at": "2026-01-09T20:00:00Z",
    "sessions": 5,
    "page_views": 23
  }
}
```

## 🎓 Best Practices

1. **Luôn sử dụng HTTPS** cho links
2. **Validate email** trước khi thêm vào URL
3. **Whitelist domains** để tránh leak email
4. **Test thoroughly** trước khi deploy
5. **Monitor attribution** để đo lường hiệu quả
6. **Respect privacy** - cho user option để opt-out

## 🔄 Migration Guide

Nếu bạn đang dùng tracking cũ:

```javascript
// Cũ: Manual tracking
<a href="https://ideas.edu.vn/courses" onclick="trackClick('email-campaign')">

// Mới: Automatic tracking
<a href="https://ideas.edu.vn/courses?email={{subscriber.email}}">
```

---

**Tài liệu được cập nhật:** 2026-01-09  
**Phiên bản:** 1.0.0  
**Hỗ trợ:** support@ideas.edu.vn
