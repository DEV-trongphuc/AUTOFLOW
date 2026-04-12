<?php
require_once 'bootstrap.php';
initializeSystem($pdo);

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS voucher_campaigns (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            thumbnail_url VARCHAR(500),
            rewards JSON,
            code_type ENUM('dynamic', 'static') DEFAULT 'dynamic',
            static_code VARCHAR(100),
            start_date DATETIME NULL,
            end_date DATETIME NULL,
            status ENUM('draft', 'active', 'expired') DEFAULT 'draft',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS voucher_codes (
            id VARCHAR(36) PRIMARY KEY,
            campaign_id VARCHAR(36) NOT NULL,
            code VARCHAR(100) NOT NULL,
            reward_item_id VARCHAR(100),
            subscriber_id VARCHAR(36) NULL,
            status ENUM('unused', 'used') DEFAULT 'unused',
            sent_at DATETIME NULL,
            used_at DATETIME NULL,
            created_at DATETIME NOT NULL,
            UNIQUE KEY idx_campaign_code (campaign_id, code),
            FOREIGN KEY (campaign_id) REFERENCES voucher_campaigns(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    echo "Voucher tables created successfully.\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
