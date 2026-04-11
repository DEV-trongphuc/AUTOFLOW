<?php
require_once 'bootstrap.php';
// Initializing system once via bootstrap pattern
initializeSystem($pdo);

require_once 'trigger_helper.php';
require_once 'zalo_sync_helpers.php';

// checkDynamicTriggers moved to trigger_helper.php


$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_GET['id']) ? $_GET['id'] : null;
$route = isset($_GET['route']) ? $_GET['route'] : null;

function formatSubscriber($row, $tags = [])
{
    // 10M UPGRADE: Tags passed explicitly from relational fetch
    $row['tags'] = $tags;

    $row['customAttributes'] = json_decode($row['custom_attributes'] ?? '{}'); // FIX: Changed key to camelCase

    // FIX: Keep first_name and last_name separate for proper UI editing
    $row['firstName'] = $row['first_name'] ?? '';
    $row['lastName'] = $row['last_name'] ?? '';

    $row['gender'] = $row['gender'] ?? '';
    $row['joinedAt'] = $row['joined_at'] ?? date('Y-m-d H:i:s');
    $row['phoneNumber'] = $row['phone_number'] ?? '';
    $row['jobTitle'] = $row['job_title'] ?? '';
    $row['companyName'] = $row['company_name'] ?? '';
    $row['address'] = $row['city'] ?: ($row['country'] ?: '');
    $row['source'] = $row['source'] ?? 'Manual'; // FIX: Add source
    $row['salesperson'] = $row['salesperson'] ?? ''; // NEW: Add salesperson
    $row['dateOfBirth'] = $row['date_of_birth'] ?? null;
    $row['anniversaryDate'] = $row['anniversary_date'] ?? null;
    $row['lastActivityAt'] = $row['last_activity_at'] ?? null; // Added mapping
    $row['updatedAt'] = $row['updated_at'] ?? null; // NEW: Map updatedAt
    $row['notes'] = json_decode($row['notes'] ?? '[]', true); // Decode notes
// If json_decode returns a string (e.g., "plain text"), wrap it in array for consistent UI
    if (is_string($row['notes'])) {
        $row['notes'] = [$row['notes']];
    } elseif (!is_array($row['notes'])) {
        $row['notes'] = [];
    }

    $row['stats'] = [
        'emailsSent' => (int) ($row['stats_sent'] ?? 0),
        'emailsOpened' => (int) ($row['stats_opened'] ?? 0),
        'linksClicked' => (int) ($row['stats_clicked'] ?? 0),
        'lastOpenAt' => $row['last_open_at'] ?? null,
        'lastClickAt' => $row['last_click_at'] ?? null
    ];

    $row['leadScore'] = (int) ($row['lead_score'] ?? 0); // NEW: Lead Scoring

    unset(
        $row['first_name'],
        $row['last_name'],
        $row['joined_at'],
        $row['phone_number'],
        $row['job_title'],
        $row['company_name'],
        $row['custom_attributes'],
        $row['date_of_birth'],
        $row['anniversary_date'],
        $row['last_activity_at'],
        $row['lead_score'],
        $row['city'],
        $row['country']
    );
    unset($row['stats_sent'], $row['stats_opened'], $row['stats_clicked'], $row['last_open_at'], $row['last_click_at']);
    return $row;
}

// logActivity moved to flow_helpers.php

// --- ROUTE: COUNT UNIQUE (For Trigger Estimation) ---
if ($method === 'GET' && $route === 'count_unique') {
    $listIds = isset($_GET['listIds']) && $_GET['listIds'] !== '' ? explode(',', $_GET['listIds']) : [];
    $segmentIds = isset($_GET['segmentIds']) && $_GET['segmentIds'] !== '' ? explode(',', $_GET['segmentIds']) : [];

    if (empty($listIds) && empty($segmentIds)) {
        jsonResponse(true, ['count' => 0]);
    }

    $whereGroups = [];
    $params = [];

    // 1. Lists Filter
    if (!empty($listIds)) {
        $placeholders = implode(',', array_fill(0, count($listIds), '?'));
        // Use EXISTS for better performance than IN with large lists
        $whereGroups[] = "EXISTS (SELECT 1 FROM subscriber_lists sl WHERE sl.subscriber_id = s.id AND sl.list_id IN
($placeholders))";
        $params = array_merge($params, $listIds);
    }

    // 2. Segments Filter
    if (!empty($segmentIds)) {
        foreach ($segmentIds as $segId) {
            try {
                $stmtSeg = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
                $stmtSeg->execute([$segId]);
                $criteriaJson = $stmtSeg->fetchColumn();

                if ($criteriaJson) {
                    $segRes = buildSegmentWhereClause($criteriaJson, $segId);
                    $whereGroups[] = "(" . $segRes['sql'] . ")";
                    $params = array_merge($params, $segRes['params']);
                }
            } catch (Exception $e) {
                // Ignore invalid segments
            }
        }
    }

    if (empty($whereGroups)) {
        jsonResponse(true, ['count' => 0]);
    }

    $fullWhere = implode(' OR ', $whereGroups);
    $sql = "SELECT COUNT(*) FROM subscribers s WHERE $fullWhere";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $count = $stmt->fetchColumn();
        jsonResponse(true, ['count' => (int) $count]);
    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
}
// --- ROUTE: BULK ACTIONS ---
if ($method === 'POST' && ($route === 'bulk-add-tag' || $route === 'bulk-add-to-list' || $route === 'bulk-change-status')) {
    $data = json_decode(file_get_contents("php://input"), true);
    $subscriberIds = $data['subscriber_ids'] ?? [];
    $selectAll = $data['select_all'] ?? false;
    $flowId = $data['flow_id'] ?? null;

    if ($selectAll && $flowId) {
        // FETCH INACTIVE USERS: Logic matched with flows.php
        $sql = "SELECT sfs.subscriber_id
                FROM subscriber_flow_states sfs
                LEFT JOIN subscriber_activity sa ON sa.subscriber_id = sfs.subscriber_id 
                    AND sa.flow_id = sfs.flow_id 
                    AND sa.type IN ('open_email', 'click_link', 'click_zns', 'zns_clicked', 'zns_replied', 'reply_email', 'form_submit', 'purchase')
                WHERE sfs.flow_id = ?
                AND sa.id IS NULL
                AND sfs.status IN ('waiting', 'processing', 'completed', 'failed')";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$flowId]);
        $subscriberIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    if (empty($subscriberIds)) {
        jsonResponse(false, null, 'Không có khách hàng nào được chọn');
    }

    if ($route === 'bulk-add-tag') {
        $tagId = $data['tag_id'] ?? null;
        if (!$tagId)
            jsonResponse(false, null, 'Tag ID required');

        $placeholders = implode(',', array_fill(0, count($subscriberIds), '(?, ?)'));
        $sql = "INSERT IGNORE INTO subscriber_tags (subscriber_id, tag_id) VALUES $placeholders";
        $params = [];
        foreach ($subscriberIds as $sid) {
            array_push($params, $sid, $tagId);
        }
        $pdo->prepare($sql)->execute($params);

        jsonResponse(true, ['count' => count($subscriberIds)], 'Đã gắn tag thành công');
    }

    if ($route === 'bulk-add-to-list') {
        $listId = $data['list_id'] ?? null;
        if (!$listId)
            jsonResponse(false, null, 'List ID required');

        // [FIX] Chunk INSERT and COUNT to prevent MySQL 65,535 placeholder limit crash.
        // 50k subscribers × 2 placeholders (subscriber_id, list_id) = 100k params → PDO crash.
        // Same pattern as bulk_operations.php fix: process in batches of 500.
        $CHUNK = 500;
        $totalAdded = 0;
        $totalPhone = 0;

        foreach (array_chunk($subscriberIds, $CHUNK) as $chunk) {
            // Batch INSERT IGNORE
            $ph = implode(',', array_fill(0, count($chunk), '(?, ?)'));
            $params = [];
            foreach ($chunk as $sid) {
                array_push($params, $sid, $listId);
            }
            $pdo->prepare("INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES $ph")->execute($params);
            $totalAdded += count($chunk);

            // Count phone numbers in this chunk
            $phIds = implode(',', array_fill(0, count($chunk), '?'));
            $stmtPhone = $pdo->prepare("SELECT COUNT(*) FROM subscribers WHERE id IN ($phIds) AND (phone_number IS NOT NULL AND phone_number != '')");
            $stmtPhone->execute($chunk);
            $totalPhone += (int) $stmtPhone->fetchColumn();
        }

        $pdo->prepare("UPDATE lists SET subscriber_count = subscriber_count + ?, phone_count = phone_count + ? WHERE id = ?")->execute([$totalAdded, $totalPhone, $listId]);

        jsonResponse(true, ['count' => $totalAdded], 'Đã thêm vào danh sách thành công');
    }


    if ($route === 'bulk-change-status') {
        $status = $data['status'] ?? null;
        if (!$status)
            jsonResponse(false, null, 'Status required');

        $placeholders = implode(',', array_fill(0, count($subscriberIds), '?'));
        $sql = "UPDATE subscribers SET status = ? WHERE id IN ($placeholders)";
        $pdo->prepare($sql)->execute(array_merge([$status], $subscriberIds));

        jsonResponse(true, ['count' => count($subscriberIds)], 'Đã cập nhật trạng thái thành công');
    }
}

// --- ROUTE: BULK IMPORT ---
if ($method === 'POST' && $route === 'subscribers_bulk') {
    $list = json_decode(file_get_contents("php://input"), true);
    if (!is_array($list)) {
        jsonResponse(false, null, 'Invalid data format. Expected an array.');
    }

    $pdo->beginTransaction();
    try {
        $chunkSize = 500;
        $chunks = array_chunk($list, $chunkSize);
        $totalProcessed = 0;
        $allAffectedListSubscribers = [];

        // Cache tags for speed
        $stmtT = $pdo->query("SELECT id, name FROM tags");
        $tagMap = [];
        while ($t = $stmtT->fetch())
            $tagMap[strtolower($t['name'])] = $t['id'];

        foreach ($chunks as $chunk) {
            $subValues = [];
            $subParams = [];
            $listValues = [];
            $listParams = [];
            $tagSubValues = [];
            $tagSubParams = [];

            foreach ($chunk as $data) {
                $id = $data['id'] ?? bin2hex(random_bytes(16));
                $email = $data['email'];
                $firstName = $data['firstName'] ?? '';
                $lastName = $data['lastName'] ?? '';
                $status = $data['status'] ?? 'active';
                $source = $data['source'] ?? 'Bulk Import';
                $salesperson = $data['salesperson'] ?? '';
                $phone = $data['phoneNumber'] ?? '';
                $job = $data['jobTitle'] ?? '';
                $company = $data['companyName'] ?? '';
                $country = $data['country'] ?? '';
                $city = $data['city'] ?? '';
                $gender = $data['gender'] ?? '';
                $dob = !empty($data['dateOfBirth']) ? $data['dateOfBirth'] : null;
                $anniv = !empty($data['anniversaryDate']) ? $data['anniversaryDate'] : null;

                // 10M UPGRADE: Removed 'tags' from main insert (moved to subscriber_tags)
                $subValues[] = "(?, ?, ?, ?, ?, ?, ?, NOW(), '[]', ?, ?, ?, ?, ?, ?, ?, ?)";
                array_push(
                    $subParams,
                    $id,
                    $email,
                    $firstName,
                    $lastName,
                    $status,
                    $source,
                    $salesperson,
                    $phone,
                    $job,
                    $company,
                    $country,
                    $city,
                    $gender,
                    $dob,
                    $anniv
                );

                if (!empty($data['tags'])) {
                    foreach ($data['tags'] as $tagName) {
                        $tnL = strtolower(trim($tagName));
                        if (isset($tagMap[$tnL])) {
                            $tagSubValues[] = "(?, ?)";
                            array_push($tagSubParams, $id, $tagMap[$tnL]);
                        }
                    }
                }

                if (!empty($data['listIds'])) {
                    foreach ($data['listIds'] as $lid) {
                        $listValues[] = "(?, ?)";
                        array_push($listParams, $id, $lid);
                        if (!isset($allAffectedListSubscribers[$lid]))
                            $allAffectedListSubscribers[$lid] = [];
                        $allAffectedListSubscribers[$lid][] = $id;
                    }
                }
                $totalProcessed++;
            }

            if (!empty($subValues)) {
                $sqlSub = "INSERT INTO subscribers (id, email, first_name, last_name, status, source, salesperson, joined_at, notes,
phone_number, job_title, company_name, country, city, gender, date_of_birth, anniversary_date)
VALUES " . implode(',', $subValues) . "
ON DUPLICATE KEY UPDATE
first_name = VALUES(first_name), last_name = VALUES(last_name), status = VALUES(status), salesperson =
VALUES(salesperson),
phone_number = VALUES(phone_number), job_title = VALUES(job_title), company_name = VALUES(company_name),
country = VALUES(country), city = VALUES(city), gender = VALUES(gender), date_of_birth = VALUES(date_of_birth),
anniversary_date = VALUES(anniversary_date)";
                $pdo->prepare($sqlSub)->execute($subParams);
            }

            if (!empty($tagSubValues)) {
                $sqlTag = "INSERT IGNORE INTO subscriber_tags (subscriber_id, tag_id) VALUES " . implode(',', $tagSubValues);
                $pdo->prepare($sqlTag)->execute($tagSubParams);
            }

            if (!empty($listValues)) {
                $sqlList = "INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES " . implode(',', $listValues);
                $pdo->prepare($sqlList)->execute($listParams);
            }
        }

        foreach ($allAffectedListSubscribers as $lid => $subsInList) {
            // Trigger 'added_to_list' automation (Correct type)
            enrollSubscribersBulk($pdo, $subsInList, 'added_to_list', $lid);

            // Optimized: Increment count instead of full recalculation
            $addedCount = count($subsInList);
            if ($addedCount > 0) {
                // Also count those with phone numbers in this chunk
                $subDataInChunk = array_filter($chunk, fn($c) => in_array($c['id'] ?? '', $subsInList));
                $phoneInChunk = count(array_filter($subDataInChunk, fn($c) => !empty($c['phoneNumber'])));

                $pdo->prepare("UPDATE lists SET subscriber_count = subscriber_count + ?, phone_count = phone_count + ? WHERE id = ?")->execute([$addedCount, $phoneInChunk, $lid]);
            }
        }
        $pdo->commit();
        jsonResponse(true, ['count' => $totalProcessed], 'Import thành công');
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(false, null, $e->getMessage());
    }
}

// --- CHU TRÌNH CRUD THÔNG THƯỜNG ---
switch ($method) {
    case 'GET':
        if ($path || isset($_GET['email']) || isset($_GET['visitor_id'])) {
            if (isset($_GET['email'])) {
                $stmt = $pdo->prepare("SELECT s.* FROM subscribers s WHERE s.email = ?");
                $stmt->execute([$_GET['email']]);
            } elseif (isset($_GET['visitor_id'])) {
                $stmt = $pdo->prepare("SELECT s.* FROM subscribers s JOIN web_visitors v ON s.id = v.subscriber_id WHERE v.id = ?");
                $stmt->execute([$_GET['visitor_id']]);
            } else {
                $stmt = $pdo->prepare("SELECT s.* FROM subscribers s WHERE s.id = ?");
                $stmt->execute([$path]);
            }
            $sub = $stmt->fetch();
            if ($sub) {
                $subId = $sub['id'];

                // Get Tags
                $stmtT = $pdo->prepare("SELECT t.name FROM subscriber_tags st JOIN tags t ON st.tag_id = t.id WHERE st.subscriber_id =
?");
                $stmtT->execute([$subId]);
                $tags = $stmtT->fetchAll(PDO::FETCH_COLUMN);

                $sub = formatSubscriber($sub, $tags);
                $sub['id'] = $subId; // Ensure ID is preserved after formatSubscriber unset

                // Get Lists
                $stmtLists = $pdo->prepare("SELECT list_id FROM subscriber_lists WHERE subscriber_id = ?");
                $stmtLists->execute([$subId]);
                $sub['listIds'] = $stmtLists->fetchAll(PDO::FETCH_COLUMN);

                // Get Activity History (Increased limit for Heatmap)
                $stmtActs = $pdo->prepare("SELECT type, reference_name, details, created_at, flow_id, campaign_id FROM
subscriber_activity WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 1000");
                $stmtActs->execute([$subId]);
                $sub['activity'] = $stmtActs->fetchAll();

                // Get Active Flows
                $stmtFlows = $pdo->prepare("
SELECT f.id, f.name, f.status as flowStatus, sfs.step_id, sfs.status, sfs.created_at as enteredAt
FROM subscriber_flow_states sfs
JOIN flows f ON sfs.flow_id = f.id
WHERE sfs.subscriber_id = ? AND sfs.status IN ('waiting', 'processing')
");
                $stmtFlows->execute([$subId]);
                $sub['activeFlows'] = $stmtFlows->fetchAll();

                jsonResponse(true, $sub);
            } else {
                jsonResponse(false, null, 'Not found');
            }
        } else {
            // LIST VIEW with Pagination & Filters
            require_once 'segment_helper.php';

            $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
            $offset = ($page - 1) * $limit;

            $search = $_GET['search'] ?? '';
            $status = $_GET['status'] ?? 'all';
            $tag = $_GET['tag'] ?? 'all';
            $listId = $_GET['list_id'] ?? 'all';
            $segmentId = $_GET['segment_id'] ?? 'all';
            $verified = $_GET['verified'] ?? 'all';
            $sort = $_GET['sort'] ?? 'newest';

            $whereClauses = ["1=1"];
            $params = [];
            $joins = []; // New: Handle JOINs for performance

            // Search
            if (!empty($search)) {
                $whereClauses[] = "(s.email LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR s.phone_number LIKE ? OR s.company_name LIKE ?)";
                $wildcard = "%$search%";
                $params[] = $wildcard;
                $params[] = $wildcard;
                $params[] = $wildcard;
                $params[] = $wildcard;
                $params[] = $wildcard;
            }

            // Status Filter
            if ($status !== 'all') {
                $statusArray = explode(',', $status);
                if (count($statusArray) > 1) {
                    $placeholders = implode(',', array_fill(0, count($statusArray), '?'));
                    $whereClauses[] = "s.status IN ($placeholders)";
                    $params = array_merge($params, $statusArray);
                } else {
                    $whereClauses[] = "s.status = ?";
                    $params[] = $status;
                }
            }

            // Verify Filter
            if ($verified !== 'all') {
                $whereClauses[] = "s.verified = ?";
                $params[] = (int) $verified;
            }

            // Lead Score Filter
            $minScore = $_GET['min_lead_score'] ?? null;
            $maxScore = $_GET['max_lead_score'] ?? null;
            if ($minScore !== null && $minScore !== '') {
                $whereClauses[] = "s.lead_score >= ?";
                $params[] = (int) $minScore;
            }
            if ($maxScore !== null && $maxScore !== '') {
                $whereClauses[] = "s.lead_score <= ?";
                $params[] = (int) $maxScore;
            }

            // Phone Filter
            $hasPhone = $_GET['has_phone'] ?? 'all';
            if ($hasPhone === '1') {
                $whereClauses[] = "(s.phone_number IS NOT NULL AND s.phone_number != '')";
            }

            // Chat Filter
            $hasChat = $_GET['has_chat'] ?? 'all';
            if ($hasChat !== 'all') {
                $chatWhere = "(
            EXISTS (SELECT 1 FROM web_visitors v JOIN ai_conversations c ON v.id = c.visitor_id WHERE v.subscriber_id = s.id)
            OR (s.meta_psid IS NOT NULL AND EXISTS (SELECT 1 FROM ai_conversations WHERE visitor_id = CONCAT('meta_', s.meta_psid)))
            OR (s.zalo_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM ai_conversations WHERE visitor_id = CONCAT('zalo_', s.zalo_user_id)))
        )";

                if ($hasChat === 'yes') {
                    $whereClauses[] = $chatWhere;
                } elseif ($hasChat === 'no') {
                    $whereClauses[] = "NOT $chatWhere";
                }
            }

            // Tag Filter (10M UPGRADE: JOIN based)
            if ($tag !== 'all' && $tag !== '') {
                $tagArray = explode(',', $tag);
                $placeholders = implode(',', array_fill(0, count($tagArray), '?'));
                $whereClauses[] = "s.id IN (SELECT st.subscriber_id FROM subscriber_tags st JOIN tags t ON st.tag_id = t.id WHERE t.name IN ($placeholders))";
                $params = array_merge($params, $tagArray);
            }

            // List Filter - OPTIMIZED with JOIN
            if ($listId !== 'all') {
                // PERF: Use JOIN instead of EXISTS to drive query from small list index
                $joins[] = "JOIN subscriber_lists sl ON s.id = sl.subscriber_id";
                $whereClauses[] = "sl.list_id = ?";
                $params[] = $listId;
            }

            // Birthday Filters (via Sort param)
            if ($sort === 'birthday_today') {
                $whereClauses[] = "DATE_FORMAT(s.date_of_birth, '%m-%d') = DATE_FORMAT(NOW(), '%m-%d')";
            } elseif ($sort === 'birthday_month') {
                $whereClauses[] = "MONTH(s.date_of_birth) = MONTH(NOW())";
            } elseif ($sort === 'birthday_custom') {
                $startDate = $_GET['startDate'] ?? '';
                $endDate = $_GET['endDate'] ?? '';
                if ($startDate && $endDate) {
                    // Smart Logic: Treat as Anniversary Filter (ignore year).
                    // Extract MM-DD
                    $startMD = date('m-d', strtotime($startDate));
                    $endMD = date('m-d', strtotime($endDate));

                    if ($startMD <= $endMD) {
                        // Standard range within a year (e.g. 01-01 to 01-31)
                        $whereClauses[] = "DATE_FORMAT(s.date_of_birth, '%m-%d') BETWEEN ? AND ?";
                        $params[] = $startMD;
                        $params[] = $endMD;
                    } else {
                        // Wrap around year (e.g. 12-25 to 01-05)
                        $whereClauses[] = "(DATE_FORMAT(s.date_of_birth, '%m-%d') >= ? OR DATE_FORMAT(s.date_of_birth, '%m-%d') <= ?)";
                        $params[] = $startMD;
                        $params[] = $endMD;
                    }
                }
            } elseif ($sort === 'unlisted') {
                $whereClauses[] = "NOT EXISTS (SELECT 1 FROM subscriber_lists sl WHERE sl.subscriber_id = s.id)";
            } elseif ($sort === 'recent_activity') {
                // NEW: Recent Activity Filter - Show customers who interacted within X days
                $recentDays = isset($_GET['recent_days']) ? (int) $_GET['recent_days'] : 7;
                $whereClauses[] = "s.last_activity_at >= DATE_SUB(NOW(), INTERVAL ? DAY)";
                $params[] = $recentDays;
            }

            // Custom Attribute Filter
            $customAttrKey = $_GET['custom_attr_key'] ?? '';
            $customAttrValue = $_GET['custom_attr_value'] ?? '';
            if (!empty($customAttrKey) && $customAttrKey !== 'all') {
                $safeKey = preg_replace('/[^a-zA-Z0-9_\-]/', '', $customAttrKey);
                if (!empty($customAttrValue)) {
                    $whereClauses[] = "JSON_EXTRACT(s.custom_attributes, '$.{$safeKey}') = ?";
                    $params[] = $customAttrValue;
                } else {
                    // Filter: has this custom field (not null/not missing)
                    $whereClauses[] = "JSON_EXTRACT(s.custom_attributes, '$.{$safeKey}') IS NOT NULL";
                }
            }

            // Segment Filter
            if ($segmentId !== 'all') {
                try {
                    $stmtSeg = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
                    $stmtSeg->execute([$segmentId]);
                    $criteriaJson = $stmtSeg->fetchColumn();

                    if ($criteriaJson) {
                        $segRes = buildSegmentWhereClause($criteriaJson, $segmentId);
                        // $segRes['sql'] uses 's.column' which matches our alias
                        $whereClauses[] = $segRes['sql'];
                        $params = array_merge($params, $segRes['params']);
                    }
                } catch (Throwable $e) {
                    error_log("Subscriber Segment Filter Fatal Error: " . $e->getMessage() . " in " . $e->getFile() . ":" .
                        $e->getLine());
                    $whereClauses[] = "1=0"; // Fail safe
                }
            }

            $whereSql = implode(' AND ', $whereClauses);
            $joinSql = implode(' ', $joins);

            try {
                // PERF: Optimization for List Count
                // If filtering by LIST and STATUS=ALL (or default), we can just use the cached count in `lists` table
                $useCachedCount = false;
                if (
                    $listId !== 'all' && empty($search) && $status === 'all' && $tag === 'all' && $segmentId === 'all' && $verified
                    === 'all'
                ) {
                    $stmtCache = $pdo->prepare("SELECT subscriber_count FROM lists WHERE id = ?");
                    $stmtCache->execute([$listId]);
                    $cachedCount = $stmtCache->fetchColumn();
                    if ($cachedCount !== false) {
                        $total = (int) $cachedCount;
                        $totalPages = ceil($total / $limit);
                        $useCachedCount = true;
                    }
                }

                if (!$useCachedCount) {
                    // Get Total Count (Standard)
                    $sqlCount = "SELECT COUNT(*) FROM subscribers s $joinSql WHERE $whereSql";
                    $stmtCount = $pdo->prepare($sqlCount);
                    $stmtCount->execute($params);
                    $total = (int) $stmtCount->fetchColumn();
                    $totalPages = ceil($total / $limit);
                }
            } catch (Throwable $e) {
                error_log("Subscriber Count Query Error: " . $e->getMessage() . " SQL: " . $sqlCount);
                jsonResponse(false, null, "Lỗi truy vấn: " . $e->getMessage());
            }

            try {
                // Get Data
                $orderBy = "s.joined_at DESC";
                if ($sort === 'score') {
                    $orderBy = "s.lead_score DESC";
                }

                $sql = "SELECT s.* FROM subscribers s $joinSql WHERE $whereSql ORDER BY $orderBy LIMIT $limit OFFSET $offset";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $rawRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // PERFORMANCE FIX: Batch fetch list associations and TAGS to avoid N+1 queries
                $listMap = [];
                $tagMap = [];
                $chatMap = [];
                if (!empty($rawRows)) {
                    $subIds = array_column($rawRows, 'id');
                    $placeholders = implode(',', array_fill(0, count($subIds), '?'));

                    // Fetch Lists
                    $stmtL = $pdo->prepare("SELECT subscriber_id, list_id FROM subscriber_lists WHERE subscriber_id IN
    ($placeholders)");
                    $stmtL->execute($subIds);
                    foreach ($stmtL->fetchAll(PDO::FETCH_ASSOC) as $row) {
                        if (!isset($listMap[$row['subscriber_id']]))
                            $listMap[$row['subscriber_id']] = [];
                        $listMap[$row['subscriber_id']][] = $row['list_id'];
                    }

                    // Fetch Tags
                    $stmtT = $pdo->prepare("SELECT st.subscriber_id, t.name FROM subscriber_tags st JOIN tags t ON st.tag_id = t.id
    WHERE st.subscriber_id IN ($placeholders)");
                    $stmtT->execute($subIds);
                    foreach ($stmtT->fetchAll(PDO::FETCH_ASSOC) as $row) {
                        if (!isset($tagMap[$row['subscriber_id']]))
                            $tagMap[$row['subscriber_id']] = [];
                        $tagMap[$row['subscriber_id']][] = $row['name'];
                    }

                    // PERFORMANCE FIX: Optimized batch fetch for chat counts using UNION to accurately use indexes
                    $sqlChat = "SELECT sub_id, COUNT(DISTINCT conv_id) as cnt FROM (
    SELECT s.id as sub_id, c.id as conv_id
    FROM subscribers s
    JOIN web_visitors v ON s.id = v.subscriber_id
    JOIN ai_conversations c ON v.id = c.visitor_id
    WHERE s.id IN ($placeholders)
    UNION ALL
    SELECT s.id as sub_id, c.id as conv_id
    FROM subscribers s
    JOIN ai_conversations c ON c.visitor_id = CONCAT('meta_', s.meta_psid)
    WHERE s.id IN ($placeholders) AND s.meta_psid IS NOT NULL
    UNION ALL
    SELECT s.id as sub_id, c.id as conv_id
    FROM subscribers s
    JOIN ai_conversations c ON c.visitor_id = CONCAT('zalo_', s.zalo_user_id)
    WHERE s.id IN ($placeholders) AND s.zalo_user_id IS NOT NULL
    ) AS combined_chats GROUP BY sub_id";

                    $stmtChat = $pdo->prepare($sqlChat);
                    // Pass subIds 3 times for 3 UNION parts
                    $stmtChat->execute(array_merge($subIds, $subIds, $subIds));
                    $chatMap = $stmtChat->fetchAll(PDO::FETCH_KEY_PAIR);
                }

                $data = array_map(function ($sub) use ($listMap, $tagMap, $chatMap) {
                    $s = formatSubscriber($sub, $tagMap[$sub['id']] ?? []);
                    $s['listIds'] = $listMap[$sub['id']] ?? [];
                    $s['chatCount'] = (int) ($chatMap[$sub['id']] ?? 0);
                    return $s;
                }, $rawRows);

                jsonResponse(true, [
                    'data' => $data,
                    'pagination' => [
                        'total' => $total,
                        'totalPages' => $totalPages,
                        'page' => $page,
                        'limit' => $limit
                    ]
                ]);
            } catch (Throwable $e) {
                error_log("Subscriber Data Fetch Error: " . $e->getMessage() . " SQL: " . ($sql ?? 'N/A'));
                jsonResponse(false, null, "Lỗi lấy danh sách khách hàng: " . $e->getMessage());
            }
        }
        break;

    case 'POST':
        // Create/Update Subscriber
        $data = json_decode(file_get_contents("php://input"), true);

        // P0 FIX: Validate email format
        if (empty($data['email'])) {
            jsonResponse(false, null, 'Email là bắt buộc (Email is required)');
        }

        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            jsonResponse(false, null, 'Email không hợp lệ (Invalid email format). Vui lòng nhập email đúng định dạng
    (example@domain.com)');
        }

        // Check for duplicates
        $checkEmail = $pdo->prepare("SELECT id FROM subscribers WHERE email = ? AND id != ?");
        $checkEmail->execute([$data['email'], $path ?? '']);
        if ($checkEmail->fetch()) {
            jsonResponse(false, null, 'Email đã tồn tại trong hệ thống (Email already exists). Vui lòng sử dụng email khác hoặc
    cập nhật subscriber hiện tại.');
        }
        $id = (!empty($data['id'])) ? $data['id'] : bin2hex(random_bytes(16));
        $attrs = json_encode($data['customAttributes'] ?? (object) []);
        $notes = json_encode($data['notes'] ?? []); // Save notes on POST

        $sql = "INSERT INTO subscribers (id, email, first_name, last_name, gender, custom_attributes, phone_number,
    job_title, company_name, country, city, address, source, salesperson, joined_at, notes, status, date_of_birth,
    anniversary_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        try {
            $stmt->execute([
                $id,
                $data['email'],
                $data['firstName'] ?? '',
                $data['lastName'] ?? '',
                $data['gender'] ?? '',
                $attrs,
                $data['phoneNumber'] ?? '',
                $data['jobTitle'] ?? '',
                $data['companyName'] ?? '',
                $data['country'] ?? '',
                $data['city'] ?? '',
                $data['address'] ?? '',
                $data['source'] ?? 'Manual',
                $data['salesperson'] ?? '',
                $notes,
                $data['status'] ?? 'active',
                $data['dateOfBirth'] ?? null,
                $data['anniversaryDate'] ?? null
            ]);

            // 10M UPGRADE: Tag Handling (Relational)
            $newTags = $data['tags'] ?? [];
            if (is_array($newTags)) {
                foreach ($newTags as $tagName) {
                    $stmtT = $pdo->prepare("SELECT id FROM tags WHERE name = ? LIMIT 1");
                    $stmtT->execute([$tagName]);
                    $tagId = $stmtT->fetchColumn();
                    if ($tagId) {
                        $pdo->prepare("INSERT IGNORE INTO subscriber_tags (subscriber_id, tag_id) VALUES (?, ?)")->execute([$id, $tagId]);
                        // Trigger Tag Flows
                        triggerFlows($pdo, $id, 'tag', $tagName);
                    }
                }
            }

            // RESTORED: List Handling
            if (!empty($data['listIds'])) {
                foreach ($data['listIds'] as $lid) {
                    $stmtListCheck = $pdo->prepare("SELECT list_id FROM subscriber_lists WHERE subscriber_id = ? AND list_id = ?");
                    $stmtListCheck->execute([$id, $lid]);
                    if (!$stmtListCheck->fetch()) {
                        $pdo->prepare("INSERT INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)")->execute([$id, $lid]);
                        triggerFlows($pdo, $id, 'list', $lid);
                        // [PERF] Use incremental update instead of full count
                        $hasPhone = !empty($data['phoneNumber']) ? 1 : 0;
                        $pdo->prepare("UPDATE lists SET subscriber_count = subscriber_count + 1, phone_count = phone_count + ? WHERE id = ?")->execute([$hasPhone, $lid]);
                    }
                }
            }
            $data['id'] = $id;

            // Check Dynamic Segments & Date Triggers
            checkDynamicTriggers($pdo, $id);

            // [NEW] Sync with Zalo
            syncMainToZalo($pdo, $id);

            jsonResponse(true, $data);
        } catch (Exception $e) {
            jsonResponse(false, null, $e->getMessage());
        }
        break;

    case 'PUT':
        if (!$path)
            jsonResponse(false, null, 'ID required');
        $data = json_decode(file_get_contents("php://input"), true);
        $tags = json_encode($data['tags'] ?? []);
        $attrs = json_encode($data['customAttributes'] ?? (object) []);
        $dob = !empty($data['dateOfBirth']) ? $data['dateOfBirth'] : null;
        $anniversary = !empty($data['anniversaryDate']) ? $data['anniversaryDate'] : null;
        $notes = json_encode($data['notes'] ?? []); // Save notes on PUT

        // Check if phone number changed to update list phone_counts
        $stmtOldPhone = $pdo->prepare("SELECT phone_number FROM subscribers WHERE id = ?");
        $stmtOldPhone->execute([$path]);
        $oldPhone = (string) $stmtOldPhone->fetchColumn();
        $newPhone = (string) ($data['phoneNumber'] ?? '');
        $phoneStatusChanged = 0; // 1: gained phone, -1: lost phone, 0: no change in "has phone" status
        $oldHasPhone = (!empty($oldPhone) && trim($oldPhone) !== '');
        $newHasPhone = (!empty($newPhone) && trim($newPhone) !== '');
        if ($oldHasPhone && !$newHasPhone)
            $phoneStatusChanged = -1;
        elseif (!$oldHasPhone && $newHasPhone)
            $phoneStatusChanged = 1;

        $sql = "UPDATE subscribers SET email=?, first_name=?, last_name=?, gender=?, custom_attributes=?, status=?,
    phone_number=?, job_title=?, company_name=?, country=?, city=?, address=?, source=?, salesperson=?, date_of_birth=?,
    anniversary_date=?, notes=?, updated_at = NOW()
    WHERE id=?";
        $stmt = $pdo->prepare($sql);
        try {
            $stmt->execute([
                $data['email'],
                $data['firstName'] ?? '',
                $data['lastName'] ?? '',
                $data['gender'] ?? null,
                $attrs,
                $data['status'],
                $newPhone,
                $data['jobTitle'] ?? '',
                $data['companyName'] ?? '',
                $data['country'] ?? '',
                $data['city'] ?? '',
                $data['address'] ?? '',
                $data['source'] ?? 'Manual',
                $data['salesperson'] ?? '',
                $dob,
                $anniversary,
                $notes,
                $path
            ]);

            // If phone status changed, update all lists this subscriber belongs to
            if ($phoneStatusChanged !== 0) {
                $pdo->prepare("UPDATE lists SET phone_count = GREATEST(0, phone_count + ?) WHERE id IN (SELECT list_id FROM subscriber_lists WHERE subscriber_id = ?)")->execute([$phoneStatusChanged, $path]);
            }

            // 10M UPGRADE: Tag Handling (Relational)
            if (isset($data['tags']) && is_array($data['tags'])) {
                // Get old tags
                $stmtOt = $pdo->prepare("SELECT t.name FROM subscriber_tags st JOIN tags t ON st.tag_id = t.id WHERE
    st.subscriber_id = ?");
                $stmtOt->execute([$path]);
                $oldT = $stmtOt->fetchAll(PDO::FETCH_COLUMN);

                $newT = $data['tags'];

                $toAdd = array_diff($newT, $oldT);
                $toRem = array_diff($oldT, $newT);

                foreach ($toRem as $tagName) {
                    $stmtD = $pdo->prepare("DELETE FROM subscriber_tags WHERE subscriber_id = ? AND tag_id = (SELECT id FROM tags WHERE
    name = ? LIMIT 1)");
                    $stmtD->execute([$path, $tagName]);
                }
                foreach ($toAdd as $tagName) {
                    $stmtTag = $pdo->prepare("SELECT id FROM tags WHERE name = ? LIMIT 1");
                    $stmtTag->execute([$tagName]);
                    $tagId = $stmtTag->fetchColumn();
                    if ($tagId) {
                        $pdo->prepare("INSERT IGNORE INTO subscriber_tags (subscriber_id, tag_id) VALUES (?, ?)")->execute([$path, $tagId]);
                        triggerFlows($pdo, $path, 'tag', $tagName);
                    }
                }
            }

            // RESTORED: List Handling
            if (isset($data['listIds'])) {
                $oldLists = $pdo->prepare("SELECT list_id FROM subscriber_lists WHERE subscriber_id = ?");
                $oldLists->execute([$path]);
                $currentListIds = $oldLists->fetchAll(PDO::FETCH_COLUMN);
                $newListIds = $data['listIds'];

                $toRemove = array_diff($currentListIds, $newListIds);
                if (!empty($toRemove)) {
                    $hasPhone = (!empty($newPhone) && trim($newPhone) !== '') ? 1 : 0;
                    foreach ($toRemove as $lid) {
                        $pdo->prepare("DELETE FROM subscriber_lists WHERE subscriber_id = ? AND list_id = ?")->execute([$path, $lid]);
                        $pdo->prepare("UPDATE lists SET subscriber_count = GREATEST(0, subscriber_count - 1), phone_count = GREATEST(0, phone_count - ?) WHERE id = ?")->execute([$hasPhone, $lid]);
                    }
                }

                $toAddL = array_diff($newListIds, $currentListIds);
                if (!empty($toAddL)) {
                    $hasPhone = (!empty($newPhone) && trim($newPhone) !== '') ? 1 : 0;
                    foreach ($toAddL as $lid) {
                        $pdo->prepare("INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)")->execute([$path, $lid]);
                        $pdo->prepare("UPDATE lists SET subscriber_count = subscriber_count + 1, phone_count = phone_count + ? WHERE id = ?")->execute([$hasPhone, $lid]);
                        enrollSubscribersBulk($pdo, [$path], 'list', $lid);
                    }
                }
            }

            // Check Dynamic Segments & Date Triggers
            checkDynamicTriggers($pdo, $path);

            // [NEW] Sync with Zalo
            syncMainToZalo($pdo, $path);

            jsonResponse(true, $data);
        } catch (Exception $e) {
            jsonResponse(false, null, $e->getMessage());
        }
        break;

    case 'DELETE':
        try {
            if (!$path)
                jsonResponse(false, null, 'ID required');

            // [BUG-FIX #14] Wrapped all delete operations in a transaction.
            // Previously, if a DELETE failed mid-way (e.g., after removing subscriber_tags
            // but before removing the subscriber row), the subscriber record would remain
            // but some child data would be gone — or vice versa — causing orphaned data.
            $pdo->beginTransaction();

            // Giảm count của các list trước khi xóa
            $stmtSub = $pdo->prepare("SELECT phone_number FROM subscribers WHERE id = ?");
            $stmtSub->execute([$path]);
            $phone = (string) $stmtSub->fetchColumn();
            $hasPhone = (!empty($phone) && trim($phone) !== '') ? 1 : 0;

            $stmtLists = $pdo->prepare("SELECT list_id FROM subscriber_lists WHERE subscriber_id = ?");
            $stmtLists->execute([$path]);
            $lids = $stmtLists->fetchAll(PDO::FETCH_COLUMN);
            foreach ($lids as $lid) {
                $pdo->prepare("UPDATE lists SET subscriber_count = GREATEST(0, subscriber_count - 1), phone_count = GREATEST(0, phone_count - ?) WHERE id = ?")->execute([$hasPhone, $lid]);
            }

            // 10M UPGRADE: Delete tags relationship
            $pdo->prepare("DELETE FROM subscriber_tags WHERE subscriber_id = ?")->execute([$path]);
            $pdo->prepare("DELETE FROM subscriber_activity WHERE subscriber_id = ?")->execute([$path]);
            $pdo->prepare("DELETE FROM subscriber_flow_states WHERE subscriber_id = ?")->execute([$path]);
            $pdo->prepare("DELETE FROM subscriber_lists WHERE subscriber_id = ?")->execute([$path]);

            $pdo->prepare("DELETE FROM subscribers WHERE id = ?")->execute([$path]);

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