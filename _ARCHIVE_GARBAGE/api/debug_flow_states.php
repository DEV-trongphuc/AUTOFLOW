<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json; charset=utf-8');
require_once 'db_connect.php';

$flowId = $_GET['flow_id'] ?? '6200f46f-7349-4fa2-a65d-889abe63c25d';

try {
    // $pdo is already available from db_connect.php

    // Get flow info
    $stmtFlow = $pdo->prepare("SELECT name, steps FROM flows WHERE id = ?");
    $stmtFlow->execute([$flowId]);
    $flow = $stmtFlow->fetch(PDO::FETCH_ASSOC);

    if (!$flow) {
        echo json_encode(['error' => 'Flow not found', 'flow_id' => $flowId]);
        exit;
    }

    $steps = json_decode($flow['steps'], true) ?: [];
    $stepMap = [];
    foreach ($steps as $step) {
        $stepMap[$step['id']] = $step;
    }

    // Get all subscribers in this flow
    $stmt = $pdo->prepare("
        SELECT 
            sfs.id as queue_id,
            sfs.subscriber_id,
            sfs.step_id,
            sfs.status,
            sfs.scheduled_at,
            sfs.created_at,
            sfs.updated_at,
            sfs.last_error,
            s.email,
            s.first_name,
            s.last_name
        FROM subscriber_flow_states sfs
        LEFT JOIN subscribers s ON s.id = sfs.subscriber_id
        WHERE sfs.flow_id = ?
        ORDER BY sfs.updated_at DESC
        LIMIT 50
    ");
    $stmt->execute([$flowId]);
    $states = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $result = [
        'flow_name' => $flow['name'],
        'flow_id' => $flowId,
        'total_states' => count($states),
        'current_time' => date('Y-m-d H:i:s'),
        'states' => []
    ];

    foreach ($states as $state) {
        $stepId = $state['step_id'];
        $stepInfo = $stepMap[$stepId] ?? null;

        $result['states'][] = [
            'queue_id' => $state['queue_id'],
            'subscriber_id' => $state['subscriber_id'],
            'email' => $state['email'] ?? 'N/A',
            'name' => trim(($state['first_name'] ?? '') . ' ' . ($state['last_name'] ?? '')),
            'status' => $state['status'],
            'step_id' => $stepId,
            'step_type' => $stepInfo['type'] ?? 'unknown',
            'step_label' => $stepInfo['label'] ?? 'Unknown Step',
            'scheduled_at' => $state['scheduled_at'],
            'created_at' => $state['created_at'],
            'updated_at' => $state['updated_at'],
            'last_error' => $state['last_error']
        ];
    }

    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}