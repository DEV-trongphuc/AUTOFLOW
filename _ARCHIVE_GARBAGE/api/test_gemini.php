<?php
// api/test_gemini.php
require_once 'db_connect.php';

header('Content-Type: application/json');

$apiKey = $_GET['key'] ?? (getenv('GEMINI_API_KEY') ?: '');

if (empty($apiKey)) {
    die(json_encode([
        'error' => 'GEMINI_API_KEY not found.',
        'help' => 'Please provide a key via URL: test_gemini.php?key=YOUR_API_KEY'
    ]));
}

$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

$payload = [
    "contents" => [
        [
            "parts" => [
                ["text" => "Chào bạn, đây là một câu hỏi thử nghiệm. Bạn có nghe thấy tôi không?"]
            ]
        ]
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-goog-api-key: ' . $apiKey
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo json_encode([
    'http_code' => $httpCode,
    'raw_response' => json_decode($response, true) ?: $response
], JSON_PRETTY_PRINT);
