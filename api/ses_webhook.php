<?php
// api/ses_webhook.php - Amazon SES Bounce & Complaint Handler
// This endpoint receives SNS notifications from Amazon SES

header('Content-Type: application/json');
require_once 'db_connect.php';

// Get raw POST data
$rawPost = file_get_contents('php://input');
$data = json_decode($rawPost, true);

// Log for debugging
file_put_contents(__DIR__ . '/ses_webhook.log', date('[Y-m-d H:i:s] ') . $rawPost . "\n", FILE_APPEND);

// Handle SNS Subscription Confirmation
if (isset($data['Type']) && $data['Type'] === 'SubscriptionConfirmation') {
    $subscribeUrl = $data['SubscribeURL'] ?? '';
    if ($subscribeUrl) {
        // Auto-confirm subscription
        file_get_contents($subscribeUrl);
        file_put_contents(__DIR__ . '/ses_webhook.log', date('[Y-m-d H:i:s] ') . "SNS Subscription confirmed\n", FILE_APPEND);
    }
    echo json_encode(['status' => 'subscription_confirmed']);
    exit;
}

// Handle SNS Notification
if (isset($data['Type']) && $data['Type'] === 'Notification') {
    $message = json_decode($data['Message'] ?? '{}', true);
    $notificationType = $message['notificationType'] ?? '';

    if ($notificationType === 'Bounce') {
        handleBounce($pdo, $message);
    } elseif ($notificationType === 'Complaint') {
        handleComplaint($pdo, $message);
    }

    echo json_encode(['status' => 'processed']);
    exit;
}

echo json_encode(['status' => 'unknown_type']);

// ===== HANDLERS =====

function handleBounce($pdo, $message)
{
    $bounceType = $message['bounce']['bounceType'] ?? 'Unknown';
    $recipients = $message['bounce']['bouncedRecipients'] ?? [];

    foreach ($recipients as $recipient) {
        $email = $recipient['emailAddress'] ?? '';
        $diagnosticCode = $recipient['diagnosticCode'] ?? '';

        if (!$email)
            continue;

        // Find subscriber
        $stmt = $pdo->prepare("SELECT id FROM subscribers WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $sub = $stmt->fetch();

        if ($sub) {
            $subId = $sub['id'];

            // Mark as bounced if hard bounce
            if ($bounceType === 'Permanent') {
                $pdo->prepare("UPDATE subscribers SET status = 'bounced', updated_at = NOW() WHERE id = ?")->execute([$subId]);

                // Log activity
                $pdo->prepare("INSERT INTO subscriber_activity (subscriber_id, type, details, created_at) VALUES (?, 'bounce', ?, NOW())")
                    ->execute([$subId, "Hard Bounce (SES): $diagnosticCode"]);
            } else {
                // Soft bounce - just log
                $pdo->prepare("INSERT INTO subscriber_activity (subscriber_id, type, details, created_at) VALUES (?, 'soft_bounce', ?, NOW())")
                    ->execute([$subId, "Soft Bounce (SES): $diagnosticCode"]);
            }
        }
    }
}

function handleComplaint($pdo, $message)
{
    $recipients = $message['complaint']['complainedRecipients'] ?? [];

    foreach ($recipients as $recipient) {
        $email = $recipient['emailAddress'] ?? '';

        if (!$email)
            continue;

        // Find subscriber
        $stmt = $pdo->prepare("SELECT id FROM subscribers WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $sub = $stmt->fetch();

        if ($sub) {
            $subId = $sub['id'];

            // Mark as complained (spam complaint)
            $pdo->prepare("UPDATE subscribers SET status = 'complained', updated_at = NOW() WHERE id = ?")->execute([$subId]);

            // Log activity
            $pdo->prepare("INSERT INTO subscriber_activity (subscriber_id, type, details, created_at) VALUES (?, 'complaint', ?, NOW())")
                ->execute([$subId, "Spam Complaint (SES)"]);
        }
    }
}
?>