<?php
/**
 * migrate_optimizations.php
 * Script to explicitly apply Schema Fixes for AUTOFLOW V30 Analytics
 * 
 * Please run this script exactly once via browser:
 * http://<your_domain>/api/migrate_optimizations.php
 */

require_once __DIR__ . '/db_connect.php';
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

header('Content-Type: text/plain; charset=utf-8');
echo "BẮT ĐẦU NÂNG CẤP SCHEMA (FIX BOTTLENECKS)...\n";
echo "=================================================\n\n";

try {
    // 1. Tạo bảng timestamp_buffer nếu chưa có
    echo "1. Kiểm tra bảng 'timestamp_buffer'...\n";
    $pdo->exec("CREATE TABLE IF NOT EXISTS timestamp_buffer (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        subscriber_id char(36) NOT NULL,
        column_name VARCHAR(50) NOT NULL,
        timestamp_value DATETIME NOT NULL,
        processed TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_processed (processed),
        INDEX idx_sub_col (subscriber_id, column_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    echo "   [OK] Bảng 'timestamp_buffer' đã sẵn sàng.\n\n";

    // 2. Thêm cột reference_key vào tracking_unique_cache
    echo "2. Kiểm tra cột 'reference_key' trong 'tracking_unique_cache'...\n";
    try {
        // Kiểm tra xem cột đã tồn tại chưa bằng cách query thử
        $pdo->query("SELECT reference_key FROM tracking_unique_cache LIMIT 1");
        echo "   [OK] Cột 'reference_key' đã tồn tại. Bỏ qua altering.\n\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), "Unknown column") !== false) {
            echo "   Đang bổ sung cột 'reference_key'...\n";
            $pdo->exec("ALTER TABLE tracking_unique_cache ADD COLUMN reference_key VARCHAR(255) DEFAULT NULL");
            echo "   [OK] Đã thêm thành công.\n\n";
        } else {
            throw $e;
        }
    }

    // 3. Thiếu Index: Tránh kẹt Spam Debounce 60 giây
    echo "3. Kiểm tra Index 'idx_spam_debounce' trên bảng 'subscriber_activity'...\n";
    try {
        $stmt = $pdo->query("SHOW INDEX FROM subscriber_activity WHERE Key_name = 'idx_spam_debounce'");
        if ($stmt->rowCount() > 0) {
            echo "   [OK] Index đã tồn tại. Bỏ qua altering.\n\n";
        } else {
            echo "   Đang bổ sung Index chống nghẽn...\n";
            // Index cho câu lệnh: WHERE subscriber_id = ? AND type = ? AND created_at >= ?
            $pdo->exec("ALTER TABLE subscriber_activity ADD INDEX idx_spam_debounce (subscriber_id, type, created_at)");
            echo "   [OK] Đã đánh Index thành công.\n\n";
        }
    } catch (PDOException $e) {
        echo "   [CẢNH BÁO] Không thể tạo Index: " . $e->getMessage() . "\n\n";
    }

    echo "=================================================\n";
    echo "HOÀN TẤT! HỆ THỐNG ĐÃ ĐƯỢC FIX LỖI DEADLOCK VÀ INDEX.\n";
    echo "BẠN CÓ THỂ ĐÓNG TAB TRÌNH DUYỆT NÀY VÀ YÊN TÂM CHẠY CHIẾN DỊCH.\n";

} catch (Exception $e) {
    echo "\n[LỖI NGHIÊM TRỌNG]: " . $e->getMessage() . "\n";
}
