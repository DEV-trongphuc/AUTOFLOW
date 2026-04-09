<?php
require 'db_connect.php';

$categoryId = 'category_6967a5c47b0ed';
$userId = 6;

echo "=== CATEGORY ===\n";
$stmt = $pdo->prepare("SELECT * FROM ai_chatbot_categories WHERE id = ?");
$stmt->execute([$categoryId]);
print_r($stmt->fetch(PDO::FETCH_ASSOC));

echo "\n=== USERS IN CATEGORY ===\n";
$stmt = $pdo->prepare("SELECT * FROM ai_org_user_categories WHERE category_id = ?");
$stmt->execute([$categoryId]);
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n=== MY USER ===\n";
$stmt = $pdo->prepare("SELECT * FROM ai_org_users WHERE id = ?");
$stmt->execute([$userId]);
print_r($stmt->fetch(PDO::FETCH_ASSOC));

echo "\n=== ALL USERS IN SYSTEM ===\n";
$stmt = $pdo->prepare("SELECT id, email, full_name, role, admin_id FROM ai_org_users");
$stmt->execute();
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
