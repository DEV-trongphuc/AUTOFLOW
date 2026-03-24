<?php
// api/check_all_flow_subscribers.php
// Check ALL subscribers in a specific flow (all statuses)

ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once 'db_connect.php';

$flowId = $_GET['flow_id'] ?? '0e5c79b1-91f3-4dd3-8d5e-902781b022d3'; // Default to "Gia nhập Danh sách"

echo "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>All Subscribers in Flow</title>";
echo "<style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { background: white; padding: 20px; border-radius: 8px; max-width: 1400px; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
    th { background: #4CAF50; color: white; position: sticky; top: 0; }
    tr:nth-child(even) { background: #f9f9f9; }
    .status-waiting { background: #fff3cd; }
    .status-processing { background: #cfe2ff; }
    .status-completed { background: #d1e7dd; }
    .status-failed { background: #f8d7da; }
    .summary { background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
</style></head><body><div class='container'>";

echo "<h1>🔍 All Subscribers in Flow</h1>";
echo "<p>Time: " . date('Y-m-d H:i:s') . "</p>";

// Get flow info
$stmtFlow = $pdo->prepare("SELECT id, name, steps FROM flows WHERE id = ?");
$stmtFlow->execute([$flowId]);
$flow = $stmtFlow->fetch(PDO::FETCH_ASSOC);

if (!$flow) {
    die("Flow not found!");
}

echo "<h2>Flow: {$flow['name']}</h2>";
echo "<p><small>ID: $flowId</small></p>";

$steps = json_decode($flow['steps'], true) ?: [];

// Get ALL subscribers ever in this flow
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
        TIMESTAMPDIFF(HOUR, sfs.created_at, NOW()) as hours_in_step
    FROM subscriber_flow_states sfs
    LEFT JOIN subscribers s ON s.id = sfs.subscriber_id
    WHERE sfs.flow_id = ?
    ORDER BY sfs.created_at DESC
");
$stmtAll->execute([$flowId]);
$allSubs = $stmtAll->fetchAll(PDO::FETCH_ASSOC);

echo "<div class='summary'>";
echo "<h3>📊 Summary</h3>";

// Count by status
$statusCounts = [];
foreach ($allSubs as $sub) {
    $status = $sub['status'];
    $statusCounts[$status] = ($statusCounts[$status] ?? 0) + 1;
}

echo "<ul style='font-size: 16px;'>";
echo "<li><strong>Total Subscribers:</strong> " . count($allSubs) . "</li>";
foreach ($statusCounts as $status => $count) {
    $color = [
        'waiting' => 'orange',
        'processing' => 'blue',
        'completed' => 'green',
        'failed' => 'red'
    ][$status] ?? 'gray';
    echo "<li><strong>" . ucfirst($status) . ":</strong> <span style='color: $color;'>$count</span></li>";
}
echo "</ul>";
echo "</div>";

// Count by step
echo "<div class='summary'>";
echo "<h3>📍 Subscribers by Step</h3>";
$stepCounts = [];
foreach ($allSubs as $sub) {
    $stepId = $sub['step_id'];
    $stepCounts[$stepId] = ($stepCounts[$stepId] ?? 0) + 1;
}

echo "<ul>";
foreach ($stepCounts as $stepId => $count) {
    $stepInfo = "Unknown";
    foreach ($steps as $step) {
        if ($step['id'] === $stepId) {
            $stepInfo = $step['label'] . " (" . $step['type'] . ")";
            break;
        }
    }
    echo "<li><strong>$stepInfo:</strong> $count subscribers</li>";
}
echo "</ul>";
echo "</div>";

echo "<h3>📋 All Subscribers Details</h3>";
echo "<table>";
echo "<tr>
    <th>Email</th>
    <th>Step</th>
    <th>Status</th>
    <th>Hours in Step</th>
    <th>Scheduled At</th>
    <th>Created At</th>
    <th>Updated At</th>
    <th>Error</th>
</tr>";

foreach ($allSubs as $sub) {
    // Find step info
    $stepInfo = "Unknown";
    foreach ($steps as $step) {
        if ($step['id'] === $sub['step_id']) {
            $stepInfo = $step['label'] . " (" . $step['type'] . ")";
            break;
        }
    }

    $rowClass = "status-" . strtolower($sub['status']);

    echo "<tr class='$rowClass'>";
    echo "<td>{$sub['email']}</td>";
    echo "<td><small>$stepInfo</small></td>";
    echo "<td><strong>{$sub['status']}</strong></td>";
    echo "<td>{$sub['hours_in_step']}h</td>";
    echo "<td>" . ($sub['scheduled_at'] ?? '-') . "</td>";
    echo "<td>{$sub['created_at']}</td>";
    echo "<td>{$sub['updated_at']}</td>";
    echo "<td>" . ($sub['last_error'] ?? '-') . "</td>";
    echo "</tr>";
}

echo "</table>";

// Get activity log for this flow
echo "<h3>📜 Recent Activity (Last 50)</h3>";
$stmtActivity = $pdo->prepare("
    SELECT 
        sa.id,
        s.email,
        sa.type,
        sa.step_id,
        sa.details,
        sa.created_at
    FROM subscriber_activity sa
    LEFT JOIN subscribers s ON s.id = sa.subscriber_id
    WHERE sa.flow_id = ?
    ORDER BY sa.created_at DESC
    LIMIT 50
");
$stmtActivity->execute([$flowId]);
$activities = $stmtActivity->fetchAll(PDO::FETCH_ASSOC);

echo "<table>";
echo "<tr>
    <th>Time</th>
    <th>Email</th>
    <th>Type</th>
    <th>Step ID</th>
    <th>Details</th>
</tr>";

foreach ($activities as $activity) {
    echo "<tr>";
    echo "<td><small>{$activity['created_at']}</small></td>";
    echo "<td>{$activity['email']}</td>";
    echo "<td><strong>{$activity['type']}</strong></td>";
    echo "<td><small>{$activity['step_id']}</small></td>";
    echo "<td>{$activity['details']}</td>";
    echo "</tr>";
}

echo "</table>";

echo "</div></body></html>";
?>