<?php
// api/db_connect.php
ob_start();
date_default_timezone_set('Asia/Ho_Chi_Minh');

// ─── CORS: DYNAMIC ORIGIN REFLECTION ────────────────────────────────────────
// Hệ thống hỗ trợ nhiều web property (mỗi khách hàng 1 domain khác nhau).
// Không thể hardcode whitelist — thay vào đó reflect chính xác origin của request.
//
// Bảo mật thực sự không nằm ở CORS (browser-only), mà ở validation server-side:
//   - track.php   → kiểm tra property_id tồn tại trong web_properties + đúng domain
//   - Các API khác → kiểm tra session/token authentication
//
// Quy tắc:
//   • Có Origin header  → reflect lại (cho phép cross-origin với credentials)
//   • Không có Origin   → wildcard * (CLI, cron, server-to-server — không gửi cookie)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (!empty($origin)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // Nếu cùng domain thì dùng host hiện tại
    $currentHost = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    header("Access-Control-Allow-Origin: $currentHost");
}
header('Vary: Origin');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Admin-Token');


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header("Content-Type: application/json; charset=UTF-8");

$host = 'localhost';
$db = 'vhvxoigh_mail_auto'; // Tên database
$user = 'vhvxoigh_mail_auto';     // Username MySQL
$pass = 'Ideas@812';         // Mật khẩu MySQL
$charset = 'utf8mb4';

// [SECURITY FIX] Admin bypass token defined ONCE here.
// To rotate: change this value. All files reference this constant.
// Do NOT hardcode the token string anywhere else.
if (!defined('ADMIN_BYPASS_TOKEN')) {
    define('ADMIN_BYPASS_TOKEN', 'autoflow-admin-001');
}

// CONFIGURATION: CENTRAL API URL
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$httpHost = $_SERVER['HTTP_HOST'] ?? 'localhost';
$scriptPath = $_SERVER['SCRIPT_NAME'] ?? '';
$scriptDir = dirname($scriptPath);

// Ensure we point to the 'api' directory if not already there
$apiDir = (basename($scriptDir) === 'api' || basename($scriptDir) === 'mail_api') ? $scriptDir : $scriptDir . '/api';
$detectedUrl = rtrim("$protocol://$httpHost$apiDir", '/');

// [OPTIMIZED] Dynamic API URL Detection with manual override support
if (defined('ENV_API_URL')) {
    define('API_BASE_URL', ENV_API_URL);
} elseif (isset($_SERVER['HTTP_HOST'])) {
    define('API_BASE_URL', $detectedUrl);
} else {
    // Production default (can be overridden by a config file or env var)
    define('API_BASE_URL', 'https://automation.ideas.edu.vn/mail_api');
}



$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
    PDO::ATTR_PERSISTENT => false, // Tạm tắt persistent để tránh chiếm dụng connection ở hosting
    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci; SET time_zone = '+07:00';"
];

/**
 * Safety check for long-running processes (like AI generating responses)
 * Re-connects to MySQL if the connection has timed out.
 */
function ensure_pdo_alive(&$pdo)
{
    try {
        if ($pdo) {
            $pdo->query("SELECT 1");
        } else {
            throw new Exception("PDO not initialized");
        }
    } catch (Exception $e) {
        // Re-establish connection using the same $dsn as the initial connection.
        // [FIX] Previously hardcoded "charset=utf8mb4" — if $charset var is ever changed
        // at the top of this file, the reconnect would silently use a different encoding,
        // causing garbled UTF-8 data (tiếng Việt có dấu) for any subsequent writes.
        global $dsn, $user, $pass, $options;
        $attempts = 0;
        while ($attempts < 3) {
            try {
                $pdo = new PDO($dsn, $user, $pass, $options);
                return; // Reconnected successfully
            } catch (PDOException $ex) {
                $attempts++;
                error_log("RECONNECT FAILED (Attempt $attempts): " . $ex->getMessage());
                sleep(2); // Wait 2s before retry
            }
        }
        // If all 3 attempts fail, kill the process to allow Supervisor/Cron to restart cleanly
        // and prevent the worker from spamming the error log with 1000s of "PDO is null" errors.
        error_log("FATAL: MySQL server has gone away. Killing worker process.");
        exit(1); 
    }
}


try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    if (ob_get_length())
        ob_clean();
    http_response_code(500);

    // Production-safe error handling
    $errorMsg = 'Database connection failed';
    $debugInfo = null;

    // Only show detailed errors on localhost
    if (strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false || strpos($_SERVER['HTTP_HOST'] ?? '', '127.0.0.1') !== false) {
        $errorMsg = $e->getMessage();
        $debugInfo = $e->getTraceAsString();
    }

    echo json_encode([
        'success' => false,
        'message' => $errorMsg,
        'debug' => $debugInfo
    ]);
    exit;
}

/**
 * Centrally dispatch a background job to the queue.
 */
function dispatchQueueJob($pdo, $queue, $payload, $delaySeconds = 0)
{
    $now = date('Y-m-d H:i:s');
    $availableAt = date('Y-m-d H:i:s', time() + $delaySeconds);
    // Always generate our own id so this works with both BIGINT AUTO_INCREMENT
    // and VARCHAR(64) schemas (hex strings are safe for both).
    $jobId = bin2hex(random_bytes(16));
    $stmt = $pdo->prepare("INSERT INTO queue_jobs (id, queue, payload, status, available_at, created_at) VALUES (?, ?, ?, 'pending', ?, ?)");
    $res = $stmt->execute([$jobId, $queue, json_encode($payload), $availableAt, $now]);

    if ($res) {
        triggerAsyncWorker();
    }
    return $res;
}

/**
 * Centrally trigger the worker asynchronously using WorkerTriggerService.
 */
function triggerAsyncWorker($urlPath = '/worker_queue.php')
{
    require_once __DIR__ . '/WorkerTriggerService.php';
    global $pdo;

    $triggerService = new WorkerTriggerService($pdo, API_BASE_URL);
    return $triggerService->trigger($urlPath);
}

function apiHeaders()
{
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Cache-Control: post-check=0, pre-check=0", false);
    header("Pragma: no-cache");
}

function jsonResponse($success, $data = null, $message = '', $extra = [])
{
    ob_clean();
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message
    ];

    if (!empty($extra) && is_array($extra)) {
        $response = array_merge($response, $extra);
    }

    echo json_encode($response);
    exit;
}

/**
 * Centralized Error Logger for Production
 */
function logApiError($message, $context = [])
{
    $logData = [
        'timestamp' => date('Y-m-d H:i:s'),
        'message' => $message,
        'context' => $context,
        'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
        'user_id' => $GLOBALS['current_admin_id'] ?? 'unknown'
    ];
    error_log(json_encode($logData));
}

// --- CENTRALIZED AUTH DETECTION ---
// Priority: 1. Bearer Token  2. Session org_user_id  3. Session user_id  4. X-Admin-Token

// Ensure session is started for session-based authentication
if (session_status() === PHP_SESSION_NONE) {
    // CRITICAL: Set session cookie params BEFORE session_start()
    // This ensures the session cookie is compatible with both the
    // main Autoflow app and the AI Space API.
    $isSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
    session_set_cookie_params([
        'lifetime' => 0,           // Session cookie (expires when browser closes)
        'path' => '/',         // Share across the entire domain
        'domain' => '',          // Current domain only
        'secure' => $isSecure,   // Only send over HTTPS in production
        'httponly' => true,        // Prevent JS from accessing cookie (security)
        'samesite' => 'Lax',       // Allow same-site navigation (needed for page redirects)
    ]);
    session_start();
}

// ── PRIORITY 1: Bearer Access Token ──────────────────────────────────────────
$current_admin_id = null;
$_bearerHeaders = function_exists('getallheaders') ? getallheaders() : [];
$_bearerHeaders = array_change_key_case($_bearerHeaders, CASE_LOWER);
$_authHeader = $_bearerHeaders['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';

if (!empty($_authHeader) && preg_match('/Bearer\s+(.+)$/i', $_authHeader, $_bm)) {
    $_bearerToken = trim($_bm[1]);
    try {
        $_stmt = $pdo->prepare("
            SELECT u.id FROM ai_org_access_tokens t
            INNER JOIN ai_org_users u ON u.id = t.user_id
            WHERE t.token = ? AND t.expires_at > NOW() AND t.is_active = 1 LIMIT 1
        ");
        $_stmt->execute([$_bearerToken]);
        $_tokenUserId = $_stmt->fetchColumn();
        if ($_tokenUserId) {
            $current_admin_id = $_tokenUserId;
            // Sync session
            if (session_status() === PHP_SESSION_ACTIVE) {
                $_SESSION['org_user_id'] = $_tokenUserId;
            }
        }
    } catch (Exception $_e) { /* ignore — fall through to session */
    }
}

// ── PRIORITY 2: Session ───────────────────────────────────────────────────────
if (empty($current_admin_id)) {
    $current_admin_id = $_SESSION['org_user_id']
        ?? $_SESSION['user_id']
        ?? $_GET['org_user_id']
        ?? null;
}

// SYNC: Map numeric ID 1 → 'admin-001'
if (!empty($current_admin_id) && ($current_admin_id == 1 || $current_admin_id === '1')) {
    $current_admin_id = 'admin-001';
}

// ── PRIORITY 3: Autoflow admin session fallback ──────────────────────────
// If staff is already logged into Autoflow as admin, grant AI Space admin-001 access
// without requiring a separate AI Space token.
if (empty($current_admin_id)) {
    $_afUserId = $_SESSION['user_id'] ?? null;
    $_afIsAdmin = $_SESSION['is_admin'] ?? null;
    $_afRole = $_SESSION['role'] ?? null;
    $_afAdminId = $_SESSION['admin_id'] ?? null; // Some Autoflow versions

    $_isAutoflowAdmin =
        ($_afUserId == 1 || $_afUserId === '1') ||
        (!empty($_afIsAdmin)) ||
        ($_afRole === 'admin') ||
        (!empty($_afAdminId));

    if ($_isAutoflowAdmin) {
        $current_admin_id = 'admin-001';
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION['org_user_id'] = 'admin-001';
            $_SESSION['org_user_role'] = 'admin';
        }
    }
}

// ── PRIORITY 4: X-Admin-Token header (Autoflow admin bypass) ──────────────
if (empty($current_admin_id)) {
    $normalizedHeaders = array_change_key_case(function_exists('getallheaders') ? getallheaders() : [], CASE_LOWER);
    $adminTokenHeader = $normalizedHeaders['x-admin-token'] ?? $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';

    if ($adminTokenHeader === ADMIN_BYPASS_TOKEN) {
        $current_admin_id = 'admin-001';
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION['org_user_id'] = 'admin-001';
        }
    }
}


$GLOBALS['current_admin_id'] = $current_admin_id;

// ── SESSION LOCK RELEASE ──────────────────────────────────────────────────────
// PHP file-based sessions use EXCLUSIVE FILE LOCKS.
// Problem: While one request holds the session open (e.g., campaign send = minutes),
// ALL other requests from the same browser QUEUE and WAIT => "pending" storm in DevTools.
//
// Fix: Call session_write_close() immediately after reading all session auth data.
// This releases the file lock, allowing concurrent requests to proceed normally.
// Safe: $current_admin_id is already captured in local var + $GLOBALS above.
if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

// DEBUG: Log session state for troubleshooting (remove in production)
if (defined('AI_SPACE_DEBUG') && AI_SPACE_DEBUG) {
    error_log("[SESSION] ID=" . session_id() . " org_user_id=" . ($_SESSION['org_user_id'] ?? 'null') . " user_id=" . ($_SESSION['user_id'] ?? 'null') . " resolved=" . ($current_admin_id ?? 'null'));
}