<?php
require_once 'bootstrap.php';
// Initializing system once via bootstrap pattern
initializeSystem($pdo);

require_once 'auth_middleware.php';
$workspace_id = get_current_workspace_id();

$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_GET['id']) ? $_GET['id'] : null;
$route = $_GET['route'] ?? ''; // New route parameter

function formatCampaign($row)
{
    $row['target'] = json_decode($row['target_config'] ?? '{"listIds":[], "segmentIds":[], "individualIds":[]}', true);

    // Map DB columns to stats object - prioritize individual columns over JSON 'stats' column
    $row['stats'] = [
        'sent' => (int) ($row['count_sent'] ?? 0),
        'opened' => (int) ($row['count_unique_opened'] ?? $row['count_opened'] ?? 0),
        'total_opened' => (int) ($row['count_opened'] ?? 0),
        'clicked' => (int) ($row['count_unique_clicked'] ?? $row['count_clicked'] ?? 0),
        'total_clicked' => (int) ($row['count_clicked'] ?? 0),
        'bounced' => (int) ($row['count_bounced'] ?? 0),
        'spam' => (int) ($row['count_spam'] ?? 0),
        'unsubscribed' => (int) ($row['count_unsubscribed'] ?? 0)
    ];

    $row['reminders'] = []; // Fetched separately
    $row['reminderCount'] = (int)($row['reminder_count'] ?? 0); // [UI-R1] # reminders for badge
    $row['trackingEnabled'] = (bool) ($row['tracking_enabled'] ?? 1);
    $row['senderEmail'] = $row['sender_email'] ?? '';
    $row['templateId'] = $row['template_id'] ?? '';
    $row['contentBody'] = $row['content_body'] ?? '';
    $row['sentAt'] = $row['sent_at'] ?? null;
    $row['scheduledAt'] = $row['scheduled_at'] ?? null;
    $row['attachments'] = json_decode($row['attachments'] ?? '[]', true);
    $row['totalTargetAudience'] = (int) ($row['total_target_audience'] ?? 0);
    $row['type'] = $row['type'] ?? 'regular';
    $row['config'] = json_decode($row['config'] ?? '{}', true);

    // Fallback for legacy campaigns: use count_sent if total_target_audience is missing
    if ($row['totalTargetAudience'] === 0 && !empty($row['count_sent'])) {
        $row['totalTargetAudience'] = (int) $row['count_sent'];
    }

    // Clean up snake_case keys used for internal mapping
    unset(
        $row['target_config'],
        $row['count_sent'],
        $row['count_opened'],
        $row['count_unique_opened'],
        $row['count_clicked'],
        $row['count_unique_clicked'],
        $row['count_bounced'],
        $row['count_spam'],
        $row['count_unsubscribed'],
        $row['tracking_enabled'],
        $row['sender_email'],
        $row['template_id'],
        $row['content_body'],
        $row['sent_at'],
        $row['scheduled_at'],
        $row['total_target_audience'],
        $row['reminder_count']
    );

    return $row;
}

// --- NEW ROUTE: Resend Failed Emails ---
if ($method === 'POST' && $route === 'resend_failed_emails') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        $campaignId = $data['campaign_id'] ?? null;
        $logIds = $data['log_ids'] ?? [];

        if (!$campaignId || empty($logIds))
            jsonResponse(false, null, 'Campaign ID and log IDs are required.');

        // [AUDIT-C2 + H1 FIX] Correct order: fetch sub IDs first → clean activity → delete logs → update → commit → fire worker
        // Step 1: Collect subscriber IDs BEFORE deleting logs (subquery must read logs while they exist)
        $placeholders = implode(',', array_fill(0, count($logIds), '?'));
        $stmtSubIds = $pdo->prepare("SELECT DISTINCT subscriber_id FROM mail_delivery_logs WHERE id IN ({$placeholders}) AND campaign_id = ?");
        $stmtSubIds->execute(array_merge($logIds, [$campaignId]));
        $subIdsToRetry = $stmtSubIds->fetchAll(PDO::FETCH_COLUMN);

        $pdo->beginTransaction();

        // Step 2: Remove failed_email activity so worker exclusion query won't skip these subscribers
        if (!empty($subIdsToRetry)) {
            $subPh = implode(',', array_fill(0, count($subIdsToRetry), '?'));
            $pdo->prepare("DELETE FROM subscriber_activity WHERE campaign_id = ? AND type = 'failed_email' AND subscriber_id IN ($subPh)")
                ->execute(array_merge([$campaignId], $subIdsToRetry));
        }

        // Step 3: Delete the failed delivery log entries to clear the exclusion record
        $pdo->prepare("DELETE FROM mail_delivery_logs WHERE id IN ({$placeholders}) AND campaign_id = ?")
            ->execute(array_merge($logIds, [$campaignId]));

        // Step 4: Re-arm campaign status to 'sending' so worker picks it up
        // [FIX P32-C1] Added workspace_id guard — previously any authenticated user could re-arm
        // any campaign by supplying a campaign_id they don't own.
        $pdo->prepare("UPDATE campaigns SET status = 'sending' WHERE id = ? AND workspace_id = ? AND status = 'sent'")->execute([$campaignId, $workspace_id]);
        $pdo->commit();

        logSystemActivity($pdo, 'campaigns', 'resend_failed', $campaignId, "Campaign $campaignId", ['log_ids' => $logIds, 'subscriber_count' => count($subIdsToRetry)]);

        // [AUDIT-H1 FIX] Fire worker immediately — without this, campaign stays stuck in 'sending'
        // until the next cron run (up to 60s delay).
        $workerUrl = API_BASE_URL . "/worker_campaign.php?campaign_id=" . urlencode($campaignId);
        $cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
        $chResend = curl_init();
        curl_setopt($chResend, CURLOPT_URL, $workerUrl);
        curl_setopt($chResend, CURLOPT_RETURNTRANSFER, false);
        curl_setopt($chResend, CURLOPT_TIMEOUT, 1); // Fire-and-forget
        curl_setopt($chResend, CURLOPT_NOSIGNAL, 1);
        curl_setopt($chResend, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($chResend, CURLOPT_SSL_VERIFYHOST, 2); // [FIX P11-H1] was 0, disabling hostname verification
        curl_setopt($chResend, CURLOPT_HTTPHEADER, ['X-Cron-Secret: ' . $cronSecret]);
        curl_exec($chResend);
        curl_close($chResend);
        jsonResponse(true, ['count' => count($subIdsToRetry)], 'Emails re-queued successfully.');
    } catch (Exception $e) {
        if ($pdo->inTransaction())
            $pdo->rollBack();
        jsonResponse(false, null, 'Failed to re-queue emails: ' . $e->getMessage());
    }
}

// --- NEW ROUTE: Bulk Update Subscribers ---
if ($method === 'POST' && $route === 'bulk_update_subscribers') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        $subscriberIds = $data['subscriber_ids'] ?? [];
        $action = $data['action'] ?? null;
        $value = $data['value'] ?? null;

        if (empty($subscriberIds) || !$action)
            jsonResponse(false, null, 'Subscriber IDs and action are required.');

        $pdo->beginTransaction();
        $successCount = 0;

        // [PERF FIX] For 'delete' action, batch all IDs to avoid N×5 individual SQL calls.
        // 5,000 subscribers × 5 tables = 25,000 queries with the old per-row loop.
        // New approach: collect all IDs first, then DELETE ... WHERE id IN (...) in chunks of 500.
        // This reduces the query count to ~56 and shrinks the transaction lock window by 99%.
        if ($action === 'delete') {
            $deleteIds = array_values(array_filter($subscriberIds, fn($id) => !empty($id)));
            $chunks = array_chunk($deleteIds, 500);
            foreach ($chunks as $chunk) {
                $ph = implode(',', array_fill(0, count($chunk), '?'));
                $pdo->prepare("DELETE FROM subscriber_activity WHERE subscriber_id IN ($ph)")->execute($chunk);
                $pdo->prepare("DELETE FROM subscriber_flow_states WHERE subscriber_id IN ($ph)")->execute($chunk);
                $pdo->prepare("DELETE FROM subscriber_lists WHERE subscriber_id IN ($ph)")->execute($chunk);
                $pdo->prepare("DELETE FROM subscriber_tags WHERE subscriber_id IN ($ph)")->execute($chunk);
                $pdo->prepare("DELETE FROM subscribers WHERE id IN ($ph)")->execute($chunk);
            }
            $successCount = count($deleteIds);
            $pdo->commit();
            logSystemActivity($pdo, 'audience', "bulk_delete", null, "Bulk delete", ['subscriber_count' => $successCount]);
            jsonResponse(true, ['count' => $successCount], 'Bulk delete successful.');
        }

        // [PERF FIX] Prefetch ALL subscriber statuses in ONE query before the loop.
        // Old approach: N SELECT queries inside foreach = N×1 round-trips for N subscribers.
        // New approach: 1 SELECT IN() + map by ID = O(1) lookups inside foreach.
        $cleanIds = array_values(array_filter($subscriberIds, fn($id) => !empty($id)));
        $subMap = [];
        if (!empty($cleanIds)) {
            $ph = implode(',', array_fill(0, count($cleanIds), '?'));
            $stmtPre = $pdo->prepare("SELECT id, status FROM subscribers WHERE id IN ($ph)");
            $stmtPre->execute($cleanIds);
            foreach ($stmtPre->fetchAll() as $row) {
                $subMap[$row['id']] = $row;
            }
        }

        // [PERF FIX] Resolve tag/list values ONCE before loop (same value for all subscribers).
        $tagId = null;
        $listId = null;
        if ($action === 'add_tag' || $action === 'remove_tag') {
            $stmtT = $pdo->prepare("SELECT id FROM tags WHERE name = ? AND workspace_id = ?");
            $stmtT->execute([$value, $workspace_id]);
            $tagId = $stmtT->fetchColumn();
            if (!$tagId && $action === 'add_tag') {
                $tagId = bin2hex(random_bytes(8));
                // [FIX P43-G1] workspace_id added — auto-created tags previously had NULL
                // workspace_id and appeared in all workspaces' tag pickers.
                $pdo->prepare("INSERT INTO tags (id, workspace_id, name) VALUES (?, ?, ?)")->execute([$tagId, $workspace_id, $value]);
            }
        } elseif ($action === 'add_list') {
            $stmtL = $pdo->prepare("SELECT id FROM lists WHERE id = ? AND workspace_id = ?");
            $stmtL->execute([$value, $workspace_id]);
            $listId = $stmtL->fetchColumn();
            if (!$listId) {
                $stmtLN = $pdo->prepare("SELECT id FROM lists WHERE name = ? AND workspace_id = ?");
                $stmtLN->execute([$value, $workspace_id]);
                $listId = $stmtLN->fetchColumn();
                if (!$listId) {
                    $listId = bin2hex(random_bytes(8));
                    // [FIX P43-G2] workspace_id added — auto-created lists previously had NULL
                    // workspace_id and were invisible / shared across all workspaces.
                    $pdo->prepare("INSERT INTO lists (id, workspace_id, name, type, subscriber_count) VALUES (?, ?, ?, 'standard', 0)")->execute([$listId, $workspace_id, $value]);
                }
            }
            $value = $listId; // normalize for list count update below
        }

        $enrolledForTag = []; // subscribers newly tagged — for bulk flow dispatch
        foreach ($cleanIds as $subId) {
            $sub = $subMap[$subId] ?? null;
            if (!$sub) continue;

            // Flat action dispatch — all actions at the same nesting level for clarity.
            // $data['value'] holds the original tag name even after $value was rewritten for add_list.
            $originalValue = $data['value'] ?? '';

            if ($action === 'add_tag') {
                if ($tagId) {
                    $stmtIns = $pdo->prepare("INSERT IGNORE INTO subscriber_tags (subscriber_id, tag_id) VALUES (?, ?)");
                    $stmtIns->execute([$subId, $tagId]);
                    if ($stmtIns->rowCount() > 0) {
                        $enrolledForTag[] = $subId;
                        logActivity($pdo, $subId, 'update_tag', $originalValue, 'Bulk Action', "add_tag '{$originalValue}'", null, null);
                        $successCount++;
                    }
                }
            } elseif ($action === 'remove_tag') {
                // Note: if tag doesn't exist ($tagId == null), silently skip — not an error.
                if ($tagId) {
                    $pdo->prepare("DELETE FROM subscriber_tags WHERE subscriber_id = ? AND tag_id = ?")
                        ->execute([$subId, $tagId]);
                    logActivity($pdo, $subId, 'update_tag', $originalValue, 'Bulk Action', "remove_tag '{$originalValue}'", null, null);
                    $successCount++;
                }
            } elseif ($action === 'add_list') {
                if ($listId) {
                    $pdo->prepare("INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)")->execute([$subId, $listId]);
                    logActivity($pdo, $subId, 'list_action', $listId, 'Bulk Action', "add_list List ID '{$listId}'", null, null);
                    $successCount++;
                }
            } elseif ($action === 'remove_list') {
                $pdo->prepare("DELETE FROM subscriber_lists WHERE subscriber_id = ? AND list_id = ?")->execute([$subId, $value]);
                logActivity($pdo, $subId, 'list_action', $value, 'Bulk Action', "remove_list List ID '{$value}'", null, null);
                $successCount++;
            } elseif ($action === 'unsubscribe') {
                if ($sub['status'] !== 'unsubscribed') {
                    $pdo->prepare("UPDATE subscribers SET status = 'unsubscribed' WHERE id = ?")->execute([$subId]);
                    logActivity($pdo, $subId, 'unsubscribe', null, 'Bulk Action', "Unsubscribed via bulk action", null, null);
                    $successCount++;
                }
            }
        }

        // [PERF FIX] Batch dispatch tag-based flow workers after loop, not inside loop.
        // Old approach: N individual dispatchFlowWorker calls (1 HTTP per subscriber).
        // New approach: single enrollSubscribersBulk covers all newly-tagged subscribers.
        // [BUG FIX] require_once BEFORE function_exists() check — otherwise the function
        // is not yet loaded and function_exists() always returns false, skipping dispatch.
        if (!empty($enrolledForTag)) {
            require_once 'trigger_helper.php';
            enrollSubscribersBulk($pdo, $enrolledForTag, 'tag', $data['value'] ?? $value);
        }

        // [PERF] Update List Count ONCE after loop
        if ($action === 'add_list' || $action === 'remove_list') {
            $pdo->prepare("UPDATE lists SET subscriber_count = (SELECT COUNT(*) FROM subscriber_lists WHERE list_id = ?) WHERE id = ?")
                ->execute([$value, $value]);
        }
        $pdo->commit();
        logSystemActivity($pdo, 'audience', "bulk_{$action}", null, "Bulk {$action}", ['subscriber_count' => $successCount, 'value' => $value]);
        jsonResponse(true, ['count' => $successCount], 'Bulk update successful.');
    } catch (Exception $e) {
        if ($pdo->inTransaction())
            $pdo->rollBack();
        jsonResponse(false, null, 'Bulk update failed: ' . $e->getMessage());
    }
}
// --- NEW ROUTE: Get Audience Refresh Stats ---
if ($method === 'GET' && $route === 'audience_stats') {
    try {
        $campaignId = $_GET['id'] ?? null;
        if (!$campaignId)
            jsonResponse(false, null, 'Campaign ID is required.');

        $stmtCamp = $pdo->prepare("SELECT target_config, count_sent, total_target_audience FROM campaigns WHERE id = ?");
        $stmtCamp->execute([$campaignId]);
        $campaign = $stmtCamp->fetch();
        if (!$campaign)
            jsonResponse(false, null, 'Campaign not found.');

        $targetConf = json_decode($campaign['target_config'], true);
        $campaignType = $campaign['type'] ?? 'email';

        $countSql = "SELECT COUNT(DISTINCT s.id) FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer')";

        // ZNS Requirement: Must have phone number
        if ($campaignType === 'zalo_zns') {
            $countSql .= " AND (s.phone_number IS NOT NULL AND s.phone_number != '')";
        }

        $countWheres = [];
        $countParams = [];

        if (!empty($targetConf['listIds'])) {
            $placeholders = implode(',', array_fill(0, count($targetConf['listIds']), '?'));
            $countWheres[] = "s.id IN (SELECT subscriber_id FROM subscriber_lists WHERE list_id IN ($placeholders))";
            foreach ($targetConf['listIds'] as $lid)
                $countParams[] = $lid;
        }
        if (!empty($targetConf['tagIds'])) {
            foreach ($targetConf['tagIds'] as $tagName) {
                // PERF: Use relational table instead of JSON_CONTAINS
                $countWheres[] = "s.id IN (SELECT st.subscriber_id FROM subscriber_tags st JOIN tags t_sub ON st.tag_id = t_sub.id WHERE
t_sub.name = ?)";
                $countParams[] = $tagName;
            }
        }
        if (!empty($targetConf['segmentIds'])) {
            foreach ($targetConf['segmentIds'] as $segId) {
                $stmtSeg = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
                $stmtSeg->execute([$segId]);
                $criteria = $stmtSeg->fetchColumn();
                if ($criteria) {
                    $res = buildSegmentWhereClause($criteria);
                    if ($res['sql'] !== '1=1') {
                        $countWheres[] = $res['sql'];
                        foreach ($res['params'] as $p)
                            $countParams[] = $p;
                    }
                }
            }
        }
        // D. INDIVIDUAL IDs (hand-picked subscribers)
        if (!empty($targetConf['individualIds'])) {
            $indPlaceholders = implode(',', array_fill(0, count($targetConf['individualIds']), '?'));
            $countWheres[] = "s.id IN ($indPlaceholders)";
            $countParams = array_merge($countParams, $targetConf['individualIds']);
        }

        $currentTotal = 0;
        if (!empty($countWheres)) {
            $countSql .= " AND (" . implode(' OR ', $countWheres) . ")";
            $stmtCount = $pdo->prepare($countSql);
            $stmtCount->execute($countParams);
            $currentTotal = (int) $stmtCount->fetchColumn();
        }

        // [AUDIT-H3 FIX] Exclude 'enter_flow' from sentTotal — a subscriber can be enrolled in a flow
        // without having received any email yet. Counting enter_flow inflates the "sent" count.
        $stmtSent = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = ? AND type IN ('receive_email', 'zalo_sent', 'meta_sent', 'zns_sent')");
        $stmtSent->execute([$campaignId]);
        $sentTotal = (int) $stmtSent->fetchColumn();

        $stmtRem = $pdo->prepare("SELECT id, type, trigger_mode, scheduled_at FROM campaign_reminders WHERE campaign_id = ?");
        $stmtRem->execute([$campaignId]);
        $reminders = $stmtRem->fetchAll();

        $gap = 0;
        if (!empty($countWheres)) {
            // [PERF FIX] Replace LEFT JOIN ... IS NULL (anti-join) with NOT EXISTS.
            // On tables with tens of millions of activity rows, LEFT JOIN forces MySQL to
            // materialize the full joined result before filtering sa.id IS NULL rows.
            // NOT EXISTS allows the optimizer to short-circuit on the first matching row,
            // resulting in dramatically lower I/O on large datasets.
            $audienceFilter = implode(' OR ', $countWheres);
            $gapSql = "SELECT COUNT(DISTINCT s.id) FROM subscribers s
WHERE s.status IN ('active', 'lead', 'customer')
AND ($audienceFilter)
AND NOT EXISTS (
    SELECT 1 FROM subscriber_activity sa
    WHERE sa.subscriber_id = s.id
    AND sa.campaign_id = ?
    AND sa.type IN ('receive_email', 'failed_email', 'zalo_sent', 'meta_sent', 'zns_sent', 'zns_failed', 'enter_flow')
)";

            // NOT EXISTS sub-query param ($campaignId) must come AFTER the audience filter params
            $gapParams = array_merge($countParams, [$campaignId]);
            $stmtGap = $pdo->prepare($gapSql);
            $stmtGap->execute($gapParams);
            $gap = (int) $stmtGap->fetchColumn();
        }

        $stmtUnsub = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = ? AND type = 'unsubscribe'");
        $stmtUnsub->execute([$campaignId]);
        $unsubs = (int) $stmtUnsub->fetchColumn();

        jsonResponse(true, [
            'count_sent' => $sentTotal,
            'total_current' => $currentTotal,
            'gap' => $gap,
            'count_unsubscribed' => $unsubs,
            'reminders' => $reminders,
            'now' => date('Y-m-d H:i:s')
        ]);
    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
}

// --- NEW ROUTE: Delete Unsubscribed Audience ---
if ($method === 'POST' && $route === 'delete_unsubscribed') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        $cid = $data['id'] ?? null;
        if (!$cid) jsonResponse(false, null, 'Campaign ID is required.');
        
        $stmt = $pdo->prepare("SELECT subscriber_id FROM subscriber_activity WHERE campaign_id = ? AND type = 'unsubscribe'");
        $stmt->execute([$cid]);
        $subIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (empty($subIds)) {
            jsonResponse(true, ['deleted' => 0], 'Không tìm thấy liên hệ nào đã click Hủy đăng ký từ chiến dịch này.');
            exit;
        }

        // [FIX P0] Old code did a single DELETE ... WHERE id IN ($all_ids) which:
        //   1. Crashes MySQL when subIds > 65,535 (placeholder limit)
        //   2. Left orphaned rows in activity/lists/tags/flow_states tables
        // New: chunked DELETE (500 rows), cascading cleanup of all dependent tables
        $pdo->beginTransaction();
        $chunks = array_chunk(array_unique($subIds), 500);
        $deleted = 0;
        foreach ($chunks as $chunk) {
            $ph = implode(',', array_fill(0, count($chunk), '?'));
            // Cascade cleanup first to avoid FK errors on strict setups
            $pdo->prepare("DELETE FROM subscriber_activity WHERE subscriber_id IN ($ph)")->execute($chunk);
            $pdo->prepare("DELETE FROM subscriber_lists WHERE subscriber_id IN ($ph)")->execute($chunk);
            $pdo->prepare("DELETE FROM subscriber_tags WHERE subscriber_id IN ($ph)")->execute($chunk);
            $pdo->prepare("DELETE FROM subscriber_flow_states WHERE subscriber_id IN ($ph)")->execute($chunk);
            $pdo->prepare("DELETE FROM subscribers WHERE id IN ($ph)")->execute($chunk);
            $deleted += count($chunk);
        }
        $pdo->commit();

        // Cập nhật lại số liệu thống kê để cho thấy đã được dọn
        // [FIX P32-C2] Added workspace_id guard on stat reset for correctness.
        $pdo->prepare("UPDATE campaigns SET count_unsubscribed = 0 WHERE id = ? AND workspace_id = ?")->execute([$cid, $workspace_id]);

        logSystemActivity($pdo, 'campaigns', 'delete_unsubscribed', $cid, "Campaign $cid", ['deleted_count' => $deleted]);
        jsonResponse(true, ['deleted' => $deleted]);
    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
    exit;
}

// --- NEW ROUTE: Unsubscribed List ---
if ($method === 'GET' && $route === 'unsubscribed_list') {
    try {
        $cid = $_GET['id'] ?? null;
        if (!$cid) jsonResponse(false, null, 'Campaign ID is required.');
        
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = ($page - 1) * $limit;

        $stmtSubIds = $pdo->prepare("SELECT DISTINCT subscriber_id FROM subscriber_activity WHERE campaign_id = ? AND type = 'unsubscribe'");
        $stmtSubIds->execute([$cid]);
        $subIds = $stmtSubIds->fetchAll(PDO::FETCH_COLUMN);

        if (empty($subIds)) {
            jsonResponse(true, ['data' => [], 'pagination' => ['total' => 0, 'page' => $page, 'limit' => $limit, 'totalPages' => 0]]);
            exit;
        }
        
        $placeholders = implode(',', array_fill(0, count($subIds), '?'));
        
        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM subscribers WHERE id IN ($placeholders)");
        $stmtCount->execute($subIds);
        $total = (int) $stmtCount->fetchColumn();
        
        $sql = "SELECT id, email, first_name, last_name, status, joined_at FROM subscribers WHERE id IN ($placeholders) ORDER BY joined_at DESC LIMIT $limit OFFSET $offset";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($subIds);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        jsonResponse(true, [
            'data' => $data,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'totalPages' => ceil($total / $limit)
            ]
        ]);
    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
    exit;
}

// --- NEW ROUTE: Trigger Audience Refresh ---
if ($method === 'POST' && $route === 'trigger_refresh') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        $campaignId = $data['id'] ?? $data['campaign_id'] ?? null;
        if (!$campaignId)
            jsonResponse(false, null, 'Campaign ID is required.');

        $stmtCheck = $pdo->prepare("SELECT status, target_config FROM campaigns WHERE id = ?");
        $stmtCheck->execute([$campaignId]);
        $campaign = $stmtCheck->fetch();
        $currentStatus = strtolower($campaign['status'] ?: '');

        $targetConf = json_decode($campaign['target_config'], true);
        $campaignType = $campaign['type'] ?? 'email';

        $countSql = "SELECT COUNT(DISTINCT s.id) FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer')";

        // ZNS Requirement: Must have phone number
        if ($campaignType === 'zalo_zns') {
            $countSql .= " AND (s.phone_number IS NOT NULL AND s.phone_number != '')";
        }

        $countWheres = [];
        $countParams = [];

        if (!empty($targetConf['listIds'])) {
            $placeholders = implode(',', array_fill(0, count($targetConf['listIds']), '?'));
            $countWheres[] = "s.id IN (SELECT subscriber_id FROM subscriber_lists WHERE list_id IN ($placeholders))";
            foreach ($targetConf['listIds'] as $lid)
                $countParams[] = $lid;
        }
        if (!empty($targetConf['tagIds'])) {
            $tagConditions = [];
            foreach ($targetConf['tagIds'] as $tagName) {
                $tagConditions[] = "s.id IN (SELECT st.subscriber_id FROM subscriber_tags st JOIN tags t_sub ON st.tag_id = t_sub.id
WHERE t_sub.name = ?)";
                $countParams[] = $tagName;
            }
            if (!empty($tagConditions)) {
                $countWheres[] = "(" . implode(' OR ', $tagConditions) . ")";
            }
        }
        if (!empty($targetConf['segmentIds'])) {
            foreach ($targetConf['segmentIds'] as $segId) {
                $stmtSeg = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
                $stmtSeg->execute([$segId]);
                $criteria = $stmtSeg->fetchColumn();
                if ($criteria) {
                    $res = buildSegmentWhereClause($criteria);
                    if ($res['sql'] !== '1=1') {
                        $countWheres[] = $res['sql'];
                        foreach ($res['params'] as $p)
                            $countParams[] = $p;
                    }
                }
            }
        }

        // [AUDIT-M3 FIX] Handle individualIds (hand-picked subscribers) in trigger_refresh
        if (!empty($targetConf['individualIds'])) {
            $indPlaceholders = implode(',', array_fill(0, count($targetConf['individualIds']), '?'));
            $countWheres[] = "s.id IN ($indPlaceholders)";
            $countParams = array_merge($countParams, $targetConf['individualIds']);
        }

        $totalAudience = 0;
        if (!empty($countWheres)) {
            $countSql .= " AND (" . implode(' OR ', $countWheres) . ")";
            $stmtCount = $pdo->prepare($countSql);
            $stmtCount->execute($countParams);
            $totalAudience = (int) $stmtCount->fetchColumn();
        }

        // [SELF-HEALING] Synchronize actual sent stats from activity logs before refreshing.
        // [FIX P32-C3] Added workspace_id guard to all 3 UPDATE queries here — previously
        // missing, allowing cross-workspace stat manipulation by supplying a foreign campaign_id.
        if ($campaignType === 'zalo_zns') {
            $pdo->prepare("UPDATE campaigns SET count_sent = (SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = ? AND type = 'zns_sent') WHERE id = ? AND workspace_id = ?")->execute([$campaignId, $campaignId, $workspace_id]);
        } else {
            $pdo->prepare("UPDATE campaigns SET count_sent = (SELECT COUNT(*) FROM mail_delivery_logs WHERE campaign_id = ? AND status = 'success') WHERE id = ? AND workspace_id = ?")->execute([$campaignId, $campaignId, $workspace_id]);
        }

        $stmt = $pdo->prepare("UPDATE campaigns SET status = 'sending', total_target_audience = ? WHERE id = ? AND workspace_id = ? AND
(LOWER(status) IN ('sent', 'sending', 'scheduled', 'draft', 'paused'))");
        $stmt->execute([$totalAudience, $campaignId, $workspace_id]);

        if ($stmt->rowCount() > 0 || $currentStatus === 'sending') {
            $workerUrl = API_BASE_URL . "/worker_campaign.php?campaign_id=$campaignId";

            // Log the trigger attempt
            if (function_exists('writeWorkerLog')) {
                writeWorkerLog("Triggering worker via campaigns.php for campaign $campaignId. URL: $workerUrl");
            } else {
                file_put_contents(__DIR__ . '/worker_campaign.log', "[" . date('Y-m-d H:i:s') . "] Triggering worker via campaigns.php
for campaign $campaignId. URL: $workerUrl\n", FILE_APPEND);
            }

            $cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $workerUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // Changed to true to capture result
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2); // [FIX P11-H1] was 0, disabling hostname verification
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['X-Cron-Secret: ' . $cronSecret]);
            $curlResult = curl_exec($ch);
            $curlError = curl_error($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($curlError) {
                file_put_contents(__DIR__ . '/worker_campaign.log', "[" . date('Y-m-d H:i:s') . "] CURL ERROR triggering worker:
$curlError\n", FILE_APPEND);
            }

            logSystemActivity($pdo, 'campaigns', 'refresh_audience', $campaignId, "Campaign $campaignId", ['audience' => $totalAudience]);

            // [FIX P11-H4] Removed debug block from production response. Internal worker_url and
            // curl_result were previously surfaced to frontend, leaking server-side implementation
            // details (internal API paths, HTTP codes) to any user with campaign refresh access.
            jsonResponse(true, [
                'total_target_audience' => $totalAudience
            ], 'Campaign refresh triggered.');
        } else {
            jsonResponse(false, null, "Campaign cannot be refreshed (not in 'sent' state).");
        }

    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
}

// --- NEW ROUTE: Click Summary (Unique Links + Global Stats) ---
if ($method === 'GET' && $route === 'click_summary') {
    try {
        $campaignId = $_GET['id'] ?? null;
        if (!$campaignId)
            jsonResponse(false, null, 'Campaign ID is required.');

        $device = $_GET['device'] ?? null;
        $os = $_GET['os'] ?? null;
        $params = [$campaignId];

        // 1. Get List of Links
        $sql = "SELECT details, COUNT(*) as total_clicks, COUNT(DISTINCT subscriber_id) as unique_clicks FROM
subscriber_activity WHERE campaign_id = ? AND type = 'click_link'";
        if ($device) {
            $sql .= " AND device_type = ?";
            $params[] = $device;
        }
        if ($os) {
            $sql .= " AND os = ?";
            $params[] = $os;
        }
        $sql .= " GROUP BY details ORDER BY total_clicks DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $links = $stmt->fetchAll();
        foreach ($links as &$l) {
            $l['url'] = str_replace('Clicked link: ', '', $l['details']);
            unset($l['details']);
        }

        // 2. Get Global Unique Clicks (Unique Users)
// Reset params for global count
        $globalParams = [$campaignId];
        $globalSql = "SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = ? AND type =
'click_link'";
        if ($device) {
            $globalSql .= " AND device_type = ?";
            $globalParams[] = $device;
        }
        if ($os) {
            $globalSql .= " AND os = ?";
            $globalParams[] = $os;
        }
        $stmtGlobal = $pdo->prepare($globalSql);
        $stmtGlobal->execute($globalParams);
        $totalUniqueUsers = (int) $stmtGlobal->fetchColumn();

        jsonResponse(true, [
            'links' => $links,
            'overall' => [
                'unique_clicks' => $totalUniqueUsers
            ]
        ]);
    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
}

// --- NEW ROUTE: Click Details (Individual Events) ---
if ($method === 'GET' && $route === 'click_details') {
    try {
        $campaignId = $_GET['id'] ?? null;
        if (!$campaignId)
            jsonResponse(false, null, 'Campaign ID is required.');

        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
        $offset = ($page - 1) * $limit;
        $search = $_GET['search'] ?? '';
        $linkFilter = $_GET['link'] ?? '';

        $params = [$campaignId];
        $whereClauses = ["sa.campaign_id = ?", "sa.type = 'click_link'", "sa.location != 'Google Proxy'"];

        if ($search) {
            $whereClauses[] = "(s.email LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        if ($linkFilter) {
            $whereClauses[] = "sa.details LIKE ?";
            $params[] = "%$linkFilter%";
        }

        $whereSql = implode(" AND ", $whereClauses);
        if ($search) {
            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity sa JOIN subscribers s ON sa.subscriber_id = s.id
WHERE $whereSql");
        } else {
            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity sa WHERE $whereSql");
        }
        $stmtCount->execute($params);
        $total = (int) $stmtCount->fetchColumn();

        $sql = "SELECT sa.id, sa.subscriber_id, sa.details, sa.created_at, s.email, s.first_name, s.last_name, sa.ip_address,
sa.device_type, sa.os, sa.location
FROM subscriber_activity sa JOIN subscribers s ON sa.subscriber_id = s.id WHERE $whereSql ORDER BY sa.created_at DESC
LIMIT $limit OFFSET $offset";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $clicks = $stmt->fetchAll();

        foreach ($clicks as &$c) {
            $c['url'] = str_replace('Clicked link: ', '', $c['details']);
            unset($c['details']);
        }

        jsonResponse(true, [
            'clicks' => $clicks,
            'pagination' => ['total' => $total, 'page' => $page, 'limit' => $limit, 'totalPages' => ceil($total / $limit)]
        ]);
    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
}

// --- NEW ROUTE: Technology & Location Stats ---
if ($method === 'GET' && $route === 'tech_stats') {
    try {
        $campaignId = $_GET['id'] ?? null;
        if (!$campaignId)
            jsonResponse(false, null, 'Campaign ID is required.');

        $getStats = function ($col) use ($pdo, $campaignId) {
            $locFilter = $col === 'location' ? " AND $col != 'Google Proxy' " : "";
            $sql = "SELECT $col as name, COUNT(*) as value FROM subscriber_activity WHERE campaign_id = ? AND type IN ('open_email', 'click_link')
AND $col IS NOT NULL AND $col != '' $locFilter GROUP BY $col ORDER BY value DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$campaignId]);
            return $stmt->fetchAll();
        };

        jsonResponse(true, [
            'device' => $getStats('device_type'),
            'os' => $getStats('os'),
            'browser' => $getStats('browser'),
            'location' => $getStats('location')
        ]);
    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
}

// --- NEW ROUTE: Send Test (Email & ZNS) ---
// [FIX] Changed from a broad payload-sniffing condition to a proper REST route.
// Previous condition: ($method === 'POST' || ($method === 'PUT' && $path)) && isset($inputData['email'])
// DANGER: Any PUT/save payload that accidentally contained an 'email' key (e.g. senderEmail
// mapped wrong, or test email field left populated in form state) would:
//   1. Trigger a real test email being sent unexpectedly.
//   2. If jsonResponse() lacks exit, fall through to switch($method) and emit ANOTHER JSON
//      response → Frontend crash on JSON.parse (two JSON objects concatenated).
// Now uses the same ?route=send_test pattern as all other routes in this file.
$inputData = json_decode(file_get_contents("php://input"), true);
if ($method === 'POST' && $route === 'send_test') {
    try {
        $data = $inputData;
        $campaignId = $data['campaign_id'];
        $reminderId = $data['reminder_id'] ?? null;

        // Fetch Campaign First to Determine Type
        // [FIX P39-CAM] Explicit columns — avoids loading subscriber_data/large blobs into memory
        $stmtCamp = $pdo->prepare("SELECT id, type, subject, template_id, custom_html, content_body, attachments, config FROM campaigns WHERE id = ? LIMIT 1");
        $stmtCamp->execute([$campaignId]);
        $campaign = $stmtCamp->fetch();

        if (!$campaign) {
            jsonResponse(false, null, 'Campaign not found.');
        }

        $type = $campaign['type'] ?? 'email';

        if ($type === 'zalo_zns') {
            // --- ZNS TEST LOGIC ---
            if (empty($data['phone'])) {
                jsonResponse(false, null, 'Phone number is required for ZNS test.');
            }
            require_once 'zalo_sender.php';

            $targetPhone = $data['phone'];
            $config = json_decode($campaign['config'] ?? '{}', true);
            $oaId = $config['oa_config_id'] ?? '';
            $templateId = $campaign['template_id'];

            if (!$oaId || !$templateId) {
                jsonResponse(false, null, 'Missing OA or Template in campaign config.');
            }

            // Prepare Template Data (Mock Data for Test)
            $templateData = [];
            // We could try to use mapped params with dummy data, or just empty if template allows
// Better: Use the mapped keys and fill with "Test Data"
            $mappedParams = $config['mapped_params'] ?? [];
            foreach ($mappedParams as $key => $field) {
                // If the user mapped "full_name", send "User Name Test"
                if (strpos($field, 'name') !== false) {
                    $templateData[$key] = 'User Name Test';
                } elseif (strpos($field, 'phone') !== false) {
                    $templateData[$key] = $targetPhone;
                } else {
                    $templateData[$key] = 'Test Value';
                }
            }

            // If manual params (inputMode='manual' in frontend stored in mapped_params effectively as literals),
// the above loop might need adjustment if logic differs, but currently mapped_params stores keys.
// Actually, if inputMode is 'manual', the value in config IS the value.
// But usually ZNS expects key => value.
// Let's assume for test we just use what's in mapped_params if it's not {{...}}
// If it is {{...}}, we replace.

            $finalTemplateData = [];
            foreach ($mappedParams as $key => $val) {
                if (strpos($val, '{{') === 0 && strpos($val, '}}') === strlen($val) - 2) {
                    // It's a variable
                    $finalTemplateData[$key] = "Test " . trim($val, '{}');
                } else {
                    // Literal
                    $finalTemplateData[$key] = $val;
                }
            }

            // Send
            $res = sendZNSMessage($pdo, $oaId, $templateId, $targetPhone, $finalTemplateData, null, null, 'test_user', 'test');

            if ($res['success']) {
                logSystemActivity($pdo, 'campaigns', 'send_test', $campaignId, "Campaign $campaignId", ['target' => $targetPhone]);
                jsonResponse(true, null, 'ZNS test sent successfully.');
            } else {
                jsonResponse(false, null, 'ZNS Test Failed: ' . ($res['message'] ?? 'Unknown error'));
            }

        } else {
            // --- EMAIL TEST LOGIC ---
            if (empty($data['email'])) {
                jsonResponse(false, null, 'Email is required for Email test.');
            }
            $targetEmail = $data['email'];

            // [FIX] Removed scheduledAt validation from Send Test.
            // Test emails must be sent IMMEDIATELY regardless of the campaign's scheduled date.
            // Checking if scheduledAt > now+5min here was copy-pasted from the campaign
            // scheduling logic and prevented admins from testing future-scheduled campaigns.
            require_once 'Mailer.php';
            $subscriber = [
                'first_name' => 'Nhà quảng cáo',
                'last_name' => 'Test',
                'email' =>
                    $targetEmail
            ];
            $subject = '';
            $htmlContent = '';

            if ($reminderId) {
                // [FIX P39-CAM] Explicit columns for reminder lookup
                $stmtRem = $pdo->prepare("SELECT id, subject, template_id, config FROM campaign_reminders WHERE id = ? LIMIT 1");
                $stmtRem->execute([$reminderId]);
                $reminder = $stmtRem->fetch();
                if ($reminder) {
                    $subject = "[TEST] " . $reminder['subject'];
                    $htmlContent = resolveEmailContent($pdo, $reminder['template_id'], '', '');
                    $attachmentsRaw = $campaign['attachments']; // Fallback
                }
            } else {
                if ($campaign) {
                    $subject = "[TEST] " . $campaign['subject'];
                    $htmlContent = resolveEmailContent(
                        $pdo,
                        $campaign['template_id'],
                        $campaign['custom_html'] ?? '',
                        $campaign['content_body']
                    );
                    $attachmentsRaw = $campaign['attachments'];
                }
            }

            if (empty($htmlContent))
                jsonResponse(false, null, 'Content not found.');

            $allAttachments = json_decode($attachmentsRaw ?? '[]', true);
            $filteredAttachments = Mailer::filterAttachments($allAttachments, $targetEmail);

            $finalSubject = replaceMergeTags($subject, $subscriber);
            $finalHtml = replaceMergeTags($htmlContent, $subscriber);
            $stmtSettings = $pdo->query("SELECT `key`, `value` FROM system_settings");
            $settings = $stmtSettings->fetchAll(PDO::FETCH_KEY_PAIR);
            $defaultSender = $settings['smtp_user'] ?? "marketing@ka-en.com.vn";
            $mailer = new Mailer($pdo, API_BASE_URL, $defaultSender);
            $testLabel = $reminderId ? "Test Reminder: " . $reminder['subject'] : "Test Campaign: " . $campaign['name'];
            $res = $mailer->send(
                $targetEmail,
                $finalSubject,
                $finalHtml,
                null,
                null,
                null,
                null,
                $filteredAttachments,
                null,
                null,
                $testLabel
            );

            if ($res === true) {
                logSystemActivity($pdo, 'campaigns', 'send_test', $campaignId, "Campaign $campaignId", ['target' => $targetEmail]);
                jsonResponse(true, null, 'Test email sent successfully.');
            } else
                jsonResponse(false, null, 'Failed to send test email: ' . (is_string($res) ? $res : 'Unknown error'));
        }
    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
}

switch ($method) {
    case 'GET':
        // [PERF] Release session lock immediately to prevent "Pending" state in DevTools
        // when Frontend sends multiple parallel requests (Campaigns, Flows, etc. load simultaneously)
        if (session_id()) session_write_close();

        try {
            if ($path) {
                if ($route === 'recipients') {
                    $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
                    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 20;
                    $offset = ($page - 1) * $limit;

                    $filterStatus = $_GET['status'] ?? 'all';
                    $filterType = $_GET['type'] ?? 'all';
                    $search = $_GET['search'] ?? '';

                    // Fetch Campaign Type first to decide table
                    $stmtC = $pdo->prepare("SELECT type FROM campaigns WHERE id = ?");
                    $stmtC->execute([$path]);
                    $cType = $stmtC->fetchColumn() ?: 'email';
                    $isZns = $cType === 'zalo_zns';

                    $params = [];
                    $idColumn = $isZns ? "l.flow_id" : "l.campaign_id";
                    $whereClauses = ["$idColumn = ?"];
                    $params[] = $path; // campaign_id or flow_id

                    if ($filterType === 'Main Campaign') {
                        $whereClauses[] = "(l.reminder_id IS NULL OR l.reminder_id = '')";
                    } elseif ($filterType === 'Reminder') {
                        $whereClauses[] = "(l.reminder_id IS NOT NULL AND l.reminder_id != '')";
                    }

                    if ($isZns) {
                        // ZNS LOGIC
                        if ($filterStatus !== 'all') {
                            if ($filterStatus === 'opened' || $filterStatus === 'seen') {
                                $whereClauses[] = "l.status = 'seen'";
                            } elseif ($filterStatus === 'success' || $filterStatus === 'sent') {
                                $whereClauses[] = "l.status = 'sent'";
                            } elseif ($filterStatus === 'failed') {
                                $whereClauses[] = "l.status = 'failed'";
                            }
                        }

                        if (!empty($search)) {
                            $whereClauses[] = "l.phone_number LIKE ?";
                            $params[] = "%$search%";
                        }

                        $whereSql = implode(' AND ', $whereClauses);

                        $sqlCount = "SELECT COUNT(*) FROM zalo_delivery_logs l LEFT JOIN subscribers s ON l.subscriber_id = s.id WHERE
    $whereSql";
                        $stmtCount = $pdo->prepare($sqlCount);
                        $stmtCount->execute($params);
                        $total = (int) $stmtCount->fetchColumn();
                        $totalPages = ceil($total / $limit);

                        if (isset($_GET['return_ids_only']) && $_GET['return_ids_only'] == 1) {
                            $sql = "SELECT s.id as subscriber_id FROM zalo_delivery_logs l LEFT JOIN subscribers s ON l.subscriber_id = s.id WHERE $whereSql AND s.id IS NOT NULL";
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute($params);
                            $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
                            jsonResponse(true, ['ids' => $ids]);
                        }

                        $sql = "SELECT l.phone_number as email, s.id as subscriber_id, l.status as delivery_status, l.sent_at,
    l.error_message, NULL as reminder_id, s.first_name, s.last_name, s.status as subscriber_status
    FROM zalo_delivery_logs l LEFT JOIN subscribers s ON l.subscriber_id = s.id WHERE $whereSql ORDER BY l.sent_at DESC
    LIMIT $limit OFFSET $offset";

                        $stmt = $pdo->prepare($sql);
                        $stmt->execute($params);
                        $recipients = $stmt->fetchAll(PDO::FETCH_ASSOC);

                        // [PERF FIX] Merged 4 separate ZNS stats queries into 1 GROUP BY.
                        // Old: 4 round-trips on large zalo_delivery_logs tables = contention + latency.
                        // New: 1 query → PHP aggregation. Same semantics, 4x fewer locks.
                        $stats = ['total' => 0, 'sent' => 0, 'failed' => 0, 'opened' => 0];
                        $stmtZnsSt = $pdo->prepare("SELECT status, COUNT(*) as cnt FROM zalo_delivery_logs WHERE flow_id = ? GROUP BY status");
                        $stmtZnsSt->execute([$path]);
                        foreach ($stmtZnsSt->fetchAll(PDO::FETCH_KEY_PAIR) as $zStatus => $zCount) {
                            $stats['total'] += (int)$zCount;
                            if (in_array($zStatus, ['sent', 'delivered', 'seen'])) $stats['sent'] += (int)$zCount;
                            if ($zStatus === 'failed') $stats['failed'] = (int)$zCount;
                            if ($zStatus === 'seen') $stats['opened'] = (int)$zCount;
                        }

                        foreach ($recipients as &$r) {
                            $r['type'] = !empty($r['reminder_id']) ? 'Reminder' : 'Main Campaign';
                            $r['open_count'] = $r['delivery_status'] === 'seen' ? 1 : 0;
                            $r['click_count'] = 0; // ZNS click tracking not implemented yet or different
                        }

                    } else {
                        // EMAIL LOGIC
                        if ($filterStatus !== 'all') {
                            if ($filterStatus === 'opened') {
                                $whereClauses[] = "EXISTS (SELECT 1 FROM subscriber_activity a WHERE a.campaign_id = l.campaign_id AND a.subscriber_id = s.id AND a.type = 'open_email')";
                            } elseif ($filterStatus === 'clicked') {
                                $whereClauses[] = "EXISTS (SELECT 1 FROM subscriber_activity a WHERE a.campaign_id = l.campaign_id AND a.subscriber_id = s.id AND a.type = 'click_link')";
                            } elseif ($filterStatus === 'success') {
                                $whereClauses[] = "l.status = 'success'";
                            } elseif ($filterStatus === 'failed') {
                                $whereClauses[] = "l.status = 'failed'";
                            } elseif ($filterStatus === 'unsubscribed') {
                                $whereClauses[] = "EXISTS (SELECT 1 FROM subscriber_activity a WHERE a.campaign_id = l.campaign_id AND a.subscriber_id = s.id AND a.type = 'unsubscribe')";
                            }
                        }

                        // [FILTER] Min Opens / Clicks
                        $minOpens = isset($_GET['min_opens']) ? (int) $_GET['min_opens'] : 0;
                        if ($minOpens > 0) {
                            // [FIX] Use HAVING on a joined subquery instead of correlated subquery interpolation
                            $whereClauses[] = "(SELECT COUNT(*) FROM subscriber_activity a WHERE a.campaign_id = l.campaign_id AND a.subscriber_id = s.id AND a.type = 'open_email') >= ?";
                            $params[] = $minOpens;
                        }

                        $minClicks = isset($_GET['min_clicks']) ? (int) $_GET['min_clicks'] : 0;
                        if ($minClicks > 0) {
                            $whereClauses[] = "(SELECT COUNT(*) FROM subscriber_activity a WHERE a.campaign_id = l.campaign_id AND a.subscriber_id = s.id AND a.type = 'click_link') >= ?";
                            $params[] = $minClicks;
                        }

                        if (!empty($search)) {
                            $whereClauses[] = "l.recipient LIKE ?";
                            $params[] = "%$search%";
                        }

                        $whereSql = implode(' AND ', $whereClauses);

                        $sqlCount = "SELECT COUNT(*) FROM mail_delivery_logs l LEFT JOIN subscribers s ON l.recipient = s.email WHERE
    $whereSql";
                        $stmtCount = $pdo->prepare($sqlCount);
                        $stmtCount->execute($params);
                        $total = (int) $stmtCount->fetchColumn();
                        $totalPages = ceil($total / $limit);

                        if (isset($_GET['return_ids_only']) && $_GET['return_ids_only'] == 1) {
                            $sql = "SELECT s.id as subscriber_id FROM mail_delivery_logs l LEFT JOIN subscribers s ON l.recipient = s.email WHERE $whereSql AND s.id IS NOT NULL";
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute($params);
                            $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
                            jsonResponse(true, ['ids' => $ids]);
                        }

                        $sql = "SELECT l.recipient as email, s.id as subscriber_id, l.status as delivery_status, l.sent_at, l.error_message,
    l.reminder_id, s.first_name, s.last_name, s.status as subscriber_status
    FROM mail_delivery_logs l LEFT JOIN subscribers s ON l.recipient = s.email WHERE $whereSql ORDER BY l.sent_at DESC
    LIMIT $limit OFFSET $offset";

                        $stmt = $pdo->prepare($sql);
                        $stmt->execute($params);
                        $recipients = $stmt->fetchAll(PDO::FETCH_ASSOC);

                        // [PERF] Batch Fetch Activity Counts
                        if (!empty($recipients)) {
                            $subIds = array_filter(array_column($recipients, 'subscriber_id'));
                            $metrics = [];
                            if (!empty($subIds)) {
                                $placeholders = implode(',', array_fill(0, count($subIds), '?'));
                                $stmtMet = $pdo->prepare("SELECT subscriber_id, type, COUNT(*) as count FROM subscriber_activity WHERE campaign_id =
    ? AND subscriber_id IN ($placeholders) AND type IN ('open_email', 'click_link') GROUP BY subscriber_id, type");
                                $stmtMet->execute(array_merge([$path], $subIds));
                                $rows = $stmtMet->fetchAll();
                                foreach ($rows as $r) {
                                    if (!isset($metrics[$r['subscriber_id']]))
                                        $metrics[$r['subscriber_id']] = ['open' => 0, 'click' => 0];
                                    if ($r['type'] === 'open_email')
                                        $metrics[$r['subscriber_id']]['open'] = $r['count'];
                                    if ($r['type'] === 'click_link')
                                        $metrics[$r['subscriber_id']]['click'] = $r['count'];
                                }
                            }

                            foreach ($recipients as &$r) {
                                $r['type'] = !empty($r['reminder_id']) ? 'Reminder' : 'Main Campaign';
                                $sid = $r['subscriber_id'];
                                $r['open_count'] = $metrics[$sid]['open'] ?? 0;
                                $r['click_count'] = $metrics[$sid]['click'] ?? 0;
                            }
                        }

                        // [PERF FIX] Merged 4 separate COUNT queries into 1 GROUP BY.
                        // Old: 4 round-trips × all concurrent admin users = heavy lock pressure on mail_delivery_logs.
                        // New: 1 query → PHP aggregation.
                        $stats = ['total' => 0, 'sent' => 0, 'failed' => 0, 'opened' => 0];
                        $stmtLog = $pdo->prepare("SELECT status, COUNT(*) as cnt FROM mail_delivery_logs WHERE campaign_id = ? GROUP BY status");
                        $stmtLog->execute([$path]);
                        foreach ($stmtLog->fetchAll(PDO::FETCH_KEY_PAIR) as $s => $c) {
                            $stats['total'] += (int)$c;
                            if ($s === 'success') $stats['sent'] = (int)$c;
                            if ($s === 'failed')  $stats['failed'] = (int)$c;
                        }
                        $stmtO = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = ? AND type = 'open_email'");
                        $stmtO->execute([$path]);
                        $stats['opened'] = (int) $stmtO->fetchColumn();
                    }

                    jsonResponse(true, [
                        'data' => $recipients,
                        'pagination' => [
                            'total' => $total,
                            'totalPages' => $totalPages,
                            'page'
                            => $page,
                            'limit' => $limit
                        ],
                        'stats' => $stats
                    ]);
                }

                // [FIX P42-C1] SELECT * loaded full content_body (can be MBs of HTML) for every campaign GET.
                // Explicit columns only — content_body is fetched indirectly via resolveEmailContent() for sends anyway.
                $stmt = $pdo->prepare("SELECT id, workspace_id, name, subject, sender_email, status, sent_at, scheduled_at,
                    template_id, content_body, custom_html, target_config, count_sent, count_opened, count_unique_opened,
                    count_clicked, count_unique_clicked, count_bounced, count_spam, count_unsubscribed, tracking_enabled,
                    created_at, updated_at, type, config, total_target_audience, attachments,
                    is_deleted FROM campaigns WHERE id = ?");
                $stmt->execute([$path]);
                $camp = $stmt->fetch();
                if ($camp) {
                    // [PERF FIX] Self-healing throttle: only sync once per 60s per campaign.
                    // Old: every GET fired up to 6 SELECT+UPDATE queries regardless of freshness.
                    // New: updated_at acts as a TTL — skip sync if data was written < 60s ago.
                    $lastUpdated = strtotime($camp['updated_at'] ?? '2000-01-01');
                    $syncNeeded = (time() - $lastUpdated) > 60;

                    // [SELF-HEALING] inconsistencies in count_unsubscribed
                    if ($syncNeeded && empty($camp['count_unsubscribed'])) {
                        $stmtUnsub = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = ? AND type = 'unsubscribe'");
                        $stmtUnsub->execute([$path]);
                        $realUnsub = (int) $stmtUnsub->fetchColumn();
                        if ($realUnsub > 0) {
                            $camp['count_unsubscribed'] = $realUnsub;
                            $pdo->prepare("UPDATE campaigns SET count_unsubscribed = ? WHERE id = ?")->execute([$realUnsub, $path]);
                        }
                    }

                    // [SELF-HEALING] count_sent sync (only while sending, throttled)
                    if ($syncNeeded && strtolower($camp['status'] ?? '') === 'sending') {
                        $isZns = ($camp['type'] ?? '') === 'zalo_zns';
                        $statsSql = $isZns
                            ? "SELECT COUNT(*) FROM zalo_delivery_logs WHERE flow_id = ? AND status IN ('sent', 'seen', 'delivered')"
                            : "SELECT COUNT(*) FROM mail_delivery_logs WHERE campaign_id = ? AND status = 'success'";
                        $stmtSync = $pdo->prepare($statsSql);
                        $stmtSync->execute([$path]);
                        $realSent = (int)$stmtSync->fetchColumn();
                        if ($realSent > (int)$camp['count_sent']) {
                            $camp['count_sent'] = $realSent;
                            $pdo->prepare("UPDATE campaigns SET count_sent = ? WHERE id = ?")->execute([$realSent, $path]);
                        }
                    }

                    // [SELF-HEALING] Clicks + Opens sync (throttled, 1 query + at most 1 write)
                    if ($syncNeeded && in_array(strtolower($camp['status'] ?? ''), ['sent', 'sending'])) {
                        // [PERF] Merged 2 separate SELECT queries into 1 GROUP BY
                        $stmtAS = $pdo->prepare("SELECT type, COUNT(*) as total, COUNT(DISTINCT subscriber_id) as unique_count
                            FROM subscriber_activity WHERE campaign_id = ? AND type IN ('click_link','open_email') GROUP BY type");
                        $stmtAS->execute([$path]);
                        $aStats = [];
                        foreach ($stmtAS->fetchAll() as $r) $aStats[$r['type']] = $r;

                        $needsWrite = false;
                        if (!empty($aStats['click_link'])) {
                            $cl = $aStats['click_link'];
                            if ((int)$camp['count_unique_clicked'] !== (int)$cl['unique_count'] || (int)$camp['count_clicked'] !== (int)$cl['total']) {
                                $camp['count_clicked'] = (int)$cl['total'];
                                $camp['count_unique_clicked'] = (int)$cl['unique_count'];
                                $needsWrite = true;
                            }
                        }
                        if (!empty($aStats['open_email'])) {
                            $op = $aStats['open_email'];
                            if ((int)$camp['count_unique_opened'] !== (int)$op['unique_count'] || (int)$camp['count_opened'] !== (int)$op['total']) {
                                $camp['count_opened'] = (int)$op['total'];
                                $camp['count_unique_opened'] = (int)$op['unique_count'];
                                $needsWrite = true;
                            }
                        }
                        // [PERF] 1 combined UPDATE for all 4 columns instead of 2 separate UPDATEs
                        if ($needsWrite) {
                            $pdo->prepare("UPDATE campaigns SET count_clicked=?, count_unique_clicked=?, count_opened=?, count_unique_opened=? WHERE id=?")
                                ->execute([$camp['count_clicked'], $camp['count_unique_clicked'], $camp['count_opened'], $camp['count_unique_opened'], $path]);
                        }
                    }

                    $data = formatCampaign($camp);
                    // [FIX P42-C2] SELECT * on campaign_reminders — explicit columns only
                    $stmtRem = $pdo->prepare("SELECT id, campaign_id, type, trigger_mode, delay_days, delay_hours,
                        scheduled_at, subject, template_id FROM campaign_reminders WHERE campaign_id = ?");
                    $stmtRem->execute([$path]);
                    $reminders = $stmtRem->fetchAll();
                    $data['reminders'] = array_map(function ($r) {
                        return [
                            'id' => $r['id'],
                            'type' => $r['type'],
                            'triggerMode' => $r['trigger_mode'],
                            'delayDays' =>
                                $r['delay_days'],
                            'delayHours' => $r['delay_hours'],
                            'scheduledAt' => $r['scheduled_at'],
                            'subject' =>
                                $r['subject'],
                            'templateId' => $r['template_id']
                        ];
                    }, $reminders);
                    jsonResponse(true, $data);
                } else {
                    jsonResponse(false, null, 'Not found');
                }
            } else {
                $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
                $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
                $offset = ($page - 1) * $limit;
                $search = $_GET['search'] ?? '';
                $startDate = $_GET['startDate'] ?? '';
                $endDate = $_GET['endDate'] ?? '';
                $fetchAll = (!isset($_GET['page']) && !isset($_GET['limit']) && !isset($_GET['search']));

                $params = [$workspace_id];
                // [FIX P0] workspace_id previously interpolated as integer literal — switched to
                // prepared param for type-correctness and consistency with all other workspace filters.
                $whereClauses = ['is_deleted = 0', 'workspace_id = ?'];
                if ($search) {
                    $whereClauses[] = "(name LIKE ? OR subject LIKE ?)";
                    $params[] = "%$search%";
                    $params[] = "%$search%";
                }
                if ($startDate) {
                    $whereClauses[] = "created_at >= ?";
                    $params[] = $startDate . ' 00:00:00';
                }
                if ($endDate) {
                    $whereClauses[] = "created_at <= ?";
                    $params[] = $endDate . ' 23:59:59';
                }

                $whereSql = " WHERE " . implode(" AND ", $whereClauses);

                $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM campaigns" . $whereSql);
                $stmtCount->execute($params);
                $total = (int) $stmtCount->fetchColumn();

                $sql = "SELECT id, name, subject, status, sent_at, scheduled_at, sender_email, template_id, target_config,
    count_sent, count_opened, count_unique_opened, count_clicked, count_unique_clicked, count_bounced, count_spam,
    count_unsubscribed, tracking_enabled, created_at, updated_at, type, config, total_target_audience,
    (SELECT COUNT(*) FROM campaign_reminders cr WHERE cr.campaign_id = c.id) as reminder_count
    FROM campaigns c" .
                    $whereSql . " ORDER BY c.created_at DESC";
                
                if (!$fetchAll) {
                    $sql .= " LIMIT $limit OFFSET $offset";
                }

                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $camps = $stmt->fetchAll();

                // [PERF OPTIMIZATION] Avoid loading and json_decoding ALL flows in the system.
                // We ONLY query for flows linked to the specific campaigns we just fetched.
                // We use a highly efficient single LIKE or trigger_type filter instead of N LIKE clauses.
                $linkedFlows = [];
                if (!empty($camps)) {
                    $campIds = array_column($camps, 'id');
                    
                    // Fetch only flows that are triggered by a campaign.
                    // Checking `trigger_type = 'campaign'` uses an index if available. 
                    // `steps LIKE` is a fallback for legacy flows without `trigger_type` correctly set yet.
                    $flowSql = "SELECT id, name, status, steps FROM flows WHERE status != 'archived' AND (trigger_type = 'campaign' OR (trigger_type IS NULL AND steps LIKE '%\"type\":\"campaign\"%'))";
                    
                    try {
                        $stmtFlows = $pdo->prepare($flowSql);
                        $stmtFlows->execute();
                        while ($f = $stmtFlows->fetch(PDO::FETCH_ASSOC)) {
                            $steps = json_decode($f['steps'] ?? '[]', true);
                            if (is_array($steps)) {
                                foreach ($steps as $s) {
                                    if (($s['type'] ?? '') === 'trigger' && ($s['config']['type'] ?? '') === 'campaign') {
                                        $cId = $s['config']['targetId'] ?? null;
                                        if ($cId && in_array($cId, $campIds)) {
                                            $linkedFlows[$cId] = ['id' => $f['id'], 'name' => $f['name'], 'status' => $f['status']];
                                        }
                                        break; // Found the trigger, break step loop
                                    }
                                }
                            }
                        }
                    } catch (Exception $e) {
                        error_log("Failed to load linked flows for campaigns API: " . $e->getMessage());
                    }
                }

                $data = array_map(function ($c) use ($linkedFlows) {
                    $fmt = formatCampaign($c);
                    if (isset($linkedFlows[$fmt['id']])) {
                        $fmt['linkedFlow'] = $linkedFlows[$fmt['id']];
                    }
                    return $fmt;
                }, $camps);

                if ($fetchAll) {
                    jsonResponse(true, $data);
                } else {
                    jsonResponse(true, [
                        'data' => $data,
                        'pagination' => [
                            'total' => $total,
                            'page' => $page,
                            'limit' => $limit,
                            'totalPages' => ceil($total / $limit)
                        ]
                    ]);
                }
            }
        } catch (Throwable $e) {
            jsonResponse(false, null, $e->getMessage());
        }
        break;

    case 'POST':
        try {
            if ($route === 'estimate_reach') {
                $data = json_decode(file_get_contents("php://input"), true);
                $listIds = $data['listIds'] ?? [];
                $tagIds = $data['tagIds'] ?? [];
                $segmentIds = $data['segmentIds'] ?? [];
                $campaignType = $data['campaignType'] ?? 'email';

                $sql = "SELECT COUNT(DISTINCT s.id) FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer')";

                // ZNS Requirement: Must have phone number
                if ($campaignType === 'zalo_zns') {
                    $sql .= " AND (s.phone_number IS NOT NULL AND s.phone_number != '')";
                }

                $wheres = [];
                $execParams = [];

                if (!empty($listIds)) {
                    // [BUG-G1 FIX] Use parameterized query instead of string interpolation (SQL injection risk)
                    $placeholders = implode(',', array_fill(0, count($listIds), '?'));
                    $wheres[] = "s.id IN (SELECT subscriber_id FROM subscriber_lists WHERE list_id IN ($placeholders))";
                    $execParams = array_merge($execParams, $listIds);
                }
                if (!empty($tagIds)) {
                    $tagConditions = [];
                    foreach ($tagIds as $tag) {
                        $tagConditions[] = "s.id IN (SELECT st.subscriber_id FROM subscriber_tags st JOIN tags t_sub ON st.tag_id = t_sub.id WHERE t_sub.name = ?)";
                        $execParams[] = $tag;
                    }
                    if (!empty($tagConditions))
                        $wheres[] = "(" . implode(' OR ', $tagConditions) . ")";
                }
                if (!empty($segmentIds)) {
                    // [BUG-G1 FIX] Use parameterized query instead of string interpolation
                    $placeholders = implode(',', array_fill(0, count($segmentIds), '?'));
                    $stmtSegs = $pdo->prepare("SELECT criteria FROM segments WHERE id IN ($placeholders)");
                    $stmtSegs->execute($segmentIds);
                    $segments = $stmtSegs->fetchAll();
                    foreach ($segments as $seg) {
                        $res = buildSegmentWhereClause($seg['criteria']);
                        if ($res['sql'] !== '1=1') {
                            $wheres[] = $res['sql'];
                            foreach ($res['params'] as $p)
                                $execParams[] = $p;
                        }
                    }
                }

                if (!empty($wheres)) {
                    $sql .= " AND (" . implode(' OR ', $wheres) . ")";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($execParams);
                    $count = $stmt->fetchColumn();
                    jsonResponse(true, ['count' => (int) $count]);
                } else {
                    jsonResponse(true, ['count' => 0]);
                }
            }

            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? uniqid();
            $sql = "INSERT INTO campaigns (workspace_id, id, name, subject, sender_email, status, template_id, content_body, target_config,
    tracking_enabled, scheduled_at, attachments, type, config, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, NOW())";
            $stmt = $pdo->prepare($sql);
            
            $isAdmin = ($GLOBALS['current_admin_id'] === 'admin-001');
            if (!$isAdmin && in_array(strtolower($data['status'] ?? ''), ['sending', 'scheduled', 'sent'])) {
                $data['status'] = 'draft';
            }
            
            $targetJson = json_encode($data['target']);
            $attachmentsJson = json_encode($data['attachments'] ?? []);
            $configJson = json_encode($data['config'] ?? []);
            $tracking = $data['trackingEnabled'] ? 1 : 0;
            $stmt->execute([
                $workspace_id,
                $id,
                $data['name'],
                $data['subject'],
                $data['senderEmail'],
                $data['status'],
                $data['templateId'],
                $data['contentBody'],
                $targetJson,
                $tracking,
                $data['scheduledAt'] ?? null,
                $attachmentsJson,
                $data['type'] ??
                'email',
                $configJson
            ]);
            logSystemActivity($pdo, 'campaigns', 'create', $id, $data['name'], ['type' => $data['type'] ?? 'email', 'status' => $data['status']]);

            if (!empty($data['reminders'])) {
                $stmtRem = $pdo->prepare("INSERT INTO campaign_reminders (id, campaign_id, type, trigger_mode, delay_days,
    delay_hours, scheduled_at, subject, template_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($data['reminders'] as $r) {
                    $stmtRem->execute([
                        $r['id'] ?? uniqid(),
                        $id,
                        $r['type'],
                        $r['triggerMode'],
                        $r['delayDays'],
                        $r['delayHours'],
                        $r['scheduledAt'] ?? null,
                        $r['subject'],
                        $r['templateId']
                    ]);
                }
            }
            $data['id'] = $id;
            if (strtolower($data['status'] ?? '') === 'sending') {
                dispatchCampaignWorker($pdo, $id);
            }
            jsonResponse(true, $data);
        } catch (Throwable $e) {
            if ($pdo->inTransaction())
                $pdo->rollBack();
            jsonResponse(false, null, 'Error: ' . $e->getMessage());
        }
        break;

    case 'PUT':
        try {
            if (!$path)
                jsonResponse(false, null, 'ID required');
            $data = json_decode(file_get_contents("php://input"), true);

            $pdo->beginTransaction();

            $stmtCurrent = $pdo->prepare("SELECT status FROM campaigns WHERE id = ? AND workspace_id = ?");
            $stmtCurrent->execute([$path, $workspace_id]);
            $currentCampaign = $stmtCurrent->fetch();
            $currentStatus = strtolower($currentCampaign['status'] ?? 'draft');

            $isAdmin = ($GLOBALS['current_admin_id'] === 'admin-001');
            if (!$isAdmin) {
                if (in_array($currentStatus, ['sending', 'scheduled', 'sent'])) {
                    if (strtolower($data['status'] ?? '') !== 'paused') {
                        jsonResponse(false, null, 'User chỉ có quyền Tạm dừng (Pause) campaign hiện tại, không được sửa nội dung.');
                    }
                } else {
                    if (in_array(strtolower($data['status'] ?? ''), ['sending', 'scheduled', 'sent', 'active'])) {
                        jsonResponse(false, null, 'User không có quyền chạy hoặc active campaign.');
                    }
                }
            }

            // [FIX] PHP 8: Added null-coalescing guards to prevent Undefined array key warnings
            // on partial PUT payloads (e.g. UI saves only a subset of campaign fields).
            // json_encode(null) would write the literal string "null" to DB, corrupting target_config.
            $targetJson = json_encode($data['target'] ?? []);
            $attachmentsJson = json_encode($data['attachments'] ?? []);
            $tracking = !empty($data['trackingEnabled']) ? 1 : 0;

            $newStatus = $data['status'] ?? $currentStatus;
            $newStatusLower = strtolower($newStatus);

            // P0 FIX: Prevent status regressions (SENT/SENDING/SCHEDULED -> DRAFT)
            $terminalStatuses = ['sent', 'sending', 'scheduled', 'paused'];
            if (in_array($currentStatus, $terminalStatuses) && $newStatusLower === 'draft') {
                $newStatus = $currentStatus;
            }

            // ULTIMATE PROTECTION: If campaign was already sent (has sent_at in DB), it can never be draft
            $stmtMeta = $pdo->prepare("SELECT sent_at, total_target_audience, scheduled_at FROM campaigns WHERE id = ? AND workspace_id = ?");
            $stmtMeta->execute([$path, $workspace_id]);
            $existing = $stmtMeta->fetch();

            if (!empty($existing['sent_at']) && $newStatusLower === 'draft') {
                $newStatus = 'sent';
            }

            // SECONDARY PROTECTION: If active, don't allow UI-overwrite to draft
            if (($currentStatus === 'sent' || $currentStatus === 'sending') && $newStatusLower === 'draft') {
                $newStatus = $currentStatus;
            }

            // [BUG-FIX #8] Merged duplicate stmtMeta: single DB fetch covers all protections below.
            // Previously fetched $existing twice (lines 1171 and 1189).
            // sentAt/scheduledAt derived from already-fetched $existing above.
            $scheduledAt = $data['scheduledAt'] ?? null;
            $sentAt = $data['sentAt'] ?? null;

            if (empty($sentAt) && !empty($existing['sent_at']))
                $sentAt = $existing['sent_at'];
            $scheduledAt = $existing['scheduled_at'];

            $configJson = json_encode($data['config'] ?? []);

            $sql = "UPDATE campaigns SET name=?, subject=?, sender_email=?, status=?, template_id=?, content_body=?,
    target_config=?, tracking_enabled=?, scheduled_at=?, sent_at=?, attachments=?, type=?, config=?, updated_at=NOW() WHERE id=? AND workspace_id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $data['name'],
                $data['subject'],
                $data['senderEmail'],
                $newStatus,
                $data['templateId'],
                $data['contentBody'],
                $targetJson,
                $tracking,
                $scheduledAt,
                $sentAt,
                $attachmentsJson,
                $data['type'] ?? 'email',
                $configJson,
                $path,
                $workspace_id
            ]);
            logSystemActivity($pdo, 'campaigns', 'update', $path, $data['name'], ['status' => $newStatus]);

            $pdo->prepare("DELETE FROM campaign_reminders WHERE campaign_id = ?")->execute([$path]);
            if (!empty($data['reminders'])) {
                $stmtRem = $pdo->prepare("INSERT INTO campaign_reminders (id, campaign_id, type, trigger_mode, delay_days,
    delay_hours, scheduled_at, subject, template_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($data['reminders'] as $r) {
                    $stmtRem->execute([
                        $r['id'] ?? uniqid(),
                        $path,
                        $r['type'],
                        $r['triggerMode'],
                        $r['delayDays'],
                        $r['delayHours'],
                        $r['scheduledAt'] ?? null,
                        $r['subject'],
                        $r['templateId']
                    ]);
                }
            }

            if (isset($data['stats'])) {
                $stats = $data['stats'];
                $pdo->prepare("UPDATE campaigns SET count_sent=?, count_opened=?, count_clicked=?, count_bounced=?, count_spam=?
    WHERE id=? AND workspace_id=?")
                    ->execute([$stats['sent'], $stats['opened'], $stats['clicked'], $stats['bounced'], $stats['spam'], $path, $workspace_id]);
            }

            $pdo->commit();

            if ($newStatusLower === 'sending') {
                dispatchCampaignWorker($pdo, $path);
            }
            jsonResponse(true, $data);
        } catch (Exception $e) {
            if ($pdo->inTransaction())
                $pdo->rollBack();
            jsonResponse(false, null, $e->getMessage());
        }
        break;

    case 'DELETE':
        try {
            if (!$path)
                jsonResponse(false, null, 'ID required');
                
            require_permission($pdo, 'edit_campaigns', $workspace_id);

            // [BUG-FIX #16] Wrapped all operations in transaction to prevent partial delete.
            // Also added subscriber_activity cleanup — previously activity logs for deleted campaigns
            // were left as orphaned records, polluting the subscriber history.
            $pdo->beginTransaction();

            // 1. Cleanup Linked Flows (Cascade or Disconnect)
            $deleteFlows = isset($_GET['delete_flow']) ? (int)$_GET['delete_flow'] : 1;
            
            $likePattern = '%"targetId":"' . $path . '"%';
            $stmtFlow = $pdo->prepare("SELECT id FROM flows WHERE steps LIKE ?");
            $stmtFlow->execute([$likePattern]);
            $flowsToDelete = $stmtFlow->fetchAll(PDO::FETCH_COLUMN);

            if (!empty($flowsToDelete)) {
                foreach ($flowsToDelete as $flowId) {
                    if ($deleteFlows === 1) {
                        // Xóa hoàn toàn Flow theo yêu cầu
                        $pdo->prepare("DELETE FROM subscriber_flow_states WHERE flow_id = ?")->execute([$flowId]);
                        $pdo->prepare("DELETE FROM flow_enrollments WHERE flow_id = ?")->execute([$flowId]);
                        $pdo->prepare("DELETE FROM flows WHERE id = ?")->execute([$flowId]);
                        $pdo->prepare("DELETE FROM mail_delivery_logs WHERE flow_id = ?")->execute([$flowId]);
                        try {
                            $pdo->prepare("DELETE FROM zalo_delivery_logs WHERE flow_id = ?")->execute([$flowId]);
                        } catch (Exception $ignored) {
                        }
                        // Cleanup Flow Queue Jobs
                        $pdo->prepare("DELETE FROM queue_jobs WHERE (payload LIKE ? OR payload LIKE ?) AND status IN ('pending', 'processing')")
                            ->execute(['%"flow_id":"' . $flowId . '"%', '%"priority_flow_id":"' . $flowId . '"%']);
                    } else {
                        // Chỉ ngắt kết nối (Disconnect): Tháo targetId ra khỏi Trigger
                        $stmtFlowRead = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
                        $stmtFlowRead->execute([$flowId]);
                        $flowJson = $stmtFlowRead->fetchColumn();
                        if ($flowJson) {
                            $steps = json_decode($flowJson, true);
                            if (is_array($steps)) {
                                foreach ($steps as &$s) {
                                    if ($s['type'] === 'trigger' && isset($s['config']['targetId']) && $s['config']['targetId'] == $path) {
                                        $s['config']['targetId'] = '';
                                    }
                                }
                                $pdo->prepare("UPDATE flows SET steps = ? WHERE id = ?")->execute([json_encode($steps), $flowId]);
                            }
                        }
                    }
                }
            }

            // 2. Delete Main Campaign Records
            logSystemActivity($pdo, 'campaigns', 'delete', $path, "Campaign $path");
            $pdo->prepare("DELETE FROM campaigns WHERE id = ? AND workspace_id = ?")->execute([$path, $workspace_id]);
            $pdo->prepare("DELETE FROM campaign_reminders WHERE campaign_id = ?")->execute([$path]);
            $pdo->prepare("DELETE FROM mail_delivery_logs WHERE campaign_id = ?")->execute([$path]);

            // [FIX #16] Cleanup subscriber_activity logged against this campaign
            try {
                $pdo->prepare("DELETE FROM subscriber_activity WHERE campaign_id = ?")->execute([$path]);
            } catch (Exception $ignored) {
            }

            // [FIX] Safely handle Zalo logs (Check if campaign_id exists)
            $stmtCheck = $pdo->query("SHOW COLUMNS FROM zalo_delivery_logs LIKE 'campaign_id'");
            if ($stmtCheck->fetch()) {
                $pdo->prepare("DELETE FROM zalo_delivery_logs WHERE campaign_id = ?")->execute([$path]);
            } else {
                $pdo->prepare("DELETE FROM zalo_delivery_logs WHERE flow_id = ?")->execute([$path]);
            }

            // 3. Cleanup Pending Queue Jobs & Buffers
            $pdo->prepare("DELETE FROM queue_jobs WHERE (payload LIKE ? OR payload LIKE ?) AND status IN ('pending', 'processing')")
                ->execute(['%"campaign_id":"' . $path . '"%', '%"target_id":"' . $path . '"%']);

            $pdo->prepare("DELETE FROM stats_update_buffer WHERE target_id = ? AND target_table = 'campaigns'")->execute([$path]);

            $pdo->commit();
            jsonResponse(true, ['id' => $path]);
        } catch (Exception $e) {
            if ($pdo->inTransaction())
                $pdo->rollBack();
            jsonResponse(false, null, $e->getMessage());
        }
        break;
}
?>
