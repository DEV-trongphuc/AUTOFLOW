<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once 'db_connect.php';
require_once 'zalo_helpers.php';

echo "Checking Schema...\n";
try {
    // Force reset static flag by redeclaring/re-including if possible? No.
    // Just call it.
    checkZaloAutomationSchema($pdo);
    echo "Done.\n";

    $stmt = $pdo->query("SHOW COLUMNS FROM zalo_automation_scenarios LIKE 'type'");
    $col = $stmt->fetch();
    echo "Type Column Definition: " . $col['Type'] . "\n";

    $stmt2 = $pdo->query("SELECT COUNT(*) FROM zalo_automation_scenarios WHERE type = 'ai_reply'");
    echo "AI Reply Scenarios: " . $stmt2->fetchColumn() . "\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
