<?php
// api/check_recent_failures.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

echo "<pre>";
echo "================================================================================\n";
echo "RECENT QUEUE FAILURES ANALYSIS\n";
echo "================================================================================\n\n";

// Get all failed jobs from last 24 hours with details
$stmt = $pdo->query("
    SELECT id, queue, payload, error_message, created_at, finished_at
    FROM queue_jobs
    WHERE status = 'failed'
    AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    ORDER BY created_at DESC
");
$failedJobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Total Failed Jobs (Last 24h): " . count($failedJobs) . "\n\n";

if (empty($failedJobs)) {
    echo "✅ No failed jobs!\n";
} else {
    foreach ($failedJobs as $idx => $job) {
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "Job #" . ($idx + 1) . " (ID: {$job['id']})\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "Queue:        {$job['queue']}\n";
        echo "Error:        {$job['error_message']}\n";
        echo "Created:      {$job['created_at']}\n";
        echo "Finished:     {$job['finished_at']}\n";

        $payload = json_decode($job['payload'], true);
        echo "Payload:\n";
        echo json_encode($payload, JSON_PRETTY_PRINT) . "\n\n";
    }

    // Group by error type
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "ERROR SUMMARY\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

    $stmt = $pdo->query("
        SELECT queue, error_message, COUNT(*) as count,
               MIN(created_at) as first_occurrence,
               MAX(created_at) as last_occurrence
        FROM queue_jobs
        WHERE status = 'failed'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY queue, error_message
        ORDER BY count DESC
    ");
    $summary = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($summary as $error) {
        echo "Queue: {$error['queue']}\n";
        echo "Error: {$error['error_message']}\n";
        echo "Count: {$error['count']}\n";
        echo "First: {$error['first_occurrence']}\n";
        echo "Last:  {$error['last_occurrence']}\n\n";
    }
}

// Check recent successful jobs for comparison
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "RECENT SUCCESSFUL JOBS (for comparison)\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$stmt = $pdo->query("
    SELECT queue, COUNT(*) as count
    FROM queue_jobs
    WHERE status = 'completed'
    AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    GROUP BY queue
    ORDER BY count DESC
");
$successful = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($successful as $job) {
    echo "{$job['queue']}: {$job['count']} successful\n";
}

echo "\n================================================================================\n";
echo "</pre>";
?>