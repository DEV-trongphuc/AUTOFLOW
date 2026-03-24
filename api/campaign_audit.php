<?php
// api/campaign_audit.php - AUDIT AUDIENCE DATA INTEGRITY
require_once 'db_connect.php';
require_once 'segment_helper.php';
require_once 'flow_helpers.php';

header('Content-Type: application/json; charset=utf-8');

$cid = $_GET['campaign_id'] ?? null;
if (!$cid) {
    echo json_encode(['success' => false, 'message' => 'Campaign ID required']);
    exit;
}

$stmt = $pdo->prepare("SELECT * FROM campaigns WHERE id = ?");
$stmt->execute([$cid]);
$campaign = $stmt->fetch();

if (!$campaign) {
    echo json_encode(['success' => false, 'message' => 'Campaign not found']);
    exit;
}

$isZns = $campaign['type'] === 'zalo_zns';
if (!$isZns) {
    echo json_encode(['success' => true, 'data' => ['total_checked' => 0, 'total_missing' => 0, 'missing_field_stats' => []]]);
    exit;
}

$target = json_decode($campaign['target_config'], true);
$config = json_decode($campaign['config'], true);
$mappedParams = $config['mapped_params'] ?? [];

if (empty($mappedParams)) {
    echo json_encode(['success' => true, 'data' => ['total_checked' => 0, 'total_missing' => 0, 'missing_field_stats' => []]]);
    exit;
}

// 1. Build Target Audience Query
$wheres = [];
$params = [];

if (!empty($target['listIds'])) {
    $placeholders = implode(',', array_fill(0, count($target['listIds']), '?'));
    $wheres[] = "s.id IN (SELECT subscriber_id FROM subscriber_lists WHERE list_id IN ($placeholders))";
    $params = array_merge($params, $target['listIds']);
}

if (!empty($target['segmentIds'])) {
    foreach ($target['segmentIds'] as $segId) {
        $stmtSeg = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
        $stmtSeg->execute([$segId]);
        $criteria = $stmtSeg->fetchColumn();
        if ($criteria) {
            // Note: complex segments are hard to do purely in SQL, but for audit we can sample from the whole table if needed
            // For now, let's focus on lists which are common for CSV imports
        }
    }
}

if (!empty($target['tagIds'])) {
    $placeholders = implode(',', array_fill(0, count($target['tagIds']), '?'));
    $wheres[] = "s.id IN (SELECT st.subscriber_id FROM subscriber_tags st JOIN tags t ON st.tag_id = t.id WHERE t.name IN ($placeholders))";
    $params = array_merge($params, $target['tagIds']);
}

// 2. Fetch Sample Audience (Up to 1000)
$sql = "SELECT * FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer')";
if (!empty($wheres)) {
    $sql .= " AND (" . implode(' OR ', $wheres) . ")";
}
$sql .= " LIMIT 1000";

$stmtCheck = $pdo->prepare($sql);
$stmtCheck->execute($params);
$subscribers = $stmtCheck->fetchAll();

$missingStats = [];
$totalMissingCount = 0;

foreach ($subscribers as $sub) {
    $missingInThisSub = [];
    foreach ($mappedParams as $znsKey => $templateString) {
        $resolved = replaceMergeTags($templateString, $sub);
        if ($resolved === '' || $resolved === 'Bạn') { // Treat fallback as "potential mismatch" if it's a critical field
            // Actually Zalo allows 'Bạn' if it's fine, but let's check for EMPTY
            if ($resolved === '') {
                $missingInThisSub[] = $znsKey;
            }
        }
    }

    if (!empty($missingInThisSub)) {
        $totalMissingCount++;
        foreach ($missingInThisSub as $field) {
            $missingStats[$field] = ($missingStats[$field] ?? 0) + 1;
        }
    }
}

echo json_encode([
    'success' => true,
    'data' => [
        'total_checked' => count($subscribers),
        'total_missing' => $totalMissingCount,
        'missing_field_stats' => $missingStats
    ]
]);
