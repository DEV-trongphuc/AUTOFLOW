<?php
require_once 'db_connect.php';
try {
    $stmt = $pdo->query("SHOW TABLES LIKE 'ai_org_user_categories'");
    echo "Table ai_org_user_categories: " . ($stmt->rowCount() > 0 ? "EXISTS" : "MISSING") . "\n";
    if ($stmt->rowCount() > 0) {
        $stmt = $pdo->query("DESCRIBE ai_org_user_categories");
        print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
