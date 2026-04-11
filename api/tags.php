<?php
// api/tags.php - DEEP SYNC LOGIC V2.0
require_once 'db_connect.php';
apiHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_GET['id']) ? $_GET['id'] : null;

switch ($method) {
    case 'GET':
        // [PERF] Release session lock immediately to prevent "Pending" state in DevTools
        if (session_id()) session_write_close();
        try {
            // NEW: Stats Route
            if (isset($_GET['route']) && $_GET['route'] === 'stats' && $path) {
                $sql = "SELECT s.status, COUNT(*) as count 
                        FROM subscriber_tags st 
                        JOIN subscribers s ON st.subscriber_id = s.id 
                        WHERE st.tag_id = ? 
                        GROUP BY s.status";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$path]);
                $stats = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

                // Add phone count
                $sqlPhone = "SELECT COUNT(*) FROM subscriber_tags st 
                             JOIN subscribers s ON st.subscriber_id = s.id 
                             WHERE st.tag_id = ? AND (s.phone_number IS NOT NULL AND s.phone_number != '')";
                $stmtPhone = $pdo->prepare($sqlPhone);
                $stmtPhone->execute([$path]);
                $stats['has_phone'] = (int) $stmtPhone->fetchColumn();

                jsonResponse(true, $stats);
                return;
            }

            $sql = "SELECT t.id, t.name, t.description, 
                    (SELECT COUNT(*) FROM subscriber_tags st 
                     WHERE st.tag_id = t.id) as subscriber_count 
                    FROM tags t 
                    ORDER BY name ASC";
            $stmt = $pdo->query($sql);
            jsonResponse(true, $stmt->fetchAll());
        } catch (Exception $e) {
            jsonResponse(false, null, $e->getMessage());
        }
        break;

    case 'POST':
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $name = strtoupper(preg_replace('/\s+/', '_', trim($data['name'] ?? '')));
            $description = trim($data['description'] ?? '');
            if (!$name)
                jsonResponse(false, null, 'Tên nhãn không được để trống');

            $stmt = $pdo->prepare("SELECT id FROM tags WHERE name = ?");
            $stmt->execute([$name]);
            if ($stmt->fetch())
                jsonResponse(false, null, 'Nhãn này đã tồn tại');

            $id = bin2hex(random_bytes(8)); // [FIX] uniqid() is time-based; race condition in high-concurrency → use CSPRNG instead
            $stmt = $pdo->prepare("INSERT INTO tags (id, name, description) VALUES (?, ?, ?)");
            $stmt->execute([$id, $name, $description]);
            jsonResponse(true, ['id' => $id, 'name' => $name, 'description' => $description, 'subscriber_count' => 0]);
        } catch (Exception $e) {
            jsonResponse(false, null, $e->getMessage());
        }
        break;

    case 'PUT':
        if (!$path)
            jsonResponse(false, null, 'ID required');
        $data = json_decode(file_get_contents("php://input"), true);
        $newName = strtoupper(preg_replace('/\s+/', '_', trim($data['name'] ?? '')));
        $newDesc = trim($data['description'] ?? '');

        // [FIX 1] Empty name validation BEFORE starting any DB write.
        // Without this, $newName = "" would trigger Deep Sync and wipe tag names
        // from ALL subscribers across the system — unrecoverable data loss.
        if (!$newName) {
            jsonResponse(false, null, 'Tên nhãn không được để trống');
        }

        // [FIX 2] Duplicate name check against OTHER tag IDs BEFORE transaction.
        // Without this, renaming Tag B to the same name as Tag A would either:
        //   a) Throw a DB UNIQUE constraint error inside the transaction (ugly rollback), OR
        //   b) Create ["VIP", "VIP"] duplicates in subscriber JSON arrays (data corruption).
        $stmtDup = $pdo->prepare("SELECT id FROM tags WHERE name = ? AND id != ?");
        $stmtDup->execute([$newName, $path]);
        if ($stmtDup->fetch()) {
            jsonResponse(false, null, 'Tên nhãn này đã tồn tại trong hệ thống');
        }

        $pdo->beginTransaction();
        try {
            // 1. Lấy thông tin cũ
            $stmtOld = $pdo->prepare("SELECT name FROM tags WHERE id = ?");
            $stmtOld->execute([$path]);
            $oldName = $stmtOld->fetchColumn();

            if (!$oldName)
                throw new Exception("Không tìm thấy nhãn");

            // 2. Cập nhật bảng tags
            $stmtUp = $pdo->prepare("UPDATE tags SET name = ?, description = ? WHERE id = ?");
            $stmtUp->execute([$newName, $newDesc, $path]);

            // 3. Nếu đổi tên -> Cập nhật TOÀN BỘ subscriber VÀ Flows
            if ($oldName !== $newName) {
                // 3a. Cập nhật subscribers.tags JSON (legacy sync for backward compat)
                // [FIX] Instead of WHERE JSON_CONTAINS (full-table scan + lock on 10M rows),
                // use subscriber_tags (indexed) to get the affected IDs, then chunk-UPDATE.
                $stmtAffected = $pdo->prepare(
                    "SELECT st.subscriber_id FROM subscriber_tags st WHERE st.tag_id = ?"
                );
                $stmtAffected->execute([$path]);
                $affectedSubIds = $stmtAffected->fetchAll(PDO::FETCH_COLUMN);

                foreach (array_chunk($affectedSubIds, 1000) as $chunk) {
                    $ph = implode(',', array_fill(0, count($chunk), '?'));
                    // Update the legacy JSON tags column for subscribers in this chunk only
                    $pdo->prepare(
                        "UPDATE subscribers
                         SET tags = JSON_SET(tags, JSON_UNQUOTE(JSON_SEARCH(tags, 'one', ?)), ?)
                         WHERE id IN ($ph) AND JSON_CONTAINS(tags, JSON_QUOTE(?))"
                    )->execute(array_merge([$oldName, $newName], $chunk, [$oldName]));
                }

                // 3b. Cập nhật Flows (Tìm các flow có chứa tag cũ trong steps)
                $stmtFlows = $pdo->prepare("SELECT id, steps, name FROM flows WHERE steps LIKE ?");
                $likeQuery = '%"' . $oldName . '"%';
                $stmtFlows->execute([$likeQuery]);
                $affectedFlows = $stmtFlows->fetchAll();

                foreach ($affectedFlows as $flow) {
                    $steps = json_decode($flow['steps'], true);
                    $modified = false;

                    // Recursive walk — exact match only (===), never partial replace
                    array_walk_recursive($steps, function (&$value) use ($oldName, $newName, &$modified) {
                        if ($value === $oldName) {
                            $value = $newName;
                            $modified = true;
                        }
                    });

                    if ($modified) {
                        // [FIX 3] JSON_UNESCAPED_UNICODE: prevents Vietnamese/emoji chars
                        // being stored as escaped sequences (e.g. "chào" → "ch\u00e0o")
                        // which bloats DB storage and breaks raw JSON queries.
                        $pdo->prepare("UPDATE flows SET steps = ? WHERE id = ?")
                            ->execute([json_encode($steps, JSON_UNESCAPED_UNICODE), $flow['id']]);
                    }
                }
            }

            $pdo->commit();
            jsonResponse(true, ['id' => $path, 'name' => $newName], 'Đã cập nhật nhãn và đồng bộ toàn hệ thống');
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonResponse(false, null, $e->getMessage());
        }
        break;

    case 'DELETE':
        if (!$path)
            jsonResponse(false, null, 'ID required');

        $pdo->beginTransaction();
        try {
            // 1. Lấy tên nhãn
            $stmtN = $pdo->prepare("SELECT name FROM tags WHERE id = ?");
            $stmtN->execute([$path]);
            $tagName = $stmtN->fetchColumn();

            if ($tagName) {
                // 1b. KIỂM TRA FLOW ĐANG ACTIVE
                $checkFlows = $pdo->prepare("SELECT name FROM flows WHERE status IN ('active', 'paused') AND steps LIKE ? LIMIT 1");
                $checkFlows->execute(['%"' . $tagName . '"%']);
                $blockingFlow = $checkFlows->fetchColumn();

                if ($blockingFlow) {
                    throw new Exception("Không thể xóa: Nhãn đang được sử dụng trong Flow đang chạy '{$blockingFlow}'. Vui lòng dừng hoặc chỉnh sửa Flow trước.");
                }

                // 2. Gỡ nhãn khỏi subscribers.tags JSON (legacy sync)
                // [FIX] Use subscriber_tags (indexed) to get affected IDs first, then chunk.
                // Old: WHERE JSON_CONTAINS on 10M rows = full table scan + long lock.
                // New: index lookup via subscriber_tags → chunk UPDATE to release locks between batches.
                $stmtAffected = $pdo->prepare(
                    "SELECT st.subscriber_id FROM subscriber_tags st WHERE st.tag_id = ?"
                );
                $stmtAffected->execute([$path]);
                $affectedSubIds = $stmtAffected->fetchAll(PDO::FETCH_COLUMN);

                foreach (array_chunk($affectedSubIds, 1000) as $chunk) {
                    $ph = implode(',', array_fill(0, count($chunk), '?'));
                    $pdo->prepare(
                        "UPDATE subscribers
                         SET tags = JSON_REMOVE(tags, JSON_UNQUOTE(JSON_SEARCH(tags, 'one', ?)))
                         WHERE id IN ($ph) AND JSON_CONTAINS(tags, JSON_QUOTE(?))"
                    )->execute(array_merge([$tagName], $chunk, [$tagName]));
                }
            }

            // 2b. Xóa quan hệ trong bảng trung gian subscriber_tags
            $pdo->prepare("DELETE FROM subscriber_tags WHERE tag_id = ?")->execute([$path]);

            // [CLEANUP] Clean Queue Jobs & Buffers
            $pdo->prepare("DELETE FROM queue_jobs WHERE (payload LIKE ? OR payload LIKE ?) AND status IN ('pending', 'processing')")
                ->execute(['%"tag_id":"' . $path . '"%', '%"tag":"' . $tagName . '"%']);

            $pdo->prepare("DELETE FROM stats_update_buffer WHERE target_id = ? AND target_table = 'tags'")->execute([$path]);

            // 3. Xóa bản ghi tag
            $pdo->prepare("DELETE FROM tags WHERE id = ?")->execute([$path]);

            $pdo->commit();
            jsonResponse(true, ['id' => $path], 'Đã xóa nhãn hoàn toàn');
        } catch (Exception $e) {
            $pdo->rollBack();
            // Return failure
            jsonResponse(false, null, $e->getMessage());
        }
        break;
}
?>