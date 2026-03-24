<?php
require_once 'db_connect.php';
try {
    $stmt = $pdo->query("SELECT id FROM ai_training_chunks LIMIT 5");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Sample Chunk IDs:\n";
    foreach ($rows as $r)
        echo "- " . $r['id'] . "\n";

    $stmt2 = $pdo->query("SELECT id FROM ai_messages LIMIT 5");
    $rows2 = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    echo "\nSample Message IDs:\n";
    foreach ($rows2 as $r)
        echo "- " . $r['id'] . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
