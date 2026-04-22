<?php
require_once 'config.php';

$slug = $_GET['s'] ?? '';

if (!$slug) {
    // try PATH_INFO
    $path = $_SERVER['PATH_INFO'] ?? $_SERVER['REQUEST_URI'] ?? '';
    // if URL is like /api/go.php/my-slug
    $parts = explode('/go.php/', $path);
    if (count($parts) > 1) {
        $slug = explode('?', $parts[1])[0]; // Remove query params
    }
}

if (!$slug) {
    echo "Invalid Link.";
    exit;
}

$stmt = $pdo->prepare("SELECT * FROM short_links WHERE slug = ?");
$stmt->execute([$slug]);
$link = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$link) {
    echo "<h1>404 Not Found</h1><p>The link you clicked does not exist or has been removed.</p>";
    exit;
}

// --- STATUS ENFORCEMENT ---
if (($link['status'] ?? 'active') === 'paused') {
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Link Unavailable</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;margin:0;} .card{background:#fff;padding:2rem;border-radius:12px;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);text-align:center;max-width:400px;width:90%;} h2{color:#334155;margin-top:0;} p{color:#64748b;font-size:0.875rem;line-height:1.5;}</style></head><body><div class="card"><h2><svg style="width:48px;height:48px;color:#cbd5e1;margin-bottom:1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><br>Link Unvailable</h2><p>This link is currently paused by the administrator. Please try again later.</p></div></body></html>';
    exit;
}

// --- PIN PROTECTION ---
$accessPin = $link['access_pin'] ?? null;
if (!empty($accessPin)) {
    session_start();
    $pinSessionKey = 'link_auth_' . $link['id'];
    
    // Check if submitting PIN
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['pin'])) {
        if (trim($_POST['pin']) === $accessPin) {
            $_SESSION[$pinSessionKey] = true;
            header("Location: " . $_SERVER['REQUEST_URI']); // Refresh to clear POST data
            exit;
        } else {
            $pinError = "Mã PIN không chính xác.";
        }
    }
    
    // Check if session valid
    if (empty($_SESSION[$pinSessionKey])) {
        $errorHtml = isset($pinError) ? "<p style='color:#ef4444;font-size:0.875rem;margin-bottom:1rem;'>$pinError</p>" : "";
        echo '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Protected Link</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;margin:0;} .card{background:#fff;padding:2.5rem;border-radius:16px;box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.1);text-align:center;max-width:380px;width:90%;} h2{color:#0f172a;margin-top:0;font-size:1.25rem;} p{color:#64748b;font-size:0.875rem;margin-bottom:1.5rem;} input{width:100%;text-align:center;letter-spacing:0.5rem;font-size:1.5rem;padding:0.75rem;border:2px solid #e2e8f0;border-radius:8px;outline:none;transition:all 0.2s;box-sizing:border-box;} input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,0.2);} button{width:100%;margin-top:1.5rem;background:#4f46e5;color:white;border:none;padding:0.875rem;border-radius:8px;font-weight:600;font-size:1rem;cursor:pointer;transition:all 0.2s;} button:hover{background:#4338ca;} .icon{width:48px;height:48px;color:#6366f1;margin-bottom:1rem;}</style></head><body><div class="card"><svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg><h2>Liên kết được bảo vệ</h2><p>Vui lòng nhập mã PIN bảo mật để tiếp tục truy cập.</p>'.$errorHtml.'<form method="POST"><input type="password" name="pin" placeholder="••••" required autofocus autocomplete="off" maxlength="8"><button type="submit">Truy cập</button></form></div></body></html>';
        exit;
    }
}

// 1. Log the Click
function logClick($pdo, $linkId) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    
    // Simple Hash for IP to respect basic privacy
    $ipHash = md5($ip . 'mailflow_salt');

    $deviceType = 'Desktop';
    $os = 'Unknown';
    $country = $_SERVER['HTTP_CF_IPCOUNTRY'] ?? 'Unknown';

    if (preg_match('/mobile/i', $ua)) {
        $deviceType = 'Mobile';
    } elseif (preg_match('/tablet|ipad/i', $ua)) {
        $deviceType = 'Tablet';
    }

    if (preg_match('/android/i', $ua)) $os = 'Android';
    elseif (preg_match('/iphone|ipad|ipod/i', $ua)) $os = 'iOS';
    elseif (preg_match('/mac os x/i', $ua)) $os = 'Mac OS';
    elseif (preg_match('/windows/i', $ua)) $os = 'Windows';

    $stmt = $pdo->prepare("INSERT INTO link_clicks (id, short_link_id, ip_hash, user_agent, device_type, os, country) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([uniqid('clk_'), $linkId, $ipHash, $ua, $deviceType, $os, $country]);
}

try {
    logClick($pdo, $link['id']);
} catch (Exception $e) { /* ignore tracking error so redirect still works */ }

// 2. Decide Redirect Destination
$targetUrl = trim($link['target_url'] ?? '');
if (!preg_match('/^https?:\/\//i', $targetUrl)) {
    // Prevent javascript: or data: execution via Location header
    $targetUrl = 'http://' . preg_replace('/^[a-zA-Z0-9]+:/', '', $targetUrl);
}

if ($link['is_survey_checkin'] && $link['survey_id']) {
    // Redirect to Survey Check-in
    // We assume the frontend is running on the parent path of API
    $frontendBase = EXTERNAL_ASSET_BASE; // from config.php, usually equivalent to the frontend URL
    $surveyId = $link['survey_id'];
    
    $next = urlencode($targetUrl);
    
    $redirectUrl = rtrim($frontendBase, '/') . "/#/s/$surveyId?next=$next&src=qr_code&ref=$slug&slid=" . urlencode($link['id']);
    header("Location: $redirectUrl");
    exit;
}

// Ensure normal link tracking passes slid if target URL already has params
$separator = (strpos($targetUrl, '?') === false) ? '?' : '&';
$targetUrlWithSlid = $targetUrl . $separator . "slid=" . urlencode($link['id']);

// Default Direct Redirect
header("Location: $targetUrlWithSlid");
exit;

