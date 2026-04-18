<?php
require_once 'db_connect.php';

$tables = ['ai_chatbot_settings', 'zalo_automation_scenarios'];
foreach ($tables as $table) {
    echo "Table: $table\n";
    $stmt = $pdo->query("SHOW FULL COLUMNS FROM $table");
    while ($row = $stmt->fetch()) {
        echo "  Field: {$row['Field']}, Collation: {$row['Collation']}\n";
    }
}
