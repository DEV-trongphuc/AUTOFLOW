<?php
// api/verify_queue_fix.php - Quick verification test
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

echo "<pre>";
echo "========================================\n";
echo "QUEUE FIX VERIFICATION - ROUND 2\n";
echo "========================================\n\n";

// Clear old test jobs first
echo "0. Cleaning up old test jobs...\n";
try {
    $pdo->exec("DELETE FROM queue_jobs WHERE payload LIKE '%test_sub_fix_%' OR payload LIKE '%Test Script%'");
    echo "✓ Old test jobs cleared\n\n";
} catch (Exception $e) {
    echo "⚠ Warning: " . $e->getMessage() . "\n\n";
}

// Test 1: stat_update job
echo "1. Testing stat_update job (open_email)...\n";
$testPayload1 = [
    'type' => 'open_email',
    'subscriber_id' => 'test_sub_' . time(),
    'reference_id' => 'test_ref',
    'flow_id' => 'test_flow',
    'campaign_id' => 'test_campaign',
    'extra_data' => ['ip' => '127.0.0.1', 'user_agent' => 'Test']
];

try {
    $stmt = $pdo->prepare("INSERT INTO queue_jobs (queue, payload, status, available_at, created_at) VALUES (?, ?, 'pending', NOW(), NOW())");
    $stmt->execute(['stat_update', json_encode($testPayload1)]);
    $jobId1 = $pdo->lastInsertId();
    echo "  ✓ Job ID $jobId1 inserted\n";
} catch (Exception $e) {
    die("  ✗ Failed: " . $e->getMessage() . "\n");
}

// Test 2: unsubscribe job
echo "\n2. Testing unsubscribe job...\n";
$testPayload2 = [
    'subscriber_id' => 'test_sub_' . time(),
    'flow_id' => 'test_flow',
    'campaign_id' => 'test_campaign'
];

try {
    $stmt = $pdo->prepare("INSERT INTO queue_jobs (queue, payload, status, available_at, created_at) VALUES (?, ?, 'pending', NOW(), NOW())");
    $stmt->execute(['unsubscribe', json_encode($testPayload2)]);
    $jobId2 = $pdo->lastInsertId();
    echo "  ✓ Job ID $jobId2 inserted\n";
} catch (Exception $e) {
    die("  ✗ Failed: " . $e->getMessage() . "\n");
}

// Process jobs
echo "\n3. Processing jobs via worker...\n";
ob_start();
include 'worker_queue.php';
$output = ob_get_clean();
$result = json_decode($output, true);
echo "  Worker result: " . ($result['status'] ?? 'unknown') . "\n";
echo "  Jobs processed: " . ($result['processed'] ?? 0) . "\n";

// Check results
echo "\n4. Checking job results...\n";
$allPassed = true;

foreach ([$jobId1, $jobId2] as $idx => $jobId) {
    $stmt = $pdo->prepare("SELECT status, error_message FROM queue_jobs WHERE id = ?");
    $stmt->execute([$jobId]);
    $job = $stmt->fetch(PDO::FETCH_ASSOC);

    $jobName = ($idx == 0) ? "stat_update" : "unsubscribe";
    echo "  Job $jobId ($jobName): ";

    if ($job['status'] === 'completed') {
        echo "✅ PASSED\n";
    } else {
        echo "❌ FAILED - " . ($job['error_message'] ?? 'Unknown error') . "\n";
        $allPassed = false;
    }
}

// Summary
echo "\n========================================\n";
echo "FINAL RESULT\n";
echo "========================================\n";

if ($allPassed) {
    echo "✅ ALL TESTS PASSED!\n";
    echo "Queue system is now working correctly.\n\n";

    // Show queue stats
    $stmt = $pdo->query("
        SELECT status, COUNT(*) as count 
        FROM queue_jobs 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        GROUP BY status
    ");
    $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Queue Stats (Last Hour):\n";
    foreach ($stats as $stat) {
        echo "  {$stat['status']}: {$stat['count']}\n";
    }
} else {
    echo "❌ SOME TESTS FAILED\n";
    echo "Please check the error messages above.\n";
}

echo "\n✓ Verification complete!\n";
echo "========================================\n";
echo "</pre>";
?>