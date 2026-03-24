<?php
// api/test_admin_logging.php
require_once 'db_connect.php';
require_once 'ai_org_middleware.php';

// Mock Session for Admin
session_start();
$_SESSION['org_user_id'] = 1; // Assuming ID 1 exists
$_SESSION['org_user_role'] = 'admin';

echo "<h2>Testing Admin Logging & Stats</h2>";

// 1. Simulate Log Action
echo "<h3>1. Simulating 'create_bot' Action...</h3>";
logAdminAction($pdo, 1, 'create_bot', 'bot', 'test_bot_123', ['name' => 'Test Bot']);
echo "Logged.<br>";

// 2. Query Stats API directly (Internal check)
echo "<h3>2. Fetching Logs from DB...</h3>";
$stmt = $pdo->query("SELECT * FROM admin_logs ORDER BY id DESC LIMIT 1");
$log = $stmt->fetch(PDO::FETCH_ASSOC);

if ($log && $log['target_id'] === 'test_bot_123') {
    echo "<span style='color:green'>PASS: Log found in DB. Action: {$log['action']}</span><br>";
} else {
    echo "<span style='color:red'>FAIL: Log not found.</span><br>";
}

// 3. Test General Stats
echo "<h3>3. Testing get_general_stats...</h3>";
ob_start();
$_GET['action'] = 'get_general_stats';
include 'admin_stats.php';
$output = ob_get_clean();
$json = json_decode($output, true);

if ($json['success'] ?? false) {
    echo "<br><span style='color:green'>PASS: General Stats returned success.</span><br>";
    echo "<pre>" . print_r($json['data'], true) . "</pre>";
} else {
    echo "<span style='color:red'>FAIL: Stats API Error. Output: $output</span><br>";
}
?>