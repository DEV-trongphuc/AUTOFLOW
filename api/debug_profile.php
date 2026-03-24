<?php
require_once 'db_connect.php';
require_once 'meta_helpers.php';

$psid = $_GET['psid'] ?? '578149840529510';

// 1. Get an active Page Access Token
$stmt = $pdo->query("SELECT page_access_token, page_name FROM meta_app_configs WHERE status = 'active' LIMIT 1");
$config = $stmt->fetch();

if (!$config) {
    echo json_encode(['success' => false, 'message' => 'No active page configuration found']);
    exit;
}

echo "<h3>Testing Profile Fetch for PSID: $psid</h3>";
echo "<p>Using Page: <b>{$config['page_name']}</b></p>";

$profile = fetchMetaUserProfile($psid, $config['page_access_token']);

if ($profile) {
    echo "<h4>Success! Profile Data:</h4>";
    echo "<pre>" . json_encode($profile, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
    if (!empty($profile['profile_pic'])) {
        echo "<img src='{$profile['profile_pic']}' style='width:100px; border-radius:50%; border: 2px solid #ddd;'>";
    }
} else {
    echo "<h4>Failed to fetch profile</h4>";
    echo "<p>Possible reasons:</p>
          <ul>
            <li>PSID incorrect for this Page</li>
            <li>Token lacks permissions</li>
            <li>User has blocked the Page</li>
          </ul>";
}
?>