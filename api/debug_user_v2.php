<?php
// api/debug_user_v2.php
require_once 'db_connect.php';

header('Content-Type: text/html; charset=utf-8');
echo "<html><head><style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; padding: 20px; background: #f0f2f5; color: #1c1e21; }
    .container { max-width: 1200px; margin: 0 auto; }
    .card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom: 25px; }
    h2 { margin-top: 0; color: #1877f2; border-bottom: 2px solid #e4e6eb; padding-bottom: 15px; font-weight: 700; }
    h3 { color: #4b4b4b; border-left: 4px solid #1877f2; padding-left: 10px; margin-top: 30px; }
    pre { background: #f5f6f7; color: #1c1e21; padding: 15px; border-radius: 8px; border: 1px solid #dddfe2; overflow-x: auto; font-size: 13px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
    .status-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .status-ok { background: #e7f3ff; color: #1877f2; }
    .status-warning { background: #fffde7; color: #f57c00; }
    .status-error { background: #fee2e2; color: #dc2626; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ebedf0; font-size: 14px; }
    th { background: #fafafa; font-weight: 600; color: #65676b; }
    tr:hover { background: #f9fafb; }
    .btn { display: inline-block; padding: 8px 16px; background: #1877f2; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; transition: background 0.2s; }
    .btn:hover { background: #166fe5; }
    .search-bar { display: flex; gap: 10px; margin-bottom: 20px; }
    .search-input { flex: 1; padding: 10px 15px; border-radius: 8px; border: 1px solid #dddfe2; outline: none; }
    .search-input:focus { border-color: #1877f2; box-shadow: 0 0 0 2px #e7f3ff; }
</style></head><body><div class='container'>";

echo "<h1>👤 MailFlow Pro User Debugger</h1>";

$subId = $_GET['id'] ?? null;
$search = $_GET['q'] ?? null;

if ($subId) {
    // === DETAILED VIEW ===
    $stmt = $pdo->prepare("SELECT * FROM subscribers WHERE id = ?");
    $stmt->execute([$subId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo "<div class='card status-error'>Subscriber not found: $subId</div>";
        echo "<a href='?' class='btn'>Back to List</a>";
    } else {
        echo "<div class='card'>";
        echo "<h2>User Details: " . htmlspecialchars($user['name'] ?? $user['email'] ?? 'Unnamed') . "</h2>";

        echo "<div style='display: grid; grid-template-columns: 1fr 1fr; gap: 20px;'>";
        echo "<div><h3>Core Information</h3><table>";
        echo "<tr><th>UUID</th><td>{$user['id']}</td></tr>";
        echo "<tr><th>Email</th><td>" . htmlspecialchars($user['email']) . "</td></tr>";
        echo "<tr><th>Phone</th><td>" . htmlspecialchars($user['phone']) . "</td></tr>";
        echo "<tr><th>Meta PSID</th><td>" . ($user['meta_psid'] ?: 'None') . "</td></tr>";
        echo "<tr><th>Zalo ID</th><td>" . ($user['zalo_user_id'] ?: 'None') . "</td></tr>";
        echo "<tr><th>Lead Score</th><td><b>{$user['lead_score']}</b></td></tr>";
        echo "<tr><th>Created</th><td>{$user['created_at']}</td></tr>";
        echo "</table></div>";

        echo "<div><h3>Custom Data & Tags</h3>";
        $tags = json_decode($user['tags'] ?? '[]', true);
        if (!empty($tags)) {
            foreach ($tags as $t)
                echo "<span class='status-badge status-ok' style='margin: 2px;'>$t</span> ";
        } else {
            echo "<p>No tags</p>";
        }
        echo "<h4>Raw Context:</h4><pre>" . htmlspecialchars($user['custom_data'] ?? '{}') . "</pre>";
        echo "</div>";
        echo "</div>";

        // Timeline
        echo "<h3>⏳ Activity Timeline (Latest 30)</h3>";
        $stmtAct = $pdo->prepare("SELECT * FROM subscriber_activity WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 30");
        $stmtAct->execute([$subId]);
        $acts = $stmtAct->fetchAll(PDO::FETCH_ASSOC);

        if (empty($acts)) {
            echo "<p>No activity recorded yet.</p>";
        } else {
            echo "<table><tr><th>Time</th><th>Type</th><th>Details</th><th>Source</th></tr>";
            foreach ($acts as $a) {
                echo "<tr>";
                echo "<td><small>{$a['created_at']}</small></td>";
                echo "<td><span class='status-badge " . ($a['type'] == 'staff_reply' ? 'status-warning' : 'status-ok') . "'>{$a['type']}</span></td>";
                echo "<td>" . htmlspecialchars($a['details']) . "</td>";
                echo "<td>" . ($a['ip_address'] ?? 'system') . "</td>";
                echo "</tr>";
            }
            echo "</table>";
        }

        // AI Conversations
        echo "<h3>🤖 AI Conversations</h3>";
        // Search by visitor_id patterns
        $vids = [];
        if ($user['meta_psid'])
            $vids[] = "meta_" . $user['meta_psid'];
        if ($user['zalo_user_id'])
            $vids[] = "zalo_" . $user['zalo_user_id'];
        if ($user['email'])
            $vids[] = $user['email'];

        if (!empty($vids)) {
            $placeholders = str_repeat('?,', count($vids) - 1) . '?';
            $stmtAi = $pdo->prepare("SELECT * FROM ai_conversations WHERE visitor_id IN ($placeholders) ORDER BY updated_at DESC");
            $stmtAi->execute($vids);
            $convs = $stmtAi->fetchAll(PDO::FETCH_ASSOC);

            if (empty($convs)) {
                echo "<p>No linked AI conversations found.</p>";
            } else {
                echo "<table><tr><th>ID</th><th>Status</th><th>Last Msg</th><th>Updated</th><th>Action</th></tr>";
                foreach ($convs as $c) {
                    echo "<tr>";
                    echo "<td><small>{$c['id']}</small></td>";
                    echo "<td><span class='status-badge " . ($c['status'] == 'human' ? 'status-error' : 'status-ok') . "'>{$c['status']}</span></td>";
                    echo "<td>" . htmlspecialchars(mb_substr($c['last_message'] ?? '', 0, 80)) . "</td>";
                    echo "<td>{$c['updated_at']}</td>";
                    echo "<td>-</td>";
                    echo "</tr>";
                }
                echo "</table>";
            }
        }

        echo "<br><a href='?' class='btn' style='background: #606770;'>Back to List</a>";
        echo "</div>";
    }
} else {
    // === LIST VIEW ===
    echo "<div class='card'>";
    echo "<h2>Search User</h2>";
    echo "<form class='search-bar'>";
    echo "<input type='text' name='q' class='search-input' placeholder='Search by Name, Email, Phone, PSID...' value='" . htmlspecialchars($search ?? '') . "'>";
    echo "<button type='submit' class='btn'>Search</button>";
    echo "</form>";

    if ($search) {
        $stmtSearch = $pdo->prepare("SELECT * FROM subscribers WHERE 
            name LIKE ? OR email LIKE ? OR phone LIKE ? OR meta_psid LIKE ? OR zalo_user_id LIKE ? 
            ORDER BY last_active_at DESC LIMIT 50");
        $term = "%$search%";
        $stmtSearch->execute([$term, $term, $term, $term, $term]);
        $results = $stmtSearch->fetchAll(PDO::FETCH_ASSOC);
        echo "<h3>Search Results for: " . htmlspecialchars($search) . "</h3>";
    } else {
        $stmtSearch = $pdo->query("SELECT * FROM subscribers ORDER BY updated_at DESC LIMIT 30");
        $results = $stmtSearch->fetchAll(PDO::FETCH_ASSOC);
        echo "<h3>Latest 30 Active/Updated Users</h3>";
    }

    if (empty($results)) {
        echo "<p>No users found.</p>";
    } else {
        echo "<table><tr><th>Name</th><th>Channels</th><th>Lead Score</th><th>Last Activity</th><th>Action</th></tr>";
        foreach ($results as $r) {
            $channels = [];
            if ($r['meta_psid'])
                $channels[] = "🔵 Meta";
            if ($r['zalo_user_id'])
                $channels[] = "🟡 Zalo";
            if (!$r['meta_psid'] && !$r['zalo_user_id'])
                $channels[] = "🌐 Web";

            echo "<tr>";
            echo "<td><b>" . htmlspecialchars($r['name'] ?: 'Unnamed') . "</b><br><small>" . htmlspecialchars($r['email']) . "</small></td>";
            echo "<td>" . implode('<br>', $channels) . "</td>";
            echo "<td><span class='status-badge status-ok'>Score: {$r['lead_score']}</span></td>";
            echo "<td><small>" . ($r['last_active_at'] ?? $r['updated_at']) . "</small></td>";
            echo "<td><a href='?id={$r['id']}' class='btn' style='padding: 6px 12px; font-size: 13px;'>View Full Log</a></td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    echo "</div>";
}

echo "</div></body></html>";
