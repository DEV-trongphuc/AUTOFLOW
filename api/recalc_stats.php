<?php
require_once 'db_connect.php';

echo "Recalculating Stats from Activity Logs (FULL AUDIT)...\n";

// 1. Recalculate Campaign Stats
$stmt = $pdo->query("SELECT id FROM campaigns");
while ($row = $stmt->fetch()) {
    $cid = $row['id'];

    // Opens
    $openCount = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = ? AND type = 'open_email'")->execute([$cid]) ? $pdo->lastInsertId() : 0; // Wait, execute returns bool. count query needs fetchColumn
    $openCount = $pdo->query("SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = '$cid' AND type = 'open_email'")->fetchColumn();
    $uniqueOpenCount = $pdo->query("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = '$cid' AND type = 'open_email'")->fetchColumn();

    // Clicks
    $clickCount = $pdo->query("SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = '$cid' AND type = 'click_link'")->fetchColumn();
    $uniqueClickCount = $pdo->query("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = '$cid' AND type = 'click_link'")->fetchColumn();

    // Unsubscribes
    $unsubCount = $pdo->query("SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = '$cid' AND type = 'unsubscribe'")->fetchColumn();

    // Sent
    $sentCount = $pdo->query("SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = '$cid' AND type = 'receive_email'")->fetchColumn();

    // Bounced
    $bounceCount = $pdo->query("SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = '$cid' AND type = 'bounced'")->fetchColumn();

    // Update
    $pdo->prepare("UPDATE campaigns SET count_opened = ?, count_unique_opened = ?, count_clicked = ?, count_unique_clicked = ?, count_unsubscribed = ?, count_sent = GREATEST(count_sent, ?), count_bounced = ? WHERE id = ?")
        ->execute([$openCount, $uniqueOpenCount, $clickCount, $uniqueClickCount, $unsubCount, $sentCount, $bounceCount, $cid]);

    echo "Campaign $cid: Sent=$sentCount, Opens=$openCount ($uniqueOpenCount), Clicks=$clickCount ($uniqueClickCount), Unsub=$unsubCount\n";
}

// 2. Recalculate Flow Stats
$stmtF = $pdo->query("SELECT id FROM flows");
while ($row = $stmtF->fetch()) {
    $fid = $row['id'];

    // Opens
    $openCount = $pdo->query("SELECT COUNT(*) FROM subscriber_activity WHERE flow_id = '$fid' AND type = 'open_email'")->fetchColumn();
    $uniqueOpenCount = $pdo->query("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE flow_id = '$fid' AND type = 'open_email'")->fetchColumn();

    // Clicks
    $clickCount = $pdo->query("SELECT COUNT(*) FROM subscriber_activity WHERE flow_id = '$fid' AND type = 'click_link'")->fetchColumn();
    $uniqueClickCount = $pdo->query("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE flow_id = '$fid' AND type = 'click_link'")->fetchColumn();

    // Sent
    $sentCount = $pdo->query("SELECT COUNT(*) FROM subscriber_activity WHERE flow_id = '$fid' AND type = 'receive_email'")->fetchColumn();

    // Unsubscribes
    $unsubCount = $pdo->query("SELECT COUNT(*) FROM subscriber_activity WHERE flow_id = '$fid' AND type = 'unsubscribe'")->fetchColumn();

    // Failed
    $failCount = $pdo->query("SELECT COUNT(*) FROM mail_delivery_logs WHERE flow_id = '$fid' AND status = 'failed'")->fetchColumn();

    // Enrolled & Completed (From subscriber_flow_states table)
    $enrolled = $pdo->query("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_flow_states WHERE flow_id = '$fid'")->fetchColumn();
    $completed = $pdo->query("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_flow_states WHERE flow_id = '$fid' AND status = 'completed'")->fetchColumn();


    $pdo->prepare("UPDATE flows SET stat_total_opened = ?, stat_unique_opened = ?, stat_total_clicked = ?, stat_unique_clicked = ?, stat_total_sent = ?, stat_total_unsubscribed = ?, stat_total_failed = ?, stat_enrolled = GREATEST(stat_enrolled, ?), stat_completed = ? WHERE id = ?")
        ->execute([$openCount, $uniqueOpenCount, $clickCount, $uniqueClickCount, $sentCount, $unsubCount, $failCount, $enrolled, $completed, $fid]);

    echo "Flow $fid: Sent=$sentCount, Opens=$openCount ($uniqueOpenCount), Clicks=$clickCount ($uniqueClickCount), Unsub=$unsubCount, Enrolled=$enrolled\n";
}

echo "Recalculation Complete.\n";
