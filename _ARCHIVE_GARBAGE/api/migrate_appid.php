<?php
require_once 'db_connect.php';
try {
    $pdo->exec("ALTER TABLE meta_app_configs ADD COLUMN app_id VARCHAR(255) AFTER page_id");
    echo "Column app_id added successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>