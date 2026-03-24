<?php
// debug_zalo_url.php
// Hardcoded debugging script to verify Zalo Auth URL

// ĐIỀN APP ID CỦA BẠN VÀO ĐÂY NẾU KHÁC
$app_id = '178678706857849180';

$callback_url = 'https://automation.ideas.edu.vn/mail_api/zalo_oauth_callback.php';
$challenge = 'TEST_CHALLENGE_STRING_1234567890'; // Dummy PKCE
$state = 'TEST_STATE';

$auth_url = 'https://oauth.zaloapp.com/v4/oa/permission?' . http_build_query([
    'app_id' => $app_id,
    'redirect_uri' => $callback_url,
    'code_challenge' => $challenge,
    'state' => $state
]);

echo "<h3>Zalo Auth URL Debugger</h3>";
echo "<strong>App ID:</strong> $app_id <br>";
echo "<strong>Callback URL:</strong> $callback_url <br>";
echo "<hr>";
echo "<strong>Generated Link:</strong><br>";
echo "<textarea style='width:100%; height:100px'>$auth_url</textarea><br><br>";
echo "👉 <a href='$auth_url' target='_blank' style='font-size:20px; font-weight:bold; background:blue; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;'>Click to Authorize Test</a>";
?>