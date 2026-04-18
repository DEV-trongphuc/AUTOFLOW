<?php
// api/debug_psid_profile.php - Manual Fetch Profile & Avatar by PSID
require_once 'db_connect.php';
require_once 'meta_helpers.php';

header('Content-Type: text/html; charset=utf-8');

$psid = $_GET['psid'] ?? "25888675334096470";

echo "<h1>Meta Profile Debugger</h1>";
echo "<b>PSID:</b> $psid<br><br>";

// 1. Find a valid Page Access Token
try {
    $stmt = $pdo->prepare("SELECT page_id, page_name, page_access_token FROM meta_app_configs WHERE page_access_token IS NOT NULL AND status = 'active' LIMIT 1");
    $stmt->execute();
    $config = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$config) {
        die("<b style='color:red;'>Error:</b> No active Meta Page configuration found. Please connect a Page first.");
    }

    echo "<b>Using Page:</b> " . htmlspecialchars($config['page_name']) . " (" . $config['page_id'] . ")<br>";

    // 2. Fetch Profile
    echo "Fetching profile... <br>";
    $profile = fetchMetaUserProfile($psid, $config['page_access_token']);

    if ($profile) {
        if (isset($profile['error'])) {
            echo "<br><b style='color:red;'>API Error:</b> " . htmlspecialchars($profile['error']);
            if (isset($profile['code']))
                echo " (Code: {$profile['code']})";
        } else {
            echo "<h2>Result:</h2>";
            echo "<pre>" . json_encode($profile, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";

            if (!empty($profile['profile_pic'])) {
                echo "<h3>Avatar:</h3>";
                echo "<img src='{$profile['profile_pic']}' style='width: 150px; height: 150px; border-radius: 50%; border: 2px solid #ddd;'>";
            }
        }
    } else {
        echo "<br><b style='color:red;'>Error:</b> API returned empty response.";
    }

} catch (Exception $e) {
    echo "<b>System Error:</b> " . $e->getMessage();
}

echo "<hr><p>Usage: <code>?psid=YOUR_PSID</code></p>";
