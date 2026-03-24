<?php
require_once 'db_connect.php';

echo "--- ZNS CAMPAIGN DEBUG ---\n";

try {
    echo "\n[1] Recent ZNS Campaigns:\n";
    $stmt = $pdo->query("SELECT id, name, type, config, template_id, status FROM campaigns WHERE type = 'zalo_zns' ORDER BY updated_at DESC LIMIT 5");
    $campaigns = $stmt->fetchAll();

    foreach ($campaigns as $c) {
        echo "ID: {$c['id']} | Name: {$c['name']} | Status: {$c['status']} | Tpl: {$c['template_id']}\n";
        echo "Config: {$c['config']}\n";
        $config = json_decode($c['config'], true);
        $oaId = $config['oa_config_id'] ?? 'MISSING';
        echo "Extracted OA Config ID: $oaId\n";

        if ($oaId !== 'MISSING') {
            $stmtCheck = $pdo->prepare("SELECT id, name, status FROM zalo_oa_configs WHERE id = ?");
            $stmtCheck->execute([$oaId]);
            $oa = $stmtCheck->fetch();
            if ($oa) {
                echo "-> OA Found: Name: {$oa['name']} | Status: {$oa['status']}\n";
            } else {
                echo "-> ERROR: OA CONFIG NOT FOUND in zalo_oa_configs for ID: $oaId\n";
            }
        }
        echo "-----------------------------------\n";
    }

    echo "\n[2] All Available OA Configs:\n";
    $stmt = $pdo->query("SELECT id, name, status FROM zalo_oa_configs");
    $oas = $stmt->fetchAll();
    foreach ($oas as $oa) {
        echo "ID: {$oa['id']} | Name: {$oa['name']} | Status: {$oa['status']}\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
