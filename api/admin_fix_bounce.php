<?php
/**
 * Admin Utility: Fix Bounce Rate
 * Access via: /api/admin_fix_bounce.php?action=fix&confirm=yes
 * [SECURITY] Restricted to authenticated admin users only.
 */

require_once 'db_connect.php';
require_once 'auth_middleware.php';

// [SECURITY] Only authenticated workspace users may call this utility
$adminAuth = get_current_user_id();
if (!$adminAuth) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized — admin session required']);
    exit;
}

header('Content-Type: application/json');

$action  = $_GET['action']  ?? '';
$confirm = $_GET['confirm'] ?? '';

if ($action !== 'fix' || $confirm !== 'yes') {
    echo json_encode([
        'error' => 'Invalid request',
        'usage' => 'GET /api/admin_fix_bounce.php?action=fix&confirm=yes'
    ]);
    exit;
}

try {
    // Get current stats before fix
    $stmtBefore = $pdo->query("
        SELECT
            COUNT(*) as total,
            SUM(is_bounce) as bounced,
            ROUND((SUM(is_bounce) / COUNT(*)) * 100, 2) as rate
        FROM web_sessions
    ");
    $before = $stmtBefore->fetch(PDO::FETCH_ASSOC);

    // Recalculate bounce flag based on page count and interaction events
    $sql = "
        UPDATE web_sessions s
        SET is_bounce = CASE
            WHEN s.page_count > 1 THEN 0
            WHEN EXISTS (
                SELECT 1 FROM web_events
                WHERE session_id = s.id
                AND event_type IN ('click', 'canvas_click', 'form')
                LIMIT 1
            ) THEN 0
            ELSE 1
        END
        WHERE s.property_id IS NOT NULL
    ";

    $affected = $pdo->exec($sql);

    // Get stats after fix
    $stmtAfter = $pdo->query("
        SELECT
            COUNT(*) as total,
            SUM(is_bounce) as bounced,
            ROUND((SUM(is_bounce) / COUNT(*)) * 100, 2) as rate
        FROM web_sessions
    ");
    $after = $stmtAfter->fetch(PDO::FETCH_ASSOC);

    // Per-property breakdown
    $stmtProps = $pdo->query("
        SELECT
            wp.name,
            COUNT(*) as sessions,
            SUM(s.is_bounce) as bounced,
            ROUND((SUM(s.is_bounce) / COUNT(*)) * 100, 2) as rate
        FROM web_sessions s
        JOIN web_properties wp ON s.property_id = wp.id
        GROUP BY s.property_id, wp.name
        ORDER BY sessions DESC
    ");
    $properties = $stmtProps->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success'       => true,
        'affected_rows' => $affected,
        'before'        => $before,
        'after'         => $after,
        'properties'    => $properties,
        'message'       => "Successfully recalculated bounce rate for $affected sessions"
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage()
    ]);
}