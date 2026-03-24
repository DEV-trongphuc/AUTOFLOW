<?php
// Enable error display
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/html; charset=utf-8');

echo "<h2>Simple TTS Test</h2>";

$text = $_GET['text'] ?? 'Xin chào';
$propertyId = $_GET['property_id'] ?? '7c9a7040-a163-40dc-8e29-a1706a160564';

echo "<p>Text: " . htmlspecialchars($text) . "</p>";
echo "<p>Property: " . htmlspecialchars($propertyId) . "</p>";
echo "<hr>";

// Hardcode API key for testing (replace with your actual key)
$apiKey = 'AIzaSyDRbVHNrcHGa4GNsHjGpkBqsNikvOg0-v8'; // REPLACE THIS

echo "<p>Step 1: Preparing request...</p>";

$model = 'gemini-2.5-flash-lite-tts';
$url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateSpeech?key=" . $apiKey;

$payload = [
    "text" => $text, // Văn bản trực tiếp ở gốc, không nằm trong 'contents'
    "speechConfig" => [
        "voiceConfig" => [
            "prebuiltVoiceConfig" => [
                "voiceName" => "Despina" // Các giọng đọc hỗ trợ: Despina, Puck, Charon, Aoede, Kore, Fenrir
            ]
        ]
    ]
];
echo "<p>Step 2: Calling API...</p>";
echo "<pre>URL: " . htmlspecialchars($url) . "</pre>";
echo "<pre>Payload: " . json_encode($payload, JSON_PRETTY_PRINT) . "</pre>";

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

echo "<p>Step 3: Response received</p>";
echo "<p><strong>HTTP Code:</strong> " . $httpCode . "</p>";

if ($curlError) {
    echo "<p style='color:red'><strong>Curl Error:</strong> " . $curlError . "</p>";
}

$data = json_decode($response, true);

echo "<p><strong>Response Type:</strong> " . gettype($data) . "</p>";
echo "<p><strong>Response Keys:</strong> " . json_encode(array_keys($data ?? [])) . "</p>";

if (isset($data['audioData'])) {
    $audioSize = strlen(base64_decode($data['audioData']));
    echo "<p style='color:green;font-size:20px'><strong>✓ SUCCESS!</strong> Audio size: " . number_format($audioSize) . " bytes</p>";
} else {
    echo "<p style='color:red;font-size:20px'><strong>✗ NO AUDIO DATA</strong></p>";
    echo "<p><strong>Full Response:</strong></p>";
    echo "<pre>" . htmlspecialchars(print_r($data, true)) . "</pre>";
}
?>