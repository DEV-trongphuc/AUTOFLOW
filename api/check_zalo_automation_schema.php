<?php
require_once 'db_connect.php';
if (ob_get_level())
    ob_end_clean();
header('Content-Type: text/plain; charset=UTF-8');

echo "Table: zalo_automation_scenarios\n";
try {
    $stmt = $pdo->query("DESCRIBE zalo_automation_scenarios");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\nTable: meta_automation_scenarios\n";
try {
    $stmt = $pdo->query("DESCRIBE meta_automation_scenarios");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
