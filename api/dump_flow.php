<?php
// api/dump_flow.php
require_once 'db_connect.php';
$fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

$stmt = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
$stmt->execute([$fid]);
$steps = json_decode($stmt->fetchColumn(), true);

header('Content-Type: application/json');
echo json_encode($steps, JSON_PRETTY_PRINT);
