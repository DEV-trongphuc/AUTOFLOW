<?php
// api/debug_meta_ai_v2.php
require_once 'db_connect.php';

header('Content-Type: text/html; charset=utf-8');
echo "<html><head><style>
    body { font-family: sans-serif; line-height: 1.5; padding: 20px; background: #f4f7f6; }
    .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
    h2 { margin-top: 0; color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    pre { background: #272822; color: #f8f8f2; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 13px; }
    .status-ok { color: #27ae60; font-weight: bold; }
    .status-warning { color: #f39c12; font-weight: bold; }
    .status-error { color: #e74c3c; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f9f9f9; }
</style></head><body>";

echo "<h1>🛠️ Meta AI Debugger v2.0</h1>";

$psid = $_GET['psid'] ?? null;

if ($psid) {
    echo "<div class='card'><h2>Diagnosing PSID: $psid</h2>";

    // 1. Check Subscriber Status
    $stmtSub = $pdo->prepare("SELECT s.*, c.page_name 
                             FROM meta_subscribers s 
                             LEFT JOIN meta_app_configs c ON s.page_id = c.page_id
                             WHERE s.psid = ? LIMIT 1");
    $stmtSub->execute([$psid]);
    $sub = $stmtSub->fetch(PDO::FETCH_ASSOC);

    if (!$sub) {
        echo "<p class='status-error'>❌ Subscriber not found in `meta_subscribers` table.</p>";
    } else {
        $pageId = $sub['page_id'];
        echo "<table>";
        echo "<tr><th>Name</th><td>{$sub['name']}</td></tr>";
        echo "<tr><th>Page</th><td>{$sub['page_name']} ({$sub['page_id']})</td></tr>";

        $paused = false;
        if ($sub['ai_paused_until'] && strtotime($sub['ai_paused_until']) > time()) {
            $paused = true;
            echo "<tr><th>AI Status</th><td class='status-warning'>⏸️ PAUSED until {$sub['ai_paused_until']}</td></tr>";
        } else {
            echo "<tr><th>AI Status</th><td class='status-ok'>▶️ ACTIVE (Not paused)</td></tr>";
        }
        echo "</table>";

        // 2. Check Human Takeover (Logic from meta_webhook.php)
        echo "<h3>🧠 AI Logic Checks</h3><ul>";

        // 2a. Staff Reply
        $stmtStaff = $pdo->prepare("
            SELECT sa.created_at FROM subscriber_activity sa
            JOIN subscribers s ON sa.subscriber_id = s.id
            WHERE s.meta_psid = ? AND sa.type = 'staff_reply' 
            AND sa.created_at >= DATE_SUB(NOW(), INTERVAL 2 MINUTE)
            LIMIT 1
        ");
        $stmtStaff->execute([$psid]);
        $staffReply = $stmtStaff->fetchColumn();
        if ($staffReply) {
            echo "<li class='status-warning'>⚠️ Staff recently replied at $staffReply (2m cooldown block active).</li>";
        } else {
            echo "<li class='status-ok'>✅ No recent staff reply (last 2m).</li>";
        }

        // 2b. Flow Activity
        $stmtFlow = $pdo->prepare("
            SELECT 1 FROM subscriber_flow_states sfs
            JOIN subscribers s ON sfs.subscriber_id = s.id
            WHERE s.meta_psid = ? AND sfs.status IN ('waiting', 'processing')
            LIMIT 1
        ");
        $stmtFlow->execute([$psid]);
        if ($stmtFlow->fetch()) {
            echo "<li class='status-warning'>⚠️ Subscriber is active in an automation Flow (AI is suppressed).</li>";
        } else {
            echo "<li class='status-ok'>✅ Not active in any Flow.</li>";
        }

        // 2c. AI Conversation Status
        $metaVid = "meta_" . $psid;
        $stmtStatus = $pdo->prepare("SELECT status FROM ai_conversations WHERE visitor_id = ? LIMIT 1");
        $stmtStatus->execute([$metaVid]);
        $convStatus = $stmtStatus->fetchColumn();
        if ($convStatus === 'human') {
            echo "<li class='status-warning'>⚠️ Conversation status is set to 'human' in Unified Chat.</li>";
        } else {
            echo "<li class='status-ok'>✅ Conversation status: " . ($convStatus ?: 'new/ai') . "</li>";
        }
        echo "</ul>";

        // 3. Scenario Check
        echo "<h3>📅 Scenario & Schedule Check</h3>";
        $stmtS = $pdo->prepare("SELECT * FROM meta_automation_scenarios WHERE meta_config_id = (SELECT id FROM meta_app_configs WHERE page_id = ? LIMIT 1) AND status = 'active' AND type = 'ai_reply' LIMIT 1");
        $stmtS->execute([$pageId]);
        $scenario = $stmtS->fetch(PDO::FETCH_ASSOC);

        if (!$scenario) {
            echo "<p class='status-error'>❌ No active 'ai_reply' scenario found for this page!</p>";
        } else {
            echo "<ul>";
            echo "<li>Scenario ID: {$scenario['id']}</li>";
            echo "<li>Chatbot ID: " . ($scenario['ai_chatbot_id'] ?: "<span class='status-error'>MISSING</span>") . "</li>";
            echo "<li>Schedule Type: {$scenario['schedule_type']}</li>";

            // Basic schedule check logic
            $nowTime = date('H:i:s');
            $nowDay = date('w');
            $active = true;
            if ($scenario['schedule_type'] === 'business_hours') {
                $days = explode(',', $scenario['active_days'] ?? '');
                if (!in_array($nowDay, $days))
                    $active = false;
                if ($nowTime < $scenario['start_time'] || $nowTime > $scenario['end_time'])
                    $active = false;
            }

            if ($active) {
                echo "<li class='status-ok'>✅ Currently within active hours ($nowTime).</li>";
            } else {
                echo "<li class='status-warning'>⚠️ Currently OUT of scheduled hours/days.</li>";
            }
            echo "</ul>";

            // Chatbot Config
            if ($scenario['ai_chatbot_id']) {
                $stmtBot = $pdo->prepare("SELECT s.gemini_api_key, c.gemini_api_key as cat_key FROM ai_chatbot_settings s 
                                         LEFT JOIN ai_chatbots b ON s.property_id = b.id 
                                         LEFT JOIN ai_chatbot_settings c ON b.category_id = c.property_id 
                                         WHERE s.property_id = ?");
                $stmtBot->execute([$scenario['ai_chatbot_id']]);
                $bot = $stmtBot->fetch(PDO::FETCH_ASSOC);
                $hasKey = (!empty($bot['gemini_api_key']) || !empty($bot['cat_key']) || getenv('GEMINI_API_KEY'));
                if ($hasKey) {
                    echo "<p class='status-ok'>✅ AI Chatbot is configured with an API Key.</p>";
                } else {
                    echo "<p class='status-error'>❌ AI Chatbot has NO API Key configured (Property/Category/Global).</p>";
                }
            }
        }

        // 4. Message Logs
        echo "<h3>💬 Recent Messages</h3>";
        $stmtLogs = $pdo->prepare("SELECT direction, message_type, content, status, created_at FROM meta_message_logs WHERE psid = ? ORDER BY created_at DESC LIMIT 10");
        $stmtLogs->execute([$psid]);
        $logs = $stmtLogs->fetchAll(PDO::FETCH_ASSOC);

        if (empty($logs)) {
            echo "<p>No messages found in logs.</p>";
        } else {
            echo "<table><tr><th>Time</th><th>Dir</th><th>Type</th><th>Content</th><th>Status</th></tr>";
            foreach ($logs as $l) {
                $dirStyle = $l['direction'] === 'inbound' ? 'style="background:#e3f2fd"' : 'style="background:#f1f8e9"';
                echo "<tr $dirStyle>";
                echo "<td>{$l['created_at']}</td>";
                echo "<td>" . strtoupper($l['direction']) . "</td>";
                echo "<td>{$l['message_type']}</td>";
                echo "<td>" . htmlspecialchars(substr($l['content'], 0, 100)) . "</td>";
                echo "<td>{$l['status']}</td>";
                echo "</tr>";
            }
            echo "</table>";
        }
    }
    echo "</div>";

    // 5. Raw Webhook Logs Filter
    echo "<div class='card'><h2>🔍 Relevent Webhook Log Entries</h2>";
    $logFile = __DIR__ . '/meta_webhook_prod.log';
    if (file_exists($logFile)) {
        $cmd = "grep -C 5 \"$psid\" " . escapeshellarg($logFile) . " | tail -n 50";
        $output = shell_exec($cmd);
        if ($output) {
            echo "<pre>" . htmlspecialchars($output) . "</pre>";
        } else {
            echo "<p>No matching entries in `meta_webhook_prod.log` for this PSID.</p>";
        }
    } else {
        echo "<p class='status-warning'>Log file `meta_webhook_prod.log` not found.</p>";
    }
    echo "</div>";

} else {
    // Overview Mode
    echo "<div class='card'><h2>📊 AI Scenario Overview</h2>";
    $stmt = $pdo->query("SELECT s.*, c.page_name, c.page_id as conf_page_id FROM meta_automation_scenarios s JOIN meta_app_configs c ON s.meta_config_id = c.id WHERE s.type = 'ai_reply' AND s.status = 'active'");
    $scenarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($scenarios)) {
        echo "<p class='status-error'>❌ No active AI scenarios found in the entire system.</p>";
    } else {
        echo "<table><tr><th>Page</th><th>Bot ID</th><th>Schedule</th><th>Days</th></tr>";
        foreach ($scenarios as $s) {
            echo "<tr>";
            echo "<td>{$s['page_name']}<br><small>{$s['conf_page_id']}</small></td>";
            echo "<td>{$s['ai_chatbot_id']}</td>";
            echo "<td>{$s['schedule_type']}<br><small>{$s['start_time']} - {$s['end_time']}</small></td>";
            echo "<td>{$s['active_days']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    echo "</div>";

    echo "<div class='card'><h2> 최근 Paused Subscribers (AI Silenced)</h2>";
    $stmtP = $pdo->query("SELECT psid, page_id, name, ai_paused_until FROM meta_subscribers WHERE ai_paused_until > NOW() ORDER BY ai_paused_until DESC LIMIT 20");
    $paused = $stmtP->fetchAll(PDO::FETCH_ASSOC);
    if (empty($paused)) {
        echo "<p class='status-ok'>✅ No subscribers currently paused.</p>";
    } else {
        echo "<table><tr><th>PSID</th><th>Name</th><th>Paused Until</th><th>Action</th></tr>";
        foreach ($paused as $p) {
            echo "<tr>";
            echo "<td>{$p['psid']}</td>";
            echo "<td>{$p['name']}</td>";
            echo "<td>{$p['ai_paused_until']}</td>";
            echo "<td><a href='?psid={$p['psid']}'>Debug</a></td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    echo "</div>";

    echo "<div class='card'><h2>📜 Latest 50 Log Lines</h2>";
    $logFile = __DIR__ . '/meta_webhook_prod.log';
    if (file_exists($logFile)) {
        $output = shell_exec("tail -n 50 " . escapeshellarg($logFile));
        echo "<pre>" . htmlspecialchars($output) . "</pre>";
    } else {
        echo "<p>Log file not found.</p>";
    }
    echo "</div>";
}

echo "</body></html>";
