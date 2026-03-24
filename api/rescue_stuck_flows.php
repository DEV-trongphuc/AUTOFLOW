<?php
// rescue_stuck_flows.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Path Fix
if (file_exists('db_connect.php')) {
    require 'db_connect.php';
} elseif (file_exists('api/db_connect.php')) {
    require 'api/db_connect.php';
} else {
    die("Error: Could not find db_connect.php");
}

// Override JSON header from db_connect.php
header("Content-Type: text/html; charset=UTF-8");
if (ob_get_length())
    ob_clean();

echo "<h2>MailFlow Pro - Emergency Rescue</h2>";

try {
    // 1. Reset 'processing' items that are older than 1 minute
    $stmt = $pdo->prepare("UPDATE subscriber_flow_states SET status = 'waiting', updated_at = NOW() WHERE status = 'processing'");
    $stmt->execute();
    $counts = $stmt->rowCount();
    echo "<p style='color:blue;'>Step 1: Reset <b>$counts</b> items from 'processing' to 'waiting'.</p>";

    // 2. Trigger the worker flow via CURL (Safe and clean)
    echo "<p>Step 2: Triggering Flow Worker via CURL...</p>";

    $url = API_BASE_URL . '/worker_flow.php?output=text';
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    echo "<h4>Worker Response (HTTP $httpCode):</h4>";
    echo "<pre style='background:#f1f5f9; padding:10px; border:1px solid #cbd5e1;'>" . htmlspecialchars($res) . "</pre>";

    echo "<hr><p style='color:green;'><b>Rescue operation finished.</b> Please check your automation again.</p>";
    echo "<p><a href='debug_stalled_flows.php'>Back to Diagnosis Report</a></p>";

} catch (Exception $e) {
    echo "<p style='color:red;'><b>Error during rescue:</b> " . $e->getMessage() . "</p>";
}
