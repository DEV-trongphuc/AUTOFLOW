const fs = require('fs');

// 1. Add Wakeup function to trigger_helper.php
let triggerFile = 'api/trigger_helper.php';
let triggerContent = fs.readFileSync(triggerFile, 'utf8');

if (!triggerContent.includes('wakeupWaitingSubscribers')) {
    const wakeupFunc = `
// [EVENT-DRIVEN ARCHITECTURE] Wake up subscriber waiting in flows
if (!function_exists('wakeupWaitingSubscribers')) {
    function wakeupWaitingSubscribers($pdo, $subscriberId) {
        if (!$subscriberId) return;
        try {
            $stmt = $pdo->prepare("UPDATE flow_subscribers SET next_scheduled_at = NOW() WHERE subscriber_id = ? AND status = 'waiting' AND next_scheduled_at > NOW()");
            $stmt->execute([$subscriberId]);
        } catch (Exception $e) {}
    }
}
`;
    // Append at the end of the file, before closing ?> if it exists, otherwise just append
    if (triggerContent.includes('?>')) {
        triggerContent = triggerContent.replace('?>', wakeupFunc + '\n?>');
    } else {
        triggerContent += '\n' + wakeupFunc;
    }
    fs.writeFileSync(triggerFile, triggerContent, 'utf8');
    console.log("Added wakeupWaitingSubscribers to trigger_helper.php");
}

// 2. Inject into webhook.php (SES Email Webhook)
let webhookFile = 'api/webhook.php';
let webhookContent = fs.readFileSync(webhookFile, 'utf8');

// We want to insert `require_once 'trigger_helper.php'; wakeupWaitingSubscribers($pdo, $subscriberId);`
// Where do we get subscriberId inside webhook.php?
// Typically in handleOpen() and handleClick() etc.
// Let's just do a blanket insert after any stats update or tracking.
// Wait, $subscriber_id is extracted in processInteraction($payload, 'open').
if (!webhookContent.includes('wakeupWaitingSubscribers')) {
    // Inject at the end of processInteraction or similar. Let's just inject where activity is inserted or stats are updated!
    // Since there are multiple places, let's inject a global replacement.
    // E.g., whenever `logSubscriberActivity` is called.
    webhookContent = webhookContent.replace(
        /\$pdo->prepare\("INSERT INTO subscriber_activity \([^)]+\) VALUES \([^)]+\)"\)->execute\(\[[^\]]+\]\);/g,
        `$&
        // EVENT-DRIVEN WAKEUP
        require_once 'trigger_helper.php';
        wakeupWaitingSubscribers($pdo, $subscriber_id);`
    );
    
    // Also inject around $stmtActivity->execute(...)
    webhookContent = webhookContent.replace(
        /\$(stmtActivity)?->execute\(\[\$subscriber_id, \$type[^\]]+\]\);/g,
        `$&
        // EVENT-DRIVEN WAKEUP
        require_once 'trigger_helper.php';
        if (isset($subscriber_id)) wakeupWaitingSubscribers($pdo, $subscriber_id);`
    );
    
    fs.writeFileSync(webhookFile, webhookContent, 'utf8');
    console.log("Injected wakeup calls into webhook.php");
}

// 3. Inject into track.php
let trackFile = 'api/track.php';
let trackContent = fs.readFileSync(trackFile, 'utf8');
if (!trackContent.includes('wakeupWaitingSubscribers')) {
    trackContent = trackContent.replace(
        "triggerFlows($pdo, $emailSubscriberId, 'ai_capture', $propertyId);",
        `triggerFlows($pdo, $emailSubscriberId, 'ai_capture', $propertyId);
                        // EVENT-DRIVEN WAKEUP
                        wakeupWaitingSubscribers($pdo, $emailSubscriberId);`
    );
    fs.writeFileSync(trackFile, trackContent, 'utf8');
    console.log("Injected wakeup calls into track.php");
}

// 4. Inject into zalo_webhook.php
let zaloWFile = 'api/zalo_webhook.php';
if (fs.existsSync(zaloWFile)) {
    let zaloWContent = fs.readFileSync(zaloWFile, 'utf8');
    if (!zaloWContent.includes('wakeupWaitingSubscribers')) {
        zaloWContent = zaloWContent.replace(
            /(logZaloActivity\(.+?\);)/g,
            `$1
        // EVENT-DRIVEN WAKEUP
        if (isset($subscriberId)) {
            require_once 'trigger_helper.php';
            wakeupWaitingSubscribers($pdo, $subscriberId);
        }`
        );
        fs.writeFileSync(zaloWFile, zaloWContent, 'utf8');
        console.log("Injected wakeup calls into zalo_webhook.php");
    }
}
