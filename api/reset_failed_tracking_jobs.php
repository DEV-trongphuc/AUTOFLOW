<?php
require_once 'db_connect.php';

$stmt = $pdo->prepare("UPDATE queue_jobs SET status = 'pending', attempts = 0, error_message = NULL WHERE status = 'failed' AND (payload LIKE '%sync_web_journey%' OR payload LIKE '%enrich_subscriber%')");
$stmt->execute();
$count = $stmt->rowCount();

echo "Reset $count failed jobs to pending for reprocessing.\n";
