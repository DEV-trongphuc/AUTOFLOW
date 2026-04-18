# Web Tracking Metrics - Google Analytics Compliance Check

## ✅ METRICS ĐÚNG (Chuẩn GA)

### 1. **Active Time Tracking** ✓
- Chỉ tính thời gian khi tab visible
- Pause khi tab hidden/minimize
- Resume khi tab visible lại
- **Location:** `tracker.js` lines 368-395

### 2. **Page Views** ✓
- Đếm mỗi lần load page
- Hỗ trợ SPA (Single Page App)
- **Location:** `tracker.js` lines 166-241

### 3. **Visitors & Sessions** ✓
- Visitor: Unique ID lưu localStorage
- Session: Tự động tạo mới sau 30 phút inactive
- **Location:** `tracker.js` lines 66-70, `track.php` lines 165-196

### 4. **Average Duration** ✓
- Tính từ `duration_seconds` (chỉ active time)
- **Formula:** `SUM(duration_seconds) / COUNT(sessions)`
- **Location:** `web_tracking.php` line 161

---

## ⚠️ METRICS CẦN SỬA

### 1. **Bounce Rate** ✅
- **Fixed:** Added `hasInteraction` check in `track.php`.
- **Fixed:** Corrected fallback queries in `web_tracking.php`.
- **Fixed:** Updated per-page logic to divide by entrances instead of views.
- **Migration:** Run successfully via `api/migrate_web_metrics_fix.php`.

---

## 📋 CHECKLIST HOÀN CHỈNH

| Metric | Status | Chuẩn GA | Notes |
|--------|--------|----------|-------|
| Visitors | ✅ | ✅ | Unique visitor ID |
| Sessions | ✅ | ✅ | 30min timeout |
| Page Views | ✅ | ✅ | Includes SPA |
| Bounce Rate | ✅ | ✅ | Logic correctly uses entrances. |
| Avg Duration | ✅ | ✅ | Active time only |
| Avg Time on Page | ✅ | ✅ | Per page tracking |
| Scroll Depth | ✅ | ✅ | 25%, 50%, 75%, 90% |
| Click Tracking | ✅ | ✅ | Smart text extraction |
| Traffic Sources | ✅ | ✅ | UTM + auto-detect |
| Device Detection | ✅ | ✅ | Mobile/Desktop/Tablet |


---

## 🔧 ACTIONS NEEDED

1. **Verify Results**
   - Check dashboard bounce rate
   - Compare with expected values


---

## 📊 EXPECTED IMPROVEMENTS

**Before:**
- Bounce Rate: ~70% (inflated)
- Sessions with 1 page + interactions counted as bounce

**After:**
- Bounce Rate: ~40-50% (realistic)
- Only true bounces (no interaction) counted

---

## ✨ BONUS FEATURES (Beyond GA)

1. **Canvas Click Tracking** - Track clicks on non-interactive elements
2. **Context Extraction** - Smart text discovery for unknown clicks
3. **Text Selection Filter** - Don't track copy/paste as clicks
4. **SendBeacon** - Reliable data on page unload
5. **Batch Processing** - Optimized for millions of users
