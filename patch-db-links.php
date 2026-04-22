<?php
require_once __DIR__ . '/api/db_connect.php';

try {
    $pdo->exec("ALTER TABLE short_links ADD COLUMN status ENUM('active', 'paused') DEFAULT 'active' AFTER is_survey_checkin");
} catch (Exception $e) {}

try {
    $pdo->exec("ALTER TABLE short_links ADD COLUMN access_pin VARCHAR(10) DEFAULT NULL AFTER status");
} catch (Exception $e) {}

try {
    $pdo->exec("ALTER TABLE short_links ADD COLUMN submit_count INT DEFAULT 0 AFTER access_pin");
} catch (Exception $e) {}

echo "Database patch executed successfully.\n";
