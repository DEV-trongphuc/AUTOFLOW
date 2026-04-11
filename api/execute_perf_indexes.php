<?php
require_once 'db_connect.php';

header('Content-Type: text/plain');
echo "🚀 Bắt đầu tối ưu Database Indexes...\n\n";

function executeSQL($pdo, $sql) {
    try {
        echo "Thực thi: $sql\n";
        $pdo->exec($sql);
        echo " => THÀNH CÔNG\n\n";
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate key') !== false) {
            echo " => BỎ QUA (Đã tồn tại)\n\n";
        } else {
            echo " => LỖI: " . $e->getMessage() . "\n\n";
        }
    }
}

// 1. ADD MISSING INDEXES
$queries = [
    // ai_messages
    "ALTER TABLE `ai_messages` ADD INDEX `idx_conv_id` (`conversation_id`);",
    "ALTER TABLE `ai_messages` ADD INDEX `idx_created_at` (`created_at`);",
    // ai_conversations
    "ALTER TABLE `ai_conversations` ADD INDEX `idx_prop_id` (`property_id`);",
    "ALTER TABLE `ai_conversations` ADD INDEX `idx_last_msg_at` (`last_message_at`);",
    // meta_subscribers
    "ALTER TABLE `meta_subscribers` ADD INDEX `idx_psid` (`psid`);",
    // zalo_subscribers
    "ALTER TABLE `zalo_subscribers` ADD INDEX `idx_zalo_uid` (`zalo_user_id`);",
    // web_page_views
    "ALTER TABLE `web_page_views` ADD INDEX `idx_visitor_vid` (`visitor_id`);",
    "ALTER TABLE `web_page_views` ADD INDEX `idx_loaded_at` (`loaded_at`);",
    // web_events
    "ALTER TABLE `web_events` ADD INDEX `idx_visitor_evt` (`visitor_id`);",
    "ALTER TABLE `web_events` ADD INDEX `idx_evt_created` (`created_at`);"
];

foreach ($queries as $q) {
    executeSQL($pdo, $q);
}

// 2. CLEAN UP REDUNDANT INDEXES ON subscriber_activity
// First, find all indexes on subscriber_activity
try {
    $stmt = $pdo->query("SHOW INDEX FROM subscriber_activity");
    $indices = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $idxNames = [];
    foreach ($indices as $row) {
        $keyName = $row['Key_name'];
        if ($keyName !== 'PRIMARY') {
            if (!isset($idxNames[$keyName])) {
                $idxNames[$keyName] = [];
            }
            $idxNames[$keyName][] = $row['Column_name'];
        }
    }
    
    echo "Phát hiện " . count($idxNames) . " indexes phụ trên subscriber_activity.\n";
    if (count($idxNames) > 10) {
        echo "Bắt đầu dọn dẹp các index dự phòng...\n";
        // Dọn đi một số index tự động sinh hoặc index kép vô dụng
        // (chỉ ví dụ, trong thực tế sẽ cẩn thận hơn, ta sẽ filter các index bắt đầu bằng subscriber_id)
        foreach ($idxNames as $key => $cols) {
            // Giữ lại các index quan trọng
            if (in_array($key, ['subscriber_id', 'type', 'created_at', 'reference_id'])) {
                continue;
            }
            if ($cols[0] === 'subscriber_id' && count($cols) > 1) {
                 executeSQL($pdo, "ALTER TABLE `subscriber_activity` DROP INDEX `$key`");
            }
        }
    }
} catch (Exception $e) {
    echo "Lỗi khi kiểm tra index subscriber_activity: " . $e->getMessage() . "\n";
}

echo "✅ Tối ưu Indexes Hoàn Tất.\n";
?>
