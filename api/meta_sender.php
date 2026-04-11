<?php
/**
 * Meta/Facebook Sender Service
 * Handles sending messages via Graph API using Page Access Tokens
 */

require_once 'db_connect.php';
require_once 'meta_helpers.php';

/**
 * Get Page Access Token from DB
 */
function getMetaPageToken($pdo, $pageId)
{
    $stmt = $pdo->prepare("SELECT page_access_token FROM meta_app_configs WHERE page_id = ? AND status = 'active' LIMIT 1");
    $stmt->execute([$pageId]);
    $token = $stmt->fetchColumn();
    return $token ?: false;
}

/**
 * Resolve Page ID and PSID for a Subscriber
 */
function resolveMetaConnection($pdo, $subscriberId)
{
    // Try to get from meta_subscribers first (most reliable for page association)
    // We assume subscriber_id in meta_subscribers might NOT be present if not fully synced, 
    // but we can try reverse lookup if valid.

    // 1. Get meta_psid from subscribers table
    $stmtSub = $pdo->prepare("SELECT meta_psid FROM subscribers WHERE id = ?");
    $stmtSub->execute([$subscriberId]);
    $psid = $stmtSub->fetchColumn();

    if (!$psid) {
        return ['error' => 'No Linked Meta PSID'];
    }

    // 2. Find Page ID for this PSID
    // Since PSID is page-scoped, we theoretically need to know the page context.
    // If the system supports multi-page, psid '123' on Page A is distinct from Page B.
    // However, knowing the PSID usually implies we know the entry point or we check where it exists.
    $stmtMeta = $pdo->prepare("SELECT page_id FROM meta_subscribers WHERE psid = ? LIMIT 1");
    $stmtMeta->execute([$psid]);
    $pageId = $stmtMeta->fetchColumn();

    if (!$pageId) {
        // Fallback: If only one active Page Config exists, assume it belongs to that (Risky but helpful for single-page apps)
        $stmtConfig = $pdo->prepare("SELECT page_id FROM meta_app_configs WHERE status = 'active'");
        $stmtConfig->execute();
        $pages = $stmtConfig->fetchAll(PDO::FETCH_COLUMN);

        if (count($pages) === 1) {
            $pageId = $pages[0];
        } else {
            return ['error' => 'Ambiguous Page Connection (Subscriber matched multiple or no pages)'];
        }
    }

    return [
        'page_id' => $pageId,
        'psid' => $psid
    ];
}

/**
 * Send Meta Message
 * $messageConfig can contain: 'text', 'attachment_url', 'attachment_type'
 */
function sendMetaMessage($pdo, $pageId, $psid, $messageConfig, $flowId = null, $stepId = null, $subscriberId = null)
{
    $token = getMetaPageToken($pdo, $pageId);
    if (!$token) {
        return ['success' => false, 'message' => 'Page Access Token not found or inactive'];
    }

    $url = "https://graph.facebook.com/v21.0/me/messages?access_token=" . $token;

    $payload = [
        'recipient' => ['id' => $psid],
        'messaging_type' => 'RESPONSE' // Default to RESPONSE (Standard 24h window)
    ];

    // Construct Message Body
    // [FIX] Support full payload objects (text + quick_replies, or attachment)
    if (isset($messageConfig['text']) || isset($messageConfig['attachment'])) {
        $payload['message'] = $messageConfig;
    } elseif (!empty($messageConfig['attachment_url'])) {
        $type = $messageConfig['attachment_type'] ?? 'image';
        $payload['message']['attachment'] = [
            'type' => $type,
            'payload' => [
                'url' => $messageConfig['attachment_url'],
                'is_reusable' => true
            ]
        ];
    } else {
        return ['success' => false, 'message' => 'Empty message content'];
    }

    // [FIX] Inject Custom Metadata so Webhook can 100% identify our outbound echoes
    // (Prevents AI from accidentally pausing itself if DB App ID misconfiguration exists)
    $payload['message']['metadata'] = "autoflow_ai_bot";

    // Send Request (using meta_helpers)
    $res = callMetaApi($url, 'POST', $payload);

    if (isset($res['message_id'])) {
        // Success
        // Log to meta_marketing_messages if needed, or generic logs
        // Using existing meta_helpers logMetaJourney?
        // [OPTIMIZATION] User requested to STOP logging bot messages to journey to save DB space
        /*
        logMetaJourney($pdo, $pageId, $psid, 'bot_sent', 'Bot gửi tin nhắn', [
            'flow_id' => $flowId,
            'step_id' => $stepId,
            'message_id' => $res['message_id']
        ]);
        */

        return ['success' => true, 'message_id' => $res['message_id']];
    } else {
        // Error
        $error = $res['error']['message'] ?? 'Unknown Error';
        $code = $res['error']['code'] ?? 0;
        
        // [Vòng 33 FIX] Automatically suspend dead Meta tokens (Error 190 = OAuthException)
        if ($code == 190 || $code == 10 || $code == 102) {
            $pdo->prepare("UPDATE meta_app_configs SET status = 'inactive', updated_at = NOW() WHERE page_id = ?")->execute([$pageId]);
            error_log("Meta Token Suspended for Page: $pageId due to API Error: $code - $error");
        }

        return ['success' => false, 'message' => $error, 'code' => $code];
    }
}

/**
 * Send Sender Action (typing_on, typing_off, mark_seen)
 */
function sendMetaSenderAction($pdo, $pageId, $psid, $action = 'typing_on')
{
    $token = getMetaPageToken($pdo, $pageId);
    if (!$token)
        return false;

    $url = "https://graph.facebook.com/v21.0/me/messages?access_token=" . $token;
    $payload = [
        'recipient' => ['id' => $psid],
        'sender_action' => $action
    ];

    return callMetaApi($url, 'POST', $payload);
}
?>