<?php
require_once 'db_connect.php';
try {
    $tables = ['zalo_lists', 'zalo_subscribers', 'zalo_broadcasts', 'zalo_oa_configs'];
    foreach ($tables as $t) {
        $stmt = $pdo->query("SHOW TABLE STATUS LIKE '$t'");
        $res = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "Table: $t, Collation: " . $res['Collation'] . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
