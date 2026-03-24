<?php
// api/test_queue_fix.php - Test if queue system is now working
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

echo "========================================\n";
echo "QUEUE SYSTEM FIX VERIFICATION TEST\n";
echo "========================================\n\n";

// 1. Insert a test tracking job
echo "1. Inserting test tracking job...\n";
$testPayload = [
    'type' => 'open_email',
    'subscriber_id' => 'test_sub_fix_' . time(),
    'reference_id' => 'test_ref',
    'flow_id' => 'test_flow',
    'campaign_id' => 'test_campaign',
    'extra_data' => [
        'ip' => '127.0.0.1',
        'user_agent' => 'Test Script',
        'device_type' => 'desktop',
        'os' => 'Test OS',
        'browser' => 'Test Browser',
        'location' => 'Test Location'
    ]
];

try {
    $stmt = $pdo->prepare("INSERT INTO queue_jobs (queue, payload, status, available_at, created_at) VALUES (?, ?, 'pending', NOW(), NOW())");
    $stmt->execute(['stat_update', json_encode($testPayload)]);
    $jobId = $pdo->lastInsertId();
    echo "✓ Job inserted with ID: $jobId\n\n";
} catch (Exception $e) {
    die("✗ Failed to insert job: " . $e->getMessage() . "\n");
}

// 2. Manually trigger worker_queue.php
echo "2. Processing queue jobs...\n";
try {
    // Simulate worker execution
    ob_start();
    include 'worker_queue.php';
    $output = ob_get_clean();
    echo "Worker output: $output\n\n";
} catch (Exception $e) {
    echo "✗ Worker error: " . $e->getMessage() . "\n\n";
}

// 3. Check job status
echo "3. Checking job status...\n";
try {
    $stmt = $pdo->prepare("SELECT status, error_message, finished_at FROM queue_jobs WHERE id = ?");
    $stmt->execute([$jobId]);
    $job = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($job) {
        echo "Job Status: " . $job['status'] . "\n";
        if ($job['status'] === 'completed') {
            echo "✓ SUCCESS! Job processed successfully\n";
            echo "Finished at: " . $job['finished_at'] . "\n";
        } elseif ($job['status'] === 'failed') {
            echo "✗ FAILED! Error: " . $job['error_message'] . "\n";
        } else {
            echo "⚠ Job still in status: " . $job['status'] . "\n";
        }
    } else {
        echo "✗ Job not found!\n";
    }
} catch (Exception $e) {
    echo "✗ Error checking job: " . $e->getMessage() . "\n";
}

// 4. Check recent failed jobs
echo "\n4. Checking recent failed jobs (last 10)...\n";
try {
    $stmt = $pdo->query("SELECT id, queue, error_message, created_at FROM queue_jobs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10");
    $failedJobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($failedJobs)) {
        echo "✓ No recent failed jobs!\n";
    } else {
        echo "Found " . count($failedJobs) . " failed jobs:\n";
        foreach ($failedJobs as $job) {
            echo "  - ID {$job['id']} ({$job['queue']}): {$job['error_message']} at {$job['created_at']}\n";
        }
    }
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

// 5. Summary
echo "\n========================================\n";
echo "TEST SUMMARY\n";
echo "========================================\n";

try {
    $stmt = $pdo->query("
        SELECT 
            status,
            COUNT(*) as count
        FROM queue_jobs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        GROUP BY status
    ");
    $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "\nQueue Stats (Last 1 Hour):\n";
    foreach ($stats as $stat) {
        echo "  {$stat['status']}: {$stat['count']}\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n✓ Test completed!\n";
echo "========================================\n";
?>