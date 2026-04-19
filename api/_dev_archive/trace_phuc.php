<?php
// api/trace_phuc.php
require_once 'db_connect.php';

echo "<pre>--- TRACING SUBSCRIBER: phucht@ideas.edu.vn --- \n";

try {
    $email = 'phucht@ideas.edu.vn';
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

    // 1. Get Subscriber ID
    $stmt = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
    $stmt->execute([$email]);
    $sid = $stmt->fetchColumn();

    if (!$sid) {
        die("Subscriber not found: $email");
    }
    echo "Subscriber ID: $sid\n";

    // 2. Check Flow State
    $stmtState = $pdo->prepare("SELECT * FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ?");
    $stmtState->execute([$sid, $fid]);
    $state = $stmtState->fetch(PDO::FETCH_ASSOC);

    echo "\nCURRENT FLOW STATE:\n";
    print_r($state);

    // 3. Check Activity Logs
    $stmtLogs = $pdo->prepare("SELECT type, reference_id, reference_name, details, created_at FROM subscriber_activity WHERE subscriber_id = ? AND flow_id = ? ORDER BY created_at ASC");
    $stmtLogs->execute([$sid, $fid]);
    $logs = $stmtLogs->fetchAll(PDO::FETCH_ASSOC);

    echo "\nACTIVITY LOGS:\n";
    print_r($logs);

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
