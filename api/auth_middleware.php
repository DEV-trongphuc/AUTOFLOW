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
    
    // Super admins always bypass (Check role in session first for performance, then DB)
    if (isset($_SESSION['role']) && $_SESSION['role'] === 'super_admin') {
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
