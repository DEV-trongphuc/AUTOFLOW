<?php
// Simulate Zalo Webhook
$url = "https://automation.ideas.edu.vn/mail_api/webhook.php";

$data = json_encode([
    'event_name' => 'user_send_text',
    'sender' => ['id' => 'TEST_USER_123'],
    'oa_id' => 'TEST_OA_ID',
    'message' => ['text' => 'Test Webhook Simulation']
]);

echo "Sending Fake Webhook to: $url <br><hr>";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // Follow redirects

$result = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "<b>HTTP Status:</b> $httpCode <br>";
echo "<b>Response Body:</b> " . htmlspecialchars($result) . "<br>";
echo "<b>Curl Error:</b> $error <br>";

echo "<hr><a href='view_zalo_log.php'>Check Log File Now</a>";
?>