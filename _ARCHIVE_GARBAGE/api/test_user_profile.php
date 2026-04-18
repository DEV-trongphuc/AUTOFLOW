<?php
require_once 'db_connect.php';
require_once 'meta_helpers.php';

header("Content-Type: text/plain; charset=utf-8");

$testPsid = '338747883655004'; // The ID requested
$pageId = '860714080649450';   // IDEAS Page ID

echo "--- THỬ NGHIỆM LẤY PROFILE META --- \n";
echo "PSID: $testPsid\n";

// 1. Lấy token của Page IDEAS
$stmt = $pdo->prepare("SELECT page_access_token, page_name FROM meta_app_configs WHERE page_id = ?");
$stmt->execute([$pageId]);
$config = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$config) {
    die("❌ Lỗi: Chưa cấu hình Page IDEAS trong hệ thống.");
}

$token = $config['page_access_token'];
echo "Page: " . $config['page_name'] . "\n";
echo "Token: " . substr($token, 0, 10) . "...\n\n";

// 2. Gọi hàm fetch chuẩn đã sửa theo tài liệu
echo "--- KẾT QUẢ TỪ HÀM CHUẨN ---\n";
$profile = fetchMetaUserProfile($testPsid, $token);

if ($profile && !isset($profile['error'])) {
    echo "✅ THÀNH CÔNG!\n";
    echo "Họ tên: " . ($profile['name'] ?? 'N/A') . "\n";
    echo "First Name: " . ($profile['first_name'] ?? 'N/A') . "\n";
    echo "Last Name: " . ($profile['last_name'] ?? 'N/A') . "\n";
    echo "Giới tính: " . ($profile['gender'] ?? 'N/A') . "\n";
    echo "Ảnh: " . ($profile['profile_pic'] ?? 'N/A') . "\n";
} else {
    echo "❌ THẤT BẠI!\n";
    if (isset($profile['error'])) {
        echo "Lỗi: " . $profile['error'] . "\n";
        echo "Mã lỗi: " . ($profile['code'] ?? 'N/A') . "\n";
    } else {
        echo "Không nhận được phản hồi từ Meta.\n";
    }
}

echo "\n--- CHI TIẾT REQUEST (DEBUG) ---\n";
$url = "https://graph.facebook.com/v24.0/$testPsid?fields=id,name,first_name,last_name,profile_pic,locale,timezone,gender&access_token=$token";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Raw Response: $response\n";
?>