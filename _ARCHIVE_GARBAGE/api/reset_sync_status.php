<?php
// Reset integration status to allow retry
require_once 'db_connect.php';
apiHeaders();

try {
    // Reset all integrations stuck in 'syncing' or 'error' to 'idle'
    $stmt = $pdo->prepare("UPDATE integrations SET sync_status = 'idle' WHERE sync_status IN ('syncing', 'error')");
    $stmt->execute();
    $affected = $stmt->rowCount();

    jsonResponse(true, ['reset_count' => $affected], "Reset $affected integration(s) to idle status");
} catch (Exception $e) {
    jsonResponse(false, null, $e->getMessage());
}
