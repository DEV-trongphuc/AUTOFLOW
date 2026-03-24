# Live Voice - Actions to Natural Speech

## 🎯 Feature: Convert Actions to Natural Questions

Khi AI trả lời có `[ACTIONS: ...]` trong Live Voice mode, thay vì bỏ qua, AI sẽ đọc thành câu hỏi tự nhiên.

---

## 📝 Examples

### **Example 1: Single Action**

**Input:**
```
Chúng tôi có nhiều chương trình học bổng.
[ACTIONS: Xem danh sách học bổng]
```

**TTS Output:**
```
"Chúng tôi có nhiều chương trình học bổng. 
Anh chị có muốn tìm hiểu thêm về Xem danh sách học bổng không ạ?"
```

---

### **Example 2: Two Actions**

**Input:**
```
Chúng tôi có MBA và EMBA.
[ACTIONS: Tìm hiểu MBA | Tìm hiểu EMBA]
```

**TTS Output:**
```
"Chúng tôi có MBA và EMBA. 
Anh chị có muốn tìm hiểu thêm về Tìm hiểu MBA hoặc Tìm hiểu EMBA không ạ?"
```

---

### **Example 3: Multiple Actions (3+)**

**Input:**
```
Chúng tôi có nhiều chương trình.
[ACTIONS: MBA | EMBA | DBA | Foundation]
```

**TTS Output:**
```
"Chúng tôi có nhiều chương trình. 
Anh chị có muốn tìm hiểu thêm về MBA, EMBA, DBA, hoặc Foundation không ạ?"
```

---

### **Example 4: Actions with Commas**

**Input:**
```
Bạn có thể chọn các dịch vụ sau.
[ACTIONS: Tư vấn miễn phí, Đăng ký học thử, Tải tài liệu]
```

**TTS Output:**
```
"Bạn có thể chọn các dịch vụ sau. 
Anh chị có muốn tìm hiểu thêm về Tư vấn miễn phí, Đăng ký học thử, hoặc Tải tài liệu không ạ?"
```

---

## 🔧 Technical Implementation

### **Code Logic:**

```javascript
// 1. Extract actions from tag
const actionsMatch = text.match(/\[(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?\s*(.*?)\]/i);

// 2. Parse actions (split by | or ,)
const actions = actionsMatch[1]
    .split(/[|,]/)
    .map(a => a.trim())
    .filter(a => a);

// 3. Format based on count
if (actions.length === 1) {
    // "Anh chị có muốn tìm hiểu thêm về [action] không ạ?"
    actionsList = actions[0];
    
} else if (actions.length === 2) {
    // "Anh chị có muốn tìm hiểu thêm về [action1] hoặc [action2] không ạ?"
    actionsList = actions.join(' hoặc ');
    
} else {
    // "Anh chị có muốn tìm hiểu thêm về [a1], [a2], hoặc [a3] không ạ?"
    actionsList = actions.slice(0, -1).join(', ') + ', hoặc ' + actions[actions.length - 1];
}

// 4. Create natural question
const actionPrompt = `Anh chị có muốn tìm hiểu thêm về ${actionsList} không ạ?`;

// 5. Replace tag with prompt
speakable = speakable.replace(/\[ACTIONS:.*?\]/, actionPrompt);
```

---

## 📊 Formatting Rules

### **1 Action:**
```
Format: "[action]"
Example: "Xem danh sách học bổng"
```

### **2 Actions:**
```
Format: "[action1] hoặc [action2]"
Example: "Tìm hiểu MBA hoặc Tìm hiểu EMBA"
```

### **3+ Actions:**
```
Format: "[a1], [a2], ..., hoặc [an]"
Example: "MBA, EMBA, DBA, hoặc Foundation"
```

---

## 🎭 User Experience

### **Before (Old Behavior):**
```
AI Text: "Chúng tôi có MBA và EMBA. [ACTIONS: MBA | EMBA]"
AI Speech: "Chúng tôi có MBA và EMBA." ❌ (Actions ignored)
UI: Shows buttons for MBA and EMBA
```

### **After (New Behavior):**
```
AI Text: "Chúng tôi có MBA và EMBA. [ACTIONS: MBA | EMBA]"
AI Speech: "Chúng tôi có MBA và EMBA. Anh chị có muốn tìm hiểu thêm về MBA hoặc EMBA không ạ?" ✅
UI: Shows buttons for MBA and EMBA
```

**Result:** User knows they can ask about those topics!

---

## 🔄 Complete Flow

```
1. AI generates response with actions
   ↓
   "Chúng tôi có nhiều chương trình. [ACTIONS: MBA | EMBA | DBA]"

2. Text displayed in UI
   ↓
   Shows: "Chúng tôi có nhiều chương trình."
   Buttons: [MBA] [EMBA] [DBA]

3. TTS processes text
   ↓
   Detects: [ACTIONS: MBA | EMBA | DBA]
   Converts: "Anh chị có muốn tìm hiểu thêm về MBA, EMBA, hoặc DBA không ạ?"

4. AI speaks
   ↓
   "Chúng tôi có nhiều chương trình. 
    Anh chị có muốn tìm hiểu thêm về MBA, EMBA, hoặc DBA không ạ?"

5. User responds
   ↓
   "Cho tôi biết về MBA"
```

---

## 🎯 Edge Cases

### **Empty Actions:**
```
Input: [ACTIONS: ]
Output: (Tag removed, no speech)
```

### **Whitespace Only:**
```
Input: [ACTIONS:    ]
Output: (Tag removed, no speech)
```

### **Invalid Separators:**
```
Input: [ACTIONS: MBA EMBA DBA]
Output: "Anh chị có muốn tìm hiểu thêm về MBA EMBA DBA không ạ?"
(Treated as single action)
```

### **Mixed Separators:**
```
Input: [ACTIONS: MBA | EMBA, DBA]
Output: "Anh chị có muốn tìm hiểu thêm về MBA, EMBA, hoặc DBA không ạ?"
(Both | and , work)
```

---

## 🧪 Testing

### **Test Cases:**

1. **Single action:**
   - Input: `[ACTIONS: Xem thêm]`
   - Expected: "Anh chị có muốn tìm hiểu thêm về Xem thêm không ạ?"

2. **Two actions:**
   - Input: `[ACTIONS: MBA | EMBA]`
   - Expected: "Anh chị có muốn tìm hiểu thêm về MBA hoặc EMBA không ạ?"

3. **Three actions:**
   - Input: `[ACTIONS: MBA | EMBA | DBA]`
   - Expected: "Anh chị có muốn tìm hiểu thêm về MBA, EMBA, hoặc DBA không ạ?"

4. **Four actions:**
   - Input: `[ACTIONS: MBA | EMBA | DBA | Foundation]`
   - Expected: "Anh chị có muốn tìm hiểu thêm về MBA, EMBA, DBA, hoặc Foundation không ạ?"

5. **Comma separator:**
   - Input: `[ACTIONS: Tư vấn, Đăng ký, Tải tài liệu]`
   - Expected: "Anh chị có muốn tìm hiểu thêm về Tư vấn, Đăng ký, hoặc Tải tài liệu không ạ?"

---

## 💡 Why This Matters

### **Before:**
- ❌ User hears incomplete information
- ❌ Doesn't know what options are available
- ❌ Has to look at screen to see buttons
- ❌ Breaks voice-only experience

### **After:**
- ✅ User hears complete information
- ✅ Knows exactly what options are available
- ✅ Can respond without looking at screen
- ✅ True voice-first experience

---

## 🎨 Natural Language Variations

The system uses natural Vietnamese phrasing:

**Single:**
```
"Anh chị có muốn tìm hiểu thêm về [X] không ạ?"
```

**Two:**
```
"Anh chị có muốn tìm hiểu thêm về [X] hoặc [Y] không ạ?"
```

**Multiple:**
```
"Anh chị có muốn tìm hiểu thêm về [X], [Y], hoặc [Z] không ạ?"
```

This sounds natural and polite in Vietnamese!

---

## 📝 Code Location

**File:** `public/ai-chat-embedded.js`

**Function:** `speakText()`

**Lines:** 285-317 (approximately)

---

## 🚀 Future Enhancements

Possible improvements:
- [ ] Detect action type and use specific verbs
  - "Xem" → "Anh chị có muốn xem..."
  - "Đăng ký" → "Anh chị có muốn đăng ký..."
- [ ] Shorten for many actions (5+)
  - "Anh chị có muốn tìm hiểu thêm về các chương trình này không ạ?"
- [ ] Context-aware phrasing
  - After listing courses → "chương trình nào"
  - After listing services → "dịch vụ nào"
