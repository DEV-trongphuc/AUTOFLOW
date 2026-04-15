<?php
require_once __DIR__ . '/db_connect.php';
$flowId = '69dca73f0d951';

header('Content-Type: application/json');

try {
    // 1. Get flow steps to map labels
    $stmtFlow = $pdo->prepare("SELECT name, steps FROM flows WHERE id = ?");
    $stmtFlow->execute([$flowId]);
    $flowData = $stmtFlow->fetch(PDO::FETCH_ASSOC);
    $steps = json_decode($flowData['steps'], true) ?? [];
    $stepMap = [];
    foreach($steps as $s) {
        $stepMap[$s['id']] = $s['label'] . " (" . $s['type'] . ")";
    }

    // 2. Get detailed failures
    $stmt = $pdo->prepare("SELECT step_id, status, last_error, COUNT(*) as count 
                           FROM subscriber_flow_states 
                           WHERE flow_id = ? AND status != 'completed'
                           GROUP BY step_id, status, last_error");
    $stmt->execute([$flowId]);
    $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $refined = [];
    foreach($res as $r) {
        $r['step_label'] = $stepMap[$r['step_id']] ?? 'Unknown Step';
        $refined[] = $r;
    }
    
    echo json_encode([
        'success' => true,
        'flow_name' => $flowData['name'],
        'distribution' => $refined,
        'now' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
