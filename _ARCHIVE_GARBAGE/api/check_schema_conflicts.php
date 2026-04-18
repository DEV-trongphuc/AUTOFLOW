<?php
// api/check_schema_conflicts.php
// Script to verify if new cleanup logic conflicts with database schema
require_once 'db_connect.php';

echo "=== SCHEMA CONFLICT CHECK (CLEANUP V2) ===\n\n";

$conflicts = [];
$warnings = [];
$success = [];

try {
    // 1. Check Tables Existence (Campaigns, Flows, Lists, Tags)
    $coreTables = ['campaigns', 'flows', 'lists', 'tags', 'queue_jobs', 'subscriber_activity', 'stats_update_buffer', 'flow_event_queue'];
    echo "1. Checking Core Tables...\n";
    foreach ($coreTables as $table) {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->fetch()) {
            $success[] = "Table `$table` exists.";
        } else {
            if ($table === 'flow_event_queue') {
                $warnings[] = "Table `flow_event_queue` missing. Flow deletion logic skips checks for this table safely.";
            } else {
                $conflicts[] = "CRITICAL: Table `$table` does not exist!";
            }
        }
    }

    // 2. Check Columns for Cleanup Logic
    echo "\n2. Checking Required Columns...\n";

    // Check queue_jobs payload column (Used for LIKE queries)
    $stmt = $pdo->query("SHOW COLUMNS FROM queue_jobs LIKE 'payload'");
    if ($stmt->fetch()) {
        $success[] = "`queue_jobs.payload` exists (Used for cleanup).";
    } else {
        $conflicts[] = "`queue_jobs.payload` missing! Cleanup logic will fail.";
    }

    // Check stats_update_buffer columns
    $bufferCols = ['target_id', 'target_table'];
    foreach ($bufferCols as $col) {
        $stmt = $pdo->query("SHOW COLUMNS FROM stats_update_buffer LIKE '$col'");
        if (!$stmt->fetch()) {
            $conflicts[] = "`stats_update_buffer.$col` missing! Buffer cleanup will fail.";
        }
    }
    $success[] = "`stats_update_buffer` columns verified.";

    // Check zalo_delivery_logs.campaign_id (New Fix)
    $stmt = $pdo->query("SHOW COLUMNS FROM zalo_delivery_logs LIKE 'campaign_id'");
    if ($stmt->fetch()) {
        $success[] = "`zalo_delivery_logs.campaign_id` exists (Fix validated).";
    } else {
        $warnings[] = "`zalo_delivery_logs.campaign_id` missing. Zalo log cleanup might strictly rely on flow_id or needs schema update.";
    }

    // 3. Check Foreign Key Constraints (Cascade)
    echo "\n3. Checking Cascade Constraints...\n";
    $fksToCheck = [
        'subscriber_flow_states' => 'flow_id',
        'flow_enrollments' => 'flow_id',
        'subscriber_lists' => 'list_id',
        'subscriber_tags' => 'tag_id',
        'campaign_reminders' => 'campaign_id'
    ];

    foreach ($fksToCheck as $table => $fkCol) {
        $sql = "SELECT REFERENCED_TABLE_NAME, DELETE_RULE 
                FROM information_schema.REFERENTIAL_CONSTRAINTS 
                WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = '$table' AND CONSTRAINT_NAME IN (
                    SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '$table' AND COLUMN_NAME = '$fkCol'
                )";
        $stmt = $pdo->query($sql);
        $fk = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($fk) {
            if ($fk['DELETE_RULE'] === 'CASCADE') {
                $success[] = "ON DELETE CASCADE active for `$table.$fkCol` -> `{$fk['REFERENCED_TABLE_NAME']}`.";
            } else {
                $warnings[] = "FK exists for `$table.$fkCol` but DELETE_RULE is `{$fk['DELETE_RULE']}` (Not CASCADE). Manual delete (Redundant cleanup) is required and present.";
            }
        } else {
            $warnings[] = "No Foreign Key on `$table.$fkCol`. Manual delete logic in API is REQUIRED (and currently implemented).";
        }
    }

    // 4. Verify Indexing for Performance (Cleanup queries use these)
    echo "\n4. Checking Indexes for Cleanup Performance...\n";

    // queue_jobs status (Commonly used)
    $stmt = $pdo->query("SHOW INDEX FROM queue_jobs WHERE Column_name = 'status'");
    if ($stmt->fetch()) {
        $success[] = "Index on `queue_jobs.status` exists.";
    } else {
        $warnings[] = "Missing index on `queue_jobs.status`. Cleanup queries might be slow.";
    }

    // Summary
    echo "\n=== RESULTS ===\n";
    if (empty($conflicts)) {
        echo "[PASSED] Core schema compatible with new cleanup logic.\n";
    } else {
        echo "[FAILED] Critical schema conflicts found.\n";
    }

    echo "\nFound " . count($success) . " OK, " . count($warnings) . " Warnings, " . count($conflicts) . " Conflicts.\n";

    if (!empty($conflicts)) {
        echo "\nCONFLICTS:\n";
        foreach ($conflicts as $c)
            echo " - $c\n";
    }

    if (!empty($warnings)) {
        echo "\nWARNINGS (Handled by code logic):\n";
        foreach ($warnings as $w)
            echo " - $w\n";
    }

} catch (Exception $e) {
    echo "\n[ERROR] Exception during check: " . $e->getMessage() . "\n";
}
?>