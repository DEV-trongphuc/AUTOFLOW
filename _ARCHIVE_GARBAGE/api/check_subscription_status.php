<?php
/**
 * Check Webhook Subscription Status
 * Endpoint: /api/check_subscription_status.php
 */

header("Content-Type: text/plain");

// REQUIRED: User Access Token (Updated)
$USER_ACCESS_TOKEN = 'EAAUZCMBsoUygBQtm1tOgZCZCpmVvGnEpruQcZAFyeYL4Tw3zivgiYzZBR8HtIyuOmV0mCcE90nQQhicKKqwa6T8BhRu8ZCj8RwjIaKZCDlu3RiGY8wYIhbiY62cNoEPUEIcAZAAelgju6gyo7idw3i2XGlbfrFVXuRccDXlWXVNYp0RUTzW121nGF5DTyKyOjlmC9apwsgtTfzhZCeH29ZBplamE756Nbrh0R4I4F1VyoWc4eJq7gHGpwB4YRxPz34yWDnX4v8U9LjrwqDM6O8PXvRkMag2rMLOpvZBttg6vXh6';

echo "Checking Subscription Status for Pages...\n\n";

// 1. Get Accounts
$url = "https://graph.facebook.com/v19.0/me/accounts?access_token=$USER_ACCESS_TOKEN";
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

if (!isset($data['data'])) {
    die("Error fetching pages: " . $response);
}

foreach ($data['data'] as $page) {
    $pageName = $page['name'];
    $pageId = $page['id'];
    $pageToken = $page['access_token'];

    echo "PAGE: $pageName (ID: $pageId)\n";

    // 2. Check Subscribed Apps
    $checkUrl = "https://graph.facebook.com/v19.0/$pageId/subscribed_apps?access_token=$pageToken";

    $ch = curl_init($checkUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $checkResponse = curl_exec($ch);
    curl_close($ch);

    $subs = json_decode($checkResponse, true);

    if (isset($subs['data']) && !empty($subs['data'])) {
        foreach ($subs['data'] as $sub) {
            echo "   [+] App: " . ($sub['name'] ?? 'Unknown') . " (ID: " . ($sub['id'] ?? 'N/A') . ")\n";
            echo "       Fields: " . json_encode($sub['subscribed_fields']) . "\n";
        }
    } else {
        echo "   [-] NO APPS SUBSCRIBED via API.\n";
    }
    echo "--------------------------------------------------\n";
}
?>