<?php
/**
 * debug_fix_secrets.php
 * Hiển thị app_secret Meta và oa_id Zalo để verify + fix nhanh
 */
require_once 'db_connect.php';
header('Content-Type: text/html; charset=utf-8');

$action = $_POST['action'] ?? '';
$msg = '';

// ── ACTION: Update Meta app_secret ─────────────────────────
if ($action === 'update_meta_secret') {
    $pageId    = $_POST['page_id'] ?? '';
    $newSecret = trim($_POST['app_secret'] ?? '');
    if ($pageId && $newSecret) {
        $pdo->prepare("UPDATE meta_app_configs SET app_secret = ? WHERE page_id = ?")->execute([$newSecret, $pageId]);
        $msg = "<div style='color:#34d399;padding:10px;background:#064e3b;border-radius:6px;margin:10px 0'>✅ Đã cập nhật app_secret cho Page $pageId</div>";
    }
}

// ── ACTION: Update Zalo oa_id ─────────────────────────────
if ($action === 'update_zalo_oaid') {
    $dbId  = $_POST['db_id'] ?? '';
    $oaId  = trim($_POST['oa_id'] ?? '');
    if ($dbId && $oaId) {
        $pdo->prepare("UPDATE zalo_oa_configs SET oa_id = ? WHERE id = ?")->execute([$oaId, $dbId]);
        $msg = "<div style='color:#34d399;padding:10px;background:#064e3b;border-radius:6px;margin:10px 0'>✅ Đã cập nhật oa_id cho OA config $dbId</div>";
    }
}

echo "<!DOCTYPE html><html><head><meta charset='utf-8'>
<style>
body{font-family:monospace;background:#0f172a;color:#e2e8f0;padding:20px;font-size:13px}
h2{color:#f59e0b;margin-top:20px;border-bottom:1px solid #334155;padding-bottom:6px}
.box{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:14px;margin:10px 0}
.bad{color:#f87171}.ok{color:#34d399}.warn{color:#fbbf24}
input[type=text]{background:#0f172a;border:1px solid #475569;color:#e2e8f0;padding:6px 10px;border-radius:4px;width:400px;font-family:monospace;font-size:12px}
button{background:#3b82f6;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;margin-top:8px}
button:hover{background:#2563eb}
table{border-collapse:collapse;width:100%;margin:8px 0}
td,th{border:1px solid #334155;padding:6px 10px}
th{background:#1e3a5f;color:#93c5fd}
.secret{color:#94a3b8;font-size:11px;letter-spacing:1px}
</style></head><body>";

echo "<h2>🔧 Fix Secrets — " . date('Y-m-d H:i:s') . "</h2>";
echo $msg;

// ══════════════════════════════════════════════════
// PHẦN 1: META app_secret
// ══════════════════════════════════════════════════
echo "<h2>📘 META — App Secret (X-Hub-Signature-256)</h2>";
echo "<div class='box bad'>
⚠️ <b>Vấn đề:</b> <code>X-Hub-Signature-256 MISMATCH</code> → app_secret trong DB sai/cũ.<br>
📋 <b>Lấy đúng secret:</b> <a href='https://developers.facebook.com/apps/' target='_blank' style='color:#60a5fa'>developers.facebook.com/apps</a> → Chọn App → <b>App Settings → Basic → App Secret</b>
</div>";

try {
    $stmtP = $pdo->query("SELECT id, page_id, page_name, app_id, app_secret, status FROM meta_app_configs ORDER BY created_at DESC");
    $configs = $stmtP->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<table><tr><th>Page Name</th><th>Page ID</th><th>App ID</th><th>App Secret (masked)</th><th>Status</th><th>Fix</th></tr>";
    foreach ($configs as $c) {
        $maskedSecret = $c['app_secret']
            ? substr($c['app_secret'], 0, 4) . str_repeat('*', max(0, strlen($c['app_secret']) - 8)) . substr($c['app_secret'], -4)
            : '<span class="bad">TRỐNG!</span>';
        echo "<tr>
            <td><b>{$c['page_name']}</b></td>
            <td>{$c['page_id']}</td>
            <td><span class='secret'>{$c['app_id']}</span></td>
            <td><span class='secret'>$maskedSecret</span></td>
            <td class='" . ($c['status']==='active'?'ok':'warn') . "'>{$c['status']}</td>
            <td>
                <form method='POST'>
                <input type='hidden' name='action' value='update_meta_secret'>
                <input type='hidden' name='page_id' value='{$c['page_id']}'>
                <input type='text' name='app_secret' placeholder='Paste App Secret mới vào đây'>
                <button type='submit'>💾 Cập nhật</button>
                </form>
            </td>
        </tr>";
    }
    echo "</table>";
} catch(Exception $e) {
    echo "<div class='bad'>Lỗi: " . $e->getMessage() . "</div>";
}

// ══════════════════════════════════════════════════
// PHẦN 2: ZALO oa_id
// ══════════════════════════════════════════════════
echo "<h2>💬 ZALO — OA ID Matching</h2>";

$webhookOaId = '3857867121882640296'; // từ log vừa rồi
echo "<div class='box warn'>
📋 <b>OA ID từ webhook gần nhất:</b> <code>$webhookOaId</code> (recipient.id trong JSON)<br>
webhook.php lookup: <code>SELECT * FROM zalo_oa_configs WHERE oa_id = '$webhookOaId'</code>
</div>";

try {
    $stmtZ = $pdo->query("SELECT id, oa_id, name, status FROM zalo_oa_configs LIMIT 10");
    $oas = $stmtZ->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<table><tr><th>DB id</th><th>oa_id (trong DB)</th><th>Name</th><th>Match webhook?</th><th>Fix oa_id</th></tr>";
    foreach ($oas as $oa) {
        $match = $oa['oa_id'] === $webhookOaId;
        echo "<tr>
            <td><span class='secret'>" . substr($oa['id'], 0, 8) . "...</span></td>
            <td><b>{$oa['oa_id']}</b></td>
            <td>{$oa['name']}</td>
            <td class='" . ($match?'ok':'bad') . "'>" . ($match ? '✅ MATCH' : '❌ KHÔNG KHỚP') . "</td>
            <td>
                <form method='POST'>
                <input type='hidden' name='action' value='update_zalo_oaid'>
                <input type='hidden' name='db_id' value='{$oa['id']}'>
                <input type='text' name='oa_id' value='{$oa['oa_id']}' placeholder='OA ID đúng'>
                <button type='submit'>💾 Fix</button>
                </form>
            </td>
        </tr>";
    }
    echo "</table>";
    
    // Direct lookup
    $stmtDirect = $pdo->prepare("SELECT id, name FROM zalo_oa_configs WHERE oa_id = ?");
    $stmtDirect->execute([$webhookOaId]);
    $found = $stmtDirect->fetch();
    if ($found) {
        echo "<div class='box ok'>✅ Tìm thấy OA config cho ID <code>$webhookOaId</code>: <b>{$found['name']}</b></div>";
        
        // Check scenarios for this OA
        $stmtSc = $pdo->prepare("SELECT COUNT(*) FROM zalo_automation_scenarios WHERE oa_config_id = ? AND status = 'active'");
        $stmtSc->execute([$found['id']]);
        $scCount = $stmtSc->fetchColumn();
        if ($scCount > 0) {
            echo "<div class='box ok'>✅ Có <b>$scCount</b> scenario active cho OA này → Zalo đang đúng!</div>";
        } else {
            echo "<div class='box bad'>❌ Không có scenario active nào cho OA <code>{$found['id']}</code></div>";
        }
    } else {
        echo "<div class='box bad'>❌ KHÔNG tìm thấy zalo_oa_configs với oa_id = <code>$webhookOaId</code><br>
        → Webhook nhận tin nhưng không match OA → không xử lý được!<br>
        → Fix: Dùng nút \"Fix\" bên trên để update oa_id đúng vào OA config tương ứng.</div>";
    }
} catch(Exception $e) {
    echo "<div class='bad'>Lỗi: " . $e->getMessage() . "</div>";
}

// ══════════════════════════════════════════════════
// PHẦN 3: HƯỚNG DẪN FIX
// ══════════════════════════════════════════════════
echo "<h2>📋 Tóm tắt cần làm</h2><div class='box'>";
echo "<ol>
<li class='bad'>🔴 <b>META</b>: Vào <a href='https://developers.facebook.com/apps/' target='_blank' style='color:#60a5fa'>Meta Developer</a> → App Secret → paste vào form bên trên</li>
<li class='warn'>🟡 <b>ZALO</b>: Nếu oa_id không match → cập nhật oa_id đúng (lấy từ Zalo OA Manager hoặc từ webhook log)</li>
</ol>
<p style='color:#64748b;font-size:11px'>⚠️ Xóa file này sau khi fix xong để bảo mật!</p>
</div>";

echo "</body></html>";
