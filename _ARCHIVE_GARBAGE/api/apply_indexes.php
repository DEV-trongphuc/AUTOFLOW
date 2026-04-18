<?php
// apply_indexes.php - Công cụ tự động cài đặt Index an toàn cho mọi phiên bản MySQL
require_once 'db_connect.php';

echo "<h1>AutoFlow Index Migration</h1>";
echo "<pre>";

$queries = [
    // 1. subscriber_activity
    "ALTER TABLE subscriber_activity ADD INDEX idx_sub_created (subscriber_id, created_at)",
    "ALTER TABLE subscriber_activity ADD INDEX idx_campaign_sub_type (campaign_id, subscriber_id, type)",
    "ALTER TABLE subscriber_activity ADD INDEX idx_sub_type_created (subscriber_id, type, created_at)",
    "ALTER TABLE subscriber_activity ADD INDEX idx_type_created (type, created_at)",
    "ALTER TABLE subscriber_activity ADD INDEX idx_campaign_type (campaign_id, type)",

    // 2. subscriber_flow_states
    "ALTER TABLE subscriber_flow_states ADD INDEX idx_status_scheduled_created (status, scheduled_at, created_at)",
    "ALTER TABLE subscriber_flow_states ADD INDEX idx_sub_flow_created (subscriber_id, flow_id, created_at)",
    "ALTER TABLE subscriber_flow_states ADD INDEX idx_flow_status (flow_id, status)",
    "ALTER TABLE subscriber_flow_states ADD INDEX idx_status_sched_flow (status, scheduled_at, flow_id, created_at)",

    // 3. activity_buffer
    "ALTER TABLE activity_buffer ADD INDEX idx_processed_created (processed, created_at)",

    // 4. stats_update_buffer
    "ALTER TABLE stats_update_buffer ADD INDEX idx_created (created_at)",

    // 5. mail_delivery_logs
    "ALTER TABLE mail_delivery_logs ADD INDEX idx_campaign_status (campaign_id, status)",

    // 6. campaigns
    "ALTER TABLE campaigns ADD INDEX idx_updated_at (updated_at)",
    "ALTER TABLE campaigns ADD INDEX idx_workspace_deleted (workspace_id, is_deleted, created_at)",

    // 7. segments (Columns)
    "ALTER TABLE segments ADD COLUMN notify_on_join BOOLEAN DEFAULT FALSE",
    "ALTER TABLE segments ADD COLUMN notify_subject VARCHAR(255) NULL",
    "ALTER TABLE segments ADD COLUMN notify_email VARCHAR(255) NULL",
    "ALTER TABLE segments ADD COLUMN notify_cc VARCHAR(255) NULL",
    "ALTER TABLE segments ADD COLUMN workspace_id INT(11) DEFAULT 1",

    // 8. segment_exclusions
    "ALTER TABLE segment_exclusions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    "ALTER TABLE segment_exclusions ADD INDEX idx_seg_exclusions_seg (segment_id)",

    // 9. subscribers
    "ALTER TABLE subscribers ADD INDEX idx_workspace_status (workspace_id, status)",

    // 10. subscriber_lists
    "ALTER TABLE subscriber_lists ADD INDEX idx_list_id (list_id)",

    // 11. zalo_delivery_logs
    "ALTER TABLE zalo_delivery_logs ADD INDEX idx_flow_status (flow_id, status)",

    // 12. tags
    "ALTER TABLE tags ADD INDEX idx_workspace (workspace_id)",

    // 13. subscriber_tags
    "ALTER TABLE subscriber_tags ADD INDEX idx_tag_id (tag_id)",

    // 15. queue_jobs
    "ALTER TABLE queue_jobs ADD INDEX idx_status_available_id (status, available_at, id)",

    // 16. Web Tracking Analytics
    "ALTER TABLE web_page_views ADD INDEX idx_property_loaded (property_id, loaded_at)",
    "ALTER TABLE web_sessions ADD INDEX idx_property_started (property_id, started_at)",
    "ALTER TABLE web_events ADD INDEX idx_property_event (property_id, event_type)",
    "ALTER TABLE web_visitors ADD INDEX idx_property_lastvisit (property_id, last_visit_at)"
];

$success = 0;
$skipped = 0;

foreach ($queries as $q) {
    try {
        $pdo->exec($q);
        echo "<span style='color:green;'>[SUCCESS]</span> $q\n";
        $success++;
    } catch (PDOException $e) {
        $msg = $e->getMessage();
        if (strpos($msg, 'Duplicate') !== false || strpos($msg, 'Duplicate key') !== false) {
            echo "<span style='color:orange;'>[SKIPPED]</span> " . htmlspecialchars($q) . "\n  └─ <small>Đã tồn tại (Duplicate Key)</small>\n";
            $skipped++;
        } elseif (strpos($msg, 'Duplicate column name') !== false) {
            echo "<span style='color:orange;'>[SKIPPED]</span> " . htmlspecialchars($q) . "\n  └─ <small>Đã tồn tại (Duplicate Column)</small>\n";
            $skipped++;
        } else {
            echo "<span style='color:red;'>[ERROR]</span> " . htmlspecialchars($q) . "\n  └─ <small>$msg</small>\n";
        }
    }
}

echo "\n<b>Hoàn thành!</b> Thành công: $success | Đã bỏ qua (Tồn tại sẵn): $skipped\n";
echo "</pre>";
?>
