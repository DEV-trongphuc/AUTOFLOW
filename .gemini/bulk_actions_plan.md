# Bulk Actions for "Đang ở đây" (Waiting Subscribers)

## Summary
Add bulk selection and actions for subscribers in "waiting" status:
- ✅ Select multiple subscribers with checkboxes
- 🚀 **Next Step**: Force move selected subscribers to next step
- ❌ **Remove**: Remove selected subscribers from flow

## Changes Required:

### 1. StepParticipantsModal.tsx
- Add state: `selectedIds` (Set<string>)
- Add checkbox column in table header + body
- Add bulk action bar (sticky bottom) when selections > 0
- Add handlers: `handleSelectAll`, `handleSelectOne`, `handleBulkNextStep`, `handleBulkRemove`

### 2. Backend API (api/flows.php)
Add new routes:
- `route=bulk-next-step` - Move subscribers to next step
- `route=bulk-remove` - Remove subscribers from flow

### 3. FlowAnalyticsTab.tsx
- Pass bulk action handlers to modal
- Refresh data after bulk actions complete

## UI Design:
- Checkbox: Small, rounded, blue accent
- Action Bar: Fixed bottom, white bg, shadow, slide-up animation
- Buttons: 
  - Next Step: Blue gradient, FastForward icon
  - Remove: Red gradient, Trash2 icon
- Show count: "X subscribers selected"
