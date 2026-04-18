<?php
require_once 'db_connect.php';

header("Content-Type: application/json");

try {
    $pdo->beginTransaction();

    // 1. LÀM SẠCH: Đưa tất cả về Desktop và xóa nhãn "Generic Bot" đã lỡ gán sai
    $pdo->exec("UPDATE web_sessions SET device_type = 'desktop' WHERE device_type = 'bot'");
    $pdo->exec("UPDATE web_sessions SET browser = 'Unknown' WHERE browser = 'Generic Bot' OR browser = 'Data Center Bot' OR browser = 'Unknown Script'");

    // 2. NHẬN DIỆN BOT CHUẨN (User Agent rõ ràng) & KHÔI PHỤC TỪ VISITOR DATA (Recovery)
    $botPatterns = [
        'googlebot' => 'Googlebot',
        'bingbot' => 'Bingbot',
        'yandexbot' => 'Yandexbot',
        'duckduckbot' => 'DuckDuckBot',
        'baiduspider' => 'BaiduSpider',
        'facebot' => 'Facebot',
        'facebookexternalhit' => 'Facebook Bot',
        'twitterbot' => 'Twitter Bot',
        'linkedinbot' => 'LinkedIn Bot',
        'chrome-lighthouse' => 'Lighthouse',
        'zalobot' => 'ZaloBot',
        'headlesschrome' => 'Headless Chrome',
        'python' => 'Python Script',
        'wget' => 'Wget',
        'curl' => 'Curl',
        'aws' => 'AWS Crawler',
        'amazonbot' => 'Amazonbot',
        'bytespider' => 'ByteSpider'
    ];

    foreach ($botPatterns as $pattern => $name) {
        $qPattern = $pdo->quote('%' . $pattern . '%');
        $qName = $pdo->quote($name);
        // 1. Update based on existing browser string (if not already overwritten)
        $pdo->prepare("UPDATE web_sessions SET device_type = 'bot', browser = $qName WHERE browser LIKE $qPattern")->execute();

        // 2. EMERGENCY RECOVERY: Restore from raw visitor data if browser was accidentally overwritten
        // Check web_visitors.data column (JSON/Text) for the pattern
        $pdo->prepare("UPDATE web_sessions s JOIN web_visitors v ON s.visitor_id = v.id 
                       SET s.device_type = 'bot', s.browser = $qName 
                       WHERE v.data LIKE $qPattern AND s.browser != $qName")->execute();
    }

    // 3. NHẬN DIỆN THEO IP (Tuyệt đối an toàn cho Google/Bing)
    $pdo->exec("UPDATE web_sessions s JOIN web_visitors v ON s.visitor_id = v.id SET s.device_type = 'bot', s.browser = 'Googlebot' WHERE v.ip_address LIKE '66.249.%'");
    $pdo->exec("UPDATE web_sessions s JOIN web_visitors v ON s.visitor_id = v.id SET s.device_type = 'bot', s.browser = 'Bingbot' 
        WHERE v.ip_address LIKE '40.77.%' 
           OR v.ip_address LIKE '40.78.%'
           OR v.ip_address LIKE '40.80.%'
           OR v.ip_address LIKE '40.90.%'
           OR v.ip_address LIKE '157.55.%' 
           OR v.ip_address LIKE '157.56.%' 
           OR v.ip_address LIKE '207.46.%'
           OR v.ip_address LIKE '65.55.%'
           OR v.city = 'Quincy'");

    // 3.5. BOT DATA CENTER (Specific Attribution for Logos)
    // IMPORTANT: Only overwrite if Browser is Unknown or Generic. DO NOT overwrite specific bots like Baidu/Google.
    $validBotNames = implode("','", array_values($botPatterns));
    $safeCheck = "AND s.browser NOT IN ('$validBotNames')";

    // Jinrongjie -> ByteSpider (TikTok)
    $pdo->exec("UPDATE web_sessions s JOIN web_visitors v ON s.visitor_id = v.id 
                SET s.device_type = 'bot', s.browser = 'ByteSpider'
                WHERE v.city = 'Jinrongjie' 
                AND (s.browser = 'Unknown' OR s.browser = 'Data Center Bot' OR s.browser = 'Generic Bot')
                $safeCheck");

    // AWS Cities -> Amazonbot
    $awsCities = "'Ashburn','Sterling','Prineville','Boydton','Boardman','The Dalles','Dublin','Piscataway'";
    $pdo->exec("UPDATE web_sessions s JOIN web_visitors v ON s.visitor_id = v.id 
                SET s.device_type = 'bot', s.browser = 'Amazonbot'
                WHERE v.city IN ($awsCities) 
                AND (s.browser = 'Unknown' OR s.browser = 'Data Center Bot' OR s.browser = 'Generic Bot')
                $safeCheck");

    // 4. BẤT KHẢ XÂM PHẠM: Người dùng Việt Nam là người thật
    // Nếu ở VN và không phải là ZaloBot thì chắc chắn là người dùng thật
    $pdo->exec("UPDATE web_sessions s JOIN web_visitors v ON s.visitor_id = v.id 
                SET s.device_type = 'desktop' 
                WHERE s.device_type = 'bot' 
                AND (v.city IN ('Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Tay Ninh', 'Can Tho', 'Haiphong', 'Bac Giang', 'Hue', 'Nam Dinh') OR v.country = 'Vietnam')
                AND s.browser NOT LIKE '%zalo%' 
                AND s.browser NOT LIKE '%AWS%' 
                AND s.browser NOT LIKE '%Google%' 
                AND s.browser NOT LIKE '%Bing%'");

    $pdo->commit();

    echo json_encode(['success' => true, 'message' => "Đồng bộ hoàn tất. Người dùng thật tại VN đã được khôi phục."]);

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
