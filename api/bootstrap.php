<?php
/**
 * api/bootstrap.php - Centralized API Initializer
 * Version: 1.0.0
 * 
 * This file centralizes configuration, shared helpers, and optimized 
 * system integrity checks to improve overall backend performance.
 */

require_once 'db_connect.php';
require_once 'flow_helpers.php';
require_once 'segment_helper.php';

// Set common headers
apiHeaders();
date_default_timezone_set('Asia/Ho_Chi_Minh');

/**
 * Optimized System Initialization / Migration
 * Instead of checking schema on every request, we check a version flag.
 */
function initializeSystem($pdo)
{
    $currentVersion = '29.8'; // Optimized lists with phone_count

    // Use a lightweight check for the version
    static $initialized = false;
    if ($initialized)
        return;

    try {
        $stmt = $pdo->prepare("SELECT value FROM system_settings WHERE `key` = 'schema_version' LIMIT 1");
        $stmt->execute();
        $installedVersion = $stmt->fetchColumn();

        if ($installedVersion !== $currentVersion) {
            // Run migration logic once
            require_once 'migrate_system_logic.php';
            if (function_exists('runSystemMigration')) {
                runSystemMigration($pdo, $currentVersion);
            }
        }
    } catch (Exception $e) {
        // Fallback: If table missing, run migration to create it
        if (strpos($e->getMessage(), "doesn't exist") !== false) {
            require_once 'migrate_system_logic.php';
            if (function_exists('runSystemMigration')) {
                runSystemMigration($pdo, $currentVersion);
            }
        }
    }

    $initialized = true;
}

// Optional: Global trigger for initialization
// However, it might be better to call this only on high-level entry points (GET/POST /flows, /campaigns)
// than on every single tracking ping.
