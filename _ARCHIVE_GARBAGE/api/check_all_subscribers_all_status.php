<?php
// api/check_all_subscribers_all_status.php
// Check ALL subscribers in flow including failed, processing, etc.

ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once 'db_connect.php';

$flowId = $_GET['flow_id'] ?? '0e5c79b1-91f3-4dd3-8d5e-902781b022d3';

echo "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>All Subscribers - All Status</title>";
echo "<style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { background: white; padding: 20px; border-radius: 8px; max-width: 1600px; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
    th, td { padding: 6px; text-align: left; border: 1px solid #ddd; }
    th { background: #4CAF50; color: white; position: sticky; top: 0; }
    tr:nth-child(even) { background: #f9f9f9; }
    .status-waiting { background: #fff3cd; }
    .status-processing { background: #cfe2ff; }
    .status-completed { background: #d1e7dd; }
    .status-failed { background: #f8d7da; }
    .summary { background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
</style></head><body><div class='container'>";

echo "<h1>🔍 All Subscribers - All Status</h1>";
echo "<p>Time: " . date('Y-m-d H:i:s') . "</p>";

// Get flow info
$stmtFlow = $pdo->prepare("SELECT id, name FROM flows WHERE id = ?");
$stmtFlow->execute([$flowId]);
$flow = $stmtFlow->fetch(PDO::FETCH_ASSOC);

if (!$flow) {
    die("Flow not found!");
}

echo "<h2>Flow: {$flow['name']}</h2>";
echo "<p><small>ID: $flowId</small></p><hr>";

// Get ALL subscribers in ANY status
$stmtAll = $pdo->prepare("
    SELECT 
        sfs.id as queue_id,
        sfs.subscriber_id,
        s.email,
        sfs.step_id,
        sfs.status,
        sfs.scheduled_at,
        sfs.created_at,
        sfs.updated_at,
        sfs.last_error,
        TIMESTAMPDIFF(MINUTE, sfs.created_at, NOW()) as minutes_in_step,
        TIMESTAMPDIFF(MINUTE, sfs.updated_at, NOW()) as minutes_since_update
    FROM subscriber_flow_states sfs
    LEFT JOIN subscribers s ON s.id = sfs.subscriber_id
    WHERE sfs.flow_id = ?
    ORDER BY sfs.created_at DESC
    LIMIT 100
");
$stmtAll->execute([$flowId]);
$allSubs = $stmtAll->fetchAll(PDO::FETCH_ASSOC);

echo "<div class='summary'>";
echo "<h3>📊 Summary</h3>";

$statusCounts = [];
foreach ($allSubs as $sub) {
    $status = $sub['status'];
    $statusCounts[$status] = ($statusCounts[$status] ?? 0) + 1;
}

echo "<ul style='font-size: 14px;'>";
echo "<li><strong>Total Subscribers:</strong> " . count($allSubs) . "</li>";
foreach ($statusCounts as $status => $count) {
    $color = [
        'waiting' => 'orange',
        'processing' => 'blue',
        'completed' => 'green',
        'failed' => 'red'
    ][$status] ?? 'gray';
    echo "<li><strong>" . ucfirst($status) . ":</strong> <span style='color: $color; font-weight: bold;'>$count</span></li>";
}
echo "</ul>";
echo "</div>";

echo "<h3>📋 All Subscribers (Last 100)</h3>";
echo "<table>";
echo "<tr>
    <th>Queue ID</th>
    <th>Email</th>
    <th>Step ID</th>
    <th>Status</th>
    <th>Min in Step</th>
    <th>Min Since Update</th>
    <th>Scheduled At</th>
    <th>Created At</th>
    <th>Updated At</th>
    <th>Error</th>
</tr>";

foreach ($allSubs as $sub) {
    $rowClass = "status-" . strtolower($sub['status']);

    echo "<tr class='$rowClass'>";
    echo "<td><small>{$sub['queue_id']}</small></td>";
    echo "<td><strong>{$sub['email']}</strong></td>";
    echo "<td><small>{$sub['step_id']}</small></td>";
    echo "<td><strong>{$sub['status']}</strong></td>";
    echo "<td>{$sub['minutes_in_step']}m</td>";
    echo "<td>{$sub['minutes_since_update']}m</td>";
    echo "<td><small>" . ($sub['scheduled_at'] ?? '-') . "</small></td>";
    echo "<td><small>{$sub['created_at']}</small></td>";
    echo "<td><small>{$sub['updated_at']}</small></td>";
    echo "<td>" . ($sub['last_error'] ? "<span style='color: red;'>" . htmlspecialchars($sub['last_error']) . "</span>" : '-') . "</td>";
    echo "</tr>";
}

echo "</table>";

// Check recent enrollments
echo "<hr><h3>📥 Recent Flow Enrollments (Last 20)</h3>";
$stmtRecent = $pdo->prepare("
    SELECT 
        sfs.id,
        s.email,
        sfs.step_id,
        sfs.status,
        sfs.created_at
    FROM subscriber_flow_states sfs
    LEFT JOIN subscribers s ON s.id = sfs.subscriber_id
    WHERE sfs.flow_id = ?
    ORDER BY sfs.id DESC
    LIMIT 20
");
$stmtRecent->execute([$flowId]);
$recent = $stmtRecent->fetchAll(PDO::FETCH_ASSOC);

echo "<table>";
echo "<tr><th>ID</th><th>Email</th><th>Step ID</th><th>Status</th><th>Created At</th></tr>";
foreach ($recent as $r) {
    echo "<tr>";
    echo "<td>{$r['id']}</td>";
    echo "<td>{$r['email']}</td>";
    echo "<td><small>{$r['step_id']}</small></td>";
    echo "<td>{$r['status']}</td>";
    echo "<td>{$r['created_at']}</td>";
    echo "</tr>";
}
echo "</table>";

// Check if worker is running
echo "<hr><h3>🔧 Worker Status Check</h3>";
echo "<p>Checking if any subscribers are stuck in 'processing' for too long...</p>";

$stuckProcessing = array_filter($allSubs, function ($sub) {
    return $sub['status'] === 'processing' && $sub['minutes_since_update'] > 5;
});

if (empty($stuckProcessing)) {
    echo "<p style='color: green;'>✅ No stuck processing items found</p>";
} else {
    echo "<p style='color: red;'>❌ Found " . count($stuckProcessing) . " stuck in processing!</p>";
    echo "<p>This might indicate worker is not running or crashed.</p>";
}

echo "</div></body></html>";
?>