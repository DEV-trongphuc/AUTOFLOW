<?php
require_once 'db_connect.php';
try {
    $stmt = $pdo->query("DESCRIBE ai_training_chunks");
    $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Columns in ai_training_chunks: " . implode(', ', $cols) . "\n";

    $stmt2 = $pdo->query("DESCRIBE ai_training_docs");
    $cols2 = $stmt2->fetchAll(PDO::FETCH_COLUMN);
    echo "Columns in ai_training_docs: " . implode(', ', $cols2) . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
