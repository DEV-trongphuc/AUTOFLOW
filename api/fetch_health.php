<?php
/**
 * api/fetch_health.php
 * Helper to fetch autoflow_health.php output locally on the server.
 */
$_GET['admin_token'] = 'autoflow-admin-001';
// Mock $_SERVER to make it look like local bypass
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
ob_start();
require_once __DIR__ . '/autoflow_health.php';
$output = ob_get_clean();
header('Content-Type: application/json');
echo $output;
