<?php
require_once 'db_connect.php';
$stmt = $pdo->prepare("SELECT content FROM ai_training_chunks WHERE content LIKE '%tiếng Anh%' OR content LIKE '%English%' LIMIT 10");
$stmt->execute();
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "--- KB Contents for 'English' ---\n";
foreach ($results as $r) {
    echo "- " . substr($r['content'], 0, 100) . "...\n";
}
?>