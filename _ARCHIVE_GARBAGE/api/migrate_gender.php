<?php
require_once 'db_connect.php';

try {
    // Check if gender column exists
    $stmt = $pdo->prepare("SHOW COLUMNS FROM ai_org_users LIKE 'gender'");
    $stmt->execute();
    $column = $stmt->fetch();

    if (!$column) {
        // Add gender column
        $pdo->exec("ALTER TABLE ai_org_users ADD COLUMN gender enum('male', 'female', 'other') DEFAULT NULL AFTER full_name");
        echo "Successfully added 'gender' column to ai_org_users table.\n";
    } else {
        echo "'gender' column already exists in ai_org_users table.\n";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>