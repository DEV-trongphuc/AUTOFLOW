<?php
require_once 'db_connect.php';
$propertyId = $_GET['property_id'] ?? null;
try {
    if (!$propertyId) {
        $stmt = $pdo->query("SELECT DISTINCT property_id FROM ai_chatbot_scenarios");
        $props = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo "Properties with scenarios: " . implode(', ', $props) . "\n\n";
        if (!empty($props)) $propertyId = $props[0];
    }
    
    if ($propertyId) {
        echo "Scenarios for property: $propertyId\n";
        $stmt = $pdo->prepare("SELECT id, title, trigger_keywords, match_mode, is_active FROM ai_chatbot_scenarios WHERE property_id = ?");
        $stmt->execute([$propertyId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        print_r($rows);
        
        $stmtToggle = $pdo->prepare("SELECT settings_value FROM ai_chatbot_meta_settings WHERE property_id = ? AND settings_key = 'scenarios_enabled' LIMIT 1");
        $stmtToggle->execute([$propertyId]);
        $toggle = $stmtToggle->fetchColumn();
        echo "\nGlobal Toggle: " . ($toggle === false ? "NOT SET (Default ON)" : $toggle) . "\n";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
