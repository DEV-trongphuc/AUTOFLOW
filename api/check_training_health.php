<?php
// check_training_health.php
require_once 'db_connect.php';

echo "<h2>AI Training Health Check</h2>";

// 1. Check Pending Docs
$stmt = $pdo->query("SELECT status, count(*) as count FROM ai_training_docs GROUP BY status");
$docs = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<h3>Documents Status</h3>";
echo "<table border='1'><tr><th>Status</th><th>Count</th></tr>";
foreach ($docs as $row) {
    echo "<tr><td>{$row['status']}</td><td>{$row['count']}</td></tr>";
}
echo "</table>";

// 2. Check recent Training Jobs
echo "<h3>Recent Training Jobs (Queue)</h3>";
$stmt = $pdo->query("SELECT status, count(*) as count FROM queue_jobs WHERE queue = 'ai_training' GROUP BY status");
$qJobs = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "<table border='1'><tr><th>Job Status</th><th>Count</th></tr>";
foreach ($qJobs as $row) {
    echo "<tr><td>{$row['status']}</td><td>{$row['count']}</td></tr>";
}
echo "</table>";

// 3. Clear stuck pending docs (If they are stuck for too long, maybe force reset them?)
if (isset($_GET['fix'])) {
    $pdo->query("UPDATE ai_training_docs SET status = 'pending' WHERE status = 'training'");
    echo "<p style='color:green;'>Forced reset 'training' status to 'pending'. Try training again.</p>";
}

echo "<br><a href='?fix=1'>Reset Stuck Documents</a>";
