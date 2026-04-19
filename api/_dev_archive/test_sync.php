<?php
// Manual sync tester with full error output
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

echo "=== MANUAL SYNC TEST ===\n\n";

// Get integration ID from URL
$id = $_GET['id'] ?? null;

if (!$id) {
    echo "ERROR: Missing integration ID\n";
    echo "Usage: test_sync.php?id=YOUR_INTEGRATION_ID\n\n";

    // Show available integrations
    echo "Available integrations:\n";
    $stmt = $pdo->query("SELECT id, name, status, sync_status FROM integrations ORDER BY created_at DESC");
    while ($row = $stmt->fetch()) {
        echo "  - ID: {$row['id']}\n";
        echo "    Name: {$row['name']}\n";
        echo "    Status: {$row['status']} / Sync: {$row['sync_status']}\n";
        echo "    Test URL: https://automation.ideas.edu.vn/mail_api/test_sync.php?id={$row['id']}\n\n";
    }
    exit;
}

echo "Testing sync for integration: $id\n";
echo "Starting at: " . date('Y-m-d H:i:s') . "\n";
echo str_repeat("=", 80) . "\n\n";

// Ensure logs directory exists
$logsDir = __DIR__ . '/../logs';
if (!is_dir($logsDir)) {
    mkdir($logsDir, 0777, true);
    echo "Created logs directory: $logsDir\n\n";
}

// Set error reporting to maximum
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // Load worker
    require_once 'worker_integrations.php';

    echo "Worker loaded successfully\n";
    echo "Running sync...\n\n";
    echo str_repeat("-", 80) . "\n";

    // Run sync with output buffering to capture everything
    ob_start();
    runIntegrationSync($id);
    $output = ob_get_clean();

    echo $output;
    echo str_repeat("-", 80) . "\n\n";

    // Check final status
    $stmt = $pdo->prepare("SELECT sync_status, last_sync_at FROM integrations WHERE id = ?");
    $stmt->execute([$id]);
    $result = $stmt->fetch();

    if ($result) {
        echo "Final Status: {$result['sync_status']}\n";
        echo "Last Sync: {$result['last_sync_at']}\n";
    }

    echo "\nCompleted at: " . date('Y-m-d H:i:s') . "\n";

} catch (Exception $e) {
    echo "\n!!! EXCEPTION CAUGHT !!!\n";
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n\n";
    echo "Stack Trace:\n";
    echo $e->getTraceAsString() . "\n";
}

echo "\n=== END TEST ===\n";
