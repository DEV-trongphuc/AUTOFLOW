<?php
require_once dirname(__DIR__) . '/db_connect.php';

try {
    $pdo->exec("ALTER TABLE stats_update_buffer MODIFY COLUMN target_table VARCHAR(50) NOT NULL");
    echo "SUCCESS: Changed target_table to VARCHAR(50)\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
