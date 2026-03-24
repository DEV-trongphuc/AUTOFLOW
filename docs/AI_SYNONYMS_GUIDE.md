# Quy tắc ưu tiên của Từ Đồng Nghĩa (Synonyms) trong AI Training

## Tổng quan

Hệ thống từ đồng nghĩa giúp AI hiểu rõ hơn các thuật ngữ chuyên ngành và các cách diễn đạt khác nhau của cùng một khái niệm. Khi người dùng hỏi, AI sẽ tự động mở rộng câu truy vấn bằng các từ đồng nghĩa để tìm kiếm chính xác hơn.

## Cách hoạt động

### 1. Cấu trúc dữ liệu

Từ đồng nghĩa được lưu trữ dưới dạng:
```json
{
  "intent_configs": {
    "synonyms": {
      "giá": ["chi phí", "học phí", "phí", "tiền"],
      "EMBA": ["Executive MBA", "MBA điều hành", "Thạc sĩ điều hành"],
      "học": ["đào tạo", "training", "khóa học"]
    }
  }
}
```

### 2. Quy tắc áp dụng

#### A. Mở rộng truy vấn (Query Expansion)
Khi người dùng hỏi: **"Giá EMBA là bao nhiêu?"**

Hệ thống sẽ tự động mở rộng thành:
- "Giá EMBA là bao nhiêu?"
- "Chi phí EMBA là bao nhiêu?"
- "Học phí EMBA là bao nhiêu?"
- "Phí EMBA là bao nhiêu?"
- "Giá Executive MBA là bao nhiêu?"
- "Giá MBA điều hành là bao nhiêu?"
- ...và tất cả các tổ hợp khác

#### B. Thứ tự ưu tiên

1. **Từ khóa chính (Key)** luôn được ưu tiên cao nhất
   - Ví dụ: "giá" trong nhóm `"giá": ["chi phí", "học phí"]`
   
2. **Từ đồng nghĩa** được áp dụng song song
   - Tất cả các từ trong danh sách đều có độ ưu tiên ngang nhau
   
3. **Kết hợp với RAG (Retrieval-Augmented Generation)**
   - Sau khi mở rộng, hệ thống sử dụng Vector Similarity để tìm tài liệu phù hợp nhất
   - Similarity Score (0.0 - 1.0) quyết định tài liệu nào được chọn

#### C. Ví dụ thực tế

**Cấu hình:**
```json
{
  "synonyms": {
    "học phí": ["chi phí", "giá", "phí"],
    "EMBA": ["Executive MBA", "MBA điều hành"],
    "môn học": ["subject", "course", "khóa học"]
  }
}
```

**Câu hỏi:** "Chi phí Executive MBA có những môn học gì?"

**Mở rộng thành:**
- "Chi phí Executive MBA có những môn học gì?"
- "Học phí Executive MBA có những môn học gì?"
- "Giá Executive MBA có những môn học gì?"
- "Chi phí EMBA có những môn học gì?"
- "Chi phí MBA điều hành có những môn học gì?"
- "Chi phí Executive MBA có những subject gì?"
- "Chi phí Executive MBA có những course gì?"
- "Chi phí Executive MBA có những khóa học gì?"
- ...và tất cả các tổ hợp

### 3. Chiến lược tối ưu

#### A. Nhóm từ theo ngữ cảnh
```json
{
  "học phí": ["chi phí", "giá", "phí", "tiền học"],
  "đăng ký": ["đăng kí", "đk", "register", "enroll"],
  "chương trình": ["khóa học", "course", "program", "lớp"]
}
```

#### B. Tránh trùng lặp
❌ **Không nên:**
```json
{
  "giá": ["chi phí", "học phí"],
  "học phí": ["chi phí", "giá"]  // Tạo vòng lặp
}
```

✅ **Nên:**
```json
{
  "học phí": ["chi phí", "giá", "phí", "tiền"]
}
```

#### C. Sử dụng từ khóa phổ biến làm Key
- Key nên là từ mà người dùng hay dùng nhất
- Các biến thể ít phổ biến hơn nên để trong danh sách đồng nghĩa

### 4. Tích hợp với AI

#### A. Luồng xử lý
```
Câu hỏi người dùng
    ↓
Mở rộng với Synonyms
    ↓
Tạo Vector Embedding
    ↓
Tìm kiếm trong Knowledge Base (RAG)
    ↓
Lọc theo Similarity Score
    ↓
Trả về kết quả tốt nhất
```

#### B. Tham số ảnh hưởng

1. **similarity_threshold** (0.0 - 1.0)
   - Mặc định: 0.45
   - Càng cao = càng chặt chẽ
   - Càng thấp = càng rộng (dễ ảo giác)

2. **top_k** (số lượng tài liệu)
   - Mặc định: 12
   - Số lượng tài liệu tối đa được trả về từ RAG

3. **history_limit** (số lượng tin nhắn)
   - Mặc định: 20
   - Số lượng tin nhắn lịch sử được sử dụng để hiểu ngữ cảnh

### 5. Tính năng "AI Quét & Tự Học Thêm"

Tính năng này sử dụng AI để:
1. Phân tích toàn bộ Knowledge Base
2. Tìm các thuật ngữ chuyên ngành
3. Tự động tạo nhóm từ đồng nghĩa
4. Gợi ý bổ sung vào danh sách hiện có

**Lưu ý:** Luôn kiểm tra và chỉnh sửa kết quả AI đề xuất trước khi lưu.

### 6. Best Practices

#### A. Cập nhật thường xuyên
- Thêm từ đồng nghĩa khi phát hiện người dùng hỏi theo cách mới
- Xem lại log chat để tìm các mẫu câu hỏi phổ biến

#### B. Test kỹ lưỡng
- Sử dụng chức năng "Test AI" để kiểm tra
- Thử nhiều cách hỏi khác nhau
- Đảm bảo AI trả lời đúng với tất cả các biến thể

#### C. Kết hợp với Tags
- Sử dụng Tags trong tài liệu để tăng độ chính xác
- Tags + Synonyms = Tìm kiếm cực kỳ mạnh mẽ

## Ví dụ hoàn chỉnh

### Cấu hình cho trường đào tạo MBA

```json
{
  "synonyms": {
    "học phí": ["chi phí", "giá", "phí", "tiền học", "cost"],
    "EMBA": ["Executive MBA", "MBA điều hành", "Thạc sĩ điều hành"],
    "MBA": ["Master of Business Administration", "Thạc sĩ Quản trị"],
    "DBA": ["Doctor of Business Administration", "Tiến sĩ Quản trị"],
    "đăng ký": ["đăng kí", "đk", "register", "enroll", "ghi danh"],
    "chương trình": ["khóa học", "course", "program", "lớp học"],
    "môn học": ["subject", "module", "học phần"],
    "học bổng": ["scholarship", "hỗ trợ tài chính", "financial aid"],
    "thời gian": ["lịch học", "schedule", "thời khóa biểu"],
    "bằng cấp": ["văn bằng", "degree", "certificate", "chứng chỉ"]
  }
}
```

### Kết quả

Với cấu hình trên, AI có thể hiểu và trả lời chính xác cho tất cả các câu hỏi sau:
- "Chi phí EMBA là bao nhiêu?"
- "Giá Executive MBA thế nào?"
- "Phí của MBA điều hành ra sao?"
- "Tôi muốn đăng ký course DBA"
- "Register cho Tiến sĩ Quản trị như thế nào?"
- "Có scholarship cho Thạc sĩ điều hành không?"
- "Lịch học của program MBA?"
- "Văn bằng sau khi hoàn thành khóa học?"

## Kết luận

Hệ thống từ đồng nghĩa là công cụ mạnh mẽ để tăng độ chính xác và khả năng hiểu của AI. Khi kết hợp với RAG và Vector Search, nó tạo ra trải nghiệm chatbot thông minh và tự nhiên cho người dùng.

**Lưu ý quan trọng:** Từ đồng nghĩa không thay thế việc có dữ liệu chất lượng trong Knowledge Base. Chúng chỉ giúp AI tìm đúng tài liệu nhanh hơn.
