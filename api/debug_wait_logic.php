<?php
// debug_wait_logic.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Path Fix
if (file_exists('db_connect.php')) {
    require 'db_connect.php';
} elseif (file_exists('api/db_connect.php')) {
    require 'api/db_connect.php';
} else {
    // Last resort manual connection if includes fail
    $host = 'localhost';
    $db = 'mailflow_new';
    $user = 'mailflow_new';
    $pass = 'E7JbXXY2rDBMa25s';
    $charset = 'utf8mb4';
    $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
    try {
        $pdo = new PDO($dsn, $user, $pass);
    } catch (\PDOException $e) {
        die("Connection failed: " . $e->getMessage());
    }
}

echo "<h2>Waiting State Diagnosis</h2>";

try {
    // 1. Fetch items currently waiting
    $stmt = $pdo->prepare("
        SELECT q.id, q.subscriber_id, q.status, q.scheduled_at, q.step_id, f.steps, q.updated_at
        FROM subscriber_flow_states q
        JOIN flows f ON q.flow_id = f.id
        WHERE q.status = 'waiting'
        ORDER BY q.updated_at DESC
        LIMIT 5
    ");
    $stmt->execute();
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($items)) {
        echo "No items currently waiting.";
        exit;
    }

    foreach ($items as $item) {
        echo "<div style='border:1px solid #ccc; padding:10px; margin-bottom:10px;'>";
        echo "<strong>Queue ID:</strong> {$item['id']} | <strong>Sub ID:</strong> {$item['subscriber_id']} | <strong>Status:</strong> {$item['status']}<br>";
        echo "<strong>Scheduled At:</strong> {$item['scheduled_at']} (Now: " . date('Y-m-d H:i:s') . ")<br>";
        echo "<strong>Current Step ID:</strong> {$item['step_id']}<br>";

        $steps = json_decode($item['steps'], true);
        $currentStep = null;
        if (is_array($steps)) {
            foreach ($steps as $s) {
                if (($s['id'] ?? '') === $item['step_id']) {
                    $currentStep = $s;
                    break;
                }
            }
        }

        if ($currentStep) {
            echo "<strong>Step Type:</strong> " . ($currentStep['type'] ?? 'N/A') . "<br>";
            echo "<strong>Step Config:</strong> <pre>" . json_encode($currentStep['config'] ?? [], JSON_PRETTY_PRINT) . "</pre>";

            // Simulate Logic
            $now = date('Y-m-d H:i:s');
            $mode = $currentStep['config']['mode'] ?? 'duration';
            echo "<strong>Simulated Logic (Mode: $mode):</strong><br>";

            if ($mode === 'until_date') {
                $specDate = $currentStep['config']['specificDate'] ?? '';
                $targetTime = $currentStep['config']['untilTime'] ?? '09:00';
                $nextSchedule = $specDate . ' ' . $targetTime . ':00';
                echo "-> Target: $nextSchedule <br>";
                if ($nextSchedule <= $now) {
                    echo "-> <span style='color:green'>SHOULD PASS (Target <= Now)</span>";
                } else {
                    echo "-> <span style='color:red'>SHOULD WAIT (Target > Now)</span>";
                }
            } elseif ($mode === 'duration') {
                $dur = (int) ($currentStep['config']['duration'] ?? 1);
                $unit = $currentStep['config']['unit'] ?? 'hours';
                echo "-> Duration Wait: $dur $unit<br>";
            } else {
                echo "-> Other mode logic<br>";
            }

        } else {
            echo "<span style='color:red'>Step Definition Not Found for ID: {$item['step_id']}</span>";
        }
        echo "</div>";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
