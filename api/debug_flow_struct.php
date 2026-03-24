<?php
require 'db_connect.php';
$flowId = '6200f46f-7349-4fa2-a65d-889abe63c25d';

$stmt = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$steps = json_decode($stmt->fetchColumn(), true);

foreach ($steps as $s) {
    echo "ID: {$s['id']} | Type: {$s['type']} | Label: {$s['label']}\n";
    if ($s['type'] === 'condition') {
        echo "  -> Yes: " . ($s['yesStepId'] ?? 'None') . "\n";
        echo "  -> No: " . ($s['noStepId'] ?? 'None') . "\n";
        echo "  -> Config: " . json_encode($s['config']) . "\n";
    }
}
