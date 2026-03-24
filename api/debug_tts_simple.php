<?php
// Cấu hình lỗi và Header
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/html; charset=utf-8');

echo "<h2>Gemini 2.5 Flash TTS Fixed (2026)</h2>";

// Nhận tham số
$text = $_GET['text'] ?? 'Chào mừng bạn đã đến với IDEAS, chúc bạn một ngày tốt lành.';
$propertyId = $_GET['property_id'] ?? '7c9a7040-a163-40dc-8e29-a1706a160564';
$apiKey = 'AIzaSyDRbVHNrcHGa4GNsHjGpkBqsNikvOg0-v8'; // Đảm bảo Key này còn hoạt động

echo "<p><strong>Nội dung:</strong> " . htmlspecialchars($text) . "</p>";
echo "<hr>";

// Cấu hình API - Đã sửa URL và Model
$model = 'gemini-2.5-flash-lite-tts';
// Quan trọng: URL phải có /v1beta/ và dấu / trước tên model
$url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateSpeech?key=" . $apiKey;

$payload = [
    "text" => $text,
    "speechConfig" => [
        "voiceConfig" => [
            "prebuiltVoiceConfig" => [
                "voiceName" => "Despina" // Giọng nữ HD hỗ trợ tiếng Việt tốt
            ]
        ]
    ]
];

// Gọi API bằng cURL
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Tránh lỗi SSL trên một số localhost

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// Xử lý kết quả đầu ra
if ($curlError) {
    echo "<p style='color:red'><strong>Lỗi kết nối:</strong> $curlError</p>";
    exit;
}

$data = json_decode($response, true);

if ($httpCode === 200 && isset($data['audioData'])) {
    // THÀNH CÔNG
    $audioBase64 = $data['audioData'];

    echo "<p style='color:green; font-weight:bold;'>✓ Đã tạo âm thanh thành công!</p>";

    // Tạo Player để nghe thử ngay lập tức
    echo "<h3>Nghe kết quả:</h3>";
    echo "<audio controls autoplay src='data:audio/mpeg;base64,{$audioBase64}'></audio>";

    echo "<br><br><a href='data:audio/mpeg;base64,{$audioBase64}' download='tts_output.mp3'>Tải file MP3</a>";

    // Debug thông tin
    echo "<p>Dung lượng file: " . number_format(strlen(base64_decode($audioBase64))) . " bytes</p>";

} else {
    // THẤT BẠI
    echo "<p style='color:red; font-weight:bold;'>✗ Lỗi API (Mã lỗi: $httpCode)</p>";
    echo "<p><strong>Chi tiết lỗi từ Google:</strong></p>";
    echo "<pre style='background:#eee; padding:10px; border-radius:5px;'>";
    echo htmlspecialchars(print_r($data, true));
    echo "</pre>";

    if ($httpCode == 404) {
        echo "<p><i>Gợi ý: Kiểm tra lại Model Name hoặc API Key đã được bật quyền sử dụng v1beta chưa.</i></p>";
    }
}
?>