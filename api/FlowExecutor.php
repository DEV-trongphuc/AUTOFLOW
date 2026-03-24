<?php
// api/FlowExecutor.php
// Shared Logic for executing flow steps (used by worker_flow.php and worker_priority.php)

require_once 'flow_helpers.php';
require_once 'Mailer.php';
require_once 'zalo_sender.php';
require_once 'meta_sender.php';

class FlowExecutor
{
    private $pdo;
    private $mailer;
    private $apiUrl;
    private static $tagCache = [];
    private static $profileCache = [];

    public function __construct($pdo, $mailer, $apiUrl)
    {
        $this->pdo = $pdo;
        $this->mailer = $mailer;
        $this->apiUrl = $apiUrl;
    }

    /**
     * Buffer stats update instead of direct write to reduce locking
     */
    private function bufferStatsUpdate($table, $id, $column, $value = 1)
    {
        try {
            $stmt = $this->pdo->prepare("INSERT INTO stats_update_buffer (target_table, target_id, column_name, increment, created_at) VALUES (?, ?, ?, ?, NOW())");
            $stmt->execute([$table, $id, $column, $value]);
        } catch (Exception $e) {
            // Fallback
            $this->pdo->prepare("UPDATE $table SET $column = $column + ? WHERE id = ?")->execute([$value, $id]);
        }
    }

    /**
     * Execute a single step for a subscriber
     * 
     * @param array $step The step configuration array
     * @param array $subscriber Subscriber data array (must include id, email, phone, etc.)
     * @param int $flowId Flow ID
     * @param string $currentStepId Current Step UUID
     * @param int|null $campaignId Optional Campaign ID context
     * @param array $flowConfig Full Flow Config
     * @param array $contextData Additional context (e.g. flow steps for references)
     * @return array Result ['status', 'next_step_id', 'is_instant', 'logs', 'scheduled_at', 'should_continue']
     */
    public function executeStep($step, $subscriber, $flowId, $currentStepId, $campaignId = null, $flowConfig = [], $contextData = [])
    {
        $logs = [];
        $isInstantStep = false;
        $shouldContinueChain = true;
        $messageSent = false;
        $nextStepId = null;
        $nextScheduledAt = date('Y-m-d H:i:s');
        $status = 'completed';

        $subscriberId = $subscriber['subscriber_id'] ?? $subscriber['id'];
        $flowName = $contextData['flow_name'] ?? 'Flow';

        // Helper context required for some checks
        $queueCreatedAt = $contextData['queue_created_at'] ?? null;
        $lastStepAt = $contextData['last_step_at'] ?? null;
        $itemUpdatedAt = $contextData['updated_at'] ?? null;
        $hasEmailError = $contextData['has_email_error'] ?? false;
        $flowSteps = $contextData['flow_steps'] ?? [];

        // OMNI-FIX REMOVED: User requested not to link flow activities back to campaign IDs
        // This ensures flow steps are reported under flow_id only, keeping campaign reports clean.

        try {
            switch ($step['type']) {
                case 'action': // Send Email
                    // [OPTIMIZATION] Frequency Cap Check
                    $maxPerDay = (int) ($flowConfig['maxMessagesPerDay'] ?? 0);
                    $todaySent = (int) ($contextData['total_sent_today'] ?? 0);
                    if ($maxPerDay > 0 && $todaySent >= $maxPerDay) {
                        $logs[] = "  -> Frequency cap reached ($todaySent/$maxPerDay). Rescheduling to tomorrow.";
                        logActivity($this->pdo, $subscriberId, 'frequency_cap_reached', $currentStepId, $flowName, "Cap: $maxPerDay", $flowId);

                        $status = 'waiting';
                        $nextScheduledAt = date('Y-m-d 09:00:00', strtotime('+1 day'));
                        $shouldContinueChain = false;
                        break;
                    }

                    $config = $step['config'];

                    // [BUG-FIX #10] Build resolver context before calling replaceMergeTags.
                    // Previously $resolverContext was always [], so {{unsubscribeLink}},
                    // {{campaignName}} were never resolved in flow action emails.
                    $unsubToken = urlencode($subscriber['email'] ?? $subscriberId);
                    $resolverContext = [
                        'unsubscribe_url' => ($this->apiUrl . '/unsubscribe.php?token=' . $unsubToken . '&flow_id=' . $flowId),
                        'campaign_name' => $flowName,
                        'campaignName' => $flowName,
                    ];

                    $htmlContent = resolveEmailContent($this->pdo, $config['templateId'] ?? '', $config['customHtml'] ?? '', $config['contentBody'] ?? '', $resolverContext);

                    $finalHtml = replaceMergeTags($htmlContent, $subscriber, $resolverContext);
                    $finalSubject = replaceMergeTags($config['subject'] ?? '', $subscriber, $resolverContext);


                    // Attachments
                    $attRaw = $config['attachments'] ?? '[]';
                    $emailAttachments = is_array($attRaw) ? $attRaw : (json_decode($attRaw, true) ?: []);
                    $attachments = Mailer::filterAttachments($emailAttachments, $subscriber['email']);

                    // Send
                    $res = $this->mailer->send($subscriber['email'], $finalSubject, $finalHtml, $subscriberId, $campaignId, $flowId, $flowName, $attachments, null, $currentStepId, $step['label']);

                    if ($res === true) {
                        $this->bufferStatsUpdate('flows', $flowId, 'stat_total_sent');
                        $this->bufferStatsUpdate('subscribers', $subscriberId, 'stats_sent');

                        logActivity($this->pdo, $subscriberId, 'receive_email', $currentStepId, $flowName, "Email sent: " . $step['label'], $flowId, $campaignId);
                        $logs[] = "  -> Email sent for {$subscriber['email']} (Step: {$step['label']}).";

                        $nextStepId = $step['nextStepId'] ?? null;
                        $isInstantStep = true;
                        $messageSent = true;
                    } else {
                        $this->bufferStatsUpdate('flows', $flowId, 'stat_total_failed');
                        $errMsg = is_string($res) ? $res : 'Unknown Error';

                        // Hard Bounce Check
                        $isBounced = checkAndHandleHardBounce($this->pdo, $subscriberId, $errMsg);
                        $bounceBehavior = $flowConfig['bounceBehavior'] ?? 'stop';

                        if ($bounceBehavior === 'continue') {
                            $logs[] = "  -> Email failed for {$subscriber['email']}, but 'Auto Next' enabled. Continuing.";
                            logActivity($this->pdo, $subscriberId, 'failed_email', $currentStepId, $flowName, "Email failed (Continued): " . $errMsg, $flowId, $campaignId);
                            $nextStepId = $step['nextStepId'] ?? null;
                            $isInstantStep = true;
                            $contextData['has_email_error'] = true;
                        } else {
                            $logs[] = "  -> Email failed for {$subscriber['email']}. Flow stopped.";
                            if ($isBounced) {
                                logActivity($this->pdo, $subscriberId, 'failed_email', $currentStepId, $flowName, "Hard Bounce: " . $errMsg, $flowId, $campaignId);
                            } else {
                                logActivity($this->pdo, $subscriberId, 'failed_email', $currentStepId, $flowName, "Email failed: " . $errMsg, $flowId, $campaignId);
                            }
                            $shouldContinueChain = false;
                            $status = 'failed';
                        }
                    }
                    break;

                case 'zalo_cs':
                    $config = $step['config'];
                    $oaConfigId = $config['zalo_oa_id'] ?? null;

                    $stmtZ = $this->pdo->prepare("SELECT zalo_user_id FROM zalo_subscribers WHERE id = ? OR zalo_user_id = ? LIMIT 1");
                    $stmtZ->execute([$subscriberId, $subscriberId]);
                    $zaloUserId = $stmtZ->fetchColumn();

                    if (!$zaloUserId || !$oaConfigId) {
                        $logs[] = "  -> Zalo CS step skipped: Missing Zalo User ID or OA config.";
                        $nextStepId = $step['nextStepId'] ?? null;
                        $isInstantStep = true;
                        break;
                    }

                    // 48h Window Check
                    $stmtLastInteract = $this->pdo->prepare("SELECT last_interaction_at FROM zalo_subscribers WHERE id = ? OR zalo_user_id = ? LIMIT 1");
                    $stmtLastInteract->execute([$subscriberId, $subscriberId]);
                    $lastInteract = $stmtLastInteract->fetchColumn();

                    // 48h window check — Zalo CS requires subscriber to have interacted within 48h
                    // [BUG-FIX] Bug #6: Previously using `$lastInteract && (time() - strtotime() > 48h)`
                    // When lastInteract=NULL (never interacted), the condition evaluated to FALSE
                    // so the code allowed sending — but Zalo API requires recent interaction.
                    // Fix: treat NULL as "no interaction" → block sending.
                    if (!$lastInteract || (time() - strtotime($lastInteract) > 48 * 3600)) {
                        $logs[] = "  -> Zalo CS step skipped: Out of 48h interaction window (last: " . ($lastInteract ?? 'never') . ").";
                        $nextStepId = $step['nextStepId'] ?? null;
                        $isInstantStep = true;
                        break;
                    }

                    // [OPTIMIZATION] Frequency Cap Check
                    $maxPerDay = (int) ($flowConfig['maxMessagesPerDay'] ?? 0);
                    $todaySent = (int) ($contextData['total_sent_today'] ?? 0);
                    if ($maxPerDay > 0 && $todaySent >= $maxPerDay) {
                        $logs[] = "  -> Frequency cap reached ($todaySent/$maxPerDay). Rescheduling Zalo to tomorrow.";
                        logActivity($this->pdo, $subscriberId, 'frequency_cap_reached', $currentStepId, $flowName, "Cap: $maxPerDay (Zalo)", $flowId);
                        $status = 'waiting';
                        $nextScheduledAt = date('Y-m-d 09:00:00', strtotime('+1 day'));
                        $shouldContinueChain = false;
                        break;
                    }

                    $finalText = replaceMergeTags($config['content'] ?? '', $subscriber, []);
                    $res = sendConsultationMessage($this->pdo, $oaConfigId, $zaloUserId, $finalText);

                    if ($res['success']) {
                        $this->bufferStatsUpdate('flows', $flowId, 'stat_zalo_sent');
                        $this->bufferStatsUpdate('flows', $flowId, 'stat_total_sent');
                        logActivity($this->pdo, $subscriberId, 'zalo_sent', $currentStepId, $flowName, 'Zalo CS Sent: ' . $step['label'], $flowId, $campaignId);
                        $logs[] = "  -> Zalo CS sent to {$zaloUserId}.";
                        $messageSent = true;
                    } else {
                        $logs[] = "  -> Zalo CS failed: " . ($res['message'] ?? 'Unknown');
                        // Fallback ZNS
                        $fallbackTemplateId = $config['fallback_zns_template_id'] ?? null;
                        // [FIX] Track if we paused for time restriction — if true, skip
                        // $nextStepId/$isInstantStep below to preserve the 'waiting' status.
                        // (Can't use break here since we're inside an if-block, not a loop/switch)
                        $zaloFallbackPaused = false;
                        if ($fallbackTemplateId && !empty($subscriber['phone_number'])) {
                            $currentHour = (int) date('H');
                            if ($currentHour < 6 || $currentHour >= 22) {
                                $logs[] = "  -> Fallback ZNS paused (Outside 06-22). Rescheduling.";
                                $nextScheduledAt = date('Y-m-d 06:00:00', strtotime($currentHour < 6 ? 'today' : '+1 day'));
                                $status = 'waiting';
                                $shouldContinueChain = false;
                                $zaloFallbackPaused = true;
                            } else {
                                $logs[] = "  -> Attempting Fallback ZNS.";
                                $templateData = [];
                                $rawTemplateData = $config['fallback_zns_data'] ?? [];
                                foreach ($rawTemplateData as $key => $value) {
                                    $templateData[$key] = is_string($value) ? replaceMergeTags($value, $subscriber, []) : $value;
                                }
                                $znsRes = sendZNSMessage($this->pdo, $oaConfigId, $fallbackTemplateId, $subscriber['phone_number'], $templateData, $flowId, $currentStepId, $subscriberId);
                                if ($znsRes['success']) {
                                    $this->bufferStatsUpdate('flows', $flowId, 'stat_zns_sent');
                                    $this->bufferStatsUpdate('flows', $flowId, 'stat_total_sent');
                                    logActivity($this->pdo, $subscriberId, 'zns_sent', $currentStepId, $flowName, 'ZNS (Fallback) Sent', $flowId, $campaignId);
                                    $logs[] = "  -> Fallback ZNS sent.";
                                    $messageSent = true;
                                } else {
                                    $logs[] = "  -> Fallback ZNS failed: " . ($znsRes['error_message'] ?? 'Unknown');
                                }
                            }
                        }
                    }
                    // [FIX] Only advance chain if we did NOT pause for time restriction.
                    // $zaloFallbackPaused=true means status='waiting' was already set above —
                    // overwriting with isInstantStep=true would cause the worker to skip the delay.
                    if (!($zaloFallbackPaused ?? false)) {
                        $nextStepId = $step['nextStepId'] ?? null;
                        $isInstantStep = true;
                    }
                    break;

                case 'zalo_zns':
                    $config = $step['config'];
                    $oaConfigId = $config['zalo_oa_id'] ?? null;
                    $templateId = $config['template_id'] ?? null;

                    if (!$oaConfigId || !$templateId) {
                        $logs[] = "  -> ZNS Skipped: Missing config.";
                        $nextStepId = $step['nextStepId'] ?? null;
                        $isInstantStep = true;
                        break;
                    }

                    $currentHour = (int) date('H');
                    if ($currentHour < 6 || $currentHour >= 22) {
                        $nextScheduledAt = date('Y-m-d 06:00:00', strtotime($currentHour < 6 ? 'today' : '+1 day'));
                        $logs[] = "  -> ZNS Rescheduled to $nextScheduledAt (Outside 06-22).";
                        $status = 'waiting';
                        $shouldContinueChain = false;
                        break;
                    }

                    $phone = $subscriber['phone_number'] ?? '';
                    $normalizedPhone = validatePhoneNumber($phone);

                    if (empty($phone) || !$normalizedPhone) {
                        $reason = empty($phone) ? 'missing_phone' : 'invalid_phone';
                        $logs[] = "  -> ZNS Skipped: $reason ($phone).";
                        logActivity($this->pdo, $subscriberId, 'zns_skipped', $currentStepId, $flowName, "ZNS Skipped: $reason", $flowId, $campaignId);
                        if (($config['fallback_behavior'] ?? 'skip') === 'mark_failed') {
                            $this->bufferStatsUpdate('flows', $flowId, 'stat_zns_failed');
                        }
                        $nextStepId = $step['nextStepId'] ?? null;
                        $isInstantStep = true;
                        break;
                    }

                    // [OPTIMIZATION] Frequency Cap Check
                    $maxPerDay = (int) ($flowConfig['maxMessagesPerDay'] ?? 0);
                    $todaySent = (int) ($contextData['total_sent_today'] ?? 0);
                    if ($maxPerDay > 0 && $todaySent >= $maxPerDay) {
                        $logs[] = "  -> Frequency cap reached ($todaySent/$maxPerDay). Rescheduling ZNS to tomorrow.";
                        logActivity($this->pdo, $subscriberId, 'frequency_cap_reached', $currentStepId, $flowName, "Cap: $maxPerDay (ZNS)", $flowId);
                        $status = 'waiting';
                        $nextScheduledAt = date('Y-m-d 09:00:00', strtotime('+1 day'));
                        $shouldContinueChain = false;
                        break;
                    }

                    $templateData = [];
                    $missingParams = [];
                    $rawData = $config['template_data'] ?? [];

                    foreach ($rawData as $key => $value) {
                        $val = is_string($value) ? replaceMergeTags($value, $subscriber, []) : $value;

                        if ($val === '') {
                            $missingParams[] = $key;
                        }

                        if (is_string($val) && filter_var($val, FILTER_VALIDATE_URL)) {
                            // [FIX] Zalo ZNS template data has strict max length per field (~200 chars)
                            // Only wrap in tracking URL if short enough; otherwise use original URL
                            $encodedUrl = urlencode($val);
                            $trackingUrl = $this->apiUrl . "/zalo_tracking.php?sub_id={$subscriberId}&flow_id={$flowId}&step_id={$currentStepId}&url={$encodedUrl}";
                            $val = (strlen($trackingUrl) <= 200) ? $trackingUrl : $val;
                        }

                        // [FIX] Truncate to 100 chars — prevents "id data breaks max length" on short ZNS fields
                        // Use mb_strlen/mb_substr to avoid cutting mid-byte on Vietnamese UTF-8 chars
                        if (is_string($val) && mb_strlen($val) > 100) {
                            $val = mb_substr($val, 0, 100);
                        }

                        $templateData[$key] = $val;
                    }

                    if (!empty($missingParams)) {
                        $logs[] = "  -> ZNS Skipped: Missing data for parameters (" . implode(', ', $missingParams) . ").";
                        logActivity($this->pdo, $subscriberId, 'zns_failed', $currentStepId, $flowName, "ZNS Failed: Missing parameters (" . implode(', ', $missingParams) . ")", $flowId, $campaignId);
                        $result = ['success' => false, 'error_message' => 'Missing parameters: ' . implode(', ', $missingParams)];
                        // Debug log
                        file_put_contents(
                            __DIR__ . '/zns_error.log',
                            date('Y-m-d H:i:s') . " [MISSING_PARAMS] Sub:{$subscriberId} Phone:{$normalizedPhone} Missing: " . implode(', ', $missingParams) .
                            " | TemplateData: " . json_encode($templateData, JSON_UNESCAPED_UNICODE) . "\n",
                            FILE_APPEND | LOCK_EX
                        );
                    } else {
                        try {
                            $result = sendZNSMessage($this->pdo, $oaConfigId, $templateId, $normalizedPhone, $templateData, $flowId, $currentStepId, $subscriberId);
                        } catch (Throwable $znsEx) {
                            // [FIX] Catch any exception from sendZNSMessage (PDO, network, etc.)
                            // to prevent it propagating to worker and causing a reschedule loop
                            $result = ['success' => false, 'error_code' => -1, 'error_message' => 'Exception: ' . $znsEx->getMessage()];
                            file_put_contents(
                                __DIR__ . '/zns_error.log',
                                date('Y-m-d H:i:s') . " [EXCEPTION] Sub:{$subscriberId} " . $znsEx->getMessage() . "\n",
                                FILE_APPEND | LOCK_EX
                            );
                        }
                    }

                    if ($result['success']) {
                        $this->bufferStatsUpdate('flows', $flowId, 'stat_zns_sent');
                        $this->bufferStatsUpdate('flows', $flowId, 'stat_total_sent');
                        logActivity($this->pdo, $subscriberId, 'zns_sent', $currentStepId, $flowName, 'ZNS Sent', $flowId, $campaignId);
                        $logs[] = "  -> ZNS Sent.";
                        $messageSent = true;
                    } else {
                        $this->bufferStatsUpdate('flows', $flowId, 'stat_zns_failed');
                        // [FIX] Normalize error keys: sendZNSMessage pre-checks return 'reason'/'message',
                        // while API errors return 'error_code'/'error_message'
                        $errCode = $result['error_code'] ?? $result['reason'] ?? $result['status'] ?? '?';
                        $errMsg = $result['error_message'] ?? $result['message'] ?? 'Unknown';
                        $errDetail = "Code:{$errCode} - {$errMsg}";
                        logActivity($this->pdo, $subscriberId, 'zns_failed', $currentStepId, $flowName, "ZNS Failed: " . $errDetail, $flowId, $campaignId);
                        $logs[] = "  -> ZNS Failed: {$errDetail}";
                        // Write debug log
                        file_put_contents(
                            __DIR__ . '/zns_error.log',
                            date('Y-m-d H:i:s') . " [ZNS_FAIL] Sub:{$subscriberId} Phone:{$normalizedPhone}" .
                            " OA:{$oaConfigId} Template:{$templateId}" .
                            " Error:{$errDetail}" .
                            " | Data: " . json_encode($templateData, JSON_UNESCAPED_UNICODE) . "\n",
                            FILE_APPEND | LOCK_EX
                        );
                    }

                    $nextStepId = $step['nextStepId'] ?? null;
                    $isInstantStep = true;
                    break;

                case 'meta_message':
                    $config = $step['config'];

                    // Resolve Connection
                    $metaConn = resolveMetaConnection($this->pdo, $subscriberId);
                    if (isset($metaConn['error'])) {
                        $logs[] = "  -> Meta Skip: " . $metaConn['error'];
                        $nextStepId = $step['nextStepId'] ?? null;
                        $isInstantStep = true;
                        break;
                    }

                    $pageId = $metaConn['page_id'];
                    $psid = $metaConn['psid'];

                    // [OPTIMIZATION] Frequency Cap Check
                    $maxPerDay = (int) ($flowConfig['maxMessagesPerDay'] ?? 0);
                    $todaySent = (int) ($contextData['total_sent_today'] ?? 0);
                    if ($maxPerDay > 0 && $todaySent >= $maxPerDay) {
                        $logs[] = "  -> Frequency cap reached ($todaySent/$maxPerDay). Rescheduling Meta to tomorrow.";
                        logActivity($this->pdo, $subscriberId, 'frequency_cap_reached', $currentStepId, $flowName, "Cap: $maxPerDay (Meta)", $flowId);
                        $status = 'waiting';
                        $nextScheduledAt = date('Y-m-d 09:00:00', strtotime('+1 day'));
                        $shouldContinueChain = false;
                        break;
                    }

                    // Prepare Content
                    $msgConfig = [];
                    if (!empty($config['content'])) {
                        $msgConfig['text'] = replaceMergeTags($config['content'], $subscriber, []);
                    }
                    if (!empty($config['attachment_url'])) {
                        $msgConfig['attachment_url'] = $config['attachment_url'];
                        $msgConfig['attachment_type'] = $config['attachment_type'] ?? 'image';
                    }

                    // Send
                    $res = sendMetaMessage($this->pdo, $pageId, $psid, $msgConfig, $flowId, $currentStepId, $subscriberId);

                    if ($res['success']) {
                        $this->bufferStatsUpdate('flows', $flowId, 'stat_total_sent');
                        // Optional: Buffer specific meta stat if column exists
                        logActivity($this->pdo, $subscriberId, 'meta_sent', $currentStepId, $flowName, 'Meta Msg Sent: ' . ($step['label'] ?? 'Message'), $flowId, $campaignId);
                        $logs[] = "  -> Meta Msg Sent.";
                        $messageSent = true;
                    } else {
                        logActivity($this->pdo, $subscriberId, 'meta_failed', $currentStepId, $flowName, "Meta Failed: " . ($res['message'] ?? ''), $flowId, $campaignId);
                        $logs[] = "  -> Meta Failed: " . ($res['message'] ?? 'Unknown');
                    }

                    $nextStepId = $step['nextStepId'] ?? null;
                    $isInstantStep = true;
                    break;

                case 'wait':
                    $nextStepId = $step['nextStepId'] ?? null;
                    $mode = trim($step['config']['mode'] ?? 'duration');
                    $isWaitOver = false;
                    $logDetail = "";
                    $scheduleNow = $contextData['now'] ?? date('Y-m-d H:i:s');

                    // [DEBUG TRACE] Only write wait debug log when DEBUG_MODE is enabled
                    // to avoid I/O bottleneck in production with many subscribers
                    if (defined('DEBUG_MODE') && DEBUG_MODE) {
                        file_put_contents(
                            __DIR__ . '/wait_debug.log',
                            date('Y-m-d H:i:s') . " [WAIT] StepId:{$currentStepId}"
                            . " SubId:{$subscriberId} FlowId:{$flowId}"
                            . " is_resumed_wait:" . json_encode($contextData['is_resumed_wait'] ?? null)
                            . " scheduled_at:" . ($contextData['scheduled_at'] ?? 'not_set')
                            . " now:{$scheduleNow}"
                            . " Caller:" . (isset($contextData['is_priority_chain']) ? 'priority' : 'flow_worker')
                            . "\n",
                            FILE_APPEND | LOCK_EX
                        );
                    }

                    // Check Resume (If scheduled time passed)
                    // Note: Caller must provide 'scheduled_at' from DB for this to work
                    $dbScheduledAt = $contextData['scheduled_at'] ?? $scheduleNow; // default to now if not set
                    $isResuming = ($dbScheduledAt <= $scheduleNow);

                    // HOWEVER: executeStep is called when we HIT the wait step.
                    // If we just hit it, we calculate delay.
                    // If we are 'processing' it (i.e. we were waiting, and now worker picked it up), then wait is over.
                    // The Worker distinguishes "New Entry" vs "Wake Up".
                    // But here we are just executing logic.
                    // Assumption: If status is 'waiting' and we are here, it means we woke up.
                    // If status is 'processing' (standard loop), we calculate wait.

                    // Actually, simpler:
                    // If $isResuming is TRUE relative to the context provided by worker:
                    if (!empty($contextData['is_resumed_wait'])) {
                        $isWaitOver = true;
                        $logDetail = "Wait Finished (Resumed)";
                    } else {
                        // Calculate Wait
                        if ($mode === 'until') {
                            $targetTime = $step['config']['untilTime'] ?? '09:00';
                            $targetDay = $step['config']['untilDay'];
                            $dt = new DateTime($scheduleNow);
                            $targetTimeParts = explode(':', $targetTime);
                            $dt->setTime((int) $targetTimeParts[0], (int) ($targetTimeParts[1] ?? 0), 0);

                            if ($targetDay !== null && $targetDay !== '') {
                                $currentDay = (int) date('w', strtotime($scheduleNow));
                                $daysToWait = ((int) $targetDay - $currentDay + 7) % 7;
                                if ($daysToWait === 0 && $dt->getTimestamp() <= time()) {
                                    $daysToWait = 7;
                                }
                                if ($daysToWait > 0)
                                    $dt->modify("+$daysToWait days");
                            } else {
                                if ($dt->getTimestamp() <= time())
                                    $dt->modify("+1 day");
                            }
                            $nextScheduledAt = $dt->format('Y-m-d H:i:s');
                            $logDetail = "Wait UNTIL $nextScheduledAt";

                        } elseif ($mode === 'until_attribute') {
                            $attrKey = $step['config']['attributeKey'] ?? 'date_of_birth';
                            $offsetValue = (int) ($step['config']['offsetValue'] ?? 0);
                            $offsetType = $step['config']['offsetType'] ?? 'before';
                            $untilTime = $step['config']['untilTime'] ?? '09:00';
                            $attrValue = $subscriber[$attrKey] ?? null;

                            if (!$attrValue || $attrValue === '0000-00-00') {
                                // Skip
                                $isWaitOver = true;
                                $logDetail = "Wait Skipped (Attributes missing)";
                            } else {
                                $dtAttr = new DateTime($attrValue);
                                $md = $dtAttr->format('m-d');
                                $targetDate = new DateTime(date('Y') . "-$md $untilTime:00");
                                if ($offsetType === 'before')
                                    $targetDate->modify("-$offsetValue days");
                                else
                                    $targetDate->modify("+$offsetValue days");

                                if ($targetDate->getTimestamp() < time() - 86400) {
                                    if ($targetDate->format('Y-m-d') < date('Y-m-d'))
                                        $targetDate->modify("+1 year");
                                }
                                $nextScheduledAt = $targetDate->format('Y-m-d H:i:s');
                                if ($targetDate->getTimestamp() <= time())
                                    $isWaitOver = true;
                                $logDetail = "Wait Attribute $nextScheduledAt";
                            }

                        } elseif ($mode === 'until_date') {
                            $specDate = $step['config']['specificDate'] ?? '';
                            $targetTime = $step['config']['untilTime'] ?? '09:00';
                            if ($specDate) {
                                $targetTs = strtotime("$specDate $targetTime:00");
                                if ($targetTs <= time())
                                    $isWaitOver = true;
                                else
                                    $nextScheduledAt = date('Y-m-d H:i:s', $targetTs);
                                $logDetail = "Wait Date $nextScheduledAt";
                            } else {
                                $isWaitOver = true;
                                $logDetail = "Wait Skipped (No Date)";
                            }
                        } else {
                            // Duration
                            $dur = (int) ($step['config']['duration'] ?? 1);
                            $unit = $step['config']['unit'] ?? 'hours';
                            // [FIX] Use $scheduleNow (from $contextData['now']) for consistency
                            // with other wait modes. 'new DateTime()' uses PHP runtime which
                            // may drift if worker runs for a long time.
                            $dt = new DateTime($scheduleNow);
                            $dt->modify("+$dur $unit");
                            $nextScheduledAt = $dt->format('Y-m-d H:i:s');
                            $logDetail = "Wait Duration $dur $unit";
                        }
                    }

                    if ($isWaitOver) {
                        $logs[] = "  -> Step '{$step['label']}' Wait complete ($logDetail).";
                        $isInstantStep = true;
                        $status = 'completed'; // Proceed
                        logActivity($this->pdo, $subscriberId, 'wait_processed', $currentStepId, $flowName, "$logDetail (Completed)", $flowId);
                    } else {
                        $logs[] = "  -> Step '{$step['label']}' waiting until $nextScheduledAt.";
                        $status = 'waiting';
                        $shouldContinueChain = false;
                    }
                    break;

                case 'condition':
                    $condType = $step['config']['conditionType'] ?? 'opened';
                    $waitDur = (int) ($step['config']['waitDuration'] ?? 1);
                    $waitUnit = $step['config']['waitUnit'] ?? 'hours';

                    // [FIX] Tìm campaignId từ bước Trigger trong danh sách các bước (steps)
                    $linkedCampaignId = null;
                    foreach ($flowSteps as $fs) {
                        if ($fs['type'] === 'trigger' && ($fs['config']['type'] ?? '') === 'campaign') {
                            // Cấu hình lưu trong targetId hoặc campaignId
                            $linkedCampaignId = $fs['config']['targetId'] ?? ($fs['config']['campaignId'] ?? null);
                            break;
                        }
                    }

                    // Timeout Calculation
                    $startTime = !empty($lastStepAt) ? $lastStepAt : (!empty($itemUpdatedAt) ? $itemUpdatedAt : $queueCreatedAt);
                    // [FIX] Guard against empty string or MySQL zero-date ("0000-00-00 00:00:00")
                    // from DB. Passing either into new DateTime() throws an uncatchable Fatal Error:
                    // "Failed to parse time string" — crashing the entire worker process.
                    if (empty($startTime) || strpos($startTime, '0000-00-00') !== false) {
                        $startTime = 'now';
                    }
                    $timeout = new DateTime($startTime);
                    $timeout->modify("+$waitDur $waitUnit");
                    $isTimedOut = new DateTime('now') > $timeout;

                    // Forced Fail on Email Error
                    if ($hasEmailError && in_array($condType, ['opened', 'clicked'])) {
                        $logs[] = "  -> Condition forced NO due to email error.";
                        $nextStepId = $step['noStepId'] ?? null;
                        $isInstantStep = true;
                        logActivity($this->pdo, $subscriberId, 'condition_false', $currentStepId, $flowName, "Forced FALSE (Email Error)", $flowId);
                        break;
                    }

                    $isMatched = false;
                    // Resolve Reference (Campaign vs Step)
                    $targetStepId = $step['config']['targetStepId'] ?? null;

                    // Determine Types
                    $types = [];
                    if ($condType === 'opened')
                        $types = ['open_email', 'open_zns'];
                    elseif ($condType === 'clicked')
                        $types = ['click_link', 'click_zns'];
                    elseif ($condType === 'unsubscribed')
                        $types = ['unsubscribe'];
                    // [FIX] ZNS-specific condition types
                    elseif ($condType === 'zns_delivered')
                        $types = ['zns_sent'];
                    elseif ($condType === 'zns_clicked')
                        $types = ['click_zns'];
                    elseif ($condType === 'zns_replied')
                        $types = ['reply_zns'];
                    elseif ($condType === 'zns_failed')
                        $types = ['zns_failed'];
                    // [FIX] Email delivered = receive_email
                    elseif ($condType === 'delivered')
                        $types = ['receive_email'];
                    // [FIX] Reminder conditions — check subscriber_activity for reminder events
                    elseif ($condType === 'received_reminder') {
                        $types = ['receive_email']; // receive_email logged when reminder is sent
                    } elseif ($condType === 'opened_reminder') {
                        $types = ['open_email']; // open_email logged when reminder is opened
                    }

                    // reminderId from frontend config — if set, filter activities to this specific reminder campaign
                    $reminderId = $step['config']['reminderId'] ?? null;

                    // [FIX] 'unsubscribe' is a global event — NOT scoped to flow_id.
                    // Reminder conditions are also global but can be scoped by reminderId (campaign_id).
                    $isGlobalEvent = in_array($condType, ['unsubscribed', 'received_reminder', 'opened_reminder']);

                    if (empty($types)) {
                        $activities = [];
                    } elseif (isset($contextData['activity_cache'])) {
                        $cachedActivities = $contextData['activity_cache'];
                        $activities = [];
                        foreach ($cachedActivities as $act) {
                            if (in_array($act['type'], $types)) {
                                // [FIX] Global events (unsubscribe) have no flow_id — always include them
                                if ($isGlobalEvent) {
                                    // For reminder conditions: filter by reminderId (campaign_id) if provided
                                    if (($condType === 'received_reminder' || $condType === 'opened_reminder') && !empty($reminderId)) {
                                        if ((string) ($act['campaign_id'] ?? '') === (string) $reminderId) {
                                            $activities[] = $act;
                                        }
                                    } else {
                                        $activities[] = $act;
                                    }
                                    continue;
                                }
                                // Apply linkedCampaignId and targetStepId filtering to cached activities
                                $isFromTarget = false;
                                if ($linkedCampaignId && !empty($act['campaign_id']) && (string) $act['campaign_id'] === (string) $linkedCampaignId) {
                                    $isFromTarget = true;
                                } elseif ($targetStepId && trim($act['reference_id'] ?? '') === trim($targetStepId)) {
                                    $isFromTarget = true;
                                } elseif (!$targetStepId) {
                                    $isFromTarget = true;
                                }

                                if ($isFromTarget) {
                                    $activities[] = $act;
                                }
                            }
                        }
                    } else {
                        $sqlCheck = "SELECT id, type, details, reference_id, campaign_id FROM subscriber_activity WHERE subscriber_id = ?";
                        $params = [$subscriberId];
                        $placeholders = implode(',', array_fill(0, count($types), '?'));
                        $sqlCheck .= " AND type IN ($placeholders)";
                        foreach ($types as $t)
                            $params[] = $t;

                        // [FIX] 'unsubscribe' is global — do NOT filter by flow_id
                        // For reminder conditions: optionally filter by reminderId (campaign_id)
                        if (!$isGlobalEvent) {
                            if ($linkedCampaignId) {
                                $sqlCheck .= " AND (flow_id = ? OR campaign_id = ?) ";
                                $params[] = $flowId;
                                $params[] = $linkedCampaignId;
                            } else {
                                $sqlCheck .= " AND flow_id = ? ";
                                $params[] = $flowId;
                            }
                        } elseif (($condType === 'received_reminder' || $condType === 'opened_reminder') && !empty($reminderId)) {
                            // Scope reminder to specific campaign
                            $sqlCheck .= " AND campaign_id = ?";
                            $params[] = $reminderId;
                        }

                        $sqlCheck .= " ORDER BY created_at DESC LIMIT 50";

                        $stmtAct = $this->pdo->prepare($sqlCheck);
                        $stmtAct->execute($params);
                        $activities = $stmtAct->fetchAll();
                    }

                    if (!empty($types)) {
                        foreach ($activities as $act) {
                            if (!in_array($act['type'], $types))
                                continue;

                            // [SMART MATCH] Phân loại đối soát: Trigger vs Step cụ thể
                            $isFromTarget = false;

                            // 0. Kiểm tra xem bước đích có phải là Trigger không
                            $isTargetingTrigger = false;
                            if ($targetStepId) {
                                foreach ($flowSteps as $fs) {
                                    if ($fs['id'] === $targetStepId && $fs['type'] === 'trigger') {
                                        $isTargetingTrigger = true;
                                        break;
                                    }
                                }
                            }

                            // 1. Trường hợp chờ đợi kết quả từ Trigger Campaign (Trường hợp của anh hiện tại)
                            if ($isTargetingTrigger && $linkedCampaignId && !empty($act['campaign_id']) && (string) $act['campaign_id'] === (string) $linkedCampaignId) {
                                $isFromTarget = true;
                            }
                            // 2. Trường hợp chờ đợi một bước Gửi Mail cụ thể TRONG Flow
                            // (Ví dụ: Bước 2 Gửi Mail -> Bước 3 Kiểm tra Mail bước 2)
                            elseif ($targetStepId && trim($act['reference_id'] ?? '') === trim($targetStepId)) {
                                $isFromTarget = true;
                            }
                            // 3. Nếu không chỉ định đích đến, chấp nhận mọi hoạt động thuộc Flow này 
                            elseif (!$targetStepId) {
                                $isFromTarget = true;
                            }

                            if (!$isFromTarget)
                                continue;

                            if ($condType === 'clicked') {
                                $linkTargets = $step['config']['linkTargets'] ?? [];
                                if (!is_array($linkTargets) && !empty($step['config']['linkTarget']))
                                    $linkTargets = [$step['config']['linkTarget']];

                                if (empty($linkTargets)) {
                                    $isMatched = true;
                                    break;
                                } else {
                                    $rawDetail = $act['details'] ?? '';
                                    $clickedUrl = str_replace(["Click link: ", "Clicked link: ", "Clicked link (+5 điểm): "], "", $rawDetail);

                                    // [FIX #4] Old logic used strtok($u, '?') to strip ALL query strings,
                                    // causing links like ?ref=email to NEVER match the configured target.
                                    // New logic: normalize path only (strip protocol + trailing slash),
                                    // then use stripos to allow partial/substring URL matching.
                                    // This means: target 'example.com/page' matches 'example.com/page?utm_source=flow'
                                    $normalizeUrlBase = function ($u) {
                                        // Remove protocol
                                        $u = preg_replace('/^https?:\/\//', '', trim($u));
                                        // Remove trailing slash
                                        return rtrim($u, '/');
                                    };

                                    $normClicked = $normalizeUrlBase($clickedUrl);

                                    foreach ($linkTargets as $target) {
                                        $normTarget = $normalizeUrlBase($target);
                                        // Exact match OR clicked URL starts with/contains the target base
                                        if ($normTarget !== '' && mb_stripos($normClicked, $normTarget, 0, 'UTF-8') !== false) {
                                            $isMatched = true;
                                            break 2;
                                        }
                                    }
                                }
                            } else {
                                $isMatched = true;
                                break;
                            }
                        }
                    }

                    if ($isMatched) {
                        $nextStepId = $step['yesStepId'] ?? null;
                        logActivity($this->pdo, $subscriberId, 'condition_true', $currentStepId, $flowName, "Matched: $condType", $flowId);
                        $logs[] = "  -> Condition Matched!";
                        $isInstantStep = true;
                    } elseif ($isTimedOut) {
                        $nextStepId = $step['noStepId'] ?? null;
                        logActivity($this->pdo, $subscriberId, 'condition_false', $currentStepId, $flowName, "Timed Out: $condType", $flowId);
                        $logs[] = "  -> Condition Timed Out. Moving to ELSE.";
                        $isInstantStep = true;
                    } else {
                        // CHƯA KHỚP VÀ CHƯA HẾT GIỜ -> TIẾP TỤC ĐỢI
                        $logs[] = "  -> Condition not met yet. Still waiting...";
                        $status = 'waiting';
                        $shouldContinueChain = false;
                        // [FIX] T\u0103ng t\u1eeb 5 ph\u00fat l\u00ean 15 ph\u00fat \u2014 gi\u1ea3m t\u1ea3i worker khi c\u00f3 nhi\u1ec1u subscriber ch\u1edd condition
                        $nextScheduledAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));
                    }
                    break;

                case 'advanced_condition':
                    require_once 'flow_helpers.php';
                    // Ensure helper is available for evaluateAdvancedConditionGroup

                    $branches = $step['config']['branches'] ?? [];
                    $defaultStepId = $step['config']['defaultStepId'] ?? null;
                    $matchedStepId = null;
                    $matchLabel = "Fallback";

                    $subProfile = null;
                    if (isset(self::$profileCache[$subscriberId])) {
                        $subProfile = self::$profileCache[$subscriberId];
                    } else {
                        $subProfile = getSubscriberProfileForFlow($this->pdo, $subscriberId);
                        self::$profileCache[$subscriberId] = $subProfile;
                    }

                    foreach ($branches as $branch) {
                        $conditions = $branch['conditions'] ?? [];
                        // [FIX] Empty conditions branch should NOT auto-match.
                        // Previously: empty($conditions) would cause every branch without
                        // conditions to match instantly, bypassing all other branches.
                        // Now: only branches with at least 1 condition AND all conditions true will match.
                        if (!empty($conditions) && evaluateAdvancedConditionGroup($this->pdo, $subscriberId, $subProfile, $conditions)) {
                            $matchedStepId = $branch['stepId'];
                            $matchLabel = $branch['label'];
                            break;
                        }
                    }

                    $nextStepId = $matchedStepId ?: $defaultStepId;
                    logActivity($this->pdo, $subscriberId, 'advanced_condition', $currentStepId, $flowName, "Matched: $matchLabel", $flowId);
                    $logs[] = "  -> Advanced Cond: $matchLabel";
                    $isInstantStep = true;
                    break;

                case 'split_test':
                    $ratioA = (int) ($step['config']['ratioA'] ?? 50);
                    $hash = hexdec(substr(md5($subscriberId . $currentStepId), 0, 8));
                    $isPathA = (($hash % 100) < $ratioA);
                    $nextStepId = $isPathA ? ($step['pathAStepId'] ?? null) : ($step['pathBStepId'] ?? null);

                    logActivity($this->pdo, $subscriberId, $isPathA ? 'ab_test_a' : 'ab_test_b', $currentStepId, $flowName, "Split Test: " . ($isPathA ? 'A' : 'B'), $flowId, $campaignId, ['variation' => $isPathA ? 'A' : 'B']);
                    $logs[] = "  -> Split Test: " . ($isPathA ? 'Path A' : 'Path B');
                    $isInstantStep = true;
                    break;

                case 'update_tag':
                    $tags = $step['config']['tags'] ?? [];
                    $action = $step['config']['action'] ?? 'add';
                    foreach ($tags as $tagName) {
                        $tagId = null;
                        if (isset(self::$tagCache[$tagName])) {
                            $tagId = self::$tagCache[$tagName];
                        } else {
                            $stmtT = $this->pdo->prepare("SELECT id FROM tags WHERE name = ? LIMIT 1");
                            $stmtT->execute([$tagName]);
                            $tagId = $stmtT->fetchColumn();

                            // [FIX] tags.id is VARCHAR using uniqid(), NOT auto-increment.
                            // The original INSERT omitted the `id` column entirely.
                            // MySQL strict mode ('NO_DEFAULT_VALUE') throws:
                            // "Field 'id' doesn't have a default value" — crashing the flow.
                            if (!$tagId) {
                                $newTagId = uniqid();
                                $stmtCreate = $this->pdo->prepare("INSERT IGNORE INTO tags (id, name, created_at) VALUES (?, ?, NOW())");
                                $stmtCreate->execute([$newTagId, $tagName]);
                                $tagId = $this->pdo->lastInsertId() ?: $newTagId;
                                // Try fetching once more in case of race condition (INSERT IGNORE with duplicate name)
                                if (!$tagId) {
                                    $stmtT->execute([$tagName]);
                                    $tagId = $stmtT->fetchColumn();
                                }
                            }
                            self::$tagCache[$tagName] = $tagId;
                        }

                        if (!$tagId)
                            continue;

                        if ($action === 'remove') {
                            $this->pdo->prepare("DELETE FROM subscriber_tags WHERE subscriber_id = ? AND tag_id = ?")->execute([$subscriberId, $tagId]);
                        } else {
                            $stmtIn = $this->pdo->prepare("INSERT IGNORE INTO subscriber_tags (subscriber_id, tag_id) VALUES (?, ?)");
                            $stmtIn->execute([$subscriberId, $tagId]);
                            if ($stmtIn->rowCount() > 0) {
                                dispatchFlowWorker($this->pdo, 'flows', ['trigger_type' => 'tag', 'target_id' => $tagName, 'subscriber_id' => $subscriberId]);
                            }
                        }
                    }
                    logActivity($this->pdo, $subscriberId, 'update_tag', $currentStepId, $flowName, "Tags $action: " . implode(',', $tags), $flowId);
                    $logs[] = "  -> Tags updated.";
                    $nextStepId = $step['nextStepId'] ?? null;
                    $isInstantStep = true;
                    break;

                case 'list_action':
                    $lid = $step['config']['listId'] ?? '';
                    $action = $step['config']['action'] ?? 'add';
                    if ($lid) {
                        if ($action === 'add') {
                            $stmtL = $this->pdo->prepare("INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)");
                            $stmtL->execute([$subscriberId, $lid]);
                            if ($stmtL->rowCount() > 0) {
                                enrollSubscribersBulk($this->pdo, [$subscriberId], 'list', $lid);
                            }
                        } else {
                            $this->pdo->prepare("DELETE FROM subscriber_lists WHERE subscriber_id = ? AND list_id = ?")->execute([$subscriberId, $lid]);
                        }
                        logActivity($this->pdo, $subscriberId, 'list_action', $currentStepId, "List Action", "$action list $lid", $flowId);
                        $logs[] = "  -> List action done.";
                    }
                    $nextStepId = $step['nextStepId'] ?? null;
                    $isInstantStep = true;
                    break;

                case 'remove_action':
                    $aType = $step['config']['actionType'] ?? '';
                    if ($aType === 'unsubscribe') {
                        $this->pdo->prepare("UPDATE subscribers SET status='unsubscribed' WHERE id=?")->execute([$subscriberId]);
                        logActivity($this->pdo, $subscriberId, 'unsubscribe', $currentStepId, $flowName, "Unsubscribed via flow", $flowId);
                    } elseif ($aType === 'delete_contact') {
                        // [FIX] Log BEFORE delete — logActivity would fail (FK/orphan) if run after DELETE
                        logActivity($this->pdo, $subscriberId, 'delete_contact', $currentStepId, $flowName, "Deleted via flow", $flowId);
                        // Delete all related records to prevent orphan data
                        $this->pdo->prepare("DELETE FROM subscriber_lists WHERE subscriber_id=?")->execute([$subscriberId]);
                        $this->pdo->prepare("DELETE FROM subscriber_tags WHERE subscriber_id=?")->execute([$subscriberId]);
                        $this->pdo->prepare("DELETE FROM subscriber_flow_states WHERE subscriber_id=?")->execute([$subscriberId]);
                        $this->pdo->prepare("DELETE FROM subscriber_activity WHERE subscriber_id=?")->execute([$subscriberId]);
                        $this->pdo->prepare("DELETE FROM subscribers WHERE id=?")->execute([$subscriberId]);
                    }
                    $this->bufferStatsUpdate('flows', $flowId, 'stat_completed');
                    $shouldContinueChain = false;
                    $status = 'completed';
                    $logs[] = "  -> Remove action executed ($aType). Flow complete.";
                    break;

                case 'link_flow':
                    $linkedId = $step['config']['linkedFlowId'] ?? '';
                    if ($linkedId) {
                        // Get linked flow config + steps
                        $stmtLF = $this->pdo->prepare("SELECT steps, config FROM flows WHERE id = ? AND status='active'");
                        $stmtLF->execute([$linkedId]);
                        $lRow = $stmtLF->fetch();
                        if ($lRow) {
                            $lSteps = json_decode($lRow['steps'], true) ?: [];
                            $lConfig = json_decode($lRow['config'], true) ?: [];
                            $lFrequency = $lConfig['frequency'] ?? 'one-time';
                            $lCooldownHours = (int) ($lConfig['enrollmentCooldownHours'] ?? 12);
                            $lStart = null;
                            foreach ($lSteps as $s) {
                                if ($s['type'] === 'trigger') {
                                    $lStart = $s['nextStepId'] ?? null;
                                    break;
                                }
                            }

                            if ($lStart) {
                                // [FIX #6] Respect frequency setting of the linked flow
                                // Previously: INSERT IGNORE only prevented exact duplicate rows,
                                // but one-time flows could be re-enrolled if the previous state was 'completed'.
                                $canEnroll = false;
                                if ($lFrequency === 'one-time') {
                                    // One-time: only enroll if NEVER been in this flow before
                                    $stmtCheck = $this->pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ?");
                                    $stmtCheck->execute([$subscriberId, $linkedId]);
                                    $canEnroll = ($stmtCheck->fetchColumn() == 0);
                                } else {
                                    // Recurring: block if currently active or within cooldown
                                    $stmtCheck = $this->pdo->prepare(
                                        "SELECT COUNT(*) FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ?
                                         AND (status IN ('waiting', 'processing') OR updated_at > DATE_SUB(NOW(), INTERVAL ? HOUR))"
                                    );
                                    $stmtCheck->execute([$subscriberId, $linkedId, $lCooldownHours]);
                                    $canEnroll = ($stmtCheck->fetchColumn() == 0);
                                }

                                if ($canEnroll) {
                                    $this->pdo->prepare(
                                        "INSERT INTO subscriber_flow_states (subscriber_id, flow_id, step_id, scheduled_at, status, created_at, updated_at, last_step_at)
                                         VALUES (?, ?, ?, NOW(), 'processing', NOW(), NOW(), NOW())"
                                    )->execute([$subscriberId, $linkedId, $lStart]);
                                    $newQ = $this->pdo->lastInsertId();
                                    if ($newQ) {
                                        dispatchFlowWorker($this->pdo, 'flows', ['priority_queue_id' => $newQ, 'subscriber_id' => $subscriberId, 'priority_flow_id' => $linkedId]);
                                        logActivity($this->pdo, $subscriberId, 'enter_flow', $linkedId, "Linked Flow", "Linked to $linkedId", $linkedId);
                                        $logs[] = "  -> Linked to flow $linkedId.";
                                        // [FIX] Only count stat_completed when link actually succeeded
                                        $this->bufferStatsUpdate('flows', $flowId, 'stat_completed');
                                    }
                                } else {
                                    $logs[] = "  -> Link Flow skipped: Subscriber already enrolled or in cooldown for flow $linkedId.";
                                }
                            }
                        }
                    }
                    $this->bufferStatsUpdate('flows', $flowId, 'stat_completed');
                    $shouldContinueChain = false;
                    $status = 'completed';
                    break;

                default:
                    $logs[] = "  -> Unknown step type: {$step['type']}";
                    $nextStepId = $step['nextStepId'] ?? null;
                    $isInstantStep = true;
                    break;
            }

        } catch (Throwable $e) {
            $status = 'failed';
            $shouldContinueChain = false;
            $logs[] = "  -> Exception in step: " . $e->getMessage();
        }

        return [
            'status' => $status,
            'next_step_id' => $nextStepId,
            'is_instant' => $isInstantStep,
            'scheduled_at' => $nextScheduledAt,
            'logs' => $logs,
            'should_continue' => $shouldContinueChain,
            'message_sent' => $messageSent,
            'context_updates' => $contextData // Pass back any context changes (e.g. email error flagged)
        ];
    }
}
