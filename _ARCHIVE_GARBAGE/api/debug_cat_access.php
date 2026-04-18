<?php
require_once __DIR__ . '/db_connect.php';
header('Content-Type: text/plain');

try {
    $catId = 'category_699eada657bbe';
    echo "--- Category Assignments for $catId ---\n";
    $stmt = $pdo->prepare("
        SELECT uc.user_id, u.email, u.role, u.admin_id 
        FROM ai_org_user_categories uc
        JOIN ai_org_users u ON uc.user_id = u.id
        WHERE uc.category_id = ?
    ");
    $stmt->execute([$catId]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($results as $r) {
        echo "ID: {$r['user_id']} | Email: {$r['email']} | Role: {$r['role']} | AdminID: '{$r['admin_id']}'\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
