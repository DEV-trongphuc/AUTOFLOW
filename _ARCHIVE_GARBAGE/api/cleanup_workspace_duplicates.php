<?php
/**
 * Cleanup Workspace Duplicates
 * This script finds and removes duplicate entries in ai_workspace_files table
 * Keeps only the oldest record for each unique combination of conversation_id + file_name + file_url
 */

require_once 'db_connect.php';

// Set execution time limit for large databases
set_time_limit(300);

echo "=== Workspace Duplicates Cleanup Tool ===\n\n";

try {
    // Step 1: Analyze duplicates
    echo "Step 1: Analyzing duplicates...\n";

    $analyzeQuery = "
        SELECT 
            conversation_id,
            file_name,
            file_url,
            COUNT(*) as duplicate_count,
            GROUP_CONCAT(id ORDER BY created_at ASC) as all_ids
        FROM ai_workspace_files
        GROUP BY conversation_id, file_name, file_url
        HAVING COUNT(*) > 1
        ORDER BY duplicate_count DESC
    ";

    $stmt = $pdo->query($analyzeQuery);
    $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($duplicates)) {
        echo "✅ No duplicates found! Database is clean.\n";
        exit(0);
    }

    $totalDuplicateGroups = count($duplicates);
    $totalRecordsToDelete = 0;

    foreach ($duplicates as $dup) {
        $totalRecordsToDelete += ($dup['duplicate_count'] - 1); // Keep 1, delete the rest
    }

    echo "Found $totalDuplicateGroups groups of duplicates\n";
    echo "Total records to delete: $totalRecordsToDelete\n\n";

    // Show top 10 worst offenders
    echo "Top 10 files with most duplicates:\n";
    echo str_repeat("-", 80) . "\n";
    printf("%-40s %-10s %-20s\n", "File Name", "Count", "Conversation ID");
    echo str_repeat("-", 80) . "\n";

    foreach (array_slice($duplicates, 0, 10) as $dup) {
        $fileName = strlen($dup['file_name']) > 40 ? substr($dup['file_name'], 0, 37) . '...' : $dup['file_name'];
        $convId = substr($dup['conversation_id'], 0, 20);
        printf("%-40s %-10s %-20s\n", $fileName, $dup['duplicate_count'], $convId);
    }
    echo str_repeat("-", 80) . "\n\n";

    // Ask for confirmation
    echo "⚠️  WARNING: This will DELETE $totalRecordsToDelete duplicate records!\n";
    echo "Only the OLDEST record for each file will be kept.\n\n";

    if (php_sapi_name() === 'cli') {
        echo "Do you want to proceed? (yes/no): ";
        $handle = fopen("php://stdin", "r");
        $line = trim(fgets($handle));
        fclose($handle);

        if (strtolower($line) !== 'yes') {
            echo "❌ Cleanup cancelled.\n";
            exit(0);
        }
    } else {
        // Web interface - require GET parameter
        if (!isset($_GET['confirm']) || $_GET['confirm'] !== 'yes') {
            echo "To run this cleanup via web, add ?confirm=yes to the URL\n";
            echo "Example: cleanup_workspace_duplicates.php?confirm=yes\n";
            exit(0);
        }
    }

    // Step 2: Delete duplicates
    echo "\nStep 2: Deleting duplicates...\n";

    $pdo->beginTransaction();

    $deletedCount = 0;
    $errorCount = 0;

    foreach ($duplicates as $dup) {
        try {
            $ids = explode(',', $dup['all_ids']);
            $keepId = $ids[0]; // Keep the first (oldest) one
            $deleteIds = array_slice($ids, 1); // Delete the rest

            if (!empty($deleteIds)) {
                $placeholders = implode(',', array_fill(0, count($deleteIds), '?'));
                $deleteQuery = "DELETE FROM ai_workspace_files WHERE id IN ($placeholders)";
                $deleteStmt = $pdo->prepare($deleteQuery);
                $deleteStmt->execute($deleteIds);

                $deleted = $deleteStmt->rowCount();
                $deletedCount += $deleted;

                if ($deletedCount % 100 === 0) {
                    echo "Progress: Deleted $deletedCount records...\n";
                }
            }
        } catch (Exception $e) {
            $errorCount++;
            echo "Error deleting duplicates for file: {$dup['file_name']} - {$e->getMessage()}\n";
        }
    }

    $pdo->commit();

    echo "\n=== Cleanup Complete ===\n";
    echo "✅ Successfully deleted: $deletedCount duplicate records\n";
    if ($errorCount > 0) {
        echo "⚠️  Errors encountered: $errorCount\n";
    }

    // Step 3: Verify cleanup
    echo "\nStep 3: Verifying cleanup...\n";
    $verifyStmt = $pdo->query($analyzeQuery);
    $remainingDuplicates = $verifyStmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($remainingDuplicates)) {
        echo "✅ Verification passed! No duplicates remaining.\n";
    } else {
        echo "⚠️  Warning: " . count($remainingDuplicates) . " duplicate groups still exist.\n";
        echo "You may need to run this script again.\n";
    }

    // Step 4: Show final statistics
    echo "\n=== Final Statistics ===\n";
    $totalRecords = $pdo->query("SELECT COUNT(*) FROM ai_workspace_files")->fetchColumn();
    $uniqueFiles = $pdo->query("SELECT COUNT(DISTINCT CONCAT(conversation_id, '|', file_name, '|', file_url)) FROM ai_workspace_files")->fetchColumn();

    echo "Total records in ai_workspace_files: $totalRecords\n";
    echo "Unique files: $uniqueFiles\n";
    echo "Space saved: " . ($deletedCount > 0 ? "~" . round($deletedCount / $totalRecords * 100, 2) . "%" : "0%") . "\n";

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "❌ Fatal error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✅ Done!\n";
