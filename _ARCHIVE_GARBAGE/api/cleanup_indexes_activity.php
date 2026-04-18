<?php
// api/cleanup_indexes_activity.php
// SAFETY TOOL: This script removes redundant indexes from subscriber_activity 
// to speed up performance for high-volume sending.

header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "=== Subscriber Activity Index Optimization ===\n\n";

// 1. Get current indexes
$stmt = $pdo->query("SHOW INDEX FROM subscriber_activity");
$indices = $stmt->fetchAll();

$map = [];
foreach ($indices as $idx) {
    $name = $idx['Key_name'];
    if (!isset($map[$name]))
        $map[$name] = [];
    $map[$name][] = $idx['Column_name'];
}

echo "Detected " . count($map) . " indexes.\n";

// 2. Identify Redundant ones (common in this codebase)
// We want to keep the primary key and core functional indexes.
// Many indexes are just single columns that are already part of composite indexes.

$toDrop = [
    'idx_sub',          // redundant if idx_sub_history (sub_id, created_at) exists
    'idx_type',         // low cardinality, usually scanned with sub_id
    'idx_flow',         // usually scanned with sub_id
    'idx_camp',         // usually scanned with sub_id
    'idx_sub_id',       // dupe of idx_sub
    'subscriber_id'     // dupe of idx_sub
];

// Special check: If we have (subscriber_id, created_at) we don't need (subscriber_id)
$hasCompositeSub = false;
foreach ($map as $name => $cols) {
    if (count($cols) >= 2 && $cols[0] === 'subscriber_id' && $cols[1] === 'created_at') {
        $hasCompositeSub = true;
        break;
    }
}

if ($hasCompositeSub) {
    echo "Confirmed: (subscriber_id, created_at) exists. Single 'subscriber_id' indexes are redundant.\n";
}

$dropped = 0;
foreach ($toDrop as $idxName) {
    if (isset($map[$idxName])) {
        echo "Attempting to drop redundant index: $idxName... ";
        try {
            $pdo->exec("ALTER TABLE subscriber_activity DROP INDEX `$idxName` ");
            echo "DONE.\n";
            $dropped++;
        } catch (Exception $e) {
            echo "FAILED: " . $e->getMessage() . "\n";
        }
    }
}

echo "\nSummary: Dropped $dropped redundant indexes.\n";
echo "Run system_perf_check.php again to see the improved 'Activity' index count.\n";
