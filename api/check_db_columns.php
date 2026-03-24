<?php
// api/check_db_columns.php
require_once 'db_connect.php';

function printTableColumns($pdo, $table)
{
    echo "<h3>Table: $table</h3>";
    try {
        $stmt = $pdo->prepare("DESCRIBE $table");
        $stmt->execute();
        $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo "Columns: " . implode(', ', $cols) . "<hr>";
        return $cols;
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "<hr>";
        return [];
    }
}

echo "<h2>Database Schema Check</h2>";
printTableColumns($pdo, 'subscriber_activity');
printTableColumns($pdo, 'subscribers');
printTableColumns($pdo, 'timestamp_buffer');
printTableColumns($pdo, 'activity_buffer');
?>