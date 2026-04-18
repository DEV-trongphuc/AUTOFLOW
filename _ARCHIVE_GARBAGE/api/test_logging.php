<?php
/**
 * Test Logging Capability
 * Access this file to force a log entry.
 */

$logFile = __DIR__ . '/meta_webhook_prod.log';

echo "<h2>Log Permission Test</h2>";
echo "Trying to write to: " . $logFile . "<br>";

if (is_writable(__DIR__)) {
    echo "Directory is writable.<br>";
} else {
    echo "<strong style='color:red'>Directory is NOT writable. Log file cannot be created.</strong><br>";
    echo "Please chmod 777 or give write permissions to this folder.<br>";
}

if (file_exists($logFile)) {
    if (is_writable($logFile)) {
        echo "Log file exists and is writable.<br>";
    } else {
        echo "<strong style='color:red'>Log file exists but is NOT writable.</strong><br>";
    }
} else {
    echo "Log file does not exist yet.<br>";
}

// Attempt write
$testData = [
    'test' => 'manual_write',
    'timestamp' => date('Y-m-d H:i:s'),
    'message' => 'This is a test log entry from test_logging.php'
];

$result = file_put_contents($logFile, date('[Y-m-d H:i:s] ') . print_r($testData, true) . "\n", FILE_APPEND);

if ($result !== false) {
    echo "<h3 style='color:green'>Success! Wrote $result bytes.</h3>";
    echo '<a href="debug_meta_logs.php">Go to Debug Logs Viewer</a>';
} else {
    echo "<h3 style='color:red'>Failed to write to file.</h3>";
    echo "Check server logs for details.";
}
?>