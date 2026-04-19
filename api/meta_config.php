<?php
// Set CORS headers FIRST before any other code
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'db_connect.php';
require_once 'auth_middleware.php';
require_once 'meta_helpers.php';

$method = $_SERVER['REQUEST_METHOD'];
$route = $_GET['route'] ?? null;
$id = $_GET['id'] ?? null;

try {
    // =========================================================================
    // GET: List or Single Config
    // =========================================================================
    if ($method === 'GET') {
        if ($id) {
            // Get Single
            $stmt = $pdo->prepare("SELECT * FROM meta_app_configs WHERE id = ?");
            $stmt->execute([$id]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);
            jsonResponse(true, $item);
        } else {
            // Get List with Subscriber Counts
            $stmt = $pdo->query("
                SELECT c.*, 
                   (SELECT COUNT(*) FROM meta_subscribers s WHERE s.page_id = c.page_id) as subscriber_count
                FROM meta_app_configs c 
                ORDER BY c.created_at DESC
            ");
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            jsonResponse(true, $items);
        }
    }

    // =========================================================================
    // POST: Create, Update, Test
    // =========================================================================
    elseif ($method === 'POST') {
        $input = getJsonInput();

        if ($route === 'get-pages') {
            // -------------------------------------------------------------
            // Route: Get Pages from User Access Token
            // Fetches all pages user manages and exchanges for Page Tokens
            // -------------------------------------------------------------
            $userAccessToken = $input['user_access_token'] ?? '';
            $appId = $input['app_id'] ?? '';
            $appSecret = $input['app_secret'] ?? '';

            if (!$userAccessToken) {
                jsonResponse(false, null, 'User Access Token is required');
            }

            // Step 1: Exchange for Long-lived token if App ID/Secret provided
            if ($appId && $appSecret) {
                $exchangeUrl = "https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=$appId&client_secret=$appSecret&fb_exchange_token=$userAccessToken";
                $ch = curl_init($exchangeUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);  // [FIX P15-C1] External Meta API — must verify cert
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);     // [FIX P15-C1] Verify hostname matches cert CN
                $exchResponse = curl_exec($ch);
                curl_close($ch);
                $exchData = json_decode($exchResponse, true);

                if (isset($exchData['access_token'])) {
                    $userAccessToken = $exchData['access_token'];
                }
            }

            // Step 2: Get token info to extract expiry
            $debugUrl = "https://graph.facebook.com/v24.0/debug_token?input_token=$userAccessToken&access_token=$userAccessToken";
            $ch = curl_init($debugUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);  // [FIX P15-C1]
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);     // [FIX P15-C1]
            $debugResponse = curl_exec($ch);
            curl_close($ch);

            $debugData = json_decode($debugResponse, true);
            $expiresAt = $debugData['data']['expires_at'] ?? null;
            $dataAccessExpires = $debugData['data']['data_access_expires_at'] ?? null;

            // Meta returns 0 for "Never expire" tokens
            if ($expiresAt === 0) {
                $formattedExpiry = '0000-00-00 00:00:00'; // Special value for permanent
            } else {
                $finalTimestamp = $expiresAt ?: $dataAccessExpires;
                $formattedExpiry = $finalTimestamp ? date('Y-m-d H:i:s', $finalTimestamp) : null;
            }

            // Step 2: Get list of pages
            $pagesUrl = "https://graph.facebook.com/v24.0/me/accounts?fields=id,name,access_token,picture&access_token=$userAccessToken";

            $ch = curl_init($pagesUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);  // [FIX P15-C1]
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);     // [FIX P15-C1]
            $pagesResponse = curl_exec($ch);
            curl_close($ch);

            $pagesData = json_decode($pagesResponse, true);

            if (isset($pagesData['data']) && count($pagesData['data']) > 0) {
                $pages = [];
                foreach ($pagesData['data'] as $page) {
                    $pages[] = [
                        'page_id' => $page['id'],
                        'page_name' => $page['name'],
                        'page_access_token' => $page['access_token'],
                        'avatar_url' => $page['picture']['data']['url'] ?? '',
                        'token_expires_at' => $formattedExpiry
                    ];
                }
                jsonResponse(true, $pages, 'Found ' . count($pages) . ' page(s)');
            } else {
                // Return the actual error message from Meta if available
                $errorMsg = 'No pages found';
                if (isset($pagesData['error'])) {
                    $errorMsg = 'Meta Error: ' . ($pagesData['error']['message'] ?? 'Unknown');
                } elseif (isset($exchData['error'])) {
                    $errorMsg = 'Exchange Error: ' . ($exchData['error']['message'] ?? 'Unknown');
                } else {
                    $errorMsg = 'No pages found. Raw Pages Response: ' . $pagesResponse;
                }
                jsonResponse(false, null, $errorMsg);
            }

        } elseif ($route === 'test-connection') {
            // -------------------------------------------------------------
            // Route: Test Connection (Verify Page Access Token)
            // -------------------------------------------------------------
            $accessToken = $input['page_access_token'] ?? '';
            if (!$accessToken) {
                jsonResponse(false, null, 'Page Access Token is required');
            }

            // Call Meta Graph API to get Page Info
            $url = "https://graph.facebook.com/v24.0/me?fields=id,name,picture&access_token=$accessToken";

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);  // [FIX P27-F1] Missing SSL verify — added for consistency
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);     // [FIX P27-F1] Verify hostname matches cert CN
            $response = curl_exec($ch);
            curl_close($ch);

            $data = json_decode($response, true);

            if (isset($data['id'])) {
                // Success
                jsonResponse(true, [
                    'page_id' => $data['id'],
                    'page_name' => $data['name'],
                    'avatar_url' => $data['picture']['data']['url'] ?? ''
                ], 'Connection Successful!');
            } else {
                // Fail
                $errorMsg = $data['error']['message'] ?? 'Unknown error from Meta';
                jsonResponse(false, null, 'Connection Failed: ' . $errorMsg);
            }
        } elseif ($route === 'debug-token') {
            // -------------------------------------------------------------
            // Route: Debug Token (Fetch Scopes & Token Details)
            // -------------------------------------------------------------
            $accessToken = $input['page_access_token'] ?? '';
            if (!$accessToken) {
                jsonResponse(false, null, 'Page Access Token is required');
            }

            // 1. Get Token Info (Permissions/Scopes)
            $debugUrl = "https://graph.facebook.com/v24.0/debug_token?input_token=$accessToken&access_token=$accessToken";
            $ch = curl_init($debugUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);  // [FIX P15-C1]
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);     // [FIX P15-C1]
            $debugResponse = curl_exec($ch);
            curl_close($ch);
            $debugData = json_decode($debugResponse, true);

            // 2. Get Detailed Permissions
            $permUrl = "https://graph.facebook.com/v24.0/me/permissions?access_token=$accessToken";
            $ch = curl_init($permUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);  // [FIX P15-C1]
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);     // [FIX P15-C1]
            $permResponse = curl_exec($ch);
            curl_close($ch);
            $permData = json_decode($permResponse, true);

            jsonResponse(true, [
                'debug' => $debugData['data'] ?? null,
                'permissions' => $permData['data'] ?? []
            ]);

        } elseif ($route === 'save') {
            // -------------------------------------------------------------
            // Route: Save Config (Add / Update)
            // -------------------------------------------------------------
            $configId = $input['id'] ?? bin2hex(random_bytes(16));
            $pageId = $input['page_id'] ?? '';
            $appId = $input['app_id'] ?? null;
            $appSecret = $input['app_secret'] ?? null;
            $pageName = $input['page_name'] ?? 'Unknown Page';
            $accessToken = $input['page_access_token'] ?? '';
            $avatarUrl = $input['avatar_url'] ?? '';
            $status = $input['status'] ?? 'active';
            $mode = $input['mode'] ?? 'live';
            $tokenExpiresAt = $input['token_expires_at'] ?? null;

            // Convert numeric timestamp to MySQL Datetime if needed
            if ($tokenExpiresAt && is_numeric($tokenExpiresAt)) {
                $tokenExpiresAt = date('Y-m-d H:i:s', $tokenExpiresAt);
            }
            $verifyToken = $input['verify_token'] ?? '';
            if (empty($verifyToken)) {
                $verifyToken = generateVerifyToken();
            }

            if (empty($pageId) || empty($accessToken)) {
                jsonResponse(false, null, 'Page ID and Access Token are required');
            }

            // Check if exists (by ID or Page ID)
            $stmt = $pdo->prepare("SELECT id, verify_token FROM meta_app_configs WHERE id = ? OR page_id = ?");
            $stmt->execute([$configId, $pageId]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                // Update
                $currentId = $existing['id'];
                // Preserve existing verify_token if not regenerating
                if (empty($input['verify_token'])) {
                    $verifyToken = $existing['verify_token'];
                }

                // [FIX] Preserve existing app_secret if not provided — prevents signature check breakage
                // Updating a config (e.g. refresh token) without re-entering app_secret should NOT clear it.
                if (empty($appSecret)) {
                    $stmtExistSecret = $pdo->prepare("SELECT app_secret FROM meta_app_configs WHERE id = ?");
                    $stmtExistSecret->execute([$currentId]);
                    $appSecret = $stmtExistSecret->fetchColumn();
                }

                $sql = "UPDATE meta_app_configs SET 
                        page_name = ?, page_access_token = ?, app_id = ?, app_secret = ?,
                        avatar_url = ?, status = ?, verify_token = ?, mode = ?, token_expires_at = ?, updated_at = NOW()
                        WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$pageName, $accessToken, $appId, $appSecret, $avatarUrl, $status, $verifyToken, $mode, $tokenExpiresAt, $currentId]);

                // Auto-Subscribe App to Page Events
                subscribeAppToPage($pageId, $accessToken);

                jsonResponse(true, ['id' => $currentId], 'Updated successfully');
            } else {
                // Insert
                $sql = "INSERT INTO meta_app_configs 
                        (id, page_id, app_id, page_name, page_access_token, app_secret, avatar_url, status, verify_token, mode, token_expires_at, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$configId, $pageId, $appId, $pageName, $accessToken, $appSecret, $avatarUrl, $status, $verifyToken, $mode, $tokenExpiresAt]);

                // Auto-Subscribe App to Page Events
                subscribeAppToPage($pageId, $accessToken);

                jsonResponse(true, ['id' => $configId], 'Added new Page successfully');
            }
        }
    }

    // =========================================================================
    // DELETE: Remove Config
    // =========================================================================
    elseif ($method === 'DELETE') {
        if (!$id) {
            jsonResponse(false, null, 'ID is required');
        }

        $stmt = $pdo->prepare("DELETE FROM meta_app_configs WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(true, null, 'Deleted successfully');
    }

} catch (Exception $e) {
    jsonResponse(false, null, 'Server Error: ' . $e->getMessage());
}

/**
 * Helper: Subscribe App to Page Webhooks
 */
function subscribeAppToPage($pageId, $accessToken)
{
    $url = "https://graph.facebook.com/v24.0/$pageId/subscribed_apps";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'subscribed_fields' => 'messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads',
        'access_token' => $accessToken
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);  // [FIX P27-F1] SSL verify for subscribeAppToPage
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);     // [FIX P27-F1] Verify hostname
    curl_exec($ch);
    curl_close($ch);
}
?>