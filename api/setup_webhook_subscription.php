<?php
/**
 * Setup Webhook Subscription (Connect App to Page)
 * Endpoint: /api/setup_webhook_subscription.php
 * 
 * Usage:
 * Access this file in browser to subscribe your App to your Page's webhook events.
 */

header("Content-Type: text/plain");

// =============================================================================
// CONFIGURATION
// =============================================================================
$USER_ACCESS_TOKEN = 'EAAUZCMBsoUygBQtm1tOgZCZCpmVvGnEpruQcZAFyeYL4Tw3zivgiYzZBR8HtIyuOmV0mCcE90nQQhicKKqwa6T8BhRu8ZCj8RwjIaKZCDlu3RiGY8wYIhbiY62cNoEPUEIcAZAAelgju6gyo7idw3i2XGlbfrFVXuRccDXlWXVNYp0RUTzW121nGF5DTyKyOjlmC9apwsgtTfzhZCeH29ZBplamE756Nbrh0R4I4F1VyoWc4eJq7gHGpwB4YRxPz34yWDnX4v8U9LjrwqDM6O8PXvRkMag2rMLOpvZBttg6vXh6';

// The fields you want to subscribe to
$FIELDS = 'messages,message_deliveries,message_reads,message_reactions,messaging_postbacks';

echo "1. Fetching Pages for User...\n";

// 1. Get Accounts (Pages)
$url = "https://graph.facebook.com/v24.0/me/accounts?access_token=$USER_ACCESS_TOKEN";
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

if (!isset($data['data'])) {
    die("Error fetching pages: " . $response);
}

echo "Found " . count($data['data']) . " pages.\n\n";

// 2. Loop through pages and subscribe app
foreach ($data['data'] as $page) {
    $pageName = $page['name'];
    $pageId = $page['id'];
    $pageToken = $page['access_token'];

    echo "--------------------------------------------------\n";
    echo "Page: $pageName (ID: $pageId)\n";
    echo "Action: Subscribing App to '$FIELDS'...\n";

    $subscribeUrl = "https://graph.facebook.com/v24.0/$pageId/subscribed_apps";
    $postData = [
        'subscribed_fields' => $FIELDS,
        'access_token' => $pageToken
    ];

    $ch = curl_init($subscribeUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $result = curl_exec($ch);
    curl_close($ch);

    $resultData = json_decode($result, true);
    if (isset($resultData['success']) && $resultData['success']) {
        echo "✅ SUCCESS: App subscribed to Page.\n";
    } else {
        echo "❌ FAILED: " . $result . "\n";
    }
}

echo "\n--------------------------------------------------\n";
echo "Done! If successful, try sending a message to your Page now.\n";
echo "Then check 'api/meta_webhook.log' for the event.";
?>