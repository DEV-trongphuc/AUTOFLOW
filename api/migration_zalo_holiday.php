<?php
// api/migration_zalo_holiday.php
require_once 'db_connect.php';

try {
    // 1. Add columns
    $columnsToAdd = [
        'priority_override' => "TINYINT(1) DEFAULT 0 AFTER active_days",
        'holiday_start_at' => "DATETIME NULL AFTER priority_override",
        'holiday_end_at' => "DATETIME NULL AFTER holiday_start_at"
    ];

    $existingColumns = $pdo->query("DESCRIBE zalo_automation_scenarios")->fetchAll(PDO::FETCH_COLUMN);

    foreach ($columnsToAdd as $col => $definition) {
        if (!in_array($col, $existingColumns)) {
            $pdo->exec("ALTER TABLE zalo_automation_scenarios ADD COLUMN $col $definition");
            echo "Added column: $col<br>";
        } else {
            echo "Column $col already exists.<br>";
        }
    }

    // 2. Update ENUM for 'type'
    // Note: Changing ENUMs can be tricky. We'll use a safe modification.
    // However, MySQL usually allows adding values to ENUM.
    // Check if 'holiday' is already in the enum
    $stmt = $pdo->query("SHOW COLUMNS FROM zalo_automation_scenarios LIKE 'type'");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $typeType = $row['Type']; // e.g., enum('welcome','keyword','first_message')

    if (strpos($typeType, "'holiday'") === false) {
        // Append 'holiday' to the enum list
        // Based on previous schema: ENUM('welcome', 'keyword', 'first_message')
        // We will make it: ENUM('welcome', 'keyword', 'first_message', 'holiday')
        $newEnum = str_replace(")", ",'holiday')", $typeType);
        $pdo->exec("ALTER TABLE zalo_automation_scenarios MODIFY COLUMN type $newEnum DEFAULT 'keyword'");
        echo "Updated ENUM type to include 'holiday'.<br>";
    } else {
        echo "'holiday' already in ENUM type.<br>";
    }

    echo "Migration completed successfully.";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
