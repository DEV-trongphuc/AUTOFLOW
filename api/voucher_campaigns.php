<?php
require_once 'bootstrap.php';
initializeSystem($pdo);

// [FIX P43-I] Add auth + workspace isolation
require_once 'auth_middleware.php';
$workspace_id = get_current_workspace_id();

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

if ($method === 'GET') {
    try {
        if ($id) {
            // [FIX P43-I1] Scope single fetch to workspace
            $stmt = $pdo->prepare("SELECT * FROM voucher_campaigns WHERE id = ? AND workspace_id = ?");
            $stmt->execute([$id, $workspace_id]);
            $camp = $stmt->fetch();
            if ($camp) {
                // Decode JSON back to array
                $camp['rewards'] = json_decode($camp['rewards'], true) ?: [];
                $camp['thumbnailUrl'] = $camp['thumbnail_url'] ?? '';
                $camp['codeType'] = $camp['code_type'] ?? 'dynamic';
                $camp['staticCode'] = $camp['static_code'] ?? '';
                $camp['startDate'] = $camp['start_date'] ?? null;
                $camp['endDate'] = $camp['end_date'] ?? null;
                $camp['expirationDays'] = isset($camp['expiration_days']) ? (int)$camp['expiration_days'] : null;
                jsonResponse(true, $camp);
            } else {
                jsonResponse(false, null, 'Campaign not found');
            }
        } else {
            // [FIX P43-I2] Scope stats aggregation to workspace campaigns only
            $statsStmt = $pdo->prepare("
                SELECT 
                    vc.campaign_id, 
                    COUNT(*) as totalGenerated,
                    SUM(CASE WHEN vc.sent_at IS NOT NULL OR vc.subscriber_id IS NOT NULL THEN 1 ELSE 0 END) as totalDistributed,
                    SUM(CASE WHEN vc.status = 'used' THEN 1 ELSE 0 END) as totalRedeemed
                FROM voucher_codes vc
                JOIN voucher_campaigns vcamp ON vc.campaign_id = vcamp.id
                WHERE vcamp.workspace_id = ?
                GROUP BY vc.campaign_id
            ");
            $statsStmt->execute([$workspace_id]);
            
            $statsAgg = [];
            while ($r = $statsStmt->fetch(PDO::FETCH_ASSOC)) {
                $statsAgg[$r['campaign_id']] = [
                    'totalGenerated' => (int)$r['totalGenerated'],
                    'totalDistributed' => (int)$r['totalDistributed'],
                    'totalRedeemed' => (int)$r['totalRedeemed']
                ];
            }

            // [FIX P43-I3] Scope list to workspace
            $stmt = $pdo->prepare("SELECT * FROM voucher_campaigns WHERE workspace_id = ? ORDER BY created_at DESC");
            $stmt->execute([$workspace_id]);
            $camps = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($camps as &$c) {
                $c['rewards'] = json_decode($c['rewards'], true) ?: [];
                $c['stats'] = $statsAgg[$c['id']] ?? ['totalGenerated' => 0, 'totalDistributed' => 0, 'totalRedeemed' => 0];
                $c['thumbnailUrl'] = $c['thumbnail_url'] ?? '';
                $c['codeType'] = $c['code_type'] ?? 'dynamic';
                $c['staticCode'] = $c['static_code'] ?? '';
                $c['startDate'] = $c['start_date'] ?? null;
                $c['endDate'] = $c['end_date'] ?? null;
                $c['expirationDays'] = isset($c['expiration_days']) ? (int)$c['expiration_days'] : null;
            }
            jsonResponse(true, $camps);
        }
    } catch (PDOException $e) {
        jsonResponse(false, null, $e->getMessage());
    }
} elseif ($method === 'POST') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        $campaignId = $id ?: ($data['id'] ?? null);
        $isNew = false;
        if (!$campaignId) {
            $campaignId = 'vc_' . time() . '_' . bin2hex(random_bytes(4));
            $isNew = true;
        }

        $now = date('Y-m-d H:i:s');
        $rewardsJson = json_encode($data['rewards'] ?? []);

        if ($isNew) {
            $stmt = $pdo->prepare("
                INSERT INTO voucher_campaigns 
                (id, workspace_id, name, description, thumbnail_url, rewards, code_type, static_code, start_date, end_date, expiration_days, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $campaignId,
                $workspace_id,
                $data['name'] ?? 'Untitled Campaign',
                $data['description'] ?? '',
                $data['thumbnailUrl'] ?? '',
                $rewardsJson,
                $data['codeType'] ?? 'dynamic',
                $data['staticCode'] ?? '',
                !empty($data['startDate']) ? $data['startDate'] : null,
                !empty($data['endDate']) ? $data['endDate'] : null,
                isset($data['expirationDays']) ? (int)$data['expirationDays'] : null,
                $data['status'] ?? 'draft',
                $now,
                $now
            ]);
        } else {
            $stmt = $pdo->prepare("
                UPDATE voucher_campaigns 
                SET name = ?, description = ?, thumbnail_url = ?, rewards = ?, code_type = ?, 
                    static_code = ?, start_date = ?, end_date = ?, expiration_days = ?, status = ?, updated_at = ?
                WHERE id = ? AND workspace_id = ?
            ");
            $stmt->execute([
                $data['name'] ?? 'Untitled Campaign',
                $data['description'] ?? '',
                $data['thumbnailUrl'] ?? '',
                $rewardsJson,
                $data['codeType'] ?? 'dynamic',
                $data['staticCode'] ?? '',
                !empty($data['startDate']) ? $data['startDate'] : null,
                !empty($data['endDate']) ? $data['endDate'] : null,
                isset($data['expirationDays']) ? (int)$data['expirationDays'] : null,
                $data['status'] ?? 'draft',
                $now,
                $campaignId,
                $workspace_id
            ]);
            
            if (($data['syncMode'] ?? '') === 'reset_unused') {
                $pdo->prepare("DELETE FROM voucher_codes WHERE campaign_id = ? AND status = 'unused'")->execute([$campaignId]);
            }
        }

        jsonResponse(true, ['id' => $campaignId], 'Campaign saved successfully');
    } catch (Exception $e) {
        jsonResponse(false, null, $e->getMessage());
    }
} elseif ($method === 'DELETE' && $id) {
    try {
        // [FIX P43-I4] Verify workspace ownership before delete
        $stmtOwn = $pdo->prepare("SELECT id FROM voucher_campaigns WHERE id = ? AND workspace_id = ?");
        $stmtOwn->execute([$id, $workspace_id]);
        if (!$stmtOwn->fetchColumn())
            jsonResponse(false, null, 'Campaign không tồn tại hoặc không có quyền xóa');
        $pdo->prepare("DELETE FROM voucher_codes WHERE campaign_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM voucher_campaigns WHERE id = ? AND workspace_id = ?")->execute([$id, $workspace_id]);
        jsonResponse(true, null, 'Campaign deleted successfully');
    } catch (PDOException $e) {
        jsonResponse(false, null, $e->getMessage());
    }
} else {
    jsonResponse(false, null, 'Invalid request');
}
