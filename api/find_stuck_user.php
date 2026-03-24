<?php
error_reporting(E_ALL);
require_once 'db_connect.php';

$stepId = '3ee6d9f1-ee1b-449e-80be-ca4ab6327645';

echo "=== FINDING STUCK SUBSCRIBER AT STEP 2 ===\n";
try {
    $stmt = $pdo->prepare("SELECT sfs.*, s.email FROM subscriber_flow_states sfs JOIN subscribers s ON sfs.subscriber_id = s.id WHERE TRIM(sfs.step_id) = ? AND sfs.status = 'completed' ORDER BY sfs.updated_at DESC LIMIT 5");
    $stmt->execute([trim($stepId)]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($results as $row) {
        echo "ID: " . $row['id'] . " | Email: " . $row['email'] . " | Updated: " . $row['updated_at'] . "\n";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
