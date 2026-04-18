<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$fid = '808da9d3-dca9-475b-844f-5df52ac0508b';
$stmt = $pdo->prepare("SELECT id, name, status, trigger_type, steps FROM flows WHERE id = ?");
$stmt->execute([$fid]);
$flow = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$flow) {
    echo "Flow $fid not found.\n";
} else {
    echo "Flow Name: " . $flow['name'] . "\n";
    echo "Status: " . $flow['status'] . "\n";
    echo "Trigger Type: " . $flow['trigger_type'] . "\n";
    echo "Trigger Config:\n";
    $steps = json_decode($flow['steps'], true) ?: [];
    foreach ($steps as $s) {
        if ($s['type'] === 'trigger') {
            echo json_encode($s['config'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
        }
    }
}

echo "\nChecking Flow ad16ed97-06b8-49a6-a8da-222c93191db0 as well:\n";
$fid2 = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
$stmt = $pdo->prepare("SELECT id, name, status, trigger_type, steps FROM flows WHERE id = ?");
$stmt->execute([$fid2]);
$flow2 = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$flow2) {
    echo "Flow $fid2 not found.\n";
} else {
    echo "Flow Name: " . $flow2['name'] . "\n";
    echo "Trigger Type: " . $flow2['trigger_type'] . "\n";
    $steps = json_decode($flow2['steps'], true) ?: [];
    foreach ($steps as $s) {
        if ($s['type'] === 'trigger') {
            echo json_encode($s['config'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
        }
    }
}
