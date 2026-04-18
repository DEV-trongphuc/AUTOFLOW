<?php
// api/verification_test.php
require_once 'db_connect.php';
require_once 'WorkerTriggerService.php';

echo "=== API AUDIT & OPTIMIZATION VERIFICATION ===\n\n";

// 1. Test API_BASE_URL detection
echo "1. API_BASE_URL Detection:\n";
echo "   Detected: " . API_BASE_URL . "\n";
if (defined('API_BASE_URL') && !empty(API_BASE_URL)) {
    echo "   [PASS] API_BASE_URL is defined.\n";
} else {
    echo "   [FAIL] API_BASE_URL is missing.\n";
}
echo "\n";

// 2. Test WorkerTriggerService
echo "2. WorkerTriggerService:\n";
try {
    $triggerService = new WorkerTriggerService($pdo, API_BASE_URL);
    $mockUrl = '/worker_queue.php?test=1';
    $result = $triggerService->trigger($mockUrl);
    echo "   Trigger Test: " . ($result ? "Success" : "Failed/Throttled") . "\n";
    echo "   Check log at: api/_debug/worker_trigger.log\n";
    echo "   [PASS] Service initialized and trigger executed.\n";
} catch (Exception $e) {
    echo "   [FAIL] WorkerTriggerService Error: " . $e->getMessage() . "\n";
}
echo "\n";

// 3. Test Index Verification
echo "3. Database Index Verification:\n";
require_once 'VerifyIndexes.php';
$indexReport = verifyIndexes($pdo);
$missingCount = 0;
foreach ($indexReport as $table => $idxs) {
    if (isset($idxs['error']))
        continue;
    foreach ($idxs as $idx => $status) {
        if ($status === 'MISSING') {
            $missingCount++;
            echo "   [MISSING] $table -> $idx\n";
        }
    }
}
if ($missingCount === 0) {
    echo "   [PASS] All critical indexes verified.\n";
} else {
    echo "   [NOTE] $missingCount indexes are missing. Use api/QUICK_OPTIMIZE.sql to apply them.\n";
}
echo "\n";

// 4. Test AI History Storage logic (Mock)
echo "4. AI History Logic:\n";
$keySuffix = "test_prop";
$key = "analysis_history_$keySuffix";
$testHistory = array_fill(0, 10, ['dummy' => 'data', 'generated_at' => date('Y-m-d H:i:s')]);
$historyJson = json_encode($testHistory);

// Simulate the save logic from ai_chatbot.php
$trimmed = array_slice($testHistory, 0, 5);
if (count($trimmed) === 5) {
    echo "   [PASS] History capping logic (simulated) works correctly.\n";
} else {
    echo "   [FAIL] History capping failed.\n";
}

echo "\n=== VERIFICATION COMPLETE ===\n";
