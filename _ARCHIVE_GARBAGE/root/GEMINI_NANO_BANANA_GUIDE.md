# Gemini Nano Banana Integration Guide

## Tổng quan

Hệ thống đã được nâng cấp để sử dụng **Gemini Nano Banana** - tính năng tạo ảnh gốc của Gemini API, thay thế hoàn toàn Pollinations.

## Các Model hỗ trợ

### 1. Nano Banana (Gemini 2.5 Flash Image)
- **Model ID**: `gemini-2.5-flash-lite-image`
- **Đặc điểm**: Tốc độ cao, hiệu suất tối ưu
- **Độ phân giải**: 1024px (các tỷ lệ khung hình khác nhau)
- **Phù hợp**: Tạo ảnh số lượng lớn, độ trễ thấp

### 2. Nano Banana Pro (Gemini 3 Pro Image Preview)
- **Model ID**: `gemini-3-pro-image-preview`
- **Đặc điểm**: Chất lượng chuyên nghiệp, tư duy nâng cao
- **Độ phân giải**: 1K, 2K, 4K
- **Tính năng đặc biệt**:
  - Kết nối Google Search (thông tin thời gian thực)
  - Văn bản có độ trung thực cao
  - Hỗ trợ tối đa 14 hình ảnh tham khảo
  - Chế độ "Thinking" (tư duy trước khi tạo)

## Cách hoạt động

### Backend Flow

1. **User gửi yêu cầu** → Frontend gửi message + image settings
2. **AI nhận system prompt** → Hiểu được khả năng tạo ảnh qua Nano Banana
3. **AI phân tích yêu cầu** → Tạo prompt tiếng Anh chi tiết
4. **AI trả về** → `[IMAGE_REQUEST: detailed_english_prompt]`
5. **Backend xử lý** → Gọi Gemini API với prompt
6. **Gemini API trả về** → Base64 image data
7. **Backend nhúng** → Chuyển thành data URL: `data:image/png;base64,...`
8. **Frontend hiển thị** → Render ảnh từ data URL

### Cú pháp AI sử dụng

```
[IMAGE_REQUEST: A photorealistic close-up portrait of an elderly Japanese ceramicist with deep sun-etched wrinkles...]
```

## Cấu hình

### Frontend (ImageSettingsSidebar.tsx)

```typescript
const imageSettings = {
  image_provider: 'gemini-2.5-flash-lite-image', // hoặc 'gemini-3-pro-image-preview'
  image_style: 'professional', // professional, artistic, digital-art, 3d-render, etc.
  image_size: '1k' // 1k, 2k, 4k, wide, tall, cinema
};
```

### Backend (ai_org_chatbot.php)

```php
// Size mapping
$sizeMap = [
    '1k' => [1024, 1024],
    '2k' => [2048, 2048],
    '4k' => [4096, 2048],
    'wide' => [1792, 1024],
    'tall' => [1024, 1792],
    'cinema' => [2100, 900]
];

// Style prompts
$stylePrompts = [
    'professional' => 'professional business style, clean, modern, corporate, high-end',
    'artistic' => 'highly artistic, expressive, oil painting style, vibrant textures',
    // ...
];
```

## API Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "message": "Here is your image:\n\n![Generated Image](data:image/png;base64,iVBORw0KG...)",
    "quick_actions": ["Create another", "Edit this"],
    "meta": {
      "model": "gemini-2.5-flash-lite-image",
      "temp": 0.9,
      "tokens": 8192,
      "mode": "Standard"
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Gemini API Error: Quota exceeded"
}
```

## Ví dụ sử dụng

### 1. Tạo ảnh đơn giản

**User**: "Vẽ cho tôi một con mèo đeo kính"

**AI Response**:
```
[IMAGE_REQUEST: A photorealistic portrait of an orange tabby cat wearing round vintage glasses, sitting on a wooden desk with soft natural lighting from a window, shallow depth of field, professional photography style]
```

**Result**: Ảnh base64 được nhúng vào response

### 2. Tạo infographic

**User**: "Tạo biểu đồ so sánh doanh thu Q1 vs Q2"

**AI Response**:
```
[IMAGE_REQUEST: Professional business infographic comparing Q1 vs Q2 revenue with clean bar charts, modern corporate colors blue and orange, minimalist design, data visualization style]
```

### 3. Tạo logo

**User**: "Thiết kế logo cho công ty AI startup tên 'NeuraTech'"

**AI Response** (với Nano Banana Pro):
```
[IMAGE_REQUEST: Modern minimalist logo for AI startup NeuraTech, featuring neural network pattern, gradient blue to purple, clean sans-serif typography, tech-forward aesthetic, professional branding]
```

## Tối ưu hóa

### Prompt Engineering Tips

1. **Càng chi tiết càng tốt**: Mô tả ánh sáng, góc chụp, chất liệu
2. **Sử dụng thuật ngữ chuyên nghiệp**: "85mm portrait lens", "golden hour lighting"
3. **Kết hợp style prompt**: Luôn thêm style vào cuối prompt
4. **Tránh lặp lại**: Mỗi lần tạo ảnh phải có prompt khác nhau

### Performance

- **Nano Banana**: ~2-5 giây/ảnh
- **Nano Banana Pro**: ~5-15 giây/ảnh (do có thinking process)
- **Token cost**: 1120-2000 tokens/ảnh (tuỳ độ phân giải)

## Troubleshooting

### Lỗi thường gặp

1. **"Missing API Key"**
   - Kiểm tra biến môi trường `GEMINI_API_KEY`

2. **"Quota exceeded"**
   - Đã vượt hạn mức API
   - Giải pháp: Nâng cấp quota hoặc chờ reset

3. **"No image data in response"**
   - Gemini không trả về ảnh
   - Nguyên nhân: Prompt vi phạm policy
   - Giải pháp: Điều chỉnh prompt

4. **Ảnh không hiển thị**
   - Kiểm tra data URL format
   - Kiểm tra base64 encoding

### Debug Mode

Thêm logging vào `gemini_image_generator.php`:

```php
error_log("Image generation request: " . $prompt);
error_log("API response: " . print_r($result, true));
```

## Giới hạn

1. **Ngôn ngữ tốt nhất**: Tiếng Anh (prompt phải bằng tiếng Anh)
2. **Số lượng ảnh tham khảo**:
   - Nano Banana: 3 ảnh
   - Nano Banana Pro: 14 ảnh (6 objects + 5 people)
3. **Hình mờ**: Tất cả ảnh đều có SynthID watermark
4. **Content Policy**: Không tạo nội dung vi phạm, bạo lực, 18+

## Roadmap

- [ ] Hỗ trợ chỉnh sửa ảnh (image-to-image)
- [ ] Tích hợp Google Search cho Nano Banana Pro
- [ ] Batch generation (tạo nhiều ảnh cùng lúc)
- [ ] Lưu ảnh vào storage thay vì base64
- [ ] UI preview trước khi tạo

## Tài liệu tham khảo

- [Gemini Image Generation Official Docs](https://ai.google.dev/gemini-api/docs/image-generation)
- [Nano Banana Best Practices](https://ai.google.dev/gemini-api/docs/image-generation#best-practices)
