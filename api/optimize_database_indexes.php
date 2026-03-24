<?php
// api/optimize_database_indexes.php
require_once 'db_connect.php';

function optimizeIndexes($pdo)
{
    echo "Starting DB Index Optimization...\n";

    $tablesToOptimize = ['ai_training_chunks', 'ai_training_docs', 'ai_conversations', 'ai_org_conversations', 'global_assets'];

    foreach ($tablesToOptimize as $table) {
        echo "Processing table: $table\n";

        try {
            $stmt = $pdo->prepare("SHOW INDEX FROM $table");
            $stmt->execute();
            $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $redundant = [];
            $colsSeen = []; // Map column combinations to first index found

            foreach ($indexes as $idx) {
                $name = $idx['Key_name'];
                if ($name === 'PRIMARY')
                    continue;

                $colName = $idx['Column_name'];
                $seq = $idx['Seq_in_index'];

                // Track columns for each index
                if (!isset($idxMap[$name]))
                    $idxMap[$name] = [];
                $idxMap[$name][$seq] = $colName;
            }

            if (empty($idxMap)) {
                echo "  No indexes found for $table.\n";
                continue;
            }

            foreach ($idxMap as $name => $cols) {
                ksort($cols);
                // GET INDEX TYPE (FULLTEXT vs BTREE)
                $type = "";
                foreach ($indexes as $i) {
                    if ($i['Key_name'] === $name) {
                        $type = $i['Index_type'] ?? "";
                        break;
                    }
                }
                $sig = $type . ":" . implode(',', $cols);

                if (isset($colsSeen[$sig])) {
                    echo "  Found redundant index: $name (same as " . $colsSeen[$sig] . " for columns [$sig])\n";
                    $redundant[] = $name;
                } else {
                    $colsSeen[$sig] = $name;
                }
            }

            if (!empty($redundant)) {
                foreach ($redundant as $idxName) {
                    echo "  Dropping index $idxName from $table...\n";
                    $pdo->exec("ALTER TABLE `$table` DROP INDEX `$idxName` ");
                }
            } else {
                echo "  No redundant indexes found.\n";
            }

            unset($idxMap);
        } catch (Exception $e) {
            echo "  Error: " . $e->getMessage() . "\n";
        }
    }

    echo "Optimization Complete.\n";
}

if (php_sapi_name() === 'cli' || isset($_GET['run'])) {
    optimizeIndexes($pdo);
} else {
    echo "Click <a href='?run=1'>here</a> to run optimization.";
}
