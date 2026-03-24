<?php
require_once 'db_connect.php';
require_once 'segment_helper.php';

$cid = '6985cffc6c490';
$stmt = $pdo->prepare("SELECT * FROM campaigns WHERE id = ?");
$stmt->execute([$cid]);
$campaign = $stmt->fetch();

$target = json_decode($campaign['target_config'], true);
$wheres = [];
$params = [];

if (!empty($target['listIds'])) {
    $ids = implode("','", $target['listIds']);
    $wheres[] = "s.id IN (SELECT subscriber_id FROM subscriber_lists WHERE list_id IN ('$ids'))";
}
// ... (simplified check for generic active status)

$sql = "SELECT COUNT(*) FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer')";
if (!empty($wheres)) {
    $sql .= " AND (" . implode(' OR ', $wheres) . ")";
}

$stmtCount = $pdo->prepare($sql);
$stmtCount->execute($params);
$totalInTables = $stmtCount->fetchColumn();

// Check how many already sent
$stmtSent = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = ?");
$stmtSent->execute([$cid]);
$sentCount = $stmtSent->fetchColumn();

echo "Total potential: $totalInTables\r\n";
echo "Already sent in activity: $sentCount\r\n";

// Check the query logic specifically
$lastScannedId = '0';
$BATCH_SIZE = 1000;
$sqlCheck = "SELECT COUNT(*) FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer') AND s.id > ?";
if (!empty($wheres))
    $sqlCheck .= " AND (" . implode(' OR ', $wheres) . ")";
$sqlCheck .= " AND NOT EXISTS (
    SELECT 1 FROM subscriber_activity sa 
    WHERE sa.subscriber_id = s.id 
    AND (sa.type IN ('receive_email', 'failed_email', 'zalo_sent', 'meta_sent', 'zns_sent', 'zns_failed', 'enter_flow')) 
    AND sa.campaign_id = ?
)";

$stmtCheck = $pdo->prepare($sqlCheck);
$stmtCheck->execute([$lastScannedId, $cid]);
echo "Eligible for sending NOW: " . $stmtCheck->fetchColumn() . "\r\n";
