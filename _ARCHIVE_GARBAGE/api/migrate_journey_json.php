<?php
require_once 'db_connect.php';
header('Content-Type: text/plain');

echo "Debug Journey Data:\n";
$stmt = $pdo->prepare("SELECT id, type, details FROM subscriber_activity ORDER BY created_at DESC LIMIT 50");
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as $row) {
    echo "[{$row['id']}] [{$row['type']}] " . substr($row['details'], 0, 100) . "\n";
}

echo "\nRunning Migration...\n";
$stmt = $pdo->prepare("SELECT id, details FROM subscriber_activity WHERE details LIKE '%:%'");
$stmt->execute();
$all = $stmt->fetchAll(PDO::FETCH_ASSOC);

$count = 0;
foreach ($all as $row) {
    $details = $row['details'];

    // Check for JSON start after colon
    if (preg_match('/: \s*([\[\{].*)/su', $details, $matches)) {
        $jsonPart = trim($matches[1]);
        $update = $pdo->prepare("UPDATE subscriber_activity SET details = ? WHERE id = ?");
        $update->execute([$jsonPart, $row['id']]);
        $count++;
    }
}

echo "Migrated $count entries.\n";
