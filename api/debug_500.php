<?php
// api/debug_500.php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "1. Loading db_connect...<br>";
require_once 'db_connect.php';

echo "2. Loading tracking_processor...<br>";
try {
    require_once 'tracking_processor.php';
    echo "Success loading tracking_processor.<br>";
} catch (Throwable $e) {
    echo "Error loading tracking_processor: " . $e->getMessage() . "<br>";
    exit;
}

echo "3. Testing processTrackingEvent (Unsubscribe)...<br>";
try {
    $res = processTrackingEvent($pdo, 'unsubscribe', [
        'subscriber_id' => 'debug_500_test',
        'flow_id' => 'debug_flow',
        'campaign_id' => 'debug_camp',
        'reference_id' => 'debug_ref'
    ]);
    echo "Result: " . ($res ? "TRUE" : "FALSE") . "<br>";
} catch (Throwable $e) {
    echo "FATAL ERROR during execution: " . $e->getMessage() . "<br>";
    echo "File: " . $e->getFile() . " on line " . $e->getLine() . "<br>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}
?>