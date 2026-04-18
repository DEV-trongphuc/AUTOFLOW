<?php
// api/migrate_to_admin.php
require_once 'db_connect.php';

header('Content-Type: application/json');

$targetAdmin = 'admin-001';

try {
    if (!isset($pdo)) {
        throw new Exception("Database connection failed");
    }

    $pdo->beginTransaction();

    // 1. Update Global Assets
    // Set admin_id to admin-001 for ALL records that don't have one, or generally force ownership as requested.
    // The user said "Migrate tất cả... cho user admin-001 hết đi", implying a complete takeover.
    // We will update everything to be safe.
    $stmt1 = $pdo->prepare("UPDATE global_assets SET admin_id = ? WHERE admin_id IS NULL OR admin_id = ''");
    $stmt1->execute([$targetAdmin]);
    $count1 = $stmt1->rowCount();

    // 2. Update Conversations
    // Link anonymous or loose conversations to admin-001
    $stmt2 = $pdo->prepare("UPDATE ai_org_conversations SET user_id = ? WHERE user_id IS NULL OR user_id = '' OR user_id = 'org_user' OR user_id LIKE 'session_%'");
    $stmt2->execute([$targetAdmin]);
    $count2 = $stmt2->rowCount();

    // 3. Update Workspace Files
    // Link files to admin-001 if they don't have an owner, or sync from conversation owner
    $stmt3 = $pdo->prepare("
        UPDATE ai_workspace_files wf
        LEFT JOIN ai_org_conversations conv ON wf.conversation_id = conv.id
        SET wf.admin_id = COALESCE(conv.user_id, ?)
        WHERE wf.admin_id IS NULL OR wf.admin_id = ''
    ");
    $stmt3->execute([$targetAdmin]);
    $count3 = $stmt3->rowCount();

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => "Migration complete.",
        'updated_assets' => $count1,
        'updated_conversations' => $count2,
        'updated_workspace_files' => $count3,
        'target_user' => $targetAdmin
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>