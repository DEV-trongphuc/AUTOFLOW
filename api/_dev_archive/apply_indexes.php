<?php
require_once 'db_connect.php';
header('Content-Type: text/plain');

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $indexes = [
        ['table' => 'ai_messages', 'column' => 'conversation_id', 'idx_name' => 'idx_conversation_id'],
        ['table' => 'ai_messages', 'column' => 'created_at', 'idx_name' => 'idx_created_at'],
        ['table' => 'ai_conversations', 'column' => 'property_id', 'idx_name' => 'idx_property_id'],
        ['table' => 'ai_conversations', 'column' => 'last_message_at', 'idx_name' => 'idx_last_msg_at'],
        ['table' => 'meta_subscribers', 'column' => 'psid', 'idx_name' => 'idx_psid'],
        ['table' => 'zalo_subscribers', 'column' => 'zalo_user_id', 'idx_name' => 'idx_zalo_user_id'],
        ['table' => 'zalo_message_queue', 'columns' => 'zalo_user_id, processed', 'idx_name' => 'idx_queue_user_proc'],
        ['table' => 'meta_message_logs', 'column' => 'mid', 'idx_name' => 'idx_meta_mid'],
        ['table' => 'web_page_views', 'column' => 'visitor_id', 'idx_name' => 'idx_visitor_pv'],
        ['table' => 'web_page_views', 'column' => 'loaded_at', 'idx_name' => 'idx_loaded_pv'],
        ['table' => 'web_events', 'column' => 'visitor_id', 'idx_name' => 'idx_visitor_ev'],
        ['table' => 'web_events', 'column' => 'created_at', 'idx_name' => 'idx_created_ev'],
        ['table' => 'voucher_codes', 'columns' => 'campaign_id, status', 'idx_name' => 'idx_voucher_camp_stat']
    ];

    foreach ($indexes as $idx) {
        $table = $idx['table'];
        $idx_name = $idx['idx_name'];
        $cols = $idx['columns'] ?? $idx['column'];

        $stmt = $pdo->query("SHOW INDEX FROM `$table` WHERE Key_name = '$idx_name'");
        if (!$stmt->fetch()) {
            echo "Adding index $idx_name to $table ($cols)...\n";
            $pdo->exec("ALTER TABLE `$table` ADD INDEX `$idx_name` ($cols)");
            echo "  -> SUCCESS\n";
        } else {
            echo "Index $idx_name already exists on $table.\n";
        }
    }

    echo "\nAll indexes checked and applied.\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
