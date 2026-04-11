<?php
// api/worker_flow.php - OMNI-ENGINE V30.3 (RELIABILITY & PERFORMANCE OPTIMIZED)
// Engine for processing flow automation jobs with chain execution.

error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
ini_set('display_errors', 0);
ignore_user_abort(true);
set_time_limit(300);

require_once __DIR__ . '/db_connect.php';
// RELEASE SESSION LOCK: Workers don't need to hold the user's session lock.
if (session_id())
    session_write_close();
require_once __DIR__ . '/Mailer.php';
require_once 'FlowExecutor.php';
require_once 'flow_helpers.php';
require_once 'trigger_helper.php';

date_default_timezone_set('Asia/Ho_Chi_Minh');
$pdo->exec("SET NAMES utf8mb4");
header('Content-Type: application/json; charset=utf-8');

if (!function_exists('traceLog')) {
    function traceLog($msg)
    {
        file_put_contents(__DIR__ . '/worker_trace.log', date('H:i:s') . " " . $msg . "\n", FILE_APPEND);
    }
}

if (!function_exists('runWorkerFlow')) {
    function runWorkerFlow($pdo)
    {
        // [FIX #3] Dùng biến cục bộ thay vì $_SERVER['REQUEST_TIME']
        // $_SERVER['REQUEST_TIME'] không tồn tại khi chạy từ CLI/Cron trên một số cấu hình server
        $workerStartTime = time();

        // Detect priority runs
        $isPriorityRun = (isset($_GET['priority_queue_id']) && (isset($_GET['priority_sub_id']) || isset($_GET['subscriber_id'])) && isset($_GET['priority_flow_id']));
        $isTestMode = isset($_GET['test_mode']) && $_GET['test_mode'] == '1';

        // Shared objects
        $apiUrl = API_BASE_URL;
        $stmt = $pdo->query("SELECT * FROM system_settings");
        $settings = [];
        foreach ($stmt->fetchAll() as $row) {
            $settings[$row['key']] = $row['value'];
        }
        $defaultSender = !empty($settings['smtp_user']) ? $settings['smtp_user'] : "marketing@ka-en.com.vn";
        $mailer = new Mailer($pdo, $apiUrl, $defaultSender);
        $executor = new FlowExecutor($pdo, $mailer, $apiUrl);

        $now = date('Y-m-d H:i:s');
        $logs = [];
        $logs[] = "--- FLOW WORKER START: $now ---";

        // --- QUEUE FETCHING ---
        $BATCH_SIZE = 500;
        $items = [];

        if ($isPriorityRun) {
            $priorityQueueId = $_GET['priority_queue_id'];
            $prioritySubId = $_GET['subscriber_id'] ?? $_GET['priority_sub_id'];
            $priorityFlowId = $_GET['priority_flow_id'];

            $stmtPriority = $pdo->prepare("SELECT q.id as queue_id, q.subscriber_id, q.flow_id, q.step_id, q.status, q.scheduled_at, q.updated_at, q.created_at as queue_created_at, q.last_step_at, 
                                 f.steps as flow_steps, f.config as flow_config, f.name as flow_name, 
                                 s.email as sub_email, s.first_name, s.last_name, s.company_name, s.phone_number, s.job_title,
                                 s.status as sub_status, s.tags as sub_tags, s.id as sub_id, s.date_of_birth, s.anniversary_date, s.joined_at,
                                 s.city, s.country, s.gender, s.last_os, s.last_device, s.last_browser, s.last_city,
                                 s.stats_opened, s.stats_clicked, s.last_open_at, s.last_click_at, s.timezone, s.is_zalo_follower,
                                 s.custom_attributes
                                 FROM subscriber_flow_states q 
                                 JOIN flows f ON q.flow_id = f.id 
                                 JOIN subscribers s ON q.subscriber_id = s.id 
                                 WHERE (q.id = ? OR (q.id > 0 AND ? = '0' AND q.subscriber_id = ? AND q.flow_id = ?))
                                 AND q.status IN ('waiting', 'processing') AND f.status = 'active'
                                 LIMIT 1 FOR UPDATE");
            try {
                $stmtPriority->execute([$priorityQueueId, $priorityQueueId, $prioritySubId, $priorityFlowId]);
                $priorityItem = $stmtPriority->fetch();
                if ($priorityItem) {
                    $pdo->prepare("UPDATE subscriber_flow_states SET status = 'processing', updated_at = NOW(), last_error = NULL WHERE id = ?")->execute([$priorityItem['queue_id']]);
                    $items[] = $priorityItem;
                    $logs[] = "[Flow-Priority] Enqueued priority item: Sub {$prioritySubId} Flow {$priorityFlowId}";
                }
            } catch (Throwable $e) {
                $logs[] = "[ERROR] Priority fetch failed: " . $e->getMessage();
            }
        }

        if (!$isPriorityRun) {
            try {
                $pdo->beginTransaction();
                $sqlRegular = "SELECT q.id as queue_id, q.subscriber_id, q.flow_id, q.step_id, q.status, q.scheduled_at, q.created_at as queue_created_at, q.last_step_at, 
                        f.steps as flow_steps, f.config as flow_config, f.name as flow_name, 
                        s.email as sub_email, s.first_name, s.last_name, s.company_name, s.phone_number, s.job_title,
                        s.status as sub_status, s.tags as sub_tags, s.id as sub_id, s.date_of_birth, s.anniversary_date, s.joined_at,
                        s.city, s.country, s.gender, s.last_os, s.last_device, s.last_browser, s.last_city,
                        s.stats_opened, s.stats_clicked, s.last_open_at, s.last_click_at, s.timezone, s.is_zalo_follower,
                        s.custom_attributes
                        FROM subscriber_flow_states q 
                        JOIN flows f ON q.flow_id = f.id 
                        JOIN subscribers s ON q.subscriber_id = s.id 
                        WHERE ((q.status = 'waiting' AND q.scheduled_at <= ?) OR 
                              (q.status = 'processing' AND q.updated_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)))
                        AND f.status = 'active'
                        ORDER BY q.scheduled_at ASC, q.updated_at ASC LIMIT {$BATCH_SIZE}";

                $mysqlVersion = $pdo->getAttribute(PDO::ATTR_SERVER_VERSION);
                if (version_compare($mysqlVersion, '8.0.0', '>=')) {
                    $sqlRegular .= " FOR UPDATE SKIP LOCKED";
                } else {
                    $sqlRegular .= " FOR UPDATE";
                }

                $stmtRegular = $pdo->prepare($sqlRegular);
                $stmtRegular->execute([$now]);
                $regularItems = $stmtRegular->fetchAll();

                if (!empty($regularItems)) {
                    $queueIds = array_column($regularItems, 'queue_id');
                    $placeholders = implode(',', array_fill(0, count($queueIds), '?'));
                    $pdo->prepare("UPDATE subscriber_flow_states SET status = 'processing', updated_at = NOW(), last_error = NULL WHERE id IN ($placeholders)")->execute($queueIds);
                    $items = array_merge($items, $regularItems);
                    $logs[] = "[Flow-Regular] Fetched and locked " . count($regularItems) . " items.";
                }
                $pdo->commit();
            } catch (Throwable $e) {
                if ($pdo->inTransaction())
                    $pdo->rollBack();
                $logs[] = "[ERROR] Fetch failed: " . $e->getMessage();
            }
        }

        if (empty($items)) {
            // [FIX] return array instead of echo — prevents broken JSON output
            // when called multiple times from worker_queue.php loop
            return ['status' => 'idle', 'message' => 'No items', 'logs' => $logs];
        }

        $flowCache = [];
        $subscriberFreqCache = []; // Optimization: Cache frequency check per sub/flow

        // [OPTIMIZATION] Batch Fetch Frequency Counts for the entire batch
        if (!empty($items)) {
            $subIds = array_unique(array_column($items, 'subscriber_id'));
            if (!empty($subIds)) {
                $todayStart = date('Y-m-d 00:00:00');
                $placeholders = implode(',', array_fill(0, count($subIds), '?'));
                $stmtCapBatch = $pdo->prepare("
            SELECT subscriber_id, COUNT(*) as count 
            FROM subscriber_activity 
            WHERE subscriber_id IN ($placeholders) 
            AND type IN ('receive_email', 'zalo_sent', 'meta_sent', 'zns_sent') 
            AND created_at >= ?
            GROUP BY subscriber_id
        ");
                $stmtCapBatch->execute(array_merge($subIds, [$todayStart]));
                $subscriberFreqCache = $stmtCapBatch->fetchAll(PDO::FETCH_KEY_PAIR);
            }
        }

        foreach ($items as $item) {
            // [FIX #3] Dùng $workerStartTime thay vì $_SERVER['REQUEST_TIME'] (an toàn hơn cho CLI/Cron)
            if (time() - $workerStartTime > 280)
                break;

            $pdo->beginTransaction();
            try {
                $item['email'] = $item['sub_email']; // [FIX] Map sub_email to email for FlowExecutor

                $subscriberId = $item['subscriber_id'];
                $flowId = $item['flow_id'];
                $flowName = $item['flow_name'];
                $queueId = $item['queue_id'];

                // [EXIT CHECK] Check if subscriber is still eligible (not unsubscribed globally)
                if (trim($item['sub_status']) === 'unsubscribed') {
                    // DB ENUM confirmed: waiting, processing, completed, failed, unsubscribed — use correct status
                    $pdo->prepare("UPDATE subscriber_flow_states SET status = 'unsubscribed', updated_at = NOW() WHERE id = ?")->execute([$queueId]);
                    $logs[] = "[Flow-Exit] Sub {$subscriberId} is unsubscribed. Marking unsubscribed and skipping.";
                    $pdo->commit();
                    continue;
                }


                if (!isset($flowCache[$flowId])) {
                    $flowCache[$flowId] = [
                        // [FIX #1] Thêm ?? [] để tránh Fatal TypeError khi flow_steps là null hoặc JSON lỗi
                        'steps' => json_decode($item['flow_steps'], true) ?? [],
                        'config' => json_decode($item['flow_config'], true) ?? [],
                    ];
                }

                $flowSteps = $flowCache[$flowId]['steps'];
                $fConfig = $flowCache[$flowId]['config'];

                // [FIX #1] Guard: nếu flow_steps không hợp lệ → fail item thay vì crash toàn worker
                if (!is_array($flowSteps) || empty($flowSteps)) {
                    $pdo->prepare("UPDATE subscriber_flow_states SET status = 'failed', last_error = 'Invalid flow_steps JSON', updated_at = NOW() WHERE id = ?")->execute([$queueId]);
                    $logs[] = "[ERROR] Flow {$flowId} has invalid steps JSON. Item {$queueId} marked failed.";
                    $pdo->commit();
                    continue;
                }

                // [EXIT CHECK] Specific exit conditions for the flow
                // [PERF FIX] Pre-compute exitActivityTypes BEFORE fetching activity cache.
                // Previous ordering: exitActivityTypes built AFTER the SELECT → forced LIMIT 500 blind ceiling.
                // New ordering: build type list first → use it as a WHERE IN filter → no LIMIT needed for exits.
                // Subscribers with thousands of activity records (long flows, many months) will no longer
                // silently miss exit events that existed beyond the old position-500 boundary.
                $exitConditions = $fConfig['exitConditions'] ?? [];
                $exitActivityTypes = [];
                if (!empty($exitConditions)) {
                    $exitTypeMap = [
                        'unsubscribed' => ['unsubscribe'],
                        'clicked' => ['click_link', 'click_zns'],
                        'opened' => ['open_email', 'open_zns'],
                        'bounced' => ['bounce'],
                    ];
                    foreach ($exitConditions as $cond) {
                        $exitActivityTypes = array_merge($exitActivityTypes, $exitTypeMap[$cond] ?? [$cond]);
                    }
                }

                // Activity Cache — fetched since enrollment (queue_created_at).
                // [FIX #5 v2] If we have exit types, filter the query by those types so we fetch ALL
                // matching rows without any LIMIT risk. A separate broader LIMIT 500 fetch covers
                // condition-chain logic that needs recent general activity.
                if (!empty($exitActivityTypes)) {
                    $exitPlaceholders = implode(',', array_fill(0, count($exitActivityTypes), '?'));
                    $stmtExitAct = $pdo->prepare(
                        "SELECT type, reference_id, campaign_id, details, created_at 
                         FROM subscriber_activity 
                         WHERE subscriber_id = ? AND created_at >= ? AND type IN ($exitPlaceholders) 
                         ORDER BY created_at DESC"
                    );
                    $stmtExitAct->execute(array_merge([$subscriberId, $item['queue_created_at']], $exitActivityTypes));
                    $exitActivityCache = $stmtExitAct->fetchAll();
                } else {
                    $exitActivityCache = [];
                }

                // General activity cache (for condition steps, not only exits) — LIMIT 500 is safe here
                // because condition logic uses recent events, not exhaustive history.
                $stmtAct = $pdo->prepare(
                    "SELECT type, reference_id, campaign_id, details, created_at 
                     FROM subscriber_activity 
                     WHERE subscriber_id = ? AND created_at >= ? 
                     ORDER BY created_at DESC LIMIT 500"
                );
                $stmtAct->execute([$subscriberId, $item['queue_created_at']]);
                $activityCache = $stmtAct->fetchAll();

                // [EXIT CHECK] Specific exit conditions — uses the unlimited exitActivityCache
                if (!empty($exitActivityTypes)) {
                    $shouldExit = false;
                    foreach ($exitActivityCache as $act) {
                        if (in_array($act['type'], $exitActivityTypes)) {
                            $shouldExit = true;
                            break;
                        }
                    }
                    if ($shouldExit) {
                        $pdo->prepare("UPDATE subscriber_flow_states SET status = 'completed', updated_at = NOW() WHERE id = ?")->execute([$queueId]);
                        logActivity($pdo, $subscriberId, 'exit_flow', $flowId, $flowName, "Exited: Condition met", $flowId);
                        // Buffer Completion Stat
                        try {
                            $pdo->prepare("INSERT INTO stats_update_buffer (target_table, target_id, column_name, increment, created_at) VALUES ('flows', ?, 'stat_completed', 1, NOW())")->execute([$flowId]);
                        } catch (Exception $ignored) {
                            $pdo->prepare("UPDATE flows SET stat_completed = stat_completed + 1 WHERE id = ?")->execute([$flowId]);
                        }
                        $logs[] = "  -> Subscriber exited flow (Exit Condition Match).";
                        $pdo->commit();
                        continue; // Use continue to move to the next item in the foreach loop
                    }
                }

                // [EXIT CHECK] Advanced Exit: form_submit / purchase / custom_event
                $advancedExit = $fConfig['advancedExit'] ?? [];
                if (!empty($advancedExit) && checkAdvancedExit($pdo, $subscriberId, $item['queue_created_at'], $advancedExit, $activityCache)) {
                    $pdo->prepare("UPDATE subscriber_flow_states SET status = 'completed', updated_at = NOW() WHERE id = ?")->execute([$queueId]);
                    logActivity($pdo, $subscriberId, 'exit_flow', $flowId, $flowName, "Exited: Advanced condition met", $flowId);
                    // Buffer Completion Stat
                    try {
                        $pdo->prepare("INSERT INTO stats_update_buffer (target_table, target_id, column_name, increment, created_at) VALUES ('flows', ?, 'stat_completed', 1, NOW())")->execute([$flowId]);
                    } catch (Exception $ignored) {
                        $pdo->prepare("UPDATE flows SET stat_completed = stat_completed + 1 WHERE id = ?")->execute([$flowId]);
                    }
                    $logs[] = "  -> Subscriber exited flow (Advanced Exit Condition Match).";
                    $pdo->commit();
                    continue;
                }

                // [SCHEDULING CHECK] activeDays / startTime / endTime from flow config
                // Only applies to message-sending steps — we check early to avoid wasting cycles.
                $activeDays = $fConfig['activeDays'] ?? [0, 1, 2, 3, 4, 5, 6];
                // [FIX] Guard against empty activeDays (e.g. UI bug / user didn't select any day)
                // An empty array would cause the "find next day" loop to exhaust without assignment,
                // leaving $nextSendAt = NOW() and creating an infinite reschedule loop.
                if (empty($activeDays)) {
                    $activeDays = [0, 1, 2, 3, 4, 5, 6]; // Fallback: allow all days
                }
                $startTime = $fConfig['startTime'] ?? '00:00';
                $endTime = $fConfig['endTime'] ?? '23:59';
                $currentDayOfWeek = (int) date('w'); // 0=Sunday, 6=Saturday
                $currentTime = date('H:i');

                $isDayAllowed = in_array($currentDayOfWeek, array_map('intval', $activeDays));
                $isTimeAllowed = ($currentTime >= $startTime && $currentTime <= $endTime);

                // [FIX] If today is allowed but we're already past endTime,
                // treat the day as "not allowed" so the loop below finds the NEXT valid day
                // instead of naively adding +1 day (which might land on an invalid day).
                if ($isDayAllowed && $currentTime > $endTime) {
                    $isDayAllowed = false;
                }

                if (!$isDayAllowed || !$isTimeAllowed) {
                    if ($isDayAllowed && !$isTimeAllowed) {
                        // Ngày hợp lệ nhưng chưa đến giờ startTime — chờ đến startTime hôm nay
                        $nextSendAt = date('Y-m-d') . ' ' . $startTime . ':00';
                    } else {
                        // Ngày không hợp lệ (hoặc đã qua endTime) — tìm ngày hợp lệ tiếp theo
                        // [FIX #4] Dùng DateTime object thay vì strtotime('+N days') để tránh lệch ngày
                        // khi worker chạy gần 00:00 hoặc trong môi trường DST timezone
                        $dtBase = new DateTime('now', new DateTimeZone('Asia/Ho_Chi_Minh'));
                        $nextSendAt = $dtBase->format('Y-m-d') . ' ' . $startTime . ':00'; // fallback
                        for ($i = 1; $i <= 7; $i++) {
                            $dtCheck = clone $dtBase;
                            $dtCheck->modify("+$i days");
                            $checkDay = (int) $dtCheck->format('w');
                            if (in_array($checkDay, array_map('intval', $activeDays))) {
                                $nextSendAt = $dtCheck->format('Y-m-d') . ' ' . $startTime . ':00';
                                break;
                            }
                        }
                    }
                    $pdo->prepare("UPDATE subscriber_flow_states SET status = 'waiting', scheduled_at = ?, updated_at = NOW() WHERE id = ?")->execute([$nextSendAt, $queueId]);
                    $logs[] = "  -> Scheduling paused for Sub {$subscriberId} (Day/Time restriction). Next send: $nextSendAt";
                    $pdo->commit();
                    continue;
                }

                $currentStepId = $item['step_id'];
                $stepsProcessedInRun = 0;
                $MAX_STEPS = 50; // [FIX] Tăng từ 20→50 để nhất quán với worker_priority.php
                // Flow phức tạp >20 bước condition/split sẽ bị dừng sớm nếu giữ 20
                $shouldContinueChain = true;

                while ($shouldContinueChain && $stepsProcessedInRun < $MAX_STEPS) {
                    $stepsProcessedInRun++;
                    $currentStep = null;
                    foreach ($flowSteps as $s) {
                        // [FIX #2] Cast sang string trước trim() — PHP 8.1+ throw Deprecated nếu value là null
                        if (trim((string) ($s['id'] ?? '')) === trim((string) $currentStepId)) {
                            $currentStep = $s;
                            break;
                        }
                    }

                    if (!$currentStep) {
                        $pdo->prepare("UPDATE subscriber_flow_states SET status = 'failed', last_error = 'Step not found', updated_at = NOW() WHERE id = ?")->execute([$queueId]);
                        break;
                    }

                    // [OPTIMIZATION] Frequency Cap check - Uses batch-fetched data
                    $cacheKey = (int) $subscriberId;
                    // [FIX] PHP 8: initialize key before ++ to prevent Undefined array key Warning
                    if (!isset($subscriberFreqCache[$cacheKey])) {
                        $subscriberFreqCache[$cacheKey] = 0;
                    }
                    $todaySent = $subscriberFreqCache[$cacheKey];

                    $contextData = [
                        'queue_created_at' => $item['queue_created_at'],
                        'last_step_at' => $item['last_step_at'] ?? $item['updated_at'],
                        'updated_at' => $item['updated_at'],
                        'flow_steps' => $flowSteps,
                        'flow_name' => $flowName,
                        'total_sent_today' => $subscriberFreqCache[$cacheKey],
                        'activity_cache' => $activityCache,
                        'now' => $now,
                        // [FIX #2] Cast (string) trước trim() — tránh PHP 8.1 Deprecated khi step_id là null
                        'is_resumed_wait' => ($stepsProcessedInRun === 1 && trim((string) ($item['step_id'] ?? '')) === trim((string) $currentStepId) && $item['scheduled_at'] <= $now)
                    ];

                    $execResult = $executor->executeStep($currentStep, $item, $flowId, $currentStepId, null, $fConfig, $contextData);
                    if (!empty($execResult['logs']))
                        $logs = array_merge($logs, $execResult['logs']);

                    if ($execResult['status'] === 'completed' && $execResult['next_step_id']) {
                        $currentStepId = $execResult['next_step_id'];
                        if ($execResult['is_instant']) {
                            // Update freq cache locally if a message was sent
                            if (!empty($execResult['message_sent'])) {
                                $subscriberFreqCache[$cacheKey]++;
                            }
                            $pdo->commit();
                            $pdo->beginTransaction();
                            continue;
                        } else {
                            $pdo->prepare("UPDATE subscriber_flow_states SET status = 'waiting', scheduled_at = ?, step_id = ?, updated_at = NOW(), last_step_at = NOW() WHERE id = ?")->execute([$execResult['scheduled_at'], $currentStepId, $queueId]);
                            $shouldContinueChain = false;
                        }
                    } else {
                        if ($execResult['status'] === 'completed') {
                            $pdo->prepare("UPDATE subscriber_flow_states SET status = 'completed', step_id = ?, updated_at = NOW() WHERE id = ?")->execute([$currentStepId, $queueId]);

                            // NEW: Log completion activity for Dashboard accuracy
                            logActivity($pdo, $subscriberId, 'complete_flow', $currentStepId, $flowName, "Flow finished automatically", $flowId);

                            // Buffer Completion Stat
                            try {
                                $pdo->prepare("INSERT INTO stats_update_buffer (target_table, target_id, column_name, increment, created_at) VALUES ('flows', ?, 'stat_completed', 1, NOW())")->execute([$flowId]);
                            } catch (Exception $e) {
                                $pdo->prepare("UPDATE flows SET stat_completed = stat_completed + 1 WHERE id = ?")->execute([$flowId]);
                            }
                        } else {
                            $pdo->prepare("UPDATE subscriber_flow_states SET status = ?, scheduled_at = ?, updated_at = NOW(), step_id = ? WHERE id = ?")->execute([$execResult['status'], $execResult['scheduled_at'] ?? $now, $currentStepId, $queueId]);
                        }
                        $shouldContinueChain = false;
                    }
                } // End of while loop

                // NEW: Prevent infinite loop if steps exceed MAX_STEPS without terminating explicitly
                if ($shouldContinueChain && $stepsProcessedInRun >= $MAX_STEPS) {
                    $pdo->prepare("UPDATE subscriber_flow_states SET status = 'waiting', scheduled_at = NOW(), step_id = ?, updated_at = NOW() WHERE id = ?")->execute([$currentStepId, $queueId]);
                    $logs[] = "  -> Reached limit ($MAX_STEPS). Pausing chain to prevent infinite loop.";
                }

                $pdo->commit();
            } catch (Throwable $e) {

                if ($pdo->inTransaction())
                    $pdo->rollBack();
                $logs[] = "[ERROR] Subscriber chain failed: " . $e->getMessage();
            }
        }

        $mailer->closeConnection();
        // [FIX] LOCK_EX prevents log corruption when multiple worker processes write concurrently
        file_put_contents(__DIR__ . '/worker_flow.log', implode("\n", $logs) . "\n", FILE_APPEND | LOCK_EX);
        // [FIX] return array instead of echo — caller (worker_queue.php) is responsible for output
        return ['status' => 'completed', 'logs' => $logs];
    } // end runWorkerFlow()
} // end if (!function_exists)

// When run as standalone script (cron/direct), execute immediately and output result
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    // [FIX] Only echo here — when called via require_once from worker_queue.php,
    // the caller manages output. This guard prevents broken concatenated JSON.
    $result = runWorkerFlow($pdo);
    echo json_encode($result);
}