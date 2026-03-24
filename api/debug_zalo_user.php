<?php
/**
 * Zalo User Diagnostic Tool
 * Checks the status of a specific user to see why automation might be failing.
 */

require_once 'db_connect.php';

header('Content-Type: application/json');

$zaloUserId = $_GET['zalo_user_id'] ?? '3118244652184549974';

try {
    $report = [
        'user_id' => $zaloUserId,
        'timestamp' => date('Y-m-d H:i:s'),
        'diagnostics' => []
    ];

    // 1. Check Zalo Subscriber Table
    $stmtSub = $pdo->prepare("SELECT id, display_name, status, is_follower, ai_paused_until, oa_id FROM zalo_subscribers WHERE zalo_user_id = ?");
    $stmtSub->execute([$zaloUserId]);
    $sub = $stmtSub->fetch(PDO::FETCH_ASSOC);

    if (!$sub) {
        $report['diagnostics'][] = "❌ User NOT FOUND in `zalo_subscribers`. They might not have ever interacted or followed.";
    } else {
        $report['subscriber_info'] = $sub;

        // Check Pause Status
        if ($sub['ai_paused_until'] && strtotime($sub['ai_paused_until']) > time()) {
            $report['diagnostics'][] = "⚠️ AI IS PAUSED until {$sub['ai_paused_until']}. Duration remaining: " . (strtotime($sub['ai_paused_until']) - time()) . " seconds.";
            $report['diagnostics'][] = "💡 This is likely why the bot is not replying.";
        } else {
            $report['diagnostics'][] = "✅ AI is NOT paused in subscriber table.";
        }

        // Check Follow Status
        if (!$sub['is_follower']) {
            $report['diagnostics'][] = "⚠️ User is NOT a follower. Zalo OA API might restrict messages if they haven't sent a message recently or aren't followers.";
        }
    }

    // 2. Check AI Conversation Status
    $zaloVid = "zalo_" . $zaloUserId;
    $stmtConv = $pdo->prepare("SELECT id, status, property_id, last_message_at FROM ai_conversations WHERE visitor_id = ?");
    $stmtConv->execute([$zaloVid]);
    $conv = $stmtConv->fetch(PDO::FETCH_ASSOC);

    if (!$conv) {
        $report['diagnostics'][] = "❌ No active AI Conversation found for this user.";
    } else {
        $report['conversation_info'] = $conv;
        if ($conv['status'] === 'human') {
            $report['diagnostics'][] = "⚠️ Conversation status is set to 'HUMAN'. The bot will NOT reply in this mode.";
        } else {
            $report['diagnostics'][] = "✅ Conversation status is set to '{$conv['status']}'. Bot should be active.";
        }
    }

    // 3. Check Message History (Inbound vs Outbound)
    $stmtMsgs = $pdo->prepare("SELECT direction, message_text, created_at FROM zalo_user_messages WHERE zalo_user_id = ? ORDER BY created_at DESC LIMIT 5");
    $stmtMsgs->execute([$zaloUserId]);
    $msgs = $stmtMsgs->fetchAll(PDO::FETCH_ASSOC);
    $report['recent_messages'] = $msgs;

    $inboundCount = 0;
    foreach ($msgs as $m)
        if ($m['direction'] === 'inbound')
            $inboundCount++;

    if ($inboundCount === 0) {
        $report['diagnostics'][] = "⚠️ No INBOUND messages found from this user in recent history.";
    }

    // 4. Check Activity Timeline for Cooldowns
    if ($sub) {
        $stmtAct = $pdo->prepare("SELECT type, details, created_at FROM zalo_subscriber_activity WHERE subscriber_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR) ORDER BY created_at DESC");
        $stmtAct->execute([$sub['id']]);
        $activities = $stmtAct->fetchAll(PDO::FETCH_ASSOC);
        $report['recent_activity'] = $activities;

        foreach ($activities as $act) {
            if ($act['type'] === 'staff_reply') {
                $report['diagnostics'][] = "ℹ️ Recent Staff Reply detected at {$act['created_at']}. This triggers the AI cooldown.";
            }
        }
    }

    // 5. OA Config Check
    if ($sub && $sub['oa_id']) {
        $stmtOA = $pdo->prepare("SELECT name, status, access_token, token_expires_at FROM zalo_oa_configs WHERE oa_id = ?");
        $stmtOA->execute([$sub['oa_id']]);
        $oa = $stmtOA->fetch(PDO::FETCH_ASSOC);
        if ($oa) {
            $report['oa_status'] = [
                'name' => $oa['name'],
                'status' => $oa['status'],
                'token_expired' => ($oa['token_expires_at'] && strtotime($oa['token_expires_at']) < time())
            ];
            if ($report['oa_status']['token_expired']) {
                $report['diagnostics'][] = "❌ OA TOKEN EXPIRED. System cannot send messages for this OA.";
            }
        }
    }

    echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
