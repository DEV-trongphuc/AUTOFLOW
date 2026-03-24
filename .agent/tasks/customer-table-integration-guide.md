# Summary: Customer Table Customization Implementation

## ✅ Completed

### 1. Backend API (Phase 1)
**File:** `api/subscribers.php`
- ✅ Added `recent_activity` filter
- ✅ Accepts `recent_days` parameter (default: 7)
- ✅ Filters by `last_activity_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`

**Usage:**
```
GET /api/subscribers.php?sort=recent_activity&recent_days=30
```

### 2. New Components Created

#### ColumnCustomizer Component
**File:** `components/audience/ColumnCustomizer.tsx`
- ✅ Dropdown to toggle column visibility
- ✅ Saves preferences to localStorage (`mailflow_visible_columns`)
- ✅ "Tên" column is required (can't be hidden)
- ✅ Clean UI with checkboxes

#### ItemsPerPageSelector Component  
**File:** `components/audience/ItemsPerPageSelector.tsx`
- ✅ Dropdown with options: 10, 20, 50
- ✅ Saves to localStorage (`mailflow_items_per_page`)
- ✅ Clean UI with current selection highlighted

## 📋 Integration Required

### Changes needed in `pages/Audience.tsx`

#### 1. Add Imports
```typescript
import ColumnCustomizer from '../components/audience/ColumnCustomizer';
import ItemsPerPageSelector from '../components/audience/ItemsPerPageSelector';
import { STORAGE_KEY as COLUMN_STORAGE } from '../components/audience/ColumnCustomizer';
import { STORAGE_KEY as ITEMS_STORAGE, DEFAULT_OPTIONS } from '../components/audience/ItemsPerPageSelector';
```

#### 2. Define Column Definitions (after line 32)
```typescript
const COLUMN_DEFINITIONS = [
    { id: 'name', label: 'Tên', required: true },
    { id: 'email', label: 'Email', required: false },
    { id: 'phone', label: 'Số điện thoại', required: false },
    { id: 'company', label: 'Công ty', required: false },
    { id: 'status', label: 'Trạng thái', required: false },
    { id: 'lastActivity', label: 'Hoạt động gần nhất', required: false },
    { id: 'leadScore', label: 'Điểm Lead', required: false },
    { id: 'tags', label: 'Tags', required: false },
    { id: 'joinedAt', label: 'Ngày tham gia', required: false },
];

const DEFAULT_VISIBLE_COLUMNS = ['name', 'email', 'status', 'lastActivity', 'leadScore', 'tags', 'joinedAt'];
```

#### 3. Add State Variables (around line 76)
```typescript
const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
    const saved = localStorage.getItem(ITEMS_STORAGE);
    return saved ? parseInt(saved) : 50;
});

const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem(COLUMN_STORAGE);
    return saved ? JSON.parse(saved) : DEFAULT_VISIBLE_COLUMNS;
});
```

#### 4. Update Pagination Limit (replace line 267)
```typescript
const limit = itemsPerPage; // Changed from: const limit = ITEMS_PER_PAGE;
```

#### 5. Add Handler for Items Per Page Change
```typescript
const handleItemsPerPageChange = (newValue: number) => {
    setItemsPerPage(newValue);
    setPagination(prev => ({ ...prev, page: 1, limit: newValue })); // Reset to page 1
};
```

#### 6. Add Sort Option for Recent Activity
In the sort dropdown options (around line 700+), add:
```typescript
{ value: 'recent_activity', label: 'Tương tác gần đây' }
```

#### 7. Add UI for Recent Days Input
When `sortBy === 'recent_activity'`, show input for days:
```typescript
{sortBy === 'recent_activity' && (
    <div className="flex items-center gap-2 ml-2">
        <input
            type="number"
            min="1"
            max="365"
            value={recentDays}
            onChange={(e) => setRecentDays(parseInt(e.target.value) || 7)}
            className="w-16 px-2 py-1 border border-slate-200 rounded text-xs"
        />
        <span className="text-xs text-slate-500">ngày</span>
    </div>
)}
```

#### 8. Add Components to UI (in filter bar area)
```typescript
<div className="flex items-center gap-2">
    <ItemsPerPageSelector 
        value={itemsPerPage}
        onChange={handleItemsPerPageChange}
    />
    <ColumnCustomizer
        columns={COLUMN_DEFINITIONS}
        visibleColumns={visibleColumns}
        onChange={setVisibleColumns}
    />
</div>
```

### Changes needed in `components/audience/tabs/ContactsTab.tsx`

#### 1. Add Props
```typescript
interface ContactsTabProps {
    // ... existing props
    visibleColumns: string[];
}
```

#### 2. Conditionally Render Columns
Update table headers and cells to only render if column is in `visibleColumns`:
```typescript
{visibleColumns.includes('email') && <th>...</th>}
{visibleColumns.includes('email') && <td>...</td>}
```

## Testing Checklist
- [ ] Recent activity filter works with different day values
- [ ] Column visibility persists after page reload
- [ ] Items per page persists after page reload
- [ ] Changing items per page resets to page 1
- [ ] "Tên" column cannot be hidden
- [ ] All columns can be toggled except required ones
- [ ] UI is responsive and clean

## Next Steps
1. Integrate components into Audience.tsx
2. Update ContactsTab to respect visibleColumns
3. Test all features
4. Add recent_days state and UI
