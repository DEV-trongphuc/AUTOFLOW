<?php
// api/zalo_tracking.php - ZNS Link Tracking Handler

error_reporting(E_ALL);
ini_set('display_errors', 0); // Hide errors on production
require_once 'db_connect.php';
require_once 'zalo_scoring_helper.php';

// Helper to get IP
function get_client_ip()
{
    $ipaddress = '';
    if (isset($_SERVER['HTTP_CLIENT_IP']))
        $ipaddress = $_SERVER['HTTP_CLIENT_IP'];
    else if (isset($_SERVER['HTTP_X_FORWARDED_FOR']))
        $ipaddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
    else if (isset($_SERVER['HTTP_X_FORWARDED']))
        $ipaddress = $_SERVER['HTTP_X_FORWARDED'];
    else if (isset($_SERVER['HTTP_FORWARDED_FOR']))
        $ipaddress = $_SERVER['HTTP_FORWARDED_FOR'];
    else if (isset($_SERVER['HTTP_FORWARDED']))
        $ipaddress = $_SERVER['HTTP_FORWARDED'];
    else if (isset($_SERVER['REMOTE_ADDR']))
        $ipaddress = $_SERVER['REMOTE_ADDR'];
    else
        $ipaddress = 'UNKNOWN';
    return $ipaddress;
}

$subId = $_GET['sub_id'] ?? null;
$flowId = $_GET['flow_id'] ?? null;
$stepId = $_GET['step_id'] ?? null;
$url = $_GET['url'] ?? '';

// Decode URL if encoded
$url = urldecode($url);

// Fallback if URL is empty
if (empty($url)) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['status' => 'error', 'message' => 'Lỗi: Không tìm thấy liên kết đích.']);
    exit;
}

if ($subId && $url) {
    try {
        // 1. Log Activity
        $logId = bin2hex(random_bytes(16));
        $ip = get_client_ip();
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';

        // Prepare Details String
        // We log the destination URL as details so we can match it in Condition checks
        $details = "Clicked link (+3 điểm): " . $url;

        $pdo->prepare("
            INSERT INTO subscriber_activity (id, subscriber_id, type, reference_id, flow_id, campaign_id, details, ip_address, user_agent, created_at)
            VALUES (?, ?, 'click_zns', ?, ?, NULL, ?, ?, ?, NOW())
        ")->execute([$logId, $subId, $stepId, $flowId, $details, $ip, $userAgent]);

        // 2. Update Subscriber Stats
        $pdo->prepare("
            UPDATE subscribers 
            SET stats_clicked = stats_clicked + 1, 
                last_click_at = NOW(), 
                last_activity_at = NOW() 
            WHERE id = ?
        ")->execute([$subId]);

        // 2.5. Update Lead Score
        updateZaloLeadScore($pdo, null, 'click_zns', $stepId, $subId);

        // 3. Mark Flow Interaction (Optional but good for analytics)
        if ($flowId) {
            $pdo->prepare("UPDATE flows SET stat_total_clicked = stat_total_clicked + 1 WHERE id = ?")->execute([$flowId]);
        }

    } catch (Exception $e) {
        // Silent fail to ensure redirect always happens
        // error_log($e->getMessage()); 
    }
}

// 4. Redirect
header("Location: " . $url);
exit;
