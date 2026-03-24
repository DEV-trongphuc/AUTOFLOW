<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$cid = '6985cffc6c490';
echo "OPEN DISCREPANCY DEEP DIVE\n";
echo "==========================\n\n";

try {
    // 1. Get all unique subscribers from the cache who opened this campaign
    $stmt = $pdo->prepare("SELECT subscriber_id FROM tracking_unique_cache WHERE target_id = ? AND event_type = 'open'");
    $stmt->execute([$cid]);
    $cacheSubs = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $totalInCache = count($cacheSubs);
    echo "Total unique openers in CACHE: $totalInCache\n";

    if ($totalInCache > 0) {
        // Check how many of these have records in subscriber_activity with THIS campaign_id
        $placeholders = implode(',', array_fill(0, $totalInCache, '?'));
        $sql = "SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = ? AND subscriber_id IN ($placeholders) AND type = 'open_email'";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_merge([$cid], $cacheSubs));
        $countInActivity = $stmt->fetchColumn();
        echo "Opener IDs that have 'open_email' linked to this CID: $countInActivity\n";

        // Check how many of these have 'open_email' but NO campaign_id (Orphans)
        $sqlOrphan = "SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE (campaign_id IS NULL OR campaign_id = '') AND subscriber_id IN ($placeholders) AND type = 'open_email'";
        $stmtOrphan = $pdo->prepare($sqlOrphan);
        $stmtOrphan->execute($cacheSubs);
        $countOrphans = $stmtOrphan->fetchColumn();
        echo "Opener IDs that have 'open_email' but NO CID linked: $countOrphans\n";

        // Sample one of these orphans to see why it wasn't caught
        if ($countOrphans > 0) {
            $sqlSample = "SELECT sa.*, mdl.sent_at as del_sent_at 
                          FROM subscriber_activity sa 
                          JOIN mail_delivery_logs mdl ON sa.subscriber_id = mdl.subscriber_id
                          WHERE (sa.campaign_id IS NULL OR sa.campaign_id = '') 
                          AND sa.subscriber_id IN ($placeholders) 
                          AND sa.type = 'open_email' 
                          AND mdl.campaign_id = ?
                          LIMIT 1";
            $stmtSample = $pdo->prepare($sqlSample);
            $stmtSample->execute(array_merge($cacheSubs, [$cid]));
            $sample = $stmtSample->fetch(PDO::FETCH_ASSOC);
            echo "\nSample Orphan Detail:\n";
            print_r($sample);
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
