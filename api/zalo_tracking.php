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
        $rawIp = get_client_ip();
        $ip = md5($rawIp);
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';

        // Prepare Details String
        // We log the destination URL as details so we can match it in Condition checks
        $details = "Clicked link (+3 điểm): " . $url;

        // Resolve workspace_id from subscriber
        $wId = 1;
        try {
            $stmtSub = $pdo->prepare("SELECT workspace_id FROM subscribers WHERE id = ?");
            $stmtSub->execute([$subId]);
            $wId = $stmtSub->fetchColumn() ?: 1;
        } catch (Exception $e) {}

        $pdo->prepare("
            INSERT INTO subscriber_activity (id, subscriber_id, workspace_id, type, reference_id, flow_id, campaign_id, details, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, 'click_zns', ?, ?, NULL, ?, ?, ?, NOW())
        ")->execute([$logId, $subId, $wId, $stepId, $flowId, $details, $ip, $userAgent]);

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

        // 3. Mark Flow Interaction — ZNS clicks
        // [FIX P14-C1] Route to stat_total_zalo_clicked (not stat_total_clicked which is email-only).
        // Previously the wrong column was incremented, inflating email CTR and leaving
        // stat_total_zalo_clicked permanently at 0 for any ZNS step in a flow.
        if ($flowId) {
            $pdo->prepare("UPDATE flows SET stat_total_zalo_clicked = stat_total_zalo_clicked + 1 WHERE id = ?")->execute([$flowId]);
        }

        // [FIX P14-C1] Dispatch a priority queue job so Condition steps waiting for a
        // ZNS click ('zns_clicked' conditionType → 'click_zns' activity) are evaluated
        // immediately instead of waiting up to 15 minutes for the next cron cycle.
        // Mirrors the email click poke in tracking_processor.php (Case A).
        if ($subId && $flowId) {
            try {
                require_once __DIR__ . '/trigger_helper.php';
                $checkWait = $pdo->prepare("
                    SELECT sfs.id, sfs.step_type
                    FROM subscriber_flow_states sfs
                    WHERE sfs.subscriber_id = ? AND sfs.flow_id = ? AND sfs.status = 'waiting'
                ");
                $checkWait->execute([$subId, $flowId]);
                foreach ($checkWait->fetchAll(PDO::FETCH_ASSOC) as $state) {
                    if (($state['step_type'] ?? '') === 'condition') {
                        dispatchQueueJob($pdo, 'flows', [
                            'priority_queue_id' => $state['id'],
                            'subscriber_id'     => $subId,
                            'priority_flow_id'  => $flowId
                        ]);
                    }
                }
            } catch (Exception $ePoke) {
                // Silent fail — poke is best-effort; worker cron remains the safety net
            }
        }

    } catch (Exception $e) {
        // Silent fail to ensure redirect always happens
        // error_log($e->getMessage()); 
    }
}

// 4. Redirect
header("Location: " . $url);
exit;
