<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once 'db_connect.php';

$flowId = '6200f46f-7349-4fa2-a65d-889abe63c25d';

echo "=== CHECKING CURRENT FLOW STATES ===\n";
try {
    $stmt = $pdo->prepare("SELECT step_id, status, COUNT(*) as count FROM subscriber_flow_states WHERE flow_id = ? GROUP BY step_id, status");
    $stmt->execute([$flowId]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($results)) {
        echo "No states found for flow $flowId\n";
    } else {
        foreach ($results as $row) {
            echo "Step: [" . $row['step_id'] . "] | Status: " . $row['status'] . " | Count: " . $row['count'] . "\n";
        }
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
