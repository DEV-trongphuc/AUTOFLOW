<?php
require_once 'db_connect.php';

$sqls = [
    // Thêm cột notification vào bảng forms
    "ALTER TABLE forms ADD COLUMN IF NOT EXISTS notification_enabled TINYINT(1) DEFAULT 0 AFTER target_list_id",
    "ALTER TABLE forms ADD COLUMN IF NOT EXISTS notification_emails TEXT NULL AFTER notification_enabled",
    "ALTER TABLE forms ADD COLUMN IF NOT EXISTS notification_subject VARCHAR(255) DEFAULT NULL AFTER notification_emails",
];

foreach ($sqls as $sql) {
    try {
        $pdo->exec($sql);
        echo "OK: $sql\n";
    } catch (Exception $e) {
        echo "ERR: " . $e->getMessage() . " | SQL: $sql\n";
    }
}
echo "Done.\n";
