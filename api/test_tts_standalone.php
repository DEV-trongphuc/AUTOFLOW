<?php
// api/test_tts_standalone.php
// Script to test Gemini TTS functionality - Standalone version
// You can run this directly in browser: api/test_tts_standalone.php

// 1. CONFIGURATION
$PROPERTY_ID = '7c9a7040-a163-40dc-8e29-a1706a160564'; // Your Property ID
$TEST_TEXT = 'Dạ, đây là thử nghiệm giọng nói từ hệ thống AI mới.';

// 2. Database Connection (Standard)
require_once 'db_connect.php';

echo "<h1>Gemini TTS Test (Standalone)</h1>";

// 3. Get API Key from DB
try {
    $stmt = $pdo->prepare("SELECT gemini_api_key FROM ai_chatbot_settings WHERE property_id = ?");
    $stmt->execute([$PROPERTY_ID]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $apiKey = $row['gemini_api_key'] ?? '';

    if (!$apiKey) {
        // Fallback check parent
        $stmt = $pdo->prepare("SELECT p.gemini_api_key FROM ai_chatbots b LEFT JOIN ai_chatbot_settings p ON b.category_id = p.property_id WHERE b.id = ?");
        $stmt->execute([$PROPERTY_ID]);
        $row = $stmt->fetch();
        $apiKey = $row['gemini_api_key'] ?? '';
    }

    if (!$apiKey)
        die("<p style='color:red'>Error: API Key Not Found for ID: $PROPERTY_ID</p>");
    echo "<p>API Key Loaded: " . substr($apiKey, 0, 8) . "******</p>";

} catch (Exception $e) {
    die("DB Error: " . $e->getMessage());
}

// 4. PREPARE REQUEST (Using gemini-2.5-flash-lite-preview-tts)
$model = "gemini-2.5-flash-lite-preview-tts";
$url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . $apiKey;

echo "<p>Model: <strong>$model</strong></p>";
echo "<p>Text: <em>$TEST_TEXT</em></p>";

$payload = [
    "contents" => [
        ["role" => "user", "parts" => [["text" => $TEST_TEXT]]]
    ],
    "generationConfig" => [
        "responseModalities" => ["AUDIO"],
        "temperature" => 1.4,
        "speechConfig" => [
            "voiceConfig" => [
                "prebuiltVoiceConfig" => [
                    "voiceName" => "Leda"
                ]
            ]
        ]
    ]
];

// 5. SEND REQUEST
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// 6. HANDLE RESPONSE
if ($httpCode !== 200) {
    echo "<h3 style='color:red'>FAILED (HTTP $httpCode)</h3>";
    echo "<pre>" . htmlspecialchars($response) . "</pre>";
    if ($error)
        echo "<p>cURL Error: $error</p>";
} else {
    $json = json_decode($response, true);
    if (isset($json['candidates'][0]['content']['parts'][0]['inlineData']['data'])) {
        $audioData = base64_decode($json['candidates'][0]['content']['parts'][0]['inlineData']['data']);

        // CHECK & ADD WAV HEADER IF NEEDED
        $isWav = substr($audioData, 0, 4) === 'RIFF';
        echo "<p>Audio Format Detected: " . ($isWav ? "WAV (Classic)" : "Raw PCM (Needs Header)") . "</p>";

        if (!$isWav) {
            $audioData = addWavHeader($audioData, 24000, 1, 16);
            echo "<p>Added WAV Header manually.</p>";
        }

        // Display Audio Player
        $base64 = base64_encode($audioData);
        echo "<h3 style='color:green'>SUCCESS!</h3>";
        echo "<audio controls autoplay src='data:audio/wav;base64,$base64' style='width: 300px; height: 50px;'></audio>";
        echo "<br><a href='data:audio/wav;base64,$base64' download='tts_test.wav'>Download WAV</a>";
    } else {
        echo "<h3 style='color:orange'>API Success, but No Audio Data Found</h3>";
        echo "<pre>" . htmlspecialchars(substr($response, 0, 500)) . "...</pre>";
    }
}

// Helper Function
function addWavHeader($pcmData, $sampleRate, $channels, $bitsPerSample)
{
    $dataLen = strlen($pcmData);
    $byteRate = $sampleRate * $channels * ($bitsPerSample / 8);
    $header = "RIFF" . pack("V", 36 + $dataLen) . "WAVEfmt " . pack("V", 16) . pack("v", 1) . pack("v", $channels) . pack("V", $sampleRate) . pack("V", $byteRate) . pack("v", $channels * ($bitsPerSample / 8)) . pack("v", $bitsPerSample) . "data" . pack("V", $dataLen);
    return $header . $pcmData;
}
?>