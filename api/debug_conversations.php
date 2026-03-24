<?php
require_once 'db_connect.php';
header('Content-Type: text/html; charset=utf-8');

// Handle migrate action
$migrateMsg = '';
if (isset($_POST['migrate']) && !empty($_POST['from_user']) && !empty($_POST['to_user'])) {
    $fromUser = $_POST['from_user'];
    $toUser = $_POST['to_user'];
    $stmt = $pdo->prepare("UPDATE ai_org_conversations SET user_id = ? WHERE user_id = ?");
    $stmt->execute([$toUser, $fromUser]);
    $affected = $stmt->rowCount();
    $migrateMsg = "✅ Đã migrate $affected conversations từ '$fromUser' → '$toUser'";
}
?>
<!DOCTYPE html>
<html>

<head>
    <title>Debug Conversations - User Org 2</title>
    <style>
        body {
            font-family: monospace;
            padding: 20px;
            background: #0f172a;
            color: #e2e8f0;
        }

        h2 {
            color: #f59e0b;
            border-bottom: 1px solid #334155;
            padding-bottom: 8px;
        }

        h3 {
            color: #38bdf8;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 12px;
        }

        th {
            background: #1e293b;
            color: #94a3b8;
            padding: 8px;
            text-align: left;
            border: 1px solid #334155;
        }

        td {
            padding: 6px 8px;
            border: 1px solid #1e293b;
            vertical-align: top;
        }

        tr:nth-child(even) {
            background: #0f172a;
        }

        tr:nth-child(odd) {
            background: #111827;
        }

        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: bold;
        }

        .badge-green {
            background: #065f46;
            color: #6ee7b7;
        }

        .badge-red {
            background: #7f1d1d;
            color: #fca5a5;
        }

        .badge-blue {
            background: #1e3a5f;
            color: #93c5fd;
        }

        .badge-yellow {
            background: #78350f;
            color: #fcd34d;
        }

        .section {
            background: #1e293b;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
        }

        .url {
            background: #0f172a;
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #334155;
            word-break: break-all;
            color: #34d399;
        }

        .label {
            color: #94a3b8;
            font-size: 11px;
        }

        pre {
            background: #0f172a;
            padding: 10px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 11px;
            color: #a5f3fc;
        }
    </style>
</head>

<body>

    <h2>🔍 Debug: Conversations của User Org ID = 2</h2>

    <?php
    $targetUserId = $_GET['user_id'] ?? 2;
    $targetOrgUserId = $_GET['org_user_id'] ?? null;

    // ===== SESSION INFO =====
    echo '<div class="section">';
    echo '<h3>📋 Session hiện tại</h3>';
    echo '<table>';
    echo '<tr><th>Key</th><th>Value</th></tr>';
    $sessionKeys = ['user_id', 'org_user_id', 'username', 'email', 'full_name'];
    foreach ($sessionKeys as $k) {
        $val = $_SESSION[$k] ?? '<span style="color:#ef4444">not_set</span>';
        echo "<tr><td>$k</td><td>$val</td></tr>";
    }
    echo '<tr><td>session_id()</td><td>' . session_id() . '</td></tr>';
    echo '<tr><td>GLOBALS[current_admin_id]</td><td>' . ($GLOBALS['current_admin_id'] ?? '<span style="color:#ef4444">null</span>') . '</td></tr>';
    echo '</table>';
    echo '</div>';

    // ===== USER ORG INFO =====
    echo '<div class="section">';
    echo '<h3>👤 Thông tin User Org ID = ' . htmlspecialchars($targetUserId) . '</h3>';
    $stmt = $pdo->prepare("SELECT id, email, full_name, role, status, created_at FROM ai_org_users WHERE id = ?");
    $stmt->execute([$targetUserId]);
    $orgUser = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($orgUser) {
        echo '<table><tr><th>Field</th><th>Value</th></tr>';
        foreach ($orgUser as $k => $v) {
            echo "<tr><td>$k</td><td>" . htmlspecialchars($v ?? '') . "</td></tr>";
        }
        echo '</table>';
    } else {
        echo '<p style="color:#ef4444">Không tìm thấy user ID=' . htmlspecialchars($targetUserId) . '</p>';
    }
    echo '</div>';

    // ===== CONVERSATIONS BY user_id =====
    echo '<div class="section">';
    echo '<h3>💬 Conversations WHERE user_id = ' . htmlspecialchars($targetUserId) . '</h3>';
    $stmt = $pdo->prepare("SELECT id, visitor_id, user_id, property_id, title, status, created_at, last_message 
    FROM ai_org_conversations 
    WHERE user_id = ? AND status != 'deleted'
    ORDER BY created_at DESC LIMIT 30");
    $stmt->execute([$targetUserId]);
    $convs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo '<p class="label">Tổng: <strong style="color:#f59e0b">' . count($convs) . '</strong> conversations</p>';
    if ($convs) {
        echo '<table>';
        echo '<tr><th>ID</th><th>user_id</th><th>visitor_id</th><th>property_id</th><th>title</th><th>status</th><th>created_at</th></tr>';
        foreach ($convs as $c) {
            echo '<tr>';
            echo '<td>' . $c['id'] . '</td>';
            echo '<td><span class="badge badge-blue">' . htmlspecialchars($c['user_id'] ?? '') . '</span></td>';
            echo '<td style="font-size:10px">' . htmlspecialchars(substr($c['visitor_id'] ?? '', 0, 20)) . '...</td>';
            echo '<td style="font-size:10px">' . htmlspecialchars($c['property_id'] ?? '') . '</td>';
            echo '<td>' . htmlspecialchars(substr($c['title'] ?? 'Untitled', 0, 40)) . '</td>';
            echo '<td><span class="badge badge-green">' . htmlspecialchars($c['status'] ?? '') . '</span></td>';
            echo '<td>' . $c['created_at'] . '</td>';
            echo '</tr>';
        }
        echo '</table>';
    } else {
        echo '<p style="color:#94a3b8">Không có conversations nào với user_id=' . htmlspecialchars($targetUserId) . '</p>';
    }
    echo '</div>';

    // ===== SIMULATE API CALL =====
    echo '<div class="section">';
    echo '<h3>🌐 Simulate API: list_conversations với org_user_id=2</h3>';

    $simUserId = $targetUserId;
    $simVisitorId = '';

    $where = ["status != 'deleted'"];
    $params = [];

    if ($simUserId) {
        if ($simUserId === 'admin-001') {
            $where[] = "(user_id = ? OR user_id = '1')";
        } else {
            $where[] = "user_id = ?";
        }
        $params[] = $simUserId;
    }

    $whereSql = "WHERE " . implode(" AND ", $where);
    $sql = "SELECT id, visitor_id, user_id, title, created_at, last_message, property_id 
    FROM ai_org_conversations $whereSql ORDER BY created_at DESC LIMIT 50";

    echo '<div class="label">SQL Query:</div>';
    echo '<pre>' . htmlspecialchars($sql) . "\nParams: " . json_encode($params) . '</pre>';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo '<p class="label">Kết quả: <strong style="color:#f59e0b">' . count($results) . '</strong> conversations</p>';
    if ($results) {
        echo '<table>';
        echo '<tr><th>ID</th><th>user_id</th><th>title</th><th>property_id</th><th>created_at</th></tr>';
        foreach ($results as $r) {
            echo '<tr>';
            echo '<td>' . $r['id'] . '</td>';
            echo '<td><span class="badge badge-blue">' . htmlspecialchars($r['user_id'] ?? '') . '</span></td>';
            echo '<td>' . htmlspecialchars(substr($r['title'] ?? 'Untitled', 0, 50)) . '</td>';
            echo '<td style="font-size:10px">' . htmlspecialchars($r['property_id'] ?? '') . '</td>';
            echo '<td>' . $r['created_at'] . '</td>';
            echo '</tr>';
        }
        echo '</table>';
    }
    echo '</div>';

    // ===== SIMULATE WITH admin-001 =====
    echo '<div class="section">';
    echo '<h3>⚠️ Simulate API: list_conversations với admin-001 (vấn đề cũ)</h3>';

    $where2 = ["status != 'deleted'", "(user_id = 'admin-001' OR user_id = '1')"];
    $sql2 = "SELECT id, visitor_id, user_id, title, created_at, property_id 
    FROM ai_org_conversations WHERE " . implode(" AND ", $where2) . " ORDER BY created_at DESC LIMIT 10";

    echo '<div class="label">SQL Query:</div>';
    echo '<pre>' . htmlspecialchars($sql2) . '</pre>';

    $stmt2 = $pdo->query($sql2);
    $results2 = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    echo '<p class="label">Kết quả: <strong style="color:#ef4444">' . count($results2) . '</strong> conversations (admin-001 thấy)</p>';
    echo '</div>';

    // ===== ALL DISTINCT user_ids =====
    echo '<div class="section">';
    echo '<h3>📊 Tất cả user_id trong ai_org_conversations</h3>';
    $stmt3 = $pdo->query("SELECT user_id, COUNT(*) as count FROM ai_org_conversations WHERE status != 'deleted' GROUP BY user_id ORDER BY count DESC");
    $userIds = $stmt3->fetchAll(PDO::FETCH_ASSOC);
    echo '<table><tr><th>user_id</th><th>Số conversations</th></tr>';
    foreach ($userIds as $u) {
        echo '<tr><td><span class="badge badge-yellow">' . htmlspecialchars($u['user_id'] ?? 'NULL') . '</span></td><td>' . $u['count'] . '</td></tr>';
    }
    echo '</table>';
    echo '</div>';

    // ===== MIGRATE TOOL =====
    echo '<div class="section">';
    echo '<h3>🔧 Migrate Conversations (gán lại user_id)</h3>';
    if ($migrateMsg)
        echo '<p style="color:#34d399;font-weight:bold">' . htmlspecialchars($migrateMsg) . '</p>';
    echo '<form method="POST" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">';
    echo '<div><label class="label">Từ user_id:</label><br><input name="from_user" value="admin-001" style="background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:6px 10px;border-radius:6px;width:150px"></div>';
    echo '<div><label class="label">→ Sang user_id:</label><br><input name="to_user" value="2" style="background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:6px 10px;border-radius:6px;width:150px"></div>';
    echo '<div style="padding-top:18px"><button type="submit" name="migrate" value="1" style="background:#f59e0b;color:#000;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold">Migrate</button></div>';
    echo '</form>';
    echo '<p class="label" style="margin-top:8px">⚠️ Chú ý: Chỉ migrate nếu chắc chắn những conversations của admin-001 thực sự thuộc về user đó</p>';
    echo '</div>';

    // ===== FRONTEND API URL =====
    echo '<div class="section">';
    echo '<h3>🔗 Frontend API URL đang gọi</h3>';
    echo '<div class="label">CategoryChatPage.tsx dòng 1174:</div>';
    echo '<div class="url">ai_org_chatbot?action=list_conversations&amp;user_id={effectiveUserId}&amp;visitor_id={sessionId}&amp;org_user_id={orgUser?.id}</div>';
    echo '<br>';
    echo '<div class="label">Với user Turnio DEVB (org_user_id=2):</div>';
    echo '<div class="url">ai_org_chatbot?action=list_conversations&amp;user_id=2&amp;visitor_id=xxx&amp;org_user_id=2</div>';
    echo '<br>';
    echo '<div class="label">✅ Sau fix: backend dùng org_user_id=2 → chỉ thấy conversations của user 2</div>';
    echo '<br>';
    echo '<div class="label">✅ Sau fix: khi chat mới, backend lưu user_id = org_user_id từ frontend (không còn admin-001)</div>';
    echo '</div>';

    ?>

    <div class="section">
        <h3>🛠️ Quick Fix Links</h3>
        <p><a href="?user_id=2" style="color:#38bdf8">Debug user_id=2</a> |
            <a href="?user_id=admin-001" style="color:#f59e0b">Debug admin-001</a> |
            <a href="fix_admin_role.php" style="color:#34d399">Fix Admin Role</a>
        </p>
    </div>

</body>

</html>