# iOS Audio Streaming & Live Mode Fixes

## Vấn đề đã khắc phục

### 1. **Màn hình trống khi tắt/mở lại Live Mode**
**Triệu chứng:** 
- Lần đầu vào Live Mode: Hiển thị "CẤP QUYỀN ÂM THANH (Ấn để bắt đầu)" ✅
- Tắt và mở lại: Màn hình trống hoàn toàn ❌

**Nguyên nhân:**
- Flag `hasFirstTouch` không được reset khi tắt Live Mode
- iOS yêu cầu user interaction mới cho mỗi session audio
- UI không được clear khi đóng Live Mode

**Giải pháp:**
```javascript
// Khi đóng Live Mode trên iOS
if (isIOS()) {
    State.hasFirstTouch = false; // Reset flag
}

// Clear UI
const wrapper = document.getElementById('mf-lyric-wrapper');
if (wrapper) wrapper.innerHTML = '';
```

### 2. **Âm thanh không phát được trên iOS**
**Triệu chứng:**
- Text hiển thị đúng nhưng không có âm thanh
- Console log: "AudioContext state: suspended"

**Nguyên nhân:**
- iOS tự động suspend AudioContext khi:
  - App chuyển sang background
  - Lock screen
  - Sau một thời gian không hoạt động
  - Khi toggle Live Mode

**Giải pháp:**
```javascript
// AGGRESSIVELY resume AudioContext trước MỖI lần phát
if (audioCtx && audioCtx.state === 'suspended') {
    await audioCtx.resume();
    
    // Đợi đến khi thực sự running
    let retries = 0;
    while (audioCtx.state !== 'running' && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        retries++;
    }
}
```

### 3. **State không được clean up đúng**
**Triệu chứng:**
- Âm thanh cũ vẫn phát khi mở lại
- UI hiển thị text cũ
- Mic không hoạt động đúng

**Giải pháp:**
```javascript
// Khi đóng Live Mode
streamSegments = [];
streamPlaybackIndex = 0;
isStreamPlaying = false;
State.isSpeaking = false;
```

## Các thay đổi chính

### File: `ai-chat-embedded.js`

#### 1. **toggleLive() - Line 407-433**
- ✅ Reset `hasFirstTouch` khi đóng Live Mode trên iOS
- ✅ Clear tất cả audio state (segments, playback index, flags)
- ✅ Clear UI wrapper để tránh hiển thị nội dung cũ

#### 2. **processStreamPlayback() - Line 2329-2369**
- ✅ Resume AudioContext trước MỖI lần phát
- ✅ Retry logic để đảm bảo context thực sự running
- ✅ Xử lý trường hợp context bị closed (recreate)
- ✅ Skip segment nếu không thể resume sau nhiều lần thử

#### 3. **iOS Permission Prompt - Line 548-565**
- ✅ Luôn hiển thị prompt khi `hasFirstTouch = false`
- ✅ Auto-start session nếu đã có permission
- ✅ Log rõ ràng để debug

#### 4. **UI Cleanup on Close - Line 584-594**
- ✅ Clear lyric wrapper khi tắt Live Mode
- ✅ Đảm bảo state sạch cho lần mở tiếp theo

## Testing Checklist

### iOS Safari / Chrome
- [ ] Lần đầu vào Live Mode: Hiển thị "CẤP QUYỀN ÂM THANH"
- [ ] Ấn vào màn hình: Mic bật, hiển thị "ĐANG LẮNG NGHE"
- [ ] Nói câu hỏi: AI trả lời có âm thanh
- [ ] Tắt Live Mode
- [ ] Mở lại Live Mode: Hiển thị "CẤP QUYỀN ÂM THANH" (không trống)
- [ ] Ấn lại: Mic hoạt động bình thường
- [ ] Lock screen trong khi AI đang nói
- [ ] Unlock: Âm thanh tiếp tục phát (hoặc resume đúng)
- [ ] Chuyển sang app khác rồi quay lại
- [ ] Âm thanh vẫn hoạt động

### Android (Kiểm tra không bị regression)
- [ ] Vào Live Mode: Auto-start ngay (không cần ấn)
- [ ] Mic hoạt động
- [ ] Âm thanh phát đúng
- [ ] Tắt/mở lại: Vẫn hoạt động bình thường

## Logs để Debug

Khi test, check console logs:
```
[MF AI] iOS: Reset hasFirstTouch on Live Mode close
[MF AI] iOS: Showing permission prompt (hasFirstTouch=false)
[MF AI] AudioContext resumed from suspended, state: running
[MF AI Live] Live mode ended. Sound disabled, voices stopped, UI cleared.
```

## Lưu ý quan trọng

1. **iOS Audio Context Lifecycle:**
   - Luôn cần user interaction để unlock
   - Có thể bị suspend bất cứ lúc nào
   - Phải resume trước MỖI lần phát (không chỉ lần đầu)

2. **State Management:**
   - Reset `hasFirstTouch` chỉ trên iOS
   - Android không cần vì không có giới hạn này
   - Clear UI để tránh confusion

3. **Error Handling:**
   - Nếu resume fail → skip segment, thử segment tiếp theo
   - Nếu context closed → recreate
   - Retry với timeout để tránh infinite loop

## Performance Impact

- ✅ Minimal: Chỉ thêm ~50-500ms cho resume check
- ✅ Chỉ ảnh hưởng iOS (Android không chạy logic này)
- ✅ Retry capped ở 10 lần (max 500ms)
