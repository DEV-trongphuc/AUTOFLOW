<?php
// api/worker_notify.php
// Background worker d? g?i Notification Emails b?t d?ng b? (tránh block lu?ng API chính)
require_once 'db_connect.php';
require_once __DIR__ . '/worker_guard.php';
require_once 'Mailer.php';

$data = json_decode(file_get_contents("php://input"), true);
if (!$data || empty($data['emails']) || empty($data['html'])) {
    http_response_code(400);
    echo "Thi?u d? li?u: emails, html";
    exit;
}

// 1. Ph?n h?i cho ngu?i g?i (API script) ngay l?p t?c d? ng?t k?t n?i cURL
if (session_id()) session_write_close();
ob_start();
echo json_encode(["status" => "processing", "message" => "Background notification queued."]);
header("Content-Length: " . ob_get_length());
header("Connection: close");
ob_end_flush();
if (ob_get_level() > 0) ob_flush();
flush();
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
}

// 2. B?t d?u g?i email ng?m (M?t 2-10 giây)
try {
    $mailer = new Mailer($pdo);
    $errTmp = '';
    
    $subject = $data['subject'] ?? 'System Notification';
    $html = $data['html'];
    $emails = is_array($data['emails']) ? $data['emails'] : [$data['emails']];
    $ccEmails = isset($data['cc_emails']) && is_array($data['cc_emails']) ? $data['cc_emails'] : [];

    foreach ($emails as $to) {
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) continue;
        
        $mailer->dispatchRaw(
            $to, 
            $subject, 
            $html, 
            [], 
            $errTmp, 
            $ccEmails
        );
    }
} catch (Exception $e) {
    error_log("Worker_Notify Error: " . $e->getMessage());
}
