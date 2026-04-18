<?php
require_once 'db_connect.php';
header('Content-Type: text/plain');

echo "--- ACTIVE PURCHASE FLOWS ---\n";
$stmt = $pdo->query("SELECT id, name, steps FROM flows WHERE status = 'active'");
$flows = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($flows as $f) {
    $steps = json_decode($f['steps'], true);
    foreach ($steps as $s) {
        if (($s['type'] === 'trigger') && (($s['config']['type'] ?? '') === 'purchase')) {
            echo "FlowID: {$f['id']} | FlowName: {$f['name']} | TriggerTargetID: " . ($s['config']['targetId'] ?? 'NULL') . "\n";
        }
    }
}

echo "\n--- PURCHASE EVENTS ---\n";
$stmt = $pdo->query("SELECT id, name FROM purchase_events");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "EventID: {$row['id']} | EventName: {$row['name']}\n";
}
?>