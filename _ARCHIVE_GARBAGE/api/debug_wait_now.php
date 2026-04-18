<?php
// api/debug_wait_now.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Using correct relative path for db_connect inside /api folder
require_once 'db_connect.php';

date_default_timezone_set('Asia/Ho_Chi_Minh');

$queueId = 171;

echo "<h2>Debug Wait Item (Queue 171)</h2>";
echo "Server Time: " . date('Y-m-d H:i:s') . "<br>";
echo "Timestamp: " . time() . "<br><hr>";

try {
    $stmt = $pdo->prepare("SELECT * FROM subscriber_flow_states WHERE id = ?");
    $stmt->execute([$queueId]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$item) {
        // Try finding ANY waiting item
        $stmt = $pdo->query("SELECT * FROM subscriber_flow_states WHERE status='waiting' LIMIT 1");
        $item = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($item)
            echo "Found another waiting item (ID: {$item['id']})<br>";
    }

    if ($item) {
        echo "Item ID: {$item['id']}<br>";
        echo "Status: {$item['status']}<br>";
        echo "Scheduled At: {$item['scheduled_at']}<br>";
        echo "Step ID: {$item['step_id']}<br>";

        // Fetch Flow Steps
        $stmtFlow = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
        $stmtFlow->execute([$item['flow_id']]);
        $flow = $stmtFlow->fetch(PDO::FETCH_ASSOC);

        // Fix potential JSON decode error
        $steps = json_decode($flow['steps'], true);
        if (!is_array($steps)) {
            echo "Error decoding flow steps JSON.";
            exit;
        }

        $currentStep = null;
        foreach ($steps as $s) {
            if (($s['id'] ?? '') === $item['step_id']) {
                $currentStep = $s;
                break;
            }
        }

        if ($currentStep) {
            echo "<h3>Step Config</h3>";
            echo "<pre>" . json_encode($currentStep['config'], JSON_PRETTY_PRINT) . "</pre>";

            // TEST LOGIC
            $mode = $currentStep['config']['mode'] ?? 'duration';
            echo "Mode: $mode<br>";

            if ($mode === 'until_date') {
                $specDate = $currentStep['config']['specificDate'] ?? '';
                $targetTime = $currentStep['config']['untilTime'] ?? '09:00';

                // Ensure format is correct/robust
                if (!$specDate)
                    $targetStr = "INVALID_DATE";
                else
                    $targetStr = $specDate . ' ' . $targetTime . ':00';

                $targetTs = strtotime($targetStr);

                echo "Target Str: '$targetStr'<br>";
                echo "Target TS: " . ($targetTs ?: 'FALSE') . "<br>";
                echo "Current TS: " . time() . "<br>";

                if ($targetTs && $targetTs <= time()) {
                    echo "<strong style='color:green'>PASS: Target has passed. Should move Next.</strong>";
                } else {
                    echo "<strong style='color:red'>WAIT: Target is in future or Invalid. Diff: " . ($targetTs - time()) . "s</strong>";
                }
            }
        } else {
            echo "Step ID not found in flow definition.";
        }
    } else {
        echo "No waiting items found.";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
