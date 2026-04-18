<?php
// Debug script to check sync status and logs
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

echo "=== SYNC DEBUG REPORT ===\n\n";

// 1. Check integrations table
echo "1. INTEGRATIONS STATUS:\n";
$stmt = $pdo->query("SELECT id, name, status, sync_status, last_sync_at, created_at FROM integrations ORDER BY created_at DESC");
$integrations = $stmt->fetchAll();

if (empty($integrations)) {
    echo "   No integrations found!\n\n";
} else {
    foreach ($integrations as $int) {
        echo "   ID: {$int['id']}\n";
        echo "   Name: {$int['name']}\n";
        echo "   Status: {$int['status']}\n";
        echo "   Sync Status: " . ($int['sync_status'] ?? 'N/A') . "\n";
        echo "   Last Sync: " . ($int['last_sync_at'] ?? 'Never') . "\n";
        echo "   ---\n";
    }
}

// 2. Check if sync_status column exists
echo "\n2. DATABASE SCHEMA CHECK:\n";
try {
    $pdo->query("SELECT sync_status FROM integrations LIMIT 1");
    echo "   ✓ sync_status column exists\n";
} catch (Exception $e) {
    echo "   ✗ sync_status column MISSING!\n";
    echo "   Error: " . $e->getMessage() . "\n";
}

// 3. Check worker log
echo "\n3. WORKER LOG (Last 50 lines):\n";
$logFile = __DIR__ . '/../logs/worker_integrations.log';
if (file_exists($logFile)) {
    $lines = file($logFile);
    $lastLines = array_slice($lines, -50);
    echo "   " . implode("   ", $lastLines);
} else {
    echo "   Log file not found at: $logFile\n";
}

// 4. Test PHP_BINARY
echo "\n4. PHP CONFIGURATION:\n";
echo "   PHP_BINARY: " . PHP_BINARY . "\n";
echo "   PHP Version: " . PHP_VERSION . "\n";
echo "   Memory Limit: " . ini_get('memory_limit') . "\n";
echo "   Max Execution Time: " . ini_get('max_execution_time') . "\n";

// 5. Test worker can be called
echo "\n5. WORKER TEST:\n";
echo "   Attempting to include worker_integrations.php...\n";
try {
    require_once 'worker_integrations.php';
    echo "   ✓ Worker file loaded successfully\n";
    echo "   ✓ Function 'runIntegrationSync' exists: " . (function_exists('runIntegrationSync') ? 'YES' : 'NO') . "\n";
} catch (Exception $e) {
    echo "   ✗ Error loading worker: " . $e->getMessage() . "\n";
}

echo "\n=== END DEBUG REPORT ===\n";
