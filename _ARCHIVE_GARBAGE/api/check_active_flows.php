<?php
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

echo "=== ACTIVE FLOWS WITH FORM/PURCHASE TRIGGERS ===\n\n";

$stmt = $pdo->query("SELECT id, name, status, steps FROM flows WHERE status = 'active'");
$flows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Total active flows: " . count($flows) . "\n\n";

foreach ($flows as $flow) {
    $steps = json_decode($flow['steps'], true);

    foreach ($steps as $step) {
        if ($step['type'] === 'trigger') {
            $config = $step['config'];
            $type = $config['type'] ?? 'unknown';
            $targetId = $config['targetId'] ?? '';

            echo "Flow: {$flow['name']} (ID: {$flow['id']})\n";
            echo "  Trigger Type: $type\n";
            echo "  Target ID: " . ($targetId ?: '[EMPTY - matches ALL]') . "\n";

            if ($type === 'form' || $type === 'purchase' || $type === 'custom_event') {
                echo "  ✅ THIS FLOW SHOULD ENROLL FROM API TRIGGERS\n";

                // Get form/event name if applicable
                if ($type === 'form' && $targetId) {
                    $stmt2 = $pdo->prepare("SELECT name FROM forms WHERE id = ?");
                    $stmt2->execute([$targetId]);
                    $name = $stmt2->fetchColumn();
                    echo "  Form: " . ($name ?: 'NOT FOUND') . "\n";
                } elseif ($type === 'purchase' && $targetId) {
                    $stmt2 = $pdo->prepare("SELECT name FROM purchase_events WHERE id = ?");
                    $stmt2->execute([$targetId]);
                    $name = $stmt2->fetchColumn();
                    echo "  Purchase Event: " . ($name ?: 'NOT FOUND') . "\n";
                }
            }
            echo "\n";
        }
    }
}

echo "\n=== AVAILABLE FORMS ===\n";
$stmt = $pdo->query("SELECT id, name FROM forms");
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $form) {
    echo "{$form['id']} - {$form['name']}\n";
}

echo "\n=== AVAILABLE PURCHASE EVENTS ===\n";
$stmt = $pdo->query("SELECT id, name FROM purchase_events");
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $event) {
    echo "{$event['id']} - {$event['name']}\n";
}
?>