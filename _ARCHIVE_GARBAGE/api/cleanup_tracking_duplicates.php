<?php
require_once 'db_connect.php';

echo "Scanning for duplicate clicks in subscriber_activity...<br>\n";

// Keep the first click for a given subscriber, campaign, and minute
$sql = "
    SELECT min(id) as keep_id, subscriber_id, campaign_id, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as minute
    FROM subscriber_activity
    WHERE type = 'click_link' AND campaign_id IS NOT NULL
    GROUP BY subscriber_id, campaign_id, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i')
    HAVING count(*) > 1
";

$stmt = $pdo->query($sql);
$duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($duplicates)) {
    echo "No duplicates found.<br>\n";
    exit;
}

$totalDeleted = 0;
foreach ($duplicates as $dup) {
    $keepId = $dup['keep_id'];
    $subId = $dup['subscriber_id'];
    $cid = $dup['campaign_id'];
    $minute = $dup['minute'];
    
    // Find all ids for this group except keepId
    $delStmt = $pdo->prepare("
        SELECT id FROM subscriber_activity 
        WHERE type = 'click_link' 
        AND subscriber_id = ? 
        AND campaign_id = ? 
        AND DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') = ? 
        AND id != ?
    ");
    $delStmt->execute([$subId, $cid, $minute, $keepId]);

    $idsToDelete = $delStmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (!empty($idsToDelete)) {
        $placeholders = str_repeat('?,', count($idsToDelete) - 1) . '?';
        $pdo->prepare("DELETE FROM subscriber_activity WHERE id IN ($placeholders)")->execute($idsToDelete);
        $totalDeleted += count($idsToDelete);
    }
}

echo "<strong>Deleted $totalDeleted duplicate click logs.</strong><br>\n";

// Recalculate campaign clicks
echo "Recalculating campaign stats...<br>\n";
$campaignsStmt = $pdo->query("SELECT id FROM campaigns");
while ($camp = $campaignsStmt->fetch()) {
    $cid = $camp['id'];
    
    $countStmt = $pdo->prepare("SELECT count(*) FROM subscriber_activity WHERE type = 'click_link' AND campaign_id = ?");
    $countStmt->execute([$cid]);
    $actualClicks = $countStmt->fetchColumn();
    
    // Also recount unique clicks (1 click per subscriber)
    $uniqStmt = $pdo->prepare("SELECT count(DISTINCT subscriber_id) FROM subscriber_activity WHERE type = 'click_link' AND campaign_id = ?");
    $uniqStmt->execute([$cid]);
    $uniqClicks = $uniqStmt->fetchColumn();
    
    // Update campaign
    $pdo->prepare("UPDATE campaigns SET count_clicked = ?, stat_clicks = ?, count_unique_clicked = ? WHERE id = ?")->execute([$actualClicks, $actualClicks, $uniqClicks, $cid]);
}

echo "<br><b>Done!</b> Please delete this file from the server when finished.<br>\n";
