<?php
// api/worker_priority.php - OMNI-ENGINE V29.6 (PRIORITY CHAINING ENGINE - FINAL FIX FOR INSTANT EXECUTION)
// This worker is triggered directly by API calls (forms.php, purchase_events.php, custom_events.php, worker_campaign.php)
// to immediately enroll a SPECIFIC subscriber into relevant flows AND execute the *initial chain of instant steps*.

// IMMEDIATE ERROR LOGGING - before ANYTHING else
$errorLogFile = __DIR__ . '/worker_error.log';
$debugLogFile = __DIR__ . '/debug_priority.log';

try {
    // PREVENT SCRIPT ABORTION WHEN CURL DISCONNECTS
    ignore_user_abort(true);
    set_time_limit(300); // 5 minutes for deep priority chains

    // [DEBUG] Unified Trace Log Helper
    if (!function_exists('traceLog')) {
        function traceLog($msg)
        {
            $logFile = __DIR__ . '/worker_trace.log';
            $entry = date('H:i:s') . " " . $msg . PHP_EOL;
            file_put_contents($logFile, $entry, FILE_APPEND);
        }
    }

    // Log entry IMMEDIATELY
    traceLog("[Priority] === ENTRY GET: " . json_encode($_GET));
    file_put_contents($debugLogFile, "\n=== ENTRY " . date('Y-m-d H:i:s') . " ===\nGET: " . print_r($_GET, true), FILE_APPEND | LOCK_EX);

    error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
    ini_set('display_errors', 0); // Disable for production

    require_once 'db_connect.php';
    traceLog("[Priority] DB Connected");
    file_put_contents($debugLogFile, "DB connected\n", FILE_APPEND | LOCK_EX);

    require_once 'Mailer.php'; // Mailer is required here for sending emails within the priority chain
    require_once 'trigger_helper.php'; // Required for Propagation
    require_once 'FlowExecutor.php';
    traceLog("[Priority] Deps Loaded");
    file_put_contents($debugLogFile, "Mailer loaded\n", FILE_APPEND | LOCK_EX);

    date_default_timezone_set('Asia/Ho_Chi_Minh');
    $pdo->exec("SET NAMES utf8mb4");

    // Params passed via GET request
    $prioritySid = $_GET['subscriber_id'] ?? $_GET['priority_sub_id'] ?? null;
    $priorityTriggerType = $_GET['trigger_type'] ?? null;
    $priorityTargetId = $_GET['target_id'] ?? null;
    $priorityQueueId = $_GET['priority_queue_id'] ?? null;
    $priorityFlowId = $_GET['priority_flow_id'] ?? null;
    $priorityDepth = (int) ($_GET['depth'] ?? 0);

    if ($priorityDepth > 5) {
        traceLog("[Priority] ABORT: Max depth (5)");
        file_put_contents($debugLogFile, "Aborting: Max depth reached (5)\n", FILE_APPEND);
        exit;
    }

    $logs = [];
    $logs[] = "--- PRIORITY WORKER START: " . date('Y-m-d H:i:s') . " ---";
    // file_put_contents($debugLogFile, "--- RUN " . date('Y-m-d H:i:s') . " ---\nREQUEST: " . print_r($_GET, true) . "\n", FILE_APPEND);

} catch (Throwable $e) {
    if (function_exists('traceLog'))
        traceLog("[Priority] FATAL EARLY: " . $e->getMessage());
    file_put_contents($errorLogFile, date('Y-m-d H:i:s') . " FATAL EARLY ERROR: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine() . "\n", FILE_APPEND);
    die("Worker initialization failed");
}


// Hardcoded production URL for tracking
$apiUrl = API_BASE_URL;
$stmtSettings = $pdo->query("SELECT `key`, `value` FROM system_settings");
$settings = [];
while ($row = $stmtSettings->fetch()) {
    $settings[$row['key']] = $row['value'];
}
$defaultSender = !empty($settings['smtp_user']) ? $settings['smtp_user'] : "marketing@ka-en.com.vn";
$mailer = new Mailer($pdo, $apiUrl, $defaultSender);
$flowExecutor = new FlowExecutor($pdo, $mailer, $apiUrl);

$now = date('Y-m-d H:i:s');
$currentTime = date('H:i');
$currentDayIdx = (int) date('w'); // 0 (Sun) to 6 (Sat)


// =================================================================================
// HELPER: Shared Logic (Imported)
// =================================================================================
require_once 'flow_helpers.php';
// Functions moved to flow_helpers.php:
// - logActivity
// - parseLoopingContent
// - resolveEmailContent
// - replaceMergeTags
// - isSubscriberMatch

// =================================================================================
// PRIORITY ENROLLMENT AND IMMEDIATE CHAIN EXECUTION
// =================================================================================
$pdo->beginTransaction(); // Start a global transaction for the entire worker run
traceLog("[Priority] Transaction Started");

try {
    // [FIX] Initialize variables used in catch/finally block to prevent
    // "Undefined variable" PHP 8 warnings if an exception occurs early
    // (e.g. before Scenario A/B/C branching sets these values).
    $subscriberId = null;
    $flowId = null;
    $queueId = null;
    $queueIdToUpdate = null;

    $item = null;

    traceLog("[Priority] Params - Sid: $prioritySid, Type: $priorityTriggerType, TargetId: $priorityTargetId, QueueId: $priorityQueueId");

    // Scenario A: Triggered for a new enrollment (from forms.php, etc.)
    if ($prioritySid && $priorityTriggerType && $priorityTargetId && !$priorityQueueId) {
        traceLog("[Priority] SCENARIO A: New Enrollment");
        $logs[] = "[Priority-Enroll] Received Trigger: $priorityTriggerType ID: $priorityTargetId for Subscriber $prioritySid";

        if ($priorityTriggerType === 'manual') {
            // MANUAL TRIGGER: Directly enroll into the specified flow (target_id)
            $stmtManualFlow = $pdo->prepare("SELECT id, name, steps, config FROM flows WHERE id = ?");
            $stmtManualFlow->execute([$priorityTargetId]);
            $manualFlow = $stmtManualFlow->fetch();

            if ($manualFlow) {
                $logs[] = "[Priority-Manual] Manual trigger for Flow: {$manualFlow['name']}";
                $steps = json_decode($manualFlow['steps'], true);
                $trigger = null;
                foreach ($steps as $s)
                    if ($s['type'] === 'trigger')
                        $trigger = $s;

                if ($trigger && isset($trigger['nextStepId'])) {
                    $pdo->prepare("DELETE FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ? AND status IN ('waiting', 'processing')")->execute([$prioritySid, $manualFlow['id']]);

                    // [OPT] Explicit column select — avoid SELECT * on heavy subscribers table
                    // Columns needed: all fields used by FlowExecutor + flow_helpers for merge tags,
                    // send logic, phone validation, custom_attributes merge tags.
                    $stmtSubDetails = $pdo->prepare(
                        "SELECT id, email, status, first_name, last_name, phone_number,
                                company_name, job_title, city, country, gender,
                                date_of_birth, anniversary_date, joined_at,
                                last_os, last_device, last_browser, last_city,
                                stats_opened, stats_clicked, last_open_at, last_click_at,
                                timezone, is_zalo_follower, tags, custom_attributes
                         FROM subscribers WHERE id = ?"
                    );
                    $stmtSubDetails->execute([$prioritySid]);
                    $subDetails = $stmtSubDetails->fetch();

                    if ($subDetails) {
                        $pastTime = date('Y-m-d H:i:s', strtotime('-1 second'));
                        $stmtE = $pdo->prepare("INSERT INTO subscriber_flow_states (subscriber_id, flow_id, step_id, scheduled_at, status, created_at, updated_at, last_step_at) VALUES (?, ?, ?, ?, 'waiting', NOW(), NOW(), NOW())");
                        $stmtE->execute([$prioritySid, $manualFlow['id'], $trigger['nextStepId'], $pastTime]);
                        $newQueueId = $pdo->lastInsertId();

                        logActivity($pdo, $prioritySid, 'enter_flow', $manualFlow['id'], $manualFlow['name'], "Manual Trigger by Admin", $manualFlow['id']);
                        $pdo->prepare("UPDATE flows SET stat_enrolled = stat_enrolled + 1 WHERE id = ?")->execute([$manualFlow['id']]);

                        $item = array_merge($subDetails, [
                            'queue_id' => $newQueueId,
                            'subscriber_id' => $prioritySid,
                            'flow_id' => $manualFlow['id'],
                            'step_id' => $trigger['nextStepId'],
                            'scheduled_at' => $pastTime,
                            'queue_created_at' => $now,
                            'flow_steps' => $manualFlow['steps'],
                            'flow_config' => $manualFlow['config'],
                            'flow_name' => $manualFlow['name'],
                            'sub_email' => $subDetails['email'],
                            'sub_status' => $subDetails['status'],
                            'sub_tags' => $subDetails['tags'],
                            'sub_id' => $subDetails['id'],
                        ]);
                        $foundFlowForPriority = true;
                    }
                }
            }
        } else {
            // Standard triggers (form, tag, etc.)
            traceLog("[Priority] Fetching active flows for trigger: $priorityTriggerType");
            // [10M UPGRADE] Query flows specifically by trigger_type for MASSIVE performance gain
            $stmtFlows = $pdo->prepare("SELECT id, name, steps, config FROM flows WHERE status = 'active' AND (trigger_type = ? OR trigger_type = 'segment')");
            $stmtFlows->execute([$priorityTriggerType]);
            $activeFlows = $stmtFlows->fetchAll();
            traceLog("[Priority] Found " . count($activeFlows) . " active flows");

            $foundFlowForPriority = false;

            foreach ($activeFlows as $flow) {
                $steps = json_decode($flow['steps'], true);
                $trigger = null;
                foreach ($steps as $s)
                    if ($s['type'] === 'trigger')
                        $trigger = $s;

                if (!$trigger || !isset($trigger['nextStepId']))
                    continue;

                $tConfig = $trigger['config'];
                $flowTriggerType = $tConfig['type'] ?? ''; // [FIX] was undefined — caused all standard triggers to never match
                $flowTargetSubtype = $tConfig['targetSubtype'] ?? '';
                $flowTargetId = $tConfig['targetId'] ?? '';

                // Match "list" or "added_to_list" trigger against flows that are technically "segment" type but "list" subtype
                $isMatch = false;
                if ($flowTriggerType === $priorityTriggerType) {
                    $isMatch = true;
                } elseif (($priorityTriggerType === 'list' || $priorityTriggerType === 'added_to_list') && $flowTriggerType === 'segment' && $flowTargetSubtype === 'list') {
                    $isMatch = true;
                }

                // Target Matching Logic
                $targetMatched = ($flowTargetId == $priorityTargetId || empty($flowTargetId) || $flowTargetId === 'all');

                // SPECIAL CASE: Inbound Message Keyword Logic
                if ($isMatch && $priorityTriggerType === 'inbound_message' && !empty($flowTargetId) && $flowTargetId !== 'all') {
                    // [FIX] Use mb_strtolower + mb_stripos for proper Vietnamese Unicode matching
                    // Previously strpos() would fail on "Tư Vấn" vs "tư vấn" etc.
                    $keywords = array_map('trim', explode(',', mb_strtolower($flowTargetId, 'UTF-8')));
                    $msgLower = mb_strtolower($priorityTargetId, 'UTF-8');
                    $kwFound = false;
                    foreach ($keywords as $kw) {
                        if ($kw !== '' && mb_stripos($msgLower, $kw, 0, 'UTF-8') !== false) {
                            $kwFound = true;
                            break;
                        }
                    }
                    $targetMatched = $kwFound;
                }

                if ($isMatch && $targetMatched) {
                    traceLog("[Priority] MATCH! Flow {$flow['id']} ({$flow['name']}) matches trigger");
                    // [NEW] FREQUENCY & RE-ENROLLMENT CHECK (Respect One-Time vs Recurring)
                    $fConfig = json_decode($flow['config'] ?? '{}', true);
                    $frequency = $fConfig['frequency'] ?? 'one-time';
                    $cooldownHours = (int) ($fConfig['enrollmentCooldownHours'] ?? 12);

                    $stmtCheck = $pdo->prepare("SELECT id, status, updated_at FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ? ORDER BY created_at DESC LIMIT 1");
                    $stmtCheck->execute([$prioritySid, $flow['id']]);
                    $existingState = $stmtCheck->fetch();

                    if ($existingState) {
                        $allowMultiple = $fConfig['allowMultiple'] ?? false;
                        $maxEnrollments = (int) ($fConfig['maxEnrollments'] ?? 0);

                        // Check Max Enrollments if applicable
                        if ($maxEnrollments > 0) {
                            $stmtTotal = $pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ?");
                            $stmtTotal->execute([$prioritySid, $flow['id']]);
                            $totalEnrollments = (int) $stmtTotal->fetchColumn();
                            if ($totalEnrollments >= $maxEnrollments) {
                                $logs[] = "[Priority-Enroll] Sub $prioritySid reached max enrollments ($maxEnrollments) for Flow {$flow['id']}. Skipping.";
                                continue;
                            }
                        }

                        if ($allowMultiple) {
                            $logs[] = "[Priority-Enroll] Flow {$flow['id']} has 'allowMultiple' enabled. Bypassing progress checks for sub $prioritySid.";
                        } else {
                            if ($frequency === 'one-time') {
                                $logs[] = "[Priority-Enroll] Sub $prioritySid already enrolled in one-time Flow {$flow['id']}. Skipping.";
                                continue; // DO NOT RE-ENROLL
                            } else if ($frequency === 'recurring') {
                                // If still in progress (waiting/processing), skip to avoid duplicates
                                if ($existingState['status'] === 'waiting' || $existingState['status'] === 'processing') {
                                    $logs[] = "[Priority-Enroll] Sub $prioritySid already in progress for Flow {$flow['id']}. Skipping.";
                                    continue;
                                }
                                // Check cooldown if completed or failed
                                $lastUpdated = strtotime($existingState['updated_at']);
                                if ((time() - $lastUpdated) < ($cooldownHours * 3600)) {
                                    $logs[] = "[Priority-Enroll] Sub $prioritySid too soon for recurring Flow {$flow['id']} (Cooldown: $cooldownHours h). Skipping.";
                                    continue;
                                }
                            }
                        }
                    }

                    // Proceed with enrollment
                    // [OPT] Explicit column select — same column list as manual trigger above
                    $stmtSubDetails = $pdo->prepare(
                        "SELECT id, email, status, first_name, last_name, phone_number,
                                company_name, job_title, city, country, gender,
                                date_of_birth, anniversary_date, joined_at,
                                last_os, last_device, last_browser, last_city,
                                stats_opened, stats_clicked, last_open_at, last_click_at,
                                timezone, is_zalo_follower, tags, custom_attributes
                         FROM subscribers WHERE id = ?"
                    );
                    $stmtSubDetails->execute([$prioritySid]);
                    $subDetails = $stmtSubDetails->fetch();

                    if (!$subDetails)
                        continue;

                    $pastTime = date('Y-m-d H:i:s', strtotime('-1 second'));

                    // [DEBUG] Log enrollment attempt details
                    $debugInfo = [
                        'subscriber_id' => $prioritySid,
                        'flow_id' => $flow['id'],
                        'frequency' => $frequency,
                        'cooldownHours' => $cooldownHours,
                        'maxEnrollments' => $maxEnrollments ?? 0,
                        'allowMultiple' => $allowMultiple ?? false,
                        'existingState' => $existingState ? [
                            'status' => $existingState['status'],
                            'updated_at' => $existingState['updated_at'],
                            'hours_since_update' => round((time() - strtotime($existingState['updated_at'])) / 3600, 2)
                        ] : null
                    ];
                    traceLog("[Priority-Enroll-Debug] " . json_encode($debugInfo));

                    // [FIX] Respect allowMultiple flag in SQL INSERT
                    if ($allowMultiple) {
                        // allowMultiple = true: Allow enrollment, but add a short debounce window
                        // to prevent double-enrollment when a form is submitted twice in < 3 seconds
                        // (e.g. double-click, retry on slow network).
                        // [FIX] Plain INSERT here caused duplicate emails when two requests arrived
                        // within the same PHP-FPM request window for the same subscriber+flow.
                        traceLog("[Priority] allowMultiple=true, using debounce INSERT");
                        $sqlIns = "INSERT INTO subscriber_flow_states (subscriber_id, flow_id, step_id, scheduled_at, status, created_at, updated_at, last_step_at)
                                   SELECT ?, ?, ?, ?, 'waiting', NOW(), NOW(), NOW()
                                   FROM DUAL
                                   WHERE NOT EXISTS (
                                       SELECT 1 FROM subscriber_flow_states
                                       WHERE subscriber_id = ? AND flow_id = ?
                                       AND created_at >= DATE_SUB(NOW(), INTERVAL 3 SECOND)
                                   )";
                        $stmtE = $pdo->prepare($sqlIns);
                        $stmtE->execute([$prioritySid, $flow['id'], $trigger['nextStepId'], $pastTime, $prioritySid, $flow['id']]);
                    } else {
                        // allowMultiple = false: Apply frequency and cooldown rules
                        if ($frequency === 'one-time') {
                            $blockCondition = "1=1"; // Always block if any record exists
                        } else {
                            // For recurring: Block if (in progress) OR (recently completed within cooldown)
                            $blockCondition = "status IN ('waiting', 'processing') OR updated_at > DATE_SUB(NOW(), INTERVAL $cooldownHours HOUR)";
                        }

                        $sqlIns = "INSERT INTO subscriber_flow_states (subscriber_id, flow_id, step_id, scheduled_at, status, created_at, updated_at, last_step_at)
                                   SELECT ?, ?, ?, ?, 'waiting', NOW(), NOW(), NOW()
                                   FROM DUAL
                                   WHERE NOT EXISTS (
                                       SELECT 1 FROM subscriber_flow_states 
                                       WHERE subscriber_id = ? AND flow_id = ? 
                                       AND ($blockCondition)
                                   )";
                        $stmtE = $pdo->prepare($sqlIns);
                        $stmtE->execute([$prioritySid, $flow['id'], $trigger['nextStepId'], $pastTime, $prioritySid, $flow['id']]);
                    }

                    if ($stmtE->rowCount() === 0) {
                        $logs[] = "[Priority-Enroll] Race condition detected or criteria no longer met for Sub $prioritySid, Flow {$flow['id']}. Skipping duplicate INSERT.";
                        continue;
                    }

                    $newQueueId = $pdo->lastInsertId();

                    $detailMessage = "Priority Trigger: {$priorityTriggerType} ({$priorityTargetId})";
                    logActivity($pdo, $prioritySid, 'enter_flow', $flow['id'], $flow['name'], $detailMessage, $flow['id']);
                    $pdo->prepare("UPDATE flows SET stat_enrolled = stat_enrolled + 1 WHERE id = ?")->execute([$flow['id']]);

                    if (!$item) {
                        $item = array_merge($subDetails, [
                            'queue_id' => $newQueueId,
                            'subscriber_id' => $prioritySid,
                            'flow_id' => $flow['id'],
                            'step_id' => $trigger['nextStepId'],
                            'scheduled_at' => $pastTime,
                            'queue_created_at' => $now,
                            'flow_steps' => $flow['steps'],
                            'flow_config' => $flow['config'],
                            'flow_name' => $flow['name'],
                            'sub_email' => $subDetails['email'],
                            'sub_status' => $subDetails['status'],
                            'sub_tags' => $subDetails['tags'],
                            'sub_id' => $subDetails['id'],
                        ]);
                        $foundFlowForPriority = true;
                    } else {
                        // Multi-flow trigger...
                        $workerParams = http_build_query(['priority_queue_id' => $newQueueId, 'subscriber_id' => $prioritySid, 'priority_flow_id' => $flow['id']]);
                        // [OPTIMIZED] Use centralized WorkerTriggerService for non-blocking self-trigger
                        require_once __DIR__ . '/WorkerTriggerService.php';
                        $triggerService = new WorkerTriggerService($pdo, API_BASE_URL);
                        $triggerService->trigger('/worker_priority.php?' . $workerParams);
                    }
                }
            }
        }
        if (!$foundFlowForPriority) {
            $logs[] = "[Priority-Enroll] No matching active flow for $priorityTriggerType ID $priorityTargetId. Exiting.";
            $pdo->commit();
            file_put_contents($debugLogFile, "No matching flow found - committed and exiting\n", FILE_APPEND | LOCK_EX);
            exit;
        }

        // FIX: COMMIT THE TRANSACTION AFTER SUCCESSFUL ENROLLMENT!
        $pdo->commit();
        file_put_contents($debugLogFile, "Transaction committed after enrollment\n", FILE_APPEND | LOCK_EX);
        $logs[] = "[Priority-Enroll] Transaction committed. Enrollment persisted to database.";

        // Start a new transaction for the chain execution
        $pdo->beginTransaction();
        file_put_contents($debugLogFile, "Started new transaction for chain execution\n", FILE_APPEND | LOCK_EX);

    }
    // Scenario B: Triggered to continue an existing priority chain (self-triggering from a non-instant step)
    else if ($priorityQueueId && $prioritySid && $priorityFlowId) {
        $logs[] = "[Priority-Chain] Received exclusive request for Queue ID: $priorityQueueId. Sub: $prioritySid, Flow: $priorityFlowId.";

        $stmtItem = $pdo->prepare("SELECT q.id as queue_id, q.subscriber_id, q.flow_id, q.step_id, q.status, q.scheduled_at, q.updated_at, q.created_at as queue_created_at, q.last_step_at, 
                                 f.steps as flow_steps, f.config as flow_config, f.name as flow_name, 
                                 s.email as sub_email, s.first_name, s.last_name, s.company_name, s.phone_number, s.job_title,
                                 s.status as sub_status, s.tags as sub_tags, s.id as sub_id, s.date_of_birth, s.anniversary_date, s.joined_at,
                                 s.city, s.country, s.gender, s.last_os, s.last_device, s.last_browser, s.last_city,
                                 s.stats_opened, s.stats_clicked, s.last_open_at, s.last_click_at,
                                 s.custom_attributes
                                 FROM subscriber_flow_states q 
                                 JOIN flows f ON q.flow_id = f.id 
                                 JOIN subscribers s ON q.subscriber_id = s.id 
                                 WHERE q.id = ? AND q.subscriber_id = ? AND q.flow_id = ? AND q.status IN ('waiting', 'processing') AND f.status = 'active'
                                 LIMIT 1 FOR UPDATE");

        $stmtItem->execute([$priorityQueueId, $prioritySid, $priorityFlowId]);
        $priorityItem = $stmtItem->fetch();

        if ($priorityItem) {
            $initialStatus = $priorityItem['status'];
            $pdo->prepare("UPDATE subscriber_flow_states SET status = 'processing', updated_at = NOW() WHERE id = ?")->execute([$priorityQueueId]);
            $item = $priorityItem;
            $queueIdToUpdate = $priorityQueueId;
            $logs[] = "[Priority-Chain] Item $priorityQueueId found. Initial status: '{$initialStatus}'. Now 'processing'.";
        } else {
            $logs[] = "[Priority-Chain] Item $priorityQueueId not found or not in 'waiting'/'processing' state. Exiting without further action.";
            $pdo->commit();
            exit;
        }
    }
    // Scenario D: Batch Mode (Triggered by enrollSubscribersBulk or Cron)
    else if (($_GET['mode'] ?? '') === 'batch') {
        $logs[] = "[Priority-Batch] Processing top 50 waiting priority items.";
        $stmtBatch = $pdo->prepare("SELECT q.id as queue_id, q.subscriber_id, q.flow_id 
                                   FROM subscriber_flow_states q
                                   JOIN flows f ON q.flow_id = f.id
                                   WHERE q.status = 'waiting' AND q.scheduled_at <= NOW() AND f.status = 'active'
                                   ORDER BY q.created_at ASC LIMIT 50");
        $stmtBatch->execute();
        $batchItems = $stmtBatch->fetchAll();

        if (empty($batchItems)) {
            $logs[] = "[Priority-Batch] No waiting items found. Exiting.";
            $pdo->commit();
            exit;
        }

        // [FIX] Replace 50 sequential cURL calls with curl_multi_exec with concurrency cap.
        // Old approach: foreach + curl_exec() fires up to 50 HTTP requests back-to-back,
        // exhausting PHP-FPM workers and acting like a local DDoS if cron runs every minute.
        // New approach: fire at most 5 requests concurrently, wait for them to finish,
        // then fire the next batch of 5 — controlled parallelism with no server overload.
        $CONCURRENCY = 5;
        $chunks = array_chunk($batchItems, $CONCURRENCY);

        foreach ($chunks as $chunk) {
            $mh = curl_multi_init();
            $handles = [];

            foreach ($chunk as $bi) {
                $workerParams = http_build_query([
                    'priority_queue_id' => $bi['queue_id'],
                    'subscriber_id' => $bi['subscriber_id'],
                    'priority_flow_id' => $bi['flow_id'],
                ]);
                $workerUrl = API_BASE_URL . "/worker_priority.php?" . $workerParams;

                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $workerUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 30);       // Give each worker 30s to complete
                curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3); // Fail fast on connection errors
                curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
                curl_multi_add_handle($mh, $ch);
                $handles[] = $ch;
            }

            // Execute all handles in this chunk concurrently
            do {
                $status = curl_multi_exec($mh, $running);
                if ($running)
                    curl_multi_select($mh, 0.5); // Wait up to 0.5s before polling again
            } while ($running > 0 && $status === CURLM_OK);

            // Clean up
            foreach ($handles as $ch) {
                curl_multi_remove_handle($mh, $ch);
                curl_close($ch);
            }
            curl_multi_close($mh);
        }

        $logs[] = "[Priority-Batch] Triggered workers for " . count($batchItems) . " items (concurrency: $CONCURRENCY).";
        $pdo->commit();
        exit;
    }
    // Scenario C: Triggered for immediate CAMPAIGN sending - DEPRECATED/REDIRECTED
    else if ((isset($_GET['type']) && $_GET['type'] === 'campaign') && !empty($_GET['id'])) {
        $logs[] = "[Priority-Campaign] DEPRECATED: worker_priority.php should NOT be used for campaigns. Please use worker_campaign.php.";
        file_put_contents($debugLogFile, "DEPRECATED CALL: worker_priority called for campaign. Redirecting/Aborting.\n", FILE_APPEND);

        // Optional: We could trigger worker_campaign.php here as a fail-safe, but seeing the logs is better for debugging.
        $pdo->commit();
        echo json_encode(['status' => 'redirected', 'message' => 'Campaign triggering via priority is deprecated', 'logs' => $logs]);
        exit;
    } else {
        $logs[] = "[Priority] No valid priority trigger parameters or queue ID received. Exiting.";
        $pdo->commit();
        exit;
    }

    // --- SHARED DATA FETCHING (PRE-CHAIN) ---
    $subscriberId = $item['subscriber_id'];
    $flowId = $item['flow_id'];
    $flowName = $item['flow_name'];
    $queueId = $item['queue_id'];

    // [ELIGIBILITY CHECK]
    if (trim($item['sub_status']) === 'unsubscribed') {
        // Use 'unsubscribed' status — DB ENUM includes: waiting, processing, completed, failed, unsubscribed
        $pdo->prepare("UPDATE subscriber_flow_states SET status = 'unsubscribed', updated_at = NOW() WHERE id = ?")->execute([$queueId]);
        $logs[] = "[Priority-Exit] Sub {$subscriberId} is unsubscribed. Marking unsubscribed and skipping chain.";
        $pdo->commit();
        exit;
    }

    // Optimization: Cache frequency check (GLOBAL)
    $todayStart = date('Y-m-d 00:00:00');
    $stmtCap = $pdo->prepare("
        SELECT COUNT(*) FROM subscriber_activity 
        WHERE subscriber_id = ? 
        AND type IN ('receive_email', 'zalo_sent', 'meta_sent', 'zns_sent') 
        AND created_at >= ?
    ");
    $stmtCap->execute([$subscriberId, $todayStart]);
    $totalSentToday = (int) $stmtCap->fetchColumn();

    // [EXIT CHECK] Pre-compute exit types BEFORE the activity SELECT.
    // [FIX] Mirrors the same optimization applied to worker_flow.php:
    // build exitActivityTypes first → query ONLY those types with no LIMIT for exit checks.
    // The general LIMIT 500 cache below still covers condition-step logic.
    $exitConditionsEarly = $fConfig['exitConditions'] ?? [];
    $exitActivityTypesEarly = [];
    if (!empty($exitConditionsEarly)) {
        $exitTypeMapEarly = [
            'unsubscribed' => ['unsubscribe'],
            'clicked' => ['click_link', 'click_zns'],
            'opened' => ['open_email', 'open_zns'],
            'bounced' => ['bounce'],
        ];
        foreach ($exitConditionsEarly as $cond) {
            $exitActivityTypesEarly = array_merge($exitActivityTypesEarly, $exitTypeMapEarly[$cond] ?? [$cond]);
        }
    }

    // Exit-specific activity cache — unlimited, filtered by type (no LIMIT risk)
    if (!empty($exitActivityTypesEarly)) {
        $exitPlaceholdersEarly = implode(',', array_fill(0, count($exitActivityTypesEarly), '?'));
        $stmtExitActEarly = $pdo->prepare(
            "SELECT type, reference_id, campaign_id, details, created_at
             FROM subscriber_activity
             WHERE subscriber_id = ? AND created_at >= ? AND type IN ($exitPlaceholdersEarly)
             ORDER BY created_at DESC"
        );
        $stmtExitActEarly->execute(array_merge([$subscriberId, $item['queue_created_at']], $exitActivityTypesEarly));
        $exitActivityCacheEarly = $stmtExitActEarly->fetchAll();
    } else {
        $exitActivityCacheEarly = [];
    }

    // General activity cache — LIMIT 500 for condition-chain logic
    $stmtAct = $pdo->prepare("SELECT type, reference_id, campaign_id, details, created_at FROM subscriber_activity WHERE subscriber_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 500");
    $stmtAct->execute([$subscriberId, $item['queue_created_at']]);
    $activityCache = $stmtAct->fetchAll();

    $pdo->commit(); // Commit enrollment changes / status update before starting chain
    file_put_contents($debugLogFile, "Starting chain execution for queue ID: {$queueId}\n", FILE_APPEND | LOCK_EX);

    // --- START IMMEDIATE CHAIN EXECUTION ---
    // Note: We use intermediate commits for each step
    $pdo->beginTransaction();

    // FIX: flow_steps might already be an array if from scenario A enrollment
    $flowSteps = is_string($item['flow_steps']) ? json_decode($item['flow_steps'], true) : $item['flow_steps'];
    $fConfig = is_string($item['flow_config']) ? json_decode($item['flow_config'], true) : ($item['flow_config'] ?: []);

    $currentStepId = trim($item['step_id'] ?? '');
    $stepsProcessedInRun = 0;
    $MAX_STEPS = 50;
    $shouldContinueChain = true;
    $isPriorityChain = true;

    // Determine context for logging
    $campaignIdForFlow = null;
    foreach ($flowSteps as $s)
        if ($s['type'] === 'trigger' && ($s['config']['type'] ?? '') === 'campaign')
            $campaignIdForFlow = $s['config']['targetId'] ?? null;

    $logs[] = "[Priority-Chain] Starting chain for Sub {$subscriberId} (Queue: {$queueId}) in '{$flowName}'. Current Sent: {$totalSentToday}";
    $item['has_email_error'] = false;


    // [SCHEDULING CHECK] activeDays / startTime / endTime from flow config
    $activeDays = $fConfig['activeDays'] ?? [0, 1, 2, 3, 4, 5, 6];
    // [FIX] Guard against empty array from bad UI config — prevents infinite loop
    // where the for($i=1..7) loop never finds a valid day and $nextSendAt is never set.
    if (empty($activeDays)) {
        $activeDays = [0, 1, 2, 3, 4, 5, 6];
    }
    $startTimeSched = $fConfig['startTime'] ?? '00:00';
    $endTimeSched = $fConfig['endTime'] ?? '23:59';
    $currentDayOfWeek = (int) date('w'); // 0=Sunday, 6=Saturday
    $currentTimeSched = date('H:i');

    $isDayAllowed = in_array($currentDayOfWeek, array_map('intval', $activeDays));
    $isTimeAllowed = ($currentTimeSched >= $startTimeSched && $currentTimeSched <= $endTimeSched);

    // [FIX] If today is an allowed day but current time is PAST the endTime window,
    // treat the day as NOT allowed so we skip to the NEXT valid day.
    // Without this guard: the else-branch below sets $nextSendAt = today + startTimeSched
    // which is ALREADY in the past → worker wakes up immediately → infinite reschedule loop.
    if ($isDayAllowed && $currentTimeSched > $endTimeSched) {
        $isDayAllowed = false;
    }

    if (!$isDayAllowed || !$isTimeAllowed) {
        // Reschedule to next valid window
        if ($isDayAllowed && !$isTimeAllowed) {
            // Day is valid and time hasn't arrived yet — wait until startTime today
            $nextSendAt = date('Y-m-d') . ' ' . $startTimeSched . ':00';
        } else {
            // Day not allowed (or past endTime on otherwise valid day) — find next allowed day
            $nextSendAt = date('Y-m-d') . ' ' . $startTimeSched . ':00';
            for ($i = 1; $i <= 7; $i++) {
                $checkDay = (int) date('w', strtotime("+$i days"));
                if (in_array($checkDay, array_map('intval', $activeDays))) {
                    $nextSendAt = date('Y-m-d', strtotime("+$i days")) . ' ' . $startTimeSched . ':00';
                    break;
                }
            }
        }
        $pdo->prepare("UPDATE subscriber_flow_states SET status = 'waiting', scheduled_at = ?, updated_at = NOW() WHERE id = ?")->execute([$nextSendAt, $queueId]);
        $logs[] = "[Priority-Schedule] Paused for Sub {$subscriberId} (Day/Time restriction). Next send: $nextSendAt";
        $pdo->commit();
        exit;
    }

    while ($shouldContinueChain && $stepsProcessedInRun < $MAX_STEPS) {
        $stepsProcessedInRun++;
        $currentStep = null;
        foreach ($flowSteps as $s) {
            if (trim($s['id']) === $currentStepId) {
                $currentStep = $s;
                break;
            }
        }

        if (!$currentStep) {
            $pdo->prepare("UPDATE subscriber_flow_states SET status = 'completed', updated_at = NOW() WHERE id = ?")->execute([$queueId]);
            $pdo->prepare("UPDATE flows SET stat_completed = stat_completed + 1 WHERE id = ?")->execute([$flowId]);
            $logs[] = "  -> Step '{$currentStepId}' not found. Flow completed.";
            break;
        }

        // [EXIT CHECK] Segment match or activity based exit
        $exitConditions = $fConfig['exitConditions'] ?? [];
        if (!empty($exitConditions)) {
            // [FIX] Normalize frontend exit condition ids to actual activity types
            $exitTypeMap = [
                'unsubscribed' => ['unsubscribe'],
                'clicked' => ['click_link', 'click_zns'],
                'opened' => ['open_email', 'open_zns'],
                'bounced' => ['bounce'],
            ];
            $exitActivityTypes = [];
            foreach ($exitConditions as $cond) {
                $exitActivityTypes = array_merge($exitActivityTypes, $exitTypeMap[$cond] ?? [$cond]);
            }

            $shouldExit = false;
            // [FIX] Use the pre-fetched, type-filtered exitActivityCacheEarly (no LIMIT risk)
            foreach ($exitActivityCacheEarly as $act) {
                if (in_array($act['type'], $exitActivityTypes)) {
                    $shouldExit = true;
                    break;
                }
            }
            if ($shouldExit) {
                $pdo->prepare("UPDATE subscriber_flow_states SET status = 'completed', updated_at = NOW() WHERE id = ?")->execute([$queueId]);
                logActivity($pdo, $subscriberId, 'exit_flow', $flowId, $flowName, "Exited: Condition met", $flowId);
                $pdo->prepare("UPDATE flows SET stat_completed = stat_completed + 1 WHERE id = ?")->execute([$flowId]);
                $logs[] = "[Priority-Exit] Exit conditions met.";
                break;
            }
        }

        // [EXIT CHECK] Advanced Exit: form_submit / purchase / custom_event
        $advancedExit = $fConfig['advancedExit'] ?? [];
        if (!empty($advancedExit) && checkAdvancedExit($pdo, $subscriberId, $item['queue_created_at'], $advancedExit, $activityCache)) {
            $pdo->prepare("UPDATE subscriber_flow_states SET status = 'completed', updated_at = NOW() WHERE id = ?")->execute([$queueId]);
            logActivity($pdo, $subscriberId, 'exit_flow', $flowId, $flowName, "Exited: Advanced condition met", $flowId);
            $pdo->prepare("UPDATE flows SET stat_completed = stat_completed + 1 WHERE id = ?")->execute([$flowId]);
            $logs[] = "[Priority-Exit] Advanced exit condition met (form/purchase/custom_event).";
            break;
        }

        // [SCHEDULE PROTECT]
        if ($isPriorityChain && !($_GET['force_skip'] ?? 0)) {
            $scheduledTime = strtotime($item['scheduled_at'] ?? $now);
            if ($scheduledTime > (time() + 1)) {
                $sType = strtolower($currentStep['type'] ?? '');
                if (!in_array($sType, ['condition', 'advanced_condition', 'trigger'])) {
                    $logs[] = "  -> [SCHEDULE PROTECT] Step '{$currentStep['label']}' paused (Scheduled: {$item['scheduled_at']}).";
                    // [FIX] Also update step_id so worker resumes at correct step, not the previous one
                    $pdo->prepare("UPDATE subscriber_flow_states SET status = 'waiting', step_id = ?, updated_at = NOW() WHERE id = ?")
                        ->execute([$currentStepId, $queueId]);
                    $shouldContinueChain = false;
                    break;
                }
            }
        }

        // EXECUTE
        $execCtx = [
            'queue_created_at' => $item['queue_created_at'],
            'last_step_at' => $item['last_step_at'] ?? $item['updated_at'],
            'updated_at' => $item['updated_at'],
            'has_email_error' => $item['has_email_error'] ?? false,
            'flow_steps' => $flowSteps,
            'flow_name' => $flowName,
            'is_priority_chain' => $isPriorityChain,
            'total_sent_today' => $totalSentToday,
            'activity_cache' => $activityCache,
            'is_resumed_wait' => ($stepsProcessedInRun === 1 && trim((string) ($item['step_id'] ?? '')) === trim((string) $currentStepId) && $item['scheduled_at'] <= $now),
            'now' => $now
        ];

        $execResult = $flowExecutor->executeStep($currentStep, $item, $flowId, $currentStepId, $campaignIdForFlow, $fConfig, $execCtx);
        if (!empty($execResult['logs']))
            $logs = array_merge($logs, $execResult['logs']);

        if ($execResult['status'] === 'completed' && $execResult['next_step_id']) {
            $currentStepId = $execResult['next_step_id'];
            if ($execResult['is_instant']) {
                // Update local sent count if message was sent
                if (!empty($execResult['message_sent'])) {
                    $totalSentToday++;
                }

                $pdo->commit();
                $pdo->beginTransaction();
                $isPriorityChain = false; // After first action, constraints apply
                continue;
            } else {
                $pdo->prepare("UPDATE subscriber_flow_states SET status = 'waiting', scheduled_at = ?, step_id = ?, updated_at = NOW(), last_step_at = NOW() WHERE id = ?")->execute([$execResult['scheduled_at'], $currentStepId, $queueId]);
                $shouldContinueChain = false;
            }
        } else {
            if ($execResult['status'] === 'completed') {
                $pdo->prepare("UPDATE subscriber_flow_states SET status = 'completed', updated_at = NOW() WHERE id = ?")->execute([$queueId]);
                $pdo->prepare("UPDATE flows SET stat_completed = stat_completed + 1 WHERE id = ?")->execute([$flowId]);
            } else {
                $pdo->prepare("UPDATE subscriber_flow_states SET status = ?, scheduled_at = ?, updated_at = NOW(), step_id = ? WHERE id = ?")->execute([$execResult['status'], $execResult['scheduled_at'] ?? $now, $currentStepId, $queueId]);
            }
            $shouldContinueChain = false;
        }
    }

    if ($pdo->inTransaction())
        $pdo->commit();
    $logs[] = "[Priority-Chain] Chain executed. Steps: $stepsProcessedInRun";

    // [FIX] Force-flush any buffered Mailer delivery logs into DB before script exits.
    // Mailer.php batches logs in memory (writes every 10 emails). If the priority chain
    // processed < 10 email steps, those logs would be silently lost without this call.
    $mailer->closeConnection();

} catch (Throwable $e) {
    // Global catch block for any unexpected errors during processing
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
        $logs[] = "[ERROR] An exception occurred in priority chain for Queue ID {$queueId} (Sub: {$subscriberId}, Flow: {$flowId}): " . $e->getMessage() . " on line " . $e->getLine() . " in " . $e->getFile();
        // Mark the current queue item as failed or put it back to 'waiting' for inspection
        if ($queueIdToUpdate) {
            // [FIX] Schedule +10min to prevent infinite pick-up loop when exception occurs
            $retryAt = date('Y-m-d H:i:s', time() + 600);
            $pdo->prepare("UPDATE subscriber_flow_states SET status = 'waiting', scheduled_at = ?, last_error = ?, updated_at = NOW() WHERE id = ?")
                ->execute([$retryAt, $e->getMessage(), $queueIdToUpdate]);
            $logs[] = "  -> Queue item {$queueIdToUpdate} set to waiting (retry at $retryAt) due to error: " . $e->getMessage();
        }
    } else {
        $logs[] = "[ERROR] An exception occurred (no active transaction): " . $e->getMessage() . " on line " . $e->getLine() . " in " . $e->getFile();
    }
} finally {
    if ($pdo->inTransaction()) { // Should not happen after explicit commit/rollback, but good defensive programming
        $pdo->rollBack();
        $logs[] = "[WARNING] Transaction was still open in finally block and was rolled back defensively.";
    }
}

// Add log to file for debugging
$logs[] = "--- PRIORITY WORKER FINISHED: " . date('Y-m-d H:i:s') . " ---";
file_put_contents(__DIR__ . '/worker_priority.log', implode("\n", $logs) . "\n", FILE_APPEND | LOCK_EX);
echo implode("\n", $logs);
