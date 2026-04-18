<?php
require_once __DIR__ . '/db_connect.php';
header('Content-Type: text/plain');

try {
    echo "--- RAW ai_org_user_categories TABLE ---\n";
    $stmt = $pdo->query("SELECT * FROM ai_org_user_categories");
    $all = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($all as $row) {
        echo "ID: {$row['id']} | UserID: {$row['user_id']} | CatID: {$row['category_id']}\n";
    }

    echo "\n--- RAW ai_org_users TABLE ---\n";
    $stmt = $pdo->query("SELECT id, email, role, admin_id FROM ai_org_users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($users as $u) {
        echo "ID: {$u['id']} | Email: {$u['email']} | Role: {$u['role']} | AdminID: '{$u['admin_id']}'\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
