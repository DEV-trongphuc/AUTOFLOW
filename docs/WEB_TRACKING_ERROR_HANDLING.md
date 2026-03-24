# Web Tracking Backend Error Handling Summary

## ✅ Đã hoàn thành - Tất cả endpoints đã có try-catch

### **File: `api/web_tracking.php`**

#### **1. List Properties** ✅
```php
GET /web_tracking.php?action=list
- Try-catch: ✅
- Error log: "Web Tracking List Error"
- Returns: Error message on failure
```

#### **2. Create Property** ✅
```php
POST /web_tracking.php?action=create
- Try-catch: ✅
- Error log: "Web Tracking Create Error"
- Validation: name, domain required
- Returns: Error message on failure
```

#### **3. Delete Property** ✅
```php
DELETE /web_tracking.php/{id}
- Try-catch: ✅
- Error log: "Web Tracking Delete Error"
- Cascade deletes: properties, visitors, sessions, page_views, events, daily_stats
- Returns: Error message on failure
```

#### **4. Stats Report** ✅
```php
GET /web_tracking.php?action=stats&id={id}&period={period}
- Try-catch: ✅
- Error log: "Web Tracking Stats Error"
- Null checks: All overview metrics have fallback to 0
- Returns: Detailed error message
```

#### **5. Visitors List & Journey** ✅
```php
GET /web_tracking.php?action=visitors&id={id}&visitor_id={optional}
- Try-catch: ✅
- Error log: "Web Tracking Visitors Error"
- Returns: Timeline or visitor list
- Limit: 500 visitors, 200 timeline items
```

#### **6. Page Details** ✅
```php
GET /web_tracking.php?action=page_details&id={id}&url={url}&device={device}
- Try-catch: ✅
- Error log: "Page Details Error"
- Device filter: all, mobile, desktop, tablet
- Null checks: All metrics have ?? 0 fallback
- Returns: Detailed error message
```

---

### **File: `api/track.php`**

#### **Tracking Endpoint** ✅
```php
POST /track.php
- Try-catch: Already has comprehensive error handling
- Handles: pageview, identify, ping, events
- URL normalization: Removes utm_*, fbclid, etc.
- Returns: Success/error status
```

---

## 🔍 **Error Logging Strategy**

### **All errors are logged to PHP error log:**
```php
error_log("Endpoint Name Error: " . $e->getMessage());
```

### **Check logs:**
```bash
# Linux/Mac
tail -f /var/log/php_errors.log

# Windows XAMPP
tail -f C:\xampp\php\logs\php_error_log

# Check PHP error log location
php -i | grep error_log
```

---

## 📊 **Database Error Prevention**

### **1. Column Name Issues - FIXED** ✅
- **Problem**: `web_events` table doesn't have `url` column
- **Solution**: Use JOIN with `web_page_views` to get URL
- **Affected queries**: topEvents, page_details events

### **2. MariaDB LIMIT in Subquery - FIXED** ✅
- **Problem**: MariaDB doesn't support `LIMIT` in `IN` subquery
- **Solution**: Replaced with JOIN
- **Affected query**: Bounce rate calculation

### **3. NULL Handling - FIXED** ✅
- **Problem**: Division by zero, NULL values
- **Solution**: 
  - Null coalescing operator `??`
  - Ternary checks before division
  - Default empty arrays `[]`

---

## 🛡️ **Best Practices Implemented**

### **1. Input Validation**
```php
if (!$id || !$url)
    sendResponse(false, [], 'Missing ID or URL');
```

### **2. Prepared Statements** ✅
```php
$stmt = $pdo->prepare("SELECT * FROM table WHERE id = ?");
$stmt->execute([$id]);
```

### **3. Error Response Format**
```json
{
    "success": false,
    "data": [],
    "message": "Error: SQLSTATE[42S22]: Column not found..."
}
```

### **4. Null Safety**
```php
'totalViews' => (int) ($pageOverview['totalViews'] ?? 0)
```

---

## 🚨 **Common Errors & Solutions**

### **Error 1: Column not found**
```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'url'
```
**Solution**: Use JOIN or MAX() aggregation

### **Error 2: LIMIT in subquery**
```
SQLSTATE[42000]: This version of MariaDB doesn't yet support 'LIMIT & IN/ALL/ANY/SOME subquery'
```
**Solution**: Rewrite with JOIN instead of IN subquery

### **Error 3: Division by zero**
```
PHP Warning: Division by zero
```
**Solution**: Check denominator before division
```php
$bounceRate = $totalSessions > 0 ? ($bouncedSessions / $totalSessions) * 100 : 0;
```

---

## 📝 **Testing Checklist**

- [x] List properties
- [x] Create property
- [x] Delete property
- [x] Get stats (all periods)
- [x] Get visitors list
- [x] Get visitor journey
- [x] Get page details (all devices)
- [x] Track pageview
- [x] Track events
- [x] URL normalization

---

## 🔧 **Maintenance**

### **Monitor Error Logs**
```bash
# Watch for errors in real-time
tail -f /var/log/php_errors.log | grep "Web Tracking"
```

### **Database Health Check**
```sql
-- Check for missing indexes
SHOW INDEX FROM web_events;
SHOW INDEX FROM web_page_views;
SHOW INDEX FROM web_sessions;

-- Check table sizes
SELECT 
    TABLE_NAME,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS 'Size (MB)',
    TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'your_database'
AND TABLE_NAME LIKE 'web_%'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;
```

---

**Last Updated:** 2026-01-09  
**Status:** ✅ All endpoints protected with try-catch  
**Error Handling:** 100% coverage
