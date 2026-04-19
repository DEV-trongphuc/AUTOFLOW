<?php
require 'api/db_connect.php';

$visitorId = 'f20737a9335f76207df32b347a2cbf83';
$propertyId = 'chatbot_69d31cb770641';

echo "--- QUERY 1 (Conversations) ---\n";
$stmt1 = $pdo->prepare("EXPLAIN SELECT id, user_id, visitor_id, summary FROM ai_org_conversations WHERE (visitor_id = ? OR id = ?) AND property_id = ? ORDER BY created_at DESC LIMIT 1");
$stmt1->execute([$visitorId, $visitorId, $propertyId]);
print_r($stmt1->fetchAll(PDO::FETCH_ASSOC));

echo "\n--- QUERY 2 (Messages) ---\n";
$stmtConv = $pdo->prepare("SELECT id FROM ai_org_conversations WHERE visitor_id = ? AND property_id = ? LIMIT 1");
$stmtConv->execute([$visitorId, $propertyId]);
$convId = $stmtConv->fetchColumn();

if ($convId) {
    echo "Conv ID: $convId\n";
    $stmt2 = $pdo->prepare("EXPLAIN SELECT id, conversation_id, sender, message, created_at, tokens, metadata FROM ai_org_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 10 OFFSET 0");
    $stmt2->execute([$convId]);
    print_r($stmt2->fetchAll(PDO::FETCH_ASSOC));
} else {
    echo "Conv not found\n";
}
