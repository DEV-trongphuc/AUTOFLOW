<?php
require_once 'db_connect.php';

try {
    $pdo->exec("ALTER TABLE campaigns ADD COLUMN total_target_audience INT(11) DEFAULT 0");
    echo "Column 'total_target_audience' added successfully.";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column 'total_target_audience' already exists.";
    } else {
        echo "Error: " . $e->getMessage();
    }
}
?>
