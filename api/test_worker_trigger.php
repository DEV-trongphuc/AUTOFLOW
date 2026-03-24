<?php
require_once 'db_connect.php';

echo "--- Testing Worker Trigger ---\n";
echo "Detected API_BASE_URL: " . API_BASE_URL . "\n";

$testUrl = API_BASE_URL . "/worker_campaign.php";
echo "Attempting to call: $testUrl\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $testUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);

$result = curl_exec($ch);
$error = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($error) {
    echo "CURL ERROR: $error\n";
} else {
    echo "HTTP CODE: $httpCode\n";
    echo "RESULT (First 500 chars): " . substr($result, 0, 500) . "...\n";
}

echo "\n--- System Checks ---\n";
echo "PHP Version: " . phpversion() . "\n";
echo "CURL Enabled: " . (function_exists('curl_init') ? 'Yes' : 'No') . "\n";
echo "SERVER_NAME: " . ($_SERVER['SERVER_NAME'] ?? 'N/A') . "\n";
echo "HTTP_HOST: " . ($_SERVER['HTTP_HOST'] ?? 'N/A') . "\n";
