<?php
/**
 * fetch_health.php
 * Helper to fetch autoflow_health.php output from the root directory.
 */
require_once __DIR__ . '/api/db_connect.php';
$_GET['admin_token'] = ADMIN_BYPASS_TOKEN;
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';

ob_start();
require_once __DIR__ . '/api/autoflow_health.php';
$output = ob_get_clean();
header('Content-Type: application/json');
echo $output;
