<?php
// Quick diagnostic: Check why flow has 440 passed email step but only 439 completed
require_once __DIR__ . '/db_connect.php';
$flowId = $_GET['flow_id'] ?? '69dca73f0d951';

echo "<h2>Flow State Distribution: $flowId</h2>";

// 1. Status breakdown
$stmt = $pdo->prepare("SELECT status, COUNT(*) as cnt FROM subscriber_flow_states WHERE flow_id = ? GROUP BY status ORDER BY cnt DESC");
$stmt->execute([$flowId]);
echo "<h3>1. Status Breakdown</h3><table border='1' cellpadding='5'><tr><th>Status</th><th>Count</th></tr>";
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    echo "<tr><td><b>{$row['status']}</b></td><td>{$row['cnt']}</td></tr>";
}
echo "</table>";

// 2. Who is NOT completed (failed/unsubscribed/processing/waiting)
$stmt = $pdo->prepare("
    SELECT sfs.subscriber_id, sfs.status, sfs.step_id, sfs.last_error, sfs.updated_at,
           s.email
    FROM subscriber_flow_states sfs
    JOIN subscribers s ON sfs.subscriber_id = s.id
    WHERE sfs.flow_id = ? AND sfs.status NOT IN ('completed', 'unsubscribed')
    ORDER BY sfs.updated_at DESC LIMIT 20
");
$stmt->execute([$flowId]);
$nonCompleted = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<h3>2. Non-Completed Subscribers (Max 20)</h3>";
if (empty($nonCompleted)) {
    echo "<p style='color:green'>✅ All subscribers are completed or unsubscribed - stats mismatch only.</p>";
} else {
    echo "<table border='1' cellpadding='5'><tr><th>Email</th><th>Status</th><th>Step ID</th><th>Last Error</th><th>Updated</th></tr>";
    foreach ($nonCompleted as $r) {
        echo "<tr><td>{$r['email']}</td><td><b style='color:red'>{$r['status']}</b></td><td>{$r['step_id']}</td><td>{$r['last_error']}</td><td>{$r['updated_at']}</td></tr>";
    }
    echo "</table>";
}

// 3. Check stat_completed in flows table vs actual DB count
$stmt = $pdo->prepare("SELECT stat_completed FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$flowStat = $stmt->fetchColumn();

$stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'completed'");
$stmt->execute([$flowId]);
$actualCompleted = $stmt->fetchColumn();

echo "<h3>3. Stats Integrity Check</h3>";
echo "<table border='1' cellpadding='5'>";
echo "<tr><td>flows.stat_completed (cached)</td><td><b>$flowStat</b></td></tr>";
echo "<tr><td>subscriber_flow_states WHERE status='completed' (real)</td><td><b>$actualCompleted</b></td></tr>";
$diff = $flowStat - $actualCompleted;
$color = $diff == 0 ? 'green' : 'red';
echo "<tr><td>Difference</td><td><b style='color:$color'>$diff</b></td></tr>";
echo "</table>";
