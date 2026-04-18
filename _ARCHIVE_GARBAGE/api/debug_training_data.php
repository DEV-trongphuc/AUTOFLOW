<?php
require_once 'db_connect.php';
$stmt = $pdo->prepare("SELECT content FROM ai_training_chunks WHERE content LIKE '%mba%' LIMIT 5");
$stmt->execute();
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($results);
?>