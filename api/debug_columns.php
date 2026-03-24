<?php
require_once 'db_connect.php';
$table = 'subscriber_activity';
try {
    $stmt = $pdo->query("DESCRIBE `$table` ");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Columns for $table:\n";
    foreach ($columns as $col) {
        echo $col['Field'] . " (" . $col['Type'] . ")\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>