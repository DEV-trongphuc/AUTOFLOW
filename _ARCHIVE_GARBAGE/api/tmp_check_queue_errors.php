<?php
require_once 'db_connect.php';
$stmt = $pdo->query("SELECT error_message, COUNT(*) as count FROM queue_jobs WHERE status = 'failed' GROUP BY error_message ORDER BY count DESC LIMIT 10");
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo $r['count'] . " jobs: " . ($r['error_message'] ?: 'NULL') . "\n";
}
