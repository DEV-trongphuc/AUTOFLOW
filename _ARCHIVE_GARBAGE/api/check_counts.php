<?php
require_once 'db_connect.php';

echo "Distribution of statuses:\n";
$stmt = $pdo->query("SELECT status, COUNT(*) as count FROM subscribers GROUP BY status");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\nLists counts:\n";
$stmt = $pdo->query("SELECT id, name, subscriber_count FROM lists");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\nSubscribers with status='customer' but NOT in Misa CRM Customers list:\n";
// Find Misa CRM Customers list ID from integrations
$stmt = $pdo->query("SELECT config FROM integrations WHERE name LIKE '%Misa%' LIMIT 1");
$config = json_decode($stmt->fetchColumn(), true);
$listId = $config['targetListId'] ?? '';

if ($listId) {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM subscribers s WHERE s.status = 'customer' AND NOT EXISTS (SELECT 1 FROM subscriber_lists sl WHERE sl.subscriber_id = s.id AND sl.list_id = ?)");
    $stmt->execute([$listId]);
    echo "Customers not in list: " . $stmt->fetchColumn() . "\n";
} else {
    echo "Misa list not found in config.\n";
}
