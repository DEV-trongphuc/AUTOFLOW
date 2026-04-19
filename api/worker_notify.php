<?php
// api/worker_notify.php
// Background worker để gửi Notification Emails bất đồng bộ (tránh block luồng API chính)
require_once 'db_connect.php';
require_once __DIR__ . '/worker_guard.php';
require_once 'Mailer.php';

$data = json_decode(file_get_contents("php://input"), true);
if (!$data || empty($data['emails']) || empty($data['html'])) {
    http_response_code(400);
    echo "Thiếu dữ liệu: emails, html";
    exit;
}

// 1. Phản hồi cho người gọi (API script) ngay lập tức để ngắt kết nối cURL
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

// 2. Bắt đầu gửi email ngầm (Mất 2-10 giây)
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
