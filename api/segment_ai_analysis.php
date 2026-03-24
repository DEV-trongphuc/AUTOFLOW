<?php
require_once 'db_connect.php';
require_once 'chat_gemini.php';
require_once 'chat_helpers.php';
require_once 'segment_helper.php';

apiHeaders();

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
    jsonResponse(false, null, 'Method not allowed');
}

$data = json_decode(file_get_contents("php://input"), true);
$segmentId = $data['segment_id'] ?? null;

if (!$segmentId) {
    jsonResponse(false, null, 'Segment ID is required');
}

try {
    // 0. Self-healing schema: Ensure ai_analysis columns exist
    try {
        $checkCol = $pdo->query("SHOW COLUMNS FROM segments LIKE 'ai_analysis'");
        if ($checkCol->rowCount() === 0) {
            $pdo->exec("ALTER TABLE segments ADD COLUMN ai_analysis LONGTEXT DEFAULT NULL, ADD COLUMN ai_analysis_at TIMESTAMP NULL DEFAULT NULL");
        }
    } catch (Exception $e) { /* Ignore */
    }

    // 1. Get Segment Info
    $stmt = $pdo->prepare("SELECT name, criteria, ai_analysis, ai_analysis_at FROM segments WHERE id = ?");
    $stmt->execute([$segmentId]);
    $segment = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$segment) {
        jsonResponse(false, null, 'Segment not found');
    }

    // Support returning existing analysis
    if (isset($data['fetch_only']) && $data['fetch_only'] === true) {
        if ($segment['ai_analysis']) {
            jsonResponse(true, ['analysis' => $segment['ai_analysis'], 'analyzed_at' => $segment['ai_analysis_at']]);
        } else {
            jsonResponse(false, null, 'No existing analysis found');
        }
    }

    // 2. Fetch Sample Subscribers - Increased to 100 random for better analysis
    $res = buildSegmentWhereClause($segment['criteria'], $segmentId);
    $sql = "SELECT s.id, s.email, s.first_name, s.last_name, s.status, s.lead_score, s.last_activity_at 
            FROM subscribers s 
            WHERE s.status IN ('active', 'lead', 'customer') AND " . $res['sql'] . " 
            ORDER BY RAND() LIMIT 100";

    $stmtSubs = $pdo->prepare($sql);
    $stmtSubs->execute($res['params']);
    $subscribers = $stmtSubs->fetchAll(PDO::FETCH_ASSOC);

    if (empty($subscribers)) {
        jsonResponse(false, null, 'No members found in this segment to analyze');
    }

    // 3. Gather Detailed Data for each member (Journey & Activities)
    $membersData = [];
    foreach ($subscribers as $sub) {
        // Fetch last 5 items to keep payload size reasonable for 100 people
        $stmtAct = $pdo->prepare("SELECT type, details, created_at FROM subscriber_activity WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 5");
        $stmtAct->execute([$sub['id']]);
        $activities = $stmtAct->fetchAll(PDO::FETCH_ASSOC);

        // Fetch last 5 web journey steps
        $stmtJourney = $pdo->prepare("SELECT pv.url as page_url, pv.title as page_title, pv.loaded_at as created_at 
                                      FROM web_page_views pv 
                                      JOIN web_visitors v ON pv.visitor_id = v.id 
                                      WHERE v.subscriber_id = ? 
                                      ORDER BY pv.loaded_at DESC LIMIT 5");
        $stmtJourney->execute([$sub['id']]);
        $journey = $stmtJourney->fetchAll(PDO::FETCH_ASSOC);

        $membersData[] = [
            'id' => $sub['id'],
            'email' => $sub['email'],
            'name' => trim(($sub['first_name'] ?? '') . ' ' . ($sub['last_name'] ?? '')),
            'info' => $sub,
            'activities' => $activities,
            'journey' => $journey
        ];
    }

    // 4. Construct Prompt for AI
    $promptData = [
        'segment_name' => $segment['name'],
        'sample_size' => count($subscribers),
        'members_sample' => $membersData
    ];

    $systemInst = "Bạn là Chuyên gia Marketing Strategy & AI Data Analyst hàng đầu.
Nhiệm vụ: Phân tích sâu các khách hàng mẫu để đưa ra các nhận định chiến lược.
YÊU CẦU QUAN TRỌNG:
- KHÔNG ĐƯỢC TRẢ VỀ JSON. 
- KHÔNG ĐƯỢC BỌC NỘI DUNG TRONG CẶP DẤU NHÁY ``` (TRIPLE BACKTICKS). 
- CHỈ TRẢ VỀ VĂN BẢN PLAIN TEXT THEO ĐỊNH DẠNG MARKDOWN MÀ KHÔNG CÓ BẤT KỲ BLOCK CODE BAO QUANH CẢ BÀI.

CẤU TRÚC BÁO CÁO BẮT BUỘC (Dùng đúng thẻ tag []):
[SUMMARY]
... Tóm tắt tiềm năng ...

[CHARACTERISTICS]
... Bảng 3 cột: | Đặc điểm hành vi | Mô tả | Tiềm năng | ...

[STRATEGY]
... Chiến lược tiếp cận tổng thể ...

[SCENARIOS]
... Các kịch bản campaign ...

[SCORE_GROUPS]
... Đề xuất ít nhất 3 nhóm. 
Định dạng bắt buộc cho từng dòng nhóm: `** Nhóm [SCORE: min-max] Tên nhóm **: Mô tả hành động`
Ví dụ: ** Nhóm [SCORE: 0-30] Cold Leads **: Gửi email chào mừng.

Phân tích dựa trên: Journey, Activities, Lead Score.
Ngôn ngữ: Tiếng Việt, chuyên nghiệp. Báo cáo trình bày đẹp, rõ ràng.";

    $contents = [
        ["role" => "user", "parts" => [["text" => "Dưới đây là 100 khách hàng ngẫu nhiên của phân khúc '" . $segment['name'] . "'. Hãy phân tích sâu và xuất báo cáo đầy đủ các tag yêu cầu:\n\n" . json_encode($promptData, JSON_UNESCAPED_UNICODE)]]]
    ];

    // Get API Key from settings
    $stmtSet = $pdo->query("SELECT value FROM system_settings WHERE `key` = 'gemini_api_key' LIMIT 1");
    $apiKey = $stmtSet->fetchColumn();

    if (!$apiKey) {
        jsonResponse(false, null, 'Gemini API Key is not configured in settings.');
    }

    $analysis = generateResponse($contents, $systemInst, $apiKey);

    // Save analysis to DB
    $stmtSave = $pdo->prepare("UPDATE segments SET ai_analysis = ?, ai_analysis_at = NOW() WHERE id = ?");
    $stmtSave->execute([$analysis, $segmentId]);

    jsonResponse(true, ['analysis' => $analysis, 'analyzed_at' => date('Y-m-d H:i:s')]);

} catch (Exception $e) {
    jsonResponse(false, null, $e->getMessage());
}
