<?php
// api/debug_rag.php
// Tool debug chuyên sâu cho RAG & Knowledge Base
// Cách dùng: /api/debug_rag.php?property_id=...&message=...

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/html; charset=utf-8');

require_once 'db_connect.php';
require_once 'chat_rag.php';

$propertyId = $_GET['property_id'] ?? null;
$message = $_GET['message'] ?? 'xin chào';
$limit = (int) ($_GET['limit'] ?? 10);

if (!$propertyId) {
    echo "<h1>Debug RAG Tool</h1>";
    echo "<form method='GET'>
        Property ID: <input name='property_id' value=''><br>
        Message: <input name='message' value='học phí bao nhiêu'><br>
        <button type='submit'>Analyze</button>
    </form>";
    exit;
}

echo "<style>
    body { font-family: monospace; padding: 20px; line-height: 1.5; }
    .box { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; border-radius: 8px; background: #f9f9f9; }
    .h { font-weight: bold; color: #2563eb; font-size: 1.2em; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .score { color: #059669; font-weight: bold; }
    .bad { color: #dc2626; }
    pre { white-space: pre-wrap; background: #fff; padding: 10px; border: 1px solid #ddd; }
</style>";

echo "<h1>🔍 RAG Debug Report</h1>";
echo "<div>Target Property: <b>$propertyId</b></div>";
echo "<div>Input Message: <b>$message</b></div>";
echo "<hr>";

// 1. Fetch Settings
$stmt = $pdo->prepare("SELECT * FROM ai_chatbot_settings WHERE property_id = ?");
$stmt->execute([$propertyId]);
$settings = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$settings) {
    echo "<div class='box bad'>❌ Settings not found for this Property ID.</div>";
    exit;
}

$apiKey = $settings['gemini_api_key'] ?: getenv('GEMINI_API_KEY');
$threshold = $settings['similarity_threshold'] ?? 0.45;

echo "<div class='box'>";
echo "<div class='h'>1. Configuration</div>";
echo "Model Setting: " . ($settings['similarity_threshold'] ?? 'Default') . "<br>";
echo "API Key Configured: " . ($apiKey ? "<span class='score'>YES</span>" : "<span class='bad'>NO</span>") . "<br>";
echo "Intent Configs (Synonyms): ";
$configs = json_decode($settings['intent_configs'] ?? '{}', true);
$synonyms = $configs['synonyms'] ?? [];
echo count($synonyms) . " groups found.";
echo "</div>";

// 2. Query Analysis
echo "<div class='box'>";
echo "<div class='h'>2. Query Expansion (Synonyms)</div>";

// Mock Context
$contextParams = [
    'last_user_msg' => '',
    'last_bot_msg' => '',
    'history_text' => '',
    'company_name' => $settings['company_name']
];

// Call retrieval logic manually to inspect
// Note: We need to see what retrieveContext actually generates
$ragStart = microtime(true);
$ragData = retrieveContext($pdo, $propertyId, $message, $contextParams, $apiKey, $limit);
$ragTime = microtime(true) - $ragStart;

echo "Time taken: " . round($ragTime, 4) . "s<br>";
echo "Max Score Found: <b>" . ($ragData['max_score'] ?? 0) . "</b><br>";
echo "Confident Threshold: <b>$threshold</b><br>";

if (($ragData['max_score'] ?? 0) < $threshold) {
    echo "<div class='bad' style='margin-top:10px'>⚠️ MAX SCORE IS BELOW THRESHOLD - AI WILL IGNORE KNOWLEDGE BASE or HALLUCINATE</div>";
}
echo "</div>";

// 3. Retrieved Chunks
echo "<div class='box'>";
echo "<div class='h'>3. Retrieved Documents (Top {$limit})</div>";

if (empty($ragData['results'])) {
    echo "No documents found.";
} else {
    foreach ($ragData['results'] as $idx => $res) {
        $score = $res['score'];
        $style = $score >= $threshold ? 'background:#ecfdf5; border-color:#10b981;' : '';
        $icon = $score >= $threshold ? '✅' : '❌';

        echo "<div style='margin-bottom:10px; padding:10px; border:1px solid #ddd; border-radius:5px; $style'>";
        echo "<div>$icon <b>#" . ($idx + 1) . "</b> - Score: <span class='score'>$score</span> (Boost: {$res['relevance_boost']})</div>";
        echo "<div style='font-size:0.9em; color:#666'>Source: {$res['source_name']}</div>";
        echo "<pre>{$res['content']}</pre>";
        echo "</div>";
    }
}
echo "</div>";

// 4. Prompt Simulation
echo "<div class='box'>";
echo "<div class='h'>4. Final System Prompt Simulation</div>";

$relevantContext = "";
foreach (($ragData['results'] ?? []) as $c) {
    if ($c['score'] >= $threshold) {
        $relevantContext .= $c['content'] . "\n---\n";
    }
}

// Logic copy from ai_chatbot.php buildSystemPrompt
$botName = $settings['bot_name'] ?? 'AI Consultant';
$companyName = $settings['company_name'] ?? 'MailFlow Pro';
$kbContent = (!empty($relevantContext)) ? $relevantContext : "Hiện chưa có thông tin cụ thể trong Knowledge Base.";
$today = date("d/m/Y");

$kbHeader = "### KNOWLEDGE BASE\nDưới đây là thông tin sự thật bạn được cung cấp...\n---------------------\nKNOWLEDGE BASE: {$kbContent}\n---------------------\n";
$userTemplate = $settings['system_instruction'] ?? "Bạn là trợ lý ảo của {\$companyName}.";

// Filter duplication
if (strpos($userTemplate, '### KNOWLEDGE BASE') !== false) {
    $parts = explode('---------------------', $userTemplate);
    if (count($parts) >= 3) {
        $userTemplate = trim(implode('---------------------', array_slice($parts, 2)));
    }
}

$fullPrompt = $kbHeader . $userTemplate;
$replacements = [
    '{$botName}' => $botName,
    '{$companyName}' => $companyName,
    '{$today}' => $today,
    '{$kbContent}' => $kbContent,
    '{$currentPage}' => 'DEBUG_PAGE',
    '{$activityContext}' => 'DEBUG_CONTEXT',
    '{$isIdentified}' => 'CHƯA ĐỊNH DANH',
];
$prompt = str_replace(array_keys($replacements), array_values($replacements), $fullPrompt);

echo "<div><b>Status:</b> " . (empty($relevantContext) ? "<span class='bad'>EMPTY CONTEXT</span>" : "<span class='score'>HAS CONTEXT (" . strlen($relevantContext) . " chars)</span>") . "</div>";
echo "<div style='margin-top:10px'><b>Review Variable {\$kbContent}:</b></div>";
echo "<pre>" . htmlspecialchars(substr($relevantContext, 0, 1000)) . (strlen($relevantContext) > 1000 ? '...' : '') . "</pre>";

echo "</div>";
