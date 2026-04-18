<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
echo "PHP IS WORKING\n";
try {
    require_once 'db_connect.php';
    echo "DB CONNECTED\n";
    $stmt = $pdo->query("SELECT COUNT(*) FROM campaigns");
    echo "CAMPAIGNS COUNT: " . $stmt->fetchColumn() . "\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
