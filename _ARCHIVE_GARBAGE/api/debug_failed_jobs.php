<?php
require_once 'db_connect.php';
$stmt = $pdo->query("SELECT * FROM queue_jobs WHERE status = 'failed' LIMIT 5");
$failedJobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "FAILING JOBS SAMPLES:\n";
foreach ($failedJobs as $job) {
    echo "ID: " . $job['id'] . "\n";
    echo "Queue: " . $job['queue'] . "\n";
    echo "Payload: " . $job['payload'] . "\n";
    echo "Attempts: " . $job['attempts'] . "\n";
    echo "Error: " . ($job['error_message'] ?? 'NULL') . "\n";
    echo "Available At: " . $job['available_at'] . "\n";
    echo "Finished At: " . $job['finished_at'] . "\n";
    echo "-----------------------------------\n";
}
