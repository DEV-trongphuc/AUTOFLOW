<?php
// api/check_campaign_schema.php
require_once 'db_connect.php';

echo "--- Checking & Fixing Campaigns Table ---\n";
try {
    // 1. Kiểm tra các cột cần thiết
    $colsToAdd = [
        'count_opened' => "ALTER TABLE campaigns ADD COLUMN count_opened INT DEFAULT 0 AFTER count_sent",
        'count_clicked' => "ALTER TABLE campaigns ADD COLUMN count_clicked INT DEFAULT 0 AFTER count_opened",
        'stat_opens' => "ALTER TABLE campaigns ADD COLUMN stat_opens INT DEFAULT 0",
        'stat_clicks' => "ALTER TABLE campaigns ADD COLUMN stat_clicks INT DEFAULT 0",
        'count_unique_opened' => "ALTER TABLE campaigns ADD COLUMN count_unique_opened INT DEFAULT 0",
        'count_unique_clicked' => "ALTER TABLE campaigns ADD COLUMN count_unique_clicked INT DEFAULT 0"
    ];

    foreach ($colsToAdd as $col => $sql) {
        $check = $pdo->query("SHOW COLUMNS FROM campaigns LIKE '$col'")->fetch();
        if (!$check) {
            echo "Adding missing column: $col...\n";
            $pdo->exec($sql);
        } else {
            echo "Column $col already exists.\n";
        }
    }

    echo "\n--- Final Schema Success ---\n";
    $stmt = $pdo->query("DESCRIBE campaigns");
    foreach ($stmt->fetchAll() as $row) {
        echo "Field: {$row['Field']} | Type: {$row['Type']}\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
