<?php
require_once 'db_connect.php';

$oaId = '178678706857849180'; // From logs
$stmt = $pdo->prepare("SELECT id FROM zalo_oa_configs WHERE app_id = ?");
$stmt->execute([$oaId]);
$oaConfigId = $stmt->fetchColumn();

echo "OA Config ID: $oaConfigId\n";

if ($oaConfigId) {
    $stmt = $pdo->prepare("SELECT * FROM zalo_automation_scenarios WHERE oa_config_id = ? AND status = 'active'");
    $stmt->execute([$oaConfigId]);
    $scenarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Active Scenarios:\n";
    foreach ($scenarios as $s) {
        echo "[ID: {$s['id']}] Title: {$s['title']} | Type: {$s['type']} | Trigger: {$s['trigger_text']} | AI ID: {$s['ai_chatbot_id']}\n";
    }
}
