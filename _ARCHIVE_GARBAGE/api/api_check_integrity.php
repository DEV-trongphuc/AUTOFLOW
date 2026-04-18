<?php
/**
 * MISSION-CRITICAL FLOW INTEGRITY AUDIT V2.0
 * Checks for logical conflicts, orphaned states, and schema inconsistencies.
 */

require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');
set_time_limit(600);
ini_set('memory_limit', '512M');

ini_set('display_errors', 1);
error_reporting(E_ALL);

function logAudit($msg, $type = 'INFO')
{
    echo "[$type] " . $msg . "\n";
    flush(); // Force output to browser
}

logAudit("Starting Flow Integrity Audit...");
logAudit("Time: " . date('Y-m-d H:i:s'));

// 1. SCHEMA CHECK
logAudit("--- Phase 1: Schema Consistency ---");
$tables = ['flows', 'subscriber_flow_states', 'subscribers', 'campaigns', 'queue_jobs'];
foreach ($tables as $table) {
    try {
        $pdo->query("SELECT 1 FROM `$table` LIMIT 1");
        logAudit("Table `$table` exists.");
    } catch (Exception $e) {
        logAudit("Table `$table` is MISSING or corrupted!", "ERROR");
    }
}

$requiredCols = [
    'subscriber_flow_states' => ['last_step_at', 'status', 'step_id', 'flow_id', 'subscriber_id'],
    'flows' => ['trigger_type', 'steps', 'config', 'status'],
    'subscribers' => ['status', 'email']
];

foreach ($requiredCols as $table => $cols) {
    foreach ($cols as $col) {
        try {
            $pdo->query("SELECT `$col` FROM `$table` LIMIT 1");
            logAudit("`$table`.`$col` is present.");
        } catch (Exception $e) {
            logAudit("MISSING COLUMN: `$table`.`$col`!", "ERROR");
        }
    }
}

// 2. ORPHANED STATES CHECK
logAudit("\n--- Phase 2: Orphaned Subscriber States ---");

// A. Subscribers in flows that don't exist
$stmt = $pdo->query("
    SELECT COUNT(*) 
    FROM subscriber_flow_states q 
    LEFT JOIN flows f ON q.flow_id = f.id 
    WHERE f.id IS NULL
");
$orphanedFlows = $stmt->fetchColumn();
if ($orphanedFlows > 0) {
    logAudit("Found $orphanedFlows states belonging to DELETED flows!", "WARNING");
    logAudit("Recommendation: Running `DELETE FROM subscriber_flow_states WHERE flow_id NOT IN (SELECT id FROM flows)`");
} else {
    logAudit("No orphaned flow states found.");
}

// B. Subscribers at steps that don't exist
logAudit("Checking for subscribers stuck at non-existent steps...");
$stmt = $pdo->query("SELECT id, steps, name FROM flows WHERE status = 'active'");
$flows = $stmt->fetchAll();
$totalOrphanedSteps = 0;

foreach ($flows as $flow) {
    if (empty(trim($flow['steps'] ?? ''))) {
        logAudit("Flow '{$flow['id']}': HAS NO STEPS!", "ERROR");
        continue;
    }
    $steps = json_decode($flow['steps'], true) ?: [];
    $stepIds = array_map(function ($s) {
        return trim($s['id'] ?? '');
    }, $steps);

    // Check for subscribers with empty step_id
    $stmtEmpty = $pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states WHERE flow_id = ? AND (step_id IS NULL OR step_id = '') AND status IN ('waiting', 'processing')");
    $stmtEmpty->execute([$flow['id']]);
    $emptyCount = $stmtEmpty->fetchColumn();
    if ($emptyCount > 0) {
        logAudit("Flow '{$flow['id']}': Found $emptyCount subscribers with EMPTY step_id!", "ERROR");
    }

    $filteredSteps = array_values(array_filter($stepIds));
    if (!empty($filteredSteps)) {
        logAudit("  -> Validating " . count($filteredSteps) . " steps for Flow '{$flow['name']}' ({$flow['id']})...");
        $placeholders = implode(',', array_fill(0, count($filteredSteps), '?'));
        $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states WHERE flow_id = ? AND status IN ('waiting', 'processing') AND step_id != '' AND step_id NOT IN ($placeholders)");
        $stmtCheck->execute(array_merge([$flow['id']], $filteredSteps));
        $count = $stmtCheck->fetchColumn();
        if ($count > 0) {
            logAudit("Flow '{$flow['id']}': Found $count subscribers at non-existent steps!", "ERROR");
            $totalOrphanedSteps += $count;
        }
    }
}
if ($totalOrphanedSteps == 0)
    logAudit("All waiting subscribers are at valid steps.");

// 3. LOGICAL LOOP & DEAD-END CHECK
logAudit("\n--- Phase 3: Logical Flow Structure ---");

// Recursive Cycle Check helper
if (!function_exists('checkCycleRecursive')) {
    function checkCycleRecursive($stepId, $steps, &$visited, $path = [])
    {
        if (in_array($stepId, $path)) {
            // Found a cycle! Now check if there is a 'wait' step in it
            $cycle = array_slice($path, array_search($stepId, $path));
            $hasWait = false;
            foreach ($cycle as $sid) {
                $s = array_values(array_filter($steps, fn($x) => trim(($x['id'] ?? '')) === trim($sid)))[0] ?? null;
                if ($s && in_array($s['type'] ?? '', ['wait', 'condition'])) {
                    $hasWait = true; // 'condition' also acts as a wait if not met
                    break;
                }
            }
            return $hasWait ? false : $cycle; // Return the cycle path if it's a "tight" loop
        }

        $step = array_values(array_filter($steps, fn($x) => trim(($x['id'] ?? '')) === trim($stepId)))[0] ?? null;
        if (!$step)
            return false;

        $path[] = $stepId;

        $nextSteps = [];
        if (isset($step['nextStepId']))
            $nextSteps[] = $step['nextStepId'];
        if (isset($step['yesStepId']))
            $nextSteps[] = $step['yesStepId'];
        if (isset($step['noStepId']))
            $nextSteps[] = $step['noStepId'];
        if (isset($step['pathAStepId']))
            $nextSteps[] = $step['pathAStepId'];
        if (isset($step['pathBStepId']))
            $nextSteps[] = $step['pathBStepId'];

        if (isset($step['config']['branches'])) {
            foreach ($step['config']['branches'] as $b) {
                if (isset($b['stepId']))
                    $nextSteps[] = $b['stepId'];
            }
        }
        if (isset($step['config']['defaultStepId']))
            $nextSteps[] = $step['config']['defaultStepId'];

        foreach (array_unique(array_filter($nextSteps)) as $nsId) {
            $cyclePath = checkCycleRecursive($nsId, $steps, $visited, $path);
            if ($cyclePath)
                return $cyclePath;
        }

        return false;
    }
}

foreach ($flows as $flow) {
    $steps = json_decode($flow['steps'], true) ?: [];
    $stepIds = array_map(function ($s) {
        return trim($s['id'] ?? '');
    }, $steps);

    foreach ($steps as $s) {
        $label = $s['label'] ?? 'Unnamed';
        $type = $s['type'] ?? 'unknown';

        // Check nextStepId
        $next = trim($s['nextStepId'] ?? '');
        if ($next && !in_array($next, $stepIds)) {
            logAudit("Flow '{$flow['id']}': Step '{$label}' ($type) points to MISSING nextStepId '$next'", "ERROR");
        }

        // Check condition branches
        foreach (['yesStepId', 'noStepId', 'pathAStepId', 'pathBStepId'] as $branch) {
            $bId = trim($s[$branch] ?? $s['config'][$branch] ?? '');
            if ($bId && !in_array($bId, $stepIds)) {
                logAudit("Flow '{$flow['id']}': Step '{$label}' points to MISSING $branch '$bId'", "ERROR");
            }
        }

        // Check link_flow
        if ($type === 'link_flow') {
            $lFlowId = $s['config']['linkedFlowId'] ?? '';
            if ($lFlowId) {
                $stmtLF = $pdo->prepare("SELECT 1 FROM flows WHERE id = ?");
                $stmtLF->execute([$lFlowId]);
                if (!$stmtLF->fetch()) {
                    logAudit("Flow '{$flow['id']}': Step '{$label}' links to non-existent Flow ID '$lFlowId'", "ERROR");
                }
            }
        }
    }

    // 3B. CYCLE DETECTION (TIGHT LOOPS)
    $hasTrigger = false;
    foreach ($steps as $s) {
        if (($s['type'] ?? '') === 'trigger') {
            $hasTrigger = true;
            break;
        }
    }
    if (!$hasTrigger && count($steps) > 0) {
        logAudit("Flow '{$flow['id']}': MISSING TRIGGER! This flow will never start.", "ERROR");
    }

    $trigger = array_values(array_filter($steps, fn($x) => ($x['type'] ?? '') === 'trigger'))[0] ?? null;
    if ($trigger) {
        $visited = [];
        $cycle = checkCycleRecursive($trigger['id'], $steps, $visited);
        if ($cycle) {
            logAudit("Flow '{$flow['id']}': INFINITE TIGHT LOOP DETECTED! Path: " . implode(' -> ', $cycle), "ERROR");
        }
    }

    // 3C. DANGLING BRANCHES & CONDITION TARGETS
    foreach ($steps as $s) {
        if ($s['type'] === 'condition' || $s['type'] === 'advanced_condition') {
            if (empty($s['yesStepId']) && empty($s['noStepId']) && empty($s['config']['defaultStepId']) && empty($s['config']['branches'])) {
                logAudit("Flow '{$flow['id']}': Step '{$s['label']}' is a DEAD-END condition (No branches).", "WARNING");
            }

            // Re-verify TargetStepId points to a reachable ACTION node
            if ($s['type'] === 'condition' && !empty($s['config']['targetStepId'])) {
                $targetId = $s['config']['targetStepId'];
                $targetStep = array_values(array_filter($steps, fn($x) => $x['id'] === $targetId))[0] ?? null;
                if (!$targetStep) {
                    logAudit("Flow '{$flow['id']}': Condition '{$s['label']}' points to a DELETED target action '$targetId'", "ERROR");
                }
            }
        }
    }
}

// 4. DUPLICATE TRIGGER DETECTION
logAudit("\n--- Phase 4: Duplicate Trigger Detection ---");
$stmt = $pdo->query("SELECT id, name, trigger_type, config FROM flows WHERE status = 'active'");
$activeFlows = $stmt->fetchAll();
$triggerFingerprints = [];
foreach ($activeFlows as $f) {
    if (empty($f['trigger_type']))
        continue;
    $config = json_decode($f['config'], true) ?: [];
    // Extract trigger details from first step if trigger_type set
    $steps = json_decode($pdo->query("SELECT steps FROM flows WHERE id = '{$f['id']}'")->fetchColumn(), true) ?: [];
    $triggerStep = array_values(array_filter($steps, fn($x) => ($x['type'] ?? '') === 'trigger'))[0] ?? null;

    if ($triggerStep) {
        $tType = $triggerStep['config']['type'] ?? 'unknown';
        $tTarget = $triggerStep['config']['targetId'] ?? 'none';
        $fingerprint = "$tType|$tTarget";

        if (isset($triggerFingerprints[$fingerprint])) {
            logAudit("DUPLICATE TRIGGER DETECTED: Flow '{$f['name']}' ({$f['id']}) has same trigger as '{$triggerFingerprints[$fingerprint]['name']}' ({$triggerFingerprints[$fingerprint]['id']})", "WARNING");
        } else {
            $triggerFingerprints[$fingerprint] = ['id' => $f['id'], 'name' => $f['name']];
        }
    }
}

// 5. STUCK PROCESSING CHECK
logAudit("\n--- Phase 5: Stuck Workers ---");
$stmt = $pdo->query("SELECT COUNT(*) FROM subscriber_flow_states WHERE status = 'processing' AND updated_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)");
$stuck = $stmt->fetchColumn();
if ($stuck > 0) {
    logAudit("Found $stuck subscribers stuck in 'processing' for > 10 minutes (Potential crash/timeout).", "WARNING");
} else {
    logAudit("No stuck processing states detected.");
}

// 6. QUEUE HEALTH
logAudit("\n--- Phase 6: Queue Job Health ---");
$stmt = $pdo->query("SELECT status, COUNT(*) as count FROM queue_jobs GROUP BY status");
$qStats = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
logAudit("Queue Jobs: " . json_encode($qStats));

if (($qStats['failed'] ?? 0) > 0) {
    logAudit("There are failed queue jobs. Breaking down top errors by type:", "WARNING");
    $stmtErrors = $pdo->query("
        SELECT queue, 
               JSON_UNQUOTE(JSON_EXTRACT(payload, '$.action')) as action,
               error_message, 
               COUNT(*) as count 
        FROM queue_jobs 
        WHERE status = 'failed' 
        GROUP BY queue, action, error_message 
        ORDER BY count DESC 
        LIMIT 10
    ");
    while ($err = $stmtErrors->fetch(PDO::FETCH_ASSOC)) {
        $type = $err['queue'] . ($err['action'] ? " [" . $err['action'] . "]" : "");
        logAudit("  -> " . $err['count'] . " jobs ($type): " . ($err['error_message'] ?: 'Unknown Error'), "WARNING");
    }
}

logAudit("\nAudit complete.");
