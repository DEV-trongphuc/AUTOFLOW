<?php
// api/test_async_mode.php - Test if async mode is working
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

echo "<pre>";
echo "================================================================================\n";
echo "ASYNC MODE TEST\n";
echo "================================================================================\n\n";

// 1. Check queue before
$stmt = $pdo->query("SELECT COUNT(*) FROM queue_jobs WHERE status = 'pending'");
$before = $stmt->fetchColumn();
echo "1. Pending jobs BEFORE test: $before\n\n";

// 2. Trigger a test tracking event
echo "2. Triggering test tracking event...\n";
$testUrl = "http://" . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . "/webhook.php?t=open&sid=test_async&fid=test_flow&cid=test_campaign&rid=test_ref";

$start = microtime(true);
$context = stream_context_create(['http' => ['timeout' => 5]]);
$response = @file_get_contents($testUrl, false, $context);
$time = (microtime(true) - $start) * 1000;

echo "   Response time: " . number_format($time, 2) . "ms\n\n";

// 3. Check queue after
sleep(1); // Wait a bit for queue insert
$stmt = $pdo->query("SELECT COUNT(*) FROM queue_jobs WHERE status = 'pending'");
$after = $stmt->fetchColumn();
echo "3. Pending jobs AFTER test: $after\n\n";

// 4. Check if job was created
$stmt = $pdo->query("
    SELECT id, queue, payload, status, created_at
    FROM queue_jobs
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 10 SECOND)
    ORDER BY created_at DESC
    LIMIT 1
");
$latestJob = $stmt->fetch(PDO::FETCH_ASSOC);

echo "4. Latest queue job:\n";
if ($latestJob) {
    echo "   ID: {$latestJob['id']}\n";
    echo "   Queue: {$latestJob['queue']}\n";
    echo "   Status: {$latestJob['status']}\n";
    echo "   Created: {$latestJob['created_at']}\n";
    $payload = json_decode($latestJob['payload'], true);
    echo "   Payload type: " . ($payload['type'] ?? 'N/A') . "\n";
    echo "   Subscriber: " . ($payload['subscriber_id'] ?? 'N/A') . "\n\n";
} else {
    echo "   No recent jobs found\n\n";
}

// 5. Analysis
echo "================================================================================\n";
echo "ANALYSIS\n";
echo "================================================================================\n\n";

if ($after > $before) {
    echo "✅ ASYNC MODE IS WORKING!\n\n";
    echo "Evidence:\n";
    echo "  - Job was queued (pending count increased from $before to $after)\n";
    echo "  - Response time: " . number_format($time, 2) . "ms\n";

    if ($time < 20) {
        echo "  - ✅ EXCELLENT: Response time < 20ms\n";
    } elseif ($time < 50) {
        echo "  - ✅ GOOD: Response time < 50ms\n";
    } else {
        echo "  - ⚠️ WARNING: Response time > 50ms (expected < 20ms)\n";
    }

    echo "\nNext steps:\n";
    echo "  1. Setup cron job to run worker_queue.php\n";
    echo "  2. Monitor queue depth (should stay < 1000)\n";
    echo "  3. Check worker logs for errors\n\n";

} else {
    echo "⚠️ SYNC FALLBACK WAS USED\n\n";
    echo "Possible reasons:\n";
    echo "  - Queue insert failed (check error logs)\n";
    echo "  - Database connection issue\n";
    echo "  - Code not updated on server\n\n";

    echo "Response time: " . number_format($time, 2) . "ms\n";
    if ($time > 50) {
        echo "  - This is expected for sync mode (50-100ms)\n";
    }

    echo "\nTroubleshooting:\n";
    echo "  1. Check if webhook.php was updated\n";
    echo "  2. Check database permissions for queue_jobs table\n";
    echo "  3. Check error logs for queue insert failures\n\n";
}

// 6. Queue health check
echo "================================================================================\n";
echo "QUEUE HEALTH CHECK\n";
echo "================================================================================\n\n";

$stmt = $pdo->query("
    SELECT status, COUNT(*) as count
    FROM queue_jobs
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    GROUP BY status
");
$stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Queue status (last 1 hour):\n";
foreach ($stats as $stat) {
    echo "  {$stat['status']}: {$stat['count']}\n";
}

$pending = array_filter($stats, fn($s) => $s['status'] === 'pending');
if (!empty($pending) && $pending[0]['count'] > 100) {
    echo "\n⚠️ WARNING: {$pending[0]['count']} pending jobs!\n";
    echo "   Worker may not be running or is too slow.\n";
    echo "   Setup cron job: * * * * * php /path/to/worker_queue.php\n";
}

echo "\n================================================================================\n";
echo "TEST COMPLETE\n";
echo "================================================================================\n";
echo "</pre>";
?>