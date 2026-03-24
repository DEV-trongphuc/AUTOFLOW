<?php
require_once 'db_connect.php';
$zaloUserId = '7052207665078724814';

$stmt = $pdo->prepare("SELECT * FROM zalo_subscribers WHERE zalo_user_id = ?");
$stmt->execute([$zaloUserId]);
$sub = $stmt->fetch(PDO::FETCH_ASSOC);

echo "Subscriber Data:\n";
print_r($sub);

if ($sub) {
    $stmt2 = $pdo->prepare("SELECT * FROM zalo_subscriber_activity WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 5");
    $stmt2->execute([$sub['id']]);
    $activity = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    echo "\nRecent Activity:\n";
    print_r($activity);

    $zaloVid = "zalo_" . $zaloUserId;
    $stmt3 = $pdo->prepare("SELECT * FROM ai_conversations WHERE visitor_id = ? ORDER BY updated_at DESC LIMIT 1");
    $stmt3->execute([$zaloVid]);
    $conv = $stmt3->fetch(PDO::FETCH_ASSOC);
    echo "\nLatest AI Conversation:\n";
    print_r($conv);
} else {
    echo "\nSubscriber not found.\n";
}
