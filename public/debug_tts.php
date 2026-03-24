<?php
// Debug TTS Response
header('Content-Type: text/html; charset=utf-8');

$propertyId = $_GET['property_id'] ?? '7c9a7040-a163-40dc-8e29-a1706a160564';
$text = $_GET['text'] ?? 'Xin chào';

echo "<h2>TTS Debug Tool</h2>";
echo "<p><strong>Text:</strong> " . htmlspecialchars($text) . "</p>";
echo "<p><strong>Property ID:</strong> " . htmlspecialchars($propertyId) . "</p>";
echo "<hr>";

// Simulate the TTS API call
require_once '../api/db_connect.php';

$apiKey = '';
try {
    $stmt = $pdo->prepare("
        SELECT s.gemini_api_key, 
               p.gemini_api_key as p_key 
        FROM ai_chatbot_settings s
        LEFT JOIN ai_chatbots bot ON s.property_id = bot.id
        LEFT JOIN ai_chatbot_settings p ON bot.category_id = p.property_id 
        WHERE s.property_id = ? 
        LIMIT 1
    ");
    $stmt->execute([$propertyId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        $apiKey = $row['gemini_api_key'] ?: $row['p_key'];
    }
} catch (Exception $e) {
    echo "<p style='color:red'>DB Error: " . $e->getMessage() . "</p>";
}

if (!$apiKey) {
    echo "<p style='color:red'>No API Key found!</p>";
    exit;
}

echo "<p><strong>API Key:</strong> " . substr($apiKey, 0, 10) . "...</p>";

// Call Gemini TTS
$model = 'gemini-2.5-flash-lite-tts';
$url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateSpeech?key=" . $apiKey;

$payload = [
    "text" => $text,
    "speechConfig" => [
        "voiceConfig" => [
            "prebuiltVoiceConfig" => [
                "voiceName" => "Despina"
            ]
        ]
    ]
];

echo "<p><strong>API URL:</strong> " . htmlspecialchars($url) . "</p>";
echo "<p><strong>Payload:</strong></p>";
echo "<pre>" . json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
echo "<hr>";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "<h3>Response Details</h3>";
echo "<p><strong>HTTP Code:</strong> " . $httpCode . "</p>";

if ($curlError) {
    echo "<p style='color:red'><strong>Curl Error:</strong> " . $curlError . "</p>";
}

$data = json_decode($response, true);
echo "<p><strong>Response Keys:</strong> " . json_encode(array_keys($data ?? [])) . "</p>";

if (isset($data['audioData'])) {
    $audioSize = strlen(base64_decode($data['audioData']));
    echo "<p style='color:green'><strong>✓ Audio Data Found!</strong> Size: " . number_format($audioSize) . " bytes</p>";
    echo "<p><a href='gemini_tts.php?text=" . urlencode($text) . "&property_id=" . urlencode($propertyId) . "' target='_blank'>▶ Play Audio</a></p>";
} else {
    echo "<p style='color:red'><strong>✗ No audioData field</strong></p>";
    echo "<p><strong>Full Response (first 1000 chars):</strong></p>";
    echo "<pre>" . htmlspecialchars(substr($response, 0, 1000)) . "</pre>";
}
?>