<?php
$_GET['secret'] = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/worker_flow.php';

$GLOBALS['current_admin_id'] = 'admin-001';
$res = runWorkerFlow($pdo);
header('Content-Type: application/json');
echo json_encode($res, JSON_PRETTY_PRINT);
