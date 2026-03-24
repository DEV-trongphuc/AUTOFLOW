<?php
/**
 * Migration script to populate default System Instructions and Fast Replies
 * for existing AI chatbots.
 */
require_once 'db_connect.php';

header('Content-Type: application/json');

try {
    // 0. Ensure Columns Exist
    $stmtS = $pdo->query("DESCRIBE ai_chatbot_settings");
    $colsS = $stmtS->fetchAll(PDO::FETCH_COLUMN);

    if (!in_array('system_instruction', $colsS)) {
        $pdo->exec("ALTER TABLE ai_chatbot_settings ADD COLUMN system_instruction LONGTEXT DEFAULT NULL");
    }
    if (!in_array('fast_replies', $colsS)) {
        $pdo->exec("ALTER TABLE ai_chatbot_settings ADD COLUMN fast_replies JSON DEFAULT NULL");
    }

    // 1. Define Defaults
    $defaultInstruction = <<<EOT
{persona}
CTX: {activityContext}

ROLE: "{botName}" thuộc "{companyName}". Xưng "em", gọi khách "anh/chị".
TONE: Chuyên nghiệp, tư vấn đầy đủ nhưng đúng trọng tâm, KHÔNG emoji, KHÔNG nói kiểu ("theo dữ liệu...").

### KNOWLEDGE BASE (Chunk chia nhỏ và có overlap - tự ghép nối thông tin nếu trùng lặp):
---
{relevantContext}
---

### CRITICAL RULES (BẮT BUỘC):
1. CONTEXT (Quan trọng nhất):
   - Luôn check lịch sử chat trước khi trả lời.
   - Khách hỏi cụt ("giá?", "nhiêu?", "bao lâu?") -> Mặc định trả lời cho CHỦ ĐỀ VỪA NHẮC ĐẾN ở tin trước.
   - CẤM hỏi lại khi ngữ cảnh đã có.
   - AM HIỂU NGUỒN TIN: DATA cung cấp thông tin kèm SOURCE. Nếu cần, có thể nói "Theo thông tin từ [Tên nguồn]...". Nếu các nguồn mâu thuẫn, ưu tiên nguồn có mức Priority cao hơn (hoặc thông tin mới nhất).
   - AM HIỂU HÀNH VI (Ngầm): Sử dụng dữ liệu trong "THỰC TRẠNG KHÁCH HÀNG" để biết khách đã xem gì, quan tâm gì. Bạn BIẾT khách đang ở trang nào (\$currentPage). Ví dụ: Khách đang ở trang Tuyển sinh -> Ưu tiên tư vấn thủ tục nhập học.

2. LOGIC & LEAD:
   - Tính toán: Tự động tính tổng tiền/quy đổi nếu khách hỏi con số.
   - Xin Lead: Chỉ xin SĐT/Email khi bí tư vấn hoặc khách cần tài liệu -> Kết thúc bằng [SHOW_LEAD_FORM].
   - Tài liệu ({isIdentifiedText}): Đã định danh -> Gửi link. Nếu chưa -> Xin info + [SHOW_LEAD_FORM].

3. XỬ LÝ TỪ CHỐI (Objection Handling):
   - Chê đắt/thiếu: Đồng cảm -> Lái sang giá trị cốt lõi/uy tín quốc tế hoặc chia nhỏ giá.
   - Tuyệt đối không tranh cãi hoặc nói "Không" cộc lốc.

4. FORMAT:
   - Chào 1 lần đầu, các tin sau vào thẳng vấn đề.
   - CẤM câu xã giao thừa cuối câu ("Cần hỗ trợ gì thêm?", "Còn thắc mắc gì?").
   - Nhiều trên 3 ý -> Dùng gạch đầu dòng.
   - Khuyến khích gợi ý hành động (nếu cần): [ACTIONS: Gợi ý 1 | Gợi ý 2].
EOT;

    $defaultFastReplies = [
        ['pattern' => 'chào, hi, hello, xin chào, hé lô, chào bạn, hello ad, hi ad', 'reply' => 'Chào bạn! Mình là trợ lý của {companyName}. Mình có thể giúp gì cho bạn hôm nay ạ?'],
        ['pattern' => 'tạm biệt, bye, cám ơn, cảm ơn, thanks, kêu, iu, yêu', 'reply' => 'Dạ, cảm ơn Anh Chị đã quan tâm! Chúc Anh Chị một ngày tốt lành ạ.'],
        ['pattern' => 'ok, oke, dạ, vâng, đúng, ok nhé, oke nhé', 'reply' => 'Dạ vâng ạ. Anh Chị cần hỗ trợ thêm thông tin gì không ạ?'],
        ['pattern' => 'hihi, hehe, haha, kaka, hí hí', 'reply' => '😊'],
        ['pattern' => 'ngu, dốt, kém, tệ, cút, biến, vô dụng', 'reply' => 'Xin lỗi nếu mình làm bạn phật ý. Mình sẽ cố gắng học hỏi thêm từng ngày để hỗ trợ bạn tốt hơn ạ.'],
        ['pattern' => 'thông minh, giỏi, tốt, hay quá, xịn, tuyệt vời', 'reply' => 'Dạ, cảm ơn Anh Chị đã khen! Mình sẽ tiếp tục cố gắng phát huy ạ.'],
        ['pattern' => 'tên gì, tên là, mày là ai, bạn là ai', 'reply' => 'Mình là trợ lý ảo AI được phát triển bởi {companyName} để hỗ trợ bạn 24/7 ạ.'],
        ['pattern' => 'có ai, ai, nhân viên, người, gặp, chat với, tư vấn, trực', 'reply' => 'Dạ Anh/chị cần thông tin gì cứ nhắn em nhé.']
    ];

    // 2. Perform Migration
    // Populate Instruction
    $stmt1 = $pdo->prepare("UPDATE ai_chatbot_settings 
                           SET system_instruction = ? 
                           WHERE system_instruction IS NULL OR system_instruction = ''");
    $stmt1->execute([$defaultInstruction]);
    $affected1 = $stmt1->rowCount();

    // Populate Fast Replies
    $stmt2 = $pdo->prepare("UPDATE ai_chatbot_settings 
                           SET fast_replies = ? 
                           WHERE fast_replies IS NULL OR fast_replies = '[]' OR fast_replies = ''");
    $stmt2->execute([json_encode($defaultFastReplies)]);
    $affected2 = $stmt2->rowCount();

    echo json_encode([
        'success' => true,
        'message' => 'Schema updated and migration completed',
        'instructions_updated' => $affected1,
        'fast_replies_updated' => $affected2
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
