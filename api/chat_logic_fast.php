<?php
// api/chat_logic_fast.php

function getFastReply($userMsg, $settingsArr)
{
    $botName = $settingsArr['bot_name'] ?? 'Trợ lý ảo';
    $companyName = $settingsArr['company_name'] ?? 'MailFlow Pro';
    // ⚡ OPTIMIZATION: Loại bỏ các chỉ dẫn trong ngoặc để Fast Reply chính xác hơn (VD: [Trả lời ngắn gọn])
    $cleanMsgForMatch = preg_replace('/\(.*?\)|\[.*?\]/u', '', $userMsg);
    $cleanMsg = mb_strtolower(trim($cleanMsgForMatch)) ?: mb_strtolower(trim($userMsg));
    $msgLength = mb_strlen($cleanMsg);

    // Chỉ thực hiện reply nhanh nếu tin nhắn ngắn (< 8 ký tự) 
    // HOẶC khớp chính xác một từ khóa cụ thể (tránh bắt nhầm trong câu dài)

    // 1. Kiểm tra Fast Replies người dùng tự định nghĩa trong Settings
    $customFastReplies = !empty($settingsArr['fast_replies']) ? json_decode($settingsArr['fast_replies'], true) : [];
    if (is_array($customFastReplies)) {
        foreach ($customFastReplies as $cfr) {
            $pattern = trim($cfr['pattern'] ?? '');
            $reply = $cfr['reply'] ?? '';
            if (!$pattern || !$reply)
                continue;

            // Nếu người dùng nhập danh sách từ khóa
            $keywords = array_map('mb_strtolower', array_map('trim', explode(',', $pattern)));

            // Nếu khớp chính xác hoàn toàn (Exact Match)
            if (in_array($cleanMsg, $keywords)) {
                return str_replace(['{companyName}', '{botName}'], [$companyName, $botName], $reply);
            }

            // Nếu tin nhắn dài >= 8 ký tự, bỏ qua các bước kiểm tra Regex lỏng lẻo tiếp theo
            if ($msgLength >= 8)
                continue;

            // Kiểm tra Regex nếu tin nhắn ngắn
            try {
                if (strpos($pattern, ',') !== false || !preg_match('/^[\^|\/]/', $pattern)) {
                    $escKeywords = array_map('preg_quote', $keywords);
                    $regex = '/(?<!\p{L})(' . implode('|', $escKeywords) . ')(?!\p{L})/iu';
                } else {
                    $regex = '/' . str_replace('/', '\/', $pattern) . '/iu';
                }

                if (preg_match($regex, $userMsg)) {
                    return str_replace(['{companyName}', '{botName}'], [$companyName, $botName], $reply);
                }
            } catch (Exception $e) {
            }
        }
    }

    // 2. Các câu trả lời mặc định hệ thống ( Greetings, Thanks, Jokes...)
    // Áp dụng điều kiện độ dài < 8 cho các câu chào mặc định
    if ($msgLength >= 8)
        return null;

    // Pattern chào hỏi cực rộng nhưng chỉ áp dụng cho tin ngắn
    if (preg_match('/^(\s)*(chào|hi|hello|xin chào|hé lô|chào bạn|hello ad|hi ad|alo|alô)(\s+(em|bạn|ad|shop|mày|anh|chị|admin|bot|ai))?[\.!?]*$/iu', $userMsg)) {
        return "Chào bạn! Mình là trợ lý của $companyName. Mình có thể giúp gì cho bạn hôm nay ạ?";
    }

    // Cảm ơn hoặc tạm biệt
    if (preg_match('/(?<!\p{L})(tạm biệt|bye|cám ơn|cảm ơn|thanks|kêu|iu|yêu)(?!\p{L})/iu', $userMsg)) {
        if (preg_match('/(?<!\p{L})(yêu|iu)(?!\p{L})/iu', $userMsg))
            return "😊";
        return "Dạ, cảm ơn Anh Chị đã quan tâm! Chúc Anh Chị một ngày tốt lành ạ.";
    }

    // Đồng ý / OK
    if (preg_match('/^(\s)*(ok|oke|dạ|vâng|đúng|ok nhé|oke nhé)[\.!?]*$/iu', $userMsg)) {
        return "Dạ vâng ạ. Anh Chị cần hỗ trợ thêm thông tin gì không ạ?";
    }

    return null; // Không tìm thấy câu trả lời nhanh
}
