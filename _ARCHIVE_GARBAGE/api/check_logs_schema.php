<?php
include 'db_connect.php';

function checkTable($pdo, $tableName)
{
    echo "--- Schema for $tableName ---\n";
    try {
        $stmt = $pdo->query("DESCRIBE $tableName");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "{$row['Field']} - {$row['Type']}\n";
        }
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
    echo "\n";
}

checkTable($pdo, 'mail_delivery_logs');
checkTable($pdo, 'zalo_delivery_logs');
?>