<?php
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

echo "=== KIỂM TRA SỐ LIỆU ===\n\n";

// 1. Tổng số trong hệ thống
$stmt = $pdo->query("SELECT COUNT(*) FROM subscribers WHERE status = 'active'");
$total = $stmt->fetchColumn();
echo "1. Tổng liên hệ Active (Bên ngoài): " . number_format($total) . "\n";

// 2. Chi tiết từng danh sách
echo "2. Chi tiết từng danh sách:\n";
$stmt = $pdo->query("SELECT id, name, subscriber_count FROM lists");
while ($row = $stmt->fetch()) {
    // Audit thực tế
    $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM subscriber_lists WHERE list_id = ?");
    $stmtCount->execute([$row['id']]);
    $realCount = $stmtCount->fetchColumn();

    echo "   - [{$row['name']}] (ID: {$row['id']})\n";
    echo "       + Display Count (Cached): " . number_format($row['subscriber_count']) . "\n";
    echo "       + Real Count (Database):  " . number_format($realCount) . "\n";

    if ($row['subscriber_count'] != $realCount) {
        echo "       ⚠️ LỆCH! Đang fix...\n";
        $pdo->prepare("UPDATE lists SET subscriber_count = ? WHERE id = ?")->execute([$realCount, $row['id']]);
        echo "       ✅ Đã update lại cache.\n";
    }
}

// 3. Phân tích Integrations
echo "\n3. Thống kê Sync:\n";
$stmt = $pdo->query("SELECT id, name, last_sync_at FROM integrations");
while ($int = $stmt->fetch()) {
    echo "   - {$int['name']} (Last Sync: {$int['last_sync_at']})\n";
}

echo "\n=== KẾT LUẬN ===\n";
echo "Nếu 'Tổng liên hệ' > 'Danh sách', nghĩa là có " . ($total - 8192) . " liên hệ nằm ngoài danh sách này (hoặc từ nguồn khác).\n";
