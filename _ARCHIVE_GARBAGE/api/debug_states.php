<?php
require 'db_connect.php';

try {
    echo "--- SUBSCRIBER FLOW STATES SUMMARY ---\n";
    $stmt = $pdo->query("SELECT flow_id, step_id, status, COUNT(*) as cnt, MIN(scheduled_at) as next_run FROM subscriber_flow_states GROUP BY flow_id, step_id, status ORDER BY flow_id, status");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as $r) {
        echo "Flow: {$r['flow_id']} | Step: {$r['step_id']} | Status: {$r['status']} | Count: {$r['cnt']} | Next: {$r['next_run']}\n";
    }

    echo "\n--- BY FLOW NAME ---\n";
    $stmt2 = $pdo->query("SELECT f.name, sfs.step_id, sfs.status, COUNT(*) as cnt FROM subscriber_flow_states sfs JOIN flows f ON f.id = sfs.flow_id GROUP BY f.id, sfs.step_id, sfs.status");
    foreach ($stmt2->fetchAll(PDO::FETCH_ASSOC) as $r) {
        echo "Flow: {$r['name']} | Step: {$r['step_id']} | Status: {$r['status']} | Count: {$r['cnt']}\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
