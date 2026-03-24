<?php
require_once 'db_connect.php';

echo "<h2>Updating zalo_oa_configs Schema...</h2>";

try {
    // Add columns if they don't exist
    $columns = [
        "ADD COLUMN remaining_quota INT DEFAULT 0",
        "ADD COLUMN quality_48h VARCHAR(50) DEFAULT 'UNDEFINED'",
        "ADD COLUMN quality_7d VARCHAR(50) DEFAULT 'UNDEFINED'",
        "ADD COLUMN updated_at_quota TIMESTAMP NULL"
    ];

    foreach ($columns as $col) {
        try {
            $pdo->exec("ALTER TABLE zalo_oa_configs $col");
            echo "Executed: $col <br>";
        } catch (PDOException $e) {
            // Ignore if column exists
            if (strpos($e->getMessage(), "Duplicate column name") !== false) {
                echo "Column already exists (Skipped): $col <br>";
            } else {
                echo "Error executing $col: " . $e->getMessage() . "<br>";
            }
        }
    }

    echo "<h3>Schema update completed.</h3>";

} catch (Exception $e) {
    echo "General Error: " . $e->getMessage();
}
