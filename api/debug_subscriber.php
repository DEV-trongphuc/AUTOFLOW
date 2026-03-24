<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json; charset=utf-8');
require_once 'db_connect.php';

$subscriberId = '6959a031b3b26'; // gssss@gmail.com - user mới nhất

try {
    // Get subscriber info
    $stmt = $pdo->prepare("SELECT * FROM subscribers WHERE id = ?");
    $stmt->execute([$subscriberId]);
    $subscriber = $stmt->fetch(PDO::FETCH_ASSOC);

    // Get flow states
    $stmt = $pdo->prepare("SELECT * FROM subscriber_flow_states WHERE subscriber_id = ? ORDER BY created_at DESC");
    $stmt->execute([$subscriberId]);
    $flowStates = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get activity log
    $stmt = $pdo->prepare("SELECT * FROM subscriber_activity WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 20");
    $stmt->execute([$subscriberId]);
    $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'subscriber' => $subscriber,
        'flow_states' => $flowStates,
        'activities' => $activities,
        'current_time' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}
