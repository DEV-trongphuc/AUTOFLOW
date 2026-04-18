<?php
require_once 'db_connect.php';

try {
    // 1. Chuyển cột status sang VARCHAR để linh hoạt hơn, không bị bó buộc bởi ENUM cũ
    $pdo->exec("ALTER TABLE subscribers MODIFY COLUMN status VARCHAR(50) DEFAULT 'active'");
    echo "✅ Đã chuyển đổi cột status sang VARCHAR(50)\n";

    // 2. Thêm cột updated_at nếu chưa có (fix lỗi Unknown)
    $stmt = $pdo->query("SHOW COLUMNS FROM subscribers LIKE 'updated_at'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE subscribers ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        echo "✅ Đã thêm cột updated_at\n";
    }

    // 3. Cập nhật dữ liệu cũ
    $pdo->exec("UPDATE subscribers SET updated_at = joined_at WHERE updated_at IS NULL");
    echo "✅ Đã đồng bộ thời gian cập nhật\n";

} catch (Exception $e) {
    echo "❌ Lỗi: " . $e->getMessage() . "\n";
}
?>