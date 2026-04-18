<?php
// check_queue_status.php
require_once 'db_connect.php';

echo "<h2>Queue Status</h2>";

$stmt = $pdo->query("SELECT status, count(*) as count FROM queue_jobs GROUP BY status");
$stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<table border='1'><tr><th>Status</th><th>Count</th></tr>";
foreach ($stats as $row) {
    echo "<tr><td>{$row['status']}</td><td>{$row['count']}</td></tr>";
}
echo "</table>";

if (isset($_GET['action']) && $_GET['action'] === 'retry_failed') {
    $pdo->query("UPDATE queue_jobs SET status = 'pending', attempts = 0, available_at = NOW() WHERE status = 'failed'");
    echo "<p style='color: green;'>Renamed failed jobs to pending. They will be processed in the next run.</p>";
}

echo "<h3>Recent Pending/Processing/Failed Jobs</h3>";
$stmt = $pdo->query("SELECT id, queue, status, attempts, error_message, created_at, available_at FROM queue_jobs WHERE status IN ('pending', 'processing', 'failed') OR queue = 'ai_training' ORDER BY created_at DESC LIMIT 50");
$jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<table border='1'><tr><th>ID</th><th>Queue</th><th>Status</th><th>Attempts</th><th>Error</th><th>Created</th><th>Available</th></tr>";
foreach ($jobs as $job) {
    $style = ($job['queue'] == 'ai_training') ? "style='background-color: #e3f2fd;'" : "";
    echo "<tr $style>
            <td>{$job['id']}</td>
            <td>{$job['queue']}</td>
            <td>{$job['status']}</td>
            <td>{$job['attempts']}</td>
            <td>" . htmlspecialchars($job['error_message']) . "</td>
            <td>{$job['created_at']}</td>
            <td>{$job['available_at']}</td>
          </tr>";
}
echo "</table>";

echo "<br><a href='worker_queue.php' target='_blank'>Run Worker Now</a> | ";
echo "<a href='?action=retry_failed'>Retry All Failed Jobs</a>";
