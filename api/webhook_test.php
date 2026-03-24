<?php
/**
 * Test Webhook Endpoint - Check if Meta can reach it
 */

// Log all incoming requests
$logFile = __DIR__ . '/webhook_test.log';
$timestamp = date('Y-m-d H:i:s');
$method = $_SERVER['REQUEST_METHOD'];

// Log request
$logData = [
    'time' => $timestamp,
    'method' => $method,
    'get' => $_GET,
    'post' => file_get_contents('php://input'),
    'headers' => getallheaders()
];

file_put_contents($logFile, json_encode($logData, JSON_PRETTY_PRINT) . "\n\n", FILE_APPEND);

// Handle GET (verification)
if ($method === 'GET') {
    $mode = $_GET['hub_mode'] ?? '';
    $token = $_GET['hub_verify_token'] ?? '';
    $challenge = $_GET['hub_challenge'] ?? '';

    echo "<h1>Webhook Test Endpoint</h1>";
    echo "<pre>";
    echo "Method: GET\n";
    echo "Mode: $mode\n";
    echo "Token: $token\n";
    echo "Challenge: $challenge\n";
    echo "</pre>";

    // Return challenge for verification
    if ($mode === 'subscribe' && !empty($challenge)) {
        echo $challenge;
    }
    exit;
}

// Handle POST (events)
if ($method === 'POST') {
    http_response_code(200);
    echo 'EVENT_RECEIVED';
    exit;
}

// Default response
echo "<h1>Webhook Test Endpoint</h1>";
echo "<p>This endpoint is working!</p>";
echo "<p>Last request logged at: $timestamp</p>";
echo "<p>Check webhook_test.log for details</p>";
