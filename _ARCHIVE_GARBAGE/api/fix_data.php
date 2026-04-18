<?php
// api/fix_data.php - FULL REPAIR
// Access: https://automation.ideas.edu.vn/mail_api/fix_data.php

ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once 'db_connect.php';
require_once 'web_tracking_processor.php';

set_time_limit(0);
ignore_user_abort(true);
header('Content-Type: text/plain; charset=utf-8');

echo "STARTING DEEP DATA REPAIR...\n";

// 1. RECALCULATE PAGE_COUNTS
echo "\n1. Recalculating page_count for sessions from web_page_views...\n";
$sqlFixCounts = "
    UPDATE web_sessions s
    JOIN (
        SELECT session_id, COUNT(*) as actual_count 
        FROM web_page_views 
        GROUP BY session_id
    ) pv ON s.id = pv.session_id
    SET s.page_count = pv.actual_count
    WHERE s.page_count != pv.actual_count
";
$stmt = $pdo->query($sqlFixCounts);
echo "Updated page_count for " . $stmt->rowCount() . " sessions.\n";

// 2. FIX 0 PAGE COUNT (Orphans) -> Set to 1 if bounce logic implies it or just leave it
// Actually, if page_count is 0, it means no page views found. 
// Let's ensure bounce flag is correct for updated counts.

echo "\n2. Fixing is_bounce flags...\n";
// Default strict: Single page = Bounce
$stmt1 = $pdo->query("UPDATE web_sessions SET is_bounce = 1 WHERE page_count = 1");
echo "Set is_bounce=1 for " . $stmt1->rowCount() . " sessions (Base).\n";

// Multi-page = Not Bounce
$stmt2 = $pdo->query("UPDATE web_sessions SET is_bounce = 0 WHERE page_count > 1");
echo "Set is_bounce=0 for " . $stmt2->rowCount() . " sessions (Multi-page).\n";

// Single-page but Interactive = Not Bounce
$stmt3 = $pdo->query("
    UPDATE web_sessions s 
    JOIN (
        SELECT DISTINCT session_id 
        FROM web_events 
        WHERE event_type IN ('click', 'form', 'submit')
    ) e ON s.id = e.session_id 
    SET s.is_bounce = 0 
    WHERE s.page_count = 1
");
echo "Set is_bounce=0 for " . $stmt3->rowCount() . " sessions (Interactive).\n";

// 3. RE-AGGREGATE
echo "\n3. Re-aggregating Global & URL Stats...\n";

$stmtProps = $pdo->query("SELECT DISTINCT property_id FROM web_page_views");
$properties = $stmtProps->fetchAll(PDO::FETCH_COLUMN);

$totalProcessed = 0;
foreach ($properties as $propertyId) {
    if (!$propertyId)
        continue;
    echo "\nProcessing Property: $propertyId\n";

    $stmtDates = $pdo->prepare("SELECT DISTINCT DATE(loaded_at) FROM web_page_views WHERE property_id = ? ORDER BY 1");
    $stmtDates->execute([$propertyId]);
    $dates = $stmtDates->fetchAll(PDO::FETCH_COLUMN);

    foreach ($dates as $date) {
        if (!$date)
            continue;
        echo "  Date $date... ";
        $success = aggregateDailyStats($pdo, ['property_id' => $propertyId, 'date' => $date]);
        echo $success ? "OK\n" : "FAIL\n";
        $totalProcessed++;

        if ($totalProcessed % 5 == 0) {
            if (ob_get_level() > 0)
                ob_flush();
            flush();
        }
    }
}

echo "\nDONE! Processed $totalProcessed daily batches.\n";
