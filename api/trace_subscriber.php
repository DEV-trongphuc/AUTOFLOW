<?php
// api/trace_subscriber.php
require_once 'db_connect.php';
header('Content-Type: text/html; charset=utf-8');

$subscriberId = '695f37ac7fc61';

echo "<h1>Trace For Subscriber: $subscriberId</h1>";

// 1. Check Subscriber Details
$stmtSub = $pdo->prepare("SELECT id, email, status FROM subscribers WHERE id = ?");
$stmtSub->execute([$subscriberId]);
$sub = $stmtSub->fetch(PDO::FETCH_ASSOC);
echo "<h3>Subscriber</h3>";
if ($sub) {
    echo "Email: <strong>{$sub['email']}</strong><br>";
    echo "Status: {$sub['status']}<br>";
} else {
    echo "<span style='color:red'>Subscriber NOT FOUND in DB.</span><br>";
}

// 2. Check Flow State
echo "<h3>Flow State</h3>";
$stmtState = $pdo->prepare("SELECT * FROM subscriber_flow_states WHERE subscriber_id = ?");
$stmtState->execute([$subscriberId]);
$states = $stmtState->fetchAll(PDO::FETCH_ASSOC);
echo "<table border='1'><tr><th>Flow ID</th><th>Status</th><th>Step ID</th><th>Updated At</th></tr>";
foreach ($states as $s) {
    echo "<tr><td>{$s['flow_id']}</td><td>{$s['status']}</td><td>{$s['step_id']}</td><td>{$s['updated_at']}</td></tr>";
}
echo "</table>";

// 3. Activity Log (The Truth)
echo "<h3>Activity History</h3>";
$stmtAct = $pdo->prepare("SELECT type, details, created_at, flow_id FROM subscriber_activity WHERE subscriber_id = ? ORDER BY created_at DESC");
$stmtAct->execute([$subscriberId]);
$acts = $stmtAct->fetchAll(PDO::FETCH_ASSOC);

echo "<table border='1'><tr><th>Time</th><th>Type</th><th>Details</th><th>Flow ID</th></tr>";
foreach ($acts as $a) {
    $color = '';
    if (strpos($a['type'], 'error') !== false || strpos($a['type'], 'fail') !== false)
        $color = '#ffcccc';
    if ($a['type'] === 'receive_email')
        $color = '#ccffcc';

    echo "<tr style='background-color:$color'>";
    echo "<td>{$a['created_at']}</td>";
    echo "<td>{$a['type']}</td>";
    echo "<td>{$a['details']}</td>";
    echo "<td>{$a['flow_id']}</td>";
    echo "</tr>";
}
echo "</table>";

// 4. Mail Logs
echo "<h3>Mail Delivery Logs (SMTP)</h3>";
// Handle case where subscriber ID might not match if custom ID used, so using email lookup too
if ($sub) {
    $stmtMail = $pdo->prepare("SELECT sent_at, subject, status, error_message FROM mail_delivery_logs WHERE recipient = ? ORDER BY sent_at DESC");
    $stmtMail->execute([$sub['email']]);
    $mails = $stmtMail->fetchAll(PDO::FETCH_ASSOC);

    echo "<table border='1'><tr><th>Time</th><th>Subject</th><th>Status</th><th>Error</th></tr>";
    foreach ($mails as $m) {
        $color = ($m['status'] === 'success') ? '#ccffcc' : '#ffcccc';
        echo "<tr style='background-color:$color'>";
        echo "<td>{$m['sent_at']}</td>";
        echo "<td>{$m['subject']}</td>";
        echo "<td>{$m['status']}</td>";
        echo "<td>{$m['error_message']}</td>";
        echo "</tr>";
    }
    echo "</table>";
}
