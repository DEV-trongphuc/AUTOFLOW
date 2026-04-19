<?php
require_once 'db_connect.php';
$stmt = $pdo->query("SELECT id, name, status, error_message FROM ai_training_docs WHERE status = 'error'");
$errors = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($errors);
