<?php
// api/debug_misa_10pages.php
require_once 'db_connect.php';
require_once 'misa_helper.php';

header('Content-Type: text/plain; charset=utf-8');

echo "=== MISA API 10 PAGES DEBUG (NO FILTER) ===\n";
echo "Thời gian: " . date('Y-m-d H:i:s') . "\n\n";

// 1. Tìm cấu hình MISA trong DB
$stmt = $pdo->query("SELECT * FROM integrations WHERE type = 'misa' AND status = 'active' LIMIT 1");
$integration = $stmt->fetch();

if (!$integration) {
    die("LỖI: Không tìm thấy kết nối MISA nào đang hoạt động.\n");
}

$config = json_decode($integration['config'], true);
$clientId = $config['clientId'] ?? '';
$clientSecret = $config['clientSecret'] ?? '';
$baseUrl = $config['endpoint'] ?? 'https://crmconnect.misa.vn/api/v2';
$entity = $config['entity'] ?? 'Contacts';

echo "Sử dụng cấu hình:\n";
echo "- Entity: $entity\n";
echo "- AppID: $clientId\n";
echo str_repeat("-", 50) . "\n\n";

$misa = new MisaHelper($clientId, $clientSecret, $baseUrl);

$totalCount = 0;
$pageSize = 100;

for ($page = 0; $page < 10; $page++) {
    echo "--- ĐANG GỌI TRANG $page ---\n";
    $res = $misa->getRecords($entity, $page, $pageSize);

    if (!$res['success']) {
        echo "[LỖI] " . ($res['message'] ?? 'Unknown error') . "\n";
        break;
    }

    $rows = $res['data'];
    $count = count($rows);
    $totalCount += $count;

    echo "Kết quả: Lấy được $count records.\n";

    if ($count > 0) {
        echo "Mẫu 3 người đầu tiên trang này:\n";
        for ($i = 0; $i < min(3, $count); $i++) {
            $r = $rows[$i];
            // Hiển thị một số trường thô từ API (đã qua normalize sang snake_case của helper)
            $name = $r['contact_name'] ?? $r['account_name'] ?? $r['first_name'] ?? 'N/A';
            $email = $r['email'] ?? $r['office_email'] ?? $r['custom_field1'] ?? 'N/A';
            echo "  #$i: Name: $name | Email: $email\n";
        }
    }

    echo str_repeat(".", 30) . "\n";

    if ($count < $pageSize) {
        echo "--> API trả về ít hơn $pageSize records, đây có thể là trang cuối.\n";
        break;
    }
}

echo "\n" . str_repeat("=", 50) . "\n";
echo "TỔNG CỘNG SAU 10 TRANG (HOẶC ĐẾN HẾT): " . number_format($totalCount) . " records.\n";
echo str_repeat("=", 50) . "\n";
