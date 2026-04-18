<?php
require_once 'db_connect.php';

$yesterday = date('Y-m-d', strtotime('-1 day'));
echo "Deleting all web tracking data for: $yesterday\n";

try {
    $pdo->beginTransaction();

    // 1. Delete events from yesterday
    $stmt1 = $pdo->prepare("DELETE FROM web_events WHERE DATE(created_at) = ?");
    $stmt1->execute([$yesterday]);
    echo "Deleted " . $stmt1->rowCount() . " events.\n";

    // 2. Delete page views from yesterday
    $stmt2 = $pdo->prepare("DELETE FROM web_page_views WHERE DATE(loaded_at) = ?");
    $stmt2->execute([$yesterday]);
    echo "Deleted " . $stmt2->rowCount() . " page views.\n";

    // 3. Delete sessions from yesterday
    $stmt3 = $pdo->prepare("DELETE FROM web_sessions WHERE DATE(started_at) = ?");
    $stmt3->execute([$yesterday]);
    echo "Deleted " . $stmt3->rowCount() . " sessions.\n";

    // 4. Delete daily stats from yesterday
    $stmt4 = $pdo->prepare("DELETE FROM web_daily_stats WHERE date = ?");
    $stmt4->execute([$yesterday]);
    echo "Deleted " . $stmt4->rowCount() . " daily stats.\n";

    // 5. Delete visitors who ONLY visited yesterday (optional, but cleaner for "xóa mọi dữ liệu")
    // If a visitor has sessions on other days, we keep them.
    $stmt5 = $pdo->prepare("DELETE FROM web_visitors WHERE DATE(first_visit_at) = ? AND id NOT IN (SELECT DISTINCT visitor_id FROM web_sessions)");
    $stmt5->execute([$yesterday]);
    echo "Deleted " . $stmt5->rowCount() . " unique visitors from yesterday.\n";

    $pdo->commit();
    echo "Cleanup complete.\n";

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
}
?>