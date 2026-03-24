<?php
require_once 'config/database.php';

try {
    $pdo->exec("ALTER TABLE ai_training_chunks ADD COLUMN IF NOT EXISTS relevance_boost INT DEFAULT 0");
    echo "Column relevance_boost added successfully or already exists.";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>