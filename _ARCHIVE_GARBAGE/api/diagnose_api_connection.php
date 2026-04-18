<?php
$apiUrl = "https://automation.ideas.edu.vn/mail_api/ai_chatbot.php";
$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$res = curl_exec($ch);
$err = curl_error($ch);
$info = curl_getinfo($ch);
curl_close($ch);

echo "Testing URL: $apiUrl\n";
echo "HTTP Code: " . $info['http_code'] . "\n";
if ($err)
    echo "CURL Error: $err\n";
echo "Response Sample: " . substr($res, 0, 100) . "...\n";
