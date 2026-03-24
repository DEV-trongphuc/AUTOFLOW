<?php
// api/test_trigger_worker.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain; charset=utf-8');

echo "=== TESTING WORKER_PRIORITY TRIGGER ===\n\n";

// Simulate what purchase_events.php does
$trigger_type = 'purchase';
$target_id = '694fecd5e5e9d';
$subscriber_id = '694d091a9101e';

echo "Simulating purchase trigger:\n";
echo "  Type: $trigger_type\n";
echo "  Target ID: $target_id\n";
echo "  Subscriber: $subscriber_id\n\n";

// Build URL (exactly like purchase_events.php does)
$protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ? "https" : "http";
$host = $_SERVER['HTTP_HOST'];
if (strpos($host, 'localhost') !== false)
    $protocol = 'http';
$dir = dirname($_SERVER['PHP_SELF']);

$workerParams = http_build_query([
    'trigger_type' => $trigger_type,
    'target_id' => $target_id,
    'subscriber_id' => $subscriber_id
]);

$workerUrl = "$protocol://$host$dir/worker_priority.php?" . $workerParams;

echo "Worker URL: $workerUrl\n\n";

// Try curl call
echo "=== CURL TEST ===\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $workerUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // Changed to true to see response
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Curl Error: " . ($curlError ?: 'NONE') . "\n";
echo "Response: " . substr($response, 0, 500) . "\n\n";

if ($httpCode === 200) {
    echo "✅ Worker was triggered successfully!\n";
    echo "Check debug_priority.log for details.\n";
} else {
    echo "❌ Worker trigger FAILED!\n";
    echo "This is why purchase/form events don't enroll users.\n";
}
?>