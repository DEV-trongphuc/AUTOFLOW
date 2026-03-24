<?php
/**
 * Test Sending Message via Meta Messenger API
 * Endpoint: /api/test_send_message.php?psid=USER_PSID
 * 
 * Usage:
 * 1. Open your browser or use curl.
 * 2. Access: http://your-domain.com/api/test_send_message.php?psid=YOUR_PSID
 *    (Get a PSID from api/meta_webhook.log when someone messages the page)
 */

header("Content-Type: text/plain");

// =============================================================================
// CONFIGURATION
// =============================================================================
$USER_ACCESS_TOKEN = 'EAAUZCMBsoUygBQtm1tOgZCZCpmVvGnEpruQcZAFyeYL4Tw3zivgiYzZBR8HtIyuOmV0mCcE90nQQhicKKqwa6T8BhRu8ZCj8RwjIaKZCDlu3RiGY8wYIhbiY62cNoEPUEIcAZAAelgju6gyo7idw3i2XGlbfrFVXuRccDXlWXVNYp0RUTzW121nGF5DTyKyOjlmC9apwsgtTfzhZCeH29ZBplamE756Nbrh0R4I4F1VyoWc4eJq7gHGpwB4YRxPz34yWDnX4v8U9LjrwqDM6O8PXvRkMag2rMLOpvZBttg6vXh6';
$PAGE_ID = '860714080649450'; // Viện IDEAS

// Can be passed via GET parameter
$RECIPIENT_PSID = $_GET['psid'] ?? null;

if (!$RECIPIENT_PSID) {
    die("Error: Please provide a recipient PSID in the URL.\nExample: ?psid=1234567890");
}

// =============================================================================
// 1. GET PAGE ACCESS TOKEN
// =============================================================================
echo "1. Fetching Page Access Token for Page ID: $PAGE_ID...\n";

$url = "https://graph.facebook.com/v24.0/$PAGE_ID?fields=access_token&access_token=$USER_ACCESS_TOKEN";
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

if (!isset($data['access_token'])) {
    die("Failed to get Page Access Token. Response:\n" . $response);
}

$pageToken = $data['access_token'];
echo "Success! Page Token obtained.\n\n";

// =============================================================================
// 2. SEND TEST MESSAGE
// =============================================================================
echo "2. Sending Test Message to PSID: $RECIPIENT_PSID...\n";

$messageData = [
    'recipient' => ['id' => $RECIPIENT_PSID],
    'messaging_type' => 'RESPONSE',
    'message' => [
        'text' => "Hello! This is a test message sent from the API.\nTime: " . date('Y-m-d H:i:s')
    ]
];

$sendUrl = "https://graph.facebook.com/v24.0/me/messages?access_token=$pageToken";

$ch = curl_init($sendUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($messageData));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);
curl_close($ch);

echo "Response from Facebook:\n";
echo $result;

$resultData = json_decode($result, true);
if (isset($resultData['message_id'])) {
    echo "\n\n✅ Message Sent Successfully!";
} else {
    echo "\n\n❌ Message Sending Failed.";
}
?>