<?php
/**
 * Migration: Add Foreign Key Constraints with CASCADE DELETE
 * 
 * This migration adds proper foreign key constraints to prevent orphaned records
 * when subscribers are deleted from the system.
 * 
 * Run this AFTER running cleanup_orphaned_records.php
 */

require_once 'db_connect.php';

echo "=== DATABASE MIGRATION: ADD CASCADE DELETE CONSTRAINTS ===\n\n";

try {
    // Check if we're using InnoDB (required for foreign keys)
    echo "Step 1: Checking table engines...\n";
    $tables = ['subscribers', 'subscriber_lists', 'subscriber_tags', 'segment_exclusions', 'lists', 'tags', 'segments'];

    foreach ($tables as $table) {
        $stmt = $pdo->query("SHOW TABLE STATUS WHERE Name = '$table'");
        $info = $stmt->fetch();
        if ($info && $info['Engine'] !== 'InnoDB') {
            echo "  Converting $table to InnoDB...\n";
            $pdo->exec("ALTER TABLE $table ENGINE=InnoDB");
        }
    }
    echo "All tables are using InnoDB engine\n\n";

    // Drop existing foreign keys if they exist (to avoid errors)
    echo "Step 2: Removing old constraints (if any)...\n";

    $dropConstraints = [
        "ALTER TABLE subscriber_lists DROP FOREIGN KEY IF EXISTS fk_sl_subscriber",
        "ALTER TABLE subscriber_lists DROP FOREIGN KEY IF EXISTS fk_sl_list",
        "ALTER TABLE subscriber_tags DROP FOREIGN KEY IF EXISTS fk_st_subscriber",
        "ALTER TABLE subscriber_tags DROP FOREIGN KEY IF EXISTS fk_st_tag",
        "ALTER TABLE segment_exclusions DROP FOREIGN KEY IF EXISTS fk_se_subscriber",
        "ALTER TABLE segment_exclusions DROP FOREIGN KEY IF EXISTS fk_se_segment",
        "ALTER TABLE flow_subscribers DROP FOREIGN KEY IF EXISTS fk_fs_subscriber",
        "ALTER TABLE flow_subscribers DROP FOREIGN KEY IF EXISTS fk_fs_flow",
        "ALTER TABLE subscriber_activity DROP FOREIGN KEY IF EXISTS fk_sa_subscriber",
    ];

    foreach ($dropConstraints as $sql) {
        try {
            $pdo->exec($sql);
        } catch (Exception $e) {
            // Ignore errors if constraint doesn't exist
        }
    }
    echo "Old constraints removed\n\n";

    // Add new foreign key constraints with CASCADE DELETE
    echo "Step 3: Adding new foreign key constraints...\n";

    $constraints = [
        // subscriber_lists
        [
            'table' => 'subscriber_lists',
            'sql' => "ALTER TABLE subscriber_lists 
                      ADD CONSTRAINT fk_sl_subscriber 
                      FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) 
                      ON DELETE CASCADE",
            'description' => 'subscriber_lists -> subscribers (CASCADE DELETE)'
        ],
        [
            'table' => 'subscriber_lists',
            'sql' => "ALTER TABLE subscriber_lists 
                      ADD CONSTRAINT fk_sl_list 
                      FOREIGN KEY (list_id) REFERENCES lists(id) 
                      ON DELETE CASCADE",
            'description' => 'subscriber_lists -> lists (CASCADE DELETE)'
        ],

        // subscriber_tags
        [
            'table' => 'subscriber_tags',
            'sql' => "ALTER TABLE subscriber_tags 
                      ADD CONSTRAINT fk_st_subscriber 
                      FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) 
                      ON DELETE CASCADE",
            'description' => 'subscriber_tags -> subscribers (CASCADE DELETE)'
        ],
        [
            'table' => 'subscriber_tags',
            'sql' => "ALTER TABLE subscriber_tags 
                      ADD CONSTRAINT fk_st_tag 
                      FOREIGN KEY (tag_id) REFERENCES tags(id) 
                      ON DELETE CASCADE",
            'description' => 'subscriber_tags -> tags (CASCADE DELETE)'
        ],

        // segment_exclusions
        [
            'table' => 'segment_exclusions',
            'sql' => "ALTER TABLE segment_exclusions 
                      ADD CONSTRAINT fk_se_subscriber 
                      FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) 
                      ON DELETE CASCADE",
            'description' => 'segment_exclusions -> subscribers (CASCADE DELETE)'
        ],
        [
            'table' => 'segment_exclusions',
            'sql' => "ALTER TABLE segment_exclusions 
                      ADD CONSTRAINT fk_se_segment 
                      FOREIGN KEY (segment_id) REFERENCES segments(id) 
                      ON DELETE CASCADE",
            'description' => 'segment_exclusions -> segments (CASCADE DELETE)'
        ],

        // flow_subscribers
        [
            'table' => 'flow_subscribers',
            'sql' => "ALTER TABLE flow_subscribers 
                      ADD CONSTRAINT fk_fs_subscriber 
                      FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) 
                      ON DELETE CASCADE",
            'description' => 'flow_subscribers -> subscribers (CASCADE DELETE)'
        ],
        [
            'table' => 'flow_subscribers',
            'sql' => "ALTER TABLE flow_subscribers 
                      ADD CONSTRAINT fk_fs_flow 
                      FOREIGN KEY (flow_id) REFERENCES flows(id) 
                      ON DELETE CASCADE",
            'description' => 'flow_subscribers -> flows (CASCADE DELETE)'
        ],

        // subscriber_activity
        [
            'table' => 'subscriber_activity',
            'sql' => "ALTER TABLE subscriber_activity 
                      ADD CONSTRAINT fk_sa_subscriber 
                      FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) 
                      ON DELETE CASCADE",
            'description' => 'subscriber_activity -> subscribers (CASCADE DELETE)'
        ],
    ];

    $successCount = 0;
    $failCount = 0;

    foreach ($constraints as $constraint) {
        try {
            $pdo->exec($constraint['sql']);
            echo "  ✓ Added: {$constraint['description']}\n";
            $successCount++;
        } catch (Exception $e) {
            echo "  ✗ Failed: {$constraint['description']}\n";
            echo "    Error: " . $e->getMessage() . "\n";
            $failCount++;
        }
    }

    echo "\n=== MIGRATION SUMMARY ===\n";
    echo "Successfully added: $successCount constraints\n";
    echo "Failed: $failCount constraints\n";

    if ($failCount > 0) {
        echo "\nNote: Some constraints may have failed due to existing data issues.\n";
        echo "Run cleanup_orphaned_records.php first if you haven't already.\n";
    } else {
        echo "\n✅ All foreign key constraints added successfully!\n";
        echo "Your database now has proper referential integrity.\n";
        echo "When a subscriber is deleted, all related records will be automatically removed.\n";
    }

} catch (Exception $e) {
    echo "\nFATAL ERROR: " . $e->getMessage() . "\n";
    echo "Migration failed. Please check your database configuration.\n";
}

echo "\n=== MIGRATION COMPLETE ===\n";
