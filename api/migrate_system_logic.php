<?php
/**
 * api/migrate_system_logic.php - Core Migration Engine
 * Extracted from high-traffic API endpoints for centralized execution.
 */

function runSystemMigration($pdo, $targetVersion)
{
    // 1. Core Schema Updates
    $columnsToAdd = [
        'flows' => [
            'stat_unique_opened' => "INT DEFAULT 0 AFTER `stat_total_opened`",
            'stat_total_clicked' => "INT DEFAULT 0 AFTER `stat_unique_opened` ",
            'stat_unique_clicked' => "INT DEFAULT 0 AFTER `stat_total_clicked`",
            'stat_total_failed' => "INT DEFAULT 0 AFTER `stat_unique_clicked`",
            'stat_total_unsubscribed' => "INT DEFAULT 0 AFTER `stat_total_failed`"
        ],
        'mail_delivery_logs' => [
            'flow_id' => "CHAR(36) DEFAULT NULL AFTER `campaign_id` ",
            'reminder_id' => "CHAR(36) DEFAULT NULL AFTER `flow_id` ",
            'recipient' => "VARCHAR(255) DEFAULT NULL AFTER `id` ",
            'subject' => "VARCHAR(255) DEFAULT NULL AFTER `recipient` ",
            'error_message' => "TEXT DEFAULT NULL AFTER `status` "
        ],
        'zalo_delivery_logs' => [
            'flow_id' => "CHAR(36) DEFAULT NULL AFTER `id` ",
            'step_id' => "VARCHAR(50) DEFAULT NULL AFTER `flow_id` ",
            'oa_config_id' => "VARCHAR(50) DEFAULT NULL AFTER `subscriber_id` ",
            'template_id' => "VARCHAR(100) DEFAULT NULL AFTER `oa_config_id` ",
            'phone_number' => "VARCHAR(20) DEFAULT NULL AFTER `template_id` ",
            'template_data' => "JSON DEFAULT NULL AFTER `phone_number` ",
            'error_message' => "TEXT DEFAULT NULL AFTER `error_code` ",
            'created_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER `sent_at` "
        ],
        'campaigns' => [
            'count_unique_opened' => "INT DEFAULT 0 AFTER `count_opened` ",
            'count_unique_clicked' => "INT DEFAULT 0 AFTER `count_clicked` "
        ],
        'subscribers' => [
            'is_zalo_follower' => "TINYINT(1) DEFAULT 0 AFTER `is_follower` "
        ],
        'lists' => [
            'phone_count' => "INT DEFAULT 0 AFTER `subscriber_count` "
        ]
    ];

    foreach ($columnsToAdd as $table => $cols) {
        foreach ($cols as $colName => $definition) {
            try {
                $check = $pdo->query("SHOW COLUMNS FROM `$table` LIKE '$colName'")->fetch();
                if (!$check) {
                    $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$colName` $definition");
                }
            } catch (Exception $e) { /* Silent fails if column exists */
            }
        }
    }

    // 2. Performance Indexes
    try {
        $indices = [
            'subscriber_activity' => [
                'idx_activity_flow_ref_type' => 'flow_id, reference_id, type',
                'idx_activity_flow_time' => 'flow_id, created_at'
            ],
            'subscriber_flow_states' => [
                'idx_flow_status_step' => 'flow_id, status, step_id'
            ],
            'subscribers' => [
                'idx_sub_phone' => 'phone_number',
                'idx_sub_email' => 'email'
            ],
            'subscriber_lists' => [
                'idx_list_sub' => 'list_id, subscriber_id'
            ]
        ];

        foreach ($indices as $table => $idxs) {
            foreach ($idxs as $name => $cols) {
                $checkIdx = $pdo->query("SHOW INDEX FROM `$table` WHERE Key_name = '$name'")->fetch();
                if (!$checkIdx) {
                    $pdo->exec("ALTER TABLE `$table` ADD INDEX `$name` ($cols)");
                }
            }
        }
    } catch (Exception $e) { /* Ignore index errors */
    }

    // 3. Update System Version
    try {
        // Ensure system_settings exists
        $pdo->exec("CREATE TABLE IF NOT EXISTS system_settings (
            `key` VARCHAR(64) PRIMARY KEY,
            `value` TEXT,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        $stmt = $pdo->prepare("INSERT INTO system_settings (`key`, `value`) VALUES ('schema_version', ?) 
                               ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)");
        $stmt->execute([$targetVersion]);
    } catch (Exception $e) { /* Silent fails */
    }

    // 4. One-time Fixes for 29.8
    if ($targetVersion === '29.8') {
        try {
            // Populate phone_count for existing lists
            $pdo->exec("UPDATE lists l SET l.phone_count = (
                SELECT COUNT(*) FROM subscriber_lists sl 
                JOIN subscribers s ON sl.subscriber_id = s.id 
                WHERE sl.list_id = l.id AND (s.phone_number IS NOT NULL AND s.phone_number != '')
            ) WHERE l.phone_count = 0");
        } catch (Exception $e) {
        }
    }
}
