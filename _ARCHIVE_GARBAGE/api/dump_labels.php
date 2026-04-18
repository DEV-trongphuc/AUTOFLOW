<?php
require_once __DIR__ . '/db_connect.php';
$flowId = '69dca73f0d951';
$stmt = $pdo->prepare('SELECT steps FROM flows WHERE id = ?');
$stmt->execute([$flowId]);
$steps = json_decode($stmt->fetchColumn(), true);
foreach ($steps as $s) {
    echo $s['id'] . " | TYPE: " . $s['type'] . " | LABEL: " . ($s['label'] ?? 'N/A') . "\n";
}
?>
