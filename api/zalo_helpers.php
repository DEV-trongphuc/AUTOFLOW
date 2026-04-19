<?php
/**
 * Zalo Helper Functions
 * Shared logic for OAuth and PKCE
 */

require_once __DIR__ . '/zalo_formatter.php';

function checkZaloAutomationSchema($pdo)
{
    try {
        // [SCHEMA UPDATE] Ensure active_days can store long JSON for per-day schedules
        $pdo->exec("ALTER TABLE zalo_automation_scenarios MODIFY COLUMN active_days TEXT");
    } catch (Exception $e) {
    }
    try {
        $pdo->exec("ALTER TABLE meta_automation_scenarios MODIFY COLUMN active_days TEXT");
    } catch (Exception $e) {
    }
}

/**
 * Generate secure random code verifier
 */
function generateCodeVerifier()
{
    // Generate strictly 43 characters (Alphanumeric) as per Zalo docs
    $chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $len = 43;
    $verifier = '';
    for ($i = 0; $i < $len; $i++) {
        $verifier .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $verifier;
}

/**
 * Base64 URL Encode
 */
function base64UrlEncode($bytes)
{
    return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
}

/**
 * Generate code challenge from verifier using SHA256
 */
function generateCodeChallenge($verifier)
{
    $hash = hash('sha256', $verifier, true);
    return rtrim(strtr(base64_encode($hash), '+/', '-_'), '=');
}

/**
 * Store code verifier in database
 */
function storeCodeVerifier($pdo, $oa_id, $verifier)
{
    try {
        $stmt = $pdo->prepare("UPDATE zalo_oa_configs SET pkce_verifier = ? WHERE id = ?");
        $stmt->execute([$verifier, $oa_id]);
    } catch (Exception $e) {
        error_log("Failed to store PKCE verifier: " . $e->getMessage());
    }
}

/**
 * Retrieve stored code verifier from database
 */
function getCodeVerifier($pdo, $oa_id)
{
    try {
        $stmt = $pdo->prepare("SELECT pkce_verifier FROM zalo_oa_configs WHERE id = ?");
        $stmt->execute([$oa_id]);
        return $stmt->fetchColumn();
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Log a Zalo message (Inbound/Outbound)
 */
function logZaloMsg($pdo, $zaloUserId, $direction, $text)
{
    try {
        $stmt = $pdo->prepare("INSERT INTO zalo_user_messages (zalo_user_id, direction, message_text) VALUES (?, ?, ?)");
        $stmt->execute([$zaloUserId, $direction, $text]);

        // Cleanup: Keep only last 20 messages per user
        $pdo->prepare("DELETE FROM zalo_user_messages WHERE zalo_user_id = ? AND id NOT IN (
            SELECT id FROM (SELECT id FROM zalo_user_messages WHERE zalo_user_id = ? ORDER BY created_at DESC LIMIT 20) as tmp
        )")->execute([$zaloUserId, $zaloUserId]);
    } catch (Exception $e) {
    }
}

/**
 * Log a Zalo subscriber's timeline activity
 * Includes optional msgId for de-duplication
 */
function logZaloSubscriberActivity($pdo, $subscriberId, $type, $refId = null, $details = null, $refName = null, $msgId = null)
{
    try {
        // [DE-DUP] Prevent duplicate 'automation_trigger' logs (Check both main and buffer if possible, but keep it simple for now)
        if ($type === 'automation_trigger') {
            $stmtCheck = $pdo->prepare("SELECT id FROM zalo_subscriber_activity WHERE subscriber_id = ? AND type = ? AND reference_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE) LIMIT 1");
            $stmtCheck->execute([$subscriberId, $type, $refId]);
            if ($stmtCheck->fetch()) {
                return;
            }
        }

        // [OPTIMIZATION] Zalo Activity Buffering
        // Instead of inserting directly into the heavy activity table, we use a buffer.
        $stmtBuf = $pdo->prepare("INSERT INTO zalo_activity_buffer (subscriber_id, type, reference_id, reference_name, details, zalo_msg_id) VALUES (?, ?, ?, ?, ?, ?)");
        $stmtBuf->execute([$subscriberId, $type, $refId, $refName, $details, $msgId]);

    } catch (Exception $e) {
        // Fallback: Create table if missing
        if (strpos($e->getMessage(), "doesn't exist") !== false) {
            try {
                $pdo->exec("CREATE TABLE IF NOT EXISTS zalo_activity_buffer (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    subscriber_id char(36) NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    reference_id VARCHAR(100),
                    reference_name VARCHAR(255),
                    details TEXT,
                    zalo_msg_id VARCHAR(100),
                    processed TINYINT(1) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_processed (processed)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

                $stmtBuf = $pdo->prepare("INSERT INTO zalo_activity_buffer (subscriber_id, type, reference_id, reference_name, details, zalo_msg_id) VALUES (?, ?, ?, ?, ?, ?)");
                $stmtBuf->execute([$subscriberId, $type, $refId, $refName, $details, $msgId]);
            } catch (Exception $ex) {
                // Last resort: log to error log
                error_log("Failed to log Zalo activity: " . $ex->getMessage());
            }
        } else {
            error_log("Failed to log Zalo activity: " . $e->getMessage());
        }
    }
}

/**
 * Send Zalo Automation Reply (CS API)
 */
function sendZaloScenarioReply($pdo, $zaloUserId, $accessToken, $scenario, $userMsg = '')
{
    // Handle AI Reply Type
    if ($scenario['type'] === 'ai_reply' && !empty($scenario['ai_chatbot_id'])) {
        sendZaloAIReply($pdo, $zaloUserId, $accessToken, $scenario, $userMsg);
        return;
    }

    $buttons = json_decode($scenario['buttons'] ?? '[]', true);
    $zaloButtons = [];

    foreach ($buttons as $btn) {
        if (!empty($btn['title'])) {
            $zaloBtn = [
                'title' => $btn['title'],
                'type' => $btn['type'] ?? 'oa.query.show',
            ];

            if (!empty($btn['image_icon'])) {
                $zaloBtn['image_icon'] = $btn['image_icon'];
            }

            $rawPayload = $btn['payload'] ?? '';

            if ($zaloBtn['type'] === 'oa.open.url') {
                // Tracking Injection for Links
                $encodedUrl = base64_encode($rawPayload);
                $encodedLabel = urlencode($zaloBtn['title']);
                $trackUrl = API_BASE_URL . "/zalo_track.php?u=$encodedUrl&sid={$scenario['id']}&uid=$zaloUserId&lbl=$encodedLabel";
                $zaloBtn['payload'] = ['url' => $trackUrl];
            } elseif ($zaloBtn['type'] === 'oa.open.phone') {
                // [NEW] Tracking for Phone - Convert to tracked URL with tel:
                $encodedUrl = base64_encode("tel:$rawPayload");
                $encodedLabel = urlencode($zaloBtn['title'] . " (Call)");
                $trackUrl = API_BASE_URL . "/zalo_track.php?u=$encodedUrl&sid={$scenario['id']}&uid=$zaloUserId&lbl=$encodedLabel";
                $zaloBtn['type'] = 'oa.open.url';
                $zaloBtn['payload'] = ['url' => $trackUrl];
            } else {
                // oa.query.show - No tracking marker to keep UI clean as requested
                $zaloBtn['payload'] = $rawPayload ?: $btn['title'];
            }

            $zaloButtons[] = $zaloBtn;
        }
    }

    $payload = ['recipient' => ['user_id' => $zaloUserId]];

    if ($scenario['message_type'] === 'image' && !empty($scenario['attachment_id'])) {
        // Media Template
        $payload['message'] = [
            'text' => $scenario['content'],
            'attachment' => [
                'type' => 'template',
                'payload' => [
                    'template_type' => 'media',
                    'elements' => [
                        [
                            'media_type' => 'image',
                            'attachment_id' => $scenario['attachment_id'],
                            'title' => $scenario['title'] ?? '',
                            'subtitle' => $scenario['content']
                        ]
                    ]
                ]
            ]
        ];
        if (!empty($zaloButtons)) {
            $payload['message']['attachment']['payload']['buttons'] = $zaloButtons;
        }
        // Format & send single image message
        if (isset($payload['message']['text'])) {
            $payload['message']['text'] = formatZaloMessage($payload['message']['text']);
        }
        _sendZaloPayload($pdo, $zaloUserId, $accessToken, $payload, $scenario['content'] ?? '');
        return;
    }

    // Text Template: strip markdown tru?c
    $textContent = $scenario['content'] ?? '';
    if (!empty($scenario['title'])) {
        $textContent = $scenario['title'] . "\n\n" . $textContent;
    }
    $textContent = formatZaloMessage($textContent);

    // Chia tin nh?n dài thành nhi?u do?n (Zalo gi?i h?n ~1000 ký t?)
    $parts = splitLongMessage($textContent, 900);

    // G?i t?ng do?n; ch? do?n cu?i m?i g?n buttons
    foreach ($parts as $i => $part) {
        $isLastPart = ($i === count($parts) - 1);
        $partPayload = ['recipient' => ['user_id' => $zaloUserId]];

        if ($isLastPart && !empty($zaloButtons)) {
            $partPayload['message'] = [
                'text' => $part,
                'attachment' => [
                    'type' => 'template',
                    'payload' => [
                        'buttons' => array_slice($zaloButtons, 0, 4)
                    ]
                ]
            ];
        } else {
            $partPayload['message'] = ['text' => $part];
        }

        _sendZaloPayload($pdo, $zaloUserId, $accessToken, $partPayload, $part);

        // Delay nh? gi?a các tin d? tránh rate limit
        if (!$isLastPart) {
            usleep(300000); // 0.3 giây
        }
    }
}

/**
 * Internal helper: G?i Zalo CS API và log k?t qu?
 */
function _sendZaloPayload($pdo, $zaloUserId, $accessToken, $payload, $logText)
{
    $ch = curl_init("https://openapi.zalo.me/v3.0/oa/message/cs");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'access_token: ' . $accessToken]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);  // [FIX P38-ZH] Enforce TLS verification
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);     // [FIX P38-ZH] Hostname verification
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);           // [FIX P38-ZH] Prevent indefinite hang on Zalo API slowness
    $resRaw = curl_exec($ch);
    curl_close($ch);

    $res = json_decode($resRaw, true);
    if (isset($res['error']) && $res['error'] == 0) {
        $logged = (strpos($logText, '[Automation]') === 0) ? $logText : "[Automation] " . $logText;
        logZaloMsg($pdo, $zaloUserId, 'outbound', $logged);
    } else {
        file_put_contents(__DIR__ . '/zalo_debug.log', date('[Y-m-d H:i:s] ') . "Send Scenario Failed: " . $resRaw . "\n", FILE_APPEND);
    }
}

/**
 * AI Reply Logic for Zalo
 */
function sendZaloAIReply($pdo, $zaloUserId, $accessToken, $scenario, $userMsg)
{
    if (empty($userMsg))
        return;

    // 1. Call AI Chatbot API
    $url = API_BASE_URL . "/ai_chatbot.php";
    $postData = [
        'message' => $userMsg,
        'property_id' => $scenario['ai_chatbot_id'],
        'visitor_id' => "zalo_" . $zaloUserId,
        'is_test' => false
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

    // [FIX] Disable SSL verification for internal localhost calls
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2); // [FIX P12-C1]

    $resRaw = curl_exec($ch);
    $curlErr = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($resRaw === false) {
        file_put_contents(__DIR__ . '/zalo_debug.log', date('[Y-m-d H:i:s] ') . "AI API cURL Error ($httpCode): " . $curlErr . "\n", FILE_APPEND);
        return;
    }

    $res = json_decode($resRaw, true);
    if (!$res || !($res['success'] ?? false)) {
        file_put_contents(__DIR__ . '/zalo_debug.log', date('[Y-m-d H:i:s] ') . "AI API Response Fail (HTTP $httpCode): " . $resRaw . " | Err: " . json_last_error_msg() . "\n", FILE_APPEND);
        return;
    }

    $aiText = $res['data']['message'] ?? null;
    $quickActions = $res['data']['quick_actions'] ?? [];

    if (!$aiText) {
        file_put_contents(__DIR__ . '/zalo_debug.log', date('[Y-m-d H:i:s] ') . "AI API Empty Message, resRaw: " . $resRaw . "\n", FILE_APPEND);
        return;
    }

    // [FIX] Race condition check: Verify if AI is paused AGAIN right before sending.
    // A human agent might have replied while Gemini was generating this response.
    $stmtCheckPause = $pdo->prepare("SELECT ai_paused_until FROM zalo_subscribers WHERE zalo_user_id = ?");
    $stmtCheckPause->execute([$zaloUserId]);
    $pausedUntil = $stmtCheckPause->fetchColumn();
    if ($pausedUntil && strtotime($pausedUntil) > time()) {
        file_put_contents(__DIR__ . '/zalo_debug.log', date('[Y-m-d H:i:s] ') . "AI Aborted! Human agent replied during generation. Paused until $pausedUntil\n", FILE_APPEND);
        return;
    }

    // 2. Strip toàn b? Markdown tru?c khi x? lý (b? *, **, #, v.v.)
    $aiText = formatZaloMessage($aiText);

    // 3. Parse AI Response for Zalo elements (URL, phone, links)
    $parsed = parseAIResponseForZalo($aiText);

    // Merge Dynamic Quick Actions from AI with parsed buttons
    $finalButtons = $parsed['buttons'];
    foreach ($quickActions as $action) {
        if (count($finalButtons) >= 4)
            break;
        $exists = false;
        
        // Zalo OA API strictly limits button titles to 20 characters.
        $safeTitle = mb_strlen($action, 'UTF-8') > 20 ? mb_substr($action, 0, 17, 'UTF-8') . '...' : $action;
        
        foreach ($finalButtons as $fb) {
            if ($fb['title'] === $safeTitle) {
                $exists = true;
                break;
            }
        }
        if (!$exists) {
            $finalButtons[] = ['title' => $safeTitle, 'type' => 'oa.query.show', 'payload' => $action];
        }
    }

    $cleanText = $parsed['text'];

    // 4. N?u có image, x? lý riêng
    if ($parsed['image_url']) {
        $attachmentId = uploadZaloImageFromUrl($accessToken, $parsed['image_url']);
        if ($attachmentId) {
            $textOnly = trim(str_replace($parsed['image_url'], '', $cleanText));
            $textOnly = preg_replace('/!?\[[^\]]*\]\(\s*\)/', '', $textOnly);
            $textOnly = trim($textOnly);

            if (!empty($textOnly)) {
                $textParts = splitLongMessage($textOnly, 900);
                foreach ($textParts as $part) {
                    _sendZaloPayload($pdo, $zaloUserId, $accessToken, [
                        'recipient' => ['user_id' => $zaloUserId],
                        'message' => ['text' => $part]
                    ], $part);
                    usleep(300000);
                }
            }

            // G?i image kèm buttons
            $imgScenario = [
                'id' => ($scenario['id'] ?? 'ai') . '_img',
                'title' => '',
                'content' => '',
                'message_type' => 'image',
                'attachment_id' => $attachmentId,
                'buttons' => json_encode($finalButtons),
                'type' => 'ai_processed'
            ];
            sendZaloScenarioReply($pdo, $zaloUserId, $accessToken, $imgScenario);
            return;
        }
        // Upload fail ? dùng text v?i URL gi? nguyên
    }

    // 5. Chia tin nh?n dài thành nhi?u do?n (Zalo gi?i h?n ~900 ký t?)
    $parts = splitLongMessage($cleanText, 900);

    foreach ($parts as $i => $part) {
        $isLastPart = ($i === count($parts) - 1);
        $partPayload = ['recipient' => ['user_id' => $zaloUserId]];

        if ($isLastPart && !empty($finalButtons)) {
            $partPayload['message'] = [
                'text' => $part,
                'attachment' => [
                    'type' => 'template',
                    'payload' => [
                        'buttons' => array_slice($finalButtons, 0, 4)
                    ]
                ]
            ];
        } else {
            $partPayload['message'] = ['text' => $part];
        }

        _sendZaloPayload($pdo, $zaloUserId, $accessToken, $partPayload, $part);

        if (!$isLastPart) {
            usleep(300000); // 0.3 giây
        }
    }
}

/**
 * Parse AI Text into Zalo friendly elements
 */
function parseAIResponseForZalo($text)
{
    $buttons = [];
    $imageUrl = null;

    // Detect Image (Exclude Markdown and punctuation boundaries)
    if (preg_match('/(https?:\/\/[^\s\(\)\[\]]+?\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s\(\)\[\]]+)?)/i', $text, $matches)) {
        $imageUrl = $matches[1];
    }

    // Detect Phone
    if (preg_match('/(0|\+84)[3|5|7|8|9][0-9]{8}/', $text, $matches)) {
        $phone = $matches[0];
        $buttons[] = ['title' => 'G?i di?n tu v?n', 'type' => 'oa.open.phone', 'payload' => $phone];
    }

    // Detect Links (Exclude the one already picked as image)
    if (preg_match_all('/(https?:\/\/[^\s\(\)\[\]]+)/i', $text, $matches)) {
        foreach ($matches[0] as $url) {
            // Clean URL from trailing conversational punctuation
            $cleanUrl = rtrim($url, '.,;?!)]');

            if ($cleanUrl === $imageUrl)
                continue;

            // Check for uniqueness
            $isDuplicate = false;
            foreach ($buttons as $b)
                if (($b['payload'] ?? '') === $cleanUrl) {
                    $isDuplicate = true;
                    break;
                }
            if ($isDuplicate)
                continue;

            // Tailor the label
            $label = 'Xem trên Website';
            if (strpos($cleanUrl, 'zalo.me/s/') !== false) {
                $label = 'M? Form dang ký';
            } else if (preg_match('/\.(pdf|docx|doc|xlsx|xls|pptx|ppt|zip|rar)$/i', $cleanUrl)) {
                $label = 'T?i tài li?u';
            }

            $buttons[] = ['title' => $label, 'type' => 'oa.open.url', 'payload' => $cleanUrl];
        }
    }

    return [
        'text' => trim($text),
        'image_url' => $imageUrl,
        'buttons' => array_slice($buttons, 0, 4)
    ];
}

/**
 * Upload Image from URL to Zalo OA
 */
function uploadZaloImageFromUrl($accessToken, $imageUrl)
{
    $imgData = @file_get_contents($imageUrl);
    if (!$imgData)
        return null;

    $tmpFile = tempnam(sys_get_temp_dir(), 'zalo_img');
    file_put_contents($tmpFile, $imgData);

    $ch = curl_init("https://openapi.zalo.me/v2.0/oa/upload/image");
    $cfile = new CURLFile($tmpFile, 'image/jpeg', 'image.jpg');
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['access_token: ' . $accessToken]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, ['file' => $cfile]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

    $resRaw = curl_exec($ch);
    curl_close($ch);
    @unlink($tmpFile);

    $res = json_decode($resRaw, true);
    if (!isset($res['data']['attachment_id'])) {
        file_put_contents(__DIR__ . '/zalo_debug.log', date('[Y-m-d H:i:s] ') . "Image Upload Failed for URL ($imageUrl): " . $resRaw . "\n", FILE_APPEND);
    }
    return $res['data']['attachment_id'] ?? null;
}

/**
 * Get Zalo User Profile (Name, Avatar)
 */
function getZaloUserProfile($accessToken, $userId)
{
    $url = "https://openapi.zalo.me/v3.0/oa/user/detail";
    $params = http_build_query(['data' => json_encode(['user_id' => $userId])]);

    $ch = curl_init("$url?$params");
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['access_token: ' . $accessToken]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

    $res = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($res, true);
    if (isset($data['error']) && $data['error'] == 0 && isset($data['data'])) {
        return $data['data']; // Returns user_id, display_name, avatar, etc.
    }

    // [FALLBACK] V2.0
    $url2 = "https://openapi.zalo.me/v2.0/oa/getprofile";
    $ch2 = curl_init("$url2?$params");
    curl_setopt($ch2, CURLOPT_HTTPHEADER, ['access_token: ' . $accessToken]);
    curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
    $res2 = curl_exec($ch2);
    curl_close($ch2);

    $data2 = json_decode($res2, true);
    if (isset($data2['error']) && $data2['error'] == 0 && isset($data2['data'])) {
        return $data2['data'];
    }

    return null;
}

/**
 * Ensures access token is valid, refreshes if needed.
 * returns the valid access_token or null on failure.
 */
function ensureZaloToken($pdo, $oaId)
{
    // Try finding by internal ID or real OA ID
    $stmt = $pdo->prepare("SELECT id, app_id, app_secret, access_token, refresh_token, token_expires_at FROM zalo_oa_configs WHERE id = ? OR oa_id = ? LIMIT 1");
    $stmt->execute([$oaId, $oaId]);
    $oa = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$oa)
        return null;

    $now = date('Y-m-d H:i:s');
    // Buffer of 5 minutes
    $expiresAt = $oa['token_expires_at'] ? date('Y-m-d H:i:s', strtotime($oa['token_expires_at']) - 300) : null;

    if ($oa['access_token'] && ($expiresAt && $expiresAt > $now)) {
        return $oa['access_token'];
    }

    // [SCALING] ATOMIC REFRESH LOCK
    // Prevent multiple concurrent webhooks from refreshing the same token
    $lockName = "zalo_refresh_" . $oa['id'];
    $pdo->query("SELECT GET_LOCK('$lockName', 10)"); // Wait up to 10s

    try {
        // RE-FETCH: Check if another process already refreshed it while we waited for lock
        $stmtReload = $pdo->prepare("SELECT access_token, refresh_token, token_expires_at FROM zalo_oa_configs WHERE id = ?");
        $stmtReload->execute([$oa['id']]);
        $oa = array_merge($oa, $stmtReload->fetch(PDO::FETCH_ASSOC));

        $expiresAt = $oa['token_expires_at'] ? date('Y-m-d H:i:s', strtotime($oa['token_expires_at']) - 300) : null;
        if ($oa['access_token'] && ($expiresAt && $expiresAt > $now)) {
            $pdo->prepare("SELECT RELEASE_LOCK(?)")->execute([$lockName]); // [FIX P38-ZH] Prepared RELEASE_LOCK
            return $oa['access_token'];
        }

        // Need refresh
        if (empty($oa['refresh_token'])) {
            $pdo->prepare("SELECT RELEASE_LOCK(?)")->execute([$lockName]); // [FIX P38-ZH]
            return null;
        }

        $url = 'https://oauth.zaloapp.com/v4/oa/access_token';
        $params = [
            'app_id' => $oa['app_id'],
            'grant_type' => 'refresh_token',
            'refresh_token' => $oa['refresh_token']
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/x-www-form-urlencoded',
            'secret_key: ' . $oa['app_secret']
        ]);

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http_code === 200) {
            $result = json_decode($response, true);
            if (isset($result['access_token'])) {
                $new_access_token = $result['access_token'];
                $new_refresh_token = $result['refresh_token'] ?? $oa['refresh_token'];
                $expires_at = date('Y-m-d H:i:s', time() + ($result['expires_in'] ?? 86400));

                $stmtU = $pdo->prepare("UPDATE zalo_oa_configs SET access_token = ?, refresh_token = ?, token_expires_at = ?, updated_at = NOW() WHERE id = ?");
                $stmtU->execute([$new_access_token, $new_refresh_token, $expires_at, $oa['id']]);

                $pdo->prepare("SELECT RELEASE_LOCK(?)")->execute([$lockName]); // [FIX P38-ZH]
                return $new_access_token;
            } elseif (isset($result['error']) && $result['error'] != 0) {
                // [Vòng 33 FIX] Suspend dead token to prevent API hammering
                try {
                    $pdo->prepare("UPDATE zalo_oa_configs SET status = 'error_refresh', updated_at = NOW() WHERE id = ?")->execute([$oa['id']]);
                    error_log("Zalo OA Refresh Failed. Status set to error_refresh. OA: {$oa['id']}");
                } catch (Exception $e) {}
            }
        }
    } catch (Exception $e) {
        // Fallback log
    }

    $pdo->prepare("SELECT RELEASE_LOCK(?)")->execute([$lockName]); // [FIX P38-ZH]
    return null;
}


/**
 * Upsert Zalo Subscriber (Centralized Logic)
 */

function upsertZaloSubscriber($pdo, $zaloUserId, $profile, $oaConfigId = null)
{
    $email = "zalo_{$zaloUserId}@zalo-oa.vn";
    $name = $profile['display_name'] ?? 'Unknown Zalo User';
    $zaloTag = "Zalo Follower";
    $avatar = $profile['avatar'] ?? null;

    // Map Zalo Gender: 1=Male, 2=Female, other=Unknown
    $genderRaw = $profile['user_gender'] ?? 0;
    $gender = ($genderRaw == 1) ? 'male' : (($genderRaw == 2) ? 'female' : 'unknown');

    $mainSubId = null;

    try {
        // [CONCURRENCY] Attempt atomic insert first
        $newId = bin2hex(random_bytes(16));
        $tags = json_encode([$zaloTag]);

        $stmtInsert = $pdo->prepare("
            INSERT IGNORE INTO subscribers 
            (id, email, first_name, source, status, zalo_user_id, tags, joined_at, avatar, gender, is_zalo_follower)
            VALUES (?, ?, ?, 'Zalo OA', 'active', ?, ?, NOW(), ?, ?, 1)
        ");
        $stmtInsert->execute([$newId, $email, $name, $zaloUserId, $tags, $avatar, $gender]);

        if ($stmtInsert->rowCount() > 0) {
            $mainSubId = $newId;
        } else {
            // Already exists, update details
            $stmt = $pdo->prepare("SELECT id, tags, avatar, gender, is_zalo_follower FROM subscribers WHERE zalo_user_id = ? OR email = ?");
            $stmt->execute([$zaloUserId, $email]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                $mainSubId = $existing['id'];

                // Update missing fields
                $updateCols = [];
                $params = [];

                $currentTags = json_decode($existing['tags'] ?? '[]', true);
                if (!in_array($zaloTag, $currentTags)) {
                    $currentTags[] = $zaloTag;
                    $updateCols[] = "tags = ?";
                    $params[] = json_encode($currentTags);
                }
                if (empty($existing['avatar']) && $avatar) {
                    $updateCols[] = "avatar = ?";
                    $params[] = $avatar;
                }
                if (empty($existing['zalo_user_id'])) {
                    $updateCols[] = "zalo_user_id = ?";
                    $params[] = $zaloUserId;
                }
                if (empty($existing['is_zalo_follower'])) {
                    $updateCols[] = "is_zalo_follower = 1";
                }

                if (!empty($updateCols)) {
                    $sql = "UPDATE subscribers SET " . implode(', ', $updateCols) . " WHERE id = ?";
                    $params[] = $mainSubId;
                    $pdo->prepare($sql)->execute($params);
                }
            }
        }
    } catch (Exception $e) {
        // Fallback
    }

    // 2. Sync to ZALO_SUBSCRIBERS table (Audience Tab)
    if ($oaConfigId) {
        try {
            // Find List for this OA CONFIG (using oa_config_id)
            $listId = null;
            $stmtL = $pdo->prepare("SELECT id FROM zalo_lists WHERE oa_config_id = ? LIMIT 1");
            $stmtL->execute([$oaConfigId]);
            $listId = $stmtL->fetchColumn();

            if (!$listId) {
                // Create Default List for OA
                // Get OA Name
                $stmtOA = $pdo->prepare("SELECT name, oa_id FROM zalo_oa_configs WHERE id = ?");
                $stmtOA->execute([$oaConfigId]);
                $oaData = $stmtOA->fetch(PDO::FETCH_ASSOC);
                $oaName = $oaData['name'] ?? 'Zalo OA';

                $listId = bin2hex(random_bytes(16));
                $pdo->prepare("INSERT INTO zalo_lists (id, name, oa_config_id, created_at) VALUES (?, ?, ?, NOW())")
                    ->execute([$listId, $oaName, $oaConfigId]);
            }

            // Upsert into zalo_subscribers
            $stmtZ = $pdo->prepare("SELECT id FROM zalo_subscribers WHERE zalo_user_id = ?");
            $stmtZ->execute([$zaloUserId]);
            $existingZId = $stmtZ->fetchColumn();

            // Status: 'active'. Is Follower: 1.
            // Using schema: status=active, is_follower=1, oa_id (real ID)
            $stmtOAReal = $pdo->prepare("SELECT oa_id FROM zalo_oa_configs WHERE id = ?");
            $stmtOAReal->execute([$oaConfigId]);
            $oaRealId = $stmtOAReal->fetchColumn();

            if ($existingZId) {
                $pdo->prepare("UPDATE zalo_subscribers SET is_follower = 1, status = 'active', last_interaction_at = NOW(), display_name = ?, avatar = ?, zalo_list_id = ?, oa_id = ? WHERE id = ?")
                    ->execute([$name, $avatar, $listId, $oaRealId, $existingZId]);
            } else {
                $newZId = bin2hex(random_bytes(16));
                $pdo->prepare("
                    INSERT INTO zalo_subscribers 
                    (id, zalo_list_id, zalo_user_id, display_name, avatar, status, is_follower, oa_id, joined_at, last_interaction_at, created_at)
                    VALUES (?, ?, ?, ?, ?, 'active', 1, ?, NOW(), NOW(), NOW())
                ")->execute([$newZId, $listId, $zaloUserId, $name, $avatar, $oaRealId]);
            }

        } catch (Exception $ex) {
            error_log("Zalo Sync Sub Error: " . $ex->getMessage());
        }
    } else {
        // Fallback if no oaConfigId: Try to just update is_follower if exists
        try {
            $pdo->prepare("UPDATE zalo_subscribers SET is_follower = 1 WHERE zalo_user_id = ?")->execute([$zaloUserId]);
        } catch (Exception $e) {
        }
    }

    if (!$mainSubId) {
        $stmtFallback = $pdo->prepare("SELECT id FROM subscribers WHERE zalo_user_id = ? OR email = ? LIMIT 1");
        $stmtFallback->execute([$zaloUserId, $email]);
        $mainSubId = $stmtFallback->fetchColumn();
    }

    return $mainSubId;
}
