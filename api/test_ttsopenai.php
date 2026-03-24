<?php
// Test TTS OpenAI API
header('Content-Type: text/html; charset=utf-8');

$text = $_GET['text'] ?? 'Xin chào, đây là test TTS OpenAI';

echo "<h2>TTS OpenAI Test</h2>";
echo "<p><strong>Text:</strong> " . htmlspecialchars($text) . "</p>";
echo "<hr>";

$apiKey = 'tts-9bf7587f2e0a19e31a15e9291550424e';
$voiceId = 'PE0396';

// Create a temporary text file
$tempFile = tempnam(sys_get_temp_dir(), 'tts_');
file_put_contents($tempFile, $text);

$url = "https://api.ttsopenai.com/uapi/v1/document-to-speech";

// Prepare multipart form data
$boundary = uniqid();
$delimiter = '-------------' . $boundary;

$postData = '';

// Add text fields
$fields = [
    'model' => 'tts-1',
    'voice_id' => $voiceId,
    'speed' => '1.1'
];

foreach ($fields as $name => $value) {
    $postData .= "--" . $delimiter . "\r\n";
    $postData .= 'Content-Disposition: form-data; name="' . $name . '"' . "\r\n\r\n";
    $postData .= $value . "\r\n";
}

// Add file
$fileContents = file_get_contents($tempFile);
$postData .= "--" . $delimiter . "\r\n";
$postData .= 'Content-Disposition: form-data; name="file"; filename="text.txt"' . "\r\n";
$postData .= 'Content-Type: text/plain' . "\r\n\r\n";
$postData .= $fileContents . "\r\n";
$postData .= "--" . $delimiter . "--\r\n";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'x-api-key: ' . $apiKey,
    'Content-Type: multipart/form-data; boundary=' . $delimiter,
    'Content-Length: ' . strlen($postData)
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// Clean up temp file
unlink($tempFile);

echo "<h3>Response</h3>";
echo "<p><strong>HTTP Code:</strong> " . $httpCode . "</p>";

if ($curlError) {
    echo "<p style='color:red'><strong>Curl Error:</strong> " . $curlError . "</p>";
}

$data = json_decode($response, true);

echo "<pre>" . json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";

if (isset($data['success']) && $data['success']) {
    $uuid = $data['result']['uuid'];
    echo "<p style='color:green;font-size:18px'><strong>✓ Success!</strong></p>";
    echo "<p><strong>UUID:</strong> " . $uuid . "</p>";
    echo "<p><strong>Status:</strong> " . $data['result']['status'] . " (" . $data['result']['status_percentage'] . "%)</p>";
    echo "<p><strong>Voice:</strong> " . $data['result']['speaker_name'] . "</p>";
    echo "<p><em>Note: You need to poll the status endpoint to get the final audio URL</em></p>";
} else {
    echo "<p style='color:red'><strong>✗ Failed</strong></p>";
}
?>