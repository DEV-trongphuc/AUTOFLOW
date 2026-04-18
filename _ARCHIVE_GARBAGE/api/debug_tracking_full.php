<?php
// api/debug_tracking_full.php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once 'db_connect.php';

echo "--- 1. Testing Dispatch ---\n";
// Manually insert a job without triggering immediately to test insert
try {
    $payload = [
        'type' => 'stat_update',
        'subscriber_id' => 'debug_sub_1',
        'reference_id' => 'debug_ref_1',
        'flow_id' => 'debug_flow_1',
        'campaign_id' => 'debug_camp_1',
        'extra_data' => ['ip' => '127.0.0.1', 'user_agent' => 'DebugScript']
    ];
    $queue = 'stat_update';

    // We call the RAW insert to avoid triggering the worker for a moment
    $stmt = $pdo->prepare("INSERT INTO queue_jobs (queue, payload, status, available_at, created_at) VALUES (?, ?, 'pending', NOW(), NOW())");
    $stmt->execute([$queue, json_encode($payload)]);
    $jobId = $pdo->lastInsertId();
    echo "Job Inserted ID: $jobId\n";

} catch (Exception $e) {
    die("Insert Failed: " . $e->getMessage());
}

echo "\n--- 2. Testing Worker Execution (Simulated) ---\n";
// Now we verify if the worker CAN process it
try {
    $stmt = $pdo->prepare("SELECT * FROM queue_jobs WHERE id = ?");
    $stmt->execute([$jobId]);
    $job = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$job)
        die("Job not found after insert!\n");

    echo "Job found in queue. Processing logic...\n";

    // Simulate what worker_queue.php does
    require_once 'worker_queue.php';
    echo "Worker run complete.\n";

    // Check status
    $stmt = $pdo->prepare("SELECT status, error_message FROM queue_jobs WHERE id = ?");
    $stmt->execute([$jobId]);
    $jobPost = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Job Final Status: " . $jobPost['status'] . "\n";
    if ($jobPost['status'] === 'failed') {
        echo "Error: " . $jobPost['error_message'] . "\n";
    }

} catch (Exception $e) {
    die("Worker Simulation Failed: " . $e->getMessage());
}

echo "\n--- 3. Testing Activity Log Insert ---\n";
// Check if it actually wrote to subscriber_activity
// Note: our payload had fake IDs, so it might have failed foreign keys?
// worker_queue.php uses logActivity in flow_helpers.php which does INSERT.
// If foreign keys are strict, it would fail. Let's check error log.

$hasError = false;
if (file_exists('worker_error.log')) {
    echo "Worker Error Log Content:\n";
    echo file_get_contents('worker_error.log');
    $hasError = true;
}

if (!$hasError && $jobPost['status'] === 'completed') {
    echo "SUCCESS: Job processed without catching error.\n";
    echo "Note: If Foreign Keys exist, the INSERT might have failed silently in logActivity try/catch block.\n";
}
?>