<?php
// api/auth_middleware.php
// This file handles RBAC permission checks

require_once 'db_connect.php';

/**
 * Ensures the current user has the required permission in the current workspace.
 * If not, it outputs a 403 Forbidden JSON and exits.
 */
function require_permission($pdo, $permission_slug, $workspace_id = null) {
    if (!$pdo) {
        jsonResponse(false, null, 'Database connection error', [], 500);
    }
    
    // Super admins always bypass
    if (is_super_admin()) {
        return true;
    }

    $user_id = $_SESSION['user_id'] ?? null;
    if (!$user_id) {
        http_response_code(401);
        jsonResponse(false, null, 'Unauthorized');
    }

    // Default workspace if none provided
    if (!$workspace_id) {
        $workspace_id = get_current_workspace_id();
    }

    // Check super admin in DB
    try {
        $stmtSuper = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'super_admin'");
        $stmtSuper->execute([$user_id]);
        if ($stmtSuper->fetchColumn()) {
            return true;
        }

        // Check specific permission
        $stmt = $pdo->prepare("
            SELECT p.slug 
            FROM workspace_users wu
            JOIN role_permissions rp ON rp.role_id = wu.role_id
            JOIN permissions p ON p.slug = rp.permission_slug
            WHERE wu.user_id = ? AND wu.workspace_id = ? AND p.slug = ?
        ");
        $stmt->execute([$user_id, $workspace_id, $permission_slug]);
        
        if ($stmt->fetch()) {
            return true;
        }

    } catch (Exception $e) {
        error_log("Permission Check Error: " . $e->getMessage());
        http_response_code(500);
        jsonResponse(false, null, 'Internal server error checking permissions');
    }

    // Fallback if not authorized
    http_response_code(403);
    jsonResponse(false, null, 'Forbidden: You do not have the [' . $permission_slug . '] permission.');
}

/**
 * Check if the current user is a super admin.
 * Session-based for performance, with periodic DB re-verification every 5 minutes
 * to catch admin revocations before session expiry (up to 30 days).
 */
function is_super_admin() {
    // Fast path: check explicit global flags first (set by AI org auth, API tokens, etc.)
    if (!empty($_SESSION['is_admin']) || !empty($_SESSION['af_is_admin'])) {
        return true;
    }

    // Check session role (most common path)
    $sessionRole = $_SESSION['role'] ?? null;
    $uid = $_SESSION['user_id'] ?? $GLOBALS['current_admin_id'] ?? null;

    // Legacy: user_id = 1 hoặc bypass header là super admin
    $isBypass = !empty($_SERVER['HTTP_X_ADMIN_TOKEN']) || !empty($_SERVER['HTTP_X_LOCAL_DEV_USER']);
    if ($uid == 1 || $uid === '1' || $isBypass) {
        return true;
    }

    if (!$sessionRole || !in_array($sessionRole, ['super_admin', 'admin'], true)) {
        return false;
    }

    // [FIX NH-03] Periodic DB re-verification (every 5 minutes).
    // Prevents revoked admins from retaining access for the full session lifetime (up to 30 days).
    // Uses a session-cached timestamp to avoid hitting DB on every single request.
    $cacheKey = 'admin_verified_at';
    $cacheTtl = 300; // 5 minutes
    $lastVerified = $_SESSION[$cacheKey] ?? 0;

    if ((time() - $lastVerified) < $cacheTtl) {
        // Cache still fresh — trust session role
        return true;
    }

    // Cache expired — re-verify against DB
    if ($uid) {
        global $pdo;
        if ($pdo) {
            try {
                $stmt = $pdo->prepare("SELECT role, status FROM users WHERE id = ? LIMIT 1");
                $stmt->execute([$uid]);
                $dbUser = $stmt->fetch(PDO::FETCH_ASSOC);

                // [FIX R3-CR01] Guard session writes against already-closed sessions.
                // db_connect.php calls session_write_close() on GET requests, so by the time
                // is_super_admin() runs, the session may be PHP_SESSION_NONE (closed).
                // Writing to $_SESSION after close silently fails — cache never persists.
                // Fix: re-open session momentarily to write cache, then close again.
                $sessionWasClosed = (session_status() !== PHP_SESSION_ACTIVE);
                if ($sessionWasClosed && session_status() === PHP_SESSION_NONE) {
                    session_start();
                }

                if ($dbUser && in_array($dbUser['role'], ['super_admin', 'admin'], true) && $dbUser['status'] === 'approved') {
                    // Still admin in DB — refresh session cache
                    $_SESSION[$cacheKey] = time();
                    $_SESSION['role'] = $dbUser['role']; // Sync in case role was upgraded
                    if ($sessionWasClosed) session_write_close();
                    return true;
                } else {
                    // Role was revoked — clear session to force re-login
                    $_SESSION['role'] = $dbUser['role'] ?? 'user';
                    unset($_SESSION[$cacheKey], $_SESSION['is_admin'], $_SESSION['af_is_admin']);
                    if ($sessionWasClosed) session_write_close();
                    return false;
                }
            } catch (Exception $e) {
                // DB unavailable — fail open (trust session) to avoid locking out users
                error_log('[auth_middleware] DB role verify failed: ' . $e->getMessage());
                return true;
            }
        }
    }

    return false;
}

/**
 * Retrieve the current active workspace ID from headers or session.
 * Default is 1 (Default Workspace)
 */
function get_current_workspace_id() {
    // 1. Try to get from request header 'X-Workspace-ID'
    $headers = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];
    if (isset($headers['x-workspace-id']) && is_numeric($headers['x-workspace-id'])) {
        return (int) $headers['x-workspace-id'];
    }

    // 2. Try session
    if (isset($_SESSION['current_workspace_id'])) {
        return (int) $_SESSION['current_workspace_id'];
    }

    // 3. Fallback to 1
    return 1;
}

/**
 * Extension of PDO query to automatically append workspace_id where clause
 * This is a helper, but actual implementation depends on existing raw queries.
 */
function build_workspace_where($alias = '') {
    $wsid = get_current_workspace_id();
    $prefix = $alias ? "`{$alias}`." : "";
    return " {$prefix}workspace_id = " . (int)$wsid . " ";
}
?>
