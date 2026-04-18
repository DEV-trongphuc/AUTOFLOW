<?php
/**
 * Get Page Conversations (To find PSID)
 * Endpoint: /api/find_psid.php
 * 
 * Usage:
 * Access this file to see a list of people who messaged your page, along with their PSIDs.
 */

header("Content-Type: text/plain");

// REQUIRED: User Access Token
$USER_ACCESS_TOKEN = 'EAAUZCMBsoUygBQtm1tOgZCZCpmVvGnEpruQcZAFyeYL4Tw3zivgiYzZBR8HtIyuOmV0mCcE90nQQhicKKqwa6T8BhRu8ZCj8RwjIaKZCDlu3RiGY8wYIhbiY62cNoEPUEIcAZAAelgju6gyo7idw3i2XGlbfrFVXuRccDXlWXVNYp0RUTzW121nGF5DTyKyOjlmC9apwsgtTfzhZCeH29ZBplamE756Nbrh0R4I4F1VyoWc4eJq7gHGpwB4YRxPz34yWDnX4v8U9LjrwqDM6O8PXvRkMag2rMLOpvZBttg6vXh6';

// Page ID for "Viện IDEAS" (from previous check)
$PAGE_ID = '860714080649450';

echo "Fetching Conversations for Page ID: $PAGE_ID...\n\n";

// 1. Get Page Access Token
$url = "https://graph.facebook.com/v19.0/$PAGE_ID?fields=access_token&access_token=$USER_ACCESS_TOKEN";
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
if (!isset($data['access_token'])) {
    die("Error getting Page Token: " . $response);
}
$pageToken = $data['access_token'];

// 2. Get Conversations
$convUrl = "https://graph.facebook.com/v19.0/me/conversations?fields=participants,updated_time,snippet&access_token=$pageToken";
$ch = curl_init($convUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$convResponse = curl_exec($ch);
curl_close($ch);

$convData = json_decode($convResponse, true);

if (isset($convData['data']) && !empty($convData['data'])) {
    foreach ($convData['data'] as $conv) {
        $updatedTime = $conv['updated_time'];
        $snippet = $conv['snippet'] ?? '(No preview)';

        // Participants usually contains the User and the Page. We want the User.
        foreach ($conv['participants']['data'] as $participant) {
            if ($participant['id'] !== $PAGE_ID) {
                echo "NAME: " . $participant['name'] . "\n";
                echo "PSID: " . $participant['id'] . "\n";
                echo "Last Message: \"$snippet\" ($updatedTime)\n";
                echo "--------------------------------------------------\n";
            }
        }
    }
} else {
    echo "[-] No conversations found for this page.\n";
    echo "    Please send a message to the page first using Facebook/Messenger app.";
}
?>