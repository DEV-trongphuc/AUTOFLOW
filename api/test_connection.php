<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Testing database connection...\n";

try {
    require_once __DIR__ . '/../db_connect.php';
    echo "✓ Database connected successfully!\n";

    // Test query
    $stmt = $pdo->query("SELECT COUNT(*) FROM subscribers");
    $count = $stmt->fetchColumn();
    echo "✓ Found $count subscribers in database\n";

} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
