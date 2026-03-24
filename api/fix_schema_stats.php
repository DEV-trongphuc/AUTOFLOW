<?php
require_once 'db_connect.php';

function addColumnIfNotExists($pdo, $table, $column, $definition)
{
    try {
        $pdo->query("SELECT $column FROM $table LIMIT 1");
        echo "Column '$column' already exists in '$table'.\n";
    } catch (PDOException $e) {
        // Prepare statement to avoid syntax errors if placeholders behave weirdly in ALTER, but usually direct query is best for DDL
        echo "Adding column '$column' to '$table'...\n";
        try {
            $pdo->exec("ALTER TABLE $table ADD COLUMN $column $definition");
            echo " - Success.\n";
        } catch (Exception $ex) {
            echo " - Failed: " . $ex->getMessage() . "\n";
        }
    }
}

echo "Updating Schema for Stats...\n";

// Campaigns
addColumnIfNotExists($pdo, 'campaigns', 'stat_opens', "INT DEFAULT 0");
addColumnIfNotExists($pdo, 'campaigns', 'stat_clicks', "INT DEFAULT 0");

// Flows
addColumnIfNotExists($pdo, 'flows', 'stat_total_sent', "INT DEFAULT 0");
addColumnIfNotExists($pdo, 'flows', 'stat_total_failed', "INT DEFAULT 0");
addColumnIfNotExists($pdo, 'flows', 'stat_total_opened', "INT DEFAULT 0");
addColumnIfNotExists($pdo, 'flows', 'stat_total_clicked', "INT DEFAULT 0");
addColumnIfNotExists($pdo, 'flows', 'stat_enrolled', "INT DEFAULT 0");

// Also ensure subscribers specific stats exist (just in case)
addColumnIfNotExists($pdo, 'subscribers', 'stats_opened', "INT DEFAULT 0");
addColumnIfNotExists($pdo, 'subscribers', 'stats_clicked', "INT DEFAULT 0");
addColumnIfNotExists($pdo, 'subscribers', 'stats_sent', "INT DEFAULT 0");
addColumnIfNotExists($pdo, 'subscribers', 'last_open_at', "DATETIME DEFAULT NULL");
addColumnIfNotExists($pdo, 'subscribers', 'last_click_at', "DATETIME DEFAULT NULL");

echo "Done.\n";
