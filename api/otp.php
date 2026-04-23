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
    $subject = 'Mã xác nhận OTP của bạn';
    $html = '';

    if ($profile['email_template_id']) {
        $tsStmt = $pdo->prepare("SELECT subject, html_content FROM templates WHERE id = ?");
        $tsStmt->execute([$profile['email_template_id']]);
        $template = $tsStmt->fetch(PDO::FETCH_ASSOC);

        if ($template && trim($template['html_content'])) {
            // Simply replace [short_code] with $code to preserve the exact UI/UX
            // styles designed in the EmailBuilder OTP block (which already applies 
            // letter-spacing, font-size, colors, and paddings).
            $html = str_replace(['[short_code]', '{{short_code}}'], $code, $template['html_content']);
            $subject = str_replace(['[short_code]', '{{short_code}}'], $code, $template['subject'] ?? 'Mã xác nhận OTP của bạn');

            // Failsafe: If user forgot to add the OTP block, the email would be useless. 
            // We append the code at the bottom as a fallback.
            if (strpos($html, $code) === false) {
                $fallbackHtml = "<div style='text-align:center; padding: 20px; background: #f8fafc; margin-top: 20px; border-top: 2px dashed #e2e8f0; font-family: sans-serif;'><p style='color: #64748b; font-size: 14px; margin-bottom: 8px;'>Mã xác thực của bạn là:</p><strong style='font-size:32px; letter-spacing: 8px; color:#166534;'>$code</strong></div>";
                if (strpos($html, '</body>') !== false) {
                    $html = str_replace('</body>', $fallbackHtml . '</body>', $html);
                } else {
                    $html .= $fallbackHtml;
                }
            }
        }
    }

    if (!$html) {
        $subject = "Mã xác thực OTP: $code";
        $html = "
        <div style='font-family: Inter, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 50px 20px;'>
            <div style='max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px 32px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #f1f5f9;'>
                <h2 style='color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700;'>Mã xác thực của bạn</h2>
                <p style='color: #64748b; font-size: 15px; margin-bottom: 32px; line-height: 1.5;'>
                    Bạn đang yêu cầu một tác vụ cần xác thực. Vui lòng sử dụng mã dưới đây để tiếp tục:
                </p>
                <div style='background-color: #f0fdf4; border: 1px dashed #86efac; border-radius: 12px; padding: 24px; margin-bottom: 32px;'>
                    <span style='font-size: 36px; font-weight: 900; letter-spacing: 12px; color: #166534; display: inline-block; transform: translateX(6px);'>$code</span>
                </div>
                <p style='color: #94a3b8; font-size: 13px; margin-bottom: 0; line-height: 1.6;'>
                    Mã này có hiệu lực trong <b>$ttl phút</b>.<br>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.
                </p>
            </div>
        </div>
        ";
    }

    $mailer = new Mailer($pdo);
    $err = '';
    if (!$mailer->dispatchRaw($email, $subject, $html, [], $err)) {
        // Even if email fails, we might still want to return success but log it?
        // Let's return error so frontend knows it failed
        $stmtDel = $pdo->prepare("DELETE FROM otp_codes WHERE id = ?");
        $stmtDel->execute([$codeId]);
        echo json_encode(['success' => false, 'error' => 'Không thể gửi email OTP: ' . $err]);
        exit;
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
