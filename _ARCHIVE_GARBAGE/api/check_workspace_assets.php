<?php
// api/check_workspace_assets.php
require_once 'db_connect.php';

header('Content-Type: application/json');

/**
 * Debug script to verify why files are or aren't showing in specific views.
 * Usage: api/check_workspace_assets.php?category_id=...&bot_id=...&conv_id=...
 */

$categoryId = $_GET['category_id'] ?? null;
$botId = $_GET['bot_id'] ?? null;
$convId = $_GET['conv_id'] ?? null;
$adminId = $_SESSION['user_id'] ?? 'admin-001'; // Defaulting for debug if not logged in

try {
    $debug = [
        'context' => [
            'category_id' => $categoryId,
            'bot_id' => $botId,
            'conv_id' => $convId,
            'admin_id' => $adminId
        ],
        'global_assets_audit' => [],
        'workspace_files_audit' => []
    ];

    // 1. Audit Global Assets (what appears in the Global Workspace view)
    $whereGlobal = ["ga.is_deleted = 0"];
    $paramsGlobal = [];

    // Simulate the logic in get_global_assets.php
    $globalQuery = "SELECT ga.*, 
        CASE 
            WHEN ga.source = 'workspace' THEN '🌍 GLOBAL'
            WHEN ga.source IN ('chat_user', 'user_attachment') THEN '👤 USER'
            WHEN ga.source IN ('chat_assistant', 'ai_generated', 'ai') THEN '🤖 AI'
            ELSE '❓ UNKNOWN'
        END as classification
        FROM global_assets ga ";

    if ($categoryId) {
        $whereGlobal[] = "ga.property_id IN (SELECT id FROM ai_chatbots WHERE category_id = ?)";
        $paramsGlobal[] = $categoryId;
    } elseif ($botId) {
        $whereGlobal[] = "(ga.property_id = ? OR ga.property_id IS NULL)";
        $paramsGlobal[] = $botId;
    }

    $sqlGlobal = $globalQuery . " WHERE " . implode(" AND ", $whereGlobal) . " ORDER BY ga.created_at DESC";
    $stmtGlobal = $pdo->prepare($sqlGlobal);
    $stmtGlobal->execute($paramsGlobal);
    $debug['global_assets_audit'] = $stmtGlobal->fetchAll(PDO::FETCH_ASSOC);

    // 2. Audit Workspace Files (what appears in the Chat Sidebar)
    if ($convId) {
        $stmtWorkspace = $pdo->prepare("
            SELECT 
                f.id, 
                f.file_name as name, 
                ga.source as ga_source,
                ga.is_deleted as ga_is_deleted,
                COALESCE(ga.source, 'user_attachment') as effective_source,
                f.file_url as url,
                f.conversation_id,
                f.property_id,
                f.admin_id,
                CASE 
                    WHEN (ga.source = 'workspace' AND ga.is_deleted = 0) THEN '🌍 GLOBAL'
                    WHEN (ga.source IN ('chat_user', 'user_attachment') OR ga.source IS NULL) THEN '👤 USER'
                    WHEN ga.source IN ('chat_assistant', 'ai_generated', 'ai') THEN '🤖 AI'
                    ELSE '❓ UNKNOWN'
                END as classification
            FROM ai_workspace_files f
            LEFT JOIN global_assets ga ON f.file_url = ga.url
            WHERE f.conversation_id = ? OR f.conversation_id = (SELECT id FROM ai_org_conversations WHERE id = ? OR visitor_id = ? LIMIT 1)
            ORDER BY f.created_at DESC
        ");
        $stmtWorkspace->execute([$convId, $convId, $convId]);
        $debug['workspace_files_audit'] = $stmtWorkspace->fetchAll(PDO::FETCH_ASSOC);
    }

    // 3. Overall Stats
    $debug['stats'] = [
        'total_in_global_assets' => count($debug['global_assets_audit']),
        'total_in_workspace_files' => count($debug['workspace_files_audit']),
        'distinct_sources' => $pdo->query("SELECT source, COUNT(*) as count FROM global_assets WHERE is_deleted=0 GROUP BY source")->fetchAll(PDO::FETCH_ASSOC)
    ];

    echo json_encode($debug, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
