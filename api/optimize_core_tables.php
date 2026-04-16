<?php
require_once 'db_connect.php';

// Cấu hình giao diện HTML
echo "<!DOCTYPE html><html><head><title>DB Core Optimization</title>";
echo "<style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; background-color: #f8fafc; color: #334155; }
    h1 { color: #f59e0b; font-size: 24px; margin-bottom: 20px; text-align: center; }
    .log-entry { background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #10b981; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .log-entry.error { border-left-color: #ef4444; }
    .log-entry.info { border-left-color: #3b82f6; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #0f172a; }
</style></head><body>";
echo "<h1>⚡ Đang tối ưu hóa các Index Trọng Yếu</h1>";

$optimizations = [
    // 1. activity_buffer
    [
        'table' => 'activity_buffer',
        'queries' => [
            "ALTER TABLE `activity_buffer` ADD INDEX `idx_subscriber_id` (`subscriber_id`)",
            "ALTER TABLE `activity_buffer` ADD INDEX `idx_flow_id` (`flow_id`)"
        ]
    ],
    // 2. flow_event_queue
    [
        'table' => 'flow_event_queue',
        'queries' => [
            "ALTER TABLE `flow_event_queue` ADD INDEX `idx_target_id_type` (`target_id`, `type`)"
        ]
    ],
    // 3. campaigns
    [
        'table' => 'campaigns',
        'queries' => [
            "ALTER TABLE `campaigns` ADD INDEX `idx_camp_type` (`type`)",
            "ALTER TABLE `campaigns` ADD INDEX `idx_camp_created` (`created_at`)",
            "ALTER TABLE `campaigns` ADD INDEX `idx_camp_template` (`template_id`)"
        ]
    ],
    // 4. flow_enrollments
    [
        'table' => 'flow_enrollments',
        'queries' => [
            "ALTER TABLE `flow_enrollments` ADD INDEX `idx_current_step` (`current_step_id`)"
        ]
    ],
    // 5. subscriber_activity (Crucial for Segment Worker & Tracking Worker speed)
    [
        'table' => 'subscriber_activity',
        'queries' => [
            "ALTER TABLE `subscriber_activity` ADD INDEX `idx_subid_type_ref` (`subscriber_id`, `type`, `reference_id`)"
        ]
    ]
];

foreach ($optimizations as $opt) {
    echo "<h3>Bảng <code>{$opt['table']}</code></h3>";
    foreach ($opt['queries'] as $sql) {
        try {
            $pdo->exec($sql);
            echo "<div class='log-entry'>Thêm thành công: <code>$sql</code></div>";
        } catch (PDOException $e) {
            $msg = $e->getMessage();
            if (strpos($msg, 'Duplicate key name') !== false || strpos($msg, 'already exists') !== false) {
                echo "<div class='log-entry info'>Bỏ qua (Đã tồn tại): <code>$sql</code></div>";
            } elseif (strpos($msg, 'check that column/key exists') !== false || strpos($msg, 'Key column') !== false) {
                echo "<div class='log-entry error'>Lỗi cột không tồn tại (Có thể schema chưa có cột này): <code>$msg</code></div>";
            } else {
                echo "<div class='log-entry error'>Lỗi: <code>$msg</code></div>";
            }
        }
    }
}

echo "<h2 style='text-align: center; color: #10b981; margin-top: 30px;'>✔ Quá trình tối ưu hệ thống Database đã hoàn tất!</h2>";
echo "</body></html>";
?>
