<?php
$botMsg = "Dạ, em xin phép được gợi ý lại các chương trình Thạc sĩ phù hợp với bằng Cử nhân QTKD và 10 năm kinh nghiệm của anh/chị như sau ạ:\n\n1.  **Chương trình MSc AI (Master of Science in Applied Artificial Intelligence):**\n    *   **Phù hợp cho anh/chị:** Nếu anh/chị muốn tập trung vào việc ứng dụng Trí tuệ Nhân tạo vào lĩnh vực quản trị, phân tích dữ liệu, ra quyết định và dẫn dắt các dự án chuyển đổi số. Chương trình này sẽ cung cấp kiến thức chuyên sâu về AI trong kinh doanh.\n    *   **Hệ học:** Chỉ có hệ High Quality.\n    *   **Thời lượng:** Khoảng 16-18 tháng.\n    *   **Học phí:** 11.900 CHF.\n\n2.  **Chương trình EMBA (Executive Master of Business Administration):**\n    *   **Phù hợp cho anh/chị:** Nếu anh/chị là nhà quản lý bận rộn, cần học nhanh, áp dụng ngay kiến thức vào công việc, không muốn làm luận văn tốt nghiệp. Chương trình này tập trung vào các tình huống \"thực chiến\" trong quản trị.\n    *   **Hệ học:** Có cả hệ Standard (tiết kiệm chi phí, tự học qua LMS) và hệ High Quality (tương tác trực tiếp, có chuyến đi Thụy Sĩ).\n    *   **Thời lượng:** Khoảng 12-14 tháng.\n    *   **Học phí:** Dao động từ 4.400 CHF (Standard) đến 8.900 CHF (High Quality).\n\n3.  **Chương trình MBA (Master of Business Administration):**\n    *   **Phù hợp cho anh/chị:** Nếu anh/chị mong muốn có một nền tảng kiến thức quản trị toàn diện, có xu hướng nghiên cứu, học thuật và có thể có kế hoạch học lên Tiến sĩ (Doctor/DBA) sau này. Chương trình này có yêu cầu làm luận văn.\n    *   **Hệ học:** Có cả hệ Standard và hệ High Quality.\n    *   **Thời lượng:** Khoảng 16-18 tháng.\n    *   **Học phí:** Dao động từ 5.400 CHF (Standard) đến 9.900 CHF (High Quality).\n\nAnh/chị có thể cân nhắc xem mình ưu tiên **chuyên sâu về AI** hay muốn **củng cố kiến thức quản trị tổng quát** và **hình thức học tập** nào phù hợp nhất với mình ạ?\n\n[ACTIONS: Tư vấn chi tiết về MSc AI | Tư vấn chi tiết về EMBA | Tư vấn chi tiết về MBA]";

// Mimic api/meta_webhook.php logic
$quickReplies = [];
if (preg_match('/\[(?:ACTIONS|ACTION|BUTTONS|BUTTON|OPTIONS):?\s*(.*?)\]/ius', $botMsg, $matches)) {
    $rawActions = $matches[1];
    $cleanText = trim(str_replace($matches[0], '', $botMsg));

    $separator = (strpos($rawActions, '|') !== false) ? '|' : ',';
    $actions = explode($separator, $rawActions);

    foreach ($actions as $act) {
        $act = trim($act);
        if (empty($act))
            continue;
        $quickReplies[] = [
            'content_type' => 'text',
            'title' => mb_substr($act, 0, 80),
            'payload' => $act
        ];
    }

    echo "Found ACTIONS Tag!\n";
    echo "Raw Actions: $rawActions\n";
    echo "Quick Replies Count: " . count($quickReplies) . "\n";
    foreach ($quickReplies as $qr) {
        echo " - " . $qr['title'] . " (Length: " . mb_strlen($qr['title']) . ")\n";
    }
    echo "Clean Message Length: " . mb_strlen($cleanText) . "\n";
} else {
    echo "ACTIONS Tag NOT FOUND!\n";
}
?>