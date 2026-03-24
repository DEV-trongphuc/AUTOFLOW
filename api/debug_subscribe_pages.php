<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

// Force HTML output
header('Content-Type: text/html; charset=utf-8');

function callMetaApi($url, $method = 'GET', $params = []) {
    $ch = curl_init();
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    } else if (!empty($params)) {
        $url .= '?' . http_build_query($params);
    }
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    curl_close($ch);
    $arr = json_decode($res, true);
    return is_array($arr) ? $arr : [];
}

$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    $pId = $_POST['page_id'] ?? '';
    $tok = $_POST['access_token'] ?? '';
    if ($pId && $tok) {
        $p = [
            'subscribed_fields' => 'messages,messaging_postbacks,messaging_optins',
            'access_token' => $tok
        ];
        $res = callMetaApi("https://graph.facebook.com/v18.0/$pId/subscribed_apps", 'POST', $p);
        if (isset($res['success']) && $res['success']) {
            $msg = "<div style='color:green;padding:10px;background:#e6fffa;border:1px solid #b2f5ea;margin-bottom:10px;border-radius:4px'>Done! Subscribed $pId</div>";
        } else {
            $e = $res['error']['message'] ?? 'Unknown Error';
            $msg = "<div style='color:red;padding:10px;background:#fff5f5;border:1px solid #feb2b2;margin-bottom:10px;border-radius:4px'>Error: $e</div>";
        }
    }
}

$stmt = $pdo->query("SELECT * FROM meta_app_configs WHERE status = 'active' ORDER BY updated_at DESC");
$pages = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Meta Debugger</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; background: #f4f7f6; color: #333; line-height: 1.5; }
        .card { background: #fff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 25px; max-width: 1000px; margin: 0 auto; }
        h1 { margin-top: 0; color: #2d3748; font-size: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f7fafc; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; color: #718096; }
        .tag { padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; margin-right: 5px; display: inline-block; }
        .tag-default { background: #edf2f7; color: #4a5568; }
        .tag-success { background: #c6f6d5; color: #22543d; }
        .tag-warning { background: #fefcbf; color: #744210; }
        .tag-alert { background: #fed7d7; color: #822727; }
        button { background: #4299e1; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px; transition: background 0.2s; }
        button:hover { background: #3182ce; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Meta App Connection Debugger</h1>
        <?php echo $msg; ?>
        
        <?php if (empty($pages)): ?>
            <p style="color:#718096;text-align:center;padding:40px;">No pages found in database.</p>
        <?php else: ?>
            <table>
                <thead>
                    <tr>
                        <th>Page Information</th>
                        <th>Token Permissions</th>
                        <th>Webhook Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($pages as $page): 
                        // Status check
                        $c = callMetaApi("https://graph.facebook.com/v18.0/{$page['page_id']}/subscribed_apps", 'GET', ['access_token' => $page['page_access_token']]);
                        $sub = (isset($c['data']) && is_array($c['data']) && count($c['data']) > 0);
                        
                        // Permissions check
                        $pr = callMetaApi("https://graph.facebook.com/v18.0/me/permissions", 'GET', ['access_token' => $page['page_access_token']]);
                        $perms = [];
                        if (isset($pr['data']) && is_array($pr['data'])) {
                            foreach ($pr['data'] as $sm) {
                                if (($sm['status'] ?? '') === 'granted') $perms[] = $sm['permission'] ?? '';
                            }
                        }
                        $hasMsg = in_array('pages_messaging', $perms);
                    ?>
                    <tr>
                        <td>
                            <div style="font-weight:700"><?php echo htmlspecialchars($page['page_name']); ?></div>
                            <div style="font-size:10px;color:#a0aec0;font-family:monospace">ID: <?php echo htmlspecialchars($page['page_id']); ?></div>
                            <div style="font-size:10px;color:#cbd5e0;margin-top:2px">Upd: <?php echo $page['updated_at']; ?></div>
                        </td>
                        <td>
                            <div style="display:flex;flex-wrap:wrap;gap:4px">
                                <?php foreach ($perms as $pName): ?>
                                    <span class="tag <?php echo $pName === 'pages_messaging' ? 'tag-success' : 'tag-default'; ?>">
                                        <?php echo htmlspecialchars($pName); ?>
                                    </span>
                                <?php endforeach; ?>
                            </div>
                            <?php if (!$hasMsg): ?>
                                <div style="color:#e53e3e;font-size:10px;font-weight:bold;margin-top:5px">MISSING: pages_messaging</div>
                            <?php endif; ?>
                        </td>
                        <td>
                            <span class="tag <?php echo $sub ? 'tag-success' : 'tag-warning'; ?>">
                                <?php echo $sub ? 'SUBSCRIBED' : 'NOT SUBSCRIBED'; ?>
                            </span>
                        </td>
                        <td>
                            <form method="POST">
                                <input type="hidden" name="action" value="subscribe">
                                <input type="hidden" name="page_id" value="<?php echo $page['page_id']; ?>">
                                <input type="hidden" name="access_token" value="<?php echo $page['page_access_token']; ?>">
                                <button type="submit">Force Subscribe</button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php endif; ?>
    </div>
</body>
</html>