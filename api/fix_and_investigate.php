<?php
require_once 'db_connect.php';

header('Content-Type: text/plain');

echo "--- 1. DELETING YESTERDAY'S DATA ---\n";
$yesterday = date('Y-m-d', strtotime('-1 day'));
try {
    $pdo->beginTransaction();
    $pdo->prepare("DELETE FROM web_events WHERE DATE(created_at) = ?")->execute([$yesterday]);
    $pdo->prepare("DELETE FROM web_page_views WHERE DATE(loaded_at) = ?")->execute([$yesterday]);
    $pdo->prepare("DELETE FROM web_sessions WHERE DATE(started_at) = ?")->execute([$yesterday]);
    $pdo->prepare("DELETE FROM web_daily_stats WHERE date = ?")->execute([$yesterday]);
    $pdo->commit();
    echo "Deleted all data for $yesterday.\n\n";
} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    echo "Error deleting yesterday's data: " . $e->getMessage() . "\n\n";
}

echo "--- 2. INVESTIGATING TODAY'S STATS ---\n";
$today = date('Y-m-d');
try {
    $stmt = $pdo->prepare("
        SELECT id, visitor_id, started_at, last_active_at, duration_seconds 
        FROM web_sessions 
        WHERE DATE(started_at) = ? 
        ORDER BY duration_seconds DESC 
        LIMIT 10
    ");
    $stmt->execute([$today]);
    $sessions = $stmt->fetchAll();

    echo "Top 10 Longest Sessions Today:\n";
    foreach ($sessions as $s) {
        $mins = round($s['duration_seconds'] / 60, 2);
        echo "Session ID: {$s['id']} | Visitor: {$s['visitor_id']} | Duration: {$s['duration_seconds']}s ($mins mins) | Start: {$s['started_at']}\n";
    }

    $stmtTotal = $pdo->prepare("SELECT COUNT(*) as count, SUM(duration_seconds) as total_sec, AVG(duration_seconds) as avg_sec FROM web_sessions WHERE DATE(started_at) = ?");
    $stmtTotal->execute([$today]);
    $total = $stmtTotal->fetch();

    echo "\nSummary for Today:\n";
    echo "Total Sessions: {$total['count']}\n";
    echo "Total Duration: {$total['total_sec']}s\n";
    echo "Average Duration: " . round($total['avg_sec'] / 60, 2) . " mins\n";

} catch (Exception $e) {
    echo "Error investigating stats: " . $e->getMessage() . "\n";
}
?>