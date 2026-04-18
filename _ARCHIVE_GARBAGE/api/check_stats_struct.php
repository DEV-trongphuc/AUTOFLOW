<?php
require_once 'db_connect.php';
$flowId = '69dca73f0d951';
$stmt = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$steps = json_decode($stmt->fetchColumn(), true);

// Look for a step with stats
foreach ($steps as $s) {
    if (isset($s['stats'])) {
        echo "Step ID: {$s['id']} - Stats structure:\n";
        print_r($s['stats']);
        break;
    }
}
?>
