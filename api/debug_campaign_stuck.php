<?php
// api/debug_campaign_stuck.php - CHIẾN DỊCH DIAGNOSTIC TOOL
require_once __DIR__ . '/db_connect.php';
header('Content-Type: text/html; charset=utf-8');

$campaignId = $_GET['id'] ?? '69de8aa4e74b4'; 

echo "<h1>DIAGNOSTIC FOR CAMPAIGN: $campaignId</h1>";

// 1. Check API_BASE_URL
echo "<h2>1. Environment Check</h2>";
echo "API_BASE_URL: " . (defined('API_BASE_URL') ? API_BASE_URL : 'UNDEFINED') . "<br>";
echo "Current File Path: " . __FILE__ . "<br>";

// 2. Fetch Campaign
echo "<h2>2. Campaign Data</h2>";
$stmt = $pdo->prepare("SELECT id, name, status, count_sent, total_target_audience, scheduled_at, sent_at FROM campaigns WHERE id = ?");
$stmt->execute([$campaignId]);
$camp = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$camp) {
    echo "<p style='color:red'>ERROR: Campaign not found!</p>";
} else {
    echo "<table border='1' cellpadding='5'>";
    foreach ($camp as $k => $v) {
        echo "<tr><td><b>$k</b></td><td>$v</td></tr>";
    }
    echo "</table>";
}

// 3. Activity Summary
echo "<h2>3. Activity Logs for this Campaign</h2>";
$stmtAct = $pdo->prepare("SELECT type, COUNT(*) as count FROM subscriber_activity WHERE campaign_id = ? GROUP BY type");
$stmtAct->execute([$campaignId]);
$activities = $stmtAct->fetchAll(PDO::FETCH_ASSOC);

if (empty($activities)) {
    echo "<p>No activity logs found yet.</p>";
} else {
    echo "<ul>";
    foreach ($activities as $act) {
        echo "<li>{$act['type']}: <b>{$act['count']}</b></li>";
    }
    echo "</ul>";
}

// 4. Check for LOCKS
echo "<h2>4. Concurrency Locks (processing_campaign)</h2>";
$stmtLock = $pdo->prepare("SELECT * FROM subscriber_activity WHERE campaign_id = ? AND type = 'processing_campaign'");
$stmtLock->execute([$campaignId]);
$locks = $stmtLock->fetchAll(PDO::FETCH_ASSOC);

if (empty($locks)) {
    echo "<p style='color:green'>No active locks found. This means Worker is NOT currently touching these subscribers.</p>";
} else {
    echo "<p style='color:orange'>Found " . count($locks) . " locked subscribers. These are preventing new Workers from picking them up.</p>";
    if (isset($_GET['unlock'])) {
        $pdo->prepare("DELETE FROM subscriber_activity WHERE campaign_id = ? AND type = 'processing_campaign'")->execute([$campaignId]);
        echo "<p style='color:blue'><b>FORCE UNLOCK COMPLETED!</b> Locks have been removed.</p>";
    } else {
        echo "<a href='?id=$campaignId&unlock=1' style='padding:10px; background:#ff4444; color:white; text-decoration:none;'>FORCE UNLOCK NOW</a>";
    }
}

// 5. Trigger Worker Attempt
echo "<h2>5. Trigger Worker</h2>";
if (isset($_GET['trigger'])) {
    echo "Attempting to trigger worker via CURL...<br>";
    $workerUrl = API_BASE_URL . "/worker_campaign.php?campaign_id=" . $campaignId;
    echo "Worker URL: $workerUrl<br>";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $workerUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $result = curl_exec($ch);
    $error = curl_error($ch);
    $info = curl_getinfo($ch);
    curl_close($ch);
    
    echo "HTTP Status: " . $info['http_code'] . "<br>";
    if ($error) {
        echo "CURL Error: $error<br>";
    } else {
        echo "Result Snapshot: <pre>" . htmlspecialchars(substr($result, 0, 1000)) . "</pre>";
    }
} else {
     echo "<a href='?id=$campaignId&trigger=1' style='padding:10px; background:#44aa44; color:white; text-decoration:none;'>TRIGGER WORKER NOW</a>";
}

echo "<h2>6. Quick Fix ALL</h2>";
echo "<a href='?id=$campaignId&unlock=1&trigger=1' style='padding:20px; background:#ffa900; color:black; font-weight:bold; text-decoration:none;'>FIX STUCK (Unlock + Trigger)</a>";
?>
