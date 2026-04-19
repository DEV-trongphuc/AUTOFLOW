<?php
// api/redeem_voucher.php
require_once 'bootstrap.php';
initializeSystem($pdo);
require_once 'auth_middleware.php';

// [SECURITY] Require authenticated workspace session
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    jsonResponse(false, null, 'Unauthorized');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, null, 'Method not allowed');
}

$data = json_decode(file_get_contents("php://input"), true) ?: [];
$codes = json_decode(file_get_contents("php://input"), true) ?: [];
if (isset($codes['ids']) && is_array($codes['ids'])) {
    $ids = $codes['ids'];
    if (empty($ids)) {
        jsonResponse(false, null, 'Không có mã nào được chọn');
    }
    
    // Get subscriber_ids before we update, to ensure we trigger for the right people
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmtFindSubs = $pdo->prepare("SELECT subscriber_id, campaign_id FROM voucher_codes WHERE id IN ($placeholders) AND status != 'used' AND subscriber_id IS NOT NULL");
    $stmtFindSubs->execute($ids);
    $subsToTrigger = $stmtFindSubs->fetchAll(PDO::FETCH_ASSOC);

    $pdo->prepare("UPDATE voucher_codes SET status = 'used', used_at = NOW() WHERE id IN ($placeholders) AND status != 'used'")->execute($ids);
    
    // Attempt batch automation via curl_multi instead of sequential or skipping
    if (!empty($subsToTrigger)) {
        $mh = curl_multi_init();
        $handles = [];
        foreach ($subsToTrigger as $subData) {
            $workerUrl = API_BASE_URL . "/worker_priority.php?" . http_build_query([
                'trigger_type' => 'voucher_redeem', 
                'target_id' => $subData['campaign_id'],
                'subscriber_id' => $subData['subscriber_id']
            ]);
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $workerUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 1);
            curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2); // [FIX P12-C1]
            curl_multi_add_handle($mh, $ch);
            $handles[] = $ch;
        }

        // Fire and forget instantly (only wait 0.1s max)
        $running = null;
        do {
            curl_multi_exec($mh, $running);
            if ($running) curl_multi_select($mh, 0.1);
        } while ($running > 0);

        foreach ($handles as $ch) {
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
        }
        curl_multi_close($mh);
    }

    jsonResponse(true, null, 'Gạch mã hàng loạt thành công!');
}

$code = trim($data['code'] ?? '');
$campaignId = $data['campaign_id'] ?? null;

if (!$code) {
    jsonResponse(false, null, 'Vui lòng nhập mã Voucher');
}

// 1. Check if it is a static code from a campaign
$stmtStatic = $pdo->prepare("SELECT * FROM voucher_campaigns WHERE static_code = ? AND status = 'active'");
$stmtStatic->execute([$code]);
$staticCamp = $stmtStatic->fetch(PDO::FETCH_ASSOC);

if ($staticCamp) {
    if (!empty($staticCamp['end_date']) && strtotime($staticCamp['end_date']) < time()) {
        jsonResponse(false, null, 'Chương trình ưu đãi này đã kết thúc vào ' . date('d/m/Y H:i', strtotime($staticCamp['end_date'])));
    }
    // Static code redemption does not tie to a specific subscriber unless provided.
    // We just return success and skip specific row marking.
    
    // Dispatch Automation optionally if we adapt the API to receive email/phone in future
    $workerUrl = API_BASE_URL . "/worker_priority.php?" . http_build_query([
        'trigger_type' => 'voucher_redeem', 
        'target_id' => $staticCamp['id'], 
        'subscriber_id' => ''
    ]);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $workerUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 1);
    curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2); // [FIX P12-C1]
    @curl_exec($ch);
    curl_close($ch);

    jsonResponse(true, null, 'Áp dụng mã tĩnh thành công (Không định danh)!');
}

// 2. Find the dynamic code
$sql = "SELECT vc.*, c.name as campaign_name, c.end_date as campaign_end_date FROM voucher_codes vc JOIN voucher_campaigns c ON vc.campaign_id = c.id WHERE vc.code = ?";
$params = [$code];

if ($campaignId) {
    $sql .= " AND vc.campaign_id = ?";
    $params[] = $campaignId;
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$voucher = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$voucher) {
    jsonResponse(false, null, 'Mã Voucher không tồn tại hoặc không hợp lệ.');
}

// 3. Validate state
if ($voucher['status'] === 'used') {
    jsonResponse(false, null, 'Mã Voucher này đã được sử dụng vào ' . date('d/m/Y H:i:s', strtotime($voucher['used_at'])));
}

if (!empty($voucher['expires_at']) && strtotime($voucher['expires_at']) < time()) {
    jsonResponse(false, null, 'Mã Voucher này đã hết hạn sử dụng vào ' . date('d/m/Y H:i', strtotime($voucher['expires_at'])));
}

if (!empty($voucher['campaign_end_date']) && strtotime($voucher['campaign_end_date']) < time()) {
    jsonResponse(false, null, 'Chương trình ưu đãi này đã kết thúc!');
}

// Ensure code was distributed (subscriber_id or sent_at is present)
if (empty($voucher['subscriber_id']) && empty($voucher['sent_at'])) {
    // Code exists but was never distributed to a subscriber. Strictly speaking it shouldn't be redeemable if not sent.
    jsonResponse(false, null, 'Mã Voucher này chưa được phân phát cho ai, không hợp lệ.');
}

// 3. Mark as used
$stmtUpdate = $pdo->prepare("UPDATE voucher_codes SET status = 'used', used_at = NOW() WHERE id = ?");
$stmtUpdate->execute([$voucher['id']]);

// 4. Dispatch Automation Trigger (voucher_redeem)
$workerUrl = API_BASE_URL . "/worker_priority.php?" . http_build_query([
    'trigger_type' => 'voucher_redeem', 
    'target_id' => $voucher['campaign_id'], 
    'subscriber_id' => $voucher['subscriber_id'] ?? ''
]);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $workerUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 1);
curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2); // [FIX P12-C1]
@curl_exec($ch);
curl_close($ch);

jsonResponse(true, [
    'message' => 'Sử dụng Voucher thành công!',
    'campaign_name' => $voucher['campaign_name'],
    'code' => $code
]);
