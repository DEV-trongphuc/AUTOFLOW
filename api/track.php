<?php
require_once 'db_connect.php';

// CORS Headers — db_connect.php đã xử lý Access-Control-Allow-Origin đúng cách.
// KHÔNG override ở đây bằng '*' vì tracker.js gửi credentials:include,
// browser sẽ block bất kỳ response nào có Origin: * khi credentials được gửi kèm.
// Chỉ cần khai báo methods và headers bổ sung nếu cần.
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Helper function to normalize URLs by removing tracking parameters
function normalizeUrl($url)
{
    $parsed = parse_url($url);
    if (!$parsed)
        return $url;

    // Parameters to remove when normalizing URLs for deduplication and storage.
    // These tracking params are useful in raw referrer context, but should NOT
    // affect URL identity (which is used for hash-based dedup and analytics grouping).
    // NOTE: mc_cta is our internal CTA tracking param (added by email builder auto-fix).
    //       mc_cid / mc_eid are Mailchimp params — kept for compatibility.
    //       All UTM params are stripped here but preserved in web_sessions utm_* columns.
    $paramsToRemove = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'utm_id',
        'fbclid',
        'gclid',
        'msclkid',
        '_ga',
        '_gl',
        'mc_cid',   // Mailchimp campaign ID
        'mc_eid',   // Mailchimp email ID
        'mc_cta',   // MailFlow Pro CTA tracker (email builder auto-fix)
        'ref',
        'referrer',
        'source'
    ];

    // Build base URL
    $baseUrl = $parsed['scheme'] . '://' . $parsed['host'];
    if (isset($parsed['port'])) {
        $baseUrl .= ':' . $parsed['port'];
    }
    $baseUrl .= $parsed['path'] ?? '/';

    // Parse and filter query parameters
    if (isset($parsed['query'])) {
        parse_str($parsed['query'], $params);
        foreach ($paramsToRemove as $param) {
            unset($params[$param]);
        }
        if (!empty($params)) {
            $baseUrl .= '?' . http_build_query($params);
        }
    }

    // Add fragment if exists
    if (isset($parsed['fragment'])) {
        $baseUrl .= '#' . $parsed['fragment'];
    }

    return $baseUrl;
}


// --- BOT & BLACKLIST FILTERING ---
$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';

// [FIX] IP Spoofing Prevention:
// HTTP_X_FORWARDED_FOR can be faked by any client (e.g. curl -H 'X-Forwarded-For: 66.249.1.1')
// which would trick bot detection and bypass blacklists.
// Cloudflare's HTTP_CF_CONNECTING_IP is injected server-side by Cloudflare and cannot be spoofed.
// We trust it first; only fall back to REMOTE_ADDR (the direct connection IP).
$ip = $_SERVER['HTTP_CF_CONNECTING_IP']   // Cloudflare: real client IP (cannot be spoofed)
    ?? $_SERVER['REMOTE_ADDR']             // Direct connection (no proxy)
    ?? '0.0.0.0';
// Note: HTTP_X_FORWARDED_FOR is intentionally NOT used here at the bot-check stage
// to prevent spoofing. It can be re-added later only for trusted Load Balancer IPs.

// 1. Generic Bot Detection (User Agent)
$botPatterns = [
    'googlebot' => 'Googlebot',
    'bingbot' => 'Bingbot',
    'yandexbot' => 'Yandexbot',
    'duckduckbot' => 'DuckDuckBot',
    'baiduspider' => 'BaiduSpider',
    'facebot' => 'Facebot',
    'facebookexternalhit' => 'Facebook Bot',
    'twitterbot' => 'Twitter Bot',
    'linkedinbot' => 'LinkedIn Bot',
    'chrome-lighthouse' => 'Lighthouse',
    'zalobot' => 'ZaloBot',
    'headlesschrome' => 'Headless Chrome',
    'python' => 'Python Script',
    'wget' => 'Wget',
    'curl' => 'Curl',
    'http-client' => 'HTTP Client',
    'mailflowai' => 'MailFlow Pro Crawler'
];

$isBot = false;
$detectedBotName = null;

// A. Check by IP Range (Highest Priority for known Good Bots)
if (strpos($ip, '66.249.') === 0) {
    $isBot = true;
    $detectedBotName = 'Googlebot';
} elseif (
    strpos($ip, '40.77.') === 0 || strpos($ip, '40.78.') === 0 ||
    strpos($ip, '40.80.') === 0 || strpos($ip, '40.90.') === 0 ||
    strpos($ip, '157.55.') === 0 || strpos($ip, '157.56.') === 0 ||
    strpos($ip, '207.46.') === 0
) {
    $isBot = true;
    $detectedBotName = 'Bingbot';
}

// B. Check by User Agent Pattern (if not already identified by IP)
if (!$isBot) {
    foreach ($botPatterns as $pattern => $name) {
        if (stripos($ua, $pattern) !== false) {
            $isBot = true;
            $detectedBotName = $name;
            break;
        }
    }
}

// 2. IP Blacklist Check
try {
    $stmtBlack = $pdo->prepare("SELECT id FROM web_blacklist WHERE ip_address = ?");
    $stmtBlack->execute([$ip]);
    if ($stmtBlack->fetch()) {
        // Exempt identified bots from the IP blacklist
        // This ensures standard crawlers (Google, Bing, Zalo, etc.) are never blocked
        if (!$isBot) {
            http_response_code(403);
            echo json_encode(['status' => 'error', 'message' => 'Blocked']);
            exit;
        }
    }
} catch (Exception $e) {
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['property_id']) || empty($input['visitor_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Missing ID']);
    exit;
}

// Inject bot info into input if detected for easier processing below
if ($isBot) {
    if (!isset($input['device_info']))
        $input['device_info'] = [];
    $input['device_info']['is_bot'] = true;
    $input['device_info']['bot_name'] = $detectedBotName;
}

// --- SMART ANTI-DDOS PROTECTION ---
// (Skip redundant IP detection since we did it above)
try {
    // [OPTIMIZED] Check for "flood" using EXISTS (faster than COUNT on large tables)
    // Limits check to the most recent interaction.
    $stmtFlood = $pdo->prepare("
        SELECT 1 
        FROM web_events 
        WHERE visitor_id = ? 
        AND created_at > DATE_SUB(NOW(), INTERVAL 3 SECOND) 
        LIMIT 10
    ");
    $stmtFlood->execute([$input['visitor_id']]);
    $floodEvents = $stmtFlood->fetchAll();

    if (count($floodEvents) >= 10) {
        http_response_code(429); // Too Many Requests
        echo json_encode(['status' => 'error', 'message' => 'Anti-DDoS: Request rate limited']);
        exit;
    }
} catch (Exception $e) {
    // Silently continue if flood check fails to avoid blocking legitimate traffic
}

$propertyId = $input['property_id'];
$visitorUuid = $input['visitor_id'];
$events = $input['events'] ?? [];

try {
    // 1. Identify or Create Visitor
    $stmtVis = $pdo->prepare("SELECT id, subscriber_id FROM web_visitors WHERE id = ?");
    $stmtVis->execute([$visitorUuid]);
    $visitorData = $stmtVis->fetch(PDO::FETCH_ASSOC);

    // --- SECURITY & CACHE ---
    // Cache domain check for the property
    static $propCache = [];
    if (!isset($propCache[$propertyId])) {
        $stmtDomain = $pdo->prepare("SELECT domain FROM web_properties WHERE id = ?");
        $stmtDomain->execute([$propertyId]);
        $registeredDomain = $stmtDomain->fetchColumn();
        if (!$registeredDomain) {
            http_response_code(403);
            exit(json_encode(['status' => 'error', 'message' => 'Unauthorized']));
        }
        $propCache[$propertyId] = $registeredDomain;
    }

    // Capture IP — same safe logic as bot-check section above
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

    // --- GEOLOCATION DETECTION (CLOUDFLARE FIRST) ---
    // Cloudflare sends Country in 'HTTP_CF_IPCOUNTRY'
    $country = $_SERVER['HTTP_CF_IPCOUNTRY'] ?? null;
    $city = $_SERVER['HTTP_CF_IPCITY'] ?? null;
    // Cloudflare uses 'XX' for unknown country
    if ($country === 'XX')
        $country = null;

    if (!$visitorData) {
        // Create new visitor
        $stmtIns = $pdo->prepare("INSERT INTO web_visitors (id, property_id, first_visit_at, last_visit_at, ip_address, country, city, data) VALUES (?, ?, NOW(), NOW(), ?, ?, ?, ?)");
        $stmtIns->execute([$visitorUuid, $propertyId, $ip, $country, $city, json_encode($input['device_info'] ?? [])]);

        // If Cloudflare didn't provide location, fallback to background Job (ip-api)
        if (!$country) {
            dispatchQueueJob($pdo, 'high', ['action' => 'resolve_geo', 'visitor_id' => $visitorUuid, 'ip' => $ip]);
        }
    } else {
        // Update visitor: Always update last_visit and IP. 
        // If Country/City provided (by Cloudflare), update them.
        $updateSql = "UPDATE web_visitors SET last_visit_at = NOW(), ip_address = ?";
        $updateParams = [$ip];

        if ($country) {
            $updateSql .= ", country = ?, city = ?";
            $updateParams[] = $country;
            $updateParams[] = $city;
        }

        $updateSql .= " WHERE id = ?";
        $updateParams[] = $visitorUuid;

        $pdo->prepare($updateSql)->execute($updateParams);
    }

    $stmtSess = $pdo->prepare("SELECT id, page_count, os, browser, device_type FROM web_sessions WHERE visitor_id = ? AND property_id = ? AND last_active_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE) ORDER BY id DESC LIMIT 1");
    $stmtSess->execute([$visitorUuid, $propertyId]);
    $session = $stmtSess->fetch(PDO::FETCH_ASSOC);

    $ua = $input['device_info']['ua'] ?? $_SERVER['HTTP_USER_AGENT'] ?? '';
    $os = $input['device_info']['os'] ?? ($session['os'] ?? 'Unknown');
    $browser = $input['device_info']['browser'] ?? ($session['browser'] ?? 'Unknown');
    $deviceType = $session['device_type'] ?? 'desktop';

    // SERVER-SIDE FALLBACK for OS/Browser detection if client-side failed
    if (empty($os) || $os === 'Unknown') {
        if (stripos($ua, 'Windows') !== false)
            $os = 'Windows';
        elseif (stripos($ua, 'Android') !== false)
            $os = 'Android';
        elseif (stripos($ua, 'iPhone') !== false || stripos($ua, 'iPad') !== false || stripos($ua, 'iPod') !== false)
            $os = 'iOS';
        elseif (stripos($ua, 'Macintosh') !== false || stripos($ua, 'Mac OS X') !== false)
            $os = 'macOS';
        elseif (stripos($ua, 'Linux') !== false)
            $os = 'Linux';
    }
    if (empty($browser) || $browser === 'Unknown') {
        if (stripos($ua, 'Chrome') !== false && stripos($ua, 'Edge') === false && stripos($ua, 'Edg/') === false && stripos($ua, 'OPR/') === false)
            $browser = 'Chrome';
        elseif (stripos($ua, 'Safari') !== false && stripos($ua, 'Chrome') === false)
            $browser = 'Safari';
        elseif (stripos($ua, 'Firefox') !== false)
            $browser = 'Firefox';
        elseif (stripos($ua, 'Edge') !== false || stripos($ua, 'Edg/') !== false)
            $browser = 'Edge';
        elseif (stripos($ua, 'OPR/') !== false || stripos($ua, 'Opera') !== false)
            $browser = 'Opera';
    }

    if (!$session) {
        // Create Session
        if (empty($os) || $os === 'Unknown')
            $os = 'Unknown';
        if (empty($browser) || $browser === 'Unknown')
            $browser = 'Unknown';

        // Advanced Bot Detection (Data Center & Location)
        $dcCities = ['Ashburn', 'Sterling', 'Jinrongjie', 'Prineville', 'Boydton', 'Boardman', 'The Dalles', 'Dublin', 'Piscataway', 'Quincy'];
        // Strict Check: Must be in DC City AND ((No OS AND No Browser) OR Explicit Bot Flag)
        $isUnknownDevice = ($os === 'Unknown' || empty($os)) && ($browser === 'Unknown' || empty($browser));
        $isExplicitBot = isset($input['device_info']['is_bot']) && $input['device_info']['is_bot'];

        if (in_array($city, $dcCities) && ($isUnknownDevice || $isExplicitBot)) {
            $deviceType = 'bot';
            if ($city === 'Jinrongjie')
                $browser = 'ByteSpider';
            elseif ($city === 'Quincy')
                $browser = 'Bingbot';
            elseif (in_array($city, ['Ashburn', 'Sterling', 'Prineville', 'Boydton', 'Boardman', 'The Dalles', 'Dublin', 'Piscataway']))
                $browser = 'Amazonbot';
            else
                $browser = 'Data Center Bot';
        } elseif (isset($input['device_info']['is_bot']) && $input['device_info']['is_bot']) {
            $deviceType = 'bot';
            $browser = $input['device_info']['bot_name'] ?? 'Generic Bot';
        } elseif (preg_match('/(tablet|ipad|playbook)|(android(?!.*(mobi|opera mini)))/i', $ua)) {
            $deviceType = 'tablet';
        } elseif (preg_match('/(up.browser|up.link|mmp|symbian|smartphone|midp|wap|phone|android|iemobile)/i', $ua)) {
            $deviceType = 'mobile';
        }

        $src = $input['traffic_source'] ?? [];
        $utmSource = $src['utm_source'] ?? null;
        $utmMedium = $src['utm_medium'] ?? null;
        $utmCampaign = $src['utm_campaign'] ?? null;
        $utmContent = $src['utm_content'] ?? null;
        $utmTerm = $src['utm_term'] ?? null;

        $stmtNewSess = $pdo->prepare("INSERT INTO web_sessions (visitor_id, property_id, started_at, last_active_at, device_type, os, browser, page_count, is_bounce, utm_source, utm_medium, utm_campaign, utm_content, utm_term) VALUES (?, ?, NOW(), NOW(), ?, ?, ?, 0, 1, ?, ?, ?, ?, ?)");
        $stmtNewSess->execute([$visitorUuid, $propertyId, $deviceType, $os, $browser, $utmSource, $utmMedium, $utmCampaign, $utmContent, $utmTerm]);
        $sessionId = $pdo->lastInsertId();
        $sessionPageCount = 0;

        // Auto-Cleanup: Keep only last 100 bot sessions for this property to save space
        if ($deviceType === 'bot') {
            // Delete bots older than the 100th newest bot session
            // Subquery finds the ID of the 100th newest bot. We delete anything showing up before that ID.
            $sqlCleanup = "DELETE FROM web_sessions 
                           WHERE property_id = ? 
                           AND device_type = 'bot' 
                           AND id < (
                               SELECT id FROM (
                                   SELECT id 
                                   FROM web_sessions 
                                   WHERE property_id = ? 
                                   AND device_type = 'bot' 
                                   ORDER BY id DESC 
                                   LIMIT 1 OFFSET 100
                               ) AS subquery
                           )";
            $pdo->prepare($sqlCleanup)->execute([$propertyId, $propertyId]);
        }

        // Increment visit_count in web_visitors
        $pdo->prepare("UPDATE web_visitors SET visit_count = visit_count + 1 WHERE id = ?")->execute([$visitorUuid]);
    } else {
        $sessionId = $session['id'];
        $sessionPageCount = $session['page_count'];

        // Enrich session data if missing (Self-Healing)
        $updates = [];
        $params = [];

        // 10M UPGRADE: Debounce Last Active Update (Only update if > 30s passed)
        $lastActive = strtotime($session['last_active_at'] ?? '0');
        if (time() - $lastActive > 30) {
            $updates[] = "last_active_at = NOW()";
        }

        $newOs = $input['device_info']['os'] ?? 'Unknown';
        $newBrowser = $input['device_info']['browser'] ?? 'Unknown';

        if ((!$session['os'] || $session['os'] === 'Unknown') && $newOs !== 'Unknown') {
            $updates[] = "os = ?";
            $params[] = $newOs;
        }
        if ((!$session['browser'] || $session['browser'] === 'Unknown') && $newBrowser !== 'Unknown') {
            $updates[] = "browser = ?";
            $params[] = $newBrowser;
        }

        if (!empty($updates)) {
            $params[] = $sessionId;
            $sql = "UPDATE web_sessions SET " . implode(', ', $updates) . " WHERE id = ?";
            $pdo->prepare($sql)->execute($params);
        }
    }

    // 3. Process Events in BATCH
    $pageViews = [];
    $otherEvents = [];
    $hasInteraction = false;
    $maxDuration = 0;
    $maxPageTime = 0;
    $maxScroll = 0;

    // Identification Sync for response
    $email = null;
    $phone = null;
    $emailSubscriberId = null; // [FIX] Initialize here to avoid PHP 8 "Undefined variable" warning
    // when no 'identify' event is present in the batch (pageview/scroll only requests)
    $subscriberFirstName = null;
    $subscriberLastName = null;
    $subscriberAvatar = null;

    foreach ($events as $event) {
        $type = $event['type'];
        $data = $event['data'] ?? [];

        // --- RELIABILITY: EXTRACT CONTEXT FROM ANY EVENT ---
        // Since tracker.js now attaches current time/scroll to all interactions (click/scroll/etc),
        // we extract these redundant fields here to prevent data loss if the exit ping fails.
        if (isset($data['page_time'])) {
            $maxPageTime = min(3600, max((int) $maxPageTime, (int) $data['page_time']));
        }
        if (isset($data['duration'])) {
            $maxDuration = min(7200, max((int) $maxDuration, (int) $data['duration']));
        }
        if (isset($data['max_scroll'])) {
            $maxScroll = max((int) $maxScroll, (int) $data['max_scroll']);
        }
        if ($type === 'scroll' && isset($data['percent'])) {
            $maxScroll = max((int) $maxScroll, (int) $data['percent']);
        }

        if ($type === 'pageview') {
            $url = normalizeUrl($data['url'] ?? '');
            $hash = md5($url);
            $loadTime = (int) ($data['load_time'] ?? 0);
            $pageViews[] = [$sessionId, $visitorUuid, $propertyId, $hash, $url, $data['title'] ?? '', $loadTime];
            $sessionPageCount++;
        } elseif ($type === 'ping') {
            // Processing handled by redundant extraction at top of loop
        } elseif ($type === 'identify') {
            // Handle identification - Link visitor with subscriber
            $email = $data['email'] ?? null;
            $phone = $data['phone'] ?? null;

            if ($email || $phone) {
                // Try to find matching subscriber
                $emailSubscriberId = null;
                $subscriberFirstName = null;
                $subscriberLastName = null;
                $subscriberAvatar = null;

                // [FIX] Extract Name from Payload
                $payloadFirstName = $data['firstName'] ?? ($data['first_name'] ?? null);
                $payloadLastName = $data['lastName'] ?? ($data['last_name'] ?? null);

                // [FIX] Áp dụng Named Lock để chống race condition khi Tracking và Form API gọi cùng lúc
                $lockIdentifier = $email ?: $phone;
                $lockName = $lockIdentifier ? "sub_email_" . md5($lockIdentifier) : null;
                if ($lockName) {
                    $pdo->query("SELECT GET_LOCK('$lockName', 5)");
                }

                // 1. Check subscribers table (Email/Zalo marketing)
                if ($email) {
                    $stmt = $pdo->prepare("SELECT id, first_name, last_name, avatar FROM subscribers WHERE email = ? LIMIT 1");
                    $stmt->execute([$email]);
                    $subscriber = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($subscriber) {
                        $emailSubscriberId = $subscriber['id'];
                        $subscriberFirstName = $subscriber['first_name'] ?? null;
                        $subscriberLastName = $subscriber['last_name'] ?? null;
                        $subscriberAvatar = $subscriber['avatar'] ?? null;
                    }
                }

                if (!$emailSubscriberId && $phone) {
                    $stmt = $pdo->prepare("SELECT id, first_name, last_name, avatar FROM subscribers WHERE phone_number = ? LIMIT 1");
                    $stmt->execute([$phone]);
                    $subscriber = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($subscriber) {
                        $emailSubscriberId = $subscriber['id'];
                        $subscriberFirstName = $subscriber['first_name'] ?? null;
                        $subscriberLastName = $subscriber['last_name'] ?? null;
                        $subscriberAvatar = $subscriber['avatar'] ?? null;
                    }
                }

                // 2. Check Zalo Subscribers (Link Zalo Context)
                $zaloSubscriberId = null;
                // Check by Phone matches Zalo
                if ($phone) {
                    $stmtZ = $pdo->prepare("SELECT zalo_user_id FROM zalo_subscribers WHERE phone_number = ? LIMIT 1");
                    $stmtZ->execute([$phone]);
                    $zs = $stmtZ->fetchColumn();
                    if ($zs)
                        $zaloSubscriberId = $zs;
                }
                // Check by Manual Email matches Zalo
                if (!$zaloSubscriberId && $email) {
                    $stmtZ = $pdo->prepare("SELECT zalo_user_id FROM zalo_subscribers WHERE manual_email = ? LIMIT 1");
                    $stmtZ->execute([$email]);
                    $zs = $stmtZ->fetchColumn();
                    if ($zs)
                        $zaloSubscriberId = $zs;
                }

                if ($emailSubscriberId) {
                    // Update web_visitor mapping synchronously
                    $pdo->prepare("UPDATE web_visitors SET subscriber_id = ?, email = ?, phone = ?, zalo_user_id = COALESCE(zalo_user_id, ?) WHERE id = ?")
                        ->execute([$emailSubscriberId, $email, $phone, $zaloSubscriberId, $visitorUuid]);

                    // SYNC METADATA TO SUBSCRIBER (New Req)
                    // [FIX] NULLIF wraps each column so empty strings ("") are treated as NULL.
                    // Without NULLIF: COALESCE("", "Hanoi") → "" (empty beats new value).
                    // COALESCE only skips NULL, not empty string — very common PHP/MySQL gotcha.
                    // With NULLIF: COALESCE(NULLIF("",""), "Hanoi") → "Hanoi" ✅
                    $updateSql = "UPDATE subscribers SET 
                        last_os = COALESCE(NULLIF(last_os, ''), ?), 
                        last_browser = COALESCE(NULLIF(last_browser, ''), ?), 
                        last_device = COALESCE(NULLIF(last_device, ''), ?), 
                        last_city = COALESCE(NULLIF(last_city, ''), ?), 
                        last_country = COALESCE(NULLIF(last_country, ''), ?), 
                        last_ip = COALESCE(NULLIF(last_ip, ''), ?),
                        city = COALESCE(NULLIF(city, ''), ?),
                        country = COALESCE(NULLIF(country, ''), ?),
                        address = COALESCE(NULLIF(address, ''), ?),
                        zalo_user_id = COALESCE(NULLIF(zalo_user_id, ''), ?)";

                    $updateParams = [$os, $browser, $deviceType, $city, $country, $ip, $city, $country, $data['address'] ?? null, $zaloSubscriberId];

                    if ($payloadFirstName) {
                        // Merge: if both firstName AND lastName came from tracking,
                        // store only full name in first_name to avoid display duplication
                        $mergedName = trim($payloadFirstName . ($payloadLastName ? ' ' . $payloadLastName : ''));
                        $updateSql .= ", first_name = ?";
                        $updateParams[] = $mergedName;
                        $subscriberFirstName = $mergedName;
                    }
                    // NOTE: last_name intentionally NOT updated from tracking payload to prevent duplication

                    $updateSql .= " WHERE id = ?";
                    $updateParams[] = $emailSubscriberId;

                    $pdo->prepare($updateSql)->execute($updateParams);

                    // 10M UPGRADE: Async Profile Enrichment (Names, Attributes, Tags, Scoring)
                    dispatchQueueJob($pdo, 'default', ['action' => 'enrich_subscriber', 'subscriber_id' => $emailSubscriberId, 'data' => $data]);

                } else {
                    // AUTO-CREATE LOGIC (Keep sync for ID consistency)
                    $priority = (int) ($data['priority'] ?? 0);
                    // [FIX] PHP 8.1: preg_match() throws Deprecated warning if $email is null
                    // (e.g. identify event submitted with phone only, no email field).
                    // Null floods error logs with millions of warnings at scale.
                    $isSystemEmail = preg_match('/^(info|support|contact|admin|sales|billing|webmaster|help|no-reply|noreply)@/i', $email ?? '');

                    if (($priority >= 1 && $email) || ($email && !$isSystemEmail)) {
                        $newSid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));

                        // Merge firstName + lastName into first_name only to avoid display duplication
                        $finalFirstName = $payloadFirstName
                            ? trim($payloadFirstName . ($payloadLastName ? ' ' . $payloadLastName : ''))
                            : ($email ? explode('@', $email)[0] : 'Visitor');
                        $finalLastName = ''; // Always empty on auto-create from tracking

                        $pdo->prepare("INSERT INTO subscribers (id, property_id, email, phone_number, first_name, last_name, status, source, last_os, last_browser, last_device, last_city, last_country, city, country, address, last_ip, zalo_user_id) VALUES (?, ?, ?, ?, ?, ?, 'active', 'website_tracking', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
                            ->execute([$newSid, $propertyId, $email, $phone, $finalFirstName, $finalLastName, $os, $browser, $deviceType, $city, $country, $city, $country, $data['address'] ?? null, $ip, $zaloSubscriberId]);

                        $pdo->prepare("UPDATE web_visitors SET subscriber_id = ?, email = ?, phone = ?, address = ?, zalo_user_id = COALESCE(zalo_user_id, ?) WHERE id = ?")
                            ->execute([$newSid, $email, $phone, $data['address'] ?? null, $zaloSubscriberId, $visitorUuid]);

                        $emailSubscriberId = $newSid;
                        $subscriberFirstName = $finalFirstName;
                        $subscriberLastName = $finalLastName;

                        // Async Enrichment for the new subscriber
                        dispatchQueueJob($pdo, 'default', ['action' => 'enrich_subscriber', 'subscriber_id' => $newSid, 'data' => $data]);
                        dispatchQueueJob($pdo, 'default', [
                            'action' => 'notify_captured_lead',
                            'property_id' => $propertyId,
                            'lead_data' => [
                                'Họ tên' => trim("$finalFirstName $finalLastName"),
                                'Email' => $email,
                                'Số điện thoại' => $phone,
                                'Nguồn truy cập' => $data['traffic_source']['utm_source'] ?? 'Trực tiếp',
                                'Trang để lại thông tin' => $_SERVER['HTTP_REFERER'] ?? 'Website'
                            ],
                            'source' => 'AutoCapture'
                        ]);
                    } else {
                        // Just update visitor columns without creating subscriber
                        $pdo->prepare("UPDATE web_visitors SET email = ?, phone = ?, zalo_user_id = COALESCE(zalo_user_id, ?) WHERE id = ?")
                            ->execute([$email, $phone, $zaloSubscriberId, $visitorUuid]);
                    }
                }

                // Refresh names/avatar for response (Try sync first, fallback to generic)
                if ($emailSubscriberId) {
                    $stmtRef = $pdo->prepare("SELECT first_name, last_name, avatar FROM subscribers WHERE id = ?");
                    $stmtRef->execute([$emailSubscriberId]);
                    $ref = $stmtRef->fetch(PDO::FETCH_ASSOC);
                    if ($ref) {
                        $subscriberFirstName = $ref['first_name'] ?? null;
                        $subscriberLastName = $ref['last_name'] ?? null;
                        $subscriberAvatar = $ref['avatar'] ?? null;
                    }
                }

                if ($email) {
                    dispatchQueueJob($pdo, 'high', ['action' => 'identify_visitor', 'visitor_id' => $visitorUuid, 'email' => $email, 'phone_number' => $phone]);
                }
                
                if (isset($lockName) && $lockName) {
                    $pdo->query("SELECT RELEASE_LOCK('$lockName')");
                }
            }
        } else {
            $otherEvents[] = $event;
            if (in_array($type, ['click', 'form', 'copy', 'select']))
                $hasInteraction = true;
        }
    }

    // Batch Insert Page Views
    if (!empty($pageViews)) {
        // No schema checks here (moved to migration)
        $sql = "INSERT INTO web_page_views (session_id, visitor_id, property_id, url_hash, url, title, load_time_ms, is_entrance, loaded_at) VALUES ";
        $placeholders = [];
        $params = [];

        // Determine Entrance:
        // If the session had 0 pages before this batch, the FIRST pageview in this batch is the Entrance.
        $isSessionNew = ($sessionPageCount === 0);

        foreach ($pageViews as $index => $pv) {
            // $pv structure: [$sessionId, $visitorUuid, $propertyId, $hash, $url, $title, $loadTime]

            // Logic: It is an entrance ONLY if it's the first PV of a new session
            // Note: $pageViews array preserves order from Client (which should be chronological)
            $isEntrance = ($isSessionNew && $index === 0) ? 1 : 0;

            $placeholders[] = "(?, ?, ?, ?, ?, ?, ?, ?, NOW())";

            // Add is_entrance to params
            // Original $pv has 7 elements. We need to insert is_entrance at the end.
            $params = array_merge($params, $pv, [$isEntrance]);
        }
        $pdo->prepare($sql . implode(', ', $placeholders))->execute($params);

        // Update session page count ATOMICALLY
        // Bounce = single page AND no meaningful interaction
        // Check atomic page_count to determine bounce status
        $addedCount = count($pageViews);
        // [FIX] Bounce Rate calculation bug (MySQL UPDATE column reference behavior):
        // In MySQL, when multiple columns are updated in one SET clause, later expressions
        // see the ALREADY-UPDATED value of earlier columns — not the original DB value.
        // So after "page_count = page_count + $addedCount", the page_count column already
        // holds the NEW value. The IF check must use page_count directly (new value), NOT
        // add $addedCount again (which would double-count and mark every 1-page visit as non-bounce).
        //
        // BEFORE (WRONG): IF((page_count + ?) > 1, ...) — page_count here is already the NEW value!
        //   e.g. old=0, addedCount=1 → page_count becomes 1 → IF((1+1)>1) → marks as non-bounce ❌
        // AFTER  (CORRECT): IF(page_count > 1, ...) — uses the newly updated value
        //   e.g. old=0, addedCount=1 → page_count becomes 1 → IF(1>1) → stays bounce ✅
        $pdo->prepare("UPDATE web_sessions SET page_count = page_count + ?, is_bounce = IF(page_count > 1, 0, is_bounce) WHERE id = ?")->execute([$addedCount, $sessionId]);

        // Explicitly clear bounce if interaction occurred (handled below, but good to ensure logic consistency)
        if ($hasInteraction) {
            $pdo->prepare("UPDATE web_sessions SET is_bounce = 0 WHERE id = ?")->execute([$sessionId]);
        }
    }

    // Update Session Ping Data (accumulated)
    if ($maxDuration > 0 || $maxScroll > 0) {
        $pdo->prepare("UPDATE web_sessions SET duration_seconds = GREATEST(duration_seconds, ?), last_active_at = NOW() WHERE id = ?")
            ->execute([$maxDuration, $sessionId]);

        // Update last PV time/scroll
        $stmtLastPv = $pdo->prepare("SELECT id FROM web_page_views WHERE session_id = ? ORDER BY id DESC LIMIT 1");
        $stmtLastPv->execute([$sessionId]);
        $lastPvId = $stmtLastPv->fetchColumn();
        if ($lastPvId) {
            $pdo->prepare("UPDATE web_page_views SET time_on_page = GREATEST(time_on_page, ?), scroll_depth = GREATEST(scroll_depth, ?) WHERE id = ?")
                ->execute([$maxPageTime, $maxScroll, $lastPvId]);
        }
    }

    // [OPTIMIZED] Batch Insert Other Events
    if (!empty($otherEvents)) {
        $stmtLastPv = $pdo->prepare("SELECT id FROM web_page_views WHERE session_id = ? ORDER BY id DESC LIMIT 1");
        $stmtLastPv->execute([$sessionId]);
        $pvId = $stmtLastPv->fetchColumn();

        $processedClickSignatures = [];
        $eventValues = [];
        $eventPlaceholders = [];

        $finalScrolls = [];
        foreach ($otherEvents as $evt) {
            $type = $evt['type'];
            $targetSelector = $evt['data']['selector'] ?? null;
            $targetText = ($type === 'scroll') ? ($evt['data']['percent'] ?? null) : ($evt['data']['text'] ?? null);
            // [FIX] Truncate untrusted text fields before DB insert.
            // A malicious POST with 100KB 'text' payload causes MySQL "Data too long for column"
            // which crashes the ENTIRE batch (loses all valid pageviews/clicks in same request).
            if (is_string($targetText) && mb_strlen($targetText) > 255) {
                $targetText = mb_substr($targetText, 0, 250) . '...';
            }
            $metaData = json_encode($evt['data'] ?? []);
            // [FIX] Guard oversized JSON payload (e.g. injected base64 image in meta_data)
            if (strlen($metaData) > 5000) {
                $metaData = json_encode(['error' => 'Payload too large', 'type' => $type]);
            }

            // Handle Scroll Events separately for deduplication
            if ($type === 'scroll') {
                $pVal = (int) $targetText;
                if ($pVal > 0) {
                    $pidKey = $pvId ?: 0;
                    $finalScrolls[$pidKey] = max($finalScrolls[$pidKey] ?? 0, $pVal);
                }
                continue;
            }

            // 1. DEDUPLICATION FOR CLICKS
            if ($type === 'click' && $pvId) {
                $signature = md5($targetText . $targetSelector . $pvId);
                if (isset($processedClickSignatures[$signature])) {
                    continue;
                }
                $processedClickSignatures[$signature] = true;
            }

            $eventPlaceholders[] = "(?, ?, ?, ?, ?, ?, ?, ?, NOW())";
            $eventValues[] = $sessionId;
            $eventValues[] = $pvId ?: null;
            $eventValues[] = $visitorUuid;
            $eventValues[] = $propertyId;
            $eventValues[] = $type;
            $eventValues[] = $targetSelector;
            $eventValues[] = $targetText;
            $eventValues[] = $metaData;
        }

        // Process Consolidated Scrolls
        foreach ($finalScrolls as $pidKey => $percent) {
            $pidValue = ($pidKey === 0) ? null : $pidKey;
            try {
                // [FIX] Check for existence first to avoid duplicate inserts when percent hasn't changed
                $stmtCheck = $pdo->prepare("SELECT id FROM web_events WHERE visitor_id = ? AND " . ($pidValue ? "page_view_id = ?" : "page_view_id IS NULL") . " AND event_type = 'scroll' LIMIT 1");
                $checkParams = [$visitorUuid];
                if ($pidValue)
                    $checkParams[] = $pidValue;
                $stmtCheck->execute($checkParams);
                $existingId = $stmtCheck->fetchColumn();

                if ($existingId) {
                    $pdo->prepare("UPDATE web_events SET target_text = GREATEST(0 + IFNULL(target_text, 0), ?), created_at = NOW() WHERE id = ?")
                        ->execute([$percent, $existingId]);
                } else {
                    $eventPlaceholders[] = "(?, ?, ?, ?, 'scroll', NULL, ?, NULL, NOW())";
                    array_push($eventValues, $sessionId, $pidValue, $visitorUuid, $propertyId, $percent);
                }
            } catch (Exception $e) { /* silent skip */
            }
        }

        if (!empty($eventValues)) {
            $sqlEvents = "INSERT INTO web_events (session_id, page_view_id, visitor_id, property_id, event_type, target_selector, target_text, meta_data, created_at) VALUES " . implode(", ", $eventPlaceholders);
            $pdo->prepare($sqlEvents)->execute($eventValues);
        }

        if ($hasInteraction) {
            $pdo->prepare("UPDATE web_sessions SET is_bounce = 0 WHERE id = ?")->execute([$sessionId]);
        }
    }

    // 4. Record Journey to Subscriber Activity (Async)
    $finalSubscriberId = $visitorData['subscriber_id'] ?? $emailSubscriberId;
    if ($finalSubscriberId && !empty($events)) {
        dispatchQueueJob($pdo, 'default', [
            'action' => 'sync_web_journey',
            'subscriber_id' => $finalSubscriberId,
            'visitor_id' => $visitorUuid,
            'events' => $events
        ]);
    }

    // 5. Async Aggregation (Crucial for 1M/day)
    dispatchQueueJob($pdo, 'low', ['action' => 'aggregate_daily', 'property_id' => $propertyId, 'date' => date('Y-m-d')]);

    // 6. Final response - Minimal & Stealthy
    $response = ['status' => 'ok'];

    // Only return identity sync if we actually have meaningful data to share with the client
    if ($email || $phone || $subscriberFirstName || $subscriberLastName) {
        $response['identified_as'] = [
            'email' => $email,
            'phone' => $phone,
            'firstName' => $subscriberFirstName,
            'lastName' => $subscriberLastName,
            'avatar' => $subscriberAvatar
        ];
    }

    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    exit;
}
?>