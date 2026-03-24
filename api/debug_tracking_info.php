<?php
require_once 'db_connect.php';
require_once 'tracking_helper.php'; // To access helper functions

$ua = $_SERVER['HTTP_USER_AGENT'] ?? 'None';
$ip = $_SERVER['REMOTE_ADDR'] ?? 'None';

echo "<h1>Tracking Debug Info</h1>";
echo "<p><strong>Your IP (Server sees):</strong> $ip</p>";
echo "<p><strong>Your User-Agent:</strong> $ua</p>";

echo "<h2>Parsing Results:</h2>";
$device = getDeviceDetails($ua);
echo "<pre>";
print_r($device);
echo "</pre>";

$location = getLocationFromIP($ip);
echo "<p><strong>Resolved Location:</strong> " . ($location ?? 'Failed to resolve') . "</p>";

// Test with empty IP to see if it defaults to Paris
echo "<h2>Test Empty IP:</h2>";
$locEmpty = getLocationFromIP('');
echo "<p><strong>Location for '':</strong> " . ($locEmpty ?? 'null') . "</p>";

?>