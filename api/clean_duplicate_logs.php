<?php
// api/clean_duplicate_logs.php
require_once 'db_connect.php';

echo "<pre>--- CLEANING DUPLICATE COMPLETION LOGS --- \n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

    // Find subscribers with more than 1 'enter_flow' or other progress logs
    $stmt = $pdo->prepare("SELECT subscriber_id, type, COUNT(*) as c FROM subscriber_activity WHERE flow_id = ? AND type IN ('enter_flow', 'update_tag', 'condition_true') GROUP BY subscriber_id, type HAVING c > 1");
    $stmt->execute([$fid]);
    $dupes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Found " . count($dupes) . " sets of duplicate logs.\n";

    foreach ($dupes as $d) {
        $sid = $d['subscriber_id'];
        $type = $d['type'];
        $keepCount = 1;
        $toDelete = $d['c'] - $keepCount;

        // Delete only the extra logs, keeping the first one
        $stmtDel = $pdo->prepare("DELETE FROM subscriber_activity WHERE subscriber_id = ? AND flow_id = ? AND type = ? LIMIT $toDelete");
        $stmtDel->execute([$sid, $fid, $type]);
        echo "  - Deleted $toDelete duplicate(s) of type '$type' for Sub: $sid\n";
    }

    echo "\nCleanup finished! Your dashboard stats and 'SỐ LẦN' counts will now be 1.";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
