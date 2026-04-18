<?php
require_once 'db_connect.php';

echo "--- ZNS OA ID MAINTENANCE SCRIPT ---\n";

try {
    $stmt = $pdo->query("SELECT id, config FROM campaigns WHERE type = 'zalo_zns'");
    $campaigns = $stmt->fetchAll();

    $fixedCount = 0;
    foreach ($campaigns as $c) {
        $config = json_decode($c['config'], true);
        if (!$config)
            continue;

        $oaConfigId = $config['oa_config_id'] ?? null;
        if (!$oaConfigId)
            continue;

        // Check if it's already a hash (internal ID) or a numeric Zalo OA ID
        if (ctype_digit($oaConfigId)) {
            echo "Processing Campaign ID: {$c['id']} | Current OA ID: $oaConfigId (Looks like Zalo OA ID)\n";

            // Find internal ID
            $stmtOA = $pdo->prepare("SELECT id FROM zalo_oa_configs WHERE oa_id = ? LIMIT 1");
            $stmtOA->execute([$oaConfigId]);
            $internalId = $stmtOA->fetchColumn();

            if ($internalId) {
                echo "-> Found internal ID: $internalId. Updating campaign config...\n";
                $config['oa_config_id'] = $internalId;
                $newConfig = json_encode($config);

                $stmtUpdate = $pdo->prepare("UPDATE campaigns SET config = ? WHERE id = ?");
                $stmtUpdate->execute([$newConfig, $c['id']]);
                $fixedCount++;
            } else {
                echo "-> WARNING: No OA found in zalo_oa_configs matching oa_id: $oaConfigId\n";
            }
        } else {
            echo "Campaign ID: {$c['id']} | Current OA ID: $oaConfigId (Already looks like internal ID)\n";
        }
    }

    echo "\nSummary: Fixed $fixedCount campaigns.\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
