<?php
// api/migrate_clean_bot_logs.php
require_once 'db_connect.php';

if (php_sapi_name() !== 'cli') {
    header('Content-Type: text/plain; charset=utf-8');
}

echo "MIGRATION TOOL: CLEAN OLD 'BOT SENT' LOGS\n";
echo "==========================================\n\n";

try {
    // 1. Check count of 'bot_sent' logs
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM meta_customer_journey WHERE event_type = 'bot_sent'");
    $stmt->execute();
    $count = $stmt->fetchColumn();

    echo "Found " . number_format($count) . " logs with event_type = 'bot_sent' (Bot gửi tin nhắn).\n";

    if ($count > 0) {
        $doDelete = false;

        // Check for confirmation flag (CLI arg 'confirm' or URL param ?confirm=1)
        if (isset($_GET['confirm']) && $_GET['confirm'] == 1) {
            $doDelete = true;
        } elseif (isset($argv[1]) && $argv[1] === 'confirm') {
            $doDelete = true;
        }

        if ($doDelete) {
            echo "Attempting to delete...\n";
            $stmtDel = $pdo->prepare("DELETE FROM meta_customer_journey WHERE event_type = 'bot_sent'");
            $stmtDel->execute();
            echo "SUCCESS: Deleted " . number_format($stmtDel->rowCount()) . " logs.\n";
            echo "Database size reduced.\n";
        } else {
            echo "\n[INFO] Dry Run Mode. To execute deletion:\n";
            echo "  - Browser: ?confirm=1\n";
            echo "  - CLI: php api/migrate_clean_bot_logs.php confirm\n";
        }
    } else {
        echo "System is clean. No old bot logs found.\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
?>