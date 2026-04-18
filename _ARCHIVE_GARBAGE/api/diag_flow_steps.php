<?php
require_once 'db_connect.php';

$flowId = '808da9d3-dca9-475b-844f-5df52ac0508b';

try {
    $stmt = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
    $stmt->execute([$flowId]);
    $stepsJson = $stmt->fetchColumn();

    echo json_encode(json_decode($stepsJson, true), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
