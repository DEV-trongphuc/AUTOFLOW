<?php
require_once 'db_connect.php';

try {
    // Thêm composite index để optimize truy vấn ORDER BY và phân trang
    $sql = "ALTER TABLE system_audit_logs ADD INDEX `idx_user_created` (`user_id`, `created_at` DESC)";
    $pdo->exec($sql);
    echo "[OK] Added idx_user_created composite index.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate key name') !== false) {
        echo "[INFO] Index idx_user_created already exists.\n";
    } else {
        echo "[ERROR] " . $e->getMessage() . "\n";
    }
}
?>
