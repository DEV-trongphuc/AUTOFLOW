<?php
// api/orchestrator_campaign.php
// FILE ÐI?U PH?I (ORCHESTRATOR) - G?I LU?NG WORKER CAMPAIGN 
// M?c dích: Ép xung t?c d? g?i Campaign lên hàng ch?c mail/giây b?ng multi-curl

ini_set('display_errors', 0);

// [SECURITY] Ch? cho phép g?i t? localhost/same-server (cron) ho?c có admin token h?p l?.
// Prevents unauthorized parties from spawning 10 campaign workers on demand (SMTP abuse).
$callerIp = $_SERVER['REMOTE_ADDR'] ?? '';
$serverIp = $_SERVER['SERVER_ADDR'] ?? '';
// [FIX] Check both 127.0.0.1 AND SERVER_ADDR.
// On some cPanel setups, cron curl calls route via the server's public IP (not loopback),
// causing REMOTE_ADDR to equal SERVER_ADDR instead of 127.0.0.1.
$isLocalhost = in_array($callerIp, ['127.0.0.1', '::1', 'localhost'])
    || ($serverIp && $callerIp === $serverIp);
$adminToken = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
if (!defined('ADMIN_BYPASS_TOKEN')) require_once __DIR__ . '/db_connect.php';
$isAuthorized = $isLocalhost || ($adminToken === ADMIN_BYPASS_TOKEN);
if (!$isAuthorized) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'forbidden', 'message' => 'Orchestrator requires localhost or admin token.']);
    exit;
}

// [RATE STRATEGY] SES limit = 14/s account-wide (shared across ALL workers).
// 2 workers × 5 emails/s each (enforced by per-worker rate limiter in worker_campaign.php)
// = 10/s total — safely under 14/s, zero throttle errors.
// Previously 10 workers competed for 14/s ? throttling ? 454 errors ? retry delays ? ~8-10/s actual.
$NUM_WORKERS = 2;

// URL g?c tr? t?i worker campaign 
// T? d?ng nh?n di?n http hay https và domain dang ch?y
$domain = $_SERVER['HTTP_HOST'] ?? 'automation.ideas.edu.vn';
$path = $_SERVER['REQUEST_URI'] ?? '/mail_api/orchestrator_campaign.php';

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || ($_SERVER['SERVER_PORT'] ?? 80) == 443) ? "https://" : "http://";
$workerUrl = $protocol . $domain . str_replace("orchestrator_campaign.php", "worker_campaign.php", $path);
// Lo?i b? query string n?u có
$workerUrl = explode('?', $workerUrl)[0];

$multiHandle = curl_multi_init();
$curlHandles = [];

// Kh?i t?o các lu?ng g?i HTTP d?c l?p
for ($i = 0; $i < $NUM_WORKERS; $i++) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $workerUrl . "?thread=" . $i);
    // Timeout c?c ng?n (1 giây) d? kích ho?t script ng?m r?i ng?t k?t n?i ngay (Fire-and-Forget) 
    // Không b?t PHP ph?i ch? vòng l?p worker 60 giây hoàn t?t
    curl_setopt($ch, CURLOPT_TIMEOUT, 1);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    // B? qua SSL peer cert check d? tránh l?i ? môi tru?ng dev/local
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    // [FIX P10-M2] CURLOPT_SSL_VERIFYHOST must be 2 (verify CN + hostname), not false/0 (disabled).
    // false silently disables hostname verification entirely — bad practice even for internal calls.
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
    
    curl_multi_add_handle($multiHandle, $ch);
    $curlHandles[] = $ch;
}

// B?n d?ng lo?t (Async) — Fire-and-forget v?i 0.1s yield d? tránh CPU spin loop
// M?i handle có CURLOPT_TIMEOUT=1s nên vòng l?p k?t thúc sau ~1s t?i da
$running = null;
do {
    $status = curl_multi_exec($multiHandle, $running);
    if ($running) {
        curl_multi_select($multiHandle, 0.1); // Yield CPU, không spin tiêu th? 100% core
    }
} while ($running > 0 && $status == CURLM_OK);

// D?n d?p cURL
foreach ($curlHandles as $ch) {
    curl_multi_remove_handle($multiHandle, $ch);
    curl_close($ch);
}
curl_multi_close($multiHandle);

// Ph?n h?i cho Web-Cron bi?t
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'status' => 'success',
    'message' => 'Ðã kích ho?t ' . $NUM_WORKERS . ' lu?ng Worker Campaign ch?y ng?m.',
    'target_url' => $workerUrl
]);
exit;
?>
