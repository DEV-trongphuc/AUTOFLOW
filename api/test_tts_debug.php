<?php
// api/test_tts_debug.php
// Script to test Gemini TTS functionality directly without frontend

// 1. Configuration (Edit these manually for testing)
$propertyId = '7c9a7040-a163-40dc-8e29-a1706a160564'; // Replace with valid Property ID from your database
$textToSpeech = 'Tư vấn cho tôi chương trình MBA';

echo "<h1>Gemini TTS Debug Tool</h1>";
echo "<p>Testing with Property ID: <strong>$propertyId</strong></p>";
echo "<p>Text: <strong>$textToSpeech</strong></p>";

// 2. Fetch API Key (Simulating ai_chatbot.php logic)
require_once 'db_connect.php';

try {
    $stmt = $pdo->prepare("
        SELECT s.gemini_api_key, p.gemini_api_key as p_key 
        FROM ai_chatbot_settings s
        LEFT JOIN ai_chatbots bot ON s.property_id = bot.id
        LEFT JOIN ai_chatbot_settings p ON bot.category_id = p.property_id 
        WHERE s.property_id = ? 
        LIMIT 1
    ");
    $stmt->execute([$propertyId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    $apiKey = $row['gemini_api_key'] ?? $row['p_key'] ?? '';

    if (!$apiKey) {
        // Fallback to Env if needed for test
        $apiKey = getenv('GEMINI_API_KEY');
    }

    if (!$apiKey) {
        die("<h2 style='color:red'>Error: No API Key found for this property.</h2>");
    }

    echo "<p>API Key found: " . substr($apiKey, 0, 5) . "..." . substr($apiKey, -4) . "</p>";

} catch (Exception $e) {
    die("DB Error: " . $e->getMessage());
}

// 3. Prepare Request
$model = "gemini-2.0-flash-exp"; // Model must support AUDIO modality
$url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . $apiKey;

$payload = [
    "contents" => [
        ["role" => "user", "parts" => [["text" => $textToSpeech]]]
    ],
    "generationConfig" => [
        "responseModalities" => ["AUDIO"],
        "speechConfig" => [
            "voiceConfig" => [
                "prebuiltVoiceConfig" => [
                    "voiceName" => "Kore"
                ]
            ]
        ]
    ]
];

echo "<h3>Sending Request to Gemini ($model)...</h3>";
echo "<pre>Payload: " . json_encode($payload, JSON_PRETTY_PRINT) . "</pre>";

// 4. Execute via cURL
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_VERBOSE, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// 5. Output Result
echo "<h3>Response (HTTP $httpCode)</h3>";

if ($httpCode !== 200) {
    echo "<p style='color:red'>Request Failed. Details:</p>";
    echo "<pre>" . htmlspecialchars($response) . "</pre>";
    if ($curlError)
        echo "<p>cURL Error: $curlError</p>";
} else {
    $json = json_decode($response, true);
    if (isset($json['candidates'][0]['content']['parts'][0]['inlineData']['data'])) {
        $audioBase64 = $json['candidates'][0]['content']['parts'][0]['inlineData']['data'];
        $audioSize = strlen(base64_decode($audioBase64));
        echo "<p style='color:green'>Success! Received Audio Data ($audioSize bytes).</p>";
        echo "<p>Audio Preview:</p>";
        echo "<audio controls src='data:audio/wav;base64,$audioBase64'></audio>"; // Assuming WAV/MP3 compatible
    } else {
        echo "<p style='color:orange'>Request OK (200), but no audio data found in structure.</p>";
        echo "<pre>" . htmlspecialchars(substr($response, 0, 1000)) . "...</pre>";
    }
}
?>