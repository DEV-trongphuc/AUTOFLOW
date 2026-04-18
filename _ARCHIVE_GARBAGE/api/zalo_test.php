<?php
/**
 * Simple test endpoint to verify Zalo OA API is working
 */

require_once 'db_connect.php';

apiHeaders();

// $pdo is already available from db_connect.php

try {
    // Test database connection
    $stmt = $pdo->query("SELECT 1");

    // Test if table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'zalo_oa_configs'");
    $tableExists = $stmt->rowCount() > 0;

    jsonResponse(true, [
        'message' => 'Zalo OA API is working',
        'table_exists' => $tableExists,
        'method' => $_SERVER['REQUEST_METHOD']
    ]);
} catch (Exception $e) {
    jsonResponse(false, null, 'Error: ' . $e->getMessage());
}
