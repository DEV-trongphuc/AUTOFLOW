<?php
// api/redeem_voucher.php
require_once 'bootstrap.php';
initializeSystem($pdo);
require_once 'auth_middleware.php';
require_once 'WorkerTriggerService.php';

// [SECURITY] Require authenticated workspace session
$admin_workspace_id = get_current_workspace_id();
if (empty($admin_workspace_id)) {
    http_response_code(401);
    jsonResponse(false, null, 'Unauthorized');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, null, 'Method not allowed');
}

$input = json_decode(file_get_contents("php://input"), true) ?: [];
$ids = $input['ids'] ?? [];

$apiUrl = (defined('API_BASE_URL') ? API_BASE_URL : 'https://automation.ideas.edu.vn/mail_api');
$workerService = new WorkerTriggerService($pdo, $apiUrl);

// --- BATCH REDEMPTION ---
if (!empty($ids) && is_array($ids)) {
    try {
        $pdo->beginTransaction();
        
        // 1. Get subscriber_ids and campaign_ids for valid codes in THIS workspace
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmtFind = $pdo->prepare("
            SELECT vc.id, vc.subscriber_id, vc.campaign_id 
            FROM voucher_codes vc 
            JOIN voucher_campaigns c ON vc.campaign_id = c.id
            WHERE vc.id IN ($placeholders) 
              AND c.workspace_id = ?
              AND vc.status != 'used' 
              AND vc.subscriber_id IS NOT NULL
            FOR UPDATE
        ");
        $stmtFind->execute(array_merge($ids, [$admin_workspace_id]));
        $toRedeem = $stmtFind->fetchAll(PDO::FETCH_ASSOC);

        if (empty($toRedeem)) {
            $pdo->rollBack();
            jsonResponse(false, null, 'Không có mã hợp lệ nào được chọn để gạch.');
        }

        $validIds = array_column($toRedeem, 'id');
        $validPlaceholders = implode(',', array_fill(0, count($validIds), '?'));
        
        // 2. Batch update
        $stmtUpd = $pdo->prepare("UPDATE voucher_codes SET status = 'used', used_at = NOW() WHERE id IN ($validPlaceholders)");
        $stmtUpd->execute($validIds);
        
        $pdo->commit();

        // 3. Trigger Automations
        foreach ($toRedeem as $row) {
            $workerService->trigger('/worker_priority.php?' . http_build_query([
                'trigger_type' => 'voucher_redeem', 
                'target_id' => $row['campaign_id'],
                'subscriber_id' => $row['subscriber_id']
            ]));
        }

        jsonResponse(true, null, 'Gạch mã hàng loạt thành công (' . count($validIds) . ' mã)!');
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log("[redeem_voucher] Batch Error: " . $e->getMessage());
        jsonResponse(false, null, 'Lỗi hệ thống khi gạch mã hàng loạt.');
    }
}

// --- SINGLE CODE REDEMPTION ---
$code = trim($input['code'] ?? '');
$campaignId = $input['campaign_id'] ?? null;

if (!$code) {
    jsonResponse(false, null, 'Vui lòng nhập mã Voucher');
}

try {
    // 1. Check if it is a static code from an active campaign in THIS workspace
    $stmtStatic = $pdo->prepare("SELECT * FROM voucher_campaigns WHERE static_code = ? AND status = 'active' AND workspace_id = ?");
    $stmtStatic->execute([$code, $admin_workspace_id]);
    $staticCamp = $stmtStatic->fetch(PDO::FETCH_ASSOC);

    if ($staticCamp) {
        if (!empty($staticCamp['end_date']) && strtotime($staticCamp['end_date']) < time()) {
            jsonResponse(false, null, 'Chương trình ưu đãi này đã kết thúc.');
        }
        // Static codes don't have individual tracking in voucher_codes table
        jsonResponse(true, null, 'Áp dụng mã tĩnh thành công!');
    }

    // 2. Find and Lock the dynamic code
    $pdo->beginTransaction();
    
    $sql = "SELECT vc.*, c.name as campaign_name, c.end_date as campaign_end_date 
            FROM voucher_codes vc 
            JOIN voucher_campaigns c ON vc.campaign_id = c.id 
            WHERE vc.code = ? AND c.workspace_id = ? FOR UPDATE";
    $params = [$code, $admin_workspace_id];

    if ($campaignId) {
        $sql .= " AND vc.campaign_id = ?";
        $params[] = $campaignId;
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $voucher = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$voucher) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Mã Voucher không tồn tại hoặc không hợp lệ.');
    }

    // 3. Validate state
    if ($voucher['status'] === 'used') {
        $pdo->rollBack();
        jsonResponse(false, null, 'Mã Voucher này đã được sử dụng vào ' . date('d/m/Y H:i:s', strtotime($voucher['used_at'])));
    }

    if (!empty($voucher['expires_at']) && strtotime($voucher['expires_at']) < time()) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Mã Voucher này đã hết hạn sử dụng.');
    }

    if (!empty($voucher['campaign_end_date']) && strtotime($voucher['campaign_end_date']) < time()) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Chương trình ưu đãi này đã kết thúc!');
    }

    // 4. Mark as used
    $stmtUpdate = $pdo->prepare("UPDATE voucher_codes SET status = 'used', used_at = NOW() WHERE id = ?");
    $stmtUpdate->execute([$voucher['id']]);
    
    $pdo->commit();

    // 5. Dispatch Automation Trigger (voucher_redeem)
    if (!empty($voucher['subscriber_id'])) {
        $workerService->trigger('/worker_priority.php?' . http_build_query([
            'trigger_type' => 'voucher_redeem', 
            'target_id' => $voucher['campaign_id'], 
            'subscriber_id' => $voucher['subscriber_id']
        ]));
    }

    jsonResponse(true, [
        'message' => 'Sử dụng Voucher thành công!',
        'campaign_name' => $voucher['campaign_name'],
        'code' => $code
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('[redeem_voucher] Error: ' . $e->getMessage());
    jsonResponse(false, null, 'Lỗi hệ thống khi xử lý voucher.');
}
