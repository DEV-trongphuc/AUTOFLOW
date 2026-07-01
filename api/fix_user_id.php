<?php
// api/fix_user_id.php
require_once 'db_connect.php';

header('Content-Type: application/json');

$email = 'dom.marketing.vn@gmail.com';

try {
    // 1. Get user details
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(false, null, 'User not found');
    }

    $oldId = $user['id'];
    
    // Check if ID is empty or needs fixing
    if (empty($oldId) || trim($oldId) === '') {
        $newId = bin2hex(random_bytes(16)); // Generate fresh 32-character hex ID
        
        $pdo->beginTransaction();

        // Update main user table
        $updateUser = $pdo->prepare("UPDATE users SET id = ? WHERE email = ?");
        $updateUser->execute([$newId, $email]);

        // Update related tables referencing empty user_id
        $tablesToUpdate = [
            'user_access_logs' => 'user_id',
            'workspace_users' => 'user_id',
            'flow_snapshots' => 'created_by'
        ];

        $affectedRows = [];
        foreach ($tablesToUpdate as $table => $column) {
            try {
                // Check if table exists first
                $tableCheck = $pdo->query("SHOW TABLES LIKE '$table'")->fetch();
                if ($tableCheck) {
                    $stmtUpdate = $pdo->prepare("UPDATE `$table` SET `$column` = ? WHERE `$column` = ? OR `$column` IS NULL OR `$column` = ''");
                    $stmtUpdate->execute([$newId, $oldId]);
                    $affectedRows[$table] = $stmtUpdate->rowCount();
                }
            } catch (Exception $ex) {
                $affectedRows[$table] = 'Error: ' . $ex->getMessage();
            }
        }

        // Also ensure they are in workspace 1 (default workspace) so they can access stats!
        $hasWorkspace = false;
        try {
            $stmtWs = $pdo->prepare("SELECT 1 FROM workspace_users WHERE user_id = ? AND workspace_id = 1");
            $stmtWs->execute([$newId]);
            if ($stmtWs->fetch()) {
                $hasWorkspace = true;
            } else {
                // Insert into default workspace
                $stmtInsertWs = $pdo->prepare("INSERT INTO workspace_users (workspace_id, user_id, role_id) VALUES (1, ?, 'admin')");
                $stmtInsertWs->execute([$newId]);
                $affectedRows['workspace_users_added'] = 1;
            }
        } catch (Exception $ex) {
            $affectedRows['workspace_users_ws1_check'] = 'Error: ' . $ex->getMessage();
        }

        $pdo->commit();

        jsonResponse(true, [
            'message' => 'User ID successfully updated from empty string to fresh UUID',
            'email' => $email,
            'old_id' => $oldId,
            'new_id' => $newId,
            'affected_rows' => $affectedRows
        ]);
    } else {
        // ID is already valid, just ensure they are in workspace 1
        $affectedRows = [];
        try {
            $stmtWs = $pdo->prepare("SELECT 1 FROM workspace_users WHERE user_id = ? AND workspace_id = 1");
            $stmtWs->execute([$oldId]);
            if (!$stmtWs->fetch()) {
                $stmtInsertWs = $pdo->prepare("INSERT INTO workspace_users (workspace_id, user_id, role_id) VALUES (1, ?, 'admin')");
                $stmtInsertWs->execute([$oldId]);
                $affectedRows['workspace_users_added_for_existing'] = 1;
            }
        } catch (Exception $ex) {
            $affectedRows['workspace_users_ws1_check'] = 'Error: ' . $ex->getMessage();
        }

        jsonResponse(true, [
            'message' => 'User ID is already non-empty. No action required.',
            'email' => $email,
            'id' => $oldId,
            'affected_rows' => $affectedRows
        ]);
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(false, null, 'Migration error: ' . $e->getMessage());
}
