<?php
require_once 'db_connect.php';

try {
    $pdo->exec("ALTER TABLE segments ADD COLUMN notify_on_join BOOLEAN DEFAULT FALSE");
    $pdo->exec("ALTER TABLE segments ADD COLUMN notify_subject VARCHAR(255) NULL");
    $pdo->exec("ALTER TABLE segments ADD COLUMN notify_email VARCHAR(255) NULL");
    $pdo->exec("ALTER TABLE segments ADD COLUMN notify_cc VARCHAR(255) NULL");
    echo "Columns added successfully.\n";
} catch (Exception $e) {
    echo "Error (maybe already exist?): " . $e->getMessage() . "\n";
}
?>
