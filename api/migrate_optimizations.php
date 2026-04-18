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
    // 4. Bổ sung Index tối ưu NOT EXISTS cho (subscriber_id, campaign_id, type)
    echo "4. Kiểm tra Index 'idx_activity_sub_camp_type' (Dành cho Zalo Campaign và Inactive logic)...\n";
    try {
        $stmt = $pdo->query("SHOW INDEX FROM subscriber_activity WHERE Key_name = 'idx_activity_sub_camp_type'");
        if ($stmt->rowCount() > 0) {
            echo "   [OK] Index 'idx_activity_sub_camp_type' đã tồn tại. Bỏ qua altering.\n\n";
        } else {
            echo "   Đang bổ sung Index tối ưu ZNS/Anti-join...\n";
            $pdo->exec("ALTER TABLE subscriber_activity ADD INDEX idx_activity_sub_camp_type (subscriber_id, campaign_id, type)");
            echo "   [OK] Đã đánh Index thành công.\n\n";
        }
    } catch (PDOException $e) {
        echo "   [CẢNH BÁO] Không thể tạo Index: " . $e->getMessage() . "\n\n";
    }

    // 5. Bổ sung Index tối ưu Queue Scanner (Quét Job Lỗi)
    echo "5. Kiểm tra Index 'idx_status_updated' (Dành cho tiến trình Quét Lỗi ngầm)...\n";
    try {
        $stmt = $pdo->query("SHOW INDEX FROM ai_pdf_chunk_results WHERE Key_name = 'idx_status_updated'");
        if ($stmt->rowCount() > 0) {
            echo "   [OK] Index 'idx_status_updated' đã tồn tại. Bỏ qua altering.\n\n";
        } else {
            echo "   Đang bổ sung Index chống sập DB cho hệ thống Worker Queue...\n";
            $pdo->exec("ALTER TABLE ai_pdf_chunk_results ADD INDEX idx_status_updated (status, updated_at)");
            echo "   [OK] Đã đánh Index thành công.\n\n";
        }
    } catch (PDOException $e) {
        // Table hasn't been created yet perhaps
        if (strpos($e->getMessage(), "Table") !== false && strpos($e->getMessage(), "doesn't exist") !== false) {
             echo "   [BỎ QUA] Bảng ai_pdf_chunk_results chưa tồn tại (chưa từng training PDF).\n\n";
        } else {
             echo "   [CẢNH BÁO] Không thể tạo Index: " . $e->getMessage() . "\n\n";
        }
    }

    echo "=================================================\n";
    echo "6. Kiểm tra cột ZNS click stats trong bảng 'flows'...\n";
    // [P11-C1] tracking_processor.php (P10-H1) writes stat_total_zalo_clicked / stat_unique_zalo_clicked
    // but these columns were missing from the original schema, causing PDOException on every ZNS click.
    foreach (['stat_total_zalo_clicked', 'stat_unique_zalo_clicked'] as $col) {
        try {
            $pdo->query("SELECT $col FROM flows LIMIT 1");
            echo "   [OK] Cột '$col' đã tồn tại. Bỏ qua.\n";
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Unknown column') !== false) {
                echo "   Đang bổ sung cột '$col' vào bảng 'flows'...\n";
                $pdo->exec("ALTER TABLE flows ADD COLUMN IF NOT EXISTS `$col` INT(11) NOT NULL DEFAULT 0 COMMENT 'P11-C1 ZNS click stat'");
                echo "   [OK] Đã thêm '$col' thành công.\n";
            } else {
                throw $e;
            }
        }
    }
    echo "\n";

    echo "=================================================\n";
    echo "7. Kiểm tra cột 'html_content' trong bảng 'campaign_reminders'...\n";
    // [P11-M1] html_content exists in production DB but was never added to database.sql schema.
    // Fresh installs will be missing this column, causing reminder mail worker to crash.
    try {
        $pdo->query("SELECT html_content FROM campaign_reminders LIMIT 1");
        echo "   [OK] Cột 'html_content' đã tồn tại. Bỏ qua.\n\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Unknown column') !== false) {
            echo "   Đang bổ sung cột 'html_content' vào 'campaign_reminders'...\n";
            $pdo->exec("ALTER TABLE campaign_reminders ADD COLUMN IF NOT EXISTS `html_content` MEDIUMTEXT DEFAULT NULL COMMENT 'Cached HTML build for reminder (P11-M1)'");
            echo "   [OK] Đã thêm thành công.\n\n";
        } else {
            throw $e;
        }
    }

    echo "=================================================\n";
    echo "HOÀN TẤT! HỆ THỐNG ĐÃ ĐƯỢC FIX LỖI DEADLOCK VÀ INDEX.\n";
    echo "BẠN CÓ THỂ ĐÓNG TAB TRÌNH DUYỆT NÀY VÀ YÊN TÂM CHẠY CHIẾN DỊCH.\n";

} catch (Exception $e) {
    echo "\n[LỖI NGHIÊM TRỌNG]: " . $e->getMessage() . "\n";
}
