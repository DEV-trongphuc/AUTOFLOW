<?php
// api/tracking_processor.php - Shared logic for tracking events
// Used by both worker_queue.php (async) and webhook.php (sync fallback)

// [FIX] Use __DIR__-anchored paths so this file works correctly when included
// from CLI/cron workers in different working directories, not just web context.
require_once __DIR__ . '/flow_helpers.php';
require_once __DIR__ . '/trigger_helper.php';

function processTrackingEvent($pdo, $type, $payload)
{
    if ($type === 'stat_update') {
        // [FIX] Use null coalescing to prevent PHP 8+ "Undefined array key" warnings
        // if the worker receives a malformed or incomplete payload.
        $subType = $payload['type'] ?? null;
        $sid = $payload['subscriber_id'] ?? null;
        $rid = $payload['reference_id'] ?? null;
        $fid = $payload['flow_id'] ?? null;
        $cid = $payload['campaign_id'] ?? null;
        $extra = $payload['extra_data'] ?? [];

        // [GUARD] Skip processing if critical fields are missing
        if (!$subType || !$sid) {
            error_log('[tracking_processor] Skipping stat_update: missing subType or subscriber_id. Payload: ' . json_encode($payload));
            return false;
        }

        // 1. Log essential activity (PULL FROM CONFIG)
        // [CONFLICT-3 FIX] Use __DIR__ to anchor path — relative 'scoring_config.php' fails
        // when this file is included by a CLI worker (cron/worker) running from a different CWD.
        $scoring = file_exists(__DIR__ . '/scoring_config.php')
            ? (require __DIR__ . '/scoring_config.php')
            : [];
        $pOpen = $scoring['email_open'] ?? 1;
        $pClick = $scoring['email_click'] ?? 5;
        $pZaloClick = $scoring['zalo_click'] ?? 5;

        $pointValue = $pClick;
        $activityLabel = 'Email Click';
        $detailLabel = "Clicked link";

        if ($subType === 'open_email') {
            $pointValue = $pOpen;
            $activityLabel = 'Email Open';
            $detailLabel = "Opened Email";
        } elseif ($subType === 'zalo_clicked') {
            $pointValue = $pZaloClick;
            $activityLabel = 'Zalo Click';
            $detailLabel = "Zalo Clicked link/button";
        }

        $pointLabel = "(+$pointValue điểm)";
        $variationSuffix = !empty($extra['variation']) ? " (" . $extra['variation'] . ")" : "";

        $appendUrl = ($subType !== 'open_email' && !empty($extra['url'])) ? ": " . $extra['url'] : "";
        logActivity($pdo, $sid, $subType, $rid, $activityLabel, "{$detailLabel}{$variationSuffix} {$pointLabel}{$appendUrl}", $fid, $cid, $extra);

        // 2. Buffer subscriber stats updates
        $pdo->prepare("INSERT INTO stats_update_buffer (target_table, target_id, column_name, increment) VALUES ('subscribers', ?, ?, 1)")
            ->execute([$sid, ($subType === 'open_email' ? 'stats_opened' : 'stats_clicked')]);

        // [OPTIMIZED] Buffer lead_score increment
        $pdo->prepare("INSERT INTO stats_update_buffer (target_table, target_id, column_name, increment) VALUES ('subscribers', ?, 'lead_score', ?)")
            ->execute([$sid, $pointValue]);

        // [PERFORMANCE] Timestamp Buffering
        // Instead of UPDATE subscribers SET ... (Row Lock), we insert into timestamp_buffer.
        $ts = date('Y-m-d H:i:s');
        $col = 'last_activity_at';
        if ($subType === 'open_email')
            $col = 'last_open_at';
        elseif ($subType === 'click_link' || $subType === 'zalo_clicked')
            $col = 'last_click_at';

        try {
            $pdo->prepare("INSERT INTO timestamp_buffer (subscriber_id, column_name, timestamp_value) VALUES (?, ?, ?), (?, 'last_activity_at', ?)")
                ->execute([$sid, $col, $ts, $sid, $ts]);
        } catch (Exception $e) {
            // Fallback: Table may not exist yet.
            // [NOTE] Ideally CREATE TABLE timestamp_buffer should be run as a one-time
            // DB migration at setup time — not at runtime — to avoid race conditions
            // when multiple workers hit this catch block simultaneously (Deadlock risk).
            // The nested catch below acts as a last-resort safety net.
            if (strpos($e->getMessage(), "doesn't exist") !== false) {
                try {
                    $pdo->exec("CREATE TABLE IF NOT EXISTS timestamp_buffer (
                        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        subscriber_id char(36) NOT NULL,
                        column_name VARCHAR(50) NOT NULL,
                        timestamp_value DATETIME NOT NULL,
                        processed TINYINT(1) DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_processed (processed),
                        INDEX idx_sub_col (subscriber_id, column_name)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

                    $pdo->prepare("INSERT INTO timestamp_buffer (subscriber_id, column_name, timestamp_value) VALUES (?, ?, ?), (?, 'last_activity_at', ?)")
                        ->execute([$sid, $col, $ts, $sid, $ts]);
                } catch (Exception $ex) {
                    // Last resort: Update directly
                    $pdo->prepare("UPDATE subscribers SET " . ($subType === 'open_email' ? 'last_open_at = NOW()' : 'last_click_at = NOW()') . ", last_activity_at = NOW() WHERE id = ?")
                        ->execute([$sid]);
                }
            } else {
                // Ignore
            }
        }

        // 3. Handle Flow Stats
        if ($fid) {
            // Total
            $pdo->prepare("INSERT INTO stats_update_buffer (target_table, target_id, column_name, increment) VALUES ('flows', ?, ?, 1)")
                ->execute([$fid, ($subType === 'open_email' ? 'stat_total_opened' : 'stat_total_clicked')]);

            // [FIX] Unique Check — must include reference_key (step ID or URL) in the cache key.
            // Without it: subscriber clicks link A → cache row created (sub+flow+click).
            // Subscriber then clicks link B → INSERT IGNORE silently fails (same sub+flow+click).
            // → Unique click for link B is NEVER counted. Same bug for multi-step flow opens.
            $evt = ($subType === 'open_email' ? 'open' : 'click');
            $refKey = $rid ?? ($extra['url'] ?? 'general');
            // [CONFLICT-1 FIX] tracking_unique_cache may be missing 'reference_key' column
            // if DB was created before this column was added. Use self-healing ALTER + fallback.
            try {
                $stmtUnique = $pdo->prepare("INSERT IGNORE INTO tracking_unique_cache (subscriber_id, target_type, target_id, event_type, reference_key) VALUES (?, 'flow', ?, ?, ?)");
                $stmtUnique->execute([$sid, $fid, $evt, $refKey]);
            } catch (Exception $eUniq) {
                if (
                    strpos($eUniq->getMessage(), 'reference_key') !== false
                    || strpos($eUniq->getMessage(), "Unknown column") !== false
                ) {
                    // Auto-add missing column
                    try {
                        $pdo->exec("ALTER TABLE tracking_unique_cache ADD COLUMN IF NOT EXISTS reference_key VARCHAR(255) DEFAULT NULL");
                        $stmtUnique = $pdo->prepare("INSERT IGNORE INTO tracking_unique_cache (subscriber_id, target_type, target_id, event_type, reference_key) VALUES (?, 'flow', ?, ?, ?)");
                        $stmtUnique->execute([$sid, $fid, $evt, $refKey]);
                    } catch (Exception $eAlt) {
                        // Fallback: Insert without reference_key
                        $pdo->prepare("INSERT IGNORE INTO tracking_unique_cache (subscriber_id, target_type, target_id, event_type) VALUES (?, 'flow', ?, ?)")
                            ->execute([$sid, $fid, $evt]);
                    }
                    $stmtUnique = null; // prevent rowCount() error below
                }
            }
            if (isset($stmtUnique) && $stmtUnique && $stmtUnique->rowCount() > 0) {
                $column = ($subType === 'open_email' ? 'stat_unique_opened' : 'stat_unique_clicked');
                $pdo->prepare("INSERT INTO stats_update_buffer (target_table, target_id, column_name, increment) VALUES ('flows', ?, ?, 1)")
                    ->execute([$fid, $column]);
            }
        }

        // 4. Handle Campaign Stats
        if ($cid) {
            // Total
            $pdo->prepare("INSERT INTO stats_update_buffer (target_table, target_id, column_name, increment) VALUES ('campaigns', ?, ?, 1)")
                ->execute([$cid, ($subType === 'open_email' ? 'count_opened' : 'count_clicked')]);

            if ($subType === 'open_email') {
                $pdo->prepare("INSERT INTO stats_update_buffer (target_table, target_id, column_name, increment) VALUES ('campaigns', ?, 'stat_opens', 1)")->execute([$cid]);
            } else {
                $pdo->prepare("INSERT INTO stats_update_buffer (target_table, target_id, column_name, increment) VALUES ('campaigns', ?, 'stat_clicks', 1)")->execute([$cid]);
            }

            if (!empty($extra['device_type'])) {
                $col = ($extra['device_type'] === 'mobile') ? 'stat_device_mobile' : 'stat_device_desktop';
                $pdo->prepare("INSERT INTO stats_update_buffer (target_table, target_id, column_name, increment) VALUES ('campaigns', ?, ?, 1)")
                    ->execute([$cid, $col]);
            }

            // [FIX] Unique Check — include reference_key so each distinct link/step is tracked.
            // A campaign with 3 buttons: clicking button A blocks buttons B & C from counting
            // as unique if reference_key is not part of the uniqueness constraint.
            $evt = ($subType === 'open_email' ? 'open' : 'click');
            $refKey = $rid ?? ($extra['url'] ?? 'general');
            try {
                $stmtUnique = $pdo->prepare("INSERT IGNORE INTO tracking_unique_cache (subscriber_id, target_type, target_id, event_type, reference_key) VALUES (?, 'campaign', ?, ?, ?)");
                $stmtUnique->execute([$sid, $cid, $evt, $refKey]);
            } catch (Exception $eUniq) {
                if (
                    strpos($eUniq->getMessage(), 'reference_key') !== false
                    || strpos($eUniq->getMessage(), "Unknown column") !== false
                ) {
                    try {
                        $pdo->exec("ALTER TABLE tracking_unique_cache ADD COLUMN IF NOT EXISTS reference_key VARCHAR(255) DEFAULT NULL");
                        $stmtUnique = $pdo->prepare("INSERT IGNORE INTO tracking_unique_cache (subscriber_id, target_type, target_id, event_type, reference_key) VALUES (?, 'campaign', ?, ?, ?)");
                        $stmtUnique->execute([$sid, $cid, $evt, $refKey]);
                    } catch (Exception $eAlt) {
                        $pdo->prepare("INSERT IGNORE INTO tracking_unique_cache (subscriber_id, target_type, target_id, event_type) VALUES (?, 'campaign', ?, ?)")
                            ->execute([$sid, $cid, $evt]);
                    }
                    $stmtUnique = null;
                }
            }
            if (isset($stmtUnique) && $stmtUnique && $stmtUnique->rowCount() > 0) {
                $column = ($subType === 'open_email' ? 'count_unique_opened' : 'count_unique_clicked');
                $pdo->prepare("INSERT INTO stats_update_buffer (target_table, target_id, column_name, increment) VALUES ('campaigns', ?, ?, 1)")
                    ->execute([$cid, $column]);
            }
        }

        // 5. [POKE FLOW WORKER] - Trigger Immediate Flow Evaluation
        // If a subscriber interacts, we should immediately re-check their flow conditions (e.g. Wait until Click)
        // Instead of verifying specific Waiting states, we dispatch a priority job for this subscriber if they are in a flow (fid is present).
        if ($sid) {
            // [REMOVED] checkDynamicTriggers($pdo, $sid) was called here on every open/click event.
            // That function queries ALL active flows to check segment/date triggers — O(flows × subscribers).
            // Dynamic triggers only apply when subscriber PROFILE changes (tags, fields, list membership),
            // not when they simply open/click an email. Moved to subscriber update paths only.

            // 2. [POKE FLOWS VIA CAMPAIGN or FID]
            // Case A: Direct Flow Interaction (we know the fid)
            if ($fid) {
                // [FIX] Only poke waiting states that are at a 'condition' step.
                // 'wait' (duration/until) steps are time-based — waking them early
                // causes executeStep() to re-calculate duration and RESET the timer.
                // We must NOT wake a 'wait' step just because an email was opened.
                //
                // To distinguish: load the flow's steps JSON and check the step_id's type.
                // Only dispatch for states where step type = 'condition'.
                $checkWait = $pdo->prepare("
                    SELECT sfs.id, sfs.step_id, f.steps
                    FROM subscriber_flow_states sfs
                    JOIN flows f ON sfs.flow_id = f.id
                    WHERE sfs.subscriber_id = ? AND sfs.flow_id = ? AND sfs.status = 'waiting'
                ");
                $checkWait->execute([$sid, $fid]);
                $waitingStates = $checkWait->fetchAll(PDO::FETCH_ASSOC);

                foreach ($waitingStates as $state) {
                    // Decode flow steps and check if current step is a 'condition'
                    $flowSteps = json_decode($state['steps'] ?? '[]', true) ?: [];
                    $currentStepType = null;
                    foreach ($flowSteps as $s) {
                        if (trim($s['id']) === trim($state['step_id'])) {
                            $currentStepType = $s['type'] ?? null;
                            break;
                        }
                    }
                    // Only wake condition steps — NOT wait/action/zalo_zns etc.
                    // 'wait' steps are time-gated and must not be reset by tracking events.
                    if ($currentStepType !== 'condition') {
                        continue;
                    }
                    dispatchQueueJob($pdo, 'flows', [
                        'priority_queue_id' => $state['id'],
                        'subscriber_id' => $sid,
                        'priority_flow_id' => $fid
                    ]);
                }
            }

            // Case B: Campaign Interaction (Poke all flows triggered by this campaign)
            if ($cid) {
                try {
                    // [OPTIMIZATION] Cache campaign-to-flow mapping
                    static $campaignFlowCache = [];

                    if (!isset($campaignFlowCache[$cid])) {
                        $stmtFlows = $pdo->prepare("SELECT id, steps FROM flows WHERE status = 'active' AND (trigger_type = 'campaign' OR steps LIKE ?)");
                        $stmtFlows->execute(['%"targetId":"' . $cid . '"%']);
                        $associatedFlows = $stmtFlows->fetchAll();

                        $matchedFlows = [];
                        foreach ($associatedFlows as $f) {
                            $fSteps = json_decode($f['steps'], true) ?: [];
                            foreach ($fSteps as $s) {
                                if ($s['type'] === 'trigger' && ($s['config']['type'] ?? '') === 'campaign' && ($s['config']['targetId'] ?? '') == $cid) {
                                    $matchedFlows[] = $f['id'];
                                    break;
                                }
                            }
                        }
                        $campaignFlowCache[$cid] = $matchedFlows;
                    }

                    foreach ($campaignFlowCache[$cid] as $fId) {
                        if ($fId !== $fid) { // Skip if already poked by Case A above
                            // [FIX] Same fix as Case A: only wake 'condition' steps, not 'wait' steps.
                            $checkWait = $pdo->prepare("
                                SELECT sfs.id, sfs.step_id, f.steps
                                FROM subscriber_flow_states sfs
                                JOIN flows f ON sfs.flow_id = f.id
                                WHERE sfs.subscriber_id = ? AND sfs.flow_id = ? AND sfs.status = 'waiting'
                            ");
                            $checkWait->execute([$sid, $fId]);
                            $waitingStates = $checkWait->fetchAll(PDO::FETCH_ASSOC);

                            foreach ($waitingStates as $state) {
                                $fStepsForCheck = json_decode($state['steps'] ?? '[]', true) ?: [];
                                $stepTypeForCheck = null;
                                foreach ($fStepsForCheck as $s) {
                                    if (trim($s['id']) === trim($state['step_id'])) {
                                        $stepTypeForCheck = $s['type'] ?? null;
                                        break;
                                    }
                                }
                                if ($stepTypeForCheck !== 'condition') {
                                    continue;
                                }
                                dispatchQueueJob($pdo, 'flows', [
                                    'priority_queue_id' => $state['id'],
                                    'subscriber_id' => $sid,
                                    'priority_flow_id' => $fId
                                ]);
                            }
                        }
                    }
                } catch (Exception $e) {
                    // Ignore poke errors
                }
            }
        }

        return true;
    }

    if ($type === 'unsubscribe') {
        // [FIX] Use null coalescing for subscriber_id to prevent fatal errors on bad payload
        $sid = $payload['subscriber_id'] ?? null;
        $fid = $payload['flow_id'] ?? null;
        $cid = $payload['campaign_id'] ?? null;
        $rid = $payload['reference_id'] ?? null;

        // [GUARD] Skip if subscriber_id is missing
        if (!$sid) {
            error_log('[tracking_processor] Skipping unsubscribe: missing subscriber_id. Payload: ' . json_encode($payload));
            return false;
        }

        $pdo->prepare("UPDATE subscribers SET status = 'unsubscribed', updated_at = NOW() WHERE id = ?")->execute([$sid]);
        $pdo->prepare("UPDATE subscriber_flow_states SET status = 'cancelled', updated_at = NOW() WHERE subscriber_id = ? AND status IN ('waiting', 'processing')")->execute([$sid]);

        if ($fid) {
            $pdo->prepare("INSERT INTO stats_update_buffer (target_table, target_id, column_name, increment) VALUES ('flows', ?, 'stat_total_unsubscribed', 1)")->execute([$fid]);
        }
        if ($cid) {
            $pdo->prepare("INSERT INTO stats_update_buffer (target_table, target_id, column_name, increment) VALUES ('campaigns', ?, 'count_unsubscribed', 1)")->execute([$cid]);
        }

        logActivity($pdo, $sid, 'unsubscribe', $rid, 'Unsubscribe', "Unsubscribed via Link", $fid, $cid);

        // [WARNING] triggerFlows('unsubscribe') must NOT send any marketing emails.
        // The subscriber is already marked 'unsubscribed' above. Any flow triggered here
        // MUST check subscriber status before dispatching email actions to avoid
        // spam/bounce rate increases. Acceptable actions: internal notification, tag update, CRM webhook.
        triggerFlows($pdo, $sid, 'unsubscribe', null);

        return true;
    }

    return false;
}
