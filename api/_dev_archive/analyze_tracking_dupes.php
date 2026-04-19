<?php
require 'db_connect.php';

$types = ['open_email', 'click_link', 'zalo_clicked'];
$placeholders = implode(',', array_fill(0, count($types), '?'));

// Find duplicates (same subscriber, same type, same reference, exactly same timestamp down to the minute)
// We group by UNIX_TIMESTAMP(created_at) DIV 60 to group into 1-minute buckets
$sql = "
    SELECT 
        subscriber_id, 
        type, 
        reference_id, 
        FLOOR(UNIX_TIMESTAMP(created_at) / 60) as minute_bucket,
        COUNT(*) as cnt,
        MIN(id) as keep_id,
        GROUP_CONCAT(id ORDER BY id ASC) as all_ids
    FROM subscriber_activity
    WHERE type IN ($placeholders)
    GROUP BY subscriber_id, type, reference_id, minute_bucket
    HAVING cnt > 1
";

$stmt = $pdo->prepare($sql);
$stmt->execute($types);
$dupes = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($dupes) . " sets of duplicate tracking logs.\n";

$totalToDelete = 0;
foreach ($dupes as $d) {
    echo "- Sub: {$d['subscriber_id']}, Type: {$d['type']}, Cnt: {$d['cnt']}, IDs: {$d['all_ids']}\n";
    $totalToDelete += ($d['cnt'] - 1);
}

echo "Total duplicate rows to delete: $totalToDelete\n";
