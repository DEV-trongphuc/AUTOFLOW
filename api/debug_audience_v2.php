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

$whereSql = !empty($wheres) ? " AND (" . implode(' OR ', $wheres) . ")" : "";

echo "--- Campaign Audience Breakdown ---\n";

// 1. All statuses matching target
$sqlAll = "SELECT status, COUNT(*) as total FROM subscribers s WHERE 1=1 $whereSql GROUP BY status";
$stmtAll = $pdo->prepare($sqlAll);
$stmtAll->execute($params);
$results = $stmtAll->fetchAll();
$sum = 0;
foreach ($results as $r) {
    echo "Status: {$r['status']} | Count: {$r['total']}\n";
    $sum += $r['total'];
}
echo "Total Potential: $sum\n";

// 2. Actually sent/activities
$stmtAct = $pdo->prepare("SELECT type, COUNT(*) as total FROM subscriber_activity WHERE campaign_id = ? GROUP BY type");
$stmtAct->execute([$cid]);
echo "\n--- Activities for this Campaign ---\n";
foreach ($stmtAct->fetchAll() as $r) {
    echo "Type: {$r['type']} | Count: {$r['total']}\n";
}

// 3. Current count_sent from campaign table
echo "\nCampaign Table Stats:\n";
echo "count_sent: {$campaign['count_sent']}\n";
echo "total_target_audience: {$campaign['total_target_audience']}\n";
