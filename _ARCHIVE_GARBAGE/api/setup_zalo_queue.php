<?php
require_once 'db_connect.php';
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS zalo_message_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        zalo_user_id VARCHAR(255) NOT NULL,
        message_text TEXT,
        processed TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_zalo_user_processed (zalo_user_id, processed)
    )");
    echo "Table zalo_message_queue created/verified.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
