# 📧 EMAIL BUILDER - QUICK REFERENCE GUIDE

> **Hướng dẫn nhanh** sử dụng Email Builder và hiểu cách Compiler hoạt động

---

## 🎨 BLOCK TYPES REFERENCE

### Layout Blocks (Cấu trúc)

#### 1. **Section** (Container chính)
```typescript
// Tự động tạo khi kéo layout vào canvas
{
  type: 'section',
  style: {
    backgroundColor: '#F3F4F6',        // Màu nền section
    contentBackgroundColor: '#FFFFFF', // Màu nền content bên trong
    paddingTop: '0px',
    paddingBottom: '0px'
  },
  children: [Row blocks]
}
```

**Compiled HTML:**
```html
<tr>
  <td bgcolor="#F3F4F6" style="background-color: #F3F4F6; padding: 0;">
    <table width="100%" style="max-width: 600px; background-color: #FFFFFF;">
      <!-- Row content -->
    </table>
  </td>
</tr>
```

#### 2. **Row** (Container cho columns)
```typescript
{
  type: 'row',
  style: {
    display: 'table',
    backgroundColor: '#FFFFFF',
    paddingTop: '15px',
    paddingRight: '15px',
    paddingBottom: '15px',
    paddingLeft: '15px',
    noStack: false  // true = không stack trên mobile
  },
  children: [Column blocks]
}
```

**Compiled HTML:**
```html
<tr>
  <td>
    <table class="row-resp" width="100%">
      <tr>
        <!-- Columns -->
      </tr>
    </table>
  </td>
</tr>
```

#### 3. **Column** (Container cho content)
```typescript
{
  type: 'column',
  style: {
    width: '50%',           // Tự động tính khi có nhiều columns
    verticalAlign: 'top',   // top | middle | bottom
    textAlign: 'center',    // left | center | right
    paddingLeft: '10px',
    paddingRight: '10px'
  },
  children: [Content blocks]
}
```

**Compiled HTML:**
```html
<td class="col-resp" width="50%" valign="top" align="center" 
    style="width: 50%; padding: 0 10px; text-align: center;">
  <table width="100%">
    <!-- Content blocks -->
  </table>
</td>
```

---

### Content Blocks (Nội dung)

#### 4. **Text** (Văn bản)
```typescript
{
  type: 'text',
  content: '<p style="margin: 0;">Nội dung văn bản</p>',
  style: {
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#000000',
    textAlign: 'left',
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textTransform: 'none'
  }
}
```

**Compiled HTML:**
```html
<tr>
  <td style="font-family: Arial, sans-serif; font-size: 14px; 
              color: #000000; text-align: left; line-height: 1.5;">
    <p style="margin: 0;">Nội dung văn bản</p>
  </td>
</tr>
```

#### 5. **Image** (Hình ảnh)
```typescript
{
  type: 'image',
  content: 'https://example.com/image.jpg',  // Image URL
  url: 'https://example.com',                // Optional link
  altText: 'Image description',
  style: {
    width: '100%',
    borderRadius: '8px'
  }
}
```

**Compiled HTML:**
```html
<tr>
  <td align="center">
    <a href="https://example.com">
      <img src="https://example.com/image.jpg" 
           alt="Image description"
           width="100%" 
           style="display: block; max-width: 100%; border-radius: 8px;" />
    </a>
  </td>
</tr>
```

#### 6. **Button** (Nút bấm)
```typescript
{
  type: 'button',
  content: 'Click Me',
  url: 'https://example.com',
  style: {
    contentBackgroundColor: '#d97706',  // Button background
    color: '#ffffff',                   // Text color
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '8px',
    paddingTop: '12px',
    paddingBottom: '12px',
    paddingLeft: '24px',
    paddingRight: '24px',
    width: 'auto',                      // auto | 100% | specific px
    textAlign: 'center'                 // Alignment
  }
}
```

**Compiled HTML:**
```html
<tr>
  <td align="center">
    <!--[if mso]>
    <table><tr><td align="center" style="background: #d97706; border-radius: 8px;">
    <![endif]-->
    <table style="display: inline-table; width: auto;">
      <tr>
        <td style="border-radius: 8px;">
          <a href="https://example.com" 
             style="display: block; background: #d97706; color: #ffffff; 
                    padding: 12px 24px; font-size: 16px; font-weight: bold;
                    border-radius: 8px; text-decoration: none;">
            Click Me
          </a>
        </td>
      </tr>
    </table>
    <!--[if mso]>
    </td></tr></table>
    <![endif]-->
  </td>
</tr>
```

#### 7. **Divider** (Đường kẻ)
```typescript
{
  type: 'divider',
  style: {
    borderTopWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#eeeeee',
    paddingTop: '15px',
    paddingBottom: '15px'
  }
}
```

**Compiled HTML:**
```html
<tr>
  <td style="padding: 15px 0;">
    <div style="border-top: 1px solid #eeeeee; line-height: 1px; font-size: 1px;">
      &nbsp;
    </div>
  </td>
</tr>
```

#### 8. **Spacer** (Khoảng trống)
```typescript
{
  type: 'spacer',
  style: {
    height: '20px'
  }
}
```

**Compiled HTML:**
```html
<tr>
  <td height="20" style="line-height: 0; font-size: 0;">
    &nbsp;
  </td>
</tr>
```

---

### Advanced Blocks (Nâng cao)

#### 9. **Checklist** (Danh sách tích)
```typescript
{
  type: 'check_list',
  checkListTitle: 'VÌ SAO NÊN CHỌN CHÚNG TÔI?',
  items: [
    {
      id: 'uuid-1',
      title: 'Tính năng 1',
      description: 'Mô tả chi tiết'
    },
    // ...
  ],
  style: {
    checkIconColor: '#d97706',
    checkIconSize: '20',
    checkIcon: 'CheckCircle',  // CheckCircle | Star | Check | ...
    showCheckListTitle: true,
    showItemTitle: true,
    showItemDescription: true,
    backgroundColor: 'transparent',
    borderRadius: '8px'
  }
}
```

**Compiled HTML:**
```html
<tr>
  <td style="padding: 20px; border-radius: 8px;">
    <h3>VÌ SAO NÊN CHỌN CHÚNG TÔI?</h3>
    <table>
      <tr>
        <td width="30">
          <img src="https://img.icons8.com/.../checked.png" width="20" height="20" />
        </td>
        <td>
          <div style="font-weight: bold;">Tính năng 1</div>
          <div style="color: #64748b;">Mô tả chi tiết</div>
        </td>
      </tr>
      <!-- More items -->
    </table>
  </td>
</tr>
```

#### 10. **Timeline** (Dòng thời gian)
```typescript
{
  type: 'timeline',
  items: [
    {
      id: 'uuid-1',
      date: '09:00',
      title: 'Sự kiện 1',
      description: 'Mô tả sự kiện'
    },
    // ...
  ],
  style: {
    timelineDotColor: '#ffa900',
    timelineLineColor: '#e2e8f0',
    timelineLineStyle: 'solid'
  }
}
```

**Compiled HTML:**
```html
<tr>
  <td>
    <table>
      <tr>
        <td width="80" align="right">
          <strong>09:00</strong>
        </td>
        <td width="20" align="center" 
            style="background: linear-gradient(...); background-size: 2px 100%;">
          <div style="width: 12px; height: 12px; border-radius: 50%; 
                      background-color: #ffa900; border: 2px solid #fff;">
          </div>
        </td>
        <td style="padding-left: 20px;">
          <h4>Sự kiện 1</h4>
          <p>Mô tả sự kiện</p>
        </td>
      </tr>
      <!-- More items -->
    </table>
  </td>
</tr>
```

#### 11. **Countdown Timer** (Đếm ngược)
```typescript
{
  type: 'countdown',
  style: {
    targetDate: '2026-12-31T23:59',  // ISO format
    color: '#ffffff',                 // Digit color
    labelColor: '#004a7c',           // Label color
    backgroundColor: 'transparent'
  }
}
```

**Compiled HTML:**
```html
<tr>
  <td align="center">
    <table>
      <tr>
        <td>
          <img src="https://automation.ideas.edu.vn/mail_api/timer.php?target=2026-12-31T23:59&color=ffffff" 
               width="500" style="max-width: 100%;" />
        </td>
      </tr>
      <tr>
        <td>
          <table width="100%">
            <tr>
              <td width="33.33%" align="center" style="color: #004a7c;">NGÀY</td>
              <td width="33.33%" align="center" style="color: #004a7c;">GIỜ</td>
              <td width="33.33%" align="center" style="color: #004a7c;">PHÚT</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>
```

#### 12. **Social Icons** (Mạng xã hội)
```typescript
{
  type: 'social',
  socialLinks: [
    {
      id: 'uuid-1',
      network: 'facebook',
      url: 'https://facebook.com/yourpage',
      customStyle: {
        iconColor: '#1877F2',
        backgroundColor: 'transparent'
      }
    },
    // ...
  ],
  style: {
    iconMode: 'color',      // color | original | dark | light
    iconSize: '32',
    gap: '10',
    iconColor: '#666666',   // Default color
    iconBackgroundColor: 'transparent',
    borderRadius: '4px'
  }
}
```

**Compiled HTML:**
```html
<tr>
  <td align="center">
    <table style="display: inline-table;">
      <tr>
        <td style="padding: 0 5px;">
          <a href="https://facebook.com/yourpage" 
             style="display: block; width: 32px; height: 32px; 
                    background-color: transparent; border-radius: 4px;">
            <img src="https://img.icons8.com/.../facebook-new.png" 
                 width="19" height="19" style="vertical-align: middle;" />
          </a>
        </td>
        <!-- More icons -->
      </tr>
    </table>
  </td>
</tr>
```

#### 13. **Quote** (Trích dẫn)
```typescript
{
  type: 'quote',
  content: 'Đây là nội dung trích dẫn nổi bật.',
  style: {
    backgroundColor: '#f8fafc',
    borderLeftWidth: '4px',
    borderStyle: 'solid',
    borderColor: '#d97706',
    fontStyle: 'italic',
    color: '#334155',
    paddingTop: '20px',
    paddingBottom: '20px',
    paddingLeft: '25px',
    paddingRight: '25px'
  }
}
```

**Compiled HTML:**
```html
<tr>
  <td>
    <div style="border-left: 4px solid #d97706; 
                background-color: #f8fafc; 
                padding: 20px 25px; 
                font-style: italic; 
                color: #334155;">
      Đây là nội dung trích dẫn nổi bật.
    </div>
  </td>
</tr>
```

#### 14. **Review** (Đánh giá)
```typescript
{
  type: 'review',
  content: 'Dịch vụ tuyệt vời!',
  rating: 5,  // 1-5 stars
  style: {
    backgroundColor: 'transparent',
    borderRadius: '8px',
    borderTopWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
    paddingTop: '20px',
    paddingBottom: '20px',
    color: '#334155'
  }
}
```

**Compiled HTML:**
```html
<tr>
  <td align="center">
    <table style="border: 1px solid #e2e8f0; border-radius: 8px;">
      <tr>
        <td style="padding: 20px;">
          <div style="margin-bottom: 15px;">
            <!-- 5 star images -->
            <img src="https://img.icons8.com/.../star.png" width="20" height="20" />
            <img src="https://img.icons8.com/.../star.png" width="20" height="20" />
            <img src="https://img.icons8.com/.../star.png" width="20" height="20" />
            <img src="https://img.icons8.com/.../star.png" width="20" height="20" />
            <img src="https://img.icons8.com/.../star.png" width="20" height="20" />
          </div>
          <div>Dịch vụ tuyệt vời!</div>
        </td>
      </tr>
    </table>
  </td>
</tr>
```

#### 15. **Video** (Video preview)
```typescript
{
  type: 'video',
  videoUrl: 'https://youtube.com/watch?v=...',
  thumbnailUrl: 'https://img.youtube.com/vi/.../maxresdefault.jpg',
  style: {
    borderRadius: '12px',
    playButtonColor: '#d97706'
  }
}
```

**Compiled HTML:**
```html
<tr>
  <td align="center">
    <a href="https://youtube.com/watch?v=...">
      <table>
        <tr>
          <td>
            <img src="https://img.youtube.com/.../maxresdefault.jpg" 
                 width="100%" style="border-radius: 12px;" />
          </td>
        </tr>
        <tr>
          <td align="center" style="margin-top: -80px;">
            <table>
              <tr>
                <td bgcolor="#d97706" 
                    style="width: 60px; height: 60px; border-radius: 50%;">
                  <img src="https://cdn-icons-png.flaticon.com/.../375.png" 
                       width="30" height="30" style="filter: invert(1);" />
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </a>
  </td>
</tr>
```

---

## 🎨 STYLING REFERENCE

### Common Style Properties

```typescript
interface EmailBlockStyle {
  // Spacing
  paddingTop?: string;        // '10px', '20px', etc.
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  
  // Colors
  backgroundColor?: string;   // '#ffffff', 'transparent', etc.
  color?: string;             // Text color
  
  // Typography
  fontFamily?: string;        // 'Arial, sans-serif'
  fontSize?: string;          // '14px', '16px', etc.
  fontWeight?: string;        // 'normal', 'bold', '600', etc.
  fontStyle?: string;         // 'normal', 'italic'
  lineHeight?: string;        // '1.5', '24px', etc.
  textAlign?: string;         // 'left', 'center', 'right'
  textDecoration?: string;    // 'none', 'underline'
  textTransform?: string;     // 'none', 'uppercase', 'lowercase'
  
  // Borders
  borderTopWidth?: string;
  borderRightWidth?: string;
  borderBottomWidth?: string;
  borderLeftWidth?: string;
  borderStyle?: string;       // 'solid', 'dashed', 'dotted'
  borderColor?: string;
  borderRadius?: string;      // '8px', '50%', etc.
  
  // Background
  backgroundImage?: string;   // 'url(...)', 'linear-gradient(...)'
  backgroundSize?: string;    // 'cover', 'contain', '100%'
  backgroundPosition?: string; // 'center', 'top left', etc.
  backgroundRepeat?: string;  // 'no-repeat', 'repeat'
  overlayColor?: string;      // For image overlay
  overlayOpacity?: number;    // 0-1
  
  // Layout
  width?: string;             // '100%', '50%', '300px', 'auto'
  height?: string;
  display?: string;           // 'block', 'inline-block', 'table'
  verticalAlign?: string;     // 'top', 'middle', 'bottom'
  
  // Special
  noStack?: boolean;          // Don't stack on mobile
  
  // Mobile overrides (not yet implemented in compiler)
  mobile?: {
    fontSize?: string;
    padding?: string;
    display?: string;
    // ... any style property
  }
}
```

---

## 📱 RESPONSIVE DESIGN

### Desktop (Default)
```typescript
// Content width: 600px
bodyStyle: {
  contentWidth: '600px'
}
```

### Mobile (@media screen and (max-width: 600px))

**Auto-applied transformations:**

1. **Columns stack:**
```css
.col-resp {
  display: block !important;
  width: 100% !important;
  padding-left: 15px !important;
  padding-right: 15px !important;
}
```

2. **Font scaling:**
```css
h1 { font-size: 26px !important; }
h2 { font-size: 22px !important; }
p, td, div { font-size: 16px !important; }
```

3. **Images scale:**
```css
img {
  width: 100% !important;
  height: auto !important;
}
```

4. **NoStack option:**
```typescript
// Row with noStack: true
style: { noStack: true }

// Columns won't stack on mobile
// Useful for: buttons, badges, icons
```

---

## 🔧 COMPILER UTILITIES

### 1. sanitizeRadius()
```typescript
// Prevents double 'px' suffix
sanitizeRadius('8px')      // → '8px'
sanitizeRadius('8pxpx')    // → '8px'
sanitizeRadius('8')        // → '8px'
sanitizeRadius('10 20')    // → '10px 20px'
```

### 2. getIconUrl()
```typescript
// Generate icon URL from icons8.com
getIconUrl('CheckCircle', '#d97706')
// → 'https://img.icons8.com/ios-filled/100/f59e0b/checked.png'

// Supported icons: 50+ icons
// facebook, twitter, instagram, CheckCircle, Star, etc.
```

### 3. getBackgroundStyle()
```typescript
// Handle backgrounds (images, gradients, overlays)
getBackgroundStyle({
  backgroundColor: '#ffffff',
  backgroundImage: 'url(image.jpg)',
  backgroundSize: 'cover',
  overlayColor: '#000000',
  overlayOpacity: 0.5
})
// → 'background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(image.jpg); ...'
```

### 4. getBgColorHtmlAttr()
```typescript
// Generate bgcolor attribute for email clients
getBgColorHtmlAttr({ backgroundColor: '#ffffff' })
// → 'bgcolor="#ffffff"'
```

---

## 💡 BEST PRACTICES

### 1. Structure
✅ **DO:**
- Luôn bắt đầu với Section → Row → Column
- Sử dụng proper hierarchy
- Giữ nesting depth < 5 levels

❌ **DON'T:**
- Đặt content blocks trực tiếp trong Section
- Skip Row hoặc Column containers
- Nest quá sâu (performance issues)

### 2. Styling
✅ **DO:**
- Sử dụng inline styles
- Dùng table-based layout
- Test trên nhiều email clients
- Sử dụng web-safe fonts

❌ **DON'T:**
- Dùng external CSS files
- Dùng `<div>` cho layout chính
- Dùng CSS Grid hoặc Flexbox
- Dùng custom fonts không có fallback

### 3. Images
✅ **DO:**
- Sử dụng absolute URLs
- Thêm alt text
- Optimize image sizes
- Host trên reliable CDN

❌ **DON'T:**
- Dùng relative URLs
- Skip alt text
- Dùng images quá lớn (>1MB)
- Dùng base64 cho large images

### 4. Links
✅ **DO:**
- Sử dụng absolute URLs
- Test all links
- Thêm unsubscribe link
- Sử dụng descriptive text

❌ **DON'T:**
- Dùng relative URLs
- Dùng "Click here" text
- Skip unsubscribe link
- Dùng JavaScript links

### 5. Responsive
✅ **DO:**
- Test trên mobile devices
- Sử dụng media queries
- Stack columns on mobile
- Scale fonts appropriately

❌ **DON'T:**
- Design only for desktop
- Assume media queries work everywhere
- Use fixed widths for content
- Ignore mobile preview

---

## 🐛 TROUBLESHOOTING

### Issue: Columns không stack trên mobile
**Solution:** Kiểm tra `noStack` property
```typescript
// Ensure noStack is false (or undefined)
style: { noStack: false }
```

### Issue: Border radius không hiển thị
**Solution:** Một số email clients không support
```typescript
// Outlook không support border-radius
// Sử dụng conditional comments nếu cần
<!--[if !mso]><!-->
  <div style="border-radius: 8px;">...</div>
<!--<![endif]-->
```

### Issue: Background image không hiển thị
**Solution:** Outlook cần VML fallback
```typescript
// Hiện tại chưa implement VML
// Sử dụng solid color fallback
style: {
  backgroundImage: 'url(image.jpg)',
  backgroundColor: '#cccccc'  // Fallback
}
```

### Issue: Icons không load
**Solution:** Kiểm tra icons8.com availability
```typescript
// Nếu icons8 down, icons sẽ broken
// Cần implement fallback system (see optimization checklist)
```

### Issue: Countdown timer không update
**Solution:** Email timers là static images
```typescript
// Timer image được generate khi email gửi
// Không real-time update trong email
// Chỉ accurate khi mở email
```

---

## 📚 RESOURCES

### Email Testing Tools
- [Litmus](https://litmus.com) - Email client testing
- [Email on Acid](https://www.emailonacid.com) - Email testing
- [Mail Tester](https://www.mail-tester.com) - Spam score checker

### Email Design Inspiration
- [Really Good Emails](https://reallygoodemails.com)
- [Milled](https://milled.com)
- [Email Love](https://emaillove.com)

### Documentation
- [Can I Email](https://www.caniemail.com) - Email client support
- [Email Client CSS Support](https://www.campaignmonitor.com/css/)

---

**Last Updated**: 2026-02-10  
**Version**: 1.0
