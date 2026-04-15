<?php
function triggerFlows($pdo, $subscriberId, $triggerType, $targetValue)
{
    // For single subscriber triggers, use the priority worker for instant execution and chaining
    $workerParams = http_build_query([
        'subscriber_id' => $subscriberId,
        'trigger_type' => $triggerType,
        'target_id' => $targetValue
    ]);

    // [OPTIMIZED] Use centralized WorkerTriggerService
    require_once __DIR__ . '/WorkerTriggerService.php';
    $triggerService = new WorkerTriggerService($pdo, API_BASE_URL);
    $triggerService->trigger('/worker_priority.php?' . $workerParams);

    return 1;
}

/**
 * HIGH PERFORMANCE BULK ENROLLMENT
 * Replaces individual CURL triggers with set-based SQL and single worker trigger.
 */
function enrollSubscribersBulk($pdo, array $subscriberIds, $triggerType, $targetValue)
{
    if (empty($subscriberIds))
        return 0;

    // 1. Find matching flows using the optimized trigger_type column
    // We also include 'segment' as a fallback because some 'list' triggers are stored as segment type with list subtype
    $sqlFlows = "SELECT id, name, steps, config FROM flows WHERE status = 'active' AND (trigger_type = ? OR trigger_type = 'segment')";
    $stmtFlows = $pdo->prepare($sqlFlows);
    $stmtFlows->execute([$triggerType]);
    $flows = $stmtFlows->fetchAll();

    $enrolledTotal = 0;
    foreach ($flows as $flow) {
        $steps = json_decode($flow['steps'], true) ?: [];
        $fConfig = json_decode($flow['config'], true) ?: [];
        $frequency = $fConfig['frequency'] ?? 'one-time';
        $allowMultiple = !empty($fConfig['allowMultiple']);
        $maxEnrollments = (int) ($fConfig['maxEnrollments'] ?? 0);
        $cooldownHours = (int) ($fConfig['enrollmentCooldownHours'] ?? 12);

        $trigger = null;
        foreach ($steps as $s)
            if ($s['type'] === 'trigger')
                $trigger = $s;

        if (!$trigger || !isset($trigger['nextStepId']))
            continue;

        $tConfig = $trigger['config'] ?? [];
        $flowTriggerType = $tConfig['type'] ?? 'segment';
        $flowTargetSubtype = $tConfig['targetSubtype'] ?? ''; // Added to check subtype
        $flowTargetId = $tConfig['targetId'] ?? '';

        // Match "list" or "added_to_list" trigger against flows that are technically "segment" type but "list" subtype
        $isMatch = false;
        if ($flowTriggerType === $triggerType) {
            $isMatch = true;
        } elseif (($triggerType === 'list' || $triggerType === 'added_to_list') && $flowTriggerType === 'segment' && $flowTargetSubtype === 'list') {
            $isMatch = true;
        }

        // Target Matching Logic
        $targetMatched = ($flowTargetId == $targetValue || empty($flowTargetId) || $flowTargetId === 'all');

        // SPECIAL CASE: Inbound Message Keyword Logic
        if ($isMatch && $triggerType === 'inbound_message' && !empty($flowTargetId) && $flowTargetId !== 'all') {
            $keywords = array_map('trim', explode(',', mb_strtolower($flowTargetId, 'UTF-8')));
            $msgLower = mb_strtolower($targetValue, 'UTF-8');
            $kwFound = false;
            foreach ($keywords as $kw) {
                // [FIX] Use mb_stripos for proper Vietnamese Unicode case-insensitive matching
                if ($kw !== '' && mb_stripos($msgLower, $kw, 0, 'UTF-8') !== false) {
                    $kwFound = true;
                    break;
                }
            }
            $targetMatched = $kwFound;
        }

        if ($isMatch && $targetMatched) {
            $pastTime = date('Y-m-d H:i:s', strtotime('-1 second'));
            $initialSchedule = $pastTime;

            // [SMART SCHEDULE FIX] 
            // If the first step is a wait, we MUST pre-calculate the future wait time.
            // If we don't, it gets inserted as "pastTime", the worker picks it up immediately,
            // thinks the wait has already passed (is_resumed_wait=TRUE), and SKIPS the wait step!
            foreach ($steps as $fs) {
                if ($fs['id'] === $trigger['nextStepId'] && strtolower($fs['type'] ?? '') === 'wait') {
                    $fsWaitConfig = $fs['config'] ?? [];
                    $fsWaitMode = $fsWaitConfig['mode'] ?? 'duration';
                    if ($fsWaitMode === 'duration') {
                        $dur = (int) ($fsWaitConfig['duration'] ?? 0);
                        $unit = $fsWaitConfig['unit'] ?? 'minutes';
                        $unitSeconds = match ($unit) {
                            'weeks' => 604800,
                            'days' => 86400,
                            'hours' => 3600,
                            default => 60,
                        };
                        $delay = $unitSeconds * $dur;
                        if ($delay > 0) {
                            $initialSchedule = date('Y-m-d H:i:s', time() + $delay);
                        }
                    } elseif ($fsWaitMode === 'until_date') {
                        $specDate   = $fsWaitConfig['specificDate'] ?? '';
                        $targetTime = $fsWaitConfig['untilTime'] ?? '09:00';
                        if ($specDate) {
                            $targetTs = strtotime("$specDate $targetTime:00");
                            if ($targetTs > time()) {
                                $initialSchedule = date('Y-m-d H:i:s', $targetTs);
                            }
                        }
                    } elseif ($fsWaitMode === 'until') {
                        $targetTime = $fsWaitConfig['untilTime'] ?? '09:00';
                        $dt = new DateTime();
                        $parts2 = explode(':', $targetTime);
                        $dt->setTime((int)$parts2[0], (int)($parts2[1] ?? 0), 0);
                        if ($dt->getTimestamp() <= time()) $dt->modify('+1 day');
                        $initialSchedule = $dt->format('Y-m-d H:i:s');
                    }
                    break;
                }
            }

            // ATOMIC INSERT SELECT: Prevents duplicates based on frequency and status
            $existsCheckSql = "";
            if ($frequency === 'one-time') {
                $existsCheckSql = "AND NOT EXISTS (SELECT 1 FROM subscriber_flow_states sfs WHERE sfs.subscriber_id = s.id AND sfs.flow_id = ?)";
            } else {
                // RECURRING / CONTINUOUS LOGIC
                $checks = [];
                // 1. Max Enrollments
                if ($maxEnrollments > 0) {
                    $checks[] = "(SELECT COUNT(*) FROM subscriber_flow_states sfs WHERE sfs.subscriber_id = s.id AND sfs.flow_id = ?) < $maxEnrollments";
                }

                // 2. State Check
                if ($allowMultiple) {
                    // Continuous (No Cooldown, No Parallel)
                    $checks[] = "NOT EXISTS (SELECT 1 FROM subscriber_flow_states sfs WHERE sfs.subscriber_id = s.id AND sfs.flow_id = ? AND sfs.status IN ('waiting', 'processing'))";
                } else {
                    // Recurring (Standard)
                    $checks[] = "NOT EXISTS (
                        SELECT 1 FROM subscriber_flow_states sfs 
                        WHERE sfs.subscriber_id = s.id 
                        AND sfs.flow_id = ? 
                        AND (sfs.status IN ('waiting', 'processing') OR sfs.updated_at > DATE_SUB(NOW(), INTERVAL $cooldownHours HOUR))
                    )";
                }
                $existsCheckSql = "AND " . implode(" AND ", $checks);
            }

            $checkParams = [];
            if ($frequency === 'one-time') {
                $checkParams[] = $flow['id'];
            } else {
                if ($maxEnrollments > 0)
                    $checkParams[] = $flow['id'];
                $checkParams[] = $flow['id'];
            }

            // [FIX] CHUNKED INSERT to avoid MySQL 65,535 placeholder limit crash.
            // When bulk_operations.php fetches 100k IDs and passes them here, a single
            // IN($placeholders) would exceed the PDO placeholder cap and crash.
            // Chunk at 500 and accumulate enrolled count from each batch.
            $ENROLL_CHUNK = 500;
            foreach (array_chunk($subscriberIds, $ENROLL_CHUNK) as $chunk) {
                $placeholders = implode(',', array_fill(0, count($chunk), '?'));

                $sqlIns = "INSERT INTO subscriber_flow_states (subscriber_id, flow_id, step_id, scheduled_at, status, created_at, updated_at, last_step_at)
                           SELECT s.id, ?, ?, ?, 'waiting', NOW(), NOW(), NOW()
                           FROM subscribers s
                           WHERE s.id IN ($placeholders)
                           AND s.status IN ('active', 'lead', 'customer')
                           $existsCheckSql";

                $params = array_merge([$flow['id'], $trigger['nextStepId'], $initialSchedule], $chunk, $checkParams);
                $stmt = $pdo->prepare($sqlIns);
                $stmt->execute($params);
                $enrolledTotal += $stmt->rowCount();
            }

            $enrolledCount = $enrolledTotal; // for stat update below
            if ($enrolledCount > 0) {
                $pdo->prepare("UPDATE flows SET stat_enrolled = stat_enrolled + ? WHERE id = ?")->execute([$enrolledCount, $flow['id']]);
            }
        }
    }

    // 2. Trigger worker via Job Queue (10M UPGRADE)
    dispatchQueueJob($pdo, 'flows', ['mode' => 'batch']);

    return $enrolledTotal;
}

function checkDynamicTriggers($pdo, $subscriberId)
{
    require_once 'segment_helper.php';

    // 1. Get Active Flows with Segment or Date triggers
    // [BUG-FIX #13] Added trigger_type filter — previously scanned ALL active flows (including
    // form/tag/list/campaign triggers) that can never match here. This causes O(all_flows) N+1
    // query overhead on every subscriber event (Zalo follow, form submit, etc.).
    $stmtFlows = $pdo->prepare("SELECT id, name, steps, config FROM flows WHERE status = 'active' AND trigger_type IN ('segment', 'date')");
    $stmtFlows->execute();
    $flows = $stmtFlows->fetchAll();

    foreach ($flows as $flow) {
        $steps = json_decode($flow['steps'], true) ?: [];
        $trigger = null;
        foreach ($steps as $s)
            if ($s['type'] === 'trigger')
                $trigger = $s;

        if (!$trigger)
            continue;
        $tType = $trigger['config']['type'] ?? '';
        $tTargetId = $trigger['config']['targetId'] ?? '';

        // A. Segment Trigger
        if ($tType === 'segment') {
            $stmtSeg = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
            $stmtSeg->execute([$tTargetId]);
            $criteriaJson = $stmtSeg->fetchColumn();

            if ($criteriaJson) {
                $segRes = buildSegmentWhereClause($criteriaJson, $tTargetId);
                // Check if THIS subscriber matches criteria
                $sql = "SELECT 1 FROM subscribers s WHERE s.id = ? AND " . $segRes['sql'] . " LIMIT 1";
                $params = array_merge([$subscriberId], $segRes['params']);
                $stmtCheck = $pdo->prepare($sql);
                $stmtCheck->execute($params);
                if ($stmtCheck->fetch()) {
                    enrollSubscribersBulk($pdo, [$subscriberId], 'segment', $tTargetId);
                }
            }
        }
        // B. Date Trigger (Birthday, Anniversary)
        else if ($tType === 'date') {
            $field = $trigger['config']['dateField'] ?? 'dateOfBirth';
            if ($field === 'dateOfBirth' || $field === 'anniversaryDate' || $field === 'joinedAt') {
                $dbField = 'date_of_birth';
                if ($field === 'anniversaryDate')
                    $dbField = 'anniversary_date';
                if ($field === 'joinedAt')
                    $dbField = 'joined_at';

                $offsetType = $trigger['config']['offsetType'] ?? 'on';
                $offsetValue = (int) ($trigger['config']['offsetValue'] ?? 0);
                $triggerHour = (int) ($trigger['config']['triggerHour'] ?? 8);
                $triggerMin = (int) ($trigger['config']['triggerMinute'] ?? 0);

                // ✅ Check hour:minute window (±5 min)
                $nowTotal = (int) date('H') * 60 + (int) date('i');
                $targetTotal = $triggerHour * 60 + $triggerMin;
                if (abs($nowTotal - $targetTotal) > 5)
                    continue;

                $targetDateExpr = "NOW()";
                if ($offsetType === 'before')
                    $targetDateExpr = "DATE_ADD(NOW(), INTERVAL $offsetValue DAY)";
                if ($offsetType === 'after')
                    $targetDateExpr = "DATE_SUB(NOW(), INTERVAL $offsetValue DAY)";

                $sql = "SELECT 1 FROM subscribers s WHERE s.id = ? AND DATE_FORMAT(s.$dbField, '%m-%d') = DATE_FORMAT($targetDateExpr, '%m-%d')";

                $targetMode = $trigger['config']['targetLists'] ?? 'all';
                $targetListIds = $trigger['config']['targetListIds'] ?? [];
                $targetSegmentIds = $trigger['config']['targetSegmentIds'] ?? [];

                $params = [$subscriberId];
                if ($targetMode === 'specific') {
                    $sourceConditions = [];
                    if (!empty($targetListIds)) {
                        $phl = implode(',', array_fill(0, count($targetListIds), '?'));
                        $sourceConditions[] = "s.id IN (SELECT subscriber_id FROM subscriber_lists WHERE list_id IN ($phl))";
                        $params = array_merge($params, $targetListIds);
                    }
                    if (!empty($targetSegmentIds)) {
                        foreach ($targetSegmentIds as $segId) {
                            $stmtSeg2 = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
                            $stmtSeg2->execute([$segId]);
                            $segConfig = $stmtSeg2->fetchColumn();
                            if ($segConfig) {
                                $segRes = buildSegmentWhereClause($segConfig, $segId);
                                if ($segRes && !empty($segRes['sql'])) {
                                    $sourceConditions[] = "({$segRes['sql']})";
                                    if (!empty($segRes['params']))
                                        $params = array_merge($params, $segRes['params']);
                                }
                            }
                        }
                    }
                    $sql .= !empty($sourceConditions)
                        ? " AND (" . implode(" OR ", $sourceConditions) . ")"
                        : " AND 1=0";
                }

                $stmtDate = $pdo->prepare($sql);
                $stmtDate->execute($params);
                if ($stmtDate->fetch()) {
                    enrollSubscribersBulk($pdo, [$subscriberId], 'date', $tTargetId);
                }

            } elseif ($field === 'specificDate') {
                // ✅ Trigger vào một ngày cụ thể với offset
                $specificDate = trim($trigger['config']['specificDate'] ?? '');
                if (empty($specificDate))
                    continue;

                $offsetType = $trigger['config']['offsetType'] ?? 'on';
                $offsetValue = (int) ($trigger['config']['offsetValue'] ?? 0);
                $triggerHour = (int) ($trigger['config']['triggerHour'] ?? 8);
                $triggerMin = (int) ($trigger['config']['triggerMinute'] ?? 0);

                // Check hour:minute window (±5 min)
                $nowTotal = (int) date('H') * 60 + (int) date('i');
                $targetTotal = $triggerHour * 60 + $triggerMin;
                if (abs($nowTotal - $targetTotal) > 5)
                    continue;

                // Calculate which date should trigger today
                if ($offsetType === 'before') {
                    // Trigger fires X days before specificDate → today must be specificDate - offsetValue
                    $triggerOnDate = date('Y-m-d', strtotime($specificDate . " -$offsetValue days"));
                } elseif ($offsetType === 'after') {
                    $triggerOnDate = date('Y-m-d', strtotime($specificDate . " +$offsetValue days"));
                } else {
                    $triggerOnDate = $specificDate;
                }

                if (date('Y-m-d') !== $triggerOnDate)
                    continue;

                // List/segment filter
                $targetMode = $trigger['config']['targetLists'] ?? 'all';
                $targetListIds = $trigger['config']['targetListIds'] ?? [];

                if ($targetMode === 'specific' && !empty($targetListIds)) {
                    $phl = implode(',', array_fill(0, count($targetListIds), '?'));
                    $stmtF = $pdo->prepare("SELECT 1 FROM subscriber_lists WHERE subscriber_id = ? AND list_id IN ($phl)");
                    $stmtF->execute(array_merge([$subscriberId], $targetListIds));
                    if (!$stmtF->fetch())
                        continue;
                }

                enrollSubscribersBulk($pdo, [$subscriberId], 'date', $tTargetId);

            } elseif ($field === 'lastActivity') {
                // ✅ Trigger khi subscriber ngủ đông (không có activity trong N ngày)
                $inactiveDays = (int) ($trigger['config']['inactiveAmount'] ?? 30);

                // Check: không có open/click trong inactiveDays ngày
                $stmtLA = $pdo->prepare("
                    SELECT 1 FROM subscribers s
                    WHERE s.id = ?
                    AND s.status IN ('active','lead','customer')
                    AND (
                        NOT EXISTS (
                            SELECT 1 FROM subscriber_activity sa
                            WHERE sa.subscriber_id = s.id
                            AND sa.type IN ('open_email','click_link','open_zns','click_zns')
                        )
                        OR (
                            SELECT MAX(sa2.created_at) FROM subscriber_activity sa2
                            WHERE sa2.subscriber_id = s.id
                            AND sa2.type IN ('open_email','click_link','open_zns','click_zns')
                        ) < DATE_SUB(NOW(), INTERVAL ? DAY)
                    )
                ");
                $stmtLA->execute([$subscriberId, $inactiveDays]);
                if (!$stmtLA->fetch())
                    continue;

                // List filter
                $targetMode = $trigger['config']['targetLists'] ?? 'all';
                $targetListIds = $trigger['config']['targetListIds'] ?? [];

                if ($targetMode === 'specific' && !empty($targetListIds)) {
                    $phl = implode(',', array_fill(0, count($targetListIds), '?'));
                    $stmtF = $pdo->prepare("SELECT 1 FROM subscriber_lists WHERE subscriber_id = ? AND list_id IN ($phl)");
                    $stmtF->execute(array_merge([$subscriberId], $targetListIds));
                    if (!$stmtF->fetch())
                        continue;
                }

                enrollSubscribersBulk($pdo, [$subscriberId], 'date', $tTargetId);

            } elseif ($field === 'custom_field_date') {
                // Trigger based on a date stored in a custom attribute
                $customFieldKey = $trigger['config']['customFieldKey'] ?? '';
                if (empty($customFieldKey))
                    continue;

                $offsetType = $trigger['config']['offsetType'] ?? 'on';
                $offsetValue = (int) ($trigger['config']['offsetValue'] ?? 0);
                $triggerHour = (int) ($trigger['config']['triggerHour'] ?? 8);
                $triggerMin = (int) ($trigger['config']['triggerMinute'] ?? 0);

                // Match within a 5-minute execution window around the configured HH:MM
                // (handles cron running every 5 min or every 1 min)
                $nowTotalMin = (int) date('H') * 60 + (int) date('i');
                $targetTotalMin = $triggerHour * 60 + $triggerMin;
                if (abs($nowTotalMin - $targetTotalMin) > 5)
                    continue;

                // Fetch subscriber's custom_attributes
                $stmtAttr = $pdo->prepare("SELECT custom_attributes FROM subscribers WHERE id = ?");
                $stmtAttr->execute([$subscriberId]);
                $rawAttrs = $stmtAttr->fetchColumn();
                if (!$rawAttrs)
                    continue;
                $attrs = json_decode($rawAttrs, true);
                if (!is_array($attrs) || !isset($attrs[$customFieldKey]))
                    continue;

                $rawDate = trim($attrs[$customFieldKey]);
                if (empty($rawDate))
                    continue;

                // Parse date (support YYYY-MM-DD and DD/MM/YYYY)
                $ts = strtotime($rawDate);
                if (!$ts) {
                    // Try DD/MM/YYYY
                    $parts = explode('/', $rawDate);
                    if (count($parts) === 3) {
                        $ts = mktime(0, 0, 0, (int) $parts[1], (int) $parts[0], (int) $parts[2]);
                    }
                }
                if (!$ts)
                    continue;

                $fieldDate = date('Y-m-d', $ts);

                // Calculate target date based on offsetType
                if ($offsetType === 'before') {
                    $targetDate = date('Y-m-d', strtotime("+$offsetValue days"));
                } elseif ($offsetType === 'after') {
                    $targetDate = date('Y-m-d', strtotime("-$offsetValue days"));
                } else {
                    $targetDate = date('Y-m-d');
                }

                // Compare only month-day (for annual) or full date
                if ($fieldDate !== $targetDate)
                    continue;

                // Apply list/segment filtering if configured
                $targetMode = $trigger['config']['targetLists'] ?? 'all';
                $targetListIds = $trigger['config']['targetListIds'] ?? [];

                if ($targetMode === 'specific' && !empty($targetListIds)) {
                    $placeholders = implode(',', array_fill(0, count($targetListIds), '?'));
                    $stmtFilter = $pdo->prepare(
                        "SELECT 1 FROM subscriber_lists WHERE subscriber_id = ? AND list_id IN ($placeholders)"
                    );
                    $stmtFilter->execute(array_merge([$subscriberId], $targetListIds));
                    if (!$stmtFilter->fetch())
                        continue; // Not in any target list
                }

                enrollSubscribersBulk($pdo, [$subscriberId], 'date', $tTargetId);
            }
        }
    }
}
?>