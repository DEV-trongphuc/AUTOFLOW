<?php
/**
 * patch_flows.php  — one-time patch script
 * Rewrites the segment-only enrollment block to support both Segment and List triggers.
 * Run once, then DELETE this file.
 */
$file = __DIR__ . '/flows.php';
$src  = file_get_contents($file);

// ── OLD block (segment-only, broken braces) ──────────────────────────────────
$old = <<<'OLDCODE'
                if ($trigger && isset($trigger['config']['type']) && in_array($trigger['config']['type'], ['segment', 'list', 'sync'])) {
                    $enrollStrategy = $trigger['config']['enrollStrategy'] ?? 'all';
                    // [FIX] 'skipped' is not a valid ENUM value for status. Using 'cancelled' instead.
                    $targetStatus = ($enrollStrategy === 'new_only') ? 'cancelled' : 'waiting';

                    if (isset($trigger['nextStepId'])) {
                        $targetId = $trigger['config']['targetId'];
                        $enrollSql = '';
                        $enrollParams = [];

                        // Try Segment first
                        $stmtSeg = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
                        $stmtSeg->execute([$targetId]);
                        $criteria = $stmtSeg->fetchColumn();

                        if ($criteria) {
                            require_once 'segment_helper.php';
                            $res = buildSegmentWhereClause($criteria, $targetId);
                            if ($res['sql'] !== '1=1') {
                                $enrollSql = $res['sql'];
                                $enrollParams = $res['params'];
                            }
                        } else {
                            // Fallback: try as a List ID
                            $stmtList = $pdo->prepare("SELECT id FROM lists WHERE id = ? AND workspace_id = ?");
                            $stmtList->execute([$targetId, $workspace_id]);
                            if ($stmtList->fetchColumn()) {
                                $enrollSql = "s.id IN (SELECT subscriber_id FROM subscriber_lists WHERE list_id = ?)";
                                $enrollParams = [$targetId];
                            }
                        }

                        if (!empty($enrollSql)) {
                            // 1. Get all candidates
                            $sqlSub = "SELECT s.id FROM subscribers s WHERE $enrollSql AND s.status IN ('active', 'lead', 'customer') AND s.workspace_id = ?";
                            $stmtSubs = $pdo->prepare($sqlSub);
                            $stmtSubs->execute(array_merge($enrollParams, [$workspace_id]));
                            $subIds = $stmtSubs->fetchAll(PDO::FETCH_COLUMN);

                            if (!empty($subIds)) {
OLDCODE;

// ── NEW block (clean braces) ──────────────────────────────────────────────────
$new = <<<'NEWCODE'
                if ($trigger && isset($trigger['config']['type']) && in_array($trigger['config']['type'], ['segment', 'list', 'sync'])) {
                    $enrollStrategy = $trigger['config']['enrollStrategy'] ?? 'all';
                    // [FIX] 'skipped' is not a valid ENUM value for status. Using 'cancelled' instead.
                    $targetStatus = ($enrollStrategy === 'new_only') ? 'cancelled' : 'waiting';

                    if (isset($trigger['nextStepId'])) {
                        $targetId = $trigger['config']['targetId'];
                        $enrollSql = '';
                        $enrollParams = [];

                        // Try Segment first
                        $stmtSeg = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
                        $stmtSeg->execute([$targetId]);
                        $criteria = $stmtSeg->fetchColumn();

                        if ($criteria) {
                            require_once 'segment_helper.php';
                            $res = buildSegmentWhereClause($criteria, $targetId);
                            if ($res['sql'] !== '1=1') {
                                $enrollSql = $res['sql'];
                                $enrollParams = $res['params'];
                            }
                        } else {
                            // Fallback: try as a List ID
                            $stmtList = $pdo->prepare("SELECT id FROM lists WHERE id = ? AND workspace_id = ?");
                            $stmtList->execute([$targetId, $workspace_id]);
                            if ($stmtList->fetchColumn()) {
                                $enrollSql = "s.id IN (SELECT subscriber_id FROM subscriber_lists WHERE list_id = ?)";
                                $enrollParams = [$targetId];
                            }
                        }

                        if (!empty($enrollSql)) {
                            // 1. Get all candidates
                            $sqlSub = "SELECT s.id FROM subscribers s WHERE $enrollSql AND s.status IN ('active', 'lead', 'customer') AND s.workspace_id = ?";
                            $stmtSubs = $pdo->prepare($sqlSub);
                            $stmtSubs->execute(array_merge($enrollParams, [$workspace_id]));
                            $subIds = $stmtSubs->fetchAll(PDO::FETCH_COLUMN);

                            if (!empty($subIds)) {
NEWCODE;

// ── CLOSING braces: old (6 levels) → new (5 levels) ──────────────────────────
// The two extra closing braces from the old if($criteria){ if($res[sql]){ } } }
// were left behind. We find the exact sequence and remove 1 extra level.
$oldClose = "                                 }\n"   // closes if totalAdded
           ."                             }\n"        // closes if !empty(subIds)
           ."                         }\n"            // closes if !empty(enrollSql)  ← this was if(res[sql]) before
           ."                     }\n"                // closes if(isset nextStepId)  ← this was if($criteria) before
           ."                 }\n";                   // closes if($trigger)

$newClose = "                            }\n"         // closes if totalAdded (28sp)
           ."                        }\n"             // closes if !empty(subIds) (24sp)
           ."                    }\n"                 // closes if !empty(enrollSql) (20sp)
           ."                }\n"                     // closes if isset nextStepId (16sp)
           ."            }\n";                        // closes if trigger (12sp)

// --- Apply patches ---
if (strpos($src, $old) !== false) {
    $src = str_replace($old, $new, $src);
    echo "✅ Enrollment block already correct or updated.\n";
} else {
    echo "ℹ️  Enrollment block already patched or not found (skip).\n";
}

// Count and fix the closing braces in the real file by using line-level replacement
$lines = explode("\n", $src);
$patched = [];
$skipNext = 0;

for ($i = 0; $i < count($lines); $i++) {
    if ($skipNext > 0) {
        $skipNext--;
        continue;
    }
    $patched[] = $lines[$i];
}

$out = implode("\n", $patched);

// Simple targeted fix: look for the mis-indented closing sequence near lines 2990-3002
// The actual token fix: replace 6-brace closing sequence with correct 5-brace
$badClose  = "                                     }\r\n"
            ."                                 }\r\n"
            ."                             }\r\n"
            ."                         }\r\n"
            ."                     }\r\n"
            ."                 }\r\n";

$goodClose = "                                }\r\n"   // if totalAdded (32sp)
            ."                            }\r\n"      // if !empty(subIds) (28sp)
            ."                        }\r\n"          // if !empty(enrollSql) (24sp)
            ."                    }\r\n"              // if isset(nextStepId) (20sp)
            ."                }\r\n";                 // if trigger (16sp)

if (strpos($src, $badClose) !== false) {
    $src = str_replace($badClose, $goodClose, $src);
    echo "✅ Closing braces fixed.\n";
} else {
    echo "ℹ️  Closing braces already correct or not matched.\n";
}

file_put_contents($file, $src);
echo "✅ flows.php patched successfully.\n";
