<?php
require_once 'db_connect.php';
$cronSecret = getenv('CRON_SECRET') ?: 'autoflow_cron_2026';
$passedSecret = $_GET['secret'] ?? '';

if (!hash_equals($cronSecret, $passedSecret)) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

echo "--- TESTING CURL LOOPBACK WITH DEFAULT USER AGENT --- \n";
$url = API_BASE_URL . "/worker_notify.php?secret=" . urlencode($cronSecret);
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['emails' => ['marketing@ideas.edu.vn'], 'html' => 'test']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$resDefault = curl_exec($ch);
$codeDefault = curl_getinfo($ch, CURLINFO_HTTP_CODE);
echo "Result code: $codeDefault\n";
echo "Response: " . substr($resDefault, 0, 150) . "\n\n";
curl_close($ch);

echo "--- TESTING CURL LOOPBACK WITH BROWSER USER AGENT --- \n";
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['emails' => ['marketing@ideas.edu.vn'], 'html' => 'test']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
$resBrowser = curl_exec($ch);
$codeBrowser = curl_getinfo($ch, CURLINFO_HTTP_CODE);
echo "Result code: $codeBrowser\n";
echo "Response: " . substr($resBrowser, 0, 150) . "\n\n";
curl_close($ch);
