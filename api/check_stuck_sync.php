<?php
// Check if worker is currently running
require_once 'db_connect.php';
header('Content-Type: text/plain; charset=utf-8');

echo "=== WORKER STATUS CHECK ===\n\n";

// Check integrations
$stmt = $pdo->query("SELECT id, name, sync_status, last_sync_at, created_at FROM integrations WHERE sync_status = 'syncing'");
$syncing = $stmt->fetchAll();

if (empty($syncing)) {
    echo "✓ No integrations currently syncing\n";
} else {
    echo "⚠ Found " . count($syncing) . " integration(s) stuck in 'syncing' state:\n\n";
    foreach ($syncing as $int) {
        echo "  ID: {$int['id']}\n";
        echo "  Name: {$int['name']}\n";
        echo "  Last Sync: {$int['last_sync_at']}\n";
        echo "  Created: {$int['created_at']}\n";

        $lastSync = strtotime($int['last_sync_at'] ?? $int['created_at']);
        $elapsed = time() - $lastSync;
        echo "  Time since last sync: " . round($elapsed / 60, 1) . " minutes\n";

        if ($elapsed > 300) {
            echo "  ⚠ STUCK! (More than 5 minutes)\n";
            echo "  Recommendation: Reset this integration\n";
        }
        echo "  ---\n";
    }
}

echo "\n=== RECOMMENDATION ===\n";
echo "Run: https://automation.ideas.edu.vn/mail_api/reset_sync_status.php\n";

echo "\n=== END ===\n";
