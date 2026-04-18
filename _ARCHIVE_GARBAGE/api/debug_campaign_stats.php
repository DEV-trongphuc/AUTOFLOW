<?php
require_once 'bootstrap.php';
initializeSystem($pdo);

$campaignId = $_GET['id'] ?? null;
if (!$campaignId) {
    echo "Usage: debug_campaign_stats.php?id=CAMPAIGN_ID";
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM campaigns WHERE id = ?");
    $stmt->execute([$campaignId]);
    $campaign = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$campaign) {
        echo "Campaign not found: " . htmlspecialchars($campaignId);
        exit;
    }

    echo "<h2>Campaign Details: {$campaign['name']}</h2>";
    echo "<pre>";
    print_r([
        'id' => $campaign['id'],
        'name' => $campaign['name'],
        'status' => $campaign['status'],
        'type' => $campaign['type'],
        'count_sent' => $campaign['count_sent'],
        'count_opened' => $campaign['count_opened'],
        'count_unique_opened' => $campaign['count_unique_opened'],
        'count_unique_clicked' => $campaign['count_unique_clicked'],
        'total_target_audience' => $campaign['total_target_audience'],
        'sent_at' => $campaign['sent_at'],
        'scheduled_at' => $campaign['scheduled_at']
    ]);
    echo "</pre>";

    // Check Mail Delivery Logs
    $stmtLogs = $pdo->prepare("SELECT COUNT(*) FROM mail_delivery_logs WHERE campaign_id = ?");
    $stmtLogs->execute([$campaignId]);
    $logsCount = $stmtLogs->fetchColumn();

    $stmtLogsSuccess = $pdo->prepare("SELECT COUNT(*) FROM mail_delivery_logs WHERE campaign_id = ? AND status = 'success'");
    $stmtLogsSuccess->execute([$campaignId]);
    $logsSuccessCount = $stmtLogsSuccess->fetchColumn();

    echo "<h3>Mail Delivery Logs (campaign_id = $campaignId):</h3>";
    echo "Total: $logsCount<br>";
    echo "Success: $logsSuccessCount<br>";

    // Check Zalo Delivery Logs
    $stmtZalo = $pdo->prepare("SELECT COUNT(*) FROM zalo_delivery_logs WHERE flow_id = ?");
    $stmtZalo->execute([$campaignId]);
    $zaloCount = $stmtZalo->fetchColumn();

    echo "<h3>Zalo Delivery Logs (flow_id = $campaignId):</h3>";
    echo "Total: $zaloCount<br>";

    // Check Subscriber Activity
    $stmtActOpen = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = ? AND type IN ('open_email', 'open_zns')");
    $stmtActOpen->execute([$campaignId]);
    $openCount = $stmtActOpen->fetchColumn();

    $stmtActClick = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = ? AND type IN ('click_link', 'click_zns')");
    $stmtActClick->execute([$campaignId]);
    $clickCount = $stmtActClick->fetchColumn();

    echo "<h3>Subscriber Activity (campaign_id = $campaignId):</h3>";
    echo "Unique Opens: $openCount<br>";
    echo "Unique Clicks: $clickCount<br>";

    // Search for logs that MIGHT belong to this campaign but aren't linked
    // If it's linked to a flow, search by flow_id
    echo "<h3>Searching for unlinked logs via Flow:</h3>";
    $stmtFlows = $pdo->query("SELECT id, name, steps FROM flows WHERE steps LIKE '%$campaignId%'");
    $foundFlows = $stmtFlows->fetchAll();
    foreach ($foundFlows as $flow) {
        $flowId = $flow['id'];
        echo "Found Flow: {$flow['name']} ($flowId)<br>";

        $stmtFLogs = $pdo->prepare("SELECT COUNT(*) FROM mail_delivery_logs WHERE flow_id = ? AND campaign_id IS NULL");
        $stmtFLogs->execute([$flowId]);
        $unlinkedLogs = $stmtFLogs->fetchColumn();
        echo "- Unlinked Mail Logs in this flow: $unlinkedLogs<br>";

        $stmtFLogsZ = $pdo->prepare("SELECT COUNT(*) FROM zalo_delivery_logs WHERE flow_id = ? AND (status IN ('sent', 'delivered', 'seen'))");
        $stmtFLogsZ->execute([$flowId]);
        $zaloFlowLogs = $stmtFLogsZ->fetchColumn();
        echo "- Zalo Logs in this flow: $zaloFlowLogs<br>";

        $stmtFAct = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE flow_id = ? AND campaign_id IS NULL");
        $stmtFAct->execute([$flowId]);
        $unlinkedAct = $stmtFAct->fetchColumn();
        echo "- Unlinked Activities in this flow: $unlinkedAct<br>";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
