<?php
// Auto-reset stuck syncing integrations (run this via cron every 5 minutes)
require_once 'db_connect.php';

// Find integrations stuck in 'syncing' for more than 5 minutes
$stmt = $pdo->query("
    SELECT id, name, last_sync_at, created_at 
    FROM integrations 
    WHERE sync_status = 'syncing' 
    AND (
        (last_sync_at IS NOT NULL AND TIMESTAMPDIFF(MINUTE, last_sync_at, NOW()) > 5)
        OR (last_sync_at IS NULL AND TIMESTAMPDIFF(MINUTE, created_at, NOW()) > 5)
    )
");

$stuck = $stmt->fetchAll();

if (!empty($stuck)) {
    foreach ($stuck as $int) {
        $pdo->prepare("UPDATE integrations SET sync_status = 'idle' WHERE id = ?")->execute([$int['id']]);
        error_log("[Auto-Reset] Integration {$int['id']} ({$int['name']}) was stuck, reset to idle");
    }
}
