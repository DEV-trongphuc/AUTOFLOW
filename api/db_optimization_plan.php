<?php
// api/db_optimization_plan.php - DEBUGGED VERSION
require_once 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');

function getIndexes($pdo, $table)
{
    try {
        $stmt = $pdo->query("SHOW INDEX FROM `$table` ");
        if (!$stmt)
            return [];
        $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $grouped = [];
        foreach ($indexes as $idx) {
            $name = $idx['Key_name'];
            if (!isset($grouped[$name])) {
                $grouped[$name] = [
                    'name' => $name,
                    'unique' => $idx['Non_unique'] == 0,
                    'columns' => []
                ];
            }
            $grouped[$name]['columns'][] = $idx['Column_name'];
        }
        return $grouped;
    } catch (Exception $e) {
        return [];
    }
}

try {
    $plan = [];
    $tables = ['subscribers', 'subscriber_lists', 'web_visitors', 'web_sessions', 'web_page_views', 'web_events'];

    foreach ($tables as $table) {
        $indexes = getIndexes($pdo, $table);
        if (empty($indexes))
            continue;

        $names = array_keys($indexes);
        $toDrop = [];

        foreach ($names as $nameA) {
            foreach ($names as $nameB) {
                if ($nameA === $nameB)
                    continue;
                if (in_array($nameA, $toDrop) || in_array($nameB, $toDrop))
                    continue;

                $idxA = $indexes[$nameA];
                $idxB = $indexes[$nameB];

                // Prefix check
                $isPrefix = true;
                if (count($idxA['columns']) > count($idxB['columns'])) {
                    $isPrefix = false;
                } else {
                    foreach ($idxA['columns'] as $k => $col) {
                        if (!isset($idxB['columns'][$k]) || $idxB['columns'][$k] !== $col) {
                            $isPrefix = false;
                            break;
                        }
                    }
                }

                if ($isPrefix) {
                    // Safety rules
                    if ($nameA === 'PRIMARY')
                        continue;

                    // If A is unique, we can only drop it if B is also unique on the same column set
                    if ($idxA['unique']) {
                        if (!$idxB['unique'] || count($idxA['columns']) !== count($idxB['columns'])) {
                            continue; // Keep the unique constraint
                        }
                    }

                    // Same length? Keep one, drop other based on name sorting
                    if (count($idxA['columns']) === count($idxB['columns'])) {
                        if ($nameA < $nameB)
                            continue;
                    }

                    $toDrop[] = $nameA;
                    $plan[] = "-- [Prefix/Duplicate] Table: $table, Index: $nameA is covered by $nameB";
                    $plan[] = "ALTER TABLE `$table` DROP INDEX `$nameA`;";
                    break;
                }
            }
        }
    }

    // Collation fixes - Ensure we get real table names
    $stmtTables = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()");
    $allTables = $stmtTables->fetchAll(PDO::FETCH_COLUMN);

    foreach ($allTables as $table) {
        $stmtColl = $pdo->prepare("SELECT table_collation FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?");
        $stmtColl->execute([$table]);
        $coll = $stmtColl->fetchColumn();

        if ($coll && str_pos_check($coll, 'utf8mb4') === false) {
            $plan[] = "ALTER TABLE `$table` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;";
        }
    }

    echo json_encode([
        'success' => true,
        'steps_count' => count(array_filter($plan, function ($v) {
            return strpos($v, 'ALTER') === 0; })),
        'optimization_plan' => array_values(array_unique($plan)),
        'notes' => [
            'How to use' => 'Copy the SQL commands above and run them in your SQL manager (like phpMyAdmin) or I can create an execute script for you.',
            'Safety' => 'Primary keys and Unique constraints are preserved.'
        ]
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => "Internal Error: " . $e->getMessage()]);
}

function str_pos_check($haystack, $needle)
{
    return strpos($haystack, $needle);
}
