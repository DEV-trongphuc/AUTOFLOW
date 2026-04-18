<?php
require_once 'db_connect.php';
echo "<pre>--- FLOWS TABLE SCHEMA ---\n";
try {
    $stmt = $pdo->query("DESCRIBE flows");
    foreach ($stmt->fetchAll() as $row) {
        echo "{$row['Field']} - {$row['Type']}\n";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
