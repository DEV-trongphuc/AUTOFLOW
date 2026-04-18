<?php
require_once 'db_connect.php';
require_once 'web_tracking_processor.php';

// Increase limits for heavy processing
set_time_limit(0);
ignore_user_abort(true);
header('Content-Type: text/plain');

echo "--- STARTING URL MIGRATION & RECALCULATION ---\n";

try {
    // 1. Clean URLs in web_page_views
    // We do this in a transaction to ensure integrity
    $pdo->beginTransaction();

    echo "1. Cleaning URL query parameters in web_page_views...\n";

    // Update URLs: remove everything after '?' and recalculate hash
    $sqlClean = "
        UPDATE web_page_views 
        SET 
            url = SUBSTRING_INDEX(url, '?', 1),
            url_hash = MD5(SUBSTRING_INDEX(url, '?', 1))
        WHERE url LIKE '%?%'
    ";

    $stmt = $pdo->prepare($sqlClean);
    $stmt->execute();
    $rows = $stmt->rowCount();

    $pdo->commit();
    echo "   -> Updated URLs for $rows page views.\n";

    // 2. Clear Daily Stats (to force full regeneration)
    echo "2. Clearing old Daily Stats to prepare for fresh aggregation...\n";
    $pdo->exec("DELETE FROM web_daily_stats"); // Safer than TRUNCATE in some hosted envs

    // 3. Re-Aggregate
    echo "3. Re-aggregating Daily Stats from cleaned data...\n";

    // Get all dates that have data
    $stmtDates = $pdo->query("
        SELECT DISTINCT property_id, DATE(loaded_at) as log_date 
        FROM web_page_views 
        ORDER BY log_date ASC
    ");
    $tasks = $stmtDates->fetchAll(PDO::FETCH_ASSOC);
    $total = count($tasks);

    echo "   -> Found $total daily buckets to process.\n";

    $count = 0;
    foreach ($tasks as $task) {
        $pid = $task['property_id'];
        $date = $task['log_date'];

        // aggregateDailyStats is defined in web_tracking_processor.php
        $success = aggregateDailyStats($pdo, ['property_id' => $pid, 'date' => $date]);

        if ($success)
            $count++;

        if ($count % 10 == 0 || $count == $total) {
            echo "   -> Progress: $count / $total\r";
        }
    }

    echo "\n--- MIGRATION COMPLETE ---\n";
    echo "All URLs have been merged and stats recalculated.\n";

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "\nCRITICAL ERROR: " . $e->getMessage() . "\n";
}
?>