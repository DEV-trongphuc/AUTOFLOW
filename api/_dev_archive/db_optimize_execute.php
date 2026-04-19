<?php
// api/db_optimize_execute.php
require_once 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');

// Only run if confirmed
if (($_GET['confirm'] ?? '') !== '1') {
    echo json_encode(['success' => false, 'message' => 'Please add ?confirm=1 to the URL to execute the optimization.']);
    exit;
}

$commands = [
    // --- SUBSCRIBERS ---
    "ALTER TABLE `subscribers` DROP INDEX `unique_email`",
    "ALTER TABLE `subscribers` DROP INDEX `idx_email`",
    "ALTER TABLE `subscribers` DROP INDEX `idx_status`",
    "ALTER TABLE `subscribers` DROP INDEX `idx_last_activity_at`",
    "ALTER TABLE `subscribers` DROP INDEX `idx_subscribers_status`",
    "ALTER TABLE `subscribers` DROP INDEX `idx_subscribers_last_activity`",
    "ALTER TABLE `subscribers` DROP INDEX `idx_subscribers_email`",
    "ALTER TABLE `subscribers` DROP INDEX `idx_zalo_user_id`",
    "ALTER TABLE `subscribers` DROP INDEX `idx_sub_status`",
    "ALTER TABLE `subscribers` DROP INDEX `idx_sub_email`",
    "ALTER TABLE `subscribers` DROP INDEX `idx_sub_property`",

    // --- SUBSCRIBER LISTS ---
    "ALTER TABLE `subscriber_lists` DROP INDEX `subscriber_lists_ibfk_2`",
    "ALTER TABLE `subscriber_lists` DROP INDEX `idx_subscriber_lists_subscriber`",

    // --- WEB VISITORS ---
    "ALTER TABLE `web_visitors` DROP INDEX `property_idx`",
    "ALTER TABLE `web_visitors` DROP INDEX `sub_idx`",
    "ALTER TABLE `web_visitors` DROP INDEX `idx_vis_prop_lastvisit`",
    "ALTER TABLE `web_visitors` DROP INDEX `idx_vis_email`",
    "ALTER TABLE `web_visitors` DROP INDEX `idx_vis_phone`",

    // --- WEB SESSIONS ---
    "ALTER TABLE `web_sessions` DROP INDEX `visitor_idx`",
    "ALTER TABLE `web_sessions` DROP INDEX `idx_sess_prop_active`",

    // --- WEB PAGE VIEWS ---
    "ALTER TABLE `web_page_views` DROP INDEX `session_idx`",
    "ALTER TABLE `web_page_views` DROP INDEX `idx_pv_visitor`",
    "ALTER TABLE `web_page_views` DROP INDEX `idx_visitor_journey`",
    "ALTER TABLE `web_page_views` DROP INDEX `idx_session_time`",

    // --- WEB EVENTS ---
    "ALTER TABLE `web_events` DROP INDEX `pv_idx`",
    "ALTER TABLE `web_events` DROP INDEX `idx_visitor_time`",
    "ALTER TABLE `web_events` DROP INDEX `idx_flood_control`",

    // --- COLLATION ---
    "ALTER TABLE `web_blacklist` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    "ALTER TABLE `zalo_message_queue` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    "ALTER TABLE `geoip_blocks` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
];

$results = [];
foreach ($commands as $sql) {
    try {
        $pdo->exec($sql);
        $results[] = [
            'sql' => $sql,
            'status' => 'SUCCESS'
        ];
    } catch (PDOException $e) {
        $results[] = [
            'sql' => $sql,
            'status' => 'SKIPPED/ERROR',
            'error' => $e->getMessage()
        ];
    }
}

// Final cleanup: Run DB Health Check to see the impact
echo json_encode([
    'success' => true,
    'message' => 'Optimization executed.',
    'execution_log' => $results,
    'next_steps' => 'Run /api/db_health_check.php to verify the size reduction.'
], JSON_PRETTY_PRINT);
