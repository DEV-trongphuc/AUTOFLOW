<?php
require_once 'db_connect.php';

echo "=== CLEANUP ORPHANED RECORDS ===\n\n";

try {
    $pdo->beginTransaction();

    // 1. Find and delete orphaned records in subscriber_lists
    echo "Step 1: Finding orphaned records in subscriber_lists...\n";
    $stmt = $pdo->query("
        SELECT sl.list_id, COUNT(*) as orphaned_count
        FROM subscriber_lists sl 
        LEFT JOIN subscribers s ON sl.subscriber_id = s.id 
        WHERE s.id IS NULL
        GROUP BY sl.list_id
    ");
    $orphanedByList = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($orphanedByList) > 0) {
        echo "Found orphaned records in " . count($orphanedByList) . " lists:\n";
        foreach ($orphanedByList as $item) {
            echo "  List ID {$item['list_id']}: {$item['orphaned_count']} orphaned records\n";
        }

        // Delete orphaned records
        echo "\nStep 2: Deleting orphaned records...\n";
        $deleteStmt = $pdo->exec("
            DELETE sl FROM subscriber_lists sl 
            LEFT JOIN subscribers s ON sl.subscriber_id = s.id 
            WHERE s.id IS NULL
        ");
        echo "Deleted $deleteStmt orphaned records\n";
    } else {
        echo "No orphaned records found in subscriber_lists\n";
    }

    // 2. Update subscriber_count for all lists
    echo "\nStep 3: Updating subscriber counts for all lists...\n";
    $updateStmt = $pdo->exec("
        UPDATE lists l 
        SET subscriber_count = (
            SELECT COUNT(*) 
            FROM subscriber_lists sl 
            WHERE sl.list_id = l.id
        )
    ");
    echo "Updated $updateStmt lists\n";

    // 3. Check for orphaned records in subscriber_tags
    echo "\nStep 4: Checking subscriber_tags...\n";
    $stmt = $pdo->query("
        SELECT COUNT(*) as orphaned_count
        FROM subscriber_tags st 
        LEFT JOIN subscribers s ON st.subscriber_id = s.id 
        WHERE s.id IS NULL
    ");
    $orphanedTags = $stmt->fetchColumn();

    if ($orphanedTags > 0) {
        echo "Found $orphanedTags orphaned records in subscriber_tags\n";
        $pdo->exec("
            DELETE st FROM subscriber_tags st 
            LEFT JOIN subscribers s ON st.subscriber_id = s.id 
            WHERE s.id IS NULL
        ");
        echo "Deleted orphaned tag records\n";
    } else {
        echo "No orphaned records in subscriber_tags\n";
    }

    // 4. Check for orphaned records in segment_exclusions
    echo "\nStep 5: Checking segment_exclusions...\n";
    $stmt = $pdo->query("
        SELECT COUNT(*) as orphaned_count
        FROM segment_exclusions se 
        LEFT JOIN subscribers s ON se.subscriber_id = s.id 
        WHERE s.id IS NULL
    ");
    $orphanedExclusions = $stmt->fetchColumn();

    if ($orphanedExclusions > 0) {
        echo "Found $orphanedExclusions orphaned records in segment_exclusions\n";
        $pdo->exec("
            DELETE se FROM segment_exclusions se 
            LEFT JOIN subscribers s ON se.subscriber_id = s.id 
            WHERE s.id IS NULL
        ");
        echo "Deleted orphaned exclusion records\n";
    } else {
        echo "No orphaned records in segment_exclusions\n";
    }

    $pdo->commit();

    echo "\n=== CLEANUP COMPLETED SUCCESSFULLY ===\n";
    echo "\nVerifying Data Topup list...\n";

    $stmt = $pdo->prepare("SELECT name, subscriber_count FROM lists WHERE id = ?");
    $stmt->execute(['695c1d36e803f']);
    $list = $stmt->fetch();
    echo "List: {$list['name']}\n";
    echo "Updated count: {$list['subscriber_count']}\n";

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "\nERROR: " . $e->getMessage() . "\n";
}
