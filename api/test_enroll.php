<?php
require_once 'db_connect.php';
require_once 'flow_helpers.php';
require_once 'segment_helper.php';

$flowId = '004467d4-c62c-4bb8-af09-45a738109273';
$wsId = 1;

// 1. Get Trigger Segment
$stmtSeg = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
$stmtSeg->execute(['695c19b9c8c35']);
$segDef = $stmtSeg->fetch();
if (!$segDef) {
    echo "Segment not found\n";
    exit;
}

$segRes = buildSegmentWhereClause($segDef['criteria'], '695c19b9c8c35');
$segSql = $segRes['sql'];
$segParams = $segRes['params'];

echo "Segment SQL:\n$segSql\n\n";

$existsCheckSql = "AND NOT EXISTS (SELECT 1 FROM subscriber_flow_states sfs WHERE sfs.subscriber_id = s.id AND sfs.flow_id = ? AND sfs.status = 'cancelled')
                   AND NOT EXISTS (SELECT 1 FROM subscriber_flow_states sfs WHERE sfs.subscriber_id = s.id AND sfs.flow_id = ?)";

$sqlIns = "SELECT COUNT(s.id)
           FROM subscribers s
           WHERE s.workspace_id = $wsId 
           AND s.status IN ('active', 'lead', 'customer') 
           AND ($segSql)
           $existsCheckSql";

$params = array_merge($segParams, [$flowId, $flowId]);

echo "Enrollment Check SQL:\n$sqlIns\n\n";

$stmtIns = $pdo->prepare($sqlIns);
$stmtIns->execute($params);
$enrolledCount = $stmtIns->fetchColumn();

echo "Potential Enrollees: $enrolledCount\n";

// 2. See how many are cancelled
$stmtCanc = $pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'cancelled'");
$stmtCanc->execute([$flowId]);
echo "Cancelled (Legacy): " . $stmtCanc->fetchColumn() . "\n";

// 3. See how many are waiting
$stmtWait = $pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'waiting'");
$stmtWait->execute([$flowId]);
echo "Waiting: " . $stmtWait->fetchColumn() . "\n";

// 4. See total in segment
$sqlTotal = "SELECT COUNT(s.id)
           FROM subscribers s
           WHERE s.workspace_id = $wsId 
           AND s.status IN ('active', 'lead', 'customer') 
           AND ($segSql)";
$stmtTotal = $pdo->prepare($sqlTotal);
$stmtTotal->execute($segParams);
echo "Total in Segment: " . $stmtTotal->fetchColumn() . "\n";

