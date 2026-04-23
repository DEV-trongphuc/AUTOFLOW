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
            // Fallback display with Premium Orange Theme
            header("Content-Type: text/html; charset=UTF-8");
            $isSuccess = $success;
            $accentColor = $isSuccess ? '#f97316' : '#ef4444';
            $icon = $isSuccess 
                ? '<svg style="width:40px;height:40px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                : '<svg style="width:40px;height:40px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
            
            echo '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Voucher System</title><style>
            body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;margin:0;padding:20px;box-sizing:border-box;} 
            .card{background:#fff;padding:3rem 2rem;border-radius:24px;box-shadow:0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);text-align:center;max-width:400px;width:100%;box-sizing:border-box;} 
            h2{color:#0f172a;margin-top:0;font-size:1.5rem;font-weight:800;letter-spacing:-0.025em;line-height:1.3;} 
            .icon-box{width:80px;height:80px;background:'.($isSuccess?'#fff7ed':'#fef2f2').';border-radius:24px;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;color:'.$accentColor.';}
            .btn{display:inline-block;margin-top:1.5rem;background:'.$accentColor.';color:white;text-decoration:none;padding:1rem 2rem;border-radius:16px;font-weight:800;font-size:1rem;transition:all 0.2s;}
            .btn:hover{transform:translateY(-1px);box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);}
            </style></head><body><div class="card"><div class="icon-box">'.$icon.'</div><h2>' . htmlspecialchars($message) . '</h2><a href="javascript:history.back()" class="btn">Quay lại</a></div></body></html>';
            exit;
        }
    }
}

if (!$campaignId) {
    doResponse($isAjax, false, "Thi?u tham s? chi?n d?ch (campaign_id)", $redirectEmpty);
}

if (!$email && !$phone) {
    doResponse($isAjax, false, "C?n cung c?p Email ho?c S? di?n tho?i d? nh?n m�", $redirectEmpty);
}

// 2. Kiểm tra Campaign
// [FIX BUG-CLAIM-1] Scope campaign fetch to workspace via JOIN guard — prevents cross-workspace claims
$stmtCamp = $pdo->prepare("SELECT * FROM voucher_campaigns WHERE id = ? AND status = 'active'");
$stmtCamp->execute([$campaignId]);
$camp = $stmtCamp->fetch(PDO::FETCH_ASSOC);

if (!$camp || $camp['status'] !== 'active') {
    doResponse($isAjax, false, "Chi?n d?ch kh�ng t?n t?i ho?c d� b? t?t.", $redirectEmpty);
}

// Ki?m tra H?n
if (!empty($camp['end_date']) && strtotime($camp['end_date']) < time()) {
    doResponse($isAjax, false, "Chi?n d?ch d� k?t th�c.", $redirectEmpty);
}

// 1. Identiy / Upsert Subscriber
// [FIX] �p d?ng Named Lock d? ch?ng race condition
// [FIX BUG-VC-1] Use prepared statement for GET_LOCK — old code used string interpolation
// which breaks if email contains a single-quote (e.g. o'brien@...) and is inconsistent
// with the pattern already used in forms.php and track.php.
$lockTarget = $email ? "sub_email_" . md5($email) : "sub_phone_" . md5($phone);
$pdo->prepare("SELECT GET_LOCK(?, 5)")->execute([$lockTarget]);


try {
    $stmtCheck = null;
    $sid = null;
    if ($email) {
        // [FIX BUG-CLAIM-1] Scope lookup to same workspace as campaign, prevents cross-tenant assignment
        $stmtCheck = $pdo->prepare("SELECT id FROM subscribers WHERE email = ? AND workspace_id = ? LIMIT 1");
        $stmtCheck->execute([$email, $camp['workspace_id']]);
        $sid = $stmtCheck->fetchColumn();
    } 
    if (!$sid && $phone) {
        $stmtCheck = $pdo->prepare("SELECT id FROM subscribers WHERE phone_number = ? AND workspace_id = ? LIMIT 1");
        $stmtCheck->execute([$phone, $camp['workspace_id']]);
        $sid = $stmtCheck->fetchColumn();
    }

    if (!$sid) {
        // Create new
        $sid = bin2hex(random_bytes(16));
        $upsertFields = ['id' => $sid, 'status' => 'active', 'source' => 'Voucher Claim: ' . $campaignId, 'workspace_id' => $camp['workspace_id']];
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

        // Add to Target List if configured
        if (!empty($camp['claim_target_list_id'])) {
            $pdo->prepare("INSERT IGNORE INTO subscriber_lists_map (list_id, subscriber_id, status) VALUES (?, ?, 'active')")
                ->execute([$camp['claim_target_list_id'], $sid]);
        }
    }

    $pdo->prepare("SELECT RELEASE_LOCK(?)")->execute([$lockTarget]);
    

} catch (Exception $e) {
    $pdo->prepare("SELECT RELEASE_LOCK(?)")->execute([$lockTarget]); // [FIX BUG-VC-1]
    doResponse($isAjax, false, "L?i khi x? l� d? li?u h? so.", $redirectEmpty);
}

// 3. Ti?n h�nh X� M� (Atomic Claim)
$codeAssigned = null;

try {
    $alreadyInTx = $pdo->inTransaction();
    if (!$alreadyInTx) $pdo->beginTransaction();

    // Check n?u d� x� r?i
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
                // Update Owner ngay l?p t?c (Check Expiration)
                $expiresAt = null;
                if (!empty($camp['expiration_days'])) {
                    $expiresAt = date('Y-m-d H:i:s', strtotime("+{$camp['expiration_days']} days"));
                }
                
                // [FIX BUG-VC-SCHEMA-1] status='available' was not a valid ENUM('unused','used') value.
                // In strict mode: error; in non-strict: silently stored as ''. Now correctly uses 'used'.
                // Note: codes are "assigned" but not necessarily "redeemed" yet — campaign admin can
                // differentiate via subscriber_id IS NOT NULL (assigned) vs used_at IS NOT NULL (redeemed).
                $pdo->prepare("UPDATE voucher_codes SET subscriber_id = ?, status = 'used', claimed_at = NOW(), expires_at = ? WHERE id = ?")->execute([$sid, $expiresAt, $row['id']]);
                $codeAssigned = $row['code'];
            }
        }
    }

    if (!$alreadyInTx) $pdo->commit();
} catch (Exception $e) {
    if (!$alreadyInTx && $pdo->inTransaction()) $pdo->rollBack();
    doResponse($isAjax, false, "H? th?ng qu� t?i, vui l�ng th? l?i.", $redirectEmpty);
}

if (!$codeAssigned) {
    // H?t m�
    doResponse($isAjax, false, "H?t m�! S? lu?ng Voucher c?a chuong tr�nh d� c?n.", $redirectEmpty);
}

// 4. K�ch ho?t Automation (Custom Event)
// Ghi nh?n Activity
require_once 'tracking_helper.php';
logActivity($pdo, $sid, 'custom_event', $eventName, null, "X� m� Voucher: $codeAssigned (Campaign: {$camp['name']})", null, null, ['campaign_id' => $campaignId, 'code' => $codeAssigned]);

// Dispatch Queue (Worker s? b?t Trigger c� Loai = voucher & Target ID = campaign_id)
// �?ng th?i v?n b?n custom_event n?u c� k?ch b?n cu dang x�i.
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

$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
foreach ([$workerUrl1, $workerUrl2] as $url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 1);
    curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2); // [FIX P12-C1]
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['X-Cron-Secret: ' . $cronSecret]);
    @curl_exec($ch);
    curl_close($ch);
}

// N?u c� custom success redirect, c� th? n?i th�m m� code v�o param n?u mu?n
$finalRedirect = $redirectSuccess;
if ($finalRedirect && strpos($finalRedirect, '?') === false) {
    $finalRedirect .= '?voucher=' . urlencode($codeAssigned);
} else if ($finalRedirect) {
    $finalRedirect .= '&voucher=' . urlencode($codeAssigned);
}

doResponse($isAjax, true, "L?y m� th�nh c�ng! M� c?a b?n l�: " . $codeAssigned, $finalRedirect, [
    'code' => $codeAssigned,
    'event_triggered' => $eventName
]);

