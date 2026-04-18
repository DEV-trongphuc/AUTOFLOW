<?php
require_once 'db_connect.php';

try {
    $pdo->exec("ALTER TABLE meta_subscribers ADD COLUMN notes longtext DEFAULT '[]'");
    echo "SUCCESS: Column 'notes' added to meta_subscribers.\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "NOTE: Column 'notes' already exists.\n";
    } else {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
}
