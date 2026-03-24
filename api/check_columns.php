<?php
require_once 'db_connect.php';
try {
    $stmt = $pdo->query("DESCRIBE forms");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Columns: " . implode(', ', $columns);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
