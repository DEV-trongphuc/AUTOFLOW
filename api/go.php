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
    
    $redirectUrl = rtrim($frontendBase, '/') . "/#/s/$surveyId?next=$next&src=qr_code&ref=$slug";
    header("Location: $redirectUrl");
    exit;
}

// Default Direct Redirect
header("Location: $targetUrl");
exit;
