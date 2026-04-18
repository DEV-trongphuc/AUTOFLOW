<?php
require_once 'db_connect.php';
if (ob_get_level())
    ob_end_clean();
header('Content-Type: text/plain; charset=UTF-8');

echo "MIGRATION START\n";

$tables = ['zalo_automation_scenarios', 'meta_automation_scenarios'];

foreach ($tables as $table) {
    echo "Processing $table...\n";
    try {
        $sql = "ALTER TABLE `$table` MODIFY COLUMN active_days TEXT";
        echo "Executing: $sql\n";
        $res = $pdo->exec($sql);
        echo "Result: SUCCESS (Affected: $res)\n";
    } catch (Exception $e) {
        echo "Error on $table: " . $e->getMessage() . "\n";
    }

    echo "Checking schema for $table:\n";
    try {
        $stmt = $pdo->query("DESCRIBE `$table` active_days");
        print_r($stmt->fetch(PDO::FETCH_ASSOC));
    } catch (Exception $e) {
        echo "Error checking: " . $e->getMessage() . "\n";
    }
    echo "---------------------------\n";
}

echo "MIGRATION END\n";
