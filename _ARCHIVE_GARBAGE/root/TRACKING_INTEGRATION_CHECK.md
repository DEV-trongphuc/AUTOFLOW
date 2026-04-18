# WEB TRACKING INTEGRATION - CONFLICT CHECK

## 🔍 **DATABASE SCHEMA CHECK**

### **web_visitors Table**
Cần có các columns:
- `id` (VARCHAR, Primary Key) ✓
- `property_id` (VARCHAR) ✓
- `subscriber_id` (VARCHAR, NULL) - Link với subscribers ⚠️ **CẦN KIỂM TRA**
- `zalo_user_id` (VARCHAR, NULL) - Link với zalo_subscribers ⚠️ **CẦN THÊM**
- `email` (VARCHAR, NULL) ✓
- `phone` (VARCHAR, NULL) ⚠️ **CẦN KIỂM TRA**
- `city`, `country`, `last_visit_at`, `visit_count` ✓

### **Potential Issues:**
1. **Column `zalo_user_id` không tồn tại** → Cần migration
2. **Column `phone` có thể chưa có** → Cần migration

---

## ⚠️ **CONFLICTS TO CHECK**

### **1. track.php (Line 219-260)**
```php
// Đã có logic identify trong track.php
elseif ($type === 'identify') {
    // Tìm subscriber và update web_visitors
}
```
**Conflict:** 
- ✅ Không xung đột - track.php xử lý identify event từ tracker.js
- ✅ forms/purchase/custom_events gọi API riêng

### **2. Duplicate Updates**
**Scenario:** User submit form → Cả track.php VÀ forms.php đều update?

**Answer:** 
- ❌ **KHÔNG** - tracker.js chỉ gửi identify event khi form submit (HTML form)
- ✅ API forms.php xử lý API call riêng
- ✅ Không overlap

### **3. Race Condition**
**Scenario:** 2 requests cùng lúc update web_visitors?

**Answer:**
- ⚠️ **CÓ THỂ** - Nếu user submit form rất nhanh
- ✅ **GIẢI PHÁP:** MySQL row-level locking tự động xử lý
- ✅ Last write wins - Không vấn đề

---

## 🔧 **REQUIRED MIGRATIONS**

### **Migration 1: Add zalo_user_id column**
```sql
ALTER TABLE web_visitors 
ADD COLUMN zalo_user_id VARCHAR(255) NULL AFTER subscriber_id,
ADD INDEX idx_zalo_user_id (zalo_user_id);
```

### **Migration 2: Add phone column (if not exists)**
```sql
ALTER TABLE web_visitors 
ADD COLUMN phone VARCHAR(50) NULL AFTER email,
ADD INDEX idx_phone (phone);
```

### **Migration 3: Verify subscriber_id column**
```sql
SHOW COLUMNS FROM web_visitors LIKE 'subscriber_id';
-- If not exists:
ALTER TABLE web_visitors 
ADD COLUMN subscriber_id VARCHAR(255) NULL AFTER property_id,
ADD INDEX idx_subscriber_id (subscriber_id);
```

---

## 📋 **INTEGRATION POINTS**

### **A. tracker.js → track.php**
```javascript
// Form submit event
document.addEventListener('submit', function(e) {
    track('identify', { email, phone });
});
```
→ `track.php` line 219-260 xử lý

### **B. API Calls → identify_visitor.php**
```php
// forms.php, purchase_events.php, custom_events.php
curl_exec(identify_visitor.php);
```
→ `identify_visitor.php` xử lý

### **C. No Overlap**
- ✅ tracker.js: HTML form submit
- ✅ API calls: Programmatic triggers
- ✅ Không xung đột

---

## ✅ **VALIDATION CHECKLIST**

- [ ] Run migration scripts
- [ ] Test form submit → Check web_visitors.subscriber_id
- [ ] Test purchase → Check web_visitors.zalo_user_id
- [ ] Test custom event → Check both IDs
- [ ] Verify no duplicate updates
- [ ] Check query performance with new indexes

---

## 🚨 **POTENTIAL ISSUES**

### **Issue 1: Missing Columns**
**Error:** `Unknown column 'zalo_user_id'`
**Fix:** Run Migration 1

### **Issue 2: NULL Constraint**
**Error:** Cannot insert NULL
**Fix:** All new columns are NULL-able ✓

### **Issue 3: Index Performance**
**Impact:** Slow queries on large tables
**Fix:** Migrations include indexes ✓

### **Issue 4: Cookie Not Set**
**Scenario:** `$_COOKIE['_mf_vid']` empty
**Fix:** Silent fail - không break form submit ✓

---

## 📊 **TESTING PLAN**

1. **Test Form Submit**
   - Submit form với email + phone
   - Verify subscriber_id updated
   - Verify zalo_user_id updated (if phone matches)

2. **Test Purchase**
   - Track purchase với email
   - Verify visitor linked

3. **Test Custom Event**
   - Trigger event với phone
   - Verify zalo_user_id linked

4. **Test Edge Cases**
   - No cookie → Should not crash
   - No match → Should update email/phone only
   - Match both → Should link both IDs

---

## 🎯 **CONCLUSION**

**Conflicts:** ❌ None
**Missing Columns:** ⚠️ `zalo_user_id`, possibly `phone`
**Action Required:** Run migrations
**Risk Level:** 🟢 Low (all changes are additive)
