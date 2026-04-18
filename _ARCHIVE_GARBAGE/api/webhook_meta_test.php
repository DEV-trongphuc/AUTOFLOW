<?php
/**
 * Meta Messenger Webhook Test File
 * 
 * Configured for:
 * - Verification Token: "my_secure_verify_token" (Change this in your Facebook App Dashboard)
 * - Logging: Writes to "webhook_meta.log" in the same directory.
 */

// Configuration
$VERIFY_TOKEN = 'EAAUZCMBsoUygBQlFZCIrZBH1K7Xpk4A5Riz5fgPoA37Mnijtrd8UZB1HI0nZAnyQftndVE6yoruWI4WsZBCo6OyzOQnoMMYWX1x8fwYC9A9mX3rNbM8cl14kwamVWYAlrw413EOmfLgl4hlqqSrLFF3mwd3pikWZCkdNMNwv79XqwaGykRQavjucEOfl05C3LZCKwOuN6TwKcZBgUOgzZAcU9Qghb7gQZDZD';
$APP_SECRET = 'YOUR_APP_SECRET'; // Replace with your actual App Secret if you want to verify signatures
$LOG_FILE = __DIR__ . '/webhook_meta.log';

// Helper function to log data
function logData($message, $data = null)
{
    global $LOG_FILE;
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    if ($data) {
        $logEntry .= "\n" . print_r($data, true);
    }
    $logEntry .= "\n--------------------------------------------------\n";
    file_put_contents($LOG_FILE, $logEntry, FILE_APPEND);
}

// -------------------------------------------------------------------------
// 1. Verification Request (GET)
// -------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $mode = $_GET['hub_mode'] ?? null;
    $token = $_GET['hub_verify_token'] ?? null;
    $challenge = $_GET['hub_challenge'] ?? null;

    if ($mode && $token) {
        if ($mode === 'subscribe' && $token === $VERIFY_TOKEN) {
            logData("WEBHOOK_VERIFIED", ['hub.mode' => $mode, 'hub.challenge' => $challenge]);
            http_response_code(200);
            echo $challenge;
            exit;
        } else {
            logData("VERIFICATION_FAILED", ['received_token' => $token, 'expected_token' => $VERIFY_TOKEN]);
            http_response_code(403);
            die('Verification Failed');
        }
    }
}

// -------------------------------------------------------------------------
// 2. Event Notification (POST)
// -------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');

    // Optional: Verify Signature
    // You can enable this in production for security.
    $signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? null;
    if ($signature) {
        // Validation logic here if needed
        // logData("Signature Received", $signature);
    }

    $body = json_decode($input, true);

    if ($body && isset($body['object'])) {
        if ($body['object'] === 'page') {

            // Loop through each entry
            if (isset($body['entry']) && is_array($body['entry'])) {
                foreach ($body['entry'] as $entry) {
                    $pageID = $entry['id'];
                    $time = $entry['time'];

                    if (isset($entry['messaging'])) {
                        foreach ($entry['messaging'] as $event) {
                            if (isset($event['message'])) {
                                logData("EVENT: Message Received", $event); // Handle messages
                            } elseif (isset($event['delivery'])) {
                                logData("EVENT: Message Delivered", $event); // Handle delivery
                            } elseif (isset($event['read'])) {
                                logData("EVENT: Message Read", $event); // Handle read
                            } elseif (isset($event['reaction'])) {
                                logData("EVENT: Message Reaction", $event); // Handle reaction
                            } else {
                                logData("EVENT: Other", $event);
                            }
                        }
                    }
                }
            }

            logData("FULL_PAYLOAD_RECEIVED", $body);
            http_response_code(200);
            echo "EVENT_RECEIVED";
        } else {
            http_response_code(404);
        }
    } else {
        logData("INVALID_REQUEST", $input);
        http_response_code(400); // Bad Request
    }
}
?>