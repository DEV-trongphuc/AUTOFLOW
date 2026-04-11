<?php
// api/chat_security.php – RESTORED FULL LOGIC

function isIpBlocked($pdo, $ip)
{
    if (!$ip || $ip === 'unknown')
        return false;
    $stmt = $pdo->prepare("SELECT 1 FROM web_blacklist WHERE ip_address = ? LIMIT 1");
    $stmt->execute([$ip]);
    return (bool) $stmt->fetch();
}

function checkSpam($pdo, $visitorUuid, $clientIp, $userMsg)
{
    // [Vòng 41 FIX] Tái kích hoạt Rate Limiter cho AI Chatbot (Giới hạn requests để bảo vệ Quota LLM)
    if ($visitorUuid && $visitorUuid !== 'unknown' && strpos($visitorUuid, 'meta_') === false && strpos($visitorUuid, 'zalo_') === false) {
        try {
            // Giới hạn 15 tin nhắn / 1 phút
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM ai_conversations c JOIN ai_messages m ON c.id = m.conversation_id WHERE c.visitor_id = ? AND m.sender = 'visitor' AND m.created_at >= NOW() - INTERVAL 1 MINUTE");
            $stmt->execute([$visitorUuid]);
            $count1m = (int)$stmt->fetchColumn();
            if ($count1m >= 15) {
                return ['spam' => true, 'message' => 'Hệ thống nhận diện bạn đang chat quá nhanh! Vui lòng chờ 1 phút trước khi tiếp tục.'];
            }

            // Giới hạn 50 tin nhắn / 1 giờ
            $stmtH = $pdo->prepare("SELECT COUNT(*) FROM ai_conversations c JOIN ai_messages m ON c.id = m.conversation_id WHERE c.visitor_id = ? AND m.sender = 'visitor' AND m.created_at >= NOW() - INTERVAL 1 HOUR");
            $stmtH->execute([$visitorUuid]);
            $count1h = (int)$stmtH->fetchColumn();
            if ($count1h >= 50) {
                return ['spam' => true, 'message' => 'Hệ thống AI đang quá tải với phiên làm việc của bạn. Vui lòng để lại số điện thoại hoặc gọi Hotline để được hỗ trợ trực tiếp.'];
            }
        } catch (Exception $e) {
            // Failsafe
        }
    }

    return ['spam' => false];
}
