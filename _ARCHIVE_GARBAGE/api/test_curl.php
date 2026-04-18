<?php
// api/test_curl.php - Test if curl works at all
header('Content-Type: text/plain; charset=utf-8');

echo "=== CURL AVAILABILITY TEST ===\n\n";

// Test 1: Is curl installed?
if (!function_exists('curl_init')) {
    echo "❌ CURL IS NOT INSTALLED ON THIS SERVER\n";
    echo "This is the root cause. Contact hosting provider to enable curl.\n";
    exit;
}

echo "✅ Curl is installed\n\n";

// Test 2: Can we call external URL?
echo "=== TEST 2: EXTERNAL URL ===\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://www.google.com");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Error: " . ($error ?: "NONE") . "\n";
echo "Response length: " . strlen($response) . "\n\n";

// Test 3: Can we call our own domain?
echo "=== TEST 3: SELF-CALL (SAME AS WORKER TRIGGER) ===\n";
$url = "https://automation.ideas.edu.vn/mail_api/worker_priority.php?trigger_type=test&target_id=1&subscriber_id=1";
echo "URL: $url\n\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // In case SSL is the issue
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Curl Error: " . ($error ?: "NONE") . "\n";
echo "Response: " . substr($response, 0, 200) . "\n\n";

if ($httpCode === 200) {
    echo "✅ SELF-CALL WORKS!\n";
    echo "The problem is NOT with curl.\n";
    echo "Check if debug_priority.log was updated.\n";
} else {
    echo "❌ SELF-CALL FAILED!\n";
    echo "This is why worker_priority.php is not being triggered.\n\n";
    echo "SOLUTIONS:\n";
    echo "1. Add SSL exception options to curl calls\n";
    echo "2. Use 'exec' instead of curl to run worker\n";
    echo "3. Contact hosting provider about firewall/DNS\n";
}
?>