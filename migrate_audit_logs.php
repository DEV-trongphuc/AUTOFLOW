<?php
require_once __DIR__ . '/api/db_connect.php';

$sql = file_get_contents(__DIR__ . '/create_system_audit_logs.sql');
try {
    $pdo->exec($sql);
    echo "Table system_audit_logs created successfully.\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
