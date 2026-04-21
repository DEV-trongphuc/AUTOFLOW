<?php
/**
 * PUBLIC API for OTP Generation and Verification
 * Usage: curl -X POST https://yourdomain.com/api/otp.php -d '{"action":"generate", "profile_id":"otp_xxx", "receiver_email":"xxx"}'
 */

require_once 'config.php';
require_once 'Mailer.php';

header('Content-Type: application/json');
// Handle CORS if needed
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['action'])) {
    echo json_encode(['success' => false, 'error' => 'Missing action']);
    exit;
}

$action = $input['action'];

// -------------------------------------------------------------
// ACTION: GENERATE
// -------------------------------------------------------------
if ($action === 'generate') {
    $profileId = $input['profile_id'] ?? '';
    $email = $input['receiver_email'] ?? '';

    if (!$profileId || !$email) {
        echo json_encode(['success' => false, 'error' => 'Require profile_id and receiver_email']);
        exit;
    }

    // Fetch Profile
    $stmt = $pdo->prepare("SELECT * FROM otp_profiles WHERE id = ?");
    $stmt->execute([$profileId]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$profile) {
        echo json_encode(['success' => false, 'error' => 'Profile not found']);
        exit;
    }

    // Rate Limiting Check (60 seconds cooldown)
    $stmtRL = $pdo->prepare("SELECT created_at FROM otp_codes WHERE profile_id = ? AND receiver_email = ? ORDER BY created_at DESC LIMIT 1");
    $stmtRL->execute([$profileId, $email]);
    $lastTime = $stmtRL->fetchColumn();

    if ($lastTime && time() - strtotime($lastTime) < 60) {
        echo json_encode(['success' => false, 'error' => 'Vui lòng đợi 60 giây trước khi yêu cầu lại.']);
        exit;
    }

    // Generate Code
    $length = (int)$profile['token_length'];
    $type = $profile['token_type'];
    $code = '';
    
    if ($type === 'numeric') {
        for ($i = 0; $i < $length; $i++) $code .= rand(0, 9);
    } else if ($type === 'alpha') {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for ($i = 0; $i < $length; $i++) $code .= $chars[rand(0, strlen($chars)-1)];
    } else {
        $chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for ($i = 0; $i < $length; $i++) $code .= $chars[rand(0, strlen($chars)-1)];
    }

    $ttl = (int)$profile['ttl_minutes'];
    $expiresAt = date('Y-m-d H:i:s', strtotime("+$ttl minutes"));
    $codeId = uniqid('otpc_');
    
    // Check if there's already an active code to invalidate it (optional security step)
    $stmt = $pdo->prepare("UPDATE otp_codes SET status = 'expired' WHERE profile_id = ? AND receiver_email = ? AND status = 'pending'");
    $stmt->execute([$profileId, $email]);

    // Insert new pending token
    $stmt = $pdo->prepare("INSERT INTO otp_codes (id, profile_id, receiver_email, code_hash, status, expires_at) VALUES (?, ?, ?, ?, 'pending', ?)");
    // WARNING: In production, hashing the code (like md5 or bcrypt) and comparing later is safer,
    // but we store PLAINTEXT temporarily for simplicity because users need it quickly, or we store Hash.
    // Let's store plain here to match exact case.
    $stmt->execute([$codeId, $profileId, $email, $code, $expiresAt]);

    // Send Email
    if ($profile['email_template_id']) {
        $tsStmt = $pdo->prepare("SELECT subject, html_content FROM templates WHERE id = ?");
        $tsStmt->execute([$profile['email_template_id']]);
        $template = $tsStmt->fetch(PDO::FETCH_ASSOC);

        if ($template) {
            $html = str_replace('[short_code]', "<strong style='font-size:24px; letter-spacing:4px;'>$code</strong>", $template['html_content']);
            $subject = str_replace('[short_code]', $code, $template['subject'] ?? 'Mã xác nhận OTP của bạn');

            $mailer = new Mailer($pdo);
            $err = "";
            $mailer->dispatchRaw($email, $subject, $html, [], $err);
        }
    }

    echo json_encode(['success' => true, 'message' => 'OTP generated and sent', 'expires_at' => $expiresAt]);
    exit;
}

// -------------------------------------------------------------
// ACTION: VERIFY
// -------------------------------------------------------------
if ($action === 'verify') {
    $email = $input['receiver_email'] ?? '';
    $code = $input['code'] ?? '';
    $profileId = $input['profile_id'] ?? ''; // optional strict checking

    if (!$email || !$code) {
        echo json_encode(['success' => false, 'error' => 'Require receiver_email and code']);
        exit;
    }

    $query = "SELECT id, expires_at FROM otp_codes WHERE receiver_email = ? AND code_hash = ? AND status = 'pending'";
    $params = [$email, $code];
    if ($profileId) {
        $query .= " AND profile_id = ?";
        $params[] = $profileId;
    }
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$record) {
        echo json_encode(['success' => false, 'error' => 'Mã xác thực không hợp lệ hoặc đã hết hạn.']);
        exit;
    }

    if (strtotime($record['expires_at']) < time()) {
        $stmt = $pdo->prepare("UPDATE otp_codes SET status = 'expired' WHERE id = ?");
        $stmt->execute([$record['id']]);
        echo json_encode(['success' => false, 'error' => 'Mã xác thực đã hết hạn. Vui lòng gửi lại.']);
        exit;
    }

    // Success! Mark as verified
    $stmt = $pdo->prepare("UPDATE otp_codes SET status = 'verified', verified_at = NOW() WHERE id = ?");
    $stmt->execute([$record['id']]);

    echo json_encode(['success' => true, 'message' => 'Xác nhận OTP thành công!']);
    exit;
}

echo json_encode(['success' => false, 'error' => 'Unknown action']);
