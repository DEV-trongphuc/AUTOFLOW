<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$cid = '6985cffc6c490';
echo "SOLVING THE HIDDEN OPENS MYSTERY\n";
echo "===============================\n\n";

try {
    // 1. Get ALL unique subscriber IDs from the cache for this campaign
    $stmt = $pdo->prepare("SELECT subscriber_id FROM tracking_unique_cache WHERE target_id = ? AND event_type = 'open'");
    $stmt->execute([$cid]);
    $cacheSubs = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $totalCache = count($cacheSubs);
    echo "Found $totalCache unique subscribers in Cache.\n\n";

    if ($totalCache > 0) {
        echo "Checking where their 'open_email' logs are:\n";

        $placeholders = implode(',', array_fill(0, $totalCache, '?'));
        // Find ANY open_email for these subscribers in the last 7 days
        $sql = "SELECT subscriber_id, campaign_id, flow_id, created_at 
                FROM subscriber_activity 
                WHERE type = 'open_email' 
                AND subscriber_id IN ($placeholders)
                ORDER BY subscriber_id, created_at DESC";

        $stmtAct = $pdo->prepare($sql);
        $stmtAct->execute($cacheSubs);
        $activities = $stmtAct->fetchAll(PDO::FETCH_ASSOC);

        $foundInActivity = [];
        $orphans = [];
        $mislinked = [];

        foreach ($activities as $act) {
            $foundInActivity[$act['subscriber_id']] = true;
            if ($act['campaign_id'] === $cid) {
                // Correctly linked (one of the 2)
            } elseif (!$act['campaign_id']) {
                $orphans[] = $act;
            } else {
                $mislinked[] = $act;
            }
        }

        echo " - Subscribers with CORRECT CID: " . (count($cacheSubs) - count(array_diff($cacheSubs, array_column(array_filter($activities, function ($a) use ($cid) {
            return $a['campaign_id'] === $cid; }), 'subscriber_id')))) . "\n";
        echo " - Subscribers with NULL CID: " . count(array_unique(array_column($orphans, 'subscriber_id'))) . "\n";
        echo " - Subscribers with DIFFERENT CID: " . count(array_unique(array_column($mislinked, 'subscriber_id'))) . "\n";

        if (count($cacheSubs) > count($foundInActivity)) {
            echo " - Subscribers with NO 'open_email' record at all: " . (count($cacheSubs) - count($foundInActivity)) . "\n";

            // Re-check: Maybe they were never logged? Or logged as something else?
            $missingIds = array_diff($cacheSubs, array_keys($foundInActivity));
            echo "\nSample Missing ID: " . reset($missingIds) . "\n";

            // Check ANY activity for one missing ID
            $stmtTrail = $pdo->prepare("SELECT type, campaign_id, flow_id, details, created_at FROM subscriber_activity WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 5");
            $stmtTrail->execute([reset($missingIds)]);
            echo "Activity Trail for missing ID:\n";
            print_r($stmtTrail->fetchAll(PDO::FETCH_ASSOC));
        }

        // Potential Fix: If we have Orphans, link them.
        if (!empty($orphans)) {
            echo "\nAction: Re-linking orphans...\n";
            $orphanSubIds = array_unique(array_column($orphans, 'subscriber_id'));
            $placeholdersUpdate = implode(',', array_fill(0, count($orphanSubIds), '?'));
            $stmtUpd = $pdo->prepare("UPDATE subscriber_activity SET campaign_id = ? WHERE subscriber_id IN ($placeholdersUpdate) AND type = 'open_email' AND (campaign_id IS NULL OR campaign_id = '')");
            $stmtUpd->execute(array_merge([$cid], $orphanSubIds));
            echo "Linked " . $stmtUpd->rowCount() . " orphan opens.\n";
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
