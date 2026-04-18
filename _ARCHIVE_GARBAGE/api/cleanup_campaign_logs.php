<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$cid = '6985cffc6c490';
echo "CLEANING CAMPAIGN INTERACTION LOGS\n";
echo "==================================\n\n";

if (!isset($_GET['commit'])) {
    echo "DRY RUN MODE. Add ?commit=1 to actually unlink flow logs.\n\n";
}

try {
    // These types belong to FLOWS, not CAMPAIGNS directly.
    $noisyTypes = [
        'complete_flow',
        'condition_false',
        'condition_true',
        'update_tag',
        'enter_flow',
        'wait_processed',
        'wait_start'
    ];

    $placeholders = implode(',', array_fill(0, count($noisyTypes), '?'));

    // 1. Count how many records will be affected
    $stmtCount = $pdo->prepare("SELECT type, COUNT(*) as count FROM subscriber_activity WHERE campaign_id = ? AND type IN ($placeholders) GROUP BY type");
    $stmtCount->execute(array_merge([$cid], $noisyTypes));
    $results = $stmtCount->fetchAll(PDO::FETCH_ASSOC);

    if (empty($results)) {
        echo "No flow-related logs found linked to this campaign.\n";
    } else {
        $totalToUnlink = 0;
        foreach ($results as $res) {
            echo " - Found {$res['count']} records of type '{$res['type']}' to be unlinked.\n";
            $totalToUnlink += $res['count'];
        }
        echo "\nTotal records to unlink: $totalToUnlink\n";

        if (isset($_GET['commit']) && $totalToUnlink > 0) {
            echo "Unlinking flow logs from Campaign $cid...\n";
            $pdo->beginTransaction();
            $stmtUpdate = $pdo->prepare("UPDATE subscriber_activity SET campaign_id = NULL WHERE campaign_id = ? AND type IN ($placeholders)");
            $stmtUpdate->execute(array_merge([$cid], $noisyTypes));
            $pdo->commit();
            echo "Successfully unlinked $totalToUnlink records.\n";
        }
    }

    echo "\nCleanup complete.\n";

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    echo "Error: " . $e->getMessage();
}
