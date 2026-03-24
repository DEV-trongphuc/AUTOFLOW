<?php
// api/debug_template.php
require_once 'db_connect.php';
require_once 'zalo_sender.php';

echo "<h1>Debug Zalo Template V2</h1>";

$oa_id = $_GET['oa_id'] ?? '';
$template_id = $_GET['template_id'] ?? '';

if (!$oa_id || !$template_id) {
    die("Please provide ?oa_id=YOUR_OA_DB_ID&template_id=ZALO_TEMPLATE_ID");
}

echo "OA ID: " . htmlspecialchars($oa_id) . "<br>";
echo "Template ID: " . htmlspecialchars($template_id) . "<br>";

// 1. Get Access Token
$tokenResult = getAccessToken($pdo, $oa_id);
if (!$tokenResult['success']) {
    die("Error getting token: " . $tokenResult['message']);
}
$accessToken = $tokenResult['access_token'];
echo "Token obtained successfully.<br>";

// 2. Call V2 API
$url = "https://business.openapi.zalo.me/template/info/v2?template_id=$template_id";
echo "Calling URL: $url<br>";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['access_token: ' . $accessToken]);
// curl_setopt($ch, CURLOPT_VERBOSE, true); 

$res = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "HTTP Code: $httpCode<br>";
if ($error) {
    echo "Curl Error: $error<br>";
}

echo "<h2>Raw Response:</h2>";
echo "<pre>";
$json = json_decode($res, true);
if ($json) {
    echo json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} else {
    echo htmlspecialchars($res);
}
echo "</pre>";

// Check for previewUrl
if (isset($json['data']['previewUrl'])) {
    echo "<h3>Preview URL Found:</h3>";
    echo "<a href='" . $json['data']['previewUrl'] . "' target='_blank'>" . $json['data']['previewUrl'] . "</a><br>";
    echo "<img src='" . $json['data']['previewUrl'] . "' style='max-width: 400px; border: 2px solid red; margin-top: 10px;'>";
} else {
    echo "<h3 style='color:red;'>Preview URL NOT FOUND in 'data' object.</h3>";
}
