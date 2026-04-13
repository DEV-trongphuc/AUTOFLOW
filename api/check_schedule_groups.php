<?php
require 'db_connect.php';

// Check if created_at changes on update
$stmt = $pdo->prepare("SELECT id, created_at, scheduled_at FROM subscriber_flow_states LIMIT 1");
$stmt->execute();
$row = $stmt->fetch(PDO::FETCH_ASSOC);

echo "BEFORE UPDATE: created_at = " . $row['created_at'] . "\n";

$pdo->prepare("UPDATE subscriber_flow_states SET scheduled_at = ? WHERE id = ?")->execute([$row['scheduled_at'], $row['id']]);

$stmt = $pdo->prepare("SELECT id, created_at FROM subscriber_flow_states WHERE id = ?");
$stmt->execute([$row['id']]);
$row2 = $stmt->fetch(PDO::FETCH_ASSOC);

echo "AFTER UPDATE: created_at = " . $row2['created_at'] . "\n";
