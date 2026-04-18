<?php
require_once 'db_connect.php';

// Show current state
$stmt = $pdo->query("SELECT id, email, full_name, role, status FROM ai_org_users ORDER BY id LIMIT 10");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "<h3>Current ai_org_users:</h3><pre>";
print_r($users);
echo "</pre>";

// Update user ID 2 to admin role
$update = $pdo->prepare("UPDATE ai_org_users SET role = 'admin' WHERE id = 2");
$update->execute();
echo "<p style='color:green'>Updated user ID=2 to role='admin'. Rows affected: " . $update->rowCount() . "</p>";

// Also show session info
echo "<h3>Session:</h3><pre>";
print_r($_SESSION);
echo "</pre>";

echo "<p>Done! <a href='ai_training.php?action=list_docs&property_id=ce71ea2e-d841-4e0f-b3ad-332297cde330'>Test list_docs</a></p>";
