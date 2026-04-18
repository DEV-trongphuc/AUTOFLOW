<?php
require_once 'db_connect.php';
try {
    echo "--- Pending Documents ---\n";
    $stmt = $pdo->prepare("SELECT id, name, property_id, status, source_type, CHAR_LENGTH(content) as len FROM ai_training_docs WHERE status = 'pending'");
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $r) {
        echo "ID: {$r['id']}, Name: {$r['name']}, Source: {$r['source_type']}, Length: {$r['len']}\n";
    }

    echo "\n--- Table Schema ai_training_chunks ---\n";
    $stmt = $pdo->query("DESCRIBE ai_training_chunks");
    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "{$r['Field']} | {$r['Type']} | {$r['Null']} | {$r['Default']}\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>