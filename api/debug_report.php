<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

$campaignId = $_GET['id'] ?? '69540e915ae52';

$response = [];

// 1. Check if campaign exists
$stmt = $pdo->prepare("SELECT id, name, status FROM campaigns WHERE id = ?");
$stmt->execute([$campaignId]);
$response['campaign'] = $stmt->fetch(PDO::FETCH_ASSOC);

// 2. Count logs
$stmt = $pdo->prepare("SELECT COUNT(*) FROM mail_delivery_logs WHERE campaign_id = ?");
$stmt->execute([$campaignId]);
$response['log_count'] = $stmt->fetchColumn();

// 3. Get sample logs
$stmt = $pdo->prepare("SELECT id, recipient, status, sent_at, reminder_id FROM mail_delivery_logs WHERE campaign_id = ? LIMIT 5");
$stmt->execute([$campaignId]);
$response['sample_logs'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 4. Check join with subscribers
// This mimics the actual report query
$sql = "SELECT 
            l.recipient as email, 
            s.id as subscriber_id,
            l.status as delivery_status
        FROM mail_delivery_logs l
        LEFT JOIN subscribers s ON l.recipient = s.email 
        WHERE l.campaign_id = ? 
        LIMIT 5";
$stmt = $pdo->prepare($sql);
$stmt->execute([$campaignId]);
$response['join_test'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 5. Check reminder_id distribution
$stmt = $pdo->prepare("SELECT reminder_id, COUNT(*) as count FROM mail_delivery_logs WHERE campaign_id = ? GROUP BY reminder_id");
$stmt->execute([$campaignId]);
$response['reminder_distribution'] = $stmt->fetchAll(PDO::FETCH_ASSOC);


echo json_encode($response, JSON_PRETTY_PRINT);
