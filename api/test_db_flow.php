<?php
require_once 'db_connect.php';
header('Content-Type: text/plain');
$propertyId = '7c9a7040-a163-40dc-8e29-a1706a160564'; // Hardcoded for test
$stmt = $pdo->prepare("SELECT flow_data FROM ai_chatbot_scenarios WHERE property_id = ?");
$stmt->execute([$propertyId]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Scenarios found: " . count($rows) . "\n\n";
foreach ($rows as $r) {
    if (!empty($r['flow_data'])) {
        echo "Flow Data:\n";
        print_r(json_decode($r['flow_data'], true));
        echo "\n----------------------\n";
    }
}
