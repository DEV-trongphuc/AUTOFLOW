<?php
require_once 'db_connect.php';
$stmt = $pdo->query("DESCRIBE ai_training_chunks");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT);
