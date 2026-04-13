<?php
// api/bulk_operations.php - HIGH PERFORMANCE BULK ENGINE V30.0
require_once 'db_connect.php';
require_once 'trigger_helper.php';
apiHeaders();

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
    jsonResponse(false, null, 'Method not allowed');
}

$data = json_decode(file_get_contents("php://input"), true);
$type = $data['type'] ?? ''; // 'delete', 'tag_add', 'tag_remove', 'list_add', 'list_remove'
$subscriberIds = $data['subscriberIds'] ?? [];
$targetType = $data['targetType'] ?? 'selection'; // 'selection', 'list', 'tag', 'segment', 'all'
$targetId = $data['targetId'] ?? '';
$statusFilter = $data['status'] ?? 'all';
$tagFilter = $data['tag'] ?? 'all';

// Move requirement out of transaction to avoid implicit commits from DDL in helper
if ($targetType === 'segment' || $targetType === 'filter') {
    require_once 'segment_helper.php';
}

if ($type !== 'import' && $targetType === 'selection' && (empty($subscriberIds) || !is_array($subscriberIds))) {
    jsonResponse(false, null, 'No subscribers selected');
}

$pdo->beginTransaction();
try {
    $affectedCount = 0;

    // BUILD DYNAMIC WHERE CLAUSE
    $whereClause = "";
    $params = [];

    if ($targetType === 'selection') {
        $placeholders = implode(',', array_fill(0, count($subscriberIds), '?'));
        $whereClause = "id IN ($placeholders)";
        $params = $subscriberIds;
    } elseif ($targetType === 'list') {
        $whereClause = "id IN (SELECT subscriber_id FROM subscriber_lists WHERE list_id = ?)";
        $params = [$targetId];
    } elseif ($targetType === 'tag') {
        $whereClause = "id IN (SELECT st.subscriber_id FROM subscriber_tags st JOIN tags t_sub ON st.tag_id = t_sub.id WHERE t_sub.name = ?)";
        $params = [$targetId];
    } elseif ($targetType === 'all') {
        $conds = ["1=1"];
        $params = [];
        
        $search = $data['search'] ?? '';
        $status = $data['status'] ?? 'all';
        $tag = $data['tag'] ?? 'all';
        $verified = $data['verified'] ?? 'all';
        
        if (!empty($search)) {
            $conds[] = "(email LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR phone_number LIKE ? OR company_name LIKE ?)";
            $wildcard = "%$search%";
            $params[] = $wildcard; $params[] = $wildcard; $params[] = $wildcard; $params[] = $wildcard; $params[] = $wildcard;
        }

        if ($status !== 'all') {
            $statusArray = explode(',', $status);
            if (count($statusArray) > 1) {
                $placeholders = implode(',', array_fill(0, count($statusArray), '?'));
                $conds[] = "status IN ($placeholders)";
                $params = array_merge($params, $statusArray);
            } else {
                $conds[] = "status = ?";
                $params[] = $status;
            }
        }
        
        if ($verified !== 'all') {
            $conds[] = "verified = ?";
            $params[] = (int) $verified;
        }

        if ($tag !== 'all' && $tag !== '') {
            $tagArray = explode(',', $tag);
            $placeholders = implode(',', array_fill(0, count($tagArray), '?'));
            $conds[] = "id IN (SELECT st.subscriber_id FROM subscriber_tags st JOIN tags t_sub ON st.tag_id = t_sub.id WHERE t_sub.name IN ($placeholders))";
            $params = array_merge($params, $tagArray);
        }
        
        $customAttrKey = $data['custom_attr_key'] ?? '';
        $customAttrValue = $data['custom_attr_value'] ?? '';
        if (!empty($customAttrKey) && $customAttrKey !== 'all') {
            $safeKey = preg_replace('/[^a-zA-Z0-9_\-]/', '', $customAttrKey);
            if (!empty($customAttrValue)) {
                $conds[] = "JSON_EXTRACT(custom_attributes, '$.{$safeKey}') = ?";
                $params[] = $customAttrValue;
            } else {
                $conds[] = "JSON_EXTRACT(custom_attributes, '$.{$safeKey}') IS NOT NULL";
            }
        }
        
        $whereClause = implode(" AND ", $conds);
    } elseif ($targetType === 'segment' || $targetType === 'filter') {
        // Handled above
    }

    // Since many operations below need the actual IDs (especially for automation triggers), 
    // let's fetch the IDs if we don't have them yet.
    if ($targetType !== 'selection') {
        if ($targetType === 'segment' || $targetType === 'filter') {
            $filter = $data['filter'] ?? [];
            $segId = $filter['segment_id'] ?? ($targetType === 'segment' ? $targetId : null);

            $whereParts = ["s.status IN ('active', 'lead', 'customer')"];
            $whereParams = [];

            if ($segId) {
                $stmtSeg = $pdo->prepare("SELECT criteria FROM segments WHERE id = ?");
                $stmtSeg->execute([$segId]);
                $criteria = $stmtSeg->fetchColumn();
                if ($criteria) {
                    $res = buildSegmentWhereClause($criteria, $segId);
                    $whereParts[] = $res['sql'];
                    $whereParams = array_merge($whereParams, $res['params']);
                }
            }

            // Additional filters (Lead Score, etc)
            if (isset($filter['min_lead_score']) && $filter['min_lead_score'] !== '') {
                $whereParts[] = "s.lead_score >= ?";
                $whereParams[] = (int) $filter['min_lead_score'];
            }
            if (isset($filter['max_lead_score']) && $filter['max_lead_score'] !== '') {
                $whereParts[] = "s.lead_score <= ?";
                $whereParams[] = (int) $filter['max_lead_score'];
            }
            if (isset($filter['list_id']) && $filter['list_id'] !== 'all' && !empty($filter['list_id'])) {
                $whereParts[] = "EXISTS (SELECT 1 FROM subscriber_lists sl WHERE sl.subscriber_id = s.id AND sl.list_id = ?)";
                $whereParams[] = $filter['list_id'];
            }

            $stmtFetch = $pdo->prepare("SELECT s.id FROM subscribers s WHERE " . implode(' AND ', $whereParts));
            $stmtFetch->execute($whereParams);
            $subscriberIds = $stmtFetch->fetchAll(PDO::FETCH_COLUMN);
        } else {
            $stmtFetch = $pdo->prepare("SELECT id FROM subscribers WHERE $whereClause");
            $stmtFetch->execute($params);
            $subscriberIds = $stmtFetch->fetchAll(PDO::FETCH_COLUMN);
        }
    }

    if (empty($subscriberIds) && $type !== 'import') {
        if ($pdo->inTransaction())
            $pdo->commit();
        jsonResponse(true, ['affected' => 0], 'No subscribers found for this operation');
    }

    // Refresh placeholders for fetched IDs
    $placeholders = implode(',', array_fill(0, count($subscriberIds), '?'));

    switch ($type) {
        case 'delete':
            // [FIX] CHUNKED DELETE to prevent two critical failures:
            // 1. PDO Placeholder Limit: MySQL caps prepared statement params at 65,535.
            //    100k subscribers × 1 placeholder each = crash immediately.
            // 2. Long Transaction Lock: One DELETE across 5 tables for 100k rows holds
            //    row locks for minutes, freezing all CRM users and queue workers.
            // Solution: process in chunks of 500, commit after each chunk to release locks early.
            $CHUNK_SIZE = 500;
            $deleteChunks = array_chunk($subscriberIds, $CHUNK_SIZE);

            foreach ($deleteChunks as $chunk) {
                $ph = implode(',', array_fill(0, count($chunk), '?'));

                // 1. Decr list counts first
                $stmtL = $pdo->prepare("SELECT list_id, COUNT(*) as cnt FROM subscriber_lists WHERE subscriber_id IN ($ph) GROUP BY list_id");
                $stmtL->execute($chunk);
                foreach ($stmtL->fetchAll() as $row) {
                    $pdo->prepare("UPDATE lists SET subscriber_count = GREATEST(0, subscriber_count - ?) WHERE id = ?")
                        ->execute([$row['cnt'], $row['list_id']]);
                }

                // 2. Clear relations
                $pdo->prepare("DELETE FROM subscriber_activity WHERE subscriber_id IN ($ph)")->execute($chunk);
                $pdo->prepare("DELETE FROM subscriber_flow_states WHERE subscriber_id IN ($ph)")->execute($chunk);
                $pdo->prepare("DELETE FROM subscriber_lists WHERE subscriber_id IN ($ph)")->execute($chunk);
                $pdo->prepare("DELETE FROM subscriber_tags WHERE subscriber_id IN ($ph)")->execute($chunk);

                // 3. Delete subs
                $stmtDel = $pdo->prepare("DELETE FROM subscribers WHERE id IN ($ph)");
                $stmtDel->execute($chunk);
                $affectedCount += $stmtDel->rowCount();

                // Commit each chunk to release row locks early — prevents "Waiting for lock"
                // for other CRM users/workers during large bulk deletes.
                $pdo->commit();
                $pdo->beginTransaction();
            }
            break;


        case 'tag_add':
            $tag = $data['tag'] ?? '';
            if (!$tag)
                jsonResponse(false, null, 'Tag required');

            // 1. Relational Sync (Get/Create Tag ID)
            $stmtT = $pdo->prepare("SELECT id FROM tags WHERE name = ?");
            $stmtT->execute([$tag]);
            $tagId = $stmtT->fetchColumn();
            if (!$tagId) {
                $pdo->prepare("INSERT INTO tags (name) VALUES (?)")->execute([$tag]);
                $tagId = $pdo->lastInsertId();
            }

            // 2. Update JSON (Legacy Support)
            // Only update if tag not present
            $stmt = $pdo->prepare("UPDATE subscribers SET tags = JSON_ARRAY_APPEND(tags, '$', ?) WHERE id IN ($placeholders) AND NOT JSON_CONTAINS(tags, JSON_QUOTE(?))");
            $stmt->execute(array_merge([$tag], $subscriberIds, [$tag]));
            $affectedCount = $stmt->rowCount(); // Rows actually updated (didn't have tag)

            // 3. Update Relation (subscriber_tags)
            // Batch Insert
            $vals = [];
            $bPlace = [];
            foreach ($subscriberIds as $sid) {
                $bPlace[] = "(?, ?)";
                $vals[] = $sid;
                $vals[] = $tagId;
            }
            if (!empty($bPlace)) {
                $sqlRel = "INSERT IGNORE INTO subscriber_tags (subscriber_id, tag_id) VALUES " . implode(',', $bPlace);
                $pdo->prepare($sqlRel)->execute($vals);
            }

            // 4. Trigger Automation
            enrollSubscribersBulk($pdo, $subscriberIds, 'tag', $tag);
            break;

        case 'tag_remove':
            $tag = $data['tag'] ?? '';
            if (!$tag)
                jsonResponse(false, null, 'Tag required');

            // 1. Get Tag ID for Relation
            $stmtT = $pdo->prepare("SELECT id FROM tags WHERE name = ?");
            $stmtT->execute([$tag]);
            $tagId = $stmtT->fetchColumn();

            // 2. Remove Relation
            if ($tagId) {
                $pdo->prepare("DELETE FROM subscriber_tags WHERE tag_id = ? AND subscriber_id IN ($placeholders)")
                    ->execute(array_merge([$tagId], $subscriberIds));
            }

            // 3. Remove from JSON (Legacy - Row by Row for safety on older MySQL/MariaDB)
            // Optimization: Only select subscribers who have the tag
            $stmtGet = $pdo->prepare("SELECT id, tags FROM subscribers WHERE id IN ($placeholders) AND JSON_CONTAINS(tags, JSON_QUOTE(?))");
            $stmtGet->execute(array_merge($subscriberIds, [$tag]));

            while ($row = $stmtGet->fetch()) {
                $tags = json_decode($row['tags'] ?? '[]', true);
                if (($key = array_search($tag, $tags)) !== false) {
                    unset($tags[$key]);
                    $pdo->prepare("UPDATE subscribers SET tags = ? WHERE id = ?")->execute([json_encode(array_values($tags)), $row['id']]);
                    $affectedCount++;
                }
            }
            break;

        case 'list_add':
            $listId = $data['listId'] ?? '';
            if (!$listId)
                jsonResponse(false, null, 'List ID required');

            // OPTIMIZED: Batch insert relations
            $vals = [];
            $batchPlaceholders = [];
            foreach ($subscriberIds as $sid) {
                $batchPlaceholders[] = "(?, ?)";
                $vals[] = $sid;
                $vals[] = $listId;
            }
            $sql = "INSERT IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES " . implode(',', $batchPlaceholders);
            $stmt = $pdo->prepare($sql);
            $stmt->execute($vals);
            $affectedCount = $stmt->rowCount();

            // Trigger automation in BULK
            enrollSubscribersBulk($pdo, $subscriberIds, 'list', $listId);

            // Update list count once
            $pdo->prepare("UPDATE lists SET subscriber_count = (SELECT COUNT(*) FROM subscriber_lists WHERE list_id = ?) WHERE id = ?")
                ->execute([$listId, $listId]);
            break;

        case 'list_remove':
            $listId = $data['listId'] ?? '';
            if (!$listId)
                jsonResponse(false, null, 'List ID required');

            // OPTIMIZED: Bulk delete relations
            $stmt = $pdo->prepare("DELETE FROM subscriber_lists WHERE list_id = ? AND subscriber_id IN ($placeholders)");
            $stmt->execute(array_merge([$listId], $subscriberIds));
            $affectedCount = $stmt->rowCount();

            // Update list count once
            $pdo->prepare("UPDATE lists SET subscriber_count = (SELECT COUNT(*) FROM subscriber_lists WHERE list_id = ?) WHERE id = ?")
                ->execute([$listId, $listId]);
            break;

        case 'enroll_flow':
            // [NEW] Bulk Enroll to Flow
            $flowId = $data['flowId'] ?? '';
            if (!$flowId)
                jsonResponse(false, null, 'Flow ID required');

            // Fetch Trigger Step ID to start from
            $stmtFlow = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
            $stmtFlow->execute([$flowId]);
            $steps = json_decode($stmtFlow->fetchColumn(), true);
            $startStepId = null;
            if ($steps) {
                foreach ($steps as $s) {
                    if ($s['type'] === 'trigger') {
                        $startStepId = $s['nextStepId'] ?? null;
                        break;
                    }
                }
            }

            if (!$startStepId) {
                jsonResponse(false, null, 'Flow does not have a valid starting trigger');
            }

            // Batch Insert into Flow States
            // Use INSERT IGNORE to avoid duplicates if already enrolled
            $vals = [];
            $batchPlaceholders = [];
            $nowStr = date('Y-m-d H:i:s');
            $initialSchedule = $nowStr;
            
            // [SMART SCHEDULE] Check if first step is WAIT
            if ($steps) {
                foreach ($steps as $fs) {
                    if ($fs['id'] === $startStepId && $fs['type'] === 'wait') {
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
                        }
                        break;
                    }
                }
            }

            foreach ($subscriberIds as $sid) {
                $batchPlaceholders[] = "(?, ?, ?, ?, 'waiting', ?, ?)";
                $vals[] = $flowId;
                $vals[] = $sid;
                $vals[] = $startStepId;
                $vals[] = $flowId;

                $vals[] = $nowStr;
                $vals[] = $nowStr;
            }
            // However, we can't easily do WHERE NOT EXISTS with VALUES syntax for each row.
            // Better: "INSERT INTO ... SELECT ... WHERE id IN (...) AND id NOT IN (SELECT subscriber_id ...)"

            // LET'S REWRITE to use INSERT SELECT for Atomicity and Performance
            $subIdList = implode("','", $subscriberIds); // Safe if IDs are validated UUIDs/Ints. Assuming standard IDs.
            // Actually, placeholders are safer.

            $sql = "INSERT INTO subscriber_flow_states (flow_id, subscriber_id, step_id, status, created_at, updated_at, scheduled_at, last_step_at)
                    SELECT ?, s.id, ?, 'waiting', NOW(), NOW(), ?, NOW()
                    FROM subscribers s
                    WHERE s.id IN ($placeholders)
                    AND s.status IN ('active', 'lead', 'customer')
                    AND NOT EXISTS (
                        SELECT 1 FROM subscriber_flow_states sfs 
                        WHERE sfs.flow_id = ? AND sfs.subscriber_id = s.id AND sfs.status IN ('waiting', 'processing')
                    )";

            // Params: FlowID, StartStepID, InitialSchedule, Subscribers..., FlowID
            $finalParams = array_merge([$flowId, $startStepId, $initialSchedule], $subscriberIds, [$flowId]);
            $stmt = $pdo->prepare($sql);
            $stmt->execute($finalParams);
            $affectedCount = $stmt->rowCount();

            // Update Stats
            if ($affectedCount > 0) {
                $pdo->prepare("UPDATE flows SET stat_enrolled = stat_enrolled + ? WHERE id = ?")->execute([$affectedCount, $flowId]);
            }
            break;

        case 'import':
            // Logic adapted from api/subscribers.php route=subscribers_bulk
            $subscribers = $data['subscribers'] ?? [];
            if (!is_array($subscribers) || empty($subscribers)) {
                jsonResponse(false, null, 'Invalid data format or empty list.');
            }

            $chunkSize = 500;
            $chunks = array_chunk($subscribers, $chunkSize);
            $totalProcessed = 0;
            $allAffectedListSubscribers = [];

            // Cache tags for speed
            $stmtT = $pdo->query("SELECT id, name FROM tags");
            $tagMap = [];
            while ($t = $stmtT->fetch())
                $tagMap[strtolower(trim($t['name']))] = $t['id'];

            foreach ($chunks as $chunk) {
                // [FIX] Pre-fetch existing IDs to ensure relations use the correct ID for existing users
                $emailsInChunk = [];
                $phonesInChunk = [];
                foreach ($chunk as $d) {
                    if (!empty($d['email']))
                        $emailsInChunk[] = $d['email'];
                    $ph = $d['phoneNumber'] ?? $d['phone'] ?? '';
                    if (!empty($ph))
                        $phonesInChunk[] = $ph;
                }

                $existingMap = [];
                $existingPhoneMap = [];
                if (!empty($emailsInChunk)) {
                    $placeholders = implode(',', array_fill(0, count($emailsInChunk), '?'));
                    $stmtEx = $pdo->prepare("SELECT email, id FROM subscribers WHERE email IN ($placeholders)");
                    $stmtEx->execute($emailsInChunk);
                    while ($row = $stmtEx->fetch(PDO::FETCH_ASSOC)) {
                        $existingMap[$row['email']] = $row['id'];
                    }
                }
                if (!empty($phonesInChunk)) {
                    $placeholders = implode(',', array_fill(0, count($phonesInChunk), '?'));
                    $stmtExP = $pdo->prepare("SELECT phone_number, id FROM subscribers WHERE phone_number IN ($placeholders)");
                    $stmtExP->execute($phonesInChunk);
                    while ($row = $stmtExP->fetch(PDO::FETCH_ASSOC)) {
                        $existingPhoneMap[$row['phone_number']] = $row['id'];
                    }
                }

                $subValues = [];
                $subParams = [];
                $listValues = [];
                $listParams = [];
                $tagSubValues = [];
                $tagSubParams = [];

                foreach ($chunk as $d) {
                    $email = $d['email'];
                    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL))
                        continue;

                    $phone = $d['phoneNumber'] ?? $d['phone'] ?? '';
                    // Use existing ID if available, otherwise generate new
                    $id = $existingMap[$email] ?? $existingPhoneMap[$phone] ?? ($d['id'] ?? bin2hex(random_bytes(16)));

                    $firstName = $d['firstName'] ?? '';
                    $lastName = $d['lastName'] ?? '';
                    $status = $d['status'] ?? 'active';
                    $source = $d['source'] ?? 'Bulk Import';
                    $salesperson = $d['salesperson'] ?? '';
                    $job = $d['jobTitle'] ?? '';
                    $company = $d['companyName'] ?? '';
                    $country = $d['country'] ?? '';
                    $city = $d['city'] ?? '';
                    $gender = $d['gender'] ?? '';
                    $dob = !empty($d['dateOfBirth']) ? $d['dateOfBirth'] : null;
                    $anniv = !empty($d['anniversaryDate']) ? $d['anniversaryDate'] : null;

                    // Insert Subscriber
                    $customAt = !empty($d['customAttributes']) ? json_encode($d['customAttributes']) : '{}';
                    $subValues[] = "(?, ?, ?, ?, ?, ?, ?, NOW(), '[]', ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    array_push($subParams, $id, $email, $firstName, $lastName, $status, $source, $salesperson, $phone, $job, $company, $country, $city, $gender, $dob, $anniv, $customAt);

                    // Tags
                    if (!empty($d['tags']) && is_array($d['tags'])) {
                        foreach ($d['tags'] as $tagName) {
                            $tnL = strtolower(trim($tagName));
                            if (isset($tagMap[$tnL])) {
                                $tagSubValues[] = "(?, ?)";
                                array_push($tagSubParams, $id, $tagMap[$tnL]);
                            } else {
                                // Create new tag on fly (Optional, but good for import)
                                try {
                                    $pdo->prepare("INSERT INTO tags (name) VALUES (?)")->execute([trim($tagName)]);
                                    $newId = $pdo->lastInsertId();
                                    $tagMap[$tnL] = $newId;
                                    $tagSubValues[] = "(?, ?)";
                                    array_push($tagSubParams, $id, $newId);
                                } catch (Exception $e) {
                                }
                            }
                        }
                    }

                    // Lists
                    if (!empty($d['listIds']) && is_array($d['listIds'])) {
                        foreach ($d['listIds'] as $lid) {
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
                    $sqlSub = "INSERT INTO subscribers (id, email, first_name, last_name, status, source, salesperson, joined_at, notes, phone_number, job_title, company_name, country, city, gender, date_of_birth, anniversary_date, custom_attributes) 
                               VALUES " . implode(',', $subValues) . "
                               ON DUPLICATE KEY UPDATE 
                               first_name = IF(VALUES(first_name) != '', VALUES(first_name), first_name),
                               last_name = IF(VALUES(last_name) != '', VALUES(last_name), last_name),
                               email = IF(email LIKE '%@facebook.com' AND VALUES(email) NOT LIKE '%@facebook.com', VALUES(email), email),
                               status = VALUES(status),
                               salesperson = IF(VALUES(salesperson) != '', VALUES(salesperson), salesperson), 
                               phone_number = IF(VALUES(phone_number) != '', VALUES(phone_number), phone_number),
                               job_title = IF(VALUES(job_title) != '', VALUES(job_title), job_title),
                               company_name = IF(VALUES(company_name) != '', VALUES(company_name), company_name),
                               country = IF(VALUES(country) != '', VALUES(country), country),
                               city = IF(VALUES(city) != '', VALUES(city), city),
                               gender = IF(VALUES(gender) != '', VALUES(gender), gender),
                               date_of_birth = IF(VALUES(date_of_birth) IS NOT NULL, VALUES(date_of_birth), date_of_birth),
                               anniversary_date = IF(VALUES(anniversary_date) IS NOT NULL, VALUES(anniversary_date), anniversary_date),
                               custom_attributes = JSON_MERGE_PATCH(COALESCE(custom_attributes, '{}'), VALUES(custom_attributes))";
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

            // Post-process Lists (Automations & Counts)
            foreach ($allAffectedListSubscribers as $lid => $subs) {
                // Trigger 'added_to_list' automation
                enrollSubscribersBulk($pdo, $subs, 'added_to_list', $lid);

                // Update counts properly
                $pdo->prepare("UPDATE lists SET subscriber_count = (SELECT COUNT(*) FROM subscriber_lists WHERE list_id = ?) WHERE id = ?")->execute([$lid, $lid]);
            }

            $affectedCount = $totalProcessed;
            break;

        default:
            jsonResponse(false, null, 'Invalid operation type');
    }

    // [SYNC FIX REMOVED] inline logic handles sync now

    $pdo->commit();
    jsonResponse(true, ['affected' => $affectedCount], 'Operation successful');

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    jsonResponse(false, null, $e->getMessage());
}
?>