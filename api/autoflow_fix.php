<?php
/**
 * AutoFlow Data Fix Script v2 — Safe & Verified
 * Fixes: (1) REAL orphan ZNS logs, (2) Email campaign count drift, (3) Subscribers index dedup, (4) error_log rotation.
 * DELETE AFTER USE.
 */
require_once __DIR__ . '/db_connect.php';
if (($_GET['admin_token'] ?? '') !== ADMIN_BYPASS_TOKEN) { http_response_code(403); die('Unauthorized'); }

header('Content-Type: text/plain; charset=utf-8');
set_time_limit(120);

$dryRun = isset($_GET['dry']) && $_GET['dry'] == '1'; // ?dry=1 to preview without changes

$out = [];
$out[] = "========================================================";
$out[] = "AutoFlow Data Fix v2 — " . date('Y-m-d H:i:s') . ($dryRun ? " [DRY-RUN]" : "");
$out[] = "========================================================\n";

// ─── FIX 1: Real orphan ZNS delivery logs ─────────────────────────────────────
// IMPORTANT: zalo_delivery_logs.subscriber_id references subscribers.id (NOT zalo_subscribers).
// Evidence: campaigns.php:939, flows.php:1331 both JOIN: LEFT JOIN subscribers s ON l.subscriber_id = s.id
// Original health check was WRONG — it joined with zalo_subscribers causing 76 false positives.
$out[] = "--- FIX 1: Orphan ZNS Delivery Logs (correct reference: subscribers table) ---";
try {
    // Count rows where subscriber_id not in EITHER table
    $real = $pdo->query("
        SELECT COUNT(*) FROM zalo_delivery_logs zdl
        LEFT JOIN subscribers s ON s.id = zdl.subscriber_id
        LEFT JOIN zalo_subscribers zs ON zs.id = zdl.subscriber_id
        WHERE zdl.subscriber_id IS NOT NULL
          AND s.id IS NULL
          AND zs.id IS NULL
    ")->fetchColumn();

    $false76 = $pdo->query("
        SELECT COUNT(*) FROM zalo_delivery_logs zdl
        LEFT JOIN zalo_subscribers zs ON zs.id = zdl.subscriber_id
        WHERE zdl.subscriber_id IS NOT NULL AND zs.id IS NULL
    ")->fetchColumn();

    $out[] = "  Health check reported: $false76 'orphans' (incorrect — was joining zalo_subscribers)";
    $out[] = "  Real orphans (not in subscribers OR zalo_subscribers): $real rows";

    if ($real == 0) {
        $out[] = "  [PASS] No real orphan ZNS delivery logs. Health check was FALSE POSITIVE.";
        $out[] = "  ACTION: The health check query in autoflow_health.php needs to be fixed.";
    } else {
        $out[] = "  [WARN] $real real orphan rows found. Reviewing samples:";
        $samples = $pdo->query("
            SELECT zdl.id, zdl.subscriber_id, zdl.phone_number, zdl.status, zdl.sent_at
            FROM zalo_delivery_logs zdl
            LEFT JOIN subscribers s ON s.id = zdl.subscriber_id
            LEFT JOIN zalo_subscribers zs ON zs.id = zdl.subscriber_id
            WHERE zdl.subscriber_id IS NOT NULL AND s.id IS NULL AND zs.id IS NULL
            LIMIT 5
        ")->fetchAll();
        foreach ($samples as $r) {
            $out[] = "    ID={$r['id']} | sub_id={$r['subscriber_id']} | phone={$r['phone_number']} | status={$r['status']}";
        }
        if (!$dryRun) {
            $pdo->exec("
                DELETE zdl FROM zalo_delivery_logs zdl
                LEFT JOIN subscribers s ON s.id = zdl.subscriber_id
                LEFT JOIN zalo_subscribers zs ON zs.id = zdl.subscriber_id
                WHERE zdl.subscriber_id IS NOT NULL AND s.id IS NULL AND zs.id IS NULL
            ");
            $out[] = "  [OK] Deleted $real real orphan rows.";
        } else {
            $out[] = "  [DRY] Would delete $real rows.";
        }
    }
} catch (Exception $e) { $out[] = "  [FAIL] " . $e->getMessage(); }
$out[] = "";

// ─── FIX 2: Campaign count drift — type-safe ─────────────────────────────────
// Risk guard: Only fix EMAIL campaigns (status='sent', with mail_delivery_logs records).
// ZNS campaigns store delivery in zalo_delivery_logs, NOT mail_delivery_logs.
// Fixing count_sent based on mail_delivery_logs for a ZNS campaign would reset it wrongly!
$out[] = "--- FIX 2: Campaign count_sent drift (email campaigns only) ---";
try {
    // Find drifted campaigns — first show what we have
    $campaigns = $pdo->query("
        SELECT c.id, c.name, c.status, c.type, c.count_sent,
               COUNT(mdl.id) AS actual_email_logs
        FROM campaigns c
        LEFT JOIN mail_delivery_logs mdl ON mdl.campaign_id = c.id
        WHERE c.status = 'sent'
        GROUP BY c.id
        HAVING ABS(c.count_sent - COUNT(mdl.id)) > 50
    ")->fetchAll();

    if (empty($campaigns)) {
        $out[] = "  [PASS] No drifted campaigns found.";
    }

    foreach ($campaigns as $c) {
        $type = strtolower($c['type'] ?? 'email');
        $isEmailType = in_array($type, ['email', '']) || $c['actual_email_logs'] > 50;
        $isZnsType = in_array($type, ['zns', 'zalo_zns', 'zalo']);

        $out[] = "  Campaign: {$c['id']} | name={$c['name']} | type={$c['type']} | count_sent={$c['count_sent']} | mail_logs={$c['actual_email_logs']}";

        if ($isZnsType || ($c['actual_email_logs'] == 0 && !$isEmailType)) {
            // Check ZNS delivery count as well
            $znsCount = $pdo->prepare("SELECT COUNT(*) FROM zalo_delivery_logs WHERE flow_id = ? OR (flow_id IS NULL AND id = ?)");
            $znsCount->execute([$c['id'], $c['id']]);
            $znsTotal = $znsCount->fetchColumn();
            $out[] = "  [SKIP] Campaign type='$type', ZNS logs=$znsTotal. Skipped to avoid resetting count_sent incorrectly.";
            continue;
        }

        if (!$isEmailType) {
            $out[] = "  [SKIP] Unknown type '$type' — manual review required.";
            continue;
        }

        // Safe to fix: confirmed email campaign with mail_delivery_logs
        $new = $c['actual_email_logs'];
        $old = $c['count_sent'];

        // Extra sanity: don't fix if actual is 0 and old is positive (might be a ZNS in email type field)
        if ($new == 0 && $old > 100) {
            $out[] = "  [SKIP] actual_email_logs=0 but count_sent={$old}. Suspicious — skipping to avoid data loss.";
            continue;
        }

        // Recalculate opens/clicks from subscriber_activity
        $opens = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = ? AND type = 'open_email'");
        $opens->execute([$c['id']]);
        $countOpens = $opens->fetchColumn();

        $clicks = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = ? AND type = 'click_link'");
        $clicks->execute([$c['id']]);
        $countClicks = $clicks->fetchColumn();

        if (!$dryRun) {
            $pdo->prepare("UPDATE campaigns SET count_sent = ?, count_opened = ?, count_clicked = ? WHERE id = ?")
                ->execute([$new, $countOpens, $countClicks, $c['id']]);
            $out[] = "  [OK] Fixed: count_sent $old→$new | opens=$countOpens | clicks=$countClicks";
        } else {
            $out[] = "  [DRY] Would fix: count_sent $old→$new | opens=$countOpens | clicks=$countClicks";
        }
    }
} catch (Exception $e) { $out[] = "  [FAIL] " . $e->getMessage(); }
$out[] = "";

// ─── FIX 3: subscribers table index dedup ─────────────────────────────────────
// Risk note: db_schema_check.php?fix=true checks for specific named indexes.
// It checks index existence by COLUMN MATCH, not by name.
// So if we drop a single-col 'idx_email' but keep 'idx_email_status (email, status)',
// the schema check WILL re-add idx_email. We only drop indexes fully covered by a bigger one.
$out[] = "--- FIX 3: subscribers Table Index Dedup ---";
try {
    $stmt = $pdo->prepare("
        SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX, NON_UNIQUE
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscribers'
        ORDER BY INDEX_NAME, SEQ_IN_INDEX
    ");
    $stmt->execute();
    $idxCols = []; $idxUnique = [];
    foreach ($stmt->fetchAll() as $r) {
        $idxCols[$r['INDEX_NAME']][] = $r['COLUMN_NAME'];
        $idxUnique[$r['INDEX_NAME']] = ($r['NON_UNIQUE'] == 0);
    }

    $out[] = "  Current indexes on subscribers (" . count($idxCols) . " total):";
    foreach ($idxCols as $name => $cols) {
        $tag = (isset($idxUnique[$name]) && $idxUnique[$name]) ? '[UNIQUE] ' : '';
        $out[] = "    {$tag}{$name}: (" . implode(', ', $cols) . ")";
    }
    $out[] = "";

    // Protected: anything UNIQUE, PRIMARY, or single-col that db_schema_check expects
    // db_schema_check for 'subscribers' checks: ['email','phone_number','status','lead_score'] by column match
    $schemaCheckSingleCols = ['email', 'phone_number', 'status', 'lead_score'];

    $toDrop = [];
    // Pass 1: Exact duplicates (same column signature)
    $sigGroups = [];
    foreach ($idxCols as $name => $cols) {
        if ($name === 'PRIMARY') continue;
        if (isset($idxUnique[$name]) && $idxUnique[$name]) continue; // Protect UNIQUE
        $sig = implode(',', $cols);
        $sigGroups[$sig][] = $name;
    }
    foreach ($sigGroups as $sig => $names) {
        if (count($names) < 2) continue;
        usort($names, fn($a,$b) => strlen($a)<=>strlen($b) ?: strcmp($a,$b));
        $winner = $names[0];
        foreach (array_slice($names, 1) as $loser) {
            $toDrop[$loser] = "EXACT DUPE of $winner";
        }
    }

    // Pass 2: Prefix subsets — only drop if the covering index EXISTS and the subset is not a schema-required single col
    $allNames = array_keys($idxCols);
    foreach ($allNames as $nameA) {
        if ($nameA === 'PRIMARY' || isset($toDrop[$nameA])) continue;
        if (isset($idxUnique[$nameA]) && $idxUnique[$nameA]) continue; // protect UNIQUE
        $colsA = $idxCols[$nameA];
        $lenA = count($colsA);

        // If it's a single-col index that db_schema_check would re-create, leave it
        // (dropping it is wasted effort + it'll come back on next schema check run)
        if ($lenA === 1 && in_array($colsA[0], $schemaCheckSingleCols)) continue;

        foreach ($allNames as $nameB) {
            if ($nameA === $nameB || isset($toDrop[$nameB])) continue;
            $colsB = $idxCols[$nameB];
            if (count($colsB) <= $lenA) continue;
            if (array_slice($colsB, 0, $lenA) === $colsA) {
                $toDrop[$nameA] = "PREFIX SUBSET of $nameB (" . implode(',',$colsA) . " ⊂ " . implode(',',$colsB) . ")";
                break;
            }
        }
    }

    $out[] = "  Redundant indexes to drop: " . count($toDrop);
    foreach ($toDrop as $name => $reason) { $out[] = "    DROP: $name → $reason"; }

    if (!$dryRun && !empty($toDrop)) {
        foreach ($toDrop as $name => $reason) {
            try {
                $pdo->exec("ALTER TABLE subscribers DROP INDEX `$name`");
                $out[] = "  [DROPPED] $name";
            } catch (Exception $e) {
                if (stripos($e->getMessage(), "Can't DROP") !== false) {
                    $out[] = "  [SKIP] $name — already gone";
                } else {
                    $out[] = "  [FAIL] $name — " . $e->getMessage();
                }
            }
        }
        $finalCount = $pdo->query("
            SELECT COUNT(DISTINCT INDEX_NAME) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='subscribers'
        ")->fetchColumn();
        $out[] = "  Final index count: $finalCount";
    } elseif ($dryRun) {
        $out[] = "  [DRY] $" . count($toDrop) . " indexes would be dropped.";
    } else {
        $out[] = "  [SKIP] No redundant indexes found.";
    }
} catch (Exception $e) { $out[] = "  [FAIL] " . $e->getMessage(); }
$out[] = "";

// ─── FIX 4: Rotate error_log ─────────────────────────────────────────────────
$out[] = "--- FIX 4: Rotate error_log ---";
$logPath = __DIR__ . '/error_log';
if (file_exists($logPath)) {
    $sizeMB = round(filesize($logPath)/1024/1024, 2);
    $out[] = "  Current size: {$sizeMB} MB";
    if (!$dryRun && $sizeMB >= 10) {
        $archive = __DIR__ . '/error_log.' . date('Ymd_His') . '.bak';
        rename($logPath, $archive);
        file_put_contents($logPath, '[Log rotated ' . date('Y-m-d H:i:s') . "]\n");
        $out[] = "  [OK] Rotated → " . basename($archive);
    } elseif ($dryRun) {
        $out[] = "  [DRY] Would" . ($sizeMB >= 10 ? '' : ' NOT (below 10MB)') . " rotate.";
    } else {
        $out[] = "  [SKIP] Only {$sizeMB}MB.";
    }
} else {
    $out[] = "  [SKIP] error_log not found at $logPath";
}
$out[] = "";

// ─── Also: Fix health check false positive query ───────────────────────────────
$out[] = "--- NOTE: Health Check False Positives ---";
$out[] = "  1. ZNS orphan check in autoflow_health.php used wrong JOIN (zalo_subscribers instead of subscribers).";
$out[] = "     Fix: Update health check query to check against subscribers + zalo_subscribers (both).";
$out[] = "  2. autoflow_health.php now fixed in local repo — needs re-upload to take effect.";
$out[] = "";

// ─── POST-FIX SUMMARY ────────────────────────────────────────────────────────
$out[] = "========================================================";
$out[] = $dryRun ? "DRY RUN COMPLETE — No changes made." : "DONE. DELETE THIS FILE!";
$out[] = "Run without ?dry=1 to apply changes.";
$out[] = "========================================================";
echo implode("\n", $out);
