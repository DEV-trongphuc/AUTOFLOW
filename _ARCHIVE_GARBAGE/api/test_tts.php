<?php

// 1. Cấu hình API Key
// Lưu ý: Key này cần bật "Cloud Text-to-Speech API" trong Google Cloud Console mới chạy được.
$apiKey = 'AIzaSyA3gGSZt3D_oxCCNSoUfiO9P33l4h-1Awo'; 

// URL dành riêng cho việc chuyển đổi Text sang Audio
$url = "https://texttospeech.googleapis.com/v1/text:synthesize?key={$apiKey}";

// 2. Chuẩn bị dữ liệu (Payload)
// Bạn có thể đổi 'text' thành nội dung bạn muốn
// Đổi 'languageCode' thành 'vi-VN' nếu muốn nói tiếng Việt
$data = [
    "input" => [
        "text" => "Hello, this is an AI generated audio explaining how artificial intelligence works."
    ],
    "voice" => [
        "languageCode" => "en-US", // Hoặc 'vi-VN' cho tiếng Việt
        "name" => "en-US-Journey-F" // Dòng giọng đọc tự nhiên (Journey) hoặc 'en-US-Neural2-D'
    ],
    "audioConfig" => [
        "audioEncoding" => "MP3"
    ]
];

$jsonData = json_encode($data);

// 3. Khởi tạo cURL
$ch = curl_init($url);

curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($jsonData)
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

// 4. Thực thi request
echo "Đang gửi request lấy Audio...\n";
$response = curl_exec($ch);

// 5. Xử lý kết quả
if (curl_errno($ch)) {
    echo 'Lỗi cURL: ' . curl_error($ch);
} else {
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if ($httpCode == 200) {
        // API trả về JSON chứa chuỗi Base64 trong trường 'audioContent'
        $decoded = json_decode($response, true);
        
        if (isset($decoded['audioContent'])) {
            // Giải mã Base64 sang binary audio
            $audioData = base64_decode($decoded['audioContent']);
            
            // Lưu thành file MP3
            $fileName = 'output_audio.mp3';
            file_put_contents($fileName, $audioData);
            
            echo "Thành công! File âm thanh đã được lưu tại: " . $fileName . "\n";
        } else {
            echo "Lỗi: Không tìm thấy nội dung audio trong phản hồi.\n";
            print_r($decoded);
        }
    } else {
        echo "Lỗi HTTP ($httpCode):\n";
        echo $response;
    }
}

curl_close($ch);
?>