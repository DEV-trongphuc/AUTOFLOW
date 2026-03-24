<?php
require_once 'db_connect.php';

try {
    // Create zalo_oa_configs table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `zalo_oa_configs` (
        `id` bigint(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `oa_id` varchar(100) NOT NULL UNIQUE,
        `oa_name` varchar(255) DEFAULT NULL,
        `oa_avatar` text DEFAULT NULL,
        `access_token` text DEFAULT NULL,
        `refresh_token` text DEFAULT NULL,
        `token_expires_at` datetime DEFAULT NULL,
        `status` enum('active', 'inactive', 'expired') DEFAULT 'active',
        `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
        `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_oa_id` (`oa_id`),
        INDEX `idx_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    echo "✅ Created zalo_oa_configs table\n";

    // Add oa_id to zalo_subscribers if not exists
    $stmt = $pdo->query("SHOW COLUMNS FROM zalo_subscribers LIKE 'oa_id'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE zalo_subscribers ADD COLUMN oa_id VARCHAR(100) DEFAULT NULL AFTER zalo_user_id");
        $pdo->exec("ALTER TABLE zalo_subscribers ADD INDEX idx_oa_id (oa_id)");
        echo "✅ Added oa_id column to zalo_subscribers\n";
    } else {
        echo "ℹ️  oa_id column already exists in zalo_subscribers\n";
    }

    echo "\n✅ Zalo OA configs setup completed!\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>