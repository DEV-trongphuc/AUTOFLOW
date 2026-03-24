<?php
/**
 * Migration: Zalo Broadcast System
 */
require_once 'db_connect.php';

try {
    // 1. Zalo Broadcasts Table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS zalo_broadcasts (
            id VARCHAR(32) PRIMARY KEY,
            oa_config_id INT NOT NULL,
            title VARCHAR(255),
            content TEXT,
            message_type ENUM('text', 'image') DEFAULT 'text',
            attachment_id VARCHAR(255),
            buttons JSON,
            target_group VARCHAR(50) DEFAULT 'all',
            target_filter JSON,
            schedule_time DATETIME DEFAULT NULL,
            status ENUM('draft', 'scheduled', 'sending', 'sent', 'failed') DEFAULT 'draft',
            
            stats_sent INT DEFAULT 0,
            stats_delivered INT DEFAULT 0,
            stats_seen INT DEFAULT 0,
            stats_reacted INT DEFAULT 0,
            
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            FOREIGN KEY (oa_config_id) REFERENCES zalo_oa_configs(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // 2. Tracking Table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS zalo_broadcast_tracking (
            id VARCHAR(32) PRIMARY KEY,
            broadcast_id VARCHAR(32) NOT NULL,
            zalo_user_id VARCHAR(50) NOT NULL,
            zalo_msg_id VARCHAR(64),
            status ENUM('sent', 'delivered', 'seen', 'reacted') DEFAULT 'sent',
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            delivered_at DATETIME,
            seen_at DATETIME,
            reacted_at DATETIME,
            
            FOREIGN KEY (broadcast_id) REFERENCES zalo_broadcasts(id) ON DELETE CASCADE,
            INDEX idx_user (zalo_user_id),
            INDEX idx_msg (zalo_msg_id),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    echo "Migration Zalo Broadcast Completed.";

} catch (PDOException $e) {
    echo "Migration Failed: " . $e->getMessage();
}
