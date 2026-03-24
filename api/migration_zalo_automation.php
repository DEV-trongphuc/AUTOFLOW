<?php
/**
 * Migration: Zalo Automation Scenarios (Enhanced)
 */
require_once 'db_connect.php';

try {
    // Check if columns exist before adding
    $columnsToAdd = [
        'match_type' => "ENUM('exact', 'contains') DEFAULT 'exact' AFTER trigger_text",
        'schedule_type' => "ENUM('full', 'custom') DEFAULT 'full' AFTER status",
        'start_time' => "TIME DEFAULT '00:00:00' AFTER schedule_type",
        'end_time' => "TIME DEFAULT '23:59:59' AFTER start_time",
        'active_days' => "VARCHAR(50) DEFAULT '1,2,3,4,5,6,0' AFTER end_time"
    ];

    $existingColumns = $pdo->query("DESCRIBE zalo_automation_scenarios")->fetchAll(PDO::FETCH_COLUMN);

    foreach ($columnsToAdd as $col => $definition) {
        if (!in_array($col, $existingColumns)) {
            $pdo->exec("ALTER TABLE zalo_automation_scenarios ADD COLUMN $col $definition");
            echo "Added column: $col\n";
        }
    }

    // Ensure the table exists (fallback)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS zalo_automation_scenarios (
            id VARCHAR(32) PRIMARY KEY,
            oa_config_id INT NOT NULL,
            type ENUM('welcome', 'keyword', 'first_message') NOT NULL,
            trigger_text VARCHAR(255),
            match_type ENUM('exact', 'contains') DEFAULT 'exact',
            title VARCHAR(255) NOT NULL,
            content TEXT,
            message_type ENUM('text', 'image') DEFAULT 'text',
            image_url TEXT,
            attachment_id VARCHAR(255),
            buttons JSON,
            status ENUM('active', 'inactive') DEFAULT 'active',
            schedule_type ENUM('full', 'custom') DEFAULT 'full',
            start_time TIME DEFAULT '00:00:00',
            end_time TIME DEFAULT '23:59:59',
            active_days VARCHAR(50) DEFAULT '1,2,3,4,5,6,0',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (oa_config_id) REFERENCES zalo_oa_configs(id) ON DELETE CASCADE,
            INDEX idx_oa_type (oa_config_id, type),
            INDEX idx_trigger (trigger_text)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    echo "Migration Zalo Automation Enhanced Successfully.";

} catch (PDOException $e) {
    echo "Migration Failed: " . $e->getMessage();
}
