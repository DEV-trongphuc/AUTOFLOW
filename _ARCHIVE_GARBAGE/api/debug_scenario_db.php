<?php
require_once 'db_connect.php';
try {
    $stmt = $pdo->query("SHOW TABLES LIKE 'ai_chatbot_scenarios'");
    $exists = $stmt->fetch();
    echo "ai_chatbot_scenarios: " . ($exists ? "EXISTS" : "MISSING") . "\n";

    $stmt = $pdo->query("SHOW TABLES LIKE 'ai_chatbot_meta_settings'");
    $exists = $stmt->fetch();
    echo "ai_chatbot_meta_settings: " . ($exists ? "EXISTS" : "MISSING") . "\n";
    
    if ($exists) {
        $stmt = $pdo->query("DESCRIBE ai_chatbot_scenarios");
        print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
