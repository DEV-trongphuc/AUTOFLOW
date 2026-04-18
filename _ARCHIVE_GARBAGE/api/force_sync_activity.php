<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once 'db_connect.php';

echo "<pre>";
echo "--- Force Sync Activity Buffer ---\n";

try {
    // Check if table exists
    $stmt = $pdo->query("SELECT COUNT(*) FROM activity_buffer WHERE processed = 0");
    $count = $stmt->fetchColumn();
    echo "Pending logs in buffer: $count\n";

    if ($count > 0) {
        $stmt = $pdo->prepare("SELECT * FROM activity_buffer WHERE processed = 0 ORDER BY id ASC LIMIT 500");
        $stmt->execute();
        $logs = $stmt->fetchAll();

        foreach ($logs as $log) {
            echo "Processing Log ID: {$log['id']} (Type: {$log['type']})\n";
            $extra = json_decode($log['extra_data'], true) ?: [];

            $ip = $extra['ip'] ?? null;
            $ua = $extra['ua'] ?? null;
            $device = $extra['device'] ?? null;
            $os = $extra['os'] ?? null;
            $browser = $extra['browser'] ?? null;
            $location = $extra['location'] ?? null;
            $refName = $extra['reference_name'] ?? null;

            try {
                $sql = "INSERT INTO subscriber_activity (subscriber_id, type, reference_id, flow_id, campaign_id, reference_name, details, ip_address, user_agent, device_type, os, browser, location, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $stmtIns = $pdo->prepare($sql);
                $stmtIns->execute([
                    $log['subscriber_id'],
                    $log['type'],
                    $log['reference_id'],
                    $log['flow_id'],
                    $log['campaign_id'],
                    $refName,
                    $log['details'],
                    $ip,
                    $ua,
                    $device,
                    $os,
                    $browser,
                    $location,
                    $log['created_at']
                ]);
                echo "  -> Insert Success.\n";

                $pdo->prepare("DELETE FROM activity_buffer WHERE id = ?")->execute([$log['id']]);
                echo "  -> Delete from buffer Success.\n";
            } catch (Exception $e) {
                echo "  -> ERROR: " . $e->getMessage() . "\n";
            }
        }
    } else {
        echo "Nothing to sync.\n";
    }

} catch (Exception $e) {
    echo "Check failed: " . $e->getMessage() . "\n";
}

echo "\n--- Subscriber Activity Row Count ---\n";
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM subscriber_activity");
    echo "Total rows: " . $stmt->fetchColumn() . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "</pre>";
?>