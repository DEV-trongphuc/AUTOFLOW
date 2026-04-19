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
if (!empty($target['tagIds'])) {
    foreach ($target['tagIds'] as $tag) {
        $wheres[] = "s.id IN (SELECT st.subscriber_id FROM subscriber_tags st JOIN tags t_sub ON st.tag_id = t_sub.id WHERE t_sub.name = ?)";
        $params[] = $tag;
    }
}

$sqlCheck = "SELECT COUNT(*) FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer')";
if (!empty($wheres))
    $sqlCheck .= " AND (" . implode(' OR ', $wheres) . ")";
$sqlCheck .= " AND NOT EXISTS (
    SELECT 1 FROM subscriber_activity sa 
    WHERE sa.subscriber_id = s.id 
    AND (sa.type IN ('receive_email', 'failed_email', 'zalo_sent', 'meta_sent', 'zns_sent', 'zns_failed', 'enter_flow')) 
    AND sa.campaign_id = ?
)";

$stmtCheck = $pdo->prepare("$sqlCheck");
$stmtCheck->execute(array_merge($params, [$cid]));
$count = $stmtCheck->fetchColumn();

echo "Final check for eligible: $count\n";
if ($count > 0) {
    echo "Campaign should still be SENDING.\n";
} else {
    echo "Campaign is correctly SENT.\n";
}
