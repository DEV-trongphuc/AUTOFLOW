<?php
require_once 'db_connect.php';
$email = 'thucle75@gmail.com';
echo "<pre>";
echo "--- Activity Buffer Check for $email ---\n";

$stmtSub = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
$stmtSub->execute([$email]);
$subId = $stmtSub->fetchColumn();

if (!$subId) {
    echo "Subscriber not found.\n";
    exit;
}

echo "Sub ID: $subId\n\n";

echo "Check activity_buffer (Specific Sub):\n";
try {
    $stmt = $pdo->prepare("SELECT * FROM activity_buffer WHERE subscriber_id = ? ORDER BY created_at DESC");
    $stmt->execute([$subId]);
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Table activity_buffer might not exist or error: " . $e->getMessage() . "\n";
}

echo "\nTotal pending activity logs:\n";
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM activity_buffer");
    echo $stmt->fetchColumn() . "\n";
} catch (Exception $e) { /* ignore */
}

echo "\nCheck stats_update_buffer count:\n";
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM stats_update_buffer WHERE processed = 0");
    echo "Total pending stats: " . $stmt->fetchColumn() . "\n";
} catch (Exception $e) {
    echo "Table stats_update_buffer might not exist or error: " . $e->getMessage() . "\n";
}

echo "</pre>";
?>