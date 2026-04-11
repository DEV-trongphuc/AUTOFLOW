<?php
require_once 'db_connect.php';
apiHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_GET['id']) ? $_GET['id'] : null;
$route = $_GET['route'] ?? null;

if ($method === 'POST' && $route === 'estimate') {
    $data = json_decode(file_get_contents("php://input"), true);
    // Criteria can be passed as 'criteria' key. Array or string.
    $criteriaJson = isset($data['criteria']) ? (is_string($data['criteria']) ? $data['criteria'] : json_encode($data['criteria'])) : '[]';

    require_once 'segment_helper.php';
    $res = buildSegmentWhereClause($criteriaJson);

    // Default to count all ACTIVE subscribers if no criteria? Or 0?
    // buildSegmentWhereClause returns 1=1 if empty.

    $where = $res['sql'];
    $params = $res['params'];

    // Count query
    // Use alias 's' because segment_helper uses 's.' prefix
    $sql = "SELECT COUNT(*) FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer') AND $where";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $count = $stmt->fetchColumn();
        jsonResponse(true, ['count' => (int) $count]);
    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
}

// NEW ROUTE: Manual Sync all segments
if ($method === 'POST' && $route === 'sync') {
    try {
        require_once 'segment_helper.php';
        $stmt = $pdo->query("SELECT id, criteria FROM segments");
        $segments = $stmt->fetchAll();
        $results = [];
        foreach ($segments as $seg) {
            $res = buildSegmentWhereClause($seg['criteria']);
            $stmtC = $pdo->prepare("SELECT COUNT(*) FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer') AND " . $res['sql']);
            $stmtC->execute($res['params']);
            $count = (int) $stmtC->fetchColumn();
            $pdo->prepare("UPDATE segments SET subscriber_count = ? WHERE id = ?")->execute([$count, $seg['id']]);
            $results[] = ['id' => $seg['id'], 'count' => $count];
        }
        jsonResponse(true, $results, 'Đã đồng bộ lại toàn bộ phân khúc');
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi khi đồng bộ phân khúc: ' . $e->getMessage());
    }
}

// ACTION: CLEANUP
if ($method === 'POST' && $route === 'cleanup') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        $segmentId = $data['segment_id'] ?? null;
        $type = $data['type'] ?? 'invalid_status'; // 'invalid_status' or 'dormant'

        if (!$segmentId)
            jsonResponse(false, null, 'Segment ID required');

        require_once 'segment_helper.php';

        // 1. Get Segment Logic
        $stmt = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
        $stmt->execute([$segmentId]);
        $criteria = $stmt->fetchColumn();
        $res = buildSegmentWhereClause($criteria, $segmentId); // Pass ID to exclude currently excluded

        if ($type === 'invalid_status') {
            // Find users with problematic status
            $sql = "SELECT s.id FROM subscribers s WHERE s.status IN ('unsubscribed', 'error', 'bounced', 'complained') AND " . $res['sql'];
            $stmtSubs = $pdo->prepare($sql);
            $stmtSubs->execute($res['params']);
            $targetIds = $stmtSubs->fetchAll(PDO::FETCH_COLUMN);
        } else {
            // Dormant logic (90 days inactive)
            $days = (int) ($data['days'] ?? 90);
            $dateThreshold = date('Y-m-d H:i:s', strtotime("-$days days"));
            $sql = "SELECT s.id FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer') AND " . $res['sql'];
            $sql .= " AND (s.last_activity_at < ? OR (s.last_activity_at IS NULL AND s.created_at < ?))";
            $params = array_merge($res['params'], [$dateThreshold, $dateThreshold]);
            $stmtSubs = $pdo->prepare($sql);
            $stmtSubs->execute($params);
            $targetIds = $stmtSubs->fetchAll(PDO::FETCH_COLUMN);
        }

        $count = count($targetIds);
        if ($count > 0) {
            foreach (array_chunk($targetIds, 500) as $chunk) {
                $placeholders = implode(',', array_fill(0, count($chunk), '(?, ?)'));
                $values = [];
                foreach ($chunk as $tid) {
                    $values[] = $segmentId;
                    $values[] = $tid;
                }
                $pdo->prepare("INSERT IGNORE INTO segment_exclusions (segment_id, subscriber_id) VALUES $placeholders")->execute($values);
            }

            // [OPTIMIZED] Queue segment count update instead of inline calculation
            $pdo->prepare("INSERT INTO segment_count_update_queue (segment_id) VALUES (?) ON DUPLICATE KEY UPDATE queued_at = NOW()")->execute([$segmentId]);
        }

        jsonResponse(true, ['count' => $count], "Đã dọn dẹp $count người dùng khỏi phân khúc.");
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi khi dọn dẹp phân khúc: ' . $e->getMessage());
    }
}

// ACTION: SPLIT (Selective Copy/Move)
if ($method === 'POST' && $route === 'split') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        $segmentId = $data['segment_id'] ?? null;
        $type = $data['type'] ?? 'list';
        $inputData = $data['data'] ?? [];
        $destinationId = $data['destination_id'] ?? null;
        $destListName = $data['destination_name'] ?? ('Split - ' . date('Y-m-d H:i'));
        $excludeFromSource = !empty($data['exclude_from_source']);
        $cleanupInvalid = !empty($data['cleanup_invalid']);

        require_once 'segment_helper.php';

        // 1. Get List ID or Create New
        $listId = null;
        if ($destinationId) {
            $stmtCheck = $pdo->prepare("SELECT id, name FROM lists WHERE id = ?");
            $stmtCheck->execute([$destinationId]);
            $l = $stmtCheck->fetch(PDO::FETCH_ASSOC);
            if ($l) {
                $listId = $l['id'];
                $destListName = $l['name'];
            }
        }

        if (!$listId) {
            $stmtL = $pdo->prepare("SELECT id FROM lists WHERE name = ?");
            $stmtL->execute([$destListName]);
            $listId = $stmtL->fetchColumn();
            if (!$listId) {
                $listId = uniqid();

                // Get source segment name for tracking
                $sourceLabel = "Manual Split";
                if ($segmentId) {
                    $stmtSeg = $pdo->prepare("SELECT name FROM segments WHERE id = ?");
                    $stmtSeg->execute([$segmentId]);
                    $segName = $stmtSeg->fetchColumn();
                    if ($segName)
                        $sourceLabel = "Split: " . $segName;
                }

                $pdo->prepare("INSERT INTO lists (id, name, source, type, created_at) VALUES (?, ?, ?, 'static', NOW())")->execute([$listId, $destListName, $sourceLabel]);
            }
        }

        // 2. Identify Target Subscribers
        if (!$segmentId) {
            jsonResponse(false, ['message' => 'Lỗi: Không xác định được phân khúc nguồn.']);
            return;
        }

        $targetIds = [];

        if ($type === 'selection') {
            if (empty($inputData)) {
                jsonResponse(false, ['message' => 'Vui lòng chọn ít nhất một khách hàng']);
                return;
            }
            $targetIds = $inputData;
        } elseif ($type === 'list') {
            if (empty($inputData)) {
                jsonResponse(false, ['message' => 'Danh sách nhập vào trống']);
                return;
            }
            // Scope match to current segment if possible
            $segmentScope = "";
            $scopeParams = [];

            $stmtS = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
            $stmtS->execute([$segmentId]);
            $criteria = $stmtS->fetchColumn();

            if ($criteria) {
                $resS = buildSegmentWhereClause($criteria, $segmentId);
                if ($resS) {
                    $segmentScope = " AND " . $resS['sql'];
                    $scopeParams = $resS['params'];
                }
            }

            // [FIX] Chunk IN() to prevent MySQL 65,535 placeholder limit crash.
            // Paste of 10k emails → 20k params (email + phone × 2) → PDO crash.
            // Process in chunks of 500, collect IDs with array_unique to avoid duplicates
            // across chunk boundaries.
            $collectedIds = [];
            foreach (array_chunk($inputData, 500) as $chunk) {
                $ph = implode(',', array_fill(0, count($chunk), '?'));
                $sql = "SELECT id FROM subscribers s WHERE (email IN ($ph) OR phone_number IN ($ph)) $segmentScope";
                $stmtMatch = $pdo->prepare($sql);
                $stmtMatch->execute(array_merge($chunk, $chunk, $scopeParams));
                foreach ($stmtMatch->fetchAll(PDO::FETCH_COLUMN) as $id) {
                    $collectedIds[$id] = true; // Use key dedup instead of array_unique (faster)
                }
            }
            $targetIds = array_keys($collectedIds);

        } elseif ($type === 'phone') {
            $stmtS = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
            $stmtS->execute([$segmentId]);
            $criteria = $stmtS->fetchColumn();
            $res = buildSegmentWhereClause($criteria, $segmentId);
            if ($res) {
                $sql = "SELECT s.id FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer') AND (s.phone_number IS NOT NULL AND LENGTH(s.phone_number) >= 9) AND " . $res['sql'];
                $stmtP = $pdo->prepare($sql);
                $stmtP->execute($res['params']);
                $targetIds = $stmtP->fetchAll(PDO::FETCH_COLUMN);
            } else {
                jsonResponse(false, ['message' => 'Lỗi xác định điều kiện phân khúc gốc']);
                return;
            }
        }

        if (empty($targetIds)) {
            jsonResponse(false, ['message' => 'Không tìm thấy liên hệ nào phù hợp trong phân khúc này để tách.']);
            return;
        }

        // 3. Add to Destination List (Bulk Optimized)
        $addedCount = 0;
        if (!empty($targetIds)) {
            foreach (array_chunk($targetIds, 500) as $chunk) {
                $placeholders = implode(',', array_fill(0, count($chunk), '(?, ?)'));
                $values = [];
                foreach ($chunk as $sid) {
                    $values[] = $sid;
                    $values[] = $listId;
                }
                $stmtIns = $pdo->prepare("INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES $placeholders");
                $stmtIns->execute($values);
                $addedCount += $stmtIns->rowCount();
            }
            $pdo->prepare("UPDATE lists SET subscriber_count = (SELECT COUNT(*) FROM subscriber_lists WHERE list_id = ?) WHERE id = ?")->execute([$listId, $listId]);
        }

        // 4. Handle Exclusion (Bulk Optimized)
        if ($excludeFromSource && $segmentId) {
            foreach (array_chunk($targetIds, 500) as $chunk) {
                $placeholders = implode(',', array_fill(0, count($chunk), '(?, ?)'));
                $values = [];
                foreach ($chunk as $tid) {
                    $values[] = $segmentId;
                    $values[] = $tid;
                }
                $pdo->prepare("INSERT IGNORE INTO segment_exclusions (segment_id, subscriber_id) VALUES $placeholders")->execute($values);
            }
        }

        // 5. Cleanup Invalid
        if ($cleanupInvalid) {
            $inClause = implode(',', array_fill(0, count($targetIds), '?'));
            $stmtBad = $pdo->prepare("SELECT id FROM subscribers WHERE id IN ($inClause) AND status IN ('unsubscribed', 'error', 'bounced', 'complained')");
            $stmtBad->execute($targetIds);
            $badIds = $stmtBad->fetchAll(PDO::FETCH_COLUMN);

            if (!empty($badIds)) {
                foreach (array_chunk($badIds, 500) as $chunk) {
                    $delPlaceholders = implode(',', array_fill(0, count($chunk), '?'));
                    $pdo->prepare("DELETE FROM subscriber_lists WHERE list_id = ? AND subscriber_id IN ($delPlaceholders)")->execute(array_merge([$listId], $chunk));
                }
            }
        }

        // [OPTIMIZED] Queue segment count update
        if ($segmentId) {
            $pdo->prepare("INSERT INTO segment_count_update_queue (segment_id) VALUES (?) ON DUPLICATE KEY UPDATE queued_at = NOW()")->execute([$segmentId]);
        }

        jsonResponse(true, ['count' => $addedCount], "Đã tách $addedCount người dùng vào danh sách '$destListName'.");
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi khi tách phân khúc: ' . $e->getMessage());
    }
}

// ACTION: EXCLUDE (Manual Block)
if ($method === 'POST' && $route === 'exclude') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        $segmentId = $data['segment_id'] ?? null;
        $subscriberIds = $data['subscriber_ids'] ?? [];

        if (!$segmentId || empty($subscriberIds)) {
            jsonResponse(false, null, 'Segment ID and Subscriber IDs required');
        }

        $excludedCount = 0;
        // Optimized Bulk Insert
        foreach (array_chunk($subscriberIds, 500) as $chunk) {
            $placeholders = implode(',', array_fill(0, count($chunk), '(?, ?)'));
            $values = [];
            foreach ($chunk as $sid) {
                $values[] = $segmentId;
                $values[] = $sid;
            }
            $stmtEx = $pdo->prepare("INSERT IGNORE INTO segment_exclusions (segment_id, subscriber_id) VALUES $placeholders");
            $stmtEx->execute($values);
            $excludedCount += $stmtEx->rowCount();
        }

        // [OPTIMIZED] Queue segment count update
        $pdo->prepare("INSERT INTO segment_count_update_queue (segment_id) VALUES (?) ON DUPLICATE KEY UPDATE queued_at = NOW()")->execute([$segmentId]);
        jsonResponse(true, ['count' => $excludedCount], "Đã chặn vĩnh viễn $excludedCount người dùng khỏi phân khúc này.");
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi khi gỡ khỏi phân khúc: ' . $e->getMessage());
    }
}

switch ($method) {
    case 'GET':
        // [PERF] Release session lock immediately to prevent "Pending" state in DevTools
        if (session_id()) session_write_close();

        try {
            // NEW: Stats Route
            if (isset($_GET['route']) && $_GET['route'] === 'stats' && $path) {
                require_once 'segment_helper.php';
                $stmt = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
                $stmt->execute([$path]);
                $criteria = $stmt->fetchColumn();

                if ($criteria) {
                    $res = buildSegmentWhereClause($criteria, $path);
                    $sql = "SELECT s.status, COUNT(*) as count FROM subscribers s WHERE " . $res['sql'] . " GROUP BY s.status";
                    $stmtStat = $pdo->prepare($sql);
                    $stmtStat->execute($res['params']);
                    $stats = $stmtStat->fetchAll(PDO::FETCH_KEY_PAIR);

                    // Add phone count
                    $sqlPhone = "SELECT COUNT(*) FROM subscribers s WHERE (" . $res['sql'] . ") AND (s.phone_number IS NOT NULL AND s.phone_number != '')";
                    $stmtPhone = $pdo->prepare($sqlPhone);
                    $stmtPhone->execute($res['params']);
                    $stats['has_phone'] = (int) $stmtPhone->fetchColumn();

                    jsonResponse(true, $stats);
                } else {
                    jsonResponse(true, []);
                }
                return;
            }

            if (!isset($_GET['page']) && !isset($_GET['limit']) && !isset($_GET['search'])) {
                $stmt = $pdo->query("SELECT id, name, description, criteria, subscriber_count as count, auto_cleanup_days as autoCleanupDays FROM segments ORDER BY name ASC");
                jsonResponse(true, $stmt->fetchAll());
                return;
            }

            $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
            $offset = ($page - 1) * $limit;
            $search = $_GET['search'] ?? '';

            $params = [];
            $whereClauses = [];
            if ($search) {
                $whereClauses[] = "(name LIKE ? OR description LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }
            $whereSql = count($whereClauses) > 0 ? " WHERE " . implode(" AND ", $whereClauses) : "";

            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM segments" . $whereSql);
            $stmtCount->execute($params);
            $total = (int) $stmtCount->fetchColumn();

            $sql = "SELECT id, name, description, criteria, subscriber_count as count, phone_count, auto_cleanup_days as autoCleanupDays FROM segments" . $whereSql . " ORDER BY name ASC LIMIT $limit OFFSET $offset";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $segments = $stmt->fetchAll();

            // [FIX] Read phone_count from cached column in segments table instead of running
            // a live COUNT(*) per segment on every page load. With 50 segments/page at 10M
            // subscribers, the old approach ran 50 full-table COUNT queries = 10-30s load time.
            // phone_count is now maintained async via segment_count_update_queue worker.
            // (No per-segment loop needed — phone_count already in SELECT above)

            jsonResponse(true, [
                'data' => $segments,
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
        break;

    case 'POST':
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? uniqid();
            $criteria = is_string($data['criteria']) ? $data['criteria'] : json_encode($data['criteria']);
            $stmt = $pdo->prepare("INSERT INTO segments (id, name, description, criteria, subscriber_count, auto_cleanup_days) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$id, $data['name'], $data['description'], $criteria, $data['count'], $data['autoCleanupDays']]);
            $data['id'] = $id;
            jsonResponse(true, $data);
        } catch (Exception $e) {
            jsonResponse(false, null, $e->getMessage());
        }
        break;

    case 'PUT':
        try {
            if (!$path)
                jsonResponse(false, null, 'ID required');
            $data = json_decode(file_get_contents("php://input"), true);
            $criteria = is_string($data['criteria']) ? $data['criteria'] : json_encode($data['criteria']);
            $stmt = $pdo->prepare("UPDATE segments SET name=?, description=?, criteria=?, subscriber_count=?, auto_cleanup_days=? WHERE id=?");
            $stmt->execute([$data['name'], $data['description'], $criteria, $data['count'], $data['autoCleanupDays'], $path]);
            jsonResponse(true, $data);
        } catch (Exception $e) {
            jsonResponse(false, null, $e->getMessage());
        }
        break;

    case 'DELETE':
        try {
            if (!$path)
                jsonResponse(false, null, 'ID required');
            $pdo->prepare("DELETE FROM segments WHERE id = ?")->execute([$path]);
            jsonResponse(true, ['id' => $path]);
        } catch (Exception $e) {
            jsonResponse(false, null, $e->getMessage());
        }
        break;
}
?>