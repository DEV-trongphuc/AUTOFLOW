<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

$flowId = '6200f46f-7349-4fa2-a65d-889abe63c25d';
$stmt = $pdo->prepare("SELECT id, name, steps, config FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$flow = $stmt->fetch();

if (!$flow) {
    echo json_encode(['error' => 'Flow not found']);
    exit;
}

$flow['steps_decoded'] = json_decode($flow['steps'], true);
$flow['config_decoded'] = json_decode($flow['config'], true);

echo json_encode($flow, JSON_PRETTY_PRINT);
