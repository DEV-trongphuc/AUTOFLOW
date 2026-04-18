<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$cid = '6985cffc6c490';
echo "FINAL RECOVERY: RECONSTRUCTING MISSING OPEN LOGS\n";
echo "=================================================\n\n";

if (!isset($_GET['commit'])) {
    echo "DRY RUN MODE. Add ?commit=1 to actually restore data.\n\n";
}

try {
    // 1. Get all unique openers from the cache
    $stmt = $pdo->prepare("SELECT subscriber_id, created_at FROM tracking_unique_cache WHERE target_id = ? AND event_type = 'open'");
    $stmt->execute([$cid]);
    $cacheOpens = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $totalInCache = count($cacheOpens);
    echo "Total unique openers recorded in Cache: $totalInCache\n";

    if ($totalInCache > 0) {
        $recoveredCount = 0;
        $pdo->beginTransaction();

        foreach ($cacheOpens as $row) {
            $sid = $row['subscriber_id'];
            $openedAt = $row['created_at'];

            // Check if activity record exists
            $stmtCheck = $pdo->prepare("SELECT id FROM subscriber_activity WHERE subscriber_id = ? AND campaign_id = ? AND type = 'open_email' LIMIT 1");
            $stmtCheck->execute([$sid, $cid]);
            if (!$stmtCheck->fetch()) {
                // Record is missing! Reconstruct it.
                if (isset($_GET['commit'])) {
                    $insert = $pdo->prepare("INSERT INTO subscriber_activity (subscriber_id, type, campaign_id, reference_name, details, created_at) VALUES (?, 'open_email', ?, 'Email Open', 'Opened Email (Restored from Cache)', ?)");
                    $insert->execute([$sid, $cid, $openedAt]);
                }
                $recoveredCount++;
            }
        }

        if (isset($_GET['commit'])) {
            $pdo->commit();
            echo "Successfully RECONSTRUCTED $recoveredCount missing 'open_email' logs.\n";

            // Sync stats
            echo "Refreshing campaign statistics...\n";
            $stmtSync = $pdo->prepare("
                UPDATE campaigns c 
                SET 
                    count_unique_opened = (SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = c.id AND type = 'open_email'),
                    count_opened = (SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = c.id AND type = 'open_email')
                WHERE id = ?
            ");
            $stmtSync->execute([$cid]);
            echo "Campaign table stats updated.\n";
        } else {
            $pdo->rollBack();
            echo "Will RECONSTRUCT $recoveredCount missing 'open_email' logs.\n";
        }
    }

    echo "\nRecovery check complete.\n";

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    echo "Error: " . $e->getMessage();
}
