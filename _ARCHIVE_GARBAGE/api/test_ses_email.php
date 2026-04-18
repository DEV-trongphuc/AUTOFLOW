<?php
// api/test_ses_email.php - Test Amazon SES SMTP Configuration
// Usage: Truy cập trực tiếp qua browser: https://your-domain.com/api/test_ses_email.php

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';
require_once 'Mailer.php';

header('Content-Type: text/html; charset=utf-8');

// ===== CONFIGURATION =====
// Thay đổi email nhận test tại đây
$TEST_RECIPIENT = 'tuyensinh@ideas.edu.vn'; // ✅ Email đã verify - gửi cho chính mình

// ===== LOAD SETTINGS =====
$stmt = $pdo->query("SELECT * FROM system_settings");
$settings = [];
foreach ($stmt->fetchAll() as $row) {
    $settings[$row['key']] = $row['value'];
}

echo "<html><head><meta charset='UTF-8'><title>Test Amazon SES</title>";
echo "<style>
body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
.box { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
h1 { color: #333; border-bottom: 3px solid #ffa900; padding-bottom: 10px; }
h2 { color: #666; font-size: 18px; margin-top: 0; }
.success { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; }
.error { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; border-left: 4px solid #dc3545; }
.info { background: #d1ecf1; color: #0c5460; padding: 15px; border-radius: 5px; border-left: 4px solid #17a2b8; }
.config { background: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; }
table { width: 100%; border-collapse: collapse; }
td { padding: 8px; border-bottom: 1px solid #eee; }
td:first-child { font-weight: bold; width: 200px; color: #666; }
.btn { display: inline-block; padding: 12px 24px; background: #ffa900; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px; }
.btn:hover { background: #e69900; }
</style></head><body>";

echo "<h1>🚀 Amazon SES SMTP Test</h1>";

// ===== DISPLAY CURRENT CONFIG =====
echo "<div class='box'>";
echo "<h2>📋 Cấu hình hiện tại</h2>";
echo "<table>";
echo "<tr><td>SMTP Enabled</td><td>" . ($settings['smtp_enabled'] ?? 'Not set') . "</td></tr>";
echo "<tr><td>SMTP Host</td><td>" . ($settings['smtp_host'] ?? 'Not set') . "</td></tr>";
echo "<tr><td>SMTP Port</td><td>" . ($settings['smtp_port'] ?? 'Not set') . "</td></tr>";
echo "<tr><td>SMTP User</td><td>" . ($settings['smtp_user'] ?? 'Not set') . "</td></tr>";
echo "<tr><td>SMTP Password</td><td>" . (isset($settings['smtp_pass']) ? str_repeat('*', strlen($settings['smtp_pass'])) : 'Not set') . "</td></tr>";
echo "<tr><td>From Name</td><td>" . ($settings['smtp_from_name'] ?? 'Not set') . "</td></tr>";
echo "</table>";
echo "</div>";

// ===== CHECK CONFIGURATION =====
$errors = [];
if (empty($settings['smtp_enabled']) || $settings['smtp_enabled'] !== '1') {
    $errors[] = "SMTP chưa được bật (smtp_enabled)";
}
if (empty($settings['smtp_host'])) {
    $errors[] = "SMTP Host chưa được cấu hình";
}
if (empty($settings['smtp_user'])) {
    $errors[] = "SMTP Username chưa được cấu hình";
}
if (empty($settings['smtp_pass'])) {
    $errors[] = "SMTP Password chưa được cấu hình";
}

if (!empty($errors)) {
    echo "<div class='box'>";
    echo "<div class='error'>";
    echo "<strong>❌ Lỗi cấu hình:</strong><ul>";
    foreach ($errors as $err) {
        echo "<li>$err</li>";
    }
    echo "</ul>";
    echo "<p>Vui lòng chạy file <code>api/configure_amazon_ses.sql</code> trước!</p>";
    echo "</div>";
    echo "</div>";
    echo "</body></html>";
    exit;
}

// ===== SEND TEST EMAIL =====
echo "<div class='box'>";
echo "<h2>📧 Gửi email test</h2>";

if ($TEST_RECIPIENT === 'your-email@example.com') {
    echo "<div class='error'>";
    echo "<strong>⚠️ Cảnh báo:</strong> Bạn cần thay đổi biến <code>\$TEST_RECIPIENT</code> trong file này thành email thực tế của bạn!";
    echo "</div>";
} else {
    echo "<div class='info'>";
    echo "<strong>📨 Đang gửi email test đến:</strong> $TEST_RECIPIENT";
    echo "</div>";

    try {
        $apiUrl = API_BASE_URL;
        $mailer = new Mailer($pdo, $apiUrl, $settings['smtp_user']);

        $subject = "Test Email từ MailFlow Pro - Amazon SES";
        $htmlContent = "
        <html>
        <body style='font-family: Arial, sans-serif; padding: 20px;'>
            <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; color: white;'>
                <h1 style='margin: 0;'>✅ Amazon SES hoạt động!</h1>
                <p style='margin: 10px 0 0 0; opacity: 0.9;'>Email này được gửi từ MailFlow Pro qua Amazon SES SMTP</p>
            </div>
            <div style='padding: 20px; background: #f8f9fa; margin-top: 20px; border-radius: 10px;'>
                <h2 style='color: #333;'>Thông tin kỹ thuật:</h2>
                <ul style='color: #666;'>
                    <li><strong>SMTP Host:</strong> {$settings['smtp_host']}</li>
                    <li><strong>SMTP Port:</strong> {$settings['smtp_port']}</li>
                    <li><strong>From:</strong> {$settings['smtp_user']}</li>
                    <li><strong>Thời gian:</strong> " . date('Y-m-d H:i:s') . "</li>
                </ul>
            </div>
            <div style='margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px;'>
                <p style='margin: 0; color: #856404;'><strong>Lưu ý:</strong> Nếu bạn nhận được email này, nghĩa là Amazon SES đã được cấu hình thành công!</p>
            </div>
        </body>
        </html>
        ";

        // Create a test subscriber ID (or use existing)
        $testSubId = 'test-ses-' . time();

        $result = $mailer->send(
            $TEST_RECIPIENT,
            $subject,
            $htmlContent,
            $testSubId,
            null, // campaignId
            null, // flowId
            'SES Test',
            [], // attachments
            null, // reminderId
            null, // stepId
            null, // stepLabel
            true  // isQACopy - skip tracking
        );

        if ($result === true) {
            echo "<div class='success' style='margin-top: 15px;'>";
            echo "<strong>✅ Thành công!</strong><br>";
            echo "Email đã được gửi thành công đến <strong>$TEST_RECIPIENT</strong><br>";
            echo "<small>Kiểm tra hộp thư của bạn (có thể trong Spam/Junk nếu lần đầu)</small>";
            echo "</div>";

            // Check delivery log
            $stmt = $pdo->prepare("SELECT * FROM mail_delivery_logs ORDER BY sent_at DESC LIMIT 1");
            $stmt->execute();
            $log = $stmt->fetch();

            if ($log) {
                echo "<div class='config' style='margin-top: 15px;'>";
                echo "<strong>📊 Log gửi email:</strong><br>";
                echo "Status: " . $log['status'] . "<br>";
                echo "Sent at: " . $log['sent_at'] . "<br>";
                echo "</div>";
            }
        } else {
            echo "<div class='error' style='margin-top: 15px;'>";
            echo "<strong>❌ Lỗi khi gửi email:</strong><br>";
            echo "<code>" . htmlspecialchars($result) . "</code>";
            echo "</div>";
        }

    } catch (Exception $e) {
        echo "<div class='error' style='margin-top: 15px;'>";
        echo "<strong>❌ Exception:</strong><br>";
        echo "<code>" . htmlspecialchars($e->getMessage()) . "</code>";
        echo "</div>";
    }
}

echo "</div>";

// ===== NEXT STEPS =====
echo "<div class='box'>";
echo "<h2>🎯 Bước tiếp theo</h2>";
echo "<ol>";
echo "<li><strong>Kiểm tra email:</strong> Mở hộp thư $TEST_RECIPIENT và xác nhận đã nhận email</li>";
echo "<li><strong>Kiểm tra Spam:</strong> Nếu không thấy trong Inbox, kiểm tra thư mục Spam/Junk</li>";
echo "<li><strong>Setup SNS:</strong> Sau khi test thành công, cấu hình SNS notifications để xử lý bounce</li>";
echo "<li><strong>Production Access:</strong> Nếu đang ở Sandbox, request production access từ AWS</li>";
echo "</ol>";
echo "</div>";

echo "</body></html>";
?>