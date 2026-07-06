<?php
/**
 * fetch_health.php
 * Helper to fetch autoflow_health.php output from the root directory.
 */
$_GET['admin_token'] = 'autoflow-admin-001';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
ob_start();
require_once __DIR__ . '/api/autoflow_health.php';
$output = ob_get_clean();
header('Content-Type: application/json');
echo $output;
