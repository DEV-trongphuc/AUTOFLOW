<?php
require_once 'db_connect.php';

$logFile = 'verify_log_output.txt';
$fp = fopen($logFile, 'w');

try {
    // 1. Check Table Existence
    $stmt = $pdo->query("SHOW TABLES LIKE 'admin_logs'");
    if ($stmt->fetch()) {
        fwrite($fp, "Table 'admin_logs' exists.\n");
    } else {
        fwrite($fp, "Table 'admin_logs' DOES NOT exist.\n");
    }

    // 2. Check if any logs exist (from my previous manual test calls or system usage)
    $stmt = $pdo->query("SELECT count(*) FROM admin_logs");
    $count = $stmt->fetchColumn();
    fwrite($fp, "Current log count: " . $count . "\n");

} catch (Exception $e) {
    fwrite($fp, "Error: " . $e->getMessage() . "\n");
}

fclose($fp);
?>