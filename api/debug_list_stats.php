<?php
require_once 'db_connect.php';

// Replace with your actual list ID
$listId = '695c1d36e803f'; // Data Topup list ID from your screenshot

echo "=== DEBUGGING LIST STATS ===\n\n";
echo "List ID: $listId\n\n";

// Get total count from list table
$stmt = $pdo->prepare("SELECT name, subscriber_count FROM lists WHERE id = ?");
$stmt->execute([$listId]);
$listInfo = $stmt->fetch();
echo "List Name: {$listInfo['name']}\n";
echo "Subscriber Count (from lists table): {$listInfo['subscriber_count']}\n\n";

// Get actual count from subscriber_lists
$stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_lists WHERE list_id = ?");
$stmt->execute([$listId]);
$actualCount = $stmt->fetchColumn();
echo "Actual Count (from subscriber_lists): $actualCount\n\n";

// Get count by status
echo "=== BREAKDOWN BY STATUS ===\n";
$sql = "SELECT s.status, COUNT(*) as count 
        FROM subscriber_lists sl 
        JOIN subscribers s ON sl.subscriber_id = s.id 
        WHERE sl.list_id = ? 
        GROUP BY s.status 
        ORDER BY count DESC";
$stmt = $pdo->prepare($sql);
$stmt->execute([$listId]);
$stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

$totalFromStats = 0;
foreach ($stats as $stat) {
    echo "  {$stat['status']}: {$stat['count']}\n";
    $totalFromStats += $stat['count'];
}

echo "\nTotal from stats: $totalFromStats\n";
echo "Difference: " . ($listInfo['subscriber_count'] - $totalFromStats) . "\n";

// Check for orphaned records (subscribers in list but not in subscribers table)
$stmt = $pdo->prepare("
    SELECT COUNT(*) 
    FROM subscriber_lists sl 
    LEFT JOIN subscribers s ON sl.subscriber_id = s.id 
    WHERE sl.list_id = ? AND s.id IS NULL
");
$stmt->execute([$listId]);
$orphaned = $stmt->fetchColumn();
echo "\nOrphaned records (in list but subscriber deleted): $orphaned\n";

echo "\n=== DONE ===\n";
