<?php
/**
 * debug_reply_check.php — Diagnostic: Tại sao Meta/Zalo không tự reply?
 * Xem 2 tin nhắn gần nhất + trạng thái kịch bản + lý do bỏ qua
 * Truy cập: /mail_api/debug_reply_check.php
 */
require_once 'db_connect.php';
header('Content-Type: text/html; charset=utf-8');

$now     = date('Y-m-d H:i:s');
$nowTime = date('H:i:s');
$nowDay  = date('w'); // 0=Sun .. 6=Sat
$dayNames = ['CN','T2','T3','T4','T5','T6','T7'];

function isScenarioActiveLocal($s, $nowTime, $nowDay) {
    if (($s['schedule_type'] ?? 'full') === 'full') return [true, 'Luôn bật (full)'];
    if (isset($s['active_days']) && strpos($s['active_days'], '{') === 0) {
        $custom = json_decode($s['active_days'], true);
        if (isset($custom[$nowDay])) {
            $start = $custom[$nowDay]['start'] ?? '00:00';
            $end   = $custom[$nowDay]['end']   ?? '23:59';
            $ok = ($start > $end)
                ? ($nowTime >= $start || $nowTime <= $end)
                : ($nowTime >= $start && $nowTime <= $end);
            return [$ok, "Custom: {$nowDay} → {$start}–{$end}"];
        }
        return [false, "Custom: ngày $nowDay không có lịch"];
    }
    $days = explode(',', $s['active_days'] ?? '0,1,2,3,4,5,6');
    if (!in_array((string)$nowDay, $days))
        return [false, "Ngày $nowDay không trong active_days: " . $s['active_days']];
    $s2 = $s['start_time'] ?? '00:00:00';
    $e2 = $s['end_time']   ?? '23:59:59';
    $ok = ($s2 > $e2)
        ? ($nowTime >= $s2 || $nowTime <= $e2)
        : ($nowTime >= $s2 && $nowTime <= $e2);
    return [$ok, "Giờ: $s2 → $e2, now=$nowTime"];
}

echo "<!DOCTYPE html><html><head><meta charset='utf-8'>
<style>
body{font-family:monospace;background:#0f172a;color:#e2e8f0;padding:20px;font-size:13px}
h2{color:#f59e0b;margin-top:24px;border-bottom:1px solid #334155;padding-bottom:6px}
h3{color:#94a3b8;margin:12px 0 4px}
.box{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:14px;margin:8px 0}
.ok{color:#34d399}.bad{color:#f87171}.warn{color:#fbbf24}
.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;margin:2px}
.tag-ok{background:#064e3b;color:#34d399}
.tag-bad{background:#450a0a;color:#f87171}
.tag-warn{background:#451a03;color:#fbbf24}
table{border-collapse:collapse;width:100%;margin-top:8px}
td,th{border:1px solid #334155;padding:6px 10px;text-align:left}
th{background:#1e3a5f;color:#93c5fd}
tr:nth-child(even){background:#1a2a3a}
</style></head><body>";

echo "<h2>🔍 Debug Reply Check — $now (Thứ: {$dayNames[$nowDay]}, Giờ: $nowTime)</h2>";

// ═══════════════════════════════════════════════════════════
// PHẦN 1: META MESSENGER
// ═══════════════════════════════════════════════════════════
echo "<h2>📘 META MESSENGER</h2>";

// 1a. 2 tin nhắn inbound gần nhất
try {
    $stmt = $pdo->prepare("
        SELECT m.mid, m.psid, m.page_id, m.content, m.created_at,
               ms.ai_paused_until, ms.name as sub_name
        FROM meta_message_logs m
        LEFT JOIN meta_subscribers ms ON ms.page_id = m.page_id AND ms.psid = m.psid
        WHERE m.direction = 'inbound'
        ORDER BY m.created_at DESC LIMIT 2
    ");
    $stmt->execute();
    $metaMsgs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<h3>📩 2 tin nhắn inbound gần nhất</h3>";
    foreach ($metaMsgs as $m) {
        $paused = $m['ai_paused_until'] && strtotime($m['ai_paused_until']) > time();
        echo "<div class='box'>";
        echo "<b>PSID:</b> {$m['psid']} ({$m['sub_name']}) | <b>Page:</b> {$m['page_id']}<br>";
        echo "<b>Tin:</b> " . htmlspecialchars(substr($m['content'], 0, 200)) . "<br>";
        echo "<b>Thời gian:</b> {$m['created_at']}<br>";
        
        // Check pause
        if ($paused) {
            echo "<span class='tag tag-bad'>AI PAUSED đến {$m['ai_paused_until']}</span>";
        } else {
            echo "<span class='tag tag-ok'>Không bị pause</span>";
        }

        // Check AI conversation status
        try {
            $scProp = $pdo->prepare("SELECT ai_chatbot_id FROM meta_automation_scenarios WHERE meta_config_id = (SELECT id FROM meta_app_configs WHERE page_id = ? LIMIT 1) AND type = 'ai_reply' AND ai_chatbot_id IS NOT NULL LIMIT 1");
            $scProp->execute([$m['page_id']]);
            $aiPropId = $scProp->fetchColumn();
            if ($aiPropId) {
                $vid = "meta_" . $m['psid'];
                $cstmt = $pdo->prepare("SELECT status FROM ai_conversations WHERE visitor_id = ? AND property_id = ? LIMIT 1");
                $cstmt->execute([$vid, $aiPropId]);
                $convStatus = $cstmt->fetchColumn();
                if ($convStatus === 'human') {
                    echo "<span class='tag tag-bad'>Conversation = HUMAN (AI tắt)</span>";
                } else {
                    echo "<span class='tag tag-ok'>Conv status: " . ($convStatus ?: 'chưa có') . "</span>";
                }
            }
        } catch(Exception $e) {}

        // Check staff_reply cooldown
        try {
            $cs = $pdo->prepare("SELECT 1 FROM subscriber_activity sa JOIN subscribers s ON sa.subscriber_id = s.id WHERE s.meta_psid = ? AND sa.type = 'staff_reply' AND sa.created_at >= DATE_SUB(NOW(), INTERVAL 2 MINUTE) LIMIT 1");
            $cs->execute([$m['psid']]);
            if ($cs->fetch()) echo "<span class='tag tag-bad'>Staff reply 2min cooldown đang active</span>";
        } catch(Exception $e) {}

        // Check active flow
        try {
            $cf = $pdo->prepare("SELECT 1 FROM subscriber_flow_states sfs JOIN subscribers s ON sfs.subscriber_id = s.id WHERE s.meta_psid = ? AND sfs.status IN ('waiting','processing') LIMIT 1");
            $cf->execute([$m['psid']]);
            if ($cf->fetch()) echo "<span class='tag tag-warn'>Đang trong Flow (AI im lặng)</span>";
        } catch(Exception $e) {}

        echo "</div>";
    }
} catch(Exception $e) {
    echo "<div class='bad'>Lỗi query meta_message_logs: " . $e->getMessage() . "</div>";
}

// 1b. Scenarios của từng page
try {
    $stmtPages = $pdo->prepare("SELECT id, page_id, page_name FROM meta_app_configs WHERE status='active'");
    $stmtPages->execute();
    $pages = $stmtPages->fetchAll(PDO::FETCH_ASSOC);

    echo "<h3>⚙️ Automation Scenarios (Meta)</h3>";
    foreach ($pages as $page) {
        echo "<b>Page: {$page['page_name']} ({$page['page_id']})</b>";
        $stmtSc = $pdo->prepare("SELECT id, type, title, status, schedule_type, active_days, start_time, end_time, ai_chatbot_id FROM meta_automation_scenarios WHERE meta_config_id = ? ORDER BY type, created_at DESC");
        $stmtSc->execute([$page['id']]);
        $scs = $stmtSc->fetchAll(PDO::FETCH_ASSOC);
        if (!$scs) { echo " <span class='bad'>→ Không có scenario nào!</span><br>"; continue; }
        echo "<table><tr><th>Type</th><th>Title</th><th>Status DB</th><th>Schedule</th><th>Active Now?</th><th>AI Bot</th></tr>";
        foreach ($scs as $s) {
            [$active, $reason] = isScenarioActiveLocal($s, $nowTime, $nowDay);
            $cls = ($s['status'] === 'active' && $active) ? 'ok' : 'bad';
            echo "<tr>";
            echo "<td>{$s['type']}</td>";
            echo "<td>" . htmlspecialchars($s['title'] ?? '—') . "</td>";
            echo "<td class='" . ($s['status']==='active'?'ok':'bad') . "'>{$s['status']}</td>";
            echo "<td>{$s['schedule_type']}</td>";
            echo "<td class='$cls'>" . ($active?'✅ YES':'❌ NO') . " <small>$reason</small></td>";
            echo "<td>" . ($s['ai_chatbot_id'] ? '✅ '.$s['ai_chatbot_id'] : '—') . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
} catch(Exception $e) {
    echo "<div class='bad'>Lỗi scenario: " . $e->getMessage() . "</div>";
}

// ═══════════════════════════════════════════════════════════
// PHẦN 2: ZALO OA
// ═══════════════════════════════════════════════════════════
echo "<h2>💬 ZALO OA</h2>";

// 2a. 2 tin nhắn inbound Zalo gần nhất
try {
    // Detect correct column name for OA ref in zalo_subscribers
    $oaColCheck = $pdo->query("SHOW COLUMNS FROM zalo_subscribers LIKE '%oa%'")->fetchAll(PDO::FETCH_COLUMN);
    $oaCol = !empty($oaColCheck) ? $oaColCheck[0] : null;

    $stmt = $pdo->prepare("
        SELECT m.id, m.zalo_user_id, m.message_text, m.created_at, m.direction,
               zs.id as sub_id, zs.display_name, zs.ai_paused_until
        FROM zalo_user_messages m
        LEFT JOIN zalo_subscribers zs ON zs.zalo_user_id = m.zalo_user_id
        WHERE m.direction = 'inbound'
        ORDER BY m.created_at DESC LIMIT 2
    ");
    $stmt->execute();
    $zaloMsgs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<h3>📩 2 tin nhắn inbound Zalo gần nhất</h3>";
    foreach ($zaloMsgs as $m) {
        $paused = $m['ai_paused_until'] && strtotime($m['ai_paused_until']) > time();
        echo "<div class='box'>";
        echo "<b>Zalo UID:</b> {$m['zalo_user_id']} ({$m['display_name']}) | <b>OA Config:</b> {$m['oa_config_id']}<br>";
        echo "<b>Tin:</b> " . htmlspecialchars(substr($m['message_text'], 0, 200)) . "<br>";
        echo "<b>Thời gian:</b> {$m['created_at']}<br>";

        if ($paused) {
            echo "<span class='tag tag-bad'>AI PAUSED đến {$m['ai_paused_until']}</span>";
        } else {
            echo "<span class='tag tag-ok'>Không bị pause</span>";
        }

        // Check staff cooldown
        if ($m['sub_id']) {
            try {
                $cs = $pdo->prepare("SELECT id FROM zalo_subscriber_activity WHERE subscriber_id = ? AND type = 'staff_reply' AND created_at >= DATE_SUB(NOW(), INTERVAL 2 MINUTE) LIMIT 1");
                $cs->execute([$m['sub_id']]);
                if ($cs->fetch()) echo "<span class='tag tag-bad'>Staff 2min cooldown active</span>";
            } catch(Exception $e) {}
        }

        // Check human conv status
        try {
            $zv = "zalo_" . $m['zalo_user_id'];
            $ch = $pdo->prepare("SELECT status FROM ai_conversations WHERE visitor_id = ? AND status = 'human' LIMIT 1");
            $ch->execute([$zv]);
            if ($ch->fetchColumn() === 'human') echo "<span class='tag tag-bad'>Conversation = HUMAN</span>";
        } catch(Exception $e) {}

        echo "</div>";
    }
} catch(Exception $e) {
    echo "<div class='bad'>Lỗi query zalo_user_messages: " . $e->getMessage() . "</div>";
}

// 2b. Zalo scenarios
try {
    $stmtOas = $pdo->prepare("SELECT id, name FROM zalo_oa_configs WHERE status='active' OR status IS NULL LIMIT 5");
    $stmtOas->execute();
    $oas = $stmtOas->fetchAll(PDO::FETCH_ASSOC);

    echo "<h3>⚙️ Automation Scenarios (Zalo)</h3>";
    foreach ($oas as $oa) {
        echo "<b>OA: {$oa['name']} (ID: {$oa['id']})</b>";
        $stmtSc = $pdo->prepare("SELECT id, type, title, status, schedule_type, active_days, start_time, end_time, ai_chatbot_id, trigger_text FROM zalo_automation_scenarios WHERE oa_config_id = ? ORDER BY type, created_at DESC");
        $stmtSc->execute([$oa['id']]);
        $scs = $stmtSc->fetchAll(PDO::FETCH_ASSOC);
        if (!$scs) { echo " <span class='bad'>→ Không có scenario nào!</span><br>"; continue; }
        echo "<table><tr><th>Type</th><th>Title</th><th>Status DB</th><th>Schedule</th><th>Active Now?</th><th>AI Bot</th><th>Trigger</th></tr>";
        foreach ($scs as $s) {
            [$active, $reason] = isScenarioActiveLocal($s, $nowTime, $nowDay);
            $cls = ($s['status'] === 'active' && $active) ? 'ok' : 'bad';
            echo "<tr>";
            echo "<td>{$s['type']}</td>";
            echo "<td>" . htmlspecialchars($s['title'] ?? '—') . "</td>";
            echo "<td class='" . ($s['status']==='active'?'ok':'bad') . "'>{$s['status']}</td>";
            echo "<td>{$s['schedule_type']}</td>";
            echo "<td class='$cls'>" . ($active?'✅ YES':'❌ NO') . " <small>$reason</small></td>";
            echo "<td>" . ($s['ai_chatbot_id'] ? '✅ '.$s['ai_chatbot_id'] : '—') . "</td>";
            echo "<td>" . htmlspecialchars($s['trigger_text'] ?? '(default)') . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
} catch(Exception $e) {
    echo "<div class='bad'>Lỗi scenario Zalo: " . $e->getMessage() . "</div>";
}

// ═══════════════════════════════════════════════════════════
// PHẦN 3: ZALO - DEEP CHECK
// ═══════════════════════════════════════════════════════════
echo "<h2>🔬 ZALO — Deep Diagnostic</h2>";

// Check 1: oa_id (từ Zalo webhook) vs oa_config_id (trong scenarios)
try {
    echo "<h3>📌 OA Config ID matching check</h3>";
    $stmtOaMap = $pdo->query("SELECT id, oa_id, name FROM zalo_oa_configs LIMIT 5");
    $oaMaps = $stmtOaMap->fetchAll(PDO::FETCH_ASSOC);
    echo "<table><tr><th>DB id (dùng cho scenarios)</th><th>oa_id (Zalo gửi webhook)</th><th>Name</th><th>Scenarios count</th></tr>";
    foreach ($oaMaps as $oa) {
        $cnt = $pdo->prepare("SELECT COUNT(*) FROM zalo_automation_scenarios WHERE oa_config_id = ?");
        $cnt->execute([$oa['id']]);
        $count = $cnt->fetchColumn();
        $cls = $count > 0 ? 'ok' : 'bad';
        echo "<tr><td><b>{$oa['id']}</b></td><td>{$oa['oa_id']}</td><td>{$oa['name']}</td><td class='$cls'>$count scenarios</td></tr>";
    }
    echo "</table><br><small class='warn'>⚠️ webhook.php lookup: <code>WHERE oa_id = \$zaloOaId</code> → lấy <code>id</code> → dùng làm <code>oa_config_id</code>. Nếu <code>oa_id</code> sai → không match scenario nào!</small>";
} catch(Exception $e) {
    echo "<div class='bad'>Lỗi OA map: " . $e->getMessage() . "</div>";
}

// Check 2: zalo_message_queue còn tồn đọng không
try {
    echo "<h3>🗄️ zalo_message_queue (tin chưa xử lý)</h3>";
    $stmtQ = $pdo->query("SELECT COUNT(*) as total, SUM(processed=0) as pending, MAX(created_at) as latest FROM zalo_message_queue");
    $q = $stmtQ->fetch(PDO::FETCH_ASSOC);
    $cls = $q['pending'] > 0 ? 'warn' : 'ok';
    echo "<div class='box'><span class='$cls'>Pending: {$q['pending']} / Total: {$q['total']} | Mới nhất: {$q['latest']}</span></div>";
} catch(Exception $e) {
    echo "<div class='bad'>Lỗi message_queue: " . $e->getMessage() . "</div>";
}

// Check 3: zalo_debug.log tail
echo "<h3>📄 zalo_debug.log (30 dòng cuối)</h3><div class='box' style='font-size:11px;max-height:300px;overflow-y:auto'>";
$zaloLog = __DIR__ . '/zalo_debug.log';
if (file_exists($zaloLog)) {
    $lines = file($zaloLog);
    $tail = array_slice($lines, -30);
    foreach ($tail as $line) {
        $color = (strpos($line,'ERROR') !== false || strpos($line,'PAUSED') !== false) ? '#f87171'
               : (strpos($line,'Human') !== false ? '#fbbf24' : '#94a3b8');
        echo "<div style='color:$color'>" . htmlspecialchars(rtrim($line)) . "</div>";
    }
} else {
    echo "<span class='bad'>File không tồn tại: $zaloLog</span>";
}
echo "</div>";

// Check 4: Meta webhook - tin nhắn TRONG ngày hôm nay
echo "<h2>📘 META — Tin nhắn hôm nay</h2>";
try {
    $stmtToday = $pdo->prepare("SELECT psid, direction, content, created_at FROM meta_message_logs WHERE DATE(created_at) = CURDATE() ORDER BY created_at DESC LIMIT 10");
    $stmtToday->execute();
    $todayMsgs = $stmtToday->fetchAll(PDO::FETCH_ASSOC);
    if (!$todayMsgs) {
        echo "<div class='box bad'>❌ Không có tin nào trong DB hôm nay → Webhook Meta KHÔNG nhận được hoặc không ghi vào DB!</div>";
    } else {
        echo "<table><tr><th>PSID</th><th>Direction</th><th>Content</th><th>Time</th></tr>";
        foreach ($todayMsgs as $t) {
            $dir = $t['direction'] === 'inbound' ? '<span class="ok">inbound</span>' : '<span class="warn">outbound</span>';
            echo "<tr><td>{$t['psid']}</td><td>$dir</td><td>" . htmlspecialchars(substr($t['content'],0,80)) . "</td><td>{$t['created_at']}</td></tr>";
        }
        echo "</table>";
    }
} catch(Exception $e) {
    echo "<div class='bad'>Lỗi: " . $e->getMessage() . "</div>";
}

// Check 5: Meta webhook prod log tail
echo "<h3>📄 meta_webhook_prod.log (20 dòng cuối)</h3><div class='box' style='font-size:11px;max-height:250px;overflow-y:auto'>";
$metaLog = __DIR__ . '/meta_webhook_prod.log';
if (file_exists($metaLog)) {
    $lines = file($metaLog);
    $tail = array_slice($lines, -20);
    foreach ($tail as $line) {
        $color = (strpos($line,'ERROR') !== false || strpos($line,'MISMATCH') !== false) ? '#f87171'
               : (strpos($line,'Paused') !== false || strpos($line,'Silence') !== false ? '#fbbf24' : '#64748b');
        echo "<div style='color:$color'>" . htmlspecialchars(rtrim($line)) . "</div>";
    }
} else {
    echo "<span class='bad'>File không tồn tại</span>";
}
echo "</div>";

// ═══════════════════════════════════════════════════════════
// PHẦN 4: TỔNG KẾT
// ═══════════════════════════════════════════════════════════
echo "<h2>📋 Kết luận nhanh</h2><div class='box'>";
echo "<b>Các nguyên nhân phổ biến khiến không reply:</b><ul>
<li class='bad'>❌ Scenario <code>schedule_type = custom</code> nhưng ngày/giờ hiện tại không trong lịch</li>
<li class='bad'>❌ <code>ai_paused_until</code> đang còn hiệu lực (30 phút sau staff reply)</li>
<li class='bad'>❌ Conversation status = <code>human</code> (tư vấn viên takeover)</li>
<li class='warn'>⚠️ Subscriber đang active trong Flow → AI im lặng</li>
<li class='warn'>⚠️ Staff reply 2 phút gần đây → cooldown</li>
<li class='bad'>❌ Scenario status = <code>inactive</code> trong DB</li>
<li class='bad'>❌ AI chatbot ID = NULL trong scenario</li>
<li class='bad'>❌ Meta: Tin nhắn không vào DB → webhook Meta không active hoặc signature fail</li>
<li class='bad'>❌ Zalo: <code>oa_id</code> trong webhook không match <code>oa_configs.oa_id</code> → scenarios không tìm được</li>
</ul></div>";

echo "</body></html>";

