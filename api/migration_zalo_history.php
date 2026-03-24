<?php
/**
 * Migration: Zalo Interaction History & Messages
 */
require_once 'db_connect.php';

try {
    // 1. Zalo User Messages Table (Stores conversation history)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS zalo_user_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            zalo_user_id VARCHAR(100) NOT NULL,
            direction ENUM('inbound', 'outbound') NOT NULL,
            message_text TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (zalo_user_id),
            INDEX idx_created (created_at DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 2. Zalo Subscriber Activity Table (Timeline of events)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS zalo_subscriber_activity (
            id INT AUTO_INCREMENT PRIMARY KEY,
            subscriber_id CHAR(36) NOT NULL,
            type VARCHAR(50) NOT NULL,
            reference_id VARCHAR(100) DEFAULT NULL,
            details TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_subscriber (subscriber_id),
            INDEX idx_created (created_at DESC),
            FOREIGN KEY (subscriber_id) REFERENCES zalo_subscribers(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    echo "Migration Zalo History Completed.";

} catch (PDOException $e) {
    echo "Migration Failed: " . $e->getMessage();
}
