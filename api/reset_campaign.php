<?php
// api/reset_campaign.php - Reset campaign to allow re-sending for testing
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

$campaignId = $_GET['campaign_id'] ?? null;

if (!$campaignId) {
    die("Error: Please provide campaign_id. Example: ?campaign_id=YOUR_ID");
}

try {
    $pdo->beginTransaction();

    // 1. Reset campaign status
    $pdo->prepare("UPDATE campaigns SET status = 'scheduled', count_sent = 0, sent_at = NULL WHERE id = ?")
        ->execute([$campaignId]);

    // 2. Delete activity logs for this campaign (so subscribers can receive again)
    $pdo->prepare("DELETE FROM subscriber_activity WHERE campaign_id = ?")
        ->execute([$campaignId]);

    // 3. Delete mail delivery logs
    $pdo->prepare("DELETE FROM mail_delivery_logs WHERE campaign_id = ?")
        ->execute([$campaignId]);

    $pdo->commit();

    echo "<!DOCTYPE html>
    <html>
    <head>
        <meta charset='utf-8'>
        <title>Campaign Reset</title>
        <style>
            body { font-family: monospace; background: #0f172a; color: #94a3b8; padding: 40px; }
            .success { background: #1e293b; padding: 30px; border-radius: 8px; border-left: 4px solid #10b981; }
            h1 { color: #10b981; margin: 0 0 20px 0; }
            a { color: #3b82f6; text-decoration: none; }
            a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class='success'>
            <h1>✅ Campaign Reset Successfully</h1>
            <p>Campaign <b>$campaignId</b> has been reset to 'scheduled' status.</p>
            <p>All previous activity logs and delivery records have been cleared.</p>
            <p style='margin-top: 30px;'>
                <a href='campaign_timer.php?campaign_id=$campaignId'>→ Go to Campaign Timer</a>
            </p>
        </div>
    </body>
    </html>";

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    die("Error: " . $e->getMessage());
}
