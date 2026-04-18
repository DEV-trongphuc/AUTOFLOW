<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
$stmt = $pdo->prepare("SELECT name, steps FROM flows WHERE id = ?");
$stmt->execute([$fid]);
$flow = $stmt->fetch(PDO::FETCH_ASSOC);

echo "Steps for Flow: {$flow['name']} ($fid)\n";
echo "================================================\n\n";

$steps = json_decode($flow['steps'], true) ?: [];
foreach ($steps as $s) {
    echo "- ID: {$s['id']} | Type: {$s['type']} | Label: " . ($s['label'] ?? 'N/A') . "\n";
    if ($s['type'] === 'action' && isset($s['config']['subject'])) {
        echo "  -> Subject: {$s['config']['subject']}\n";
    }
    if ($s['type'] === 'condition') {
        echo "  -> Config: " . json_encode($s['config']) . "\n";
    }
}
