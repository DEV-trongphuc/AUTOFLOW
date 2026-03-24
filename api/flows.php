<?php
require_once 'bootstrap.php';
// Initializing system once via bootstrap pattern
initializeSystem($pdo);
$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_GET['id']) ? $_GET['id'] : null;

// ============================================================
// ROUTE: Flow Snapshots (DB-backed history - must be BEFORE switch)
// ============================================================
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS flow_snapshots (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        flow_id VARCHAR(255) NOT NULL,
        label VARCHAR(500) NOT NULL,
        flow_data LONGTEXT NOT NULL,
        created_by VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_flow_snapshots_flow (flow_id),
        INDEX idx_flow_snapshots_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
} catch (Exception $ignored) {
}

// GET snapshots list for a flow
if ($method === 'GET' && isset($_GET['route']) && $_GET['route'] === 'flow-snapshots') {
    try {
        $flowId = $_GET['id'] ?? null;
        if (!$flowId)
            jsonResponse(false, null, 'Flow ID required');
        $limit = (int) ($_GET['limit'] ?? 20);
        $stmt = $pdo->prepare("SELECT id, flow_id, label, created_by, created_at FROM flow_snapshots WHERE flow_id = ? ORDER BY created_at DESC LIMIT ?");
        $stmt->bindValue(1, $flowId, PDO::PARAM_STR);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $snapshots = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse(true, $snapshots);
    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
}

// GET single snapshot full data (for restore)
if ($method === 'GET' && isset($_GET['route']) && $_GET['route'] === 'flow-snapshot-data') {
    try {
        $snapshotId = $_GET['snapshot_id'] ?? null;
        if (!$snapshotId)
            jsonResponse(false, null, 'Snapshot ID required');
        $stmt = $pdo->prepare("SELECT * FROM flow_snapshots WHERE id = ?");
        $stmt->execute([$snapshotId]);
        $snap = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$snap)
            jsonResponse(false, null, 'Snapshot not found');
        $snap['flow_data'] = json_decode($snap['flow_data'], true);
        jsonResponse(true, $snap);
    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
}

// POST: Save new snapshot
if ($method === 'POST' && isset($_GET['route']) && $_GET['route'] === 'flow-snapshots') {
    try {
        $flowId = $_GET['id'] ?? null;
        if (!$flowId)
            jsonResponse(false, null, 'Flow ID required');
        $body = json_decode(file_get_contents('php://input'), true);
        $label = trim($body['label'] ?? 'Chỉnh sửa');
        $flowData = $body['flow_data'] ?? null;
        $createdBy = $body['created_by'] ?? null;
        if (!$flowData)
            jsonResponse(false, null, 'Flow data required');
        $snapshotId = $body['id'] ?? bin2hex(random_bytes(16));
        $stmt = $pdo->prepare("INSERT INTO flow_snapshots (id, flow_id, label, flow_data, created_by) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$snapshotId, $flowId, $label, json_encode($flowData, JSON_UNESCAPED_UNICODE), $createdBy]);
        // Prune: keep latest 20
        $pdo->prepare("DELETE FROM flow_snapshots WHERE flow_id = ? AND id NOT IN (
            SELECT id FROM (SELECT id FROM flow_snapshots WHERE flow_id = ? ORDER BY created_at DESC LIMIT 20) AS keep
        )")->execute([$flowId, $flowId]);
        jsonResponse(true, ['id' => $snapshotId, 'message' => 'Đã lưu phiên bản']);
    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
}

// --- ROUTE: Participants ---
if (isset($_GET['route']) && $_GET['route'] === 'participants') {
    try {
        $flowId = $_GET['id'] ?? null;
        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 100;
        $offset = ($page - 1) * $limit;
        $stepId = $_GET['step_id'] ?? null;
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;
        $type = $_GET['type'] ?? null;
        $linkFilter = $_GET['link'] ?? null;

        if (!$flowId)
            jsonResponse(false, null, 'Flow ID required');
        $params = [$flowId];

        if ($type === 'opens') {
            $whereClauses = ["sa.flow_id = ?", "sa.type = 'open_email'"];
            $countParams = [$flowId];

            if ($stepId) {
                if (strpos($stepId, ',') !== false) {
                    $ids = explode(',', $stepId);
                    $placeholders = implode(',', array_fill(0, count($ids), '?'));
                    $whereClauses[] = "sa.reference_id IN ($placeholders)";
                    foreach ($ids as $id)
                        $countParams[] = $id;
                } else {
                    $whereClauses[] = "sa.reference_id = ?";
                    $countParams[] = $stepId;
                }
            }

            if ($search) {
                $whereClauses[] = "s.email LIKE ?";
                $countParams[] = "%$search%";
            }

            $whereSql = implode(" AND ", $whereClauses);

            if ($search) {
                // Search requires Joining Subscribers
                $stmtCount = $pdo->prepare("SELECT COUNT(DISTINCT sa.subscriber_id) FROM subscriber_activity sa JOIN subscribers s ON sa.subscriber_id = s.id WHERE $whereSql");
            } else {
                // Optimized Count
                $stmtCount = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity sa WHERE $whereSql");
            }
            $stmtCount->execute($countParams);
            $total = (int) $stmtCount->fetchColumn();
            $totalPages = ceil($total / $limit);

            $sql = "SELECT s.id, s.email, s.first_name, s.last_name, sa.reference_id as step_id, 
                           'opened' as status, MIN(sa.created_at) as first_open_at, MAX(sa.created_at) as entered_at,
                           COUNT(sa.id) as open_count, MAX(sa.created_at) as updated_at,
                           MAX(sa.ip_address) as ip_address, MAX(sa.device_type) as device_type,
                           MAX(sa.os) as os, MAX(sa.browser) as browser, MAX(sa.location) as location
                    FROM subscriber_activity sa
                    JOIN subscribers s ON sa.subscriber_id = s.id
                    WHERE $whereSql ";
            // [FIX] ONLY_FULL_GROUP_BY: All non-aggregated columns must be in GROUP BY or wrapped
            // in aggregate functions. sa.ip_address, sa.device_type, sa.os, sa.browser, sa.location
            // were previously bare SELECT columns not in GROUP BY — crash on MySQL 5.7/8.0 strict mode.
            // MAX() selects the most recent value which is semantically correct for device/IP info.
            $sql .= "GROUP BY s.id, sa.reference_id
                    ORDER BY entered_at DESC, first_open_at DESC LIMIT $limit OFFSET $offset";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($countParams);

            $participants = array_map(function ($p) {
                return [
                    'id' => $p['id'],
                    'email' => $p['email'],
                    'name' => trim(($p['first_name'] ?? '') . ' ' . ($p['last_name'] ?? '')),
                    'stepId' => $p['step_id'],
                    'status' => $p['status'],
                    'open_count' => (int) $p['open_count'],
                    'firstOpenAt' => $p['first_open_at'],
                    'completedAt' => $p['updated_at'],
                    'scheduledAt' => null,
                    'enteredAt' => $p['entered_at'],
                    'ip' => $p['ip_address'],
                    'device' => $p['device_type'],
                    'os' => $p['os'],
                    'browser' => $p['browser'],
                    'location' => $p['location']
                ];
            }, $stmt->fetchAll());
        } elseif ($type === 'clicks') {
            $whereClauses = ["sa.flow_id = ?", "sa.type = 'click_link'"];
            $queryParams = [$flowId];

            if ($stepId) {
                if (strpos($stepId, ',') !== false) {
                    $ids = explode(',', $stepId);
                    $placeholders = implode(',', array_fill(0, count($ids), '?'));
                    $whereClauses[] = "sa.reference_id IN ($placeholders)";
                    foreach ($ids as $id)
                        $queryParams[] = $id;
                } else {
                    $whereClauses[] = "sa.reference_id = ?";
                    $queryParams[] = $stepId;
                }
            }

            if ($search) {
                $whereClauses[] = "(s.email LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)";
                $queryParams[] = "%$search%";
                $queryParams[] = "%$search%";
                $queryParams[] = "%$search%";
            }

            if ($linkFilter) {
                $whereClauses[] = "sa.details LIKE ?";
                $queryParams[] = "%$linkFilter%";
            }

            $whereSql = implode(" AND ", $whereClauses);

            if ($search) {
                $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity sa JOIN subscribers s ON sa.subscriber_id = s.id WHERE $whereSql");
            } else {
                $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity sa WHERE $whereSql");
            }
            $stmtCount->execute($queryParams);
            $total = (int) $stmtCount->fetchColumn();
            $totalPages = ceil($total / $limit);

            $sql = "SELECT s.id, s.email, s.first_name, s.last_name, sa.reference_id as step_id, 
                           'clicked' as status, sa.created_at as entered_at, sa.details,
                           sa.ip_address, sa.device_type, sa.os, sa.browser, sa.location
                    FROM subscriber_activity sa
                    JOIN subscribers s ON sa.subscriber_id = s.id
                    WHERE $whereSql
                    ORDER BY sa.created_at DESC LIMIT $limit OFFSET $offset";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($queryParams);

            $participants = array_map(function ($p) {
                return [
                    'id' => $p['id'],
                    'email' => $p['email'],
                    'name' => trim(($p['first_name'] ?? '') . ' ' . ($p['last_name'] ?? '')),
                    'stepId' => $p['step_id'],
                    'status' => $p['status'],
                    'url' => str_replace('Clicked link: ', '', $p['details']),
                    'enteredAt' => $p['entered_at'],
                    'ip' => $p['ip_address'],
                    'device' => $p['device_type'],
                    'os' => $p['os'],
                    'browser' => $p['browser'],
                    'location' => $p['location']
                ];
            }, $stmt->fetchAll());
        } elseif ($type) {
            if ($type === 'unsubscribe') {
                $whereClauses = ["sa.flow_id = ?", "sa.type IN ('unsubscribe', 'unsubscribed_from_flow')"];
                $queryParams = [$flowId];
            } else {
                $whereClauses = ["sa.flow_id = ?", "sa.type = ?"];
                $queryParams = [$flowId, $type];
            }
            if ($stepId) {
                if (strpos($stepId, ',') !== false) {
                    $ids = explode(',', $stepId);
                    $placeholders = implode(',', array_fill(0, count($ids), '?'));
                    $whereClauses[] = "sa.reference_id IN ($placeholders)";
                    foreach ($ids as $id)
                        $queryParams[] = $id;
                } else {
                    $whereClauses[] = "sa.reference_id = ?";
                    $queryParams[] = $stepId;
                }
            }
            if ($search) {
                $whereClauses[] = "(s.email LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)";
                $queryParams[] = "%$search%";
                $queryParams[] = "%$search%";
                $queryParams[] = "%$search%";
            }
            $whereSql = implode(" AND ", $whereClauses);

            if ($search) {
                $stmtCount = $pdo->prepare("SELECT COUNT(DISTINCT sa.subscriber_id) FROM subscriber_activity sa JOIN subscribers s ON sa.subscriber_id = s.id WHERE $whereSql");
            } else {
                $stmtCount = $pdo->prepare("SELECT COUNT(DISTINCT sa.subscriber_id) FROM subscriber_activity sa WHERE $whereSql");
            }
            $stmtCount->execute($queryParams);
            $total = (int) $stmtCount->fetchColumn();
            $totalPages = ceil($total / $limit);

            $sql = "SELECT s.id, s.email, s.phone_number, s.first_name, s.last_name, sa.reference_id as step_id, 
                           sa.type as status, sa.created_at as entered_at, MAX(sa.created_at) as updated_at
                    FROM subscriber_activity sa
                    JOIN subscribers s ON sa.subscriber_id = s.id
                    WHERE $whereSql
                    GROUP BY s.id, sa.reference_id
                    ORDER BY entered_at DESC, updated_at DESC LIMIT $limit OFFSET $offset";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($queryParams);

            $participants = array_map(function ($p) {
                return [
                    'id' => $p['id'],
                    'email' => $p['email'],
                    'name' => trim(($p['first_name'] ?? '') . ' ' . ($p['last_name'] ?? '')),
                    'stepId' => $p['step_id'],
                    'status' => $p['status'],
                    'completedAt' => $p['updated_at'],
                    'enteredAt' => $p['entered_at'],
                    'phone' => $p['phone_number']
                ];
            }, $stmt->fetchAll());
        } elseif ($status === 'all_touched') {
            // NEW: Fetch ONLY Processed (History) users - EXCLUDE Waiting
            if (!$stepId)
                jsonResponse(false, null, 'Step ID required for detailed history');

            // Get IDs from Activity (History) - Filter by "Progression" types
            // Matches the types used in GET /flows logic for 'processed'
            $progressionTypes = [
                'sent_email',
                'receive_email',
                'process_action',
                'sent',
                'update_tag',
                'list_action',
                'enter_flow',
                'unsubscribe',
                'unsubscribed_from_flow',
                'delete_contact',
                'remove_action',
                'wait_processed',
                'condition_true',
                'condition_false',
                'ab_test_a',
                'ab_test_b',
                'advanced_condition',
                'zns_sent',
                'sent_zns', // Include ZNS
                'zns_skipped'
            ];
            $typePlaceholders = implode("','", $progressionTypes);

            $stepIdClause = "reference_id = ?";
            $stepIdParams = [$stepId];
            if (strpos($stepId, ',') !== false) {
                $ids = explode(',', $stepId);
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $stepIdClause = "reference_id IN ($placeholders)";
                $stepIdParams = $ids;
            }

            // ONLY get from activity history, grouped by subscriber
            $historySql = "
                SELECT subscriber_id, MAX(created_at) as entered_at 
                FROM subscriber_activity
                WHERE flow_id = ? AND $stepIdClause AND type IN ('$typePlaceholders')
                GROUP BY subscriber_id
            ";

            // Add search support
            $searchJoin = "";
            $searchWhere = "";
            $countParams = array_merge([$flowId], $stepIdParams);

            if ($search) {
                $searchJoin = "JOIN subscribers s_search ON sa.subscriber_id = s_search.id";
                $searchWhere = "AND (s_search.email LIKE ? OR s_search.first_name LIKE ? OR s_search.last_name LIKE ?)";
                $countParams[] = "%$search%";
                $countParams[] = "%$search%";
                $countParams[] = "%$search%";
            }

            // Optimized Count Query: Avoids subquery overhead
            if ($search) {
                // Search requires joining subscribers
                $countSql = "SELECT COUNT(DISTINCT sa.subscriber_id) 
                             FROM subscriber_activity sa
                             JOIN subscribers s_search ON sa.subscriber_id = s_search.id
                             WHERE sa.flow_id = ? AND sa.$stepIdClause AND sa.type IN ('$typePlaceholders')
                             AND (s_search.email LIKE ? OR s_search.first_name LIKE ? OR s_search.last_name LIKE ?)";
                $stmtCount = $pdo->prepare($countSql);
                $stmtCount->execute($countParams);
            } else {
                // Direct unique count on Activity table (fast with index)
                $countSql = "SELECT COUNT(DISTINCT subscriber_id) 
                             FROM subscriber_activity 
                             WHERE flow_id = ? AND $stepIdClause AND type IN ('$typePlaceholders')";
                $stmtCount = $pdo->prepare($countSql);
                $stmtCount->execute(array_merge([$flowId], $stepIdParams));
            }

            $total = (int) $stmtCount->fetchColumn();
            $totalPages = ceil($total / $limit);

            // Fetch Page - Join with subscribers to get details
            // EXCLUDE anyone currently in waiting/processing state for THIS step
            $sql = "SELECT s.id, s.email, s.phone_number, s.first_name, s.last_name, 
                           u.entered_at,
                           'processed' as status,
                           ? as step_id
                    FROM ($historySql) as u
                    JOIN subscribers s ON u.subscriber_id = s.id
                    LEFT JOIN subscriber_flow_states sfs_exclude 
                        ON u.subscriber_id = sfs_exclude.subscriber_id 
                        AND sfs_exclude.flow_id = ? 
                        AND " . str_replace('reference_id', 'step_id', $stepIdClause ? "sfs_exclude.$stepIdClause" : '') . "
                        AND sfs_exclude.status IN ('waiting', 'processing')
                    WHERE sfs_exclude.id IS NULL
                    " . ($search ? "AND (s.email LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)" : "") . "
                    ORDER BY u.entered_at DESC LIMIT $limit OFFSET $offset";

            $fetchParams = array_merge([$stepId, $flowId], $stepIdParams, [$flowId], $stepIdParams);
            if ($search) {
                $fetchParams[] = "%$search%";
                $fetchParams[] = "%$search%";
                $fetchParams[] = "%$search%";
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($fetchParams);

            $participants = array_map(function ($p) {
                return [
                    'id' => $p['id'],
                    'email' => $p['email'],
                    'name' => trim(($p['first_name'] ?? '') . ' ' . ($p['last_name'] ?? '')),
                    'stepId' => $p['step_id'],
                    'status' => 'processed',
                    'enteredAt' => $p['entered_at'],
                    'completedAt' => $p['entered_at'],
                    'scheduledAt' => null,
                    'phone' => $p['phone_number']
                ];
            }, $stmt->fetchAll());

        } else {
            $allParams = [$flowId]; // Start with flow_id
            $whereClauses = ["sfs.flow_id = ?"];

            if ($stepId) {
                if (strpos($stepId, ',') !== false) {
                    $ids = explode(',', $stepId);
                    $placeholders = implode(',', array_fill(0, count($ids), '?'));
                    $whereClauses[] = "sfs.step_id IN ($placeholders)";
                    foreach ($ids as $id)
                        $allParams[] = $id;
                } else {
                    $whereClauses[] = "sfs.step_id = ?";
                    $allParams[] = $stepId;
                }
            }
            if ($status) {
                if ($status === 'waiting') {
                    $whereClauses[] = "sfs.status IN ('waiting', 'processing')";
                } else {
                    $whereClauses[] = "sfs.status = ?";
                    $allParams[] = $status;
                }
            } else {
                $whereClauses[] = "sfs.status IN ('waiting', 'processing')";
            }
            if ($search) {
                $whereClauses[] = "s.email LIKE ?";
                $allParams[] = "%$search%";
            }

            $whereSql = implode(" AND ", $whereClauses);

            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states sfs JOIN subscribers s ON sfs.subscriber_id = s.id WHERE $whereSql");
            $stmtCount->execute($allParams);
            $total = (int) $stmtCount->fetchColumn();
            $totalPages = ceil($total / $limit);

            $sql = "SELECT s.id, s.email, s.phone_number, s.first_name, s.last_name, sfs.step_id, sfs.status, sfs.scheduled_at, sfs.created_at as entered_at, sfs.updated_at, sfs.last_error
                    FROM subscriber_flow_states sfs
                    JOIN subscribers s ON sfs.subscriber_id = s.id
                    WHERE $whereSql
                    ORDER BY sfs.updated_at DESC, sfs.created_at DESC LIMIT $limit OFFSET $offset";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($allParams);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // [PERF] Batch Fetch Completion Counts
            if (!empty($rows)) {
                $subIds = array_column($rows, 'id');
                $counts = [];
                if (!empty($subIds)) {
                    $placeholders = implode(',', array_fill(0, count($subIds), '?'));
                    $stmtC = $pdo->prepare("SELECT subscriber_id, COUNT(*) as count FROM subscriber_activity WHERE flow_id = ? AND subscriber_id IN ($placeholders) AND type = 'enter_flow' GROUP BY subscriber_id");
                    $stmtC->execute(array_merge([$flowId], $subIds));
                    $counts = $stmtC->fetchAll(PDO::FETCH_KEY_PAIR);
                }
            }

            $participants = array_map(function ($p) use ($counts) {
                return [
                    'id' => $p['id'],
                    'email' => $p['email'],
                    'phone' => $p['phone_number'] ?? null,
                    'name' => trim(($p['first_name'] ?? '') . ' ' . ($p['last_name'] ?? '')),
                    'stepId' => $p['step_id'],
                    'status' => $p['status'],
                    'completedAt' => $p['updated_at'],
                    'scheduledAt' => $p['scheduled_at'],
                    'enteredAt' => $p['entered_at'],
                    'lastError' => $p['last_error'] ?? null,
                    'completion_count' => (int) ($counts[$p['id']] ?? 1)
                ];
            }, $rows);
        }

        jsonResponse(true, ['data' => $participants, 'pagination' => ['total' => $total, 'totalPages' => $totalPages, 'page' => $page, 'limit' => $limit]]);
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi khi tải danh sách người tham gia: ' . $e->getMessage());
    }
}

// --- NEW ROUTE: Real-time Distribution for Flow Analytics Journey ---
if (isset($_GET['route']) && $_GET['route'] === 'distribution') {
    try {
        $flowId = $_GET['id'] ?? null;
        if (!$flowId) {
            echo json_encode(['success' => false, 'message' => 'Flow ID is required']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT step_id, COUNT(*) as count, AVG(TIMESTAMPDIFF(SECOND, created_at, NOW())) as avg_wait_seconds FROM subscriber_flow_states WHERE flow_id = ? AND status IN ('waiting', 'processing') GROUP BY step_id");
        $stmt->execute([$flowId]);
        $dist = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $formattedDist = [];
        foreach ($dist as $d) {
            $formattedDist[$d['step_id']] = [
                'count' => (int) $d['count'],
                'avg_wait' => (float) $d['avg_wait_seconds']
            ];
        }
        echo json_encode(['success' => true, 'data' => $formattedDist]);
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        exit;
    }
}

// --- NEW ROUTE: Click Summary for Flows (Unique Links + Global Stats) ---
if (isset($_GET['route']) && $_GET['route'] === 'click_summary') {
    try {
        $flowId = trim($_GET['id'] ?? '');
        $stepId = trim($_GET['step_id'] ?? '');
        $device = $_GET['device'] ?? null;
        $os = $_GET['os'] ?? null;

        if (!$flowId)
            jsonResponse(false, null, 'Flow ID is required.');

        $params = [$flowId];
        $whereSql = "sa.flow_id = ? AND sa.type = 'click_link'";

        if ($stepId) {
            $whereSql .= " AND sa.reference_id = ?";
            $params[] = $stepId;
        }
        if ($device) {
            $whereSql .= " AND sa.device_type = ?";
            $params[] = $device;
        }
        if ($os) {
            $whereSql .= " AND sa.os = ?";
            $params[] = $os;
        }

        // 1. Get List of Links
        $sql = "SELECT sa.details, COUNT(*) as total_clicks, COUNT(DISTINCT sa.subscriber_id) as unique_clicks 
                FROM subscriber_activity sa
                JOIN subscribers s ON sa.subscriber_id = s.id
                WHERE $whereSql
                GROUP BY sa.details 
                ORDER BY total_clicks DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $links = $stmt->fetchAll();

        foreach ($links as &$l) {
            $l['url'] = str_replace(['Clicked link: ', 'Click link: '], '', $l['details']);
            unset($l['details']);
        }

        // 2. Get Global Unique Clicks (Unique Users)
        $globalSql = "SELECT COUNT(DISTINCT sa.subscriber_id) 
                      FROM subscriber_activity sa 
                      JOIN subscribers s ON sa.subscriber_id = s.id
                      WHERE $whereSql"; // Reuse the same WHERE clause and params
        $stmtGlobal = $pdo->prepare($globalSql);
        $stmtGlobal->execute($params);
        $totalUniqueUsers = (int) $stmtGlobal->fetchColumn();

        jsonResponse(true, [
            'links' => $links,
            'overall' => [
                'unique_clicks' => $totalUniqueUsers
            ]
        ]);
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi khi tải tổng quan lượt click: ' . $e->getMessage());
    }
}

// --- NEW ROUTE: Click Details for Flows (Individual Events) ---
if (isset($_GET['route']) && $_GET['route'] === 'click_details') {
    try {
        $flowId = $_GET['id'] ?? null;
        $stepId = $_GET['step_id'] ?? null;
        if (!$flowId)
            jsonResponse(false, null, 'Flow ID is required.');

        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
        $offset = ($page - 1) * $limit;
        $search = $_GET['search'] ?? '';
        $linkFilter = $_GET['link'] ?? '';

        $params = [$flowId];
        $whereClauses = ["sa.flow_id = ?", "sa.type = 'click_link'"];

        if ($stepId) {
            $whereClauses[] = "sa.reference_id = ?";
            $params[] = $stepId;
        }
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
            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity sa JOIN subscribers s ON sa.subscriber_id = s.id WHERE $whereSql");
        } else {
            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity sa WHERE $whereSql");
        }
        $stmtCount->execute($params);
        $total = (int) $stmtCount->fetchColumn();

        $sql = "SELECT sa.id, sa.subscriber_id, sa.details, sa.created_at, s.email, s.first_name, s.last_name 
                FROM subscriber_activity sa 
                JOIN subscribers s ON sa.subscriber_id = s.id 
                WHERE $whereSql 
                ORDER BY sa.created_at DESC 
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
        jsonResponse(false, null, 'Lỗi khi tải chi tiết lượt click: ' . $e->getMessage());
    }
}

// --- NEW ROUTE: Technology & Location Stats (Flows) ---
if ($method === 'GET' && isset($_GET['route']) && $_GET['route'] === 'tech_stats') {
    try {
        $flowId = trim($_GET['id'] ?? '');
        $stepId = trim($_GET['step_id'] ?? '');
        if (!$flowId)
            jsonResponse(false, null, 'Flow ID is required.');

        $getStats = function ($col) use ($pdo, $flowId, $stepId) {
            // PERF: Removed JOIN subscribers. Filter completely on subscriber_activity
            $sql = "SELECT sa.$col as name, COUNT(*) as value 
                        FROM subscriber_activity sa 
                        WHERE sa.flow_id = ? AND sa.type = 'click_link' AND sa.$col IS NOT NULL AND sa.$col != ''";
            $params = [$flowId];
            if ($stepId) {
                $sql .= " AND sa.reference_id = ?";
                $params[] = $stepId;
            }
            $sql .= " GROUP BY sa.$col ORDER BY value DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        };

        jsonResponse(true, [
            'device' => $getStats('device_type'),
            'os' => $getStats('os'),
            'browser' => $getStats('browser'),
            'location' => $getStats('location')
        ]);
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi khi tải thống kê kỹ thuật: ' . $e->getMessage());
    }
}

// Duplicate route check removed elsewhere or merged here if identical

// --- ROUTE: Completed Users (For Active Flow Modification Checks) ---
if (isset($_GET['route']) && $_GET['route'] === 'completed-users') {
    try {
        $flowId = $_GET['id'] ?? null;
        if (!$flowId)
            jsonResponse(false, null, 'Flow ID required');

        $stmt = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'completed'");
        $stmt->execute([$flowId]);
        $total = (int) $stmt->fetchColumn();

        $stmtBranch = $pdo->prepare("SELECT step_id, COUNT(DISTINCT subscriber_id) as count FROM subscriber_flow_states WHERE flow_id = ? AND status = 'completed' GROUP BY step_id");
        $stmtBranch->execute([$flowId]);
        $branches = $stmtBranch->fetchAll(PDO::FETCH_KEY_PAIR);

        jsonResponse(true, ['total' => $total, 'byBranch' => $branches]);
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi khi kiểm tra người dùng đã hoàn thành: ' . $e->getMessage());
    }
}

// --- NEW ROUTE: Manual Add Participant ---
if ($method === 'POST' && isset($_GET['route']) && $_GET['route'] === 'manual-add-participant') {
    try {
        $flowId = $_GET['id'] ?? null;
        if (!$flowId)
            jsonResponse(false, null, 'Flow ID required');

        $inputData = json_decode(file_get_contents('php://input'), true);
        $stepId = trim($inputData['step_id'] ?? '');

        // Support mixed inputs (Email, Phone, UID)
        $rawInputs = $inputData['inputs'] ?? $inputData['emails'] ?? $inputData['email'] ?? '';

        $items = [];
        if (is_array($rawInputs)) {
            $items = array_map('trim', $rawInputs);
        } else {
            $items = preg_split('/[\r\n,;]+/', $rawInputs, -1, PREG_SPLIT_NO_EMPTY);
        }

        if (empty($items) || !$stepId)
            jsonResponse(false, null, 'Danh sách liên hệ và Step ID không được để trống');

        $addedCount = 0;
        $errors = [];

        $processedSubIds = [];
        $emails = [];
        $phones = [];
        $uids = [];
        $inputMap = [];

        foreach ($items as $item) {
            $item = trim($item);
            if (empty($item))
                continue;

            $isEmail = filter_var($item, FILTER_VALIDATE_EMAIL);
            $isPhone = preg_match('/^(\+84|84|0)(3|5|7|8|9|1[2|6|8|9])([0-9]{8})$/', $item) || (is_numeric($item) && strlen($item) >= 9 && strlen($item) <= 12);
            $isUid = is_numeric($item) && strlen($item) > 12;

            if ($isEmail) {
                $emails[] = $item;
                $inputMap[$item] = ['type' => 'email', 'val' => $item];
            } elseif ($isPhone) {
                $phones[] = $item;
                $inputMap[$item] = ['type' => 'phone', 'val' => $item];
            } elseif ($isUid) {
                $uids[] = $item;
                $inputMap[$item] = ['type' => 'uid', 'val' => $item];
            } else {
                $errors[] = "$item: Định dạng không hợp lệ";
            }
        }

        if (empty($inputMap)) {
            jsonResponse(false, ['errors' => $errors], "Không có liên hệ hợp lệ để xử lý.");
        }

        // 2. Batch find existing subscribers
        $existingSubs = ['email' => [], 'phone' => [], 'uid' => []];

        if (!empty($emails)) {
            $placeholders = implode(',', array_fill(0, count($emails), '?'));
            $stmt = $pdo->prepare("SELECT id, email, phone_number, zalo_user_id FROM subscribers WHERE email IN ($placeholders)");
            $stmt->execute($emails);
            foreach ($stmt->fetchAll() as $row)
                $existingSubs['email'][$row['email']] = $row;
        }

        if (!empty($phones)) {
            $placeholders = implode(',', array_fill(0, count($phones), '?'));
            $stmt = $pdo->prepare("SELECT id, email, phone_number, zalo_user_id FROM subscribers WHERE phone_number IN ($placeholders)");
            $stmt->execute($phones);
            foreach ($stmt->fetchAll() as $row)
                $existingSubs['phone'][$row['phone_number']] = $row;
        }

        if (!empty($uids)) {
            $placeholders = implode(',', array_fill(0, count($uids), '?'));
            $stmt = $pdo->prepare("SELECT id, email, phone_number, zalo_user_id FROM subscribers WHERE zalo_user_id IN ($placeholders)");
            $stmt->execute($uids);
            foreach ($stmt->fetchAll() as $row)
                $existingSubs['uid'][$row['zalo_user_id']] = $row;
        }

        // 3. Batch find Zalo subscribers for enrichment
        $zaloSubs = ['phone' => [], 'uid' => []];
        $zSearchPhones = array_diff($phones, array_keys($existingSubs['phone'] ?? []));
        $zSearchUids = array_diff($uids, array_keys($existingSubs['uid'] ?? []));

        if (!empty($zSearchPhones)) {
            $placeholders = implode(',', array_fill(0, count($zSearchPhones), '?'));
            $stmt = $pdo->prepare("SELECT zalo_user_id, phone_number, manual_email, display_name FROM zalo_subscribers WHERE phone_number IN ($placeholders)");
            $stmt->execute(array_values($zSearchPhones));
            foreach ($stmt->fetchAll() as $row)
                $zaloSubs['phone'][$row['phone_number']] = $row;
        }

        if (!empty($zSearchUids)) {
            $placeholders = implode(',', array_fill(0, count($zSearchUids), '?'));
            $stmt = $pdo->prepare("SELECT zalo_user_id, phone_number, manual_email, display_name FROM zalo_subscribers WHERE zalo_user_id IN ($placeholders)");
            $stmt->execute(array_values($zSearchUids));
            foreach ($stmt->fetchAll() as $row)
                $zaloSubs['uid'][$row['zalo_user_id']] = $row;
        }

        // 4. Process each item and prepare insertions
        $subsToInsert = [];
        $statesToInsert = [];
        $nowStr = date('Y-m-d H:i:s');

        foreach ($inputMap as $raw => $info) {
            $type = $info['type'];
            $val = $info['val'];
            $sub = null;

            if ($type === 'email')
                $sub = $existingSubs['email'][$val] ?? null;
            elseif ($type === 'phone')
                $sub = $existingSubs['phone'][$val] ?? null;
            elseif ($type === 'uid')
                $sub = $existingSubs['uid'][$val] ?? null;

            if ($sub) {
                $subId = $sub['id'];
                if (!in_array($subId, $processedSubIds)) {
                    $processedSubIds[] = $subId;
                    $statesToInsert[] = $subId;
                }
            } else {
                $emailToUse = ($type === 'email') ? $val : null;
                $phoneToUse = ($type === 'phone') ? $val : null;
                $uidToUse = ($type === 'uid') ? $val : null;
                $nameToUse = null;

                if ($type === 'phone' && isset($zaloSubs['phone'][$val])) {
                    $zs = $zaloSubs['phone'][$val];
                    $uidToUse = $zs['zalo_user_id'];
                    $nameToUse = $zs['display_name'];
                    if (!empty($zs['manual_email']))
                        $emailToUse = $zs['manual_email'];
                } elseif ($type === 'uid' && isset($zaloSubs['uid'][$val])) {
                    $zs = $zaloSubs['uid'][$val];
                    $phoneToUse = $zs['phone_number'];
                    $nameToUse = $zs['display_name'];
                    if (!empty($zs['manual_email']))
                        $emailToUse = $zs['manual_email'];
                }

                if (!$emailToUse) {
                    if ($phoneToUse)
                        $emailToUse = $phoneToUse . "@no-email.zalo";
                    elseif ($uidToUse)
                        $emailToUse = "uid_" . $uidToUse . "@no-email.zalo";
                    else {
                        $errors[] = "$raw: Không tìm thấy thông tin";
                        continue;
                    }
                }

                $subsToInsert[$emailToUse] = [
                    'email' => $emailToUse,
                    'phone_number' => $phoneToUse,
                    'zalo_user_id' => $uidToUse,
                    'first_name' => ($nameToUse && $nameToUse !== 'Zalo User') ? $nameToUse : null,
                    'status' => 'active',
                    'created_at' => $nowStr
                ];
            }
        }

        // 5. Execute Batch Subscriber Insertions
        if (!empty($subsToInsert)) {
            $pdo->beginTransaction();
            try {
                // [FIX] Missing 'id' column on INSERT: subscribers table uses UUID (varchar) as PK.
                // Without passing 'id', MySQL throws "Field 'id' doesn't have a default value"
                // because there's no AUTO_INCREMENT on a UUID column.
                // We generate a UUID v4 for each new subscriber inside the loop.
                $sqlIns = "INSERT IGNORE INTO subscribers (id, email, phone_number, zalo_user_id, first_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sqlIns);
                foreach ($subsToInsert as $s) {
                    $newId = sprintf(
                        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                        mt_rand(0, 0xffff),
                        mt_rand(0, 0xffff),
                        mt_rand(0, 0xffff),
                        mt_rand(0, 0x0fff) | 0x4000,
                        mt_rand(0, 0x3fff) | 0x8000,
                        mt_rand(0, 0xffff),
                        mt_rand(0, 0xffff),
                        mt_rand(0, 0xffff)
                    );
                    $stmt->execute([$newId, $s['email'], $s['phone_number'], $s['zalo_user_id'], $s['first_name'], $s['status'], $s['created_at']]);
                }
                $pdo->commit();

                $newEmails = array_keys($subsToInsert);
                $placeholders = implode(',', array_fill(0, count($newEmails), '?'));
                $stmt = $pdo->prepare("SELECT id FROM subscribers WHERE email IN ($placeholders)");
                $stmt->execute($newEmails);
                foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $newId) {
                    if (!in_array($newId, $processedSubIds)) {
                        $processedSubIds[] = $newId;
                        $statesToInsert[] = $newId;
                    }
                }
            } catch (Exception $e) {
                if ($pdo->inTransaction())
                    $pdo->rollBack();
                $errors[] = "Lỗi chèn subscriber: " . $e->getMessage();
            }
        }

        // 6. Execute Batch Flow Enrollment
        if (!empty($statesToInsert)) {
            $pdo->beginTransaction();
            try {
                $placeholders = implode(',', array_fill(0, count($statesToInsert), '?'));
                $pdo->prepare("DELETE FROM subscriber_flow_states WHERE flow_id = ? AND subscriber_id IN ($placeholders)")->execute(array_merge([$flowId], $statesToInsert));

                $sqlState = "INSERT INTO subscriber_flow_states (flow_id, subscriber_id, step_id, status, created_at, updated_at, last_step_at, scheduled_at) VALUES (?, ?, ?, 'waiting', ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sqlState);
                foreach ($statesToInsert as $subId) {
                    $stmt->execute([$flowId, $subId, $stepId, $nowStr, $nowStr, $nowStr, $nowStr]);
                    $addedCount++;
                    if (function_exists('logActivity')) {
                        logActivity($pdo, $subId, 'enter_flow', $stepId, 'Manual Add', "Thêm thủ công qua batch", $flowId);
                    }
                }
                $pdo->commit();
            } catch (Exception $e) {
                if ($pdo->inTransaction())
                    $pdo->rollBack();
                $errors[] = "Lỗi ghi danh flow: " . $e->getMessage();
            }
        }


        if ($addedCount > 0) {
            jsonResponse(true, ['added' => $addedCount, 'errors' => $errors], "Đã thêm thành công $addedCount khách hàng.");
        } else {
            jsonResponse(false, ['errors' => $errors], "Không thêm được khách hàng nào. " . implode(', ', array_slice($errors, 0, 3)));
        }
    } catch (Exception $e) {
        jsonResponse(false, null, 'Error: ' . $e->getMessage());
    }
}

// --- NEW ROUTE: Test Step Action (Resend/Forward) ---
if ($method === 'POST' && isset($_GET['route']) && $_GET['route'] === 'test-step-action') {
    try {
        $flowId = $_GET['id'] ?? null;
        if (!$flowId)
            jsonResponse(false, null, 'Flow ID required');

        $input = json_decode(file_get_contents('php://input'), true);
        $targetEmail = trim($input['target_email'] ?? '');
        $stepId = trim($input['step_id'] ?? '');

        if (!$targetEmail || !$stepId)
            jsonResponse(false, null, 'Target Email and Step ID required');

        // Fetch flow and step
        $stmtFlow = $pdo->prepare("SELECT name, steps, config FROM flows WHERE id = ?");
        $stmtFlow->execute([$flowId]);
        $flowRow = $stmtFlow->fetch();
        if (!$flowRow)
            jsonResponse(false, null, 'Flow not found');

        $flowName = $flowRow['name'];
        $steps = json_decode($flowRow['steps'], true) ?: [];
        $flowConfig = json_decode($flowRow['config'] ?? '{}', true) ?: [];

        $targetStep = null;
        foreach ($steps as $s) {
            if ($s['id'] === $stepId) {
                $targetStep = $s;
                break;
            }
        }

        if (!$targetStep)
            jsonResponse(false, null, 'Step not found');

        // Find subscriber by email or phone
        // [FIX] Use explicit columns instead of SELECT * to reduce data transfer for large subscriber table
        $stmtSub = $pdo->prepare("SELECT id, email, phone_number, first_name, last_name, status, custom_attributes, date_of_birth, anniversary_date, company_name, job_title, gender, city, country, address, last_os, last_device, last_browser, zalo_user_id, tags FROM subscribers WHERE email = ? OR phone_number = ? LIMIT 1");
        $stmtSub->execute([$targetEmail, $targetEmail]);
        $sub = $stmtSub->fetch();

        if (!$sub)
            jsonResponse(false, null, 'Subscriber not found with email/phone: ' . $targetEmail);

        // [REFINE] Use FlowExecutor for consistency and support for ALL action types
        require_once 'Mailer.php';
        require_once 'FlowExecutor.php';

        // Find campaign ID if applicable
        $campaignId = null;
        foreach ($steps as $s) {
            if ($s['type'] === 'trigger' && ($s['config']['type'] ?? '') === 'campaign') {
                $campaignId = $s['config']['targetId'] ?? null;
                break;
            }
        }

        $mailer = new Mailer($pdo, API_BASE_URL);
        $executor = new FlowExecutor($pdo, $mailer, API_BASE_URL);

        // Prepare context for executor (simulating a priority run)
        $context = [
            'flow_name' => $flowName . ' (Resend)',
            'now' => date('Y-m-d H:i:s'),
            'flow_steps' => $steps,
            'is_priority_run' => true
        ];

        // Prepare subscriber data for executor
        $execSub = $sub;
        $execSub['subscriber_id'] = $sub['id'];
        $execSub['sub_email'] = $sub['email'];
        $execSub['sub_status'] = $sub['status'];

        $res = $executor->executeStep($targetStep, $execSub, $flowId, $stepId, $campaignId, $flowConfig, $context);

        // Flush logs immediately
        $mailer->closeConnection();

        if ($res['status'] === 'completed' || $res['status'] === 'waiting') {
            jsonResponse(true, ['message' => "Đã gửi lại thành công đến " . ($sub['email'] ?: $sub['phone_number'])]);
        } else {
            $lastLog = end($res['logs']);
            $msg = $lastLog ? str_replace('  -> ', '', $lastLog) : 'Gửi lại thất bại';
            jsonResponse(false, null, $msg);
        }

    } catch (Exception $e) {
        jsonResponse(false, null, 'Error: ' . $e->getMessage());
    }
}

// --- ROUTE: Migrate Users (Handle Continuation) ---
if (isset($_GET['route']) && $_GET['route'] === 'migrate-users') {
    if ($method !== 'POST')
        jsonResponse(false, null, 'Method not allowed');
    try {
        $flowId = $_GET['id'] ?? null;
        if (!$flowId)
            jsonResponse(false, null, 'Flow ID required');

        $input = json_decode(file_get_contents("php://input"), true);
        $action = $input['action'] ?? 'stop';

        if ($action === 'stop') {
            jsonResponse(true, ['message' => 'Users stopped']);
        }

        if ($action === 'continue') {
            $targetStepId = $input['targetStepId'] ?? null;
            if (!$targetStepId)
                jsonResponse(false, null, 'Target Step ID required for continuation');

            // NEW: Fetch flow steps to check for Wait step characteristics
            $stmtFlow = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
            $stmtFlow->execute([$flowId]);
            $stepsJson = $stmtFlow->fetchColumn();
            $steps = json_decode($stepsJson, true) ?: [];

            // Index steps for fast lookup
            $stepMap = [];
            foreach ($steps as $s) {
                $stepMap[trim($s['id'] ?? '')] = $s;
            }

            $currentId = trim($targetStepId);
            $totalDurationSeconds = 0;
            $finalTargetStepId = $currentId;
            $visited = []; // Prevent infinite loops

            // Skip consecutive "wait" steps and accumulate duration
            while (isset($stepMap[$currentId]) && ($stepMap[$currentId]['type'] ?? '') === 'wait' && !isset($visited[$currentId])) {
                $visited[$currentId] = true;
                $s = $stepMap[$currentId];
                $dur = (int) ($s['config']['duration'] ?? 1);
                $unit = $s['config']['unit'] ?? 'hours';

                // Convert to seconds for accumulation
                // [BUG-E1 FIX] Added 'weeks' unit (same fix as Bug C2 in worker_campaign.php)
                $seconds = $dur;
                if ($unit === 'minutes' || $unit === 'mins')
                    $seconds *= 60;
                elseif ($unit === 'hours')
                    $seconds *= 3600;
                elseif ($unit === 'days')
                    $seconds *= 86400;
                elseif ($unit === 'weeks')
                    $seconds *= 604800;

                $totalDurationSeconds += $seconds;

                // Jump to next
                $nextId = trim($s['nextStepId'] ?? '');
                if (!$nextId)
                    break;
                $currentId = $nextId;
                $finalTargetStepId = $nextId;
            }

            $scheduledAt = date('Y-m-d H:i:s', time() + $totalDurationSeconds);

            $sql = "UPDATE subscriber_flow_states SET status = 'waiting', step_id = ?, scheduled_at = ?, updated_at = NOW() WHERE flow_id = ? AND status = 'completed'";
            $params = [$finalTargetStepId, $scheduledAt, $flowId];

            if (empty($input['continueAll']) && !empty($input['branches'])) {
                $branchList = $input['branches'];
                if (!empty($branchList)) {
                    $placeholders = implode(',', array_fill(0, count($branchList), '?'));
                    $sql .= " AND step_id IN ($placeholders)";
                    $params = array_merge($params, $branchList);
                }
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $count = $stmt->rowCount();

            $stmtUpdateStats = $pdo->prepare("UPDATE flows SET stat_completed = (SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'completed') WHERE id = ?");
            $stmtUpdateStats->execute([$flowId, $flowId]);

            jsonResponse(true, ['message' => 'Users moved to new step', 'count' => $count]);
        }
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi khi di chuyển người dùng: ' . $e->getMessage());
    }
}

// --- ROUTE: History ---
if (isset($_GET['route']) && $_GET['route'] === 'history') {
    try {
        $flowId = $_GET['id'] ?? null;
        $campaignId = $_GET['campaign_id'] ?? null;
        if (!$flowId && !$campaignId)
            jsonResponse(false, null, 'Flow ID or Campaign ID required');

        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 20;
        $offset = ($page - 1) * $limit;
        $search = $_GET['search'] ?? null;

        $sql = "SELECT sa.type, sa.details, sa.created_at, s.email, s.first_name, s.last_name, sa.reference_name as label 
                FROM subscriber_activity sa
                LEFT JOIN subscribers s ON sa.subscriber_id = s.id
                WHERE ";
        $whereClauses = [];
        $params = [];
        if ($flowId && !$campaignId) {
            // [10M UPGRADE] Auto-detect Campaign Trigger to include Campaign Logs
            $stmtF = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
            $stmtF->execute([$flowId]);
            $stepsJson = $stmtF->fetchColumn();
            $steps = json_decode($stepsJson, true) ?: [];
            foreach ($steps as $s) {
                if (($s['type'] === 'trigger') && ($s['config']['type'] ?? '') === 'campaign' && !empty($s['config']['targetId'])) {
                    $campaignId = $s['config']['targetId'];
                    break;
                }
            }
        }

        $sql = "SELECT sa.type, sa.details, sa.created_at, s.email, s.first_name, s.last_name, sa.reference_name as label 
                FROM subscriber_activity sa
                LEFT JOIN subscribers s ON sa.subscriber_id = s.id
                WHERE ";
        $whereClauses = [];
        $params = [];

        if ($flowId) {
            if ($campaignId) {
                // Include logs from Flow OR Campaign
                $whereClauses[] = "(sa.flow_id = ? OR sa.campaign_id = ?)";
                $params[] = $flowId;
                $params[] = $campaignId;
            } else {
                $whereClauses[] = "sa.flow_id = ?";
                $params[] = $flowId;
            }
        } else {
            $whereClauses[] = "sa.campaign_id = ?";
            $params[] = $campaignId;
        }

        if ($search) {
            $whereClauses[] = "(s.email LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        $countSql = "SELECT COUNT(*) FROM subscriber_activity sa LEFT JOIN subscribers s ON sa.subscriber_id = s.id WHERE " . implode(" AND ", $whereClauses);
        $stmtCount = $pdo->prepare($countSql);
        $stmtCount->execute($params);
        $total = (int) $stmtCount->fetchColumn();

        $sql .= implode(" AND ", $whereClauses);
        $sql .= " ORDER BY sa.created_at DESC LIMIT $limit OFFSET $offset";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $logs = $stmt->fetchAll();

        jsonResponse(true, [
            'data' => $logs,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'totalPages' => ceil($total / $limit)
            ]
        ]);
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi khi tải lịch sử: ' . $e->getMessage());
    }
}

// --- ROUTE: ZNS Delivery Stats ---
if (isset($_GET['route']) && $_GET['route'] === 'zns-delivery') {
    try {
        $flowId = $_GET['id'] ?? null;
        $stepId = $_GET['step_id'] ?? null;
        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
        $offset = ($page - 1) * $limit;
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;

        if (!$flowId)
            jsonResponse(false, null, 'Flow ID required');
        $whereClauses = ["zdl.flow_id = ?"];
        $params = [$flowId];

        if ($stepId) {
            $whereClauses[] = "zdl.step_id = ?";
            $params[] = $stepId;
        }
        if ($status) {
            $whereClauses[] = "zdl.status = ?";
            $params[] = $status;
        }
        if ($search) {
            $whereClauses[] = "(s.email LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR zdl.phone_number LIKE ?)";
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        $whereSql = implode(" AND ", $whereClauses);

        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM zalo_delivery_logs zdl LEFT JOIN subscribers s ON zdl.subscriber_id = s.id WHERE $whereSql");
        $stmtCount->execute($params);
        $total = (int) $stmtCount->fetchColumn();

        $sql = "SELECT zdl.id, zdl.subscriber_id, zdl.phone_number, zdl.status, zdl.zalo_msg_id, zdl.error_code, zdl.error_message, zdl.sent_at, zdl.created_at, s.email, s.first_name, s.last_name, zt.template_name FROM zalo_delivery_logs zdl LEFT JOIN subscribers s ON zdl.subscriber_id = s.id LEFT JOIN zalo_templates zt ON zdl.template_id = zt.template_id WHERE $whereSql ORDER BY zdl.created_at DESC LIMIT $limit OFFSET $offset";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmtStats = $pdo->prepare("SELECT status, COUNT(*) as count FROM zalo_delivery_logs WHERE flow_id = ?" . ($stepId ? " AND step_id = ?" : "") . " GROUP BY status");
        $stmtStats->execute($stepId ? [$flowId, $stepId] : [$flowId]);
        $stats = $stmtStats->fetchAll(PDO::FETCH_KEY_PAIR);

        jsonResponse(true, ['logs' => $logs, 'stats' => $stats, 'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total, 'totalPages' => ceil($total / $limit)]]);
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi khi tải báo cáo ZNS: ' . $e->getMessage());
    }
}

// --- ROUTE: Step Errors ---
if (isset($_GET['route']) && $_GET['route'] === 'step-errors') {
    try {
        $flowId = $_GET['id'] ?? null;
        $stepId = $_GET['step_id'] ?? null;
        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
        $offset = ($page - 1) * $limit;
        $search = $_GET['search'] ?? null;

        if (!$flowId || !$stepId)
            jsonResponse(false, null, 'Flow ID and Step ID required');

        if ($stepId && strpos($stepId, ',') !== false) {
            $ids = explode(',', $stepId);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $where = "sa.flow_id = ? AND sa.reference_id IN ($placeholders) AND sa.type = 'failed_email'";
            $params = array_merge([$flowId], $ids);
        } else {
            $where = "sa.flow_id = ? AND sa.reference_id = ? AND sa.type = 'failed_email'";
            $params = [$flowId, $stepId];
        }

        if ($search) {
            $where .= " AND (s.email LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity sa JOIN subscribers s ON sa.subscriber_id = s.id WHERE $where");
        $stmtCount->execute($params);
        $total = (int) $stmtCount->fetchColumn();

        $sql = "SELECT s.id as subscriber_id, s.email, CONCAT(s.first_name, ' ', s.last_name) as name, 
                       sa.type as errorType, sa.details as errorMessage, sa.created_at as timestamp
                FROM subscriber_activity sa
                JOIN subscribers s ON sa.subscriber_id = s.id
                WHERE $where
                ORDER BY sa.created_at DESC
                LIMIT $limit OFFSET $offset";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonResponse(true, [
            'data' => $stmt->fetchAll(),
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'totalPages' => ceil($total / $limit)
            ]
        ]);
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi khi tải danh sách lỗi: ' . $e->getMessage());
    }
}

// --- ROUTE: Step Unsubscribes ---
if (isset($_GET['route']) && $_GET['route'] === 'step-unsubscribes') {
    try {
        $flowId = $_GET['id'] ?? null;
        $stepId = $_GET['step_id'] ?? null;
        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 50;
        $offset = ($page - 1) * $limit;
        $search = $_GET['search'] ?? null;

        if (!$flowId || !$stepId)
            jsonResponse(false, null, 'Flow ID and Step ID required');

        if ($stepId && strpos($stepId, ',') !== false) {
            $ids = explode(',', $stepId);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $where = "sa.flow_id = ? AND sa.reference_id IN ($placeholders) AND sa.type = 'unsubscribe'";
            $params = array_merge([$flowId], $ids);
        } else {
            $where = "sa.flow_id = ? AND sa.reference_id = ? AND sa.type = 'unsubscribe'";
            $params = [$flowId, $stepId];
        }

        if ($search) {
            $where .= " AND (s.email LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity sa JOIN subscribers s ON sa.subscriber_id = s.id WHERE $where");
        $stmtCount->execute($params);
        $total = (int) $stmtCount->fetchColumn();

        $sql = "SELECT s.email, CONCAT(s.first_name, ' ', s.last_name) as name, 
                       sa.created_at as timestamp
                FROM subscriber_activity sa
                JOIN subscribers s ON sa.subscriber_id = s.id
                WHERE $where
                ORDER BY sa.created_at DESC
                LIMIT $limit OFFSET $offset";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonResponse(true, [
            'data' => $stmt->fetchAll(),
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'totalPages' => ceil($total / $limit)
            ]
        ]);
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi khi tải danh sách hủy đăng ký: ' . $e->getMessage());
    }
}

// --- ROUTE: Resolve Step Error ---
if (isset($_GET['route']) && $_GET['route'] === 'resolve-step-error') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        $action = $data['action'] ?? null;
        $flowId = $data['flow_id'] ?? null;
        $stepId = $data['step_id'] ?? null;
        $subscriberIds = $data['subscriber_ids'] ?? [];
        $targetStepId = $data['target_step_id'] ?? null;

        if (!$action || !$flowId || !$stepId || empty($subscriberIds))
            jsonResponse(false, null, 'Invalid parameters');
        $placeholders = implode(',', array_fill(0, count($subscriberIds), '?'));

        if ($action === 'retry') {
            $stmt = $pdo->prepare("UPDATE subscriber_flow_states SET status = 'waiting', scheduled_at = NOW(), updated_at = NOW(), last_error = NULL WHERE flow_id = ? AND step_id = ? AND subscriber_id IN ($placeholders) AND status = 'failed'");
            $stmt->execute(array_merge([$flowId, $stepId], $subscriberIds));
            jsonResponse(true, ['message' => 'Đã đặt lại trạng thái chờ cho ' . count($subscriberIds) . ' người dùng']);
        } else if ($action === 'move') {
            if (!$targetStepId)
                jsonResponse(false, null, 'Target step ID required');
            $stmt = $pdo->prepare("UPDATE subscriber_flow_states SET step_id = ?, status = 'waiting', scheduled_at = NOW(), updated_at = NOW(), last_error = NULL WHERE flow_id = ? AND step_id = ? AND subscriber_id IN ($placeholders) AND status = 'failed'");
            $stmt->execute(array_merge([$targetStepId, $flowId, $stepId], $subscriberIds));
            jsonResponse(true, ['message' => 'Đã chuyển ' . count($subscriberIds) . ' người dùng sang bước mới']);
        } else if ($action === 'cleanup') {
            $stmt = $pdo->prepare("UPDATE subscriber_flow_states SET status = 'completed', updated_at = NOW() WHERE flow_id = ? AND step_id = ? AND subscriber_id IN ($placeholders)");
            $stmt->execute(array_merge([$flowId, $stepId], $subscriberIds));
            $pdo->prepare("UPDATE flows SET stat_completed = stat_completed + ? WHERE id = ?")->execute([count($subscriberIds), $flowId]);
            jsonResponse(true, ['message' => 'Đã dọn dẹp ' . count($subscriberIds) . ' người dùng khỏi automation']);
        }
    } catch (Exception $e) {
        jsonResponse(false, null, 'Lỗi khi xử lý lỗi bước: ' . $e->getMessage());
    }
}





/**
 * Auto-migrate subscribers who are stuck on a deleted or modified step.
 * This function finds subscribers at steps that no longer exist in the new flow definition
 * and moves them to the next best available step (usually the first step after trigger).
 */
function autoMigrateStuckUsers($pdo, $flowId, $newSteps)
{
    try {
        // 1. Get unique step IDs currently occupied by subscribers in this flow
        $stmt = $pdo->prepare("SELECT DISTINCT step_id FROM subscriber_flow_states WHERE flow_id = ? AND status IN ('waiting', 'processing')");
        $stmt->execute([$flowId]);
        $occupiedSteps = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($occupiedSteps))
            return 0;

        // 2. Identify which of these are NOT in the new flow definition
        $newStepIds = array_map(function ($s) {
            return trim($s['id'] ?? '');
        }, $newSteps);
        $orphanedSteps = array_filter($occupiedSteps, function ($sid) use ($newStepIds) {
            return !in_array(trim($sid), $newStepIds);
        });

        if (empty($orphanedSteps))
            return 0;

        // 3. Find Global Fallback Step (First step after ANY trigger)
        $fallbackStepId = null;
        foreach ($newSteps as $ns) {
            if (($ns['type'] ?? '') === 'trigger') {
                $fallbackStepId = trim($ns['nextStepId'] ?? '');
                if ($fallbackStepId)
                    break;
            }
        }

        // Final fallback: First non-trigger step
        if (!$fallbackStepId) {
            foreach ($newSteps as $ns) {
                if (($ns['type'] ?? '') !== 'trigger') {
                    $fallbackStepId = trim($ns['id'] ?? '');
                    if ($fallbackStepId)
                        break;
                }
            }
        }

        if (!$fallbackStepId) {
            // If no steps left at all, mark as completed
            $placeholders = implode(',', array_fill(0, count($orphanedSteps), '?'));
            $stmtFin = $pdo->prepare("UPDATE subscriber_flow_states SET status = 'completed', updated_at = NOW() WHERE flow_id = ? AND step_id IN ($placeholders)");
            $stmtFin->execute(array_merge([$flowId], array_values($orphanedSteps)));
            return $stmtFin->rowCount();
        }

        // 4. Move orphaned subscribers to the fallback step
        $totalMigrated = 0;
        foreach ($orphanedSteps as $oldSid) {
            $stmtMigrate = $pdo->prepare("UPDATE subscriber_flow_states 
                                         SET step_id = ?, status = 'waiting', scheduled_at = NOW(), updated_at = NOW() 
                                         WHERE flow_id = ? AND step_id = ? AND status IN ('waiting', 'processing')");
            $stmtMigrate->execute([$fallbackStepId, $flowId, $oldSid]);
            $totalMigrated += $stmtMigrate->rowCount();

            // Log this migration activity
            // [Note] We don't have individual subscriber IDs here efficiently, 
            // but we can log that a step migration happened.
        }

        return $totalMigrated;

    } catch (Exception $e) {
        error_log("[Flow autoMigrate] Error for flow $flowId: " . $e->getMessage());
        return 0;
    }
}

function formatFlow($row)
{
    $steps = json_decode($row['steps'] ?? '[]', true);
    $row['steps'] = is_array($steps) ? $steps : []; // Ensure array

    $row['config'] = json_decode($row['config'] ?? '{}', true);
    $row['stats'] = [
        'enrolled' => (int) ($row['stat_enrolled'] ?? 0),
        'completed' => (int) ($row['stat_completed'] ?? 0),
        'totalSent' => (int) ($row['stat_total_sent'] ?? 0),
        'totalOpened' => (int) ($row['stat_total_opened'] ?? 0),
        'uniqueOpened' => (int) ($row['stat_unique_opened'] ?? 0),
        'totalClicked' => (int) ($row['stat_total_clicked'] ?? 0),
        'uniqueClicked' => (int) ($row['stat_unique_clicked'] ?? 0),
        'totalFailed' => (int) ($row['stat_total_failed'] ?? 0),
        'totalUnsubscribed' => (int) ($row['stat_total_unsubscribed'] ?? 0),
    ];
    $row['createdAt'] = $row['created_at'];
    $row['archivedAt'] = $row['archived_at'];
    unset(
        $row['stat_enrolled'],
        $row['stat_completed'],
        $row['stat_total_sent'],
        $row['stat_total_opened'],
        $row['stat_unique_opened'],
        $row['stat_total_clicked'],
        $row['stat_unique_clicked'],
        $row['stat_total_failed'],
        $row['stat_total_unsubscribed'],
        $row['created_at'],
        $row['archived_at']
    );
    return $row;
}

// --- NEW ROUTE: Bulk Next Step ---
// MUST be before switch($method) to avoid being intercepted by POST case
if (isset($_GET['route']) && $_GET['route'] === 'bulk-next-step') {
    if ($method !== 'POST')
        jsonResponse(false, null, 'Method not allowed');

    try {
        $flowId = $_GET['id'] ?? null;
        if (!$flowId)
            jsonResponse(false, null, 'Flow ID required');

        $input = json_decode(file_get_contents("php://input"), true);
        $subscriberIds = $input['subscriber_ids'] ?? [];
        $currentStepId = $input['step_id'] ?? null;
        $selectAll = $input['select_all'] ?? false;
        $executeAction = $input['execute_action'] ?? false; // NEW: Execute current step before moving
        $targetStepId = $input['target_step_id'] ?? null; // NEW: For multi-branch steps (Condition, AB Test)

        if (empty($subscriberIds) && !$selectAll)
            jsonResponse(false, null, 'No subscribers selected');

        // Determine next step ID
        $nextStepId = $targetStepId; // Use manual selection if provided

        // Always load steps to identify current step type
        $stmtFlow = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
        $stmtFlow->execute([$flowId]);
        $stepsJson = $stmtFlow->fetchColumn();
        $steps = json_decode($stepsJson, true) ?: [];

        // Find current step data
        $currentStepData = null;
        foreach ($steps as $step) {
            if (trim($step['id'] ?? '') === trim($currentStepId)) {
                $currentStepData = $step;
                break;
            }
        }

        // Auto-detect next step if not manually provided
        if (!$nextStepId && $currentStepData) {
            $nextStepId = trim($currentStepData['nextStepId'] ?? '');
        }

        // [OPTIMIZATION] Expand Step IDs to include wait steps pointing to the current action/template
        $expandedStepIds = [$currentStepId];
        if ($currentStepData) {
            foreach ($steps as $s) {
                if (strtolower($s['type'] ?? '') === 'wait' && trim($s['nextStepId'] ?? '') === trim($currentStepId)) {
                    $expandedStepIds[] = trim($s['id']);
                }
            }
        }
        $stepPlaceholders = implode(',', array_fill(0, count($expandedStepIds), '?'));

        // Determine if this is an "Action" step that needs Engine processing
        // Actions: Email, ZNS, Webhook, Tagging, etc.
        // Non-Actions (Logic): Wait, Condition, AB Test, Trigger, Split
        $stepType = strtolower($currentStepData['type'] ?? '');
        $isActionStep = in_array($stepType, [
            'action', // Standard Email
            'email',
            'zns',
            'zalo_zns',
            'zalo_cs',
            'sms',
            'webhook',
            'update_tag',
            'add_tag',
            'remove_tag',
            'list_action',
            'update_field',
            'notification',
            'remove_action',
            'link_flow'
        ]);

        // No error here, we handle it below as "End of Flow"

        if ($executeAction && $isActionStep) {
            // MODE: Execute current step action, then move to next
            // Set status to 'waiting' and scheduled_at in PASTS so worker processes immediately
            if ($selectAll) {
                $sql = "UPDATE subscriber_flow_states 
                        SET status = 'waiting', 
                            scheduled_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE), 
                            updated_at = NOW() 
                        WHERE flow_id = ? 
                        AND step_id IN ($stepPlaceholders)
                        AND status IN ('waiting', 'processing', 'failed')";
                $params = array_merge([$flowId], $expandedStepIds);
            } else {
                $placeholders = implode(',', array_fill(0, count($subscriberIds), '?'));
                $sql = "UPDATE subscriber_flow_states 
                        SET status = 'waiting', 
                            scheduled_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE), 
                            updated_at = NOW(),
                            last_error = NULL 
                        WHERE flow_id = ? 
                        AND subscriber_id IN ($placeholders) 
                        AND status IN ('waiting', 'processing', 'failed')";
                $params = array_merge([$flowId], $subscriberIds);
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $count = $stmt->rowCount();

            // 1. Get IDs for specific trigger if only one
            $priorityParam = "";
            if (!$selectAll && count($subscriberIds) === 1) {
                $subId = end($subscriberIds);
                // Fetch the specific QUEUE ID to make it bulletproof
                $stmtQueue = $pdo->prepare("SELECT id FROM subscriber_flow_states WHERE flow_id = ? AND subscriber_id = ? AND step_id = ? LIMIT 1");
                $stmtQueue->execute([$flowId, $subId, $currentStepId]);
                $qId = $stmtQueue->fetchColumn();

                if ($qId) {
                    $priorityParam = "&priority_queue_id=$qId&priority_sub_id=$subId&priority_flow_id=$flowId";
                }
            }

            // 2. Trigger worker with priority if applicable
            $refreshUrl = API_BASE_URL . "/worker_flow.php?flow_id=$flowId" . $priorityParam;
            $ctx = stream_context_create(['http' => ['timeout' => 0.1]]);
            @file_get_contents($refreshUrl, false, $ctx);

            // Update stats immediately
            $stmtUpdateStats = $pdo->prepare("UPDATE flows SET 
                stat_enrolled = (SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_flow_states WHERE flow_id = ?),
                stat_completed = (SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'completed')
                WHERE id = ?");
            $stmtUpdateStats->execute([$flowId, $flowId, $flowId]);

            jsonResponse(true, ['message' => "Đang thực hiện action cho $count khách hàng...", 'count' => $count]);
        } else {
            // MODE: Skip current step, move directly to next (Manual Override)
            $isLastStep = !$nextStepId;

            // 1. Log activity FIRST for tracking accuracy
            $stepType = strtolower($currentStepData['type'] ?? '');
            $logType = 'step_skipped';
            if ($stepType === 'email' || $stepType === 'action')
                $logType = 'receive_email';
            if ($stepType === 'wait')
                $logType = 'wait_processed';
            if ($stepType === 'zns' || $stepType === 'zalo_zns' || $stepType === 'zalo_cs')
                $logType = 'zns_sent';

            $details = $isLastStep ? "User manually finished flow" : "User manually moved subscriber (Skipped: $stepType)";

            if ($selectAll) {
                // Batch log for ALL waiting subscribers in this step
                // [FIX] Correct columns for subscriber_activity
                $sqlLog = "INSERT INTO subscriber_activity (subscriber_id, type, reference_id, flow_id, reference_name, details, created_at)
                           SELECT subscriber_id, ?, ?, flow_id, 'Flow Manual Move', ?, NOW()
                           FROM subscriber_flow_states
                           WHERE flow_id = ? AND step_id IN ($stepPlaceholders) AND status IN ('waiting', 'processing')";
                $pdo->prepare($sqlLog)->execute(array_merge([$logType, $currentStepId, $details, $flowId], $expandedStepIds));

                if ($isLastStep) {
                    $sqlLogComp = "INSERT INTO subscriber_activity (subscriber_id, type, reference_id, flow_id, reference_name, details, created_at)
                                   SELECT subscriber_id, 'complete_flow', ?, flow_id, 'Flow Finished', 'Flow finished manually', NOW()
                                   FROM subscriber_flow_states
                                   WHERE flow_id = ? AND step_id IN ($stepPlaceholders) AND status IN ('waiting', 'processing')";
                    $pdo->prepare($sqlLogComp)->execute(array_merge([$currentStepId, $flowId], $expandedStepIds));
                }
            } else if (!empty($subscriberIds)) {
                // log for specific IDs
                foreach ($subscriberIds as $sid) {
                    // [FIX] Correct parameter order for logActivity
                    logActivity($pdo, $sid, $logType, $currentStepId, 'Flow Manual Move', $details, $flowId);
                    if ($isLastStep) {
                        logActivity($pdo, $sid, 'complete_flow', $currentStepId, 'Flow Finished', "Flow finished manually", $flowId);
                    }
                }
            }

            // 2. Update database SECOND
            $newStatus = $isLastStep ? 'completed' : 'waiting';
            $finalNextStepId = $isLastStep ? $currentStepId : $nextStepId;

            if ($selectAll) {
                $sql = "UPDATE subscriber_flow_states 
                        SET step_id = ?, 
                            status = ?, 
                            scheduled_at = NOW(), 
                            updated_at = NOW(),
                            last_step_at = NOW(),
                            last_error = NULL 
                        WHERE flow_id = ? 
                        AND step_id IN ($stepPlaceholders)
                        AND status IN ('waiting', 'processing', 'failed')";
                $params = array_merge([$finalNextStepId, $newStatus, $flowId], $expandedStepIds);
            } else {
                $placeholders = implode(',', array_fill(0, count($subscriberIds), '?'));
                $sql = "UPDATE subscriber_flow_states 
                        SET step_id = ?, 
                            status = ?, 
                            scheduled_at = NOW(), 
                            updated_at = NOW(),
                            last_step_at = NOW(),
                            last_error = NULL 
                        WHERE flow_id = ? 
                        AND subscriber_id IN ($placeholders) 
                        AND status IN ('waiting', 'processing', 'failed')";
                $params = array_merge([$finalNextStepId, $newStatus, $flowId], $subscriberIds);
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $count = $stmt->rowCount();


            // Trigger worker with priority if applicable
            $priorityParam = "";
            if (!$selectAll && count($subscriberIds) === 1) {
                $priorityParam = "&priority_sub_id=" . end($subscriberIds) . "&priority_flow_id=$flowId";
            }
            $refreshUrl = API_BASE_URL . "/worker_flow.php?flow_id=$flowId" . $priorityParam;
            $ctx = stream_context_create(['http' => ['timeout' => 0.1]]);
            @file_get_contents($refreshUrl, false, $ctx);

            // Update stats immediately
            $stmtUpdateStats = $pdo->prepare("UPDATE flows SET 
                stat_enrolled = (SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_flow_states WHERE flow_id = ?),
                stat_completed = (SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'completed')
                WHERE id = ?");
            $stmtUpdateStats->execute([$flowId, $flowId, $flowId]);

            $msg = $isLastStep ? "Đã hoàn thành luồng cho $count khách hàng" : "Đã bỏ qua sang bước tiếp theo cho $count khách hàng";
            jsonResponse(true, ['message' => $msg, 'count' => $count]);
        }
    } catch (Exception $e) {
        jsonResponse(false, null, 'Error moving subscribers: ' . $e->getMessage());
    }
}

// --- NEW ROUTE: Bulk Remove ---
// MUST be before switch($method) to avoid being intercepted by POST case
if (isset($_GET['route']) && $_GET['route'] === 'bulk-remove') {
    if ($method !== 'POST')
        jsonResponse(false, null, 'Method not allowed');

    try {
        $flowId = $_GET['id'] ?? null;
        if (!$flowId)
            jsonResponse(false, null, 'Flow ID required');

        $input = json_decode(file_get_contents("php://input"), true);
        $subscriberIds = $input['subscriber_ids'] ?? [];
        $currentStepId = $input['step_id'] ?? null;
        $selectAll = $input['select_all'] ?? false;


        if (empty($subscriberIds) && !$selectAll)
            jsonResponse(false, null, 'No subscribers selected');

        // Validate step_id for select_all
        if ($selectAll && !$currentStepId)
            jsonResponse(false, null, 'Step ID required for select all');

        // Remove subscribers from flow
        // [BUG-N1 FIX] Re-compute expandedStepIds here (not inherited from bulk-next-step scope)
        $expandedStepIds = [$currentStepId];
        if ($currentStepId) {
            $stmtFlowR = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
            $stmtFlowR->execute([$flowId]);
            $flowStepsJson = $stmtFlowR->fetchColumn();
            $flowSteps = json_decode($flowStepsJson, true) ?: [];
            foreach ($flowSteps as $s) {
                if (strtolower($s['type'] ?? '') === 'wait' && trim($s['nextStepId'] ?? '') === trim($currentStepId)) {
                    $expandedStepIds[] = trim($s['id']);
                }
            }
        }
        $stepPlaceholders = implode(',', array_fill(0, count($expandedStepIds), '?'));

        if ($selectAll) {
            // Remove ALL subscribers in this step
            $sql = "DELETE FROM subscriber_flow_states 
                    WHERE flow_id = ? 
                    AND step_id IN ($stepPlaceholders)";
            $params = array_merge([$flowId], $expandedStepIds);
        } else {
            // Remove only selected subscribers (regardless of status)
            $placeholders = implode(',', array_fill(0, count($subscriberIds), '?'));
            $sql = "DELETE FROM subscriber_flow_states 
                    WHERE flow_id = ? 
                    AND subscriber_id IN ($placeholders)";
            $params = array_merge([$flowId], $subscriberIds);
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $count = $stmt->rowCount();

        // [FIX] Also remove failed activity logs so subscriber disappears from "Gửi lỗi" tab
        // The failed tab reads from subscriber_activity (type=failed_email/zns_failed/zns_skipped)
        if ($selectAll) {
            // For select_all: delete all failed activities in this step
            $sqlAct = "DELETE FROM subscriber_activity 
                       WHERE flow_id = ? 
                       AND reference_id IN ($stepPlaceholders)
                       AND type IN ('failed_email', 'zns_failed', 'zns_skipped')";
            $pdo->prepare($sqlAct)->execute(array_merge([$flowId], $expandedStepIds));
        } else {
            // For specific subscribers: delete their failed activities in this step/flow
            $placeholders2 = implode(',', array_fill(0, count($subscriberIds), '?'));
            $sqlAct = "DELETE FROM subscriber_activity 
                       WHERE flow_id = ? 
                       AND subscriber_id IN ($placeholders2)
                       AND type IN ('failed_email', 'zns_failed', 'zns_skipped')";
            $pdo->prepare($sqlAct)->execute(array_merge([$flowId], $subscriberIds));
        }


        // Update flow stats
        $stmtUpdateStats = $pdo->prepare("UPDATE flows SET 
            stat_enrolled = (SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_flow_states WHERE flow_id = ?),
            stat_completed = (SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'completed')
            WHERE id = ?");
        $stmtUpdateStats->execute([$flowId, $flowId, $flowId]);

        jsonResponse(true, ['message' => "Removed $count subscribers from flow", 'count' => $count]);
    } catch (Exception $e) {
        error_log("Bulk remove error: " . $e->getMessage());
        jsonResponse(false, null, 'Error removing subscribers: ' . $e->getMessage());
    }
}

// --- NEW ROUTE: Export Analytics ---
if (isset($_GET['route']) && $_GET['route'] === 'export-analytics') {
    try {
        // ... (Existing export logic) ...
        jsonResponse(false, null, 'Export logic placeholder');
    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
}

// --- NEW ROUTE: Clean Failed ---
if (isset($_GET['route']) && $_GET['route'] === 'clean-failed') {
    // ... (Existing clean logic) ...
}

// --- NEW ROUTE: Inactive Users ---
if (isset($_GET['route']) && $_GET['route'] === 'inactive-users') {
    try {
        $flowId = $_GET['id'] ?? null;
        if (!$flowId) {
            throw new Exception("Missing Flow ID");
        }

        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 20;
        $offset = ($page - 1) * $limit;

        // Count total for pagination
        $countSql = "SELECT COUNT(DISTINCT sfs.subscriber_id)
                    FROM subscriber_flow_states sfs
                    LEFT JOIN subscriber_activity sa ON sa.subscriber_id = sfs.subscriber_id 
                        AND sa.flow_id = sfs.flow_id 
                        AND sa.type IN ('open_email', 'click_link', 'click_zns', 'zns_clicked', 'zns_replied', 'reply_email', 'form_submit', 'purchase')
                    WHERE sfs.flow_id = ?
                    AND sa.id IS NULL
                    AND sfs.status IN ('waiting', 'processing', 'completed', 'failed')";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute([$flowId]);
        $total = $countStmt->fetchColumn();

        $sql = "SELECT s.id, s.email, s.first_name, s.last_name, 
                TRIM(CONCAT(IFNULL(s.first_name, ''), ' ', IFNULL(s.last_name, ''))) as name,
                s.phone_number, 
                sfs.status as status, sfs.created_at as enteredAt, sfs.updated_at as completedAt,
                sfs.step_id as current_step_id
                FROM subscriber_flow_states sfs
                JOIN subscribers s ON s.id = sfs.subscriber_id
                LEFT JOIN subscriber_activity sa ON sa.subscriber_id = sfs.subscriber_id 
                    AND sa.flow_id = sfs.flow_id 
                    AND sa.type IN ('open_email', 'click_link', 'click_zns', 'zns_clicked', 'zns_replied', 'reply_email', 'form_submit', 'purchase')
                WHERE sfs.flow_id = ?
                AND sa.id IS NULL
                AND sfs.status IN ('waiting', 'processing', 'completed', 'failed')
                GROUP BY s.id
                ORDER BY sfs.created_at DESC
                LIMIT ? OFFSET ?";

        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(1, $flowId);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->bindValue(3, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse(true, [
            'users' => $users,
            'pagination' => [
                'total' => (int) $total,
                'page' => $page,
                'limit' => $limit,
                'totalPages' => ceil($total / $limit)
            ]
        ]);
    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
}


switch ($method) {
    case 'GET':
        try {
            if ($path) {
                $stmt = $pdo->prepare("SELECT * FROM flows WHERE id = ?");
                $stmt->execute([$path]);
                $flow = $stmt->fetch();

                if ($flow) {
                    $stmtRecap = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) as enrolled, COUNT(DISTINCT CASE WHEN status = 'completed' THEN subscriber_id END) as completed FROM subscriber_flow_states WHERE flow_id = ?");
                    $stmtRecap->execute([$path]);
                    $recap = $stmtRecap->fetch();
                    if ($recap) {
                        $flow['stat_enrolled'] = max((int) $flow['stat_enrolled'], (int) $recap['enrolled']);
                        $flow['stat_completed'] = (int) $recap['completed'];
                    }

                    $formatted = formatFlow($flow);

                    // [10M UPGRADE] Sync Campaign Stats if Trigger is Campaign
                    $campaignStats = null;
                    // Detect via Steps (More robust than trigger_type col for legacy data)
                    $steps = $formatted['steps'];
                    $triggerId = null;
                    $campaignId = null;
                    foreach ($steps as $s) {
                        if ($s['type'] === 'trigger' && isset($s['config']['type']) && $s['config']['type'] === 'campaign') {
                            $triggerId = $s['id'];
                            $campaignId = $s['config']['targetId'] ?? null;
                            break;
                        }
                    }

                    if ($campaignId) {
                        // Fetch Campaign Stats
                        // [FIX] Use explicit columns instead of SELECT * to reduce data transfer
                        $stmtCampStats = $pdo->prepare("SELECT id, count_sent, count_unique_opened, count_opened, count_unique_clicked, count_clicked, count_bounced, count_unsubscribed FROM campaigns WHERE id = ?");
                        $stmtCampStats->execute([$campaignId]);
                        $cStats = $stmtCampStats->fetch(PDO::FETCH_ASSOC);

                        if ($cStats) {
                            $campaignStats = [
                                'sent' => (int) ($cStats['count_sent'] ?? 0),
                                'opened' => (int) ($cStats['count_unique_opened'] ?? 0),
                                'total_opened' => (int) ($cStats['count_opened'] ?? 0),
                                'clicked' => (int) ($cStats['count_unique_clicked'] ?? 0),
                                'total_clicked' => (int) ($cStats['count_clicked'] ?? 0),
                                'failed' => (int) ($cStats['count_bounced'] ?? 0),
                                'unsubscribed' => (int) ($cStats['count_unsubscribed'] ?? 0)
                            ];

                            // Merge into Global Flow Stats (User Request: "Tổng lượt gửi")
                            // We explicitly USE the campaign stats if it's a campaign flow, as the flow itself usually has 0 sent (it just enrolls)
                            $formatted['stats']['totalSent'] = max($formatted['stats']['totalSent'], $campaignStats['sent']);

                            // [FIX] Map Campaign Stats to "Total" stats for Header consistency (Header uses totalOpened, Cards use uniqueOpened)
                            // "Khách hàng mở" card uses uniqueOpened. "Tổng lượt mở" header uses totalOpened.
                            $formatted['stats']['totalOpened'] = max($formatted['stats']['totalOpened'], $campaignStats['total_opened'] ?? $campaignStats['opened']);
                            $formatted['stats']['uniqueOpened'] = max($formatted['stats']['uniqueOpened'], $campaignStats['opened']);

                            $formatted['stats']['totalClicked'] = max($formatted['stats']['totalClicked'], $campaignStats['total_clicked'] ?? $campaignStats['clicked']);
                            $formatted['stats']['uniqueClicked'] = max($formatted['stats']['uniqueClicked'], $campaignStats['clicked']);

                            $formatted['stats']['totalFailed'] = max($formatted['stats']['totalFailed'], $campaignStats['failed']);
                            $formatted['stats']['totalUnsubscribed'] = max($formatted['stats']['totalUnsubscribed'], $campaignStats['unsubscribed']);
                        }
                    }

                    $stmtStats = $pdo->prepare("SELECT reference_id, type, COUNT(id) as total_count, COUNT(DISTINCT subscriber_id) as unique_count FROM subscriber_activity WHERE flow_id = ? GROUP BY reference_id, type");
                    $stmtStats->execute([$path]);
                    $rawStats = $stmtStats->fetchAll();

                    $stmtOcc = $pdo->prepare("SELECT step_id, COUNT(id) as count FROM subscriber_flow_states WHERE flow_id = ? AND status IN ('waiting', 'processing') GROUP BY step_id");
                    $stmtOcc->execute([$path]);
                    $rawOcc = $stmtOcc->fetchAll();

                    $stmtBranches = $pdo->prepare("SELECT reference_id, details, COUNT(id) as count FROM subscriber_activity WHERE flow_id = ? AND type IN ('condition_true', 'advanced_condition') GROUP BY reference_id, details");
                    $stmtBranches->execute([$path]);
                    $rawBranches = $stmtBranches->fetchAll();

                    $stepStatsMap = [];
                    foreach ($rawOcc as $o) {
                        $occId = trim($o['step_id']);
                        $stepStatsMap[$occId] = ['sent' => 0, 'opened' => 0, 'unique_opened' => 0, 'clicked' => 0, 'unique_clicked' => 0, 'failed' => 0, 'processed' => 0, 'matched' => 0, 'timed_out' => 0, 'path_a' => 0, 'path_b' => 0, 'openRate' => 0, 'clickRate' => 0, 'errorRate' => 0, 'waiting' => (int) $o['count'], 'branchStats' => []];
                    }

                    foreach ($rawStats as $s) {
                        $refId = trim($s['reference_id']);
                        if (!isset($stepStatsMap[$refId]))
                            $stepStatsMap[$refId] = ['sent' => 0, 'opened' => 0, 'unique_opened' => 0, 'clicked' => 0, 'unique_clicked' => 0, 'failed' => 0, 'processed' => 0, 'matched' => 0, 'timed_out' => 0, 'path_a' => 0, 'path_b' => 0, 'openRate' => 0, 'clickRate' => 0, 'errorRate' => 0, 'waiting' => 0, 'branchStats' => []];
                        if (in_array($s['type'], ['sent_email', 'receive_email', 'process_action', 'sent', 'zalo_sent', 'zns_sent'])) {
                            $stepStatsMap[$refId]['sent'] += (int) $s['total_count'];
                            $stepStatsMap[$refId]['processed'] += (int) $s['total_count'];
                        }
                        if ($s['type'] === 'failed_email' || $s['type'] === 'zns_failed')
                            $stepStatsMap[$refId]['failed'] += (int) $s['total_count'];
                        if ($s['type'] === 'open_email') {
                            $stepStatsMap[$refId]['opened'] += (int) $s['total_count'];
                            $stepStatsMap[$refId]['unique_opened'] += (int) $s['unique_count'];
                        }
                        if (in_array($s['type'], ['click_link', 'zalo_clicked', 'zns_clicked', 'click_zns'])) {
                            $stepStatsMap[$refId]['clicked'] += (int) $s['total_count'];
                            $stepStatsMap[$refId]['unique_clicked'] += (int) $s['unique_count'];
                        }
                        if (in_array($s['type'], ['update_tag', 'list_action', 'enter_flow', 'unsubscribe', 'delete_contact', 'remove_action', 'wait_processed', 'condition_true', 'condition_false', 'ab_test_a', 'ab_test_b', 'advanced_condition'])) {
                            $stepStatsMap[$refId]['processed'] += (int) $s['unique_count'];
                            if ($s['type'] === 'condition_true' || $s['type'] === 'advanced_condition')
                                $stepStatsMap[$refId]['matched'] = (int) $s['unique_count'];
                            if ($s['type'] === 'condition_false')
                                $stepStatsMap[$refId]['timed_out'] = (int) $s['unique_count'];
                            if ($s['type'] === 'ab_test_a')
                                $stepStatsMap[$refId]['path_a'] = (int) $s['unique_count'];
                            if ($s['type'] === 'ab_test_b')
                                $stepStatsMap[$refId]['path_b'] = (int) $s['unique_count'];
                        }
                    }

                    // [10M UPGRADE] Inject Campaign Stats into Trigger Step
                    if ($campaignStats && isset($triggerId) && isset($stepStatsMap[$triggerId])) {
                        // We overwrite Trigger Step stats with Campaign Stats because "Action" happened in Campaign
                        $stepStatsMap[$triggerId]['sent'] = $campaignStats['sent'];
                        $stepStatsMap[$triggerId]['unique_opened'] = $campaignStats['opened'];
                        $stepStatsMap[$triggerId]['unique_clicked'] = $campaignStats['clicked'];
                        $stepStatsMap[$triggerId]['failed'] = $campaignStats['failed'];
                        // Also update 'processed' to reflect Sent count as they passed through
                        $stepStatsMap[$triggerId]['processed'] = max($stepStatsMap[$triggerId]['processed'], $campaignStats['sent']);
                    } elseif ($campaignStats && isset($triggerId)) {
                        // Create entry if missing
                        $stepStatsMap[$triggerId] = [
                            'sent' => $campaignStats['sent'],
                            'opened' => 0, // Total open not avail in quick stats, use unique
                            'unique_opened' => $campaignStats['opened'],
                            'clicked' => 0,
                            'unique_clicked' => $campaignStats['clicked'],
                            'failed' => $campaignStats['failed'],
                            'processed' => $campaignStats['sent'],
                            'matched' => 0,
                            'timed_out' => 0,
                            'path_a' => 0,
                            'path_b' => 0,
                            'openRate' => 0,
                            'clickRate' => 0,
                            'errorRate' => 0,
                            'waiting' => 0,
                            'branchStats' => []
                        ];
                    }

                    foreach ($rawBranches as $b) {
                        $refId = trim($b['reference_id']);
                        if (isset($stepStatsMap[$refId])) {
                            $label = str_replace(['Matched: ', 'Advanced Condition matched: '], '', $b['details']);
                            $stepStatsMap[$refId]['branchStats'][$label] = (int) $b['count'];
                        }
                    }

                    foreach ($stepStatsMap as &$st) {
                        if ($st['sent'] > 0) {
                            $st['openRate'] = round(($st['unique_opened'] / $st['sent']) * 100, 1);
                            $st['clickRate'] = round(($st['unique_clicked'] / $st['sent']) * 100, 1);
                            $st['errorRate'] = round(($st['failed'] / ($st['sent'] + $st['failed'])) * 100, 1);
                        }
                    }

                    foreach ($formatted['steps'] as &$step) {
                        $sId = trim($step['id']);
                        $step['stats'] = $stepStatsMap[$sId] ?? ['sent' => 0, 'opened' => 0, 'unique_opened' => 0, 'clicked' => 0, 'unique_clicked' => 0, 'processed' => 0, 'openRate' => 0, 'clickRate' => 0, 'waiting' => 0];
                    }
                    jsonResponse(true, $formatted);
                } else {
                    jsonResponse(false, null, 'Not found');
                }
            } else {
                $stmt = $pdo->query("SELECT * FROM flows ORDER BY created_at DESC");
                $flows = $stmt->fetchAll();
                jsonResponse(true, array_map('formatFlow', $flows));
            }
        } catch (Exception $e) {
            jsonResponse(false, null, 'Lỗi khi tải dữ liệu automation: ' . $e->getMessage());
        }
        break;

    case 'POST':
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $id = $data['id'] ?? uniqid();

            // [FIX] Bổ sung trigger_type nếu null (frontend đã clean orphaned steps)
            $triggerType = $data['trigger_type'] ?? null;

            // Nếu trigger_type null, tìm và bổ sung từ trigger step
            if ($triggerType === null) {
                $stepsArr = $data['steps'] ?? [];
                foreach ($stepsArr as $s) {
                    if ($s['type'] === 'trigger' && isset($s['config']['type'])) {
                        $triggerType = $s['config']['type'];
                        error_log("[Flow Create] Auto-filled trigger_type for new flow $id: $triggerType");
                        break;
                    }
                }
            }

            $steps = json_encode($data['steps'] ?? []);
            $config = json_encode($data['config'] ?? (object) []);
            $sql = "INSERT INTO flows (id, name, description, status, steps, config, trigger_type, created_at, stat_enrolled, stat_completed, stat_total_sent, stat_total_opened, stat_unique_opened, stat_total_clicked, stat_unique_clicked, stat_total_failed, stat_total_unsubscribed) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 0, 0, 0, 0, 0, 0, 0, 0, 0)";
            $pdo->prepare($sql)->execute([$id, $data['name'] ?? 'Flow mới', $data['description'] ?? '', $data['status'] ?? 'draft', $steps, $config, $triggerType]);
            jsonResponse(true, ['id' => $id]);
        } catch (Exception $e) {
            jsonResponse(false, null, 'Lỗi khi tạo automation: ' . $e->getMessage());
        }
        break;

    case 'PUT':
        try {
            if (!$path)
                jsonResponse(false, null, 'ID required');
            $data = json_decode(file_get_contents("php://input"), true);

            // [FIX] Bổ sung trigger_type nếu null (frontend đã clean orphaned steps)
            $triggerType = $data['trigger_type'] ?? null;

            // Nếu trigger_type null, tìm và bổ sung từ trigger step
            if ($triggerType === null) {
                $stepsArr = $data['steps'] ?? [];
                foreach ($stepsArr as $s) {
                    if ($s['type'] === 'trigger' && isset($s['config']['type'])) {
                        $triggerType = $s['config']['type'];
                        error_log("[Flow Save] Auto-filled trigger_type for flow $path: $triggerType");
                        break;
                    }
                }
            }

            $steps = json_encode($data['steps'] ?? []);
            $config = json_encode($data['config'] ?? (object) []);
            $stats = $data['stats'] ?? [];

            // [DEBUG] Log trigger_type để debug
            error_log("[Flow Save] Flow $path - Received trigger_type from frontend: " . ($data['trigger_type'] ?? 'NULL') . ", Final trigger_type: " . ($triggerType ?? 'NULL'));

            // [SYNC WAIT TIMES] Fetch old steps to check for changes in wait times
            $stmtOld = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
            $stmtOld->execute([$path]);
            $oldStepsJson = $stmtOld->fetchColumn();
            $oldSteps = json_decode($oldStepsJson, true) ?: [];
            $oldWaitConfigs = [];
            foreach ($oldSteps as $os) {
                if (($os['type'] ?? '') === 'wait') {
                    $oldWaitConfigs[trim($os['id'])] = $os['config'] ?? [];
                }
            }

            $currentSteps = $data['steps'] ?? [];
            $rescheduledCount = 0;
            foreach ($currentSteps as $ns) {
                $nsId = trim($ns['id'] ?? '');
                if (($ns['type'] ?? '') === 'wait' && isset($oldWaitConfigs[$nsId])) {
                    $newConf = $ns['config'] ?? [];
                    $oldConf = $oldWaitConfigs[$nsId];

                    if (($newConf['duration'] ?? '') != ($oldConf['duration'] ?? '') || ($newConf['unit'] ?? '') != ($oldConf['unit'] ?? '')) {
                        // Config changed! Reschedule subscribers currently waiting at this step.
                        $dur = (int) ($newConf['duration'] ?? 1);
                        $unit = $newConf['unit'] ?? 'hours';
                        $seconds = $dur;
                        if ($unit === 'minutes')
                            $seconds *= 60;
                        elseif ($unit === 'hours')
                            $seconds *= 3600;
                        elseif ($unit === 'days')
                            $seconds *= 86400;
                        elseif ($unit === 'weeks')
                            $seconds *= 604800;

                        // [FIX] Removed duplicate DATE_ADD SQL UPDATE that was here.
                        // That SQL ran first and if updated_at has ON UPDATE CURRENT_TIMESTAMP,
                        // it would reset updated_at to NOW(). Then the PHP loop below would
                        // base its calculation on NOW() instead of the original wait-entry time,
                        // causing subscribers to restart their wait from scratch.
                        // The PHP loop below handles rescheduling correctly using last_step_at.
                    }
                }
            }
            if ($rescheduledCount > 0) {
                error_log("[Wait Sync] Rescheduled $rescheduledCount subscribers for flow $path due to wait time config change.");
            }

            $sql = "UPDATE flows SET name=?, description=?, status=?, steps=?, config=?, trigger_type=?, stat_enrolled=?, stat_completed=?, stat_total_sent=?, stat_total_opened=?, stat_unique_opened=?, stat_total_clicked=?, stat_unique_clicked=?, stat_total_failed=?, stat_total_unsubscribed=?, stat_zalo_sent=?, archived_at=? WHERE id=?";
            $pdo->prepare($sql)->execute([$data['name'], $data['description'], $data['status'], $steps, $config, $triggerType, (int) ($stats['enrolled'] ?? 0), (int) ($stats['completed'] ?? 0), (int) ($stats['totalSent'] ?? 0), (int) ($stats['totalOpened'] ?? 0), (int) ($stats['uniqueOpened'] ?? 0), (int) ($stats['totalClicked'] ?? 0), (int) ($stats['uniqueClicked'] ?? 0), (int) ($stats['totalFailed'] ?? 0), (int) ($stats['totalUnsubscribed'] ?? 0), (int) ($stats['zaloSent'] ?? 0), $data['archivedAt'] ?? null, $path]);

            if ($data['status'] === 'active') {
                $stepsArr = json_decode($steps, true);
                $trigger = null;
                foreach ($stepsArr as $s) {
                    if ($s['type'] === 'trigger') {
                        $trigger = $s;
                        break;
                    }
                }

                if ($trigger && isset($trigger['config']['type']) && $trigger['config']['type'] === 'segment') {
                    if (isset($trigger['nextStepId'])) {
                        $segmentId = $trigger['config']['targetId'];
                        $stmtSeg = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
                        $stmtSeg->execute([$segmentId]);
                        $criteria = $stmtSeg->fetchColumn();

                        if ($criteria) {
                            require_once 'segment_helper.php';
                            $res = buildSegmentWhereClause($criteria, $segmentId);
                            if ($res['sql'] !== '1=1') {
                                // 1. Get all candidates
                                $whereSql = $res['sql'];
                                $sqlSub = "SELECT s.id FROM subscribers s WHERE $whereSql AND s.status IN ('active', 'lead', 'customer')";
                                $stmtSubs = $pdo->prepare($sqlSub);
                                $stmtSubs->execute($res['params']);
                                $subIds = $stmtSubs->fetchAll(PDO::FETCH_COLUMN);

                                if (!empty($subIds)) {
                                    // 2. Prepare Config
                                    $fConfig = $data['config'] ?? [];
                                    $frequency = $fConfig['frequency'] ?? 'one-time';
                                    $allowMultiple = !empty($fConfig['allowMultiple']);
                                    $maxEnrollments = (int) ($fConfig['maxEnrollments'] ?? 0);
                                    $cooldownHours = (int) ($fConfig['enrollmentCooldownHours'] ?? 12);

                                    // 3. Process in Chunks
                                    $chunks = array_chunk($subIds, 1000);
                                    $totalAdded = 0;
                                    $pastTime = date('Y-m-d H:i:s', strtotime('-1 second'));

                                    foreach ($chunks as $chunk) {
                                        $placeholders = implode(',', array_fill(0, count($chunk), '?'));

                                        $existsCheckSql = "";
                                        if ($frequency === 'one-time') {
                                            $existsCheckSql = "AND NOT EXISTS (SELECT 1 FROM subscriber_flow_states sfs WHERE sfs.subscriber_id = s.id AND sfs.flow_id = ?)";
                                        } else {
                                            $checks = [];
                                            if ($maxEnrollments > 0) {
                                                $checks[] = "(SELECT COUNT(*) FROM subscriber_flow_states sfs WHERE sfs.subscriber_id = s.id AND sfs.flow_id = ?) < $maxEnrollments";
                                            }
                                            if ($allowMultiple) {
                                                $checks[] = "NOT EXISTS (SELECT 1 FROM subscriber_flow_states sfs WHERE sfs.subscriber_id = s.id AND sfs.flow_id = ? AND sfs.status IN ('waiting', 'processing'))";
                                            } else {
                                                $checks[] = "NOT EXISTS (SELECT 1 FROM subscriber_flow_states sfs WHERE sfs.subscriber_id = s.id AND sfs.flow_id = ? AND (sfs.status IN ('waiting', 'processing') OR sfs.updated_at > DATE_SUB(NOW(), INTERVAL $cooldownHours HOUR)))";
                                            }
                                            $existsCheckSql = "AND " . implode(" AND ", $checks);
                                        }

                                        $sqlIns = "INSERT INTO subscriber_flow_states (flow_id, subscriber_id, step_id, scheduled_at, status, created_at, updated_at, last_step_at)
                                                   SELECT ?, s.id, ?, ?, 'waiting', NOW(), NOW(), NOW()
                                                   FROM subscribers s
                                                   WHERE s.id IN ($placeholders)
                                                   $existsCheckSql";

                                        $checkParams = [];
                                        if ($frequency === 'one-time') {
                                            $checkParams[] = $path;
                                        } else {
                                            if ($maxEnrollments > 0)
                                                $checkParams[] = $path;
                                            $checkParams[] = $path;
                                        }

                                        // Params: [flowId, stepId, time] + [sub IDs] + [checkParams]
                                        $params = array_merge([$path, $trigger['nextStepId'], $pastTime], $chunk, $checkParams);

                                        $stmtIns = $pdo->prepare($sqlIns);
                                        $stmtIns->execute($params);
                                        $totalAdded += $stmtIns->rowCount();
                                    }

                                    if ($totalAdded > 0) {
                                        $pdo->prepare("UPDATE flows SET stat_enrolled = stat_enrolled + ? WHERE id = ?")->execute([$totalAdded, $path]);
                                        $data['backpopulated_count'] = $totalAdded;
                                    }
                                }
                            }
                        }
                    }
                }

                // AUTO-MIGRATION: Migrate stuck users at deleted steps (Careful Migration)
                $migratedCount = autoMigrateStuckUsers($pdo, $path, $stepsArr);
                if ($migratedCount > 0) {
                    error_log("[Flow Save] Auto-migrated $migratedCount orphaned users for flow $path");
                }

                // [ISSUE #4 FIX] Update wait times for subscribers when wait step config changes
                // [BUG-FIX] Bug #4: The original code fetched old steps AGAIN after the UPDATE,
                // meaning it read back the NEW steps \u2014 not the old ones. The wait-time comparison
                // old vs new was therefore always new vs new, so reschedule never triggered.
                // Fix: Reuse $oldWaitConfigs built BEFORE the UPDATE above (line ~2218).
                // Build old steps map from the already-fetched $oldSteps (pre-UPDATE)
                $oldStepsMap = [];
                foreach ($oldSteps as $os) {
                    $oldStepsMap[$os['id']] = $os;
                }

                // Check for wait step changes
                foreach ($stepsArr as $newStep) {
                    if ($newStep['type'] === 'wait' && isset($oldStepsMap[$newStep['id']])) {
                        $oldStep = $oldStepsMap[$newStep['id']];
                        $configChanged = false;

                        // Check if wait configuration changed
                        $oldConfig = $oldStep['config'] ?? [];
                        $newConfig = $newStep['config'] ?? [];

                        // Compare relevant wait config fields
                        if (
                            ($oldConfig['waitType'] ?? '') !== ($newConfig['waitType'] ?? '') ||
                            ($oldConfig['duration'] ?? '') !== ($newConfig['duration'] ?? '') ||
                            ($oldConfig['unit'] ?? '') !== ($newConfig['unit'] ?? '') ||
                            ($oldConfig['specificDate'] ?? '') !== ($newConfig['specificDate'] ?? '') ||
                            ($oldConfig['specificTime'] ?? '') !== ($newConfig['specificTime'] ?? '')
                        ) {
                            $configChanged = true;
                        }

                        if ($configChanged) {
                            // Recalculate scheduled_at for waiting subscribers at this step
                            // [FIX] Use last_step_at (when subscriber ENTERED this wait step) as base time.
                            // updated_at CANNOT be trusted here: it changes on every DB update
                            // (including ON UPDATE CURRENT_TIMESTAMP), so using it as basetime
                            // would re-anchor the wait duration to the moment of the admin edit
                            // rather than when the subscriber originally arrived at this step.
                            $stmtWaiting = $pdo->prepare("SELECT id, last_step_at, updated_at FROM subscriber_flow_states WHERE flow_id = ? AND step_id = ? AND status = 'waiting'");
                            $stmtWaiting->execute([$path, $newStep['id']]);
                            $waitingItems = $stmtWaiting->fetchAll();

                            foreach ($waitingItems as $wi) {
                                $newScheduledAt = null;
                                $waitType = $newConfig['waitType'] ?? 'duration';

                                if ($waitType === 'duration') {
                                    $duration = (int) ($newConfig['duration'] ?? 1);
                                    $unit = $newConfig['unit'] ?? 'hours';
                                    // Prefer last_step_at (entry time) over updated_at (changed by DB triggers)
                                    $baseTimeStr = !empty($wi['last_step_at']) ? $wi['last_step_at'] : $wi['updated_at'];
                                    $baseTime = strtotime($baseTimeStr);

                                    switch ($unit) {
                                        case 'minutes':
                                            $newScheduledAt = date('Y-m-d H:i:s', $baseTime + ($duration * 60));
                                            break;
                                        case 'hours':
                                            $newScheduledAt = date('Y-m-d H:i:s', $baseTime + ($duration * 3600));
                                            break;
                                        case 'days':
                                            $newScheduledAt = date('Y-m-d H:i:s', $baseTime + ($duration * 86400));
                                            break;
                                    }
                                } elseif ($waitType === 'until') {
                                    $specificDate = $newConfig['specificDate'] ?? '';
                                    $specificTime = $newConfig['specificTime'] ?? '09:00';
                                    if ($specificDate) {
                                        $newScheduledAt = $specificDate . ' ' . $specificTime . ':00';
                                    }
                                }

                                if ($newScheduledAt) {
                                    $pdo->prepare("UPDATE subscriber_flow_states SET scheduled_at = ? WHERE id = ?")->execute([$newScheduledAt, $wi['id']]);
                                }
                            }

                            if (count($waitingItems) > 0) {
                                error_log("[Flow Save] Updated scheduled times for " . count($waitingItems) . " waiting subscribers at step {$newStep['id']}");
                            }
                        }
                    }
                }

                if ($trigger && isset($trigger['config']['type']) && $trigger['config']['type'] === 'campaign') {
                    $campaignId = $trigger['config']['targetId'];
                    if ($campaignId) {
                        $stmtCamp = $pdo->prepare("SELECT status, scheduled_at, target_config FROM campaigns WHERE id = ?");
                        $stmtCamp->execute([$campaignId]);
                        $camp = $stmtCamp->fetch(PDO::FETCH_ASSOC);
                        $explicitActivation = !empty($data['activate_campaign']);

                        if ($camp && ($camp['status'] === 'waiting_flow' || ($explicitActivation && $camp['status'] === 'draft'))) {
                            $newStatus = 'draft';
                            if ($explicitActivation)
                                $newStatus = 'scheduled';
                            else if (!empty($camp['scheduled_at']) && strtotime($camp['scheduled_at']) > time())
                                $newStatus = 'scheduled';

                            if ($newStatus === 'scheduled') {
                                $shouldTrigger = true;
                                if (!empty($camp['scheduled_at'])) {
                                    if (strtotime($camp['scheduled_at']) > time() + 60)
                                        $shouldTrigger = false;
                                } else {
                                    $targetConf = json_decode($camp['target_config'] ?? '{}', true);
                                    $countSql = "SELECT COUNT(DISTINCT s.id) FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer')";
                                    $countWheres = [];
                                    $countParams = [];
                                    if (!empty($targetConf['listIds'])) {
                                        // [BUG-N2 FIX] Use parameterized query instead of string interpolation
                                        $listPlaceholders = implode(',', array_fill(0, count($targetConf['listIds']), '?'));
                                        $countWheres[] = "s.id IN (SELECT subscriber_id FROM subscriber_lists WHERE list_id IN ($listPlaceholders))";
                                        $countParams = array_merge($countParams, $targetConf['listIds']);
                                    }
                                    if (!empty($targetConf['segmentIds'])) {
                                        require_once 'segment_helper.php';
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
                                    $totalAudience = 0;
                                    if (!empty($countWheres)) {
                                        $countSql .= " AND (" . implode(' OR ', $countWheres) . ")";
                                        $stmtCount = $pdo->prepare($countSql);
                                        $stmtCount->execute($countParams);
                                        $totalAudience = (int) $stmtCount->fetchColumn();
                                    }
                                    $pdo->prepare("UPDATE campaigns SET status = 'sending', total_target_audience = ?, scheduled_at = NOW() WHERE id = ?")->execute([$totalAudience, $campaignId]);
                                    $shouldTrigger = true;
                                }
                                if ($shouldTrigger) {
                                    dispatchCampaignWorker($pdo, $campaignId);
                                }
                                $newStatus = 'sending';
                            } else {
                                $pdo->prepare("UPDATE campaigns SET status = ? WHERE id = ?")->execute([$newStatus, $campaignId]);
                            }
                            $data['campaign_updated'] = true;
                            $data['new_campaign_status'] = $newStatus;
                        }
                    }
                }
            }
            jsonResponse(true, $data);
        } catch (Exception $e) {
            jsonResponse(false, null, 'Lỗi khi cập nhật automation: ' . $e->getMessage());
        }
        break;
    case 'DELETE':
        try {
            if (!$path)
                jsonResponse(false, null, 'ID required');

            // [BUG-FIX #15] Wrap all delete operations in transaction for atomicity.
            // Previously mail_delivery_logs and zalo_delivery_logs were NOT cleaned up on flow delete,
            // causing step modal to still show orphaned open/click/delivery log data after flow deletion.
            $pdo->beginTransaction();

            // 1. Clean up Subscribers State (Redundant if CASCADE exists, but safe)
            $pdo->prepare("DELETE FROM subscriber_flow_states WHERE flow_id = ?")->execute([$path]);
            $pdo->prepare("DELETE FROM flow_enrollments WHERE flow_id = ?")->execute([$path]);

            // 2. Clean up Queue Jobs (CRITICAL: No FK)
            $pdo->prepare("DELETE FROM queue_jobs WHERE (payload LIKE ? OR payload LIKE ?) AND status IN ('pending', 'processing')")
                ->execute(['%"flow_id":"' . $path . '"%', '%"priority_flow_id":"' . $path . '"%']);

            // 3. Clean up Flow Event Queue (If flows trigger events)
            $stmtCols = $pdo->query("SHOW COLUMNS FROM flow_event_queue LIKE 'flow_id'");
            if ($stmtCols->fetch()) {
                $pdo->prepare("DELETE FROM flow_event_queue WHERE flow_id = ?")->execute([$path]);
            }

            // 4. [BUG-FIX #15] Clean up delivery logs — these power the step modal's open/click/delivery data.
            // Without this, step modal shows phantom data even after the flow is deleted.
            try {
                $pdo->prepare("DELETE FROM mail_delivery_logs WHERE flow_id = ?")->execute([$path]);
            } catch (Exception $ignored) {
                // Fail silently: table may not have flow_id column in older schema
            }
            try {
                $pdo->prepare("DELETE FROM zalo_delivery_logs WHERE flow_id = ?")->execute([$path]);
            } catch (Exception $ignored) {
                // Fail silently: table may not exist in all deployments
            }

            // 5. Delete Flow + its snapshots
            $pdo->prepare("DELETE FROM flows WHERE id = ?")->execute([$path]);
            try {
                $pdo->prepare("DELETE FROM flow_snapshots WHERE flow_id = ?")->execute([$path]);
            } catch (Exception $ignored) {
            }

            // 6. [FIX] Clean up subscriber_activity for deleted flow to avoid orphaned records
            try {
                $pdo->prepare("DELETE FROM subscriber_activity WHERE flow_id = ?")->execute([$path]);
            } catch (Exception $ignored) {
                // Fail silently: no critical impact if activity records persist
            }

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