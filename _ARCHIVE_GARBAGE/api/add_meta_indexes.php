<?php
require_once 'db_connect.php';

echo "<h2>Optimizing Database Performance...</h2>";

function addIndexIfNotExists($pdo, $table, $indexName, $columns)
{
    try {
        $check = $pdo->query("SHOW INDEX FROM $table WHERE Key_name = '$indexName'")->fetch();
        if (!$check) {
            echo "Adding index <b>$indexName</b> to table <b>$table</b>... ";
            $sql = "ALTER TABLE $table ADD INDEX $indexName ($columns)";
            $pdo->exec($sql);
            echo "<span style='color:green'>Done.</span><br>";
        } else {
            echo "Index <b>$indexName</b> already exists on <b>$table</b>. <span style='color:gray'>Skipped.</span><br>";
        }
    } catch (Exception $e) {
        echo "<span style='color:red'>Error: " . $e->getMessage() . "</span><br>";
    }
}

// 1. Optimize Meta Message Logs for Reporting
// We need to valid filter by page_id, direction, and date range efficiently.
// Including psid in the index allows 'Using index' for COUNT(DISTINCT psid) queries (Covering Index).
addIndexIfNotExists($pdo, 'meta_message_logs', 'idx_report_opt', 'page_id, direction, created_at, psid');

// 2. Optimize Meta Subscribers for Growth Reports
// We filter by page_id and created_at range.
addIndexIfNotExists($pdo, 'meta_subscribers', 'idx_page_created', 'page_id, created_at');

echo "<br><b>Optimization Complete!</b> You can now close this page.";
?>