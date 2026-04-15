<?php
require_once __DIR__ . '/db_connect.php';
header('Content-Type: application/json');

$flowId = '69dca73f0d951';
$stmt = $pdo->prepare('SELECT steps FROM flows WHERE id = ?');
$stmt->execute([$flowId]);
$steps = json_decode($stmt->fetchColumn(), true);

echo json_encode($steps, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
