<?php
require_once 'db_connect.php';
echo "--- ai_org_conversations schema ---\n";
$stmt = $pdo->query("DESCRIBE ai_org_conversations");
print_r($stmt->fetchAll());
echo "\n--- ai_conversations schema ---\n";
$stmt = $pdo->query("DESCRIBE ai_conversations");
print_r($stmt->fetchAll());
