<?php
// api/backfill_stats.php - One-time migration to populate web_daily_stats from historical data
require_once 'db_connect.php';
require_once 'web_tracking_processor.php';

set_time_limit(0); // Allow long execution
ignore_user_abort(true);

echo "Starting historical data aggregation...\n";

// 1. Get all unique properties and dates currently in the RAW logs
$stmt = $pdo->query("
    SELECT DISTINCT property_id, DATE(loaded_at) as log_date 
    FROM web_page_views 
    ORDER BY log_date ASC
");
$tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

$count = 0;
foreach ($tasks as $task) {
    echo "Aggregating Property: {$task['property_id']} for Date: {$task['log_date']}...\n";

    // Use the same function that the worker uses
    $success = aggregateDailyStats($pdo, [
        'property_id' => $task['property_id'],
        'date' => $task['log_date']
    ]);

    if ($success)
        $count++;
}

echo "\nDone! Processed $count days of data across all properties.";
