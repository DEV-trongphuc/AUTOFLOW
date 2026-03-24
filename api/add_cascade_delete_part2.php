<?php
/**
 * Migration Part 2: Add CASCADE DELETE for Flow Tables
 * 
 * This adds foreign key constraints for the actual flow tables in your database:
 * - flow_enrollments
 * - subscriber_flow_states
 * - flow_event_queue
 */

require_once __DIR__ . '/db_connect.php';

echo "=== MIGRATION PART 2: FLOW TABLES CASCADE DELETE ===\n\n";

try {
    echo "Step 1: Removing old flow constraints (if any)...\n";

    $dropConstraints = [
        "ALTER TABLE flow_enrollments DROP FOREIGN KEY IF EXISTS fk_fe_subscriber",
        "ALTER TABLE flow_enrollments DROP FOREIGN KEY IF EXISTS fk_fe_flow",
        "ALTER TABLE subscriber_flow_states DROP FOREIGN KEY IF EXISTS fk_sfs_subscriber",
        "ALTER TABLE subscriber_flow_states DROP FOREIGN KEY IF EXISTS fk_sfs_flow",
        "ALTER TABLE flow_event_queue DROP FOREIGN KEY IF EXISTS fk_feq_subscriber",
        "ALTER TABLE flow_event_queue DROP FOREIGN KEY IF EXISTS fk_feq_flow",
        "ALTER TABLE subscriber_notes DROP FOREIGN KEY IF EXISTS fk_sn_subscriber",
        "ALTER TABLE zalo_subscribers DROP FOREIGN KEY IF EXISTS fk_zs_subscriber",
        "ALTER TABLE zalo_subscriber_activity DROP FOREIGN KEY IF EXISTS fk_zsa_subscriber",
    ];

    foreach ($dropConstraints as $sql) {
        try {
            $pdo->exec($sql);
        } catch (Exception $e) {
            // Ignore if doesn't exist
        }
    }
    echo "Old constraints removed\n\n";

    echo "Step 2: Adding new foreign key constraints...\n";

    $constraints = [
        // flow_enrollments
        [
            'sql' => "ALTER TABLE flow_enrollments 
                      ADD CONSTRAINT fk_fe_subscriber 
                      FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) 
                      ON DELETE CASCADE",
            'description' => 'flow_enrollments -> subscribers (CASCADE DELETE)'
        ],
        [
            'sql' => "ALTER TABLE flow_enrollments 
                      ADD CONSTRAINT fk_fe_flow 
                      FOREIGN KEY (flow_id) REFERENCES flows(id) 
                      ON DELETE CASCADE",
            'description' => 'flow_enrollments -> flows (CASCADE DELETE)'
        ],

        // subscriber_flow_states
        [
            'sql' => "ALTER TABLE subscriber_flow_states 
                      ADD CONSTRAINT fk_sfs_subscriber 
                      FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) 
                      ON DELETE CASCADE",
            'description' => 'subscriber_flow_states -> subscribers (CASCADE DELETE)'
        ],
        [
            'sql' => "ALTER TABLE subscriber_flow_states 
                      ADD CONSTRAINT fk_sfs_flow 
                      FOREIGN KEY (flow_id) REFERENCES flows(id) 
                      ON DELETE CASCADE",
            'description' => 'subscriber_flow_states -> flows (CASCADE DELETE)'
        ],

        // flow_event_queue
        [
            'sql' => "ALTER TABLE flow_event_queue 
                      ADD CONSTRAINT fk_feq_subscriber 
                      FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) 
                      ON DELETE CASCADE",
            'description' => 'flow_event_queue -> subscribers (CASCADE DELETE)'
        ],
        [
            'sql' => "ALTER TABLE flow_event_queue 
                      ADD CONSTRAINT fk_feq_flow 
                      FOREIGN KEY (flow_id) REFERENCES flows(id) 
                      ON DELETE CASCADE",
            'description' => 'flow_event_queue -> flows (CASCADE DELETE)'
        ],

        // subscriber_notes
        [
            'sql' => "ALTER TABLE subscriber_notes 
                      ADD CONSTRAINT fk_sn_subscriber 
                      FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) 
                      ON DELETE CASCADE",
            'description' => 'subscriber_notes -> subscribers (CASCADE DELETE)'
        ],

        // zalo_subscribers
        [
            'sql' => "ALTER TABLE zalo_subscribers 
                      ADD CONSTRAINT fk_zs_subscriber 
                      FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) 
                      ON DELETE CASCADE",
            'description' => 'zalo_subscribers -> subscribers (CASCADE DELETE)'
        ],

        // zalo_subscriber_activity
        [
            'sql' => "ALTER TABLE zalo_subscriber_activity 
                      ADD CONSTRAINT fk_zsa_subscriber 
                      FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) 
                      ON DELETE CASCADE",
            'description' => 'zalo_subscriber_activity -> subscribers (CASCADE DELETE)'
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

    echo "\n=== MIGRATION PART 2 SUMMARY ===\n";
    echo "Successfully added: $successCount constraints\n";
    echo "Failed: $failCount constraints\n";

    if ($failCount === 0) {
        echo "\n✅ All flow-related constraints added successfully!\n";
        echo "\n=== COMPLETE DATABASE INTEGRITY ===\n";
        echo "Your database now has FULL referential integrity:\n";
        echo "  ✓ subscriber_lists (CASCADE DELETE)\n";
        echo "  ✓ subscriber_tags (CASCADE DELETE)\n";
        echo "  ✓ segment_exclusions (CASCADE DELETE)\n";
        echo "  ✓ subscriber_activity (CASCADE DELETE)\n";
        echo "  ✓ flow_enrollments (CASCADE DELETE)\n";
        echo "  ✓ subscriber_flow_states (CASCADE DELETE)\n";
        echo "  ✓ flow_event_queue (CASCADE DELETE)\n";
        echo "  ✓ subscriber_notes (CASCADE DELETE)\n";
        echo "  ✓ zalo_subscribers (CASCADE DELETE)\n";
        echo "  ✓ zalo_subscriber_activity (CASCADE DELETE)\n";
        echo "\nWhen you delete a subscriber, ALL related data is automatically cleaned up!\n";
    }

} catch (Exception $e) {
    echo "\nFATAL ERROR: " . $e->getMessage() . "\n";
}

echo "\n=== MIGRATION COMPLETE ===\n";
