# Live Voice Mode - Visual Effects & Icons

## 🎨 Hiệu ứng hạt hội tụ (Particle Convergence)

### Khi nào hiển thị?
Khi AI đang phân tích câu hỏi của bạn (trạng thái `loading`)

### Mô tả hiệu ứng:
- **8 hạt nhỏ** màu cam (brand color) bay từ xung quanh
- Hội tụ vào **orb trung tâm** theo chuyển động xoắn ốc
- Tạo cảm giác "đang gom dữ liệu" rất trực quan
- Animation lặp lại mỗi 2 giây

### Technical Details:
```css
.mf-live-orb.loading::before {
    /* 8 particles positioned around the orb */
    background: 
        radial-gradient(circle at 20% 30%, #ffa90040 2px, transparent 2px),
        radial-gradient(circle at 80% 20%, #ffa90040 2px, transparent 2px),
        /* ... 6 more particles ... */
    
    /* Converge animation */
    animation: mfParticleConverge 2s infinite ease-in-out;
}

@keyframes mfParticleConverge {
    0%   { scale(2) rotate(0deg);   opacity: 0; }    /* Far away */
    50%  { opacity: 0.8; }                           /* Mid-way */
    100% { scale(0.3) rotate(180deg); opacity: 0; }  /* Close to orb */
}
```

---

## 🎭 Icons trong các trạng thái

### 1. **Đang phân tích (Loading)**
- **Icon:** `sparkles` ✨
- **Màu:** Trắng
- **Animation:** Breathe (phóng to/thu nhỏ nhẹ)
- **Orb:** Pulsing (1.0 → 1.1 scale)
- **Hiệu ứng đặc biệt:** Hạt hội tụ ⭐

```javascript
const icon = document.getElementById('mf-live-icon');
if (icon) icon.innerHTML = ICONS.sparkles;

const orb = document.querySelector('.mf-live-orb');
if (orb) orb.classList.add('loading');
```

### 2. **Đang nói (Speaking)**
- **Icon:** `activity` 📊 (biểu tượng sóng âm thanh)
- **Màu:** Trắng
- **Animation:** Pulse nhanh (0.8s)
- **Orb:** Speaking animation (sóng nhanh)
- **Text:** Hiển thị lyrics AI đang nói

```javascript
const icon = document.getElementById('mf-live-icon');
if (icon) icon.innerHTML = ICONS.activity;

const orb = document.querySelector('.mf-live-orb');
if (orb) {
    orb.classList.remove('loading');
    orb.classList.add('speaking');
}
```

### 3. **Đang lắng nghe (Listening)**
- **Icon:** `mic` 🎤
- **Màu:** Trắng
- **Animation:** Không có (tĩnh)
- **Orb:** Pulse chậm (4s)
- **Text:** "ĐANG LẮNG NGHE" + 3 dots animation

```javascript
const icon = document.getElementById('mf-live-icon');
if (icon) icon.innerHTML = ICONS.mic;
```

### 4. **Chờ người dùng (Idle)**
- **Icon:** `mic` 🎤
- **Màu:** Trắng
- **Animation:** Không có
- **Orb:** Pulse chậm (4s)
- **Text:** "Ấn để nói"

---

## 🔄 Flow trạng thái

```
[User clicks] 
    ↓
[LISTENING] 🎤
    ↓ (user speaks)
[User stops speaking]
    ↓
[LOADING] ✨ + Particles ⭐
    ↓ (AI processes)
[SPEAKING] 📊 + Lyrics
    ↓ (AI finishes)
[LISTENING] 🎤 (auto-restart)
```

---

## 🎯 Code locations

### Icons definition (Line 32-50)
```javascript
const ICONS = {
    sparkles: `<svg>...</svg>`,  // ✨ Analyzing
    activity: `<svg>...</svg>`,  // 📊 Speaking
    mic: `<svg>...</svg>`,       // 🎤 Listening
    // ...
};
```

### Loading state (Line 2090-2107)
```javascript
if (State.isLiveMode) {
    const orb = document.querySelector('.mf-live-orb');
    if (orb) orb.classList.add('loading'); // Triggers particles!
    
    const icon = document.getElementById('mf-live-icon');
    if (icon) icon.innerHTML = ICONS.sparkles; // ✨
}
```

### Speaking state (Line 2443-2446)
```javascript
const orb = document.querySelector('.mf-live-orb');
const icon = document.getElementById('mf-live-icon');
if (orb) {
    orb.classList.remove('loading');
    orb.classList.add('speaking');
}
if (icon) icon.innerHTML = ICONS.activity; // 📊
```

### Particle CSS (Line 1022-1053)
```css
.mf-live-orb.loading::before {
    /* Particle convergence effect */
}
```

---

## 🎨 Visual Preview

See the generated image above showing 3 frames of the particle convergence animation:
1. **Frame 1:** Particles far away from orb
2. **Frame 2:** Particles mid-way, converging
3. **Frame 3:** Particles close to orb, fading out

---

## 💡 Design rationale

### Why particles?
- **Visual feedback:** User knows AI is actively processing
- **Data metaphor:** Particles = data being gathered and analyzed
- **Premium feel:** Adds polish and sophistication
- **Non-intrusive:** Subtle enough not to distract

### Why different icons?
- **Clear state indication:** User always knows what's happening
- **Sparkles (✨):** Universal symbol for "magic" / AI processing
- **Activity (📊):** Represents audio waveform / speaking
- **Mic (🎤):** Obvious listening indicator

---

## 🧪 Testing

To see the particle effect:
1. Open Live Voice Mode
2. Ask a question
3. Watch the orb during "ĐANG PHÂN TÍCH" phase
4. You should see 8 orange particles spiraling inward

**Expected behavior:**
- Particles appear from ~200px away
- Converge toward center in 2 seconds
- Rotate 180° while converging
- Fade in (0 → 0.8) then fade out (0.8 → 0)
- Loop continuously until AI responds
