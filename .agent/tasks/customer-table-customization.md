# Task: Customer Table Customization

## Mục tiêu
Nâng cao trải nghiệm xem danh sách khách hàng với:
1. Bộ lọc "Tương tác gần đây" 
2. Tùy chỉnh cột hiển thị (column visibility)
3. Tùy chỉnh số lượng items/trang (10, 20, 50)

## Chi tiết yêu cầu

### 1. Bộ lọc "Tương tác gần đây"
- Thêm option trong dropdown Sort/Filter
- Cho phép xem khách hàng có `last_activity_at` trong X ngày gần đây
- Mặc định: 7 ngày, 30 ngày, 90 ngày, hoặc tùy chỉnh

### 2. Tùy chỉnh cột hiển thị
**Các cột có thể ẩn/hiện:**
- ✅ Tên (Bắt buộc - không thể ẩn)
- Email
- Số điện thoại
- Công ty
- Nguồn
- Trạng thái
- Điểm Lead Score
- Ngày tham gia
- Hoạt động gần nhất
- Tags

**UI:**
- Button "Tùy chỉnh cột" với icon Settings/Columns
- Dropdown checklist để chọn cột
- Lưu preferences vào localStorage

### 3. Tùy chỉnh items/trang
- Dropdown chọn: 10, 20, 50 items
- Lưu vào localStorage
- Mặc định: 50

## Implementation Plan

### Phase 1: Backend - Add Recent Activity Filter
**File:** `api/subscribers.php`
- [ ] Thêm filter `recent_activity` vào GET params
- [ ] Parse `recent_days` parameter
- [ ] Add WHERE clause: `last_activity_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`

### Phase 2: Frontend - Column Customization
**File:** `components/audience/tabs/ContactsTab.tsx`
- [ ] Tạo state `visibleColumns` với default columns
- [ ] Tạo component `ColumnCustomizer` - dropdown với checkboxes
- [ ] Lưu/load preferences từ localStorage
- [ ] Render table columns dựa trên `visibleColumns`
- [ ] Ensure "Tên" column luôn visible (disabled checkbox)

### Phase 3: Frontend - Items Per Page
**File:** `components/audience/tabs/ContactsTab.tsx`
- [ ] Thêm dropdown chọn items/page (10, 20, 50)
- [ ] Update `limit` state khi thay đổi
- [ ] Lưu vào localStorage
- [ ] Reset về page 1 khi thay đổi limit

### Phase 4: Frontend - Recent Activity Filter
**File:** `components/audience/tabs/ContactsTab.tsx` hoặc `pages/Audience.tsx`
- [ ] Thêm option "Tương tác gần đây" vào sort dropdown
- [ ] Hiển thị input/select cho số ngày
- [ ] Gửi params `sort=recent_activity&recent_days=X` đến API

### Phase 5: UI/UX Polish
- [ ] Icon và label rõ ràng
- [ ] Tooltip giải thích
- [ ] Animation mượt mà
- [ ] Responsive design

## Technical Notes

### LocalStorage Keys
```typescript
const STORAGE_KEYS = {
  VISIBLE_COLUMNS: 'mailflow_visible_columns',
  ITEMS_PER_PAGE: 'mailflow_items_per_page'
};
```

### Default Visible Columns
```typescript
const DEFAULT_COLUMNS = [
  'name',      // Bắt buộc
  'email',
  'phone',
  'status',
  'leadScore',
  'joinedAt',
  'tags'
];
```

### Column Definitions
```typescript
interface ColumnDef {
  id: string;
  label: string;
  required: boolean; // true for 'name'
  width?: string;
}
```

## Testing Checklist
- [ ] Filter "Tương tác gần đây" hoạt động đúng
- [ ] Ẩn/hiện cột không ảnh hưởng data
- [ ] Cột "Tên" không thể ẩn
- [ ] Preferences được lưu và load lại
- [ ] Pagination reset đúng khi đổi items/page
- [ ] Responsive trên mobile

## Priority
**High** - Cải thiện UX đáng kể cho người dùng quản lý nhiều khách hàng
