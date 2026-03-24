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
    // [MODIFIED] Vô hiệu hóa (disable) kiểm tra spam ký tự lạ theo yêu cầu người dùng
    return ['spam' => false];
}
