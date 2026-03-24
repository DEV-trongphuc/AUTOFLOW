<?php
require_once 'db_connect.php';

echo "<h2>Fixing Schema for Zalo Sync...</h2>";

function addCol($pdo, $table, $col, $def)
{
    try {
        $pdo->query("SELECT $col FROM $table LIMIT 1");
        echo "✅ Column <strong>$table.$col</strong> already exists.<br>";
    } catch (Exception $e) {
        try {
            $pdo->exec("ALTER TABLE $table ADD COLUMN $col $def");
            echo "🛠️ Added <strong>$table.$col</strong>.<br>";
        } catch (Exception $e2) {
            echo "❌ Failed to add $table.$col: " . $e2->getMessage() . "<br>";
        }
    }
}

// Add columns missing in subscribers table
addCol($pdo, 'subscribers', 'verified', "TINYINT(1) DEFAULT 0");
addCol($pdo, 'subscribers', 'avatar', "VARCHAR(500) DEFAULT NULL");

echo "<br><strong>Done!</strong> Please check Zalo Sync again.";
?>