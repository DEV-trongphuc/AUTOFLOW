<?php
// api/worker_campaign.php - OMNI-ENGINE V30.0 (IMMEDIATE SEND & FLOW ENROLLMENT OPTIMIZED)
// This worker is designed to be run by a cron job OR triggered directly for immediate send.

error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
ini_set('display_errors', 0);
set_time_limit(600); // Allow up to 10 minutes for sending a batch
ignore_user_abort(true); // Fix: Continue running even if client (curl) disconnects

require_once 'db_connect.php';
require_once 'Mailer.php'; // Mailer is required here for sending emails
require_once 'segment_helper.php';
require_once 'zalo_sender.php';
require_once 'flow_helpers.php';

date_default_timezone_set('Asia/Ho_Chi_Minh');
$pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
header('Content-Type: application/json; charset=utf-8');

// NOTE: $apiUrl, $settings, $mailer are initialized inside runWorkerCampaign()
//       so they are in the correct scope when called from worker_queue.php.
// $now and $logs are also initialized inside runWorkerCampaign()

// Incremental logging helper
if (!function_exists('writeWorkerLog')) {
    function writeWorkerLog($msg)
    {
        $formatted = "[" . date('Y-m-d H:i:s') . "] $msg\n";
        file_put_contents(__DIR__ . '/worker_campaign.log', $formatted, FILE_APPEND);
    }
}

if (!function_exists('runWorkerCampaign')) {
    function runWorkerCampaign($pdo, $campaignId = null)
    {

        $now = date('Y-m-d H:i:s');
        $logs = [];
        $logs[] = "--- CAMPAIGN WORKER START: $now ---";
        writeWorkerLog("--- WORKER STARTED ---");

        // Initialize shared resources inside function scope
        $apiUrl = API_BASE_URL;
        $stmt = $pdo->query("SELECT * FROM system_settings");
        $settings = [];
        foreach ($stmt->fetchAll() as $row) {
            $settings[$row['key']] = $row['value'];
        }
        $defaultSender = !empty($settings['smtp_user']) ? $settings['smtp_user'] : "marketing@ka-en.com.vn";
        $mailer = new Mailer($pdo, $apiUrl, $defaultSender);

        // Check for valid request (from Cron or Direct Trigger)
        $manualCampaignId = $campaignId ?? $_GET['campaign_id'] ?? null;
        // [INFINITE LOOP GUARD] Track how many consecutive "continuous mode" retries have been made.
        // Passed via ?retry_count=N in the async trigger URL. If count exceeds MAX, auto-pause.
        $retryCount = (int) ($_GET['retry_count'] ?? 0);
        $MAX_RETRIES = 8;
        if ($manualCampaignId) {
            $logs[] = "-> Direct trigger received for Campaign ID: $manualCampaignId (retry #$retryCount)";
            writeWorkerLog("Direct trigger for Campaign ID: $manualCampaignId (retry #$retryCount)");
        }


        // =================================================================================
// HELPERS (Imported from shared module)
// =================================================================================
// Functions used from flow_helpers.php:
// - parseLoopingContent
// - resolveEmailContent
// - replaceMergeTags
// - logActivity


        // =================================================================================
// CAMPAIGN DISPATCHER
// =================================================================================
        $campaign = null;

        if ($manualCampaignId) {
            // Priority: Fetch specifically requested campaign - Allow more statuses for direct trigger
            $stmtCamp = $pdo->prepare("SELECT * FROM campaigns WHERE id = ? AND status IN ('scheduled', 'sending', 'paused', 'draft') LIMIT 1");
            $stmtCamp->execute([$manualCampaignId]);
            $campaign = $stmtCamp->fetch();
            if (!$campaign)
                $logs[] = "[Target Campaign] Campaign ID $manualCampaignId not found or not in valid state.";
        }

        if (!$campaign) {
            // Fallback: Pick next scheduled campaign
            $stmtCamp = $pdo->prepare("SELECT * FROM campaigns WHERE status IN ('scheduled', 'sending') AND (scheduled_at <= ? OR scheduled_at IS NULL) ORDER BY scheduled_at ASC LIMIT 1");
            $stmtCamp->execute([$now]);
            $campaign = $stmtCamp->fetch();
        }

        if ($campaign) {
            $cid = $campaign['id'];
            $cName = $campaign['name'];

            // Start a transaction for the campaign processing
            $pdo->beginTransaction();
            try {
                // Initialize if NOT already sending, or if sent_at is missing (manual trigger case)
                if ($campaign['status'] !== 'sending' || empty($campaign['sent_at'])) {
                    // Calculate Audience Size (Snapshot)
                    $countSql = "SELECT COUNT(DISTINCT s.id) FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer')";

                    // ZNS Requirement: Must have phone number
                    if (($campaign['type'] ?? 'email') === 'zalo_zns') {
                        $countSql .= " AND (s.phone_number IS NOT NULL AND s.phone_number != '')";
                    }

                    $countWheres = [];
                    $countParams = [];
                    $targetConf = json_decode($campaign['target_config'], true);

                    // A. LISTS
                    if (!empty($targetConf['listIds'])) {
                        // [BUG-M1 FIX] Use parameterized query to prevent SQL injection
                        $listPlaceholders = implode(',', array_fill(0, count($targetConf['listIds']), '?'));
                        $countWheres[] = "s.id IN (SELECT subscriber_id FROM subscriber_lists WHERE list_id IN ($listPlaceholders))";
                        $countParams = array_merge($countParams, $targetConf['listIds']);
                    }
                    // B. TAGS (10M UPGRADE: Relational Join)
                    if (!empty($targetConf['tagIds'])) {
                        $tagConditions = [];
                        foreach ($targetConf['tagIds'] as $tag) {
                            $tagConditions[] = "s.id IN (SELECT st.subscriber_id FROM subscriber_tags st JOIN tags t_sub ON st.tag_id = t_sub.id WHERE t_sub.name = ?)";
                            $countParams[] = $tag;
                        }
                        if (!empty($tagConditions)) {
                            $countWheres[] = "(" . implode(' OR ', $tagConditions) . ")";
                        }
                    }
                    // C. SEGMENTS
                    if (!empty($targetConf['segmentIds'])) {
                        // [BUG-M1 FIX] Use parameterized query to prevent SQL injection
                        $segPlaceholders = implode(',', array_fill(0, count($targetConf['segmentIds']), '?'));
                        $stmtSegs = $pdo->prepare("SELECT criteria FROM segments WHERE id IN ($segPlaceholders)");
                        $stmtSegs->execute($targetConf['segmentIds']);
                        if ($stmtSegs) {
                            foreach ($stmtSegs->fetchAll() as $seg) {
                                $res = buildSegmentWhereClause($seg['criteria']);
                                if ($res['sql'] !== '1=1') {
                                    $countWheres[] = $res['sql'];
                                    foreach ($res['params'] as $p)
                                        $countParams[] = $p;
                                }
                            }
                        }
                    }

                    $totalAudience = (int) ($campaign['total_target_audience'] ?? 0);
                    if (!empty($countWheres) && ($totalAudience === 0 || $manualCampaignId)) {
                        $countSql .= " AND (" . implode(' OR ', $countWheres) . ")";
                        $stmtCount = $pdo->prepare($countSql);
                        $stmtCount->execute($countParams);
                        $totalAudience = (int) $stmtCount->fetchColumn();
                    }

                    // Change status to 'sending' and ensure sent_at is marked
                    $pdo->prepare("UPDATE campaigns SET status = 'sending', sent_at = IFNULL(sent_at, NOW()), total_target_audience = ? WHERE id = ?")->execute([$totalAudience, $cid]);
                    $logs[] = "[Campaign {$cid}] Initialized. Status: sending. Total Audience: $totalAudience";
                    writeWorkerLog("Campaign $cid Initialized. Audience: $totalAudience");

                    // Re-fetch to get updated sent_at for resolveEmailContent if needed
                    $stmtCamp = $pdo->prepare("SELECT * FROM campaigns WHERE id = ?");
                    $stmtCamp->execute([$cid]);
                    $campaign = $stmtCamp->fetch();
                }

                // 1. Resolve Resources Once
                $skipQA = true; // Optimization for amazon 14/s capacity
                $linkedFlow = null;
                $flowTriggerNextStepId = null;
                $stmtAllActive = $pdo->query("SELECT id, name, steps FROM flows WHERE status = 'active'");
                $activeFlows = $stmtAllActive->fetchAll();

                foreach ($activeFlows as $f) {
                    $stepsArr = json_decode($f['steps'], true) ?: [];
                    foreach ($stepsArr as $s) {
                        if ($s['type'] === 'trigger' && ($s['config']['type'] ?? '') === 'campaign' && ($s['config']['targetId'] ?? '') === $cid) {
                            $linkedFlow = $f;
                            break 2;
                        }
                    }
                }

                // Check for ANY previous enrollment to prevent loop-spam
                $checkFlowEnrollment = false;
                if ($linkedFlow) {
                    $stepsArr = json_decode($linkedFlow['steps'], true) ?: [];
                    foreach ($stepsArr as $s) {
                        if ($s['type'] === 'trigger' && ($s['config']['type'] ?? '') === 'campaign' && ($s['config']['targetId'] ?? '') === $cid) {
                            if (isset($s['nextStepId'])) {
                                $checkFlowEnrollment = true;
                                $flowTriggerNextStepId = $s['nextStepId'];
                            }
                            break;
                        }
                    }
                }

                $isABTest = ($campaign['type'] ?? '') === 'ab_testing';
                $abConfig = $isABTest ? (json_decode($campaign['config'] ?? '{}', true)['ab_test'] ?? []) : [];
                $hasVariantB = !empty($abConfig['variant_b']);

                $htmlContent = resolveEmailContent($pdo, $campaign['template_id'], $campaign['custom_html'] ?? '', $campaign['content_body']);
                $htmlContentB = $hasVariantB ? resolveEmailContent($pdo, $abConfig['variant_b']['template_id'] ?? $campaign['template_id'], $abConfig['variant_b']['custom_html'] ?? '', $abConfig['variant_b']['content_body'] ?? '') : null;

                $campaignAttachments = json_decode($campaign['attachments'] ?? '[]', true);

                // [PRE-BUILD QUERY FILTERS]
                $wheres = [];
                $queryBaseParams = [];
                $target = json_decode($campaign['target_config'], true);

                if (!empty($target['listIds'])) {
                    // [BUG-M1 FIX] Use parameterized query to prevent SQL injection
                    $listPlaceholders = implode(',', array_fill(0, count($target['listIds']), '?'));
                    $wheres[] = "s.id IN (SELECT subscriber_id FROM subscriber_lists WHERE list_id IN ($listPlaceholders))";
                    $queryBaseParams = array_merge($queryBaseParams, $target['listIds']);
                }
                if (!empty($target['tagIds'])) {
                    $tagConditions = [];
                    foreach ($target['tagIds'] as $tag) {
                        $tagConditions[] = "s.id IN (SELECT st.subscriber_id FROM subscriber_tags st JOIN tags t_sub ON st.tag_id = t_sub.id WHERE t_sub.name = ?)";
                        $queryBaseParams[] = $tag;
                    }
                    if (!empty($tagConditions))
                        $wheres[] = "(" . implode(' OR ', $tagConditions) . ")";
                }
                if (!empty($target['segmentIds'])) {
                    // [BUG-M1 FIX] Use parameterized query to prevent SQL injection
                    $segPlaceholders = implode(',', array_fill(0, count($target['segmentIds']), '?'));
                    $stmtSegs = $pdo->prepare("SELECT criteria FROM segments WHERE id IN ($segPlaceholders)");
                    $stmtSegs->execute($target['segmentIds']);
                    foreach ($stmtSegs->fetchAll() as $seg) {
                        $res = buildSegmentWhereClause($seg['criteria']);
                        if ($res['sql'] !== '1=1') {
                            $wheres[] = $res['sql'];
                            foreach ($res['params'] as $p)
                                $queryBaseParams[] = $p;
                        }
                    }
                }

                // 2. Micro-Batch Processing Loop
                $BATCH_SIZE = 50;
                $MAX_BATCHES = 40; // Safety: Cap at 2000 emails per worker run (40 batches x 50) to prevent FPM exhaustion
                $batchCount = 0;
                $hasMore = true;
                $totalProcessed = 0;
                $startTimeRun = microtime(true);

                // Commit the initialization transaction
                $pdo->commit();

                while ($hasMore && $batchCount < $MAX_BATCHES) {
                    $batchCount++;

                    // [TIME GUARD] Stop if we've been running for more than 450 seconds (7.5 min)
                    // limit is 600s, but we want to leave room for final updates and cleanup.
                    if (microtime(true) - $startTimeRun > 450) {
                        writeWorkerLog("Campaign $cid: Execution time limit reached. Stopping batch loop.");
                        break;
                    }
                    $pdo->beginTransaction();
                    try {
                        // [OPTIMIZED] Fetch only essential columns for sending speed
                        $sql = "SELECT s.id, s.email, s.first_name, s.last_name, s.phone_number, s.custom_attributes FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer')";
                        $execParams = $queryBaseParams;

                        if (($campaign['type'] ?? 'email') === 'zalo_zns') {
                            $sql .= " AND (s.phone_number IS NOT NULL AND s.phone_number != '')";
                        }

                        if (!empty($wheres))
                            $sql .= " AND (" . implode(' OR ', $wheres) . ")";

                        // Exclude already sent or failed
                        $sql .= " AND NOT EXISTS (
                    SELECT 1 FROM subscriber_activity sa 
                    WHERE sa.subscriber_id = s.id 
                    AND (sa.type IN ('receive_email', 'failed_email', 'zalo_sent', 'meta_sent', 'zns_sent', 'zns_failed', 'enter_flow')) 
                    AND sa.campaign_id = ?
                )";
                        $execParams[] = $cid;

                        $sql .= " LIMIT $BATCH_SIZE FOR UPDATE SKIP LOCKED";

                        $stmtSubs = $pdo->prepare($sql);
                        $stmtSubs->execute($execParams);
                        $recipients = $stmtSubs->fetchAll();

                        if (empty($recipients)) {
                            $hasMore = false;
                            $pdo->commit();
                            break;
                        }

                        // Prepare Batch Data
                        $successIds = [];
                        $failActivities = [];
                        $successActivities = [];
                        $flowEnrollments = [];
                        $jobDispatches = [];

                        // [OPTIMIZATION] Pre-fetch Frequency Caps for entire batch
                        $capCache = [];
                        $maxPerDay = (int) ($settings['max_messages_per_day'] ?? 0);
                        if ($maxPerDay > 0) {
                            $subIdList = array_column($recipients, 'id');
                            $placeholdersSub = implode(',', array_fill(0, count($subIdList), '?'));
                            $stmtBatchCap = $pdo->prepare("
                        SELECT subscriber_id, COUNT(*) as total 
                        FROM subscriber_activity 
                        WHERE subscriber_id IN ($placeholdersSub) 
                        AND type IN ('receive_email', 'zalo_sent', 'meta_sent', 'zns_sent') 
                        AND created_at >= CURDATE()
                        GROUP BY subscriber_id
                    ");
                            $stmtBatchCap->execute($subIdList);
                            foreach ($stmtBatchCap->fetchAll() as $row) {
                                $capCache[$row['subscriber_id']] = (int) $row['total'];
                            }
                        }

                        // [OPTIMIZATION] Pre-fetch Flow Enrollment Status for entire batch if linked flow exists
                        $enrollmentCache = [];
                        if ($linkedFlow) {
                            $fid = $linkedFlow['id'];
                            $subIdList = array_column($recipients, 'id');
                            $placeholdersSub = implode(',', array_fill(0, count($subIdList), '?'));
                            $stmtBatchEnroll = $pdo->prepare("
                        SELECT subscriber_id, status, updated_at, created_at 
                        FROM subscriber_flow_states 
                        WHERE subscriber_id IN ($placeholdersSub) AND flow_id = ?
                        ORDER BY created_at DESC
                    ");
                            $stmtBatchEnroll->execute(array_merge($subIdList, [$fid]));
                            foreach ($stmtBatchEnroll->fetchAll() as $row) {
                                if (!isset($enrollmentCache[$row['subscriber_id']])) {
                                    $enrollmentCache[$row['subscriber_id']] = $row; // Keep latest
                                }
                            }
                        }

                        // [REAL-TIME PROGRESS] Time-based tracking (every 3 seconds)
                        $lastProgressUpdate = microtime(true);

                        $recipientIndexInBatch = 0;
                        foreach ($recipients as $sub) {
                            $subId = $sub['id'];
                            $attachments = Mailer::filterAttachments($campaignAttachments, $sub['email']);

                            $currentSubject = $campaign['subject'];
                            $currentHtml = $htmlContent;
                            $variationLabel = "A";

                            if ($isABTest && $hasVariantB) {
                                $hash = hexdec(substr(md5($subId . $cid), 0, 8));
                                $ratioA = (int) ($abConfig['ratio_a'] ?? 50);
                                if (($hash % 100) >= $ratioA) {
                                    $currentSubject = $abConfig['variant_b']['subject'] ?? $currentSubject;
                                    $currentHtml = $htmlContentB ?? $currentHtml;
                                    $variationLabel = "B";
                                }
                            }

                            $personalHtml = replaceMergeTags($currentHtml, $sub);
                            $personalSubject = replaceMergeTags($currentSubject, $sub);

                            $recipientIndexInBatch++;

                            // [TURBO] Send QA only for the first subscriber of the campaign run to avoid exponential slowdown
                            $skipQA = ($totalProcessed > 0 || $recipientIndexInBatch > 1);

                            // [OPTIMIZED] Frequency Cap Check
                            if ($maxPerDay > 0) {
                                $totalToday = $capCache[$subId] ?? 0;
                                if ($totalToday >= $maxPerDay) {
                                    $logs[] = "  -> Skipping {$sub['email']}: Frequency cap reached ($totalToday/$maxPerDay)";
                                    continue;
                                }
                                $capCache[$subId]++; // Increment local cache for this batch
                            }

                            if (($campaign['type'] ?? 'email') === 'zalo_zns') {
                                // ZNS SENDING LOGIC
                                $znsConfig = $campaign['config'] ? json_decode($campaign['config'], true) : [];
                                $oaConfigId = $znsConfig['oa_config_id'] ?? '';
                                $mappedParams = $znsConfig['mapped_params'] ?? [];

                                $templateData = [];
                                $missingParams = [];
                                foreach ($mappedParams as $tKey => $subField) {
                                    $val = replaceMergeTags($subField, $sub, []);
                                    if ($val === '') {
                                        $missingParams[] = $tKey;
                                    }
                                    $templateData[$tKey] = $val;
                                }

                                if (!empty($missingParams)) {
                                    $res = "ZNS Failed: Missing data for parameters (" . implode(', ', $missingParams) . ")";
                                    writeWorkerLog("Campaign $cid: [ZNS] Subscriber {$sub['id']} missing data for " . implode(', ', $missingParams));
                                } else {
                                    // Send ZNS
                                    $znsRes = sendZNSMessage($pdo, $oaConfigId, $campaign['template_id'], $sub['phone_number'], $templateData, null, null, $sub['id']);

                                    // ZNS result standardization
                                    if ($znsRes['success']) {
                                        $res = true;
                                    } else {
                                        $res = $znsRes['message'] ?? 'ZNS Failed';
                                    }
                                }
                            } else {
                                // EMAIL SENDING LOGIC
                                $res = $mailer->send($sub['email'], $personalSubject, $personalHtml, $sub['id'], $cid, null, null, $attachments, null, null, $cName, false, $skipQA, $variationLabel);
                            }

                            if ($res === true) {
                                $successIds[] = $subId;
                                $activityType = (($campaign['type'] ?? 'email') === 'zalo_zns') ? 'zns_sent' : 'receive_email';
                                $currentVar = $isABTest ? $variationLabel : null;
                                $successActivities[] = [$subId, $activityType, $cid, $cName, "Campaign Sent" . ($isABTest ? " ($variationLabel)" : ""), $cid, null, $currentVar];

                                // Flow Logic (Optimized using cache)
                                if ($linkedFlow && $flowTriggerNextStepId) {
                                    $fid = $linkedFlow['id'];
                                    $fConfig = json_decode($linkedFlow['config'], true) ?: [];
                                    $frequency = $fConfig['frequency'] ?? 'one-time';
                                    $allowMultiple = !empty($fConfig['allowMultiple']);
                                    $cooldownHours = (int) ($fConfig['enrollmentCooldownHours'] ?? 24);

                                    $shouldEnroll = false;
                                    $existing = $enrollmentCache[$subId] ?? null;

                                    if ($allowMultiple) {
                                        // Allow if not already waiting/processing in this flow
                                        if (!$existing || !in_array($existing['status'], ['waiting', 'processing']))
                                            $shouldEnroll = true;
                                    } else {
                                        if (!$existing) {
                                            $shouldEnroll = true;
                                        } elseif ($frequency === 'recurring') {
                                            if (!in_array($existing['status'], ['waiting', 'processing'])) {
                                                $lastUpd = strtotime($existing['updated_at']);
                                                if ((time() - $lastUpd) >= ($cooldownHours * 3600))
                                                    $shouldEnroll = true;
                                            }
                                        }
                                    }

                                    if ($shouldEnroll) {
                                        $initialSchedule = $now;
                                        // [SMART SCHEDULE] Check if first step is WAIT
                                        $fSteps = json_decode($linkedFlow['steps'], true) ?: [];
                                        foreach ($fSteps as $fs) {
                                            if ($fs['id'] === $flowTriggerNextStepId && $fs['type'] === 'wait') {
                                                $fsWaitConfig = $fs['config'] ?? [];
                                                $fsWaitMode = $fsWaitConfig['mode'] ?? 'duration';
                                                if ($fsWaitMode === 'duration') {
                                                    $dur = (int) ($fsWaitConfig['duration'] ?? 0);
                                                    $unit = $fsWaitConfig['unit'] ?? 'minutes';
                                                    // [BUG-C2 FIX] Support weeks in addition to days/hours/minutes
                                                    $unitSeconds = match ($unit) {
                                                        'weeks' => 604800,
                                                        'days' => 86400,
                                                        'hours' => 3600,
                                                        default => 60,
                                                    };
                                                    $delay = $unitSeconds * $dur;
                                                    if ($delay > 0)
                                                        $initialSchedule = date('Y-m-d H:i:s', time() + $delay);
                                                }
                                                // For until/until_date/until_attribute modes, FlowExecutor handles scheduling on first execution
                                                break;
                                            }
                                        }

                                        $flowEnrollments[] = ['sid' => $subId, 'fid' => $fid, 'step' => $flowTriggerNextStepId, 'schedule' => $initialSchedule];
                                        $successActivities[] = [$subId, 'enter_flow', $fid, $linkedFlow['name'], "Enrolled from Campaign '{$cName}'", $cid, $fid];

                                        // Update local cache to prevent duplicate enrollment in same batch if loop continues?
                                        // Actually $recipients are distinct, but just in case:
                                        $enrollmentCache[$subId] = ['status' => 'waiting', 'updated_at' => $now];
                                    }
                                } else {
                                    $jobDispatches[] = ['trigger_type' => 'campaign', 'target_id' => $cid, 'subscriber_id' => $subId];
                                }

                            } else {
                                $errMsg = is_string($res) ? $res : 'Unknown Error';
                                // [DEADLOCK NOTE] checkAndHandleHardBounce() UPDATEs subscribers.
                                // Safe here because: FOR UPDATE SKIP LOCKED already locked $sub['id']
                                // specifically for this worker. The function's UPDATE targets the same
                                // row we own — no cross-lock conflict with other workers.
                                $extra = checkAndHandleHardBounce($pdo, $sub['id'], $errMsg);
                                $failType = ($campaign['type'] ?? 'email') === 'zalo_zns' ? 'zns_failed' : 'failed_email';
                                if ($extra)
                                    $failType = 'failed_email'; // hardbounce implies email
                                $failActivities[] = [$subId, $failType, $cid, $cName, "Email failed: " . $errMsg, $cid, null, $isABTest ? $variationLabel : null];
                            }

                            // [REAL-TIME PROGRESS] Progress is now updated every batch of 50 (Batch Size)
                            // Redundant time-based update removed to reduce DB overhead during sending.
                        }

                        // Batch Operations
                        // 1. Log Activities
                        $allActivities = array_merge($successActivities, $failActivities);
                        if (!empty($allActivities)) {
                            $vals = [];
                            $binds = [];
                            foreach ($allActivities as $act) {
                                $binds[] = "(?, ?, ?, ?, ?, ?, ?, ?, NOW())";
                                $vals = array_merge($vals, [$act[0], $act[1], $act[2], $act[6] ?? null, $act[5] ?? null, $act[3], $act[4], $act[7] ?? null]);
                            }
                            $sqlIns = "INSERT INTO subscriber_activity (subscriber_id, type, reference_id, flow_id, campaign_id, reference_name, details, variation, created_at) VALUES " . implode(',', $binds);
                            $pdo->prepare($sqlIns)->execute($vals);
                        }

                        // 2. Update Subscriber Stats
                        if (!empty($successIds)) {
                            // [BUG-M2 FIX] Use parameterized query instead of string interpolation
                            $idPlaceholders = implode(',', array_fill(0, count($successIds), '?'));
                            $pdo->prepare("UPDATE subscribers SET stats_sent = stats_sent + 1 WHERE id IN ($idPlaceholders)")->execute($successIds);
                        }

                        // 3. Flow Enrollments
                        if (!empty($flowEnrollments)) {
                            $vals = [];
                            $binds = [];
                            $pastTime = date('Y-m-d H:i:s', strtotime('-1 second'));
                            $fidStats = [];
                            foreach ($flowEnrollments as $en) {
                                $binds[] = "(?, ?, ?, ?, 'waiting', NOW(), NOW(), NOW())";
                                $vals = array_merge($vals, [$en['sid'], $en['fid'], $en['step'], $en['schedule']]);
                                $fidStats[$en['fid']] = ($fidStats[$en['fid']] ?? 0) + 1;

                                $jobDispatches[] = [
                                    'priority_override' => true,
                                    'subscriber_id' => $en['sid'],
                                    'priority_flow_id' => $en['fid']
                                ];
                            }
                            // [BUG-C1 FIX] Use INSERT IGNORE to prevent duplicate enrollment crashes
                            $sqlFlow = "INSERT IGNORE INTO subscriber_flow_states (subscriber_id, flow_id, step_id, scheduled_at, status, created_at, updated_at, last_step_at) VALUES " . implode(',', $binds);
                            $pdo->prepare($sqlFlow)->execute($vals);

                            foreach ($fidStats as $fid => $count) {
                                $pdo->prepare("UPDATE flows SET stat_enrolled = stat_enrolled + ? WHERE id = ?")->execute([$count, $fid]);
                            }
                        }

                        // 4. Update Campaign Count
                        $sentCount = count($successIds);
                        // Update count_sent AND stats JSON structure so UI polls see progress
                        try {
                            // Optimized SQL to handle NULL or Empty String for stats
                            $pdo->prepare("UPDATE campaigns SET count_sent = count_sent + ?, stats = JSON_SET(COALESCE(NULLIF(stats, ''), '{}'), '$.sent', COALESCE(JSON_EXTRACT(stats, '$.sent'), 0) + ?) WHERE id = ?")->execute([$sentCount, $sentCount, $cid]);
                        } catch (Exception $e) {
                            // Fallback to simple update if JSON fails
                            $logs[] = "[WARN] Stats JSON update failed (fallback used): " . $e->getMessage();
                            $pdo->prepare("UPDATE campaigns SET count_sent = count_sent + ? WHERE id = ?")->execute([$sentCount, $cid]);
                        }

                        $pdo->commit();

                        // 5. Dispatch Jobs (Post-Commit)
                        foreach ($jobDispatches as $job) {
                            if (isset($job['priority_flow_id'])) {
                                // Priority dispatch
                                dispatchQueueJob($pdo, 'flows', [
                                    'priority_queue_id' => 0,
                                    'subscriber_id' => $job['subscriber_id'],
                                    'priority_flow_id' => $job['priority_flow_id']
                                ]);
                            } else {
                                dispatchQueueJob($pdo, 'flows', $job);
                            }
                        }

                        $totalProcessed += count($recipients);
                        if (count($recipients) < $BATCH_SIZE) {
                            $hasMore = false;
                        }

                        // Keep-alive output
                        if ($totalProcessed % 50 === 0) {
                            $elapsed = microtime(true) - $startTimeRun;
                            $speed = round($totalProcessed / ($elapsed ?: 1), 1);
                            echo "Processed $totalProcessed (Speed: $speed mails/s)... ";
                            writeWorkerLog("Campaign $cid: Processed $totalProcessed. Current Speed: $speed m/s");
                            flush();
                        }
                    } catch (Exception $e) {
                        $pdo->rollBack();
                        $logs[] = "[ERROR] Batch failed: " . $e->getMessage();
                        writeWorkerLog("[ERROR] Campaign $cid Batch failed: " . $e->getMessage());
                        break;
                    }
                }

                // Final Status Check
                $pdo->beginTransaction(); // New transaction for final status

                // Simpler: Just check if $hasMore became false naturally indicating we processed all batches
                // Final Status Check - Double check if actually finished
                $sqlLeft = "SELECT COUNT(*) FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer')";
                $execFinal = $queryBaseParams;

                if (!empty($wheres))
                    $sqlLeft .= " AND (" . implode(' OR ', $wheres) . ")";

                $sqlLeft .= " AND NOT EXISTS (
            SELECT 1 FROM subscriber_activity sa 
            WHERE sa.subscriber_id = s.id 
            AND (sa.type IN ('receive_email', 'failed_email', 'zalo_sent', 'meta_sent', 'zns_sent', 'zns_failed', 'enter_flow')) 
            AND sa.campaign_id = ?
        )";
                $execFinal[] = $cid;

                $stmtLeft = $pdo->prepare($sqlLeft);
                $stmtLeft->execute($execFinal);
                $remaining = (int) $stmtLeft->fetchColumn();

                if ($remaining === 0) {
                    $pdo->prepare("UPDATE campaigns SET status = 'sent' WHERE id = ?")->execute([$cid]);
                    $logs[] = "[Campaign {$cid}] Finished. Status set to 'sent'.";
                    writeWorkerLog("Campaign $cid: Finished. Status set to 'sent'.");
                } else {
                    // [INFINITE LOOP GUARD] Prevent recursive self-spawn from running forever.
                    // If a SQL bug or persistent lock causes $remaining to never reach 0,
                    // the worker would spawn itself indefinitely and crash the server.
                    // Solution: pass retry_count in each re-trigger. Auto-pause after MAX_RETRIES.
                    if ($retryCount >= $MAX_RETRIES) {
                        $pdo->prepare("UPDATE campaigns SET status = 'paused' WHERE id = ?")->execute([$cid]);
                        $errMsg = "[CIRCUIT BREAKER] Campaign $cid auto-paused after $MAX_RETRIES consecutive retries with $remaining unsent recipients. Manual review required.";
                        $logs[] = $errMsg;
                        writeWorkerLog($errMsg);
                    } else {
                        $nextRetry = $retryCount + 1;
                        triggerAsyncWorker('/worker_campaign.php?campaign_id=' . $cid . '&retry_count=' . $nextRetry);
                        $logs[] = "[Campaign {$cid}] Continuous mode: $remaining remaining. Follow-up triggered (retry #$nextRetry).";
                        writeWorkerLog("Campaign $cid: Continuous mode: $remaining remaining. Follow-up triggered (retry #$nextRetry/$MAX_RETRIES).");
                    }
                }
                $pdo->commit();
            } catch (Exception $e) {
                if ($pdo->inTransaction())
                    $pdo->rollBack();
                $logs[] = "[ERROR] Campaign {$cid} failed: " . $e->getMessage();
                writeWorkerLog("[FATAL ERROR] Campaign $cid failed: " . $e->getMessage());
                $pdo->prepare("UPDATE campaigns SET status = 'paused' WHERE id = ?")->execute([$cid]);
            }
        } else {
            $logs[] = "[Campaign] No campaigns ready to process.";
            writeWorkerLog("No campaigns ready to process.");
        }


        file_put_contents(__DIR__ . '/worker_campaign.log', implode("\n", $logs) . "\n", FILE_APPEND);

        if (isset($mailer))
            $mailer->closeConnection();

        if (isset($_GET['output']) && $_GET['output'] === 'text') {
            echo implode("\n", $logs);
        } else {
            echo json_encode(['status' => 'completed', 'timestamp' => $now, 'logs' => $logs]);
        }
    } // end runWorkerCampaign()
} // end if (!function_exists)

// When run as standalone script (cron/direct), execute immediately
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    runWorkerCampaign($pdo, $_GET['campaign_id'] ?? null);
}