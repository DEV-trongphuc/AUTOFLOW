<?php
require_once 'db_connect.php';

try {
    $sql = "CREATE TABLE IF NOT EXISTS segment_exclusions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        segment_id VARCHAR(50) NOT NULL,
        subscriber_id VARCHAR(50) NOT NULL,
        excluded_at TIMESTAMP DEFAULT CURRENT__TIMESTAMP,
        UNIQUE KEY unique_exclusion (segment_id, subscriber_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $pdo->exec($sql);
    echo "Table segment_exclusions created successfully";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>