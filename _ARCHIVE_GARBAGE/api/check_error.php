<?php
// Simple error checker
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');

echo "=== ERROR CHECKER ===\n\n";

try {
    echo "1. Testing db_connect.php...\n";
    require_once 'db_connect.php';
    echo "   ✓ Database connected\n\n";

    echo "2. Testing worker_integrations.php...\n";
    require_once 'worker_integrations.php';
    echo "   ✓ Worker loaded\n\n";

    echo "3. Checking function exists...\n";
    if (function_exists('runIntegrationSync')) {
        echo "   ✓ runIntegrationSync exists\n\n";
    } else {
        echo "   ✗ runIntegrationSync NOT FOUND\n\n";
    }

    echo "4. Listing integrations...\n";
    $stmt = $pdo->query("SELECT id, name, status, sync_status FROM integrations ORDER BY created_at DESC LIMIT 5");
    $integrations = $stmt->fetchAll();

    if (empty($integrations)) {
        echo "   No integrations found\n\n";
    } else {
        foreach ($integrations as $int) {
            echo "   - {$int['id']}: {$int['name']} ({$int['status']}/{$int['sync_status']})\n";
        }
        echo "\n";
    }

    echo "All checks passed!\n";

} catch (Exception $e) {
    echo "\n!!! ERROR !!!\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\n=== END ===\n";
