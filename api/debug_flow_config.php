<?php
require_once 'db_connect.php';

$flowId = '808da9d3-dca9-475b-844f-5df52ac0508b';
$stmt = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$stepsJson = $stmt->fetchColumn();

if (!$stepsJson) {
    echo "Flow not found.\n";
    exit;
}

$steps = json_decode($stepsJson, true);
echo "--- Flow Steps for $flowId ---\n";
foreach ($steps as $s) {
    echo "ID: {$s['id']} | Type: {$s['type']} | Label: " . ($s['label'] ?? 'N/A') . "\n";
    if ($s['type'] === 'condition') {
        echo "  Config: " . json_encode($s['config']) . "\n";
    }
}
