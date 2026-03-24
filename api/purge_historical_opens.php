<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$cid = '6985cffc6c490';
echo "CAMPAIGN DATA POLISHING TOOL\n";
echo "============================\n\n";

if (!isset($_GET['commit'])) {
    echo "DRY RUN MODE. Add ?commit=1 to actually apply changes.\n\n";
}

try {
    // 1. Get Campaign Sent Time
    $stmt = $pdo->prepare("SELECT name, sent_at FROM campaigns WHERE id = ?");
    $stmt->execute([$cid]);
    $camp = $stmt->fetch();

    if (!$camp || !$camp['sent_at']) {
        die("Campaign $cid not found or not yet sent.\n");
    }

    $sentAt = $camp['sent_at'];
    echo "Campaign: {$camp['name']}\n";
    echo "Sent At: $sentAt\n\n";

    // --- PHASE 1: PURGE HISTORICAL OPENS ---
    // Remove links to any opens that happened BEFORE the campaign was actually sent
    $stmtHistory = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = ? AND type = 'open_email' AND created_at < ?");
    $stmtHistory->execute([$cid, $sentAt]);
    $historicalCount = $stmtHistory->fetchColumn();

    echo "Found $historicalCount historical opens (pre-launch) currently linked to this campaign.\n";

    if (isset($_GET['commit']) && $historicalCount > 0) {
        $pdo->prepare("UPDATE subscriber_activity SET campaign_id = NULL WHERE campaign_id = ? AND type = 'open_email' AND created_at < ?")
            ->execute([$cid, $sentAt]);
        echo " -> Applied: Unlinked historical records.\n";
    }

    // --- PHASE 2: BURST DEDUPLICATION (Security Scanner / Rapid Fire opens) ---
    // If a subscriber opened multiple times within the same 60 seconds, we'll keep only the first one for this campaign report.
    echo "\nIdentifying burst opens (multiple events within 60 seconds)...\n";

    $stmtBursts = $pdo->prepare("
        SELECT t1.id 
        FROM subscriber_activity t1
        JOIN subscriber_activity t2 ON t1.subscriber_id = t2.subscriber_id 
            AND t1.type = t2.type 
            AND t1.campaign_id = t2.campaign_id
        WHERE t1.campaign_id = ? 
        AND t1.type = 'open_email'
        AND t2.id < t1.id
        AND t1.created_at >= t2.created_at
        AND t1.created_at <= DATE_ADD(t2.created_at, INTERVAL 60 SECOND)
    ");
    $stmtBursts->execute([$cid]);
    $burstIds = $stmtBursts->fetchAll(PDO::FETCH_COLUMN);
    $burstCount = count($burstIds);

    echo "Found $burstCount duplicate 'burst' opens to clean up.\n";

    if (isset($_GET['commit']) && $burstCount > 0) {
        $placeholders = implode(',', array_fill(0, count($burstIds), '?'));
        $pdo->prepare("UPDATE subscriber_activity SET campaign_id = NULL WHERE id IN ($placeholders)")
            ->execute($burstIds);
        echo " -> Applied: Unlinked $burstCount burst records.\n";
    }

    // --- PHASE 3: RECALCULATE FINAL STATS ---
    if (isset($_GET['commit'])) {
        echo "\nRefreshing campaign statistics table...\n";
        $stmtSync = $pdo->prepare("
            UPDATE campaigns c 
            SET 
                count_unique_opened = (SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = c.id AND type = 'open_email'),
                count_opened = (SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = c.id AND type = 'open_email')
            WHERE id = ?
        ");
        $stmtSync->execute([$cid]);
        echo "Campaign table stats updated.\n";
    }

    echo "\nPolishing complete.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
