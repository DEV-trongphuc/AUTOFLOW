<?php
/**
 * Zalo Automation Recovery Script
 * Use this to unpause subscribers who were mistakenly paused by Zalo system greetings.
 */

require_once 'db_connect.php';

header('Content-Type: application/json');

$zaloUserId = $_GET['zalo_user_id'] ?? null;
$dryRun = isset($_GET['dry_run']); // If true, only show who would be fixed

try {
    if ($zaloUserId) {
        // Fix specific user
        $stmt = $pdo->prepare("SELECT id, display_name FROM zalo_subscribers WHERE zalo_user_id = ?");
        $stmt->execute([$zaloUserId]);
        $sub = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$sub) {
            echo json_encode(['success' => false, 'message' => "User $zaloUserId not found."]);
            exit;
        }

        if (!$dryRun) {
            // 1. Clear pause timer
            $pdo->prepare("UPDATE zalo_subscribers SET ai_paused_until = NULL WHERE id = ?")->execute([$sub['id']]);

            // 2. Set conversation back to AI
            $zaloVid = "zalo_" . $zaloUserId;
            $pdo->prepare("UPDATE ai_conversations SET status = 'ai' WHERE visitor_id = ? AND status = 'human'")->execute([$zaloVid]);

            echo json_encode([
                'success' => true,
                'message' => "Successfully restored automation for {$sub['display_name']} ($zaloUserId)."
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'message' => "DRY RUN: Would fix {$sub['display_name']} ($zaloUserId)."
            ]);
        }
    } else {
        // Fix ALL currently paused users who have 0 inbound messages (highly likely mistakenly paused)
        // This is a broader fix.
        $stmtPaused = $pdo->query("
            SELECT zs.id, zs.zalo_user_id, zs.display_name 
            FROM zalo_subscribers zs
            LEFT JOIN (
                SELECT zalo_user_id, COUNT(*) as inbound_count 
                FROM zalo_user_messages 
                WHERE direction = 'inbound' 
                GROUP BY zalo_user_id
            ) m ON zs.zalo_user_id = m.zalo_user_id
            WHERE zs.ai_paused_until > NOW()
            AND (m.inbound_count IS NULL OR m.inbound_count = 0)
        ");

        $pausedUsers = $stmtPaused->fetchAll(PDO::FETCH_ASSOC);
        $count = count($pausedUsers);

        if ($count === 0) {
            echo json_encode(['success' => true, 'message' => "No mistakenly paused users found."]);
            exit;
        }

        if (!$dryRun) {
            $fixed = 0;
            foreach ($pausedUsers as $user) {
                // Unpause
                $pdo->prepare("UPDATE zalo_subscribers SET ai_paused_until = NULL WHERE id = ?")->execute([$user['id']]);
                // Reset AI status
                $zaloVid = "zalo_" . $user['zalo_user_id'];
                $pdo->prepare("UPDATE ai_conversations SET status = 'ai' WHERE visitor_id = ? AND status = 'human'")->execute([$zaloVid]);
                $fixed++;
            }

            echo json_encode([
                'success' => true,
                'message' => "Fixed $fixed users who were mistakenly paused by Zalo system greetings.",
                'users' => $pausedUsers
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'message' => "DRY RUN: Found $count users who look mistakenly paused.",
                'users' => $pausedUsers
            ]);
        }
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => "Error: " . $e->getMessage()]);
}
