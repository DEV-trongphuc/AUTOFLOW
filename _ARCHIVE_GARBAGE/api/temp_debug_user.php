<?php
require_once 'db_connect.php';

$visitorUuid = '39c7c64f-eb96-4d62-a0e9-f901995d78ab';
echo "Checking Visitor: $visitorUuid\n";

$stmtV = $pdo->prepare("SELECT * FROM web_visitors WHERE id = ?");
$stmtV->execute([$visitorUuid]);
$visitor = $stmtV->fetch(PDO::FETCH_ASSOC);
print_r($visitor);

if ($visitor) {
    echo "\n--- SECURITY CHECK ---\n";
    $ip = $visitor['ip_address'];

    $stmtB = $pdo->prepare("SELECT * FROM web_blacklist WHERE ip_address = ?");
    $stmtB->execute([$ip]);
    print_r($stmtB->fetch(PDO::FETCH_ASSOC));

    $stmtS = $pdo->prepare("SELECT * FROM spam_cooldown WHERE ip_address = ?");
    $stmtS->execute([$ip]);
    print_r($stmtS->fetch(PDO::FETCH_ASSOC));
}

echo "\n--- ALL CONVERSATIONS ---\n";
$stmtC = $pdo->prepare("SELECT * FROM ai_conversations WHERE visitor_id = ? ORDER BY created_at DESC");
$stmtC->execute([$visitorUuid]);
$allConvs = $stmtC->fetchAll(PDO::FETCH_ASSOC);
print_r($allConvs);

$convId = '86f35ae09b9707e47f23855a8c1c4a4f';

require_once 'chat_rag.php';

$stmt = $pdo->prepare("SELECT * FROM ai_conversations WHERE id = ?");
$stmt->execute([$convId]);
$conv = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$conv) {
    die("Conversation not found.");
}

$propertyId = $conv['property_id'];
$visitorId = $conv['visitor_id'];

$stmtSet = $pdo->prepare("SELECT * FROM ai_chatbot_settings WHERE property_id = ?");
$stmtSet->execute([$propertyId]);
$settings = $stmtSet->fetch(PDO::FETCH_ASSOC);

$apiKey = $settings['gemini_api_key'] ?? '';
echo "Using API Key: " . substr($apiKey, 0, 5) . "...\n";

$userMsg = "Tư vấn EMBA";
$ragContext = [
    'last_user_msg' => '',
    'last_bot_msg' => '',
    'history_text' => '',
    'company_name' => $settings['company_name'] ?? ''
];

echo "Simulating RAG for: $userMsg\n";
try {
    $ragData = retrieveContext($pdo, $propertyId, $userMsg, $ragContext, $apiKey, 10);
    echo "RAG SUCCESS. Results found: " . count($ragData['results']) . "\n";

    $relevantContext = "";
    foreach ($ragData['results'] as $r) {
        echo " - [" . round($r['score'], 2) . "] " . substr($r['content'], 0, 100) . "...\n";
        if ($r['score'] >= ($settings['similarity_threshold'] ?? 0.45)) {
            $relevantContext .= $r['content'] . "\n---\n";
        }
    }

    require_once 'chat_gemini.php';

    // Build Prompt
    $activityContext = "Người dùng đang xem trang web.";
    $systemInst = "Bạn là trợ lý ảo chuyên nghiệp. Dưới đây là thông tin hỗ trợ:\n$relevantContext";

    $contents = [
        ["role" => "user", "parts" => [["text" => $userMsg]]]
    ];
    try {
        echo "\nCalling Gemini API (Normal)...";
        $botRes = generateResponse($contents, $systemInst, $apiKey, 'gemini-2.5-flash-lite', $settings['temperature'] ?? 1.1, $settings['max_output_tokens'] ?? 2048);
        echo "\nGEMINI RESPONSE: " . mb_substr($botRes, 0, 200) . "...\n";
    } catch (Exception $e) {
        echo "\nGEMINI ERROR (Normal): " . $e->getMessage();
    }

    try {
        echo "\nCalling Gemini API (Streaming Simulation)...";
        $fullStream = "";
        streamResponse($contents, $systemInst, $apiKey, function ($chunk) use (&$fullStream) {
            if (isset($chunk['candidates'][0]['content']['parts'][0]['text'])) {
                $fullStream .= $chunk['candidates'][0]['content']['parts'][0]['text'];
            } elseif (isset($chunk['error'])) {
                echo "\nSTREAM CHUNK ERROR: " . json_encode($chunk['error']);
            }
        }, 'gemini-2.5-flash-lite', $settings['temperature'] ?? 1.1, $settings['max_output_tokens'] ?? 2048);
        echo "\nSTREAM COMPLETED. Length: " . strlen($fullStream);
        if (strlen($fullStream) > 0) {
            echo "\nSTREAM PREVIEW: " . mb_substr($fullStream, 0, 100) . "...";
        }
    } catch (Exception $e) {
        echo "\nGEMINI ERROR (Stream): " . $e->getMessage();
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
print_r($conv);

if ($conv) {
    $visitorId = $conv['visitor_id'];
    echo "\n--- VISITOR INFO ---\n";
    $stmt = $pdo->prepare("SELECT * FROM web_visitors WHERE id = ?");
    $stmt->execute([$visitorId]);
    $visitor = $stmt->fetch(PDO::FETCH_ASSOC);
    print_r($visitor);

    if ($visitor && $visitor['subscriber_id']) {
        echo "\n--- SUBSCRIBER INFO ---\n";
        $stmt = $pdo->prepare("SELECT * FROM subscribers WHERE id = ?");
        $stmt->execute([$visitor['subscriber_id']]);
        $sub = $stmt->fetch(PDO::FETCH_ASSOC);
        print_r($sub);

        echo "\n--- FLOW STATES ---\n";
        $stmt = $pdo->prepare("SELECT * FROM subscriber_flow_states WHERE subscriber_id = ?");
        $stmt->execute([$visitor['subscriber_id']]);
        $flows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        print_r($flows);
    }
}

echo "\n--- RECENT MESSAGES ---\n";
$stmt = $pdo->prepare("SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 5");
$stmt->execute([$convId]);
$msgs = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($msgs);

echo "\n--- CHATBOT SETTINGS ---\n";
if ($conv) {
    $propertyId = $conv['property_id'];
    $stmt = $pdo->prepare("SELECT * FROM ai_chatbot_settings WHERE property_id = ?");
    $stmt->execute([$propertyId]);
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    print_r($settings);

    if ($settings && empty($settings['gemini_api_key'])) {
        echo "\nWARNING: gemini_api_key is EMPTY in settings.\n";
    }
}

echo "\n--- GLOBAL GEMINI KEY ---\n";
echo "GEMINI_API_KEY from getenv: " . (getenv('GEMINI_API_KEY') ?: 'EMPTY') . "\n";

echo "\n--- FOLDER CHECK ---\n";
$logDir = __DIR__ . '/logs';
echo "Log Dir: $logDir\n";
if (is_dir($logDir)) {
    echo "Log Dir EXISTS.\n";
    $files = scandir($logDir);
    print_r($files);
} else {
    echo "Log Dir DOES NOT EXIST.\n";
}

$cacheDir = __DIR__ . '/cache';
echo "Cache Dir: $cacheDir\n";
if (is_dir($cacheDir)) {
    echo "Cache Dir EXISTS.\n";
    $files = scandir($cacheDir);
    print_r($files);
}
