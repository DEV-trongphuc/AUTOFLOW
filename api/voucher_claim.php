<?php
// api/voucher_claim.php
require_once 'db_connect.php';
require_once 'flow_helpers.php';

/** @var \PDO $pdo */

$method = $_SERVER['REQUEST_METHOD'];

// Accept GET or POST (JSON or Application/X-WWW-FORM-URLENCODED)
$data = [];
if ($method === 'POST') {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    if (!$data) $data = $_POST;
} else if ($method === 'GET') {
    $data = $_GET;
}

$campaignId = trim($data['campaign_id'] ?? '');
$email = trim($data['email'] ?? '');
$phone = trim($data['phone'] ?? $data['phone_number'] ?? '');
$eventName = trim($data['event'] ?? 'voucher_claimed');

$redirectSuccess = trim($data['redirect_success'] ?? '');
$redirectEmpty = trim($data['redirect_empty'] ?? '');

$isAjax = (!empty($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) 
          || (!empty($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false)
          || (isset($_GET['ajax']) && $_GET['ajax'] == '1');

function doResponse($isAjax, $success, $message, $httpRedirect, $extraData = []) {
    if ($isAjax) {
        $extraData['success'] = $success;
        $extraData['message'] = $message;
        $extraData['redirect'] = $httpRedirect;
        apiHeaders();
        echo json_encode($extraData, JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        if ($httpRedirect) {
            header("Location: " . $httpRedirect);
            exit;
        } else {
            // Fallback display
            echo "<html><head><meta charset='utf-8'></head><body style='font-family:sans-serif;text-align:center;margin-top:50px;'>";
            echo "<h2>" . htmlspecialchars($message) . "</h2>";
            echo "</body></html>";
            exit;
        }
    }
}

if (!$campaignId) {
    doResponse($isAjax, false, "Thiếu tham số chiến dịch (campaign_id)", $redirectEmpty);
}

if (!$email && !$phone) {
    doResponse($isAjax, false, "Cần cung cấp Email hoặc Số điện thoại để nhận mã", $redirectEmpty);
}

// 1. Identiy / Upsert Subscriber
// [FIX] Áp dụng Named Lock để chống race condition
$lockTarget = $email ? "sub_email_" . md5($email) : "sub_phone_" . md5($phone);
$pdo->query("SELECT GET_LOCK('$lockTarget', 5)");

try {
    $stmtCheck = null;
    $sid = null;
    if ($email) {
        $stmtCheck = $pdo->prepare("SELECT id FROM subscribers WHERE email = ? LIMIT 1");
        $stmtCheck->execute([$email]);
        $sid = $stmtCheck->fetchColumn();
    } 
    if (!$sid && $phone) {
        $stmtCheck = $pdo->prepare("SELECT id FROM subscribers WHERE phone_number = ? LIMIT 1");
        $stmtCheck->execute([$phone]);
        $sid = $stmtCheck->fetchColumn();
    }

    if (!$sid) {
        // Create new
        $sid = bin2hex(random_bytes(16));
        $upsertFields = ['id' => $sid, 'status' => 'active', 'source' => 'Voucher Claim: ' . $campaignId];
        $upsertSet = "status = 'active'";
        if ($email) { $upsertFields['email'] = $email; }
        if ($phone) { $upsertFields['phone_number'] = $phone; }
        
        $first = trim($data['first_name'] ?? '');
        $last = trim($data['last_name'] ?? '');
        if ($first || $last) {
            $name = trim($first . ' ' . $last);
            $upsertFields['first_name'] = $name;
        }
        
        $cols = implode(', ', array_keys($upsertFields));
        $ph = implode(', ', array_fill(0, count($upsertFields), '?'));
        
        $pdo->prepare("INSERT INTO subscribers ($cols) VALUES ($ph) ON DUPLICATE KEY UPDATE $upsertSet")->execute(array_values($upsertFields));
    }

    $pdo->query("SELECT RELEASE_LOCK('$lockTarget')");
    
} catch (Exception $e) {
    $pdo->query("SELECT RELEASE_LOCK('$lockTarget')");
    doResponse($isAjax, false, "Lỗi khi xử lý dữ liệu hồ sơ.", $redirectEmpty);
}

// 2. Kiểm tra Campaign
$stmtCamp = $pdo->prepare("SELECT * FROM voucher_campaigns WHERE id = ?");
$stmtCamp->execute([$campaignId]);
$camp = $stmtCamp->fetch(PDO::FETCH_ASSOC);

if (!$camp || $camp['status'] !== 'active') {
    doResponse($isAjax, false, "Chiến dịch không tồn tại hoặc đã bị tắt.", $redirectEmpty);
}

// Kiểm tra Hạn
if (!empty($camp['end_date']) && strtotime($camp['end_date']) < time()) {
    doResponse($isAjax, false, "Chiến dịch đã kết thúc.", $redirectEmpty);
}

// 3. Tiến hành Xí Mã (Atomic Claim)
$codeAssigned = null;

try {
    $alreadyInTx = $pdo->inTransaction();
    if (!$alreadyInTx) $pdo->beginTransaction();

    // Check nếu đã xí rồi
    $stmtExist = $pdo->prepare("SELECT code FROM voucher_codes WHERE campaign_id = ? AND subscriber_id = ? LIMIT 1");
    $stmtExist->execute([$campaignId, $sid]);
    $existing = $stmtExist->fetchColumn();

    if ($existing) {
        $codeAssigned = $existing;
    } else {
        if ($camp['code_type'] === 'static') {
            $codeAssigned = $camp['static_code'];
        } else {
            // Dynamic: Pick one with version-aware locking
            // [FIX P10-C2] SKIP LOCKED requires MySQL >= 8.0; fallback to FOR UPDATE on 5.7.
            static $vcSkipLocked = null;
            if ($vcSkipLocked === null) {
                $v = $pdo->getAttribute(PDO::ATTR_SERVER_VERSION);
                $vcSkipLocked = version_compare($v, '8.0.0', '>=') ? 'SKIP LOCKED' : '';
            }
            $stmtClaim = $pdo->prepare("SELECT id, code FROM voucher_codes WHERE campaign_id = ? AND status = 'unused' AND subscriber_id IS NULL ORDER BY id ASC LIMIT 1 FOR UPDATE $vcSkipLocked");
            $stmtClaim->execute([$campaignId]);
            $row = $stmtClaim->fetch(PDO::FETCH_ASSOC);

            if ($row) {
                // Update Owner ngay lập tức (Check Expiration)
                $expiresAt = null;
                if (!empty($camp['expiration_days'])) {
                    $expiresAt = date('Y-m-d H:i:s', strtotime("+{$camp['expiration_days']} days"));
                }
                
                $pdo->prepare("UPDATE voucher_codes SET subscriber_id = ?, status = 'available', expires_at = ? WHERE id = ?")->execute([$sid, $expiresAt, $row['id']]);
                $codeAssigned = $row['code'];
            }
        }
    }

    if (!$alreadyInTx) $pdo->commit();
} catch (Exception $e) {
    if (!$alreadyInTx && $pdo->inTransaction()) $pdo->rollBack();
    doResponse($isAjax, false, "Hệ thống quá tải, vui lòng thử lại.", $redirectEmpty);
}

if (!$codeAssigned) {
    // Hết mã
    doResponse($isAjax, false, "Hết mã! Số lượng Voucher của chương trình đã cạn.", $redirectEmpty);
}

// 4. Kích hoạt Automation (Custom Event)
// Ghi nhận Activity
require_once 'tracking_helper.php';
logActivity($pdo, $sid, 'custom_event', $eventName, null, "Xí mã Voucher: $codeAssigned (Campaign: {$camp['name']})", null, null, ['campaign_id' => $campaignId, 'code' => $codeAssigned]);

// Dispatch Queue (Worker sẽ bắt Trigger có Loai = voucher & Target ID = campaign_id)
// Đồng thời vẫn bắn custom_event nếu có kịch bản cũ đang xài.
$workerUrl1 = API_BASE_URL . "/worker_priority.php?" . http_build_query([
    'trigger_type' => 'custom_event', 
    'target_id' => $eventName, 
    'subscriber_id' => $sid
]);
$workerUrl2 = API_BASE_URL . "/worker_priority.php?" . http_build_query([
    'trigger_type' => 'voucher', 
    'target_id' => $campaignId, 
    'subscriber_id' => $sid
]);

// Call both async
foreach ([$workerUrl1, $workerUrl2] as $url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 1);
    curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2); // [FIX P12-C1]
    @curl_exec($ch);
    curl_close($ch);
}

// Nếu có custom success redirect, có thể nối thêm mã code vào param nếu muốn
$finalRedirect = $redirectSuccess;
if ($finalRedirect && strpos($finalRedirect, '?') === false) {
    $finalRedirect .= '?voucher=' . urlencode($codeAssigned);
} else if ($finalRedirect) {
    $finalRedirect .= '&voucher=' . urlencode($codeAssigned);
}

doResponse($isAjax, true, "Lấy mã thành công! Mã của bạn là: " . $codeAssigned, $finalRedirect, [
    'code' => $codeAssigned,
    'event_triggered' => $eventName
]);
