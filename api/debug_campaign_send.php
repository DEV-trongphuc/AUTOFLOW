<?php
require_once 'db_connect.php';
$cid = '695a99f449ae5';
$campaignId = '695a99f449ae5';

echo "--- DEBUG CAMPAIGN: $campaignId ---\n";

// 1. Check Campaign Record
$stmt = $pdo->prepare("SELECT id, status, total_target_audience, count_sent, count_opened FROM campaigns WHERE id = ?");
$stmt->execute([$campaignId]);
$camp = $stmt->fetch();
echo "Campaign Info: " . json_encode($camp) . "\n\n";

// 2. Check Queue Stats
$stmt = $pdo->prepare("SELECT status, COUNT(*) as count FROM campaign_queue WHERE campaign_id = ? GROUP BY status");
$stmt->execute([$campaignId]);
$queueStats = $stmt->fetchAll();
echo "Queue Stats: " . json_encode($queueStats) . "\n\n";

// 3. Check Delivery Logs
$stmt = $pdo->prepare("SELECT status, COUNT(*) as count FROM mail_delivery_logs WHERE campaign_id = ? GROUP BY status");
$stmt->execute([$campaignId]);
$deliveryStats = $stmt->fetchAll();
echo "Delivery Log Stats: " . json_encode($deliveryStats) . "\n\n";

// 4. Check Activity Logs (receives)
$stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = ? AND type = 'receive_email'");
$stmt->execute([$campaignId]);
$activityCount = $stmt->fetchColumn();
echo "Activity 'receive_email' Count: $activityCount\n\n";

// 5. Check if Worker is triggered
echo "Attempting to trigger worker for this campaign...\n";
$workerUrl = "https://automation.ideas.edu.vn/mail_api/worker_campaign.php?campaign_id=$campaignId";
$res = file_get_contents($workerUrl);
echo "Worker Response (first 100 chars): " . substr($res, 0, 100) . "\n";
