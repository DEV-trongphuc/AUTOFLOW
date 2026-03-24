<?php
require_once 'db_connect.php';
require_once 'meta_helpers.php';

header("Content-Type: text/plain");

$psid = '26168797652745243'; // From your debug output
$pageId = '860714080649450';

echo "Testing Meta API for PSID: $psid\n";

$stmt = $pdo->prepare("SELECT page_access_token, page_name FROM meta_app_configs WHERE page_id = ?");
$stmt->execute([$pageId]);
$config = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$config) {
    die("Page config not found for ID: $pageId");
}

$token = $config['page_access_token'];
echo "Token found for Page: " . $config['page_name'] . "\n";
echo "Token starts with: " . substr($token, 0, 15) . "...\n\n";

// 1. Check permissions
echo "--- Step 1: Check Token Permissions ---\n";
$permUrl = "https://graph.facebook.com/v24.0/me/permissions?access_token=$token";
$resPerm = curl_get($permUrl);
echo "Permissions Response: " . $resPerm . "\n\n";

// 2. Check if the token can even see the Page itself
echo "--- Step 2: Verify Token by fetching Page Info ---\n";
$pageUrl = "https://graph.facebook.com/v24.0/me?fields=id,name&access_token=$token";
$resPage = curl_get($pageUrl);
echo "Page Me Response: " . $resPage . "\n\n";

// 2. Try the PSID captured by webhook
echo "--- Step 2: Try fetching Profile with Captured PSID ($psid) ---\n";
$userUrl1 = "https://graph.facebook.com/v24.0/$psid?fields=first_name,last_name,profile_pic&access_token=$token";
echo "Request: $userUrl1\n";
echo "Response: " . curl_get($userUrl1) . "\n\n";

// 3. Try the shorter ID provided in your prompt (261687976527452)
$shortId = '261687976527452';
echo "--- Step 3: Try fetching Profile with Short ID ($shortId) ---\n";
$userUrl2 = "https://graph.facebook.com/v24.0/$shortId?fields=first_name,last_name,profile_pic&access_token=$token";
echo "Request: $userUrl2\n";
echo "Response: " . curl_get($userUrl2) . "\n\n";

// Helper function
function curl_get($url)
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return "[$code] " . $res;
}
?>