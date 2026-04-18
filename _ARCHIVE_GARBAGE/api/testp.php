<?php
$OPENAI_API_KEY = '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';

$text = $_GET['text'] ?? 'Xin chào Việt Nam';
$model = "gpt-4o-mini-tts";
$voice = "coral";

$payload = [
    "model" => $model,
    "voice" => $voice,
    "input" => $text,
    "instructions" => "Speak clearly",
    "format" => "mp3"
];

$ch = curl_init("https://api.openai.com/v1/audio/speech");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer $OPENAI_API_KEY",
        "Content-Type: application/json"
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 30
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if(curl_errno($ch)) {
    echo "CURL Error: " . curl_error($ch);
} else {
    echo "HTTP Code: $httpCode\n";
    echo "Response:\n$response";
}
curl_close($ch);
