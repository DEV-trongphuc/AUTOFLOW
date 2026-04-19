<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$cid = '6985cffc6c490';
echo "CLICK DATA RECOVERY TOOL\n";
echo "========================\n\n";

if (!isset($_GET['commit'])) {
    echo "DRY RUN MODE. Add ?commit=1 to actually restore data.\n\n";
}

try {
    // 1. Get unique clickers from cache
    $stmt = $pdo->prepare("SELECT subscriber_id, created_at FROM tracking_unique_cache WHERE target_id = ? AND event_type = 'click'");
    $stmt->execute([$cid]);
    $cacheClicks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $totalCache = count($cacheClicks);
    echo "Total unique clickers recorded in Cache: $totalCache\n";

    $reconstructedCount = 0;
    if ($totalCache > 0) {
        $pdo->beginTransaction();
        foreach ($cacheClicks as $row) {
            $sid = $row['subscriber_id'];
            $clickedAt = $row['created_at'];

            // Check if activity record exists
            $stmtCheck = $pdo->prepare("SELECT id FROM subscriber_activity WHERE subscriber_id = ? AND campaign_id = ? AND type = 'click_link' LIMIT 1");
            $stmtCheck->execute([$sid, $cid]);
            if (!$stmtCheck->fetch()) {
                // Record is missing! 
                if (isset($_GET['commit'])) {
                    $insert = $pdo->prepare("INSERT INTO subscriber_activity (subscriber_id, type, campaign_id, reference_name, details, created_at) VALUES (?, 'click_link', ?, 'Email Click', 'Clicked link (Restored from Cache)', ?)");
                    $insert->execute([$sid, $cid, $clickedAt]);
                }
                $reconstructedCount++;
            }
        }
        if (isset($_GET['commit']))
            $pdo->commit();
        else
            $pdo->rollBack();
    }

    echo "Missing 'click_link' logs to reconstruct: $reconstructedCount\n\n";

    // 2. Find orphaned clicks (CID is null)
    $stmtOrphans = $pdo->prepare("
        SELECT COUNT(*) 
        FROM subscriber_activity sa
        JOIN mail_delivery_logs mdl ON sa.subscriber_id = mdl.subscriber_id
        WHERE sa.type = 'click_link' 
        AND (sa.campaign_id IS NULL OR sa.campaign_id = '')
        AND mdl.campaign_id = ?
    ");
    $stmtOrphans->execute([$cid]);
    $orphanCount = $stmtOrphans->fetchColumn();
    echo "Orphaned Click Logs found (Missing CID): $orphanCount\n";

    if (isset($_GET['commit']) && $orphanCount > 0) {
        echo "Linking orphan click logs...\n";
        $pdo->beginTransaction();
        $pdo->prepare("
            UPDATE subscriber_activity sa
            JOIN mail_delivery_logs mdl ON sa.subscriber_id = mdl.subscriber_id
            SET sa.campaign_id = mdl.campaign_id
            WHERE sa.type = 'click_link' 
            AND (sa.campaign_id IS NULL OR sa.campaign_id = '')
            AND mdl.campaign_id = ?
        ")->execute([$cid]);
        $pdo->commit();
        echo "Successfully linked orphan clicks.\n";
    }

    if (isset($_GET['commit'])) {
        echo "\nRefreshing campaign statistics...\n";
        $stmtSync = $pdo->prepare("
            UPDATE campaigns c 
            SET 
                count_unique_clicked = (SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = c.id AND type = 'click_link'),
                count_clicked = (SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = c.id AND type = 'click_link')
            WHERE id = ?
        ");
        $stmtSync->execute([$cid]);
        echo "Campaign table stats updated.\n";
    }

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    echo "Error: " . $e->getMessage();
}
