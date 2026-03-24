<?php
/**
 * Migration: Zalo Audience Tables
 * Creates zalo_lists and zalo_subscribers tables to separate Zalo users from Email subscribers
 */

require_once 'db_connect.php';

try {
    // 1. Zalo Lists Table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS zalo_lists (
            id CHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            oa_config_id CHAR(36) NOT NULL,
            subscriber_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_oa_config (oa_config_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 2. Zalo Subscribers Table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS zalo_subscribers (
            id CHAR(36) PRIMARY KEY,
            zalo_list_id CHAR(36) NOT NULL,
            zalo_user_id VARCHAR(100) NOT NULL,
            display_name VARCHAR(100) DEFAULT 'Zalo User',
            avatar VARCHAR(500) DEFAULT NULL,
            phone_number VARCHAR(20) DEFAULT NULL,
            status ENUM('active', 'unsubscribed') DEFAULT 'active',
            last_interaction_at DATETIME DEFAULT NULL,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            UNIQUE KEY unique_user_list (zalo_list_id, zalo_user_id),
            INDEX idx_zalo_user (zalo_user_id),
            FOREIGN KEY (zalo_list_id) REFERENCES zalo_lists(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 3. Populate existing OAs (Create default lists for them)
    $stmt = $pdo->query("SELECT id, name FROM zalo_oa_configs WHERE status = 'active'");
    $oas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($oas as $oa) {
        // Check if list exists
        $check = $pdo->prepare("SELECT id FROM zalo_lists WHERE oa_config_id = ?");
        $check->execute([$oa['id']]);
        if (!$check->fetch()) {
            $listId = bin2hex(random_bytes(16));
            $listName = "Người quan tâm: " . $oa['name'];
            $ins = $pdo->prepare("INSERT INTO zalo_lists (id, name, oa_config_id) VALUES (?, ?, ?)");
            $ins->execute([$listId, $listName, $oa['id']]);
            echo "Created list for OA: " . $oa['name'] . "<br>";
        }
    }

    echo "Migration completed successfully.";

} catch (PDOException $e) {
    echo "Migration Failed: " . $e->getMessage();
}
