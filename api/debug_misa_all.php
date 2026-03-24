<?php
// api/debug_misa_all.php
require_once 'db_connect.php';
require_once 'misa_helper.php';

header('Content-Type: text/plain; charset=utf-8');

echo "=== MISA API TOTAL COUNT DEBUG ===\n";
echo "Thời gian: " . date('Y-m-d H:i:s') . "\n\n";

// 1. Tìm cấu hình MISA trong DB
$stmt = $pdo->query("SELECT * FROM integrations WHERE type = 'misa' AND status = 'active' LIMIT 1");
$integration = $stmt->fetch();

if (!$integration) {
    die("LỖI: Không tìm thấy kết nối MISA nào đang hoạt động trong hệ thống.\n");
}

$config = json_decode($integration['config'], true);
$clientId = $config['clientId'] ?? '';
$clientSecret = $config['clientSecret'] ?? '';
$baseUrl = $config['endpoint'] ?? 'https://crmconnect.misa.vn/api/v2';
$entity = $config['entity'] ?? 'Contacts';

echo "Cấu hình hiện tại:\n";
echo "- Tên kết nối: {$integration['name']}\n";
echo "- Entity: $entity\n";
echo "- Base URL: $baseUrl\n";
echo "- AppID: $clientId\n";
echo "- Secret: " . substr($clientSecret, 0, 4) . "********" . substr($clientSecret, -4) . "\n";
echo str_repeat("-", 50) . "\n\n";

$misa = new MisaHelper($clientId, $clientSecret, $baseUrl);

// 2. Bắt đầu quét dữ liệu
echo "Đang quét dữ liệu từ API (mỗi trang 100 records)...\n";

$page = 0;
$pageSize = 100;
$totalCount = 0;
$hasMore = true;
$startTime = microtime(true);

while ($hasMore) {
    $res = $misa->getRecords($entity, $page, $pageSize);

    if (!$res['success']) {
        echo "\n[LỖI] Tại trang $page: " . ($res['message'] ?? 'Unknown error') . "\n";
        break;
    }

    $count = count($res['data']);
    $totalCount += $count;

    echo "Trang $page: Nhận được $count records (Tổng tích lũy: $totalCount)\n";

    if ($count < $pageSize) {
        $hasMore = false;
        echo "--> Đã đến trang cuối cùng.\n";
    } else {
        $page++;
    }

    // Tránh bị timeout hoặc quá tải
    if ($page > 500) { // Safety break (50,000 records)
        echo "\n[CẢNH BÁO] Đã quét quá 500 trang, dừng để bảo mật.\n";
        break;
    }
}

$endTime = microtime(true);
$duration = round($endTime - $startTime, 2);

echo "\n" . str_repeat("=", 50) . "\n";
echo "KẾT QUẢ CUỐI CÙNG:\n";
echo "- Tổng số records tìm thấy: " . number_format($totalCount) . " $entity\n";
echo "- Tổng thời gian quét: {$duration}s\n";
echo "- Trung bình: " . ($totalCount > 0 ? round($duration / ($page + 1), 3) : 0) . "s/trang\n";
echo str_repeat("=", 50) . "\n";

echo "\nLưu ý: Script này chỉ đếm số lượng trả về từ API, chưa kiểm tra trùng lặp email hay filter dữ liệu.\n";
