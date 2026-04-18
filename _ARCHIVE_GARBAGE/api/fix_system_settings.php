<?php
// Fix system_settings key length
require 'db_connect.php';

echo "<!DOCTYPE html><html><head><title>Fix Database</title></head><body>";
echo "<h1>Fixing system_settings table</h1>";

try {
    // Alter table to increase key length
    $sql = "ALTER TABLE system_settings MODIFY `key` VARCHAR(255) NOT NULL";
    $pdo->exec($sql);

    echo "<p><strong>✅ SUCCESS: Extended 'key' column to VARCHAR(255)</strong></p>";

    // Verify
    $stmt = $pdo->query("DESCRIBE system_settings");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<h2>Updated Table Structure:</h2>";
    echo "<pre>";
    print_r($columns);
    echo "</pre>";

    echo "<p><a href='debug_analysis_history.php'>← Back to Debug</a></p>";

} catch (PDOException $e) {
    echo "<p><strong>❌ ERROR: " . htmlspecialchars($e->getMessage()) . "</strong></p>";
}

echo "</body></html>";
