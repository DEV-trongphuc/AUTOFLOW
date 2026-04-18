<?php
/**
 * Quick Check: Why AI Not Replying?
 * Usage: check_ai_pause.php?psid=XXXXXXX
 */
require_once 'db_connect.php';

header('Content-Type: text/html; charset=utf-8');

$psid = $_GET['psid'] ?? '5781498405295102'; // Default PSID from your screenshot

echo "<html><head><style>
body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
.ok { color: #4ec9b0; font-weight: bold; }
.error { color: #f48771; font-weight: bold; }
.warning { color: #dcdcaa; font-weight: bold; }
pre { background: #252526; padding: 15px; border-left: 3px solid #007acc; }
h2 { color: #569cd6; }
</style></head><body>";

echo "<h1>🔍 AI Debug Report - PSID: $psid</h1>";
echo "<p>Current Time: " . date('Y-m-d H:i:s') . "</p><hr>";

// 1. Check if subscriber exists
$stmt = $pdo->prepare("SELECT * FROM meta_subscribers WHERE psid = ?");
$stmt->execute([$psid]);
$sub = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$sub) {
    echo "<h2 class='error'>❌ PSID NOT FOUND</h2>";
    echo "<p>This PSID doesn't exist in database.</p>";
    exit;
}

echo "<h2>📋 Subscriber Info</h2>";
echo "<pre>";
echo "Name: " . ($sub['name'] ?? 'N/A') . "\n";
echo "Page ID: {$sub['page_id']}\n";
echo "Last Active: {$sub['last_active_at']}\n";
echo "</pre>";

// 2. Check AI Pause Status
echo "<h2>⏸️ AI Pause Status</h2>";
if ($sub['ai_paused_until']) {
    $pauseTime = strtotime($sub['ai_paused_until']);
    $now = time();

    if ($pauseTime > $now) {
        $remaining = round(($pauseTime - $now) / 60);
        echo "<p class='error'>❌ AI IS PAUSED!</p>";
        echo "<pre>";
        echo "Paused Until: {$sub['ai_paused_until']}\n";
        echo "Remaining: $remaining minutes\n";
        echo "Reason: Staff replied from Facebook Inbox\n";
        echo "</pre>";

        echo "<p><a href='unpause_ai_meta.php?psid=$psid' style='color: #4ec9b0;'>👉 Click here to UNPAUSE NOW</a></p>";
    } else {
        echo "<p class='ok'>✅ Pause expired (AI should work now)</p>";
    }
} else {
    echo "<p class='ok'>✅ AI is NOT paused</p>";
}

// 3. Check Scenario
echo "<h2>🤖 AI Scenario Status</h2>";
$stmtConfig = $pdo->prepare("SELECT id FROM meta_app_configs WHERE page_id = ? AND status = 'active'");
$stmtConfig->execute([$sub['page_id']]);
$config = $stmtConfig->fetch(PDO::FETCH_ASSOC);

if (!$config) {
    echo "<p class='error'>❌ No active page config found</p>";
} else {
    $stmtScenario = $pdo->prepare("SELECT * FROM meta_automation_scenarios WHERE meta_config_id = ? AND type = 'ai_reply' AND status = 'active'");
    $stmtScenario->execute([$config['id']]);
    $scenario = $stmtScenario->fetch(PDO::FETCH_ASSOC);

    if (!$scenario) {
        echo "<p class='error'>❌ No AI scenario enabled</p>";
    } else {
        echo "<pre>";
        echo "Scenario ID: {$scenario['id']}\n";
        echo "Chatbot ID: {$scenario['ai_chatbot_id']}\n";
        echo "Schedule: {$scenario['schedule_type']}\n";

        if ($scenario['schedule_type'] === 'business_hours') {
            $now = date('H:i:s');
            $nowDay = date('w');
            $days = explode(',', $scenario['active_days'] ?? '');

            echo "Active Days: " . implode(', ', $days) . " (Today: $nowDay)\n";
            echo "Hours: {$scenario['start_time']} - {$scenario['end_time']} (Now: $now)\n";

            $inDays = in_array($nowDay, $days);
            $inHours = ($now >= $scenario['start_time'] && $now <= $scenario['end_time']);

            if ($inDays && $inHours) {
                echo "\nStatus: ";
                echo "<span class='ok'>✅ Within business hours</span>\n";
            } else {
                echo "\nStatus: ";
                echo "<span class='error'>❌ Outside business hours</span>\n";
            }
        } else {
            echo "Status: <span class='ok'>✅ 24/7 mode</span>\n";
        }
        echo "</pre>";
    }
}

// 4. Check Recent Messages
echo "<h2>💬 Recent Messages (Last 10)</h2>";
$stmtMsg = $pdo->prepare("SELECT * FROM meta_message_logs WHERE psid = ? ORDER BY timestamp DESC LIMIT 10");
$stmtMsg->execute([$psid]);
$msgs = $stmtMsg->fetchAll(PDO::FETCH_ASSOC);

if (empty($msgs)) {
    echo "<p class='warning'>⚠️ No messages found</p>";
} else {
    echo "<table border='1' cellpadding='5' style='border-collapse: collapse; width: 100%;'>";
    echo "<tr><th>Time</th><th>Direction</th><th>Type</th><th>Content</th></tr>";
    foreach ($msgs as $m) {
        $time = date('H:i:s', $m['timestamp']);
        $dir = $m['direction'] === 'inbound' ? '⬇️ IN' : '⬆️ OUT';
        $content = mb_substr($m['content'] ?? '', 0, 50);
        echo "<tr><td>$time</td><td>$dir</td><td>{$m['message_type']}</td><td>$content</td></tr>";
    }
    echo "</table>";
}

// 5. Summary
echo "<hr><h2>📊 SUMMARY</h2>";
echo "<pre>";

$issues = [];
if ($sub['ai_paused_until'] && strtotime($sub['ai_paused_until']) > time()) {
    $issues[] = "AI is PAUSED (staff replied)";
}
if (!isset($scenario) || !$scenario) {
    $issues[] = "No AI scenario enabled";
}
if (isset($scenario) && $scenario['schedule_type'] === 'business_hours' && (!$inDays || !$inHours)) {
    $issues[] = "Outside business hours";
}

if (empty($issues)) {
    echo "<span class='ok'>✅ Everything looks good! AI should be working.</span>\n";
    echo "\nIf AI still not replying, check:\n";
    echo "1. Webhook logs: view_meta_debug.php\n";
    echo "2. AI chatbot status\n";
    echo "3. Network connectivity\n";
} else {
    echo "<span class='error'>❌ Found " . count($issues) . " issue(s):</span>\n\n";
    foreach ($issues as $i => $issue) {
        echo ($i + 1) . ". $issue\n";
    }
}
echo "</pre>";

echo "</body></html>";
