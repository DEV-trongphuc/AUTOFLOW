<?php
require_once 'db_connect.php';

try {
    // Add columns to subscribers table if they don't exist
    $columns = [
        'last_device' => "VARCHAR(100) DEFAULT NULL",
        'last_browser' => "VARCHAR(100) DEFAULT NULL",
        'last_os' => "VARCHAR(100) DEFAULT NULL",
        'last_city' => "VARCHAR(100) DEFAULT NULL",
        'last_country' => "VARCHAR(100) DEFAULT NULL",
        'last_ip' => "VARCHAR(45) DEFAULT NULL"
    ];

    foreach ($columns as $col => $def) {
        try {
            $pdo->exec("ALTER TABLE subscribers ADD COLUMN $col $def");
            echo "Added column $col\n";
        } catch (Exception $e) {
            // Probably already exists
        }
    }

    echo "Migration complete.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
