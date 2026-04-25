<?php
// api/send_test_email.php
// Sends a test email with provided HTML content.

error_reporting(E_ALL & ~E_NOTICE);
ini_set('display_errors', 0);
header('Content-Type: application/json; charset=utf-8');

require_once 'db_connect.php';
require_once 'auth_middleware.php';
require_once 'Mailer.php';

// [SECURITY] Require authenticated workspace session — SMTP credentials must not be accessible unauthenticated
if (empty($GLOBALS['current_admin_id']) && empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// --- RATE LIMITING: Max 5 test emails per IP per 10 minutes ---
// [FIX] Prevent SMTP abuse — unauthenticated endpoint can be hammered without this guard.
$clientIp = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateLimitKey = 'test_email_rate_' . md5($clientIp);
$rateLimit = 5;
$rateWindow = 600; // 10 minutes

$blocked = false;
if (function_exists('apcu_fetch') && function_exists('apcu_store')) {
    $hits = (int) apcu_fetch($rateLimitKey);
    if ($hits >= $rateLimit) {
        $blocked = true;
    } else {
        apcu_store($rateLimitKey, $hits + 1, $rateWindow);
    }
} else {
    // Fallback: file-based counter
    $lockFile = __DIR__ . '/_locks/test_email_rate_' . md5($clientIp) . '.json';
    $state = file_exists($lockFile) ? json_decode(@file_get_contents($lockFile), true) : null;
    $now = time();
    if ($state && ($now - $state['since']) < $rateWindow) {
        if ($state['count'] >= $rateLimit) {
            $blocked = true;
        } else {
            $state['count']++;
            @file_put_contents($lockFile, json_encode($state));
        }
    } else {
        @file_put_contents($lockFile, json_encode(['since' => $now, 'count' => 1]));
    }
}

if ($blocked) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Rate limit exceeded. Maximum 5 test emails per 10 minutes per IP.']);
    exit;
}

// Get POST data
$data = json_decode(file_get_contents('php://input'), true);

$toEmail = $data['email'] ?? '';
$subject = $data['subject'] ?? 'Test Email from MailFlow Pro';
$htmlContent = $data['content'] ?? '';

if (empty($toEmail) || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'error' => 'Invalid email address']);
    exit;
}

if (empty($htmlContent)) {
    echo json_encode(['success' => false, 'error' => 'No content to send']);
    exit;
}

// [FIX] Removed redundant system_settings query that was here previously.
// Mailer::__construct() already calls loadSettings() internally — it was a wasted DB round-trip
// and the variables ($defaultSender, $senderName) were never even passed to the Mailer.

try {
    if (!defined('API_BASE_URL')) {
        throw new Exception("API_BASE_URL constant is not defined. Check db_connect.php.");
    }

    $workspaceId = (int)get_current_workspace_id();
    $mailer = new Mailer($pdo, API_BASE_URL, 'marketing@ka-en.com.vn', $workspaceId);

    $allAttachments = $data['attachments'] ?? [];
    $filteredAttachments = Mailer::filterAttachments($allAttachments, $toEmail);

    // [FIX] Use dispatchRaw() instead of send() for test emails.
    // send() injects tracking pixels and rewrites all links to webhook.php redirect URLs,
    // making it impossible to preview the original HTML as the designer intended.
    // dispatchRaw() sends the HTML exactly as provided — no tracking overhead.
    $error = '';
    $success = $mailer->dispatchRaw($toEmail, $subject, $htmlContent, $filteredAttachments, $error, [], $workspaceId);

    if ($success) {
        echo json_encode(['success' => true, 'message' => 'Test email sent successfully']);
    } else {
        echo json_encode(['success' => false, 'error' => $error ?: 'Failed to send email']);
    }

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Lỗi hệ thống, vui lòng thử lại.',
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
