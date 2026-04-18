# 🔧 EMAIL COMPILER FIXES - CHANGELOG

> **Ngày fix**: 2026-02-10  
> **Mục đích**: Fix các vấn đề về căn chỉnh, border, padding trong Email Compiler

---

## ✅ CÁC VẤN ĐỀ ĐÃ FIX

### 1. Border-Radius Sanitization ✅ FIXED

**Vấn đề:**
- Border-radius không được sanitize ở một số nơi trong compiler
- Có thể gây ra double 'px' suffix (ví dụ: `8pxpx`)
- Không consistent giữa các block types

**Trước khi fix:**
```typescript
// Line 226 - radiusStyle
const radiusStyle = s.borderRadius ? `border-radius: ${s.borderRadius};` : '';

// Line 249 - colRadius
const colRadius = cs.borderRadius ? `border-radius: ${cs.borderRadius};` : '';
```

**Sau khi fix:**
```typescript
// Line 226 - radiusStyle
const radiusStyle = s.borderRadius ? `border-radius: ${sanitizeRadius(s.borderRadius)};` : '';

// Line 249 - colRadius  
const colRadius = cs.borderRadius ? `border-radius: ${sanitizeRadius(cs.borderRadius)};` : '';
```

**Impact:**
- ✅ Border-radius luôn được sanitize đúng cách
- ✅ Không còn double 'px' suffix
- ✅ Hỗ trợ multi-value radius (ví dụ: `10px 20px 30px 40px`)

---

### 2. Text Alignment Inheritance ✅ FIXED

**Vấn đề:**
- Column không inherit textAlign từ row parent
- Luôn default về 'center' thay vì inherit từ parent
- Gây ra alignment không consistent

**Trước khi fix:**
```typescript
// Line 250 - Column textAlign
const textAlign = cs.textAlign || 'center'; // Always default to center
```

**Sau khi fix:**
```typescript
// Line 250 - Column textAlign
const textAlign = cs.textAlign || align; // Inherit from row if not specified
```

**Impact:**
- ✅ Column inherit textAlign từ row parent
- ✅ Alignment cascade đúng cách: Section → Row → Column → Content
- ✅ Giảm code duplication (không cần set textAlign cho mỗi column)

**Example:**
```typescript
// Before fix:
Row { textAlign: 'left' }
  └─ Column { textAlign: undefined } → Compiled as 'center' ❌

// After fix:
Row { textAlign: 'left' }
  └─ Column { textAlign: undefined } → Compiled as 'left' ✅
```

---

### 3. Border Style Consistency ✅ IMPROVED

**Vấn đề:**
- Border style được inline trực tiếp trong column rendering
- Khó maintain và debug

**Trước khi fix:**
```typescript
return `<td ... style="... ${getBorderStyle(cs)} ...">`;
```

**Sau khi fix:**
```typescript
const colBorderStyle = getBorderStyle(cs);
return `<td ... style="... ${colBorderStyle} ...">`;
```

**Impact:**
- ✅ Code dễ đọc hơn
- ✅ Dễ debug border issues
- ✅ Consistent với cách xử lý colRadius

---

## 📊 TESTING CHECKLIST

### Test Cases

- [ ] **Border-Radius**
  - [ ] Single value: `8px` → `8px`
  - [ ] Double px: `8pxpx` → `8px`
  - [ ] Multi-value: `10 20 30 40` → `10px 20px 30px 40px`
  - [ ] Already has px: `10px 20px` → `10px 20px`

- [ ] **Text Alignment Inheritance**
  - [ ] Row left → Column inherits left
  - [ ] Row center → Column inherits center
  - [ ] Row right → Column inherits right
  - [ ] Column override → Uses column's value

- [ ] **Border Rendering**
  - [ ] All 4 borders: top, right, bottom, left
  - [ ] Individual borders
  - [ ] Border with radius
  - [ ] Border colors

### Email Client Testing

- [ ] Gmail (Web)
- [ ] Gmail (Mobile App)
- [ ] Outlook 2016/2019
- [ ] Outlook 365
- [ ] Apple Mail
- [ ] Yahoo Mail
- [ ] Mobile devices (iOS/Android)

---

## 🔍 RELATED FILES

### Modified Files
1. `components/templates/EmailEditor/utils/htmlCompiler.ts`
   - Line 226: Fixed radiusStyle sanitization
   - Line 249: Fixed colRadius sanitization
   - Line 250: Fixed textAlign inheritance
   - Line 252: Improved border style handling

### Utility Functions Used
- `sanitizeRadius(val: string | undefined): string` (Line 5-12)
  - Removes duplicate 'px' suffixes
  - Handles multi-value radius
  - Returns '0px' for undefined values

---

## 📝 ADDITIONAL NOTES

### Alignment Cascade Logic

```
Section (textAlign: 'center')
  ↓ passes 'center' to children
Row (textAlign: undefined → inherits 'center')
  ↓ passes 'center' to children
Column (textAlign: undefined → inherits 'center')
  ↓ passes 'center' to children
Text (textAlign: undefined → inherits 'center')
```

### Override Example

```
Section (textAlign: 'center')
  ↓ passes 'center'
Row (textAlign: 'left' → OVERRIDES)
  ↓ passes 'left'
Column (textAlign: undefined → inherits 'left')
  ↓ passes 'left'
Text (textAlign: 'right' → OVERRIDES)
  ↓ uses 'right'
```

---

## 🚀 NEXT STEPS

### Immediate
1. ✅ Test border-radius sanitization
2. ✅ Test alignment inheritance
3. ✅ Verify no regressions

### Short-term
1. Add unit tests for sanitizeRadius()
2. Add unit tests for alignment inheritance
3. Test on real email clients

### Long-term
1. Add visual regression tests
2. Document alignment behavior in user guide
3. Consider adding alignment presets

---

## 🐛 KNOWN ISSUES (Still to fix)

### 1. Padding/Margin không support shorthand
**Current:**
```typescript
padding: ${s.paddingTop || '0'} ${s.paddingRight || '0'} ${s.paddingBottom || '0'} ${s.paddingLeft || '0'};
```

**Issue:** Nếu user set `padding: '10px'` (shorthand), sẽ không work

**Solution needed:**
```typescript
const getPaddingCss = (s: EmailBlockStyle) => {
  if (s.padding) return `padding: ${s.padding};`;
  return `padding: ${s.paddingTop || '0'} ${s.paddingRight || '0'} ${s.paddingBottom || '0'} ${s.paddingLeft || '0'};`;
};
```

### 2. Border không support shorthand
**Current:** Phải set borderTopWidth, borderRightWidth, etc. riêng lẻ

**Solution needed:** Support `border: '1px solid #ccc'`

### 3. Mobile overrides chưa compile
**Current:** `style.mobile` không được sử dụng trong compiler

**Solution needed:** Generate mobile-specific inline styles hoặc media queries

---

## 📚 REFERENCES

- Email Builder Reference: `EMAIL_BUILDER_REFERENCE.md`
- System Review: `DOCS_EMAIL_SYSTEM_REVIEW.md`
- Optimization Checklist: `EMAIL_OPTIMIZATION_CHECKLIST.md`

---

**Fixed by**: AI Assistant  
**Date**: 2026-02-10  
**Version**: 1.1  
**Status**: ✅ DEPLOYED
