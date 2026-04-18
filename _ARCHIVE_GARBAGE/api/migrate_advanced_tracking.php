<?php
require_once 'db_connect.php';

$cols = [
    'last_os' => 'VARCHAR(50) NULL',
    'last_device' => 'VARCHAR(50) NULL',
    'last_browser' => 'VARCHAR(50) NULL',
    'last_city' => 'VARCHAR(100) NULL',
    'last_country' => 'VARCHAR(100) NULL'
];

foreach ($cols as $col => $def) {
    try {
        $pdo->query("SELECT $col FROM subscribers LIMIT 1");
        echo "Column $col exists.\n";
    } catch (Exception $e) {
        echo "Adding column $col...\n";
        $pdo->exec("ALTER TABLE subscribers ADD COLUMN $col $def");
    }
}

echo "Schema check complete.\n";
?>