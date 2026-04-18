<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once 'db_connect.php';

echo "<h2>Fixing Meta Schema...</h2>";

try {
    // Check if column exists
    $stmt = $pdo->query("SHOW COLUMNS FROM meta_subscribers LIKE 'profile_link'");
    $col = $stmt->fetch();

    if ($col) {
        echo "✅ Column 'profile_link' already exists.<br>";
    } else {
        echo "⏳ Adding 'profile_link' column...<br>";
        $pdo->exec("ALTER TABLE meta_subscribers ADD COLUMN profile_link VARCHAR(512) DEFAULT NULL");
        echo "✅ Successfully added 'profile_link' column.<br>";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "<br>";
}
?>