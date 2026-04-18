<?php
require_once __DIR__ . '/db_connect.php';
header('Content-Type: text/plain');

try {
    echo "--- Users Table (IDEAS related) ---\n";
    $stmt = $pdo->query("SELECT id, email, admin_id, role FROM ai_org_users WHERE email LIKE '%ideas.edu.vn%' OR id IN (6, 7)");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($users as $u) {
        echo "ID: {$u['id']} | Email: {$u['email']} | AdminID: '" . ($u['admin_id'] ?? 'NULL') . "' | Role: {$u['role']}\n";
    }

    echo "\n--- Category Assignments for category_699eada657bbe ---\n";
    $stmt = $pdo->prepare("SELECT user_id FROM ai_org_user_categories WHERE category_id = 'category_699eada657bbe'");
    $stmt->execute();
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "User IDs: " . implode(', ', $ids) . "\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
