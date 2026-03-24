<?php
require_once 'db_connect.php';
$stmt = $pdo->prepare("SELECT id, name, property_id, status, source_type, parent_id, content FROM ai_training_docs WHERE status = 'pending'");
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($rows, JSON_PRETTY_PRINT);
?>