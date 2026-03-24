<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "TEST ACTIVITY INSERT\n";
echo "====================\n\n";

try {
    $sid = 'c66905dcb4c1964953a63d36719e4d9b'; // A real SID from previous audit
    $cid = '6985cffc6c490';
    $type = 'test_insert';

    $stmt = $pdo->prepare("INSERT INTO subscriber_activity (subscriber_id, type, campaign_id, reference_name, details, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
    $res = $stmt->execute([$sid, $type, $cid, 'Test Manual', 'This is a test insertion']);

    if ($res) {
        echo "Successfully inserted test activity.\n";
        // Now delete it to keep it clean
        $pdo->prepare("DELETE FROM subscriber_activity WHERE type = 'test_insert'")->execute();
        echo "Deleted test activity.\n";
    } else {
        echo "Failed to insert test activity.\n";
        print_r($stmt->errorInfo());
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
