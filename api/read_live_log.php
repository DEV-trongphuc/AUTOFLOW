<?php
require_once 'db_connect.php';
$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
$passedSecret = $_GET['secret'] ?? '';

if (!hash_equals($cronSecret, $passedSecret)) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

echo "--- TESTING CURL TO 127.0.0.1 WITH HOST HEADER --- \n";
$url = "http://127.0.0.1/mail_api/worker_notify.php?secret=" . urlencode($cronSecret);
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['emails' => ['marketing@ideas.edu.vn'], 'html' => 'test']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Host: automation.ideas.edu.vn']);
$res127 = curl_exec($ch);
$code127 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err127 = curl_error($ch);
echo "Result code: $code127\n";
echo "Error: $err127\n";
echo "Response: " . substr($res127, 0, 150) . "\n\n";
curl_close($ch);

echo "--- TESTING CURL TO LOCALHOST WITH HOST HEADER --- \n";
$url = "http://localhost/mail_api/worker_notify.php?secret=" . urlencode($cronSecret);
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['emails' => ['marketing@ideas.edu.vn'], 'html' => 'test']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Host: automation.ideas.edu.vn']);
$resLocal = curl_exec($ch);
$codeLocal = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$errLocal = curl_error($ch);
echo "Result code: $codeLocal\n";
echo "Error: $errLocal\n";
echo "Response: " . substr($resLocal, 0, 150) . "\n\n";
curl_close($ch);
