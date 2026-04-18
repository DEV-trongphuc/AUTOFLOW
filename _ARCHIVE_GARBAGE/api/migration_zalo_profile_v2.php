<?php
/**
 * Migration: Zalo Subscriber Profile Fields & Notes
 */
require_once 'db_connect.php';

try {
    $pdo->exec("
        ALTER TABLE zalo_subscribers 
        ADD COLUMN gender VARCHAR(20) DEFAULT NULL AFTER phone_number,
        ADD COLUMN birthday VARCHAR(20) DEFAULT NULL AFTER gender,
        ADD COLUMN special_day VARCHAR(50) DEFAULT NULL AFTER birthday,
        ADD COLUMN notes TEXT DEFAULT NULL AFTER special_day;
    ");

    echo "Migration Zalo Profile Fields Completed.";

} catch (PDOException $e) {
    // If columns already exist, just echo success
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Migration Zalo Profile Fields Already Applied.";
    } else {
        echo "Migration Failed: " . $e->getMessage();
    }
}
