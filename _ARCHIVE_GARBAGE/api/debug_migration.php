<?php
require_once __DIR__ . '/db_connect.php';

header('Content-Type: text/plain');

try {
    echo "--- Categories Check ---\n";
    $stmt = $pdo->query("SELECT id, name, slug, admin_id FROM ai_chatbot_categories WHERE name LIKE '%IDEAS%' OR slug LIKE '%ideas%'");
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($categories as $cat) {
        echo "ID: {$cat['id']} | Name: {$cat['name']} | Slug: {$cat['slug']} | AdminID: {$cat['admin_id']}\n";
    }

    echo "\n--- AI Allowed Emails ---\n";
    $stmt = $pdo->query("SELECT * FROM ai_allowed_emails");
    $allowed = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($allowed as $al) {
        echo "Email: {$al['email']} | GroupID: {$al['group_id']} | Role: {$al['role']}\n";
    }

    echo "\n--- All Category Assignments (Double Check) ---\n";
    $stmt = $pdo->query("SELECT * FROM ai_org_user_categories");
    $allAssignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($allAssignments as $aa) {
        echo "UserID: {$aa['user_id']} | CategoryID: {$aa['category_id']}\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
