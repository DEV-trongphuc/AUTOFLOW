<?php
// Auto-migrate script for stuck completed users at condition steps
require_once 'db_connect.php';

header('Content-Type: application/json');

$flowId = $_GET['flow_id'] ?? null;
$dryRun = isset($_GET['dry_run']) && $_GET['dry_run'] === '1';

if (!$flowId) {
    echo json_encode(['error' => 'Missing flow_id']);
    exit;
}

// Get flow
$stmt = $pdo->prepare("SELECT id, name, steps FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$flow = $stmt->fetch();

if (!$flow) {
    echo json_encode(['error' => 'Flow not found']);
    exit;
}

$steps = json_decode($flow['steps'], true);

// Find condition steps with paths
$conditionSteps = [];
foreach ($steps as $step) {
    if ($step['type'] === 'condition') {
        $conditionSteps[$step['id']] = [
            'name' => $step['name'] ?? 'Unnamed',
            'yesPath' => $step['config']['yesPath'] ?? null,
            'noPath' => $step['config']['noPath'] ?? null
        ];
    }
}

// Find completed users at condition steps
$migrations = [];
foreach ($conditionSteps as $stepId => $stepInfo) {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count
        FROM subscriber_flow_states
        WHERE flow_id = ? AND step_id = ? AND status = 'completed'
    ");
    $stmt->execute([$flowId, $stepId]);
    $count = $stmt->fetchColumn();

    if ($count > 0) {
        // Check if this condition has paths now
        if ($stepInfo['yesPath'] || $stepInfo['noPath']) {
            // Get the activity to determine which path they should take
            $stmt2 = $pdo->prepare("
                SELECT sfs.subscriber_id, sa.type
                FROM subscriber_flow_states sfs
                LEFT JOIN subscriber_activity sa ON sa.subscriber_id = sfs.subscriber_id 
                    AND sa.reference_id = sfs.step_id 
                    AND sa.type IN ('condition_true', 'condition_false')
                WHERE sfs.flow_id = ? AND sfs.step_id = ? AND sfs.status = 'completed'
            ");
            $stmt2->execute([$flowId, $stepId]);
            $users = $stmt2->fetchAll();

            $yesUsers = [];
            $noUsers = [];

            foreach ($users as $user) {
                if ($user['type'] === 'condition_true') {
                    $yesUsers[] = $user['subscriber_id'];
                } elseif ($user['type'] === 'condition_false') {
                    $noUsers[] = $user['subscriber_id'];
                }
            }

            $migrations[] = [
                'step_id' => $stepId,
                'step_name' => $stepInfo['name'],
                'total_stuck' => $count,
                'yes_path' => $stepInfo['yesPath'],
                'no_path' => $stepInfo['noPath'],
                'yes_users_count' => count($yesUsers),
                'no_users_count' => count($noUsers),
                'yes_users' => $yesUsers,
                'no_users' => $noUsers
            ];
        }
    }
}

// Perform migration if not dry run
$migrated = 0;
if (!$dryRun && !empty($migrations)) {
    foreach ($migrations as $migration) {
        // Migrate YES users
        if (!empty($migration['yes_users']) && $migration['yes_path']) {
            $placeholders = implode(',', array_fill(0, count($migration['yes_users']), '?'));
            $stmt = $pdo->prepare("
                UPDATE subscriber_flow_states 
                SET status = 'waiting', step_id = ?, scheduled_at = NOW(), updated_at = NOW()
                WHERE flow_id = ? AND step_id = ? AND subscriber_id IN ($placeholders) AND status = 'completed'
            ");
            $params = array_merge(
                [$migration['yes_path'], $flowId, $migration['step_id']],
                $migration['yes_users']
            );
            $stmt->execute($params);
            $migrated += $stmt->rowCount();
        }

        // Migrate NO users
        if (!empty($migration['no_users']) && $migration['no_path']) {
            $placeholders = implode(',', array_fill(0, count($migration['no_users']), '?'));
            $stmt = $pdo->prepare("
                UPDATE subscriber_flow_states 
                SET status = 'waiting', step_id = ?, scheduled_at = NOW(), updated_at = NOW()
                WHERE flow_id = ? AND step_id = ? AND subscriber_id IN ($placeholders) AND status = 'completed'
            ");
            $params = array_merge(
                [$migration['no_path'], $flowId, $migration['step_id']],
                $migration['no_users']
            );
            $stmt->execute($params);
            $migrated += $stmt->rowCount();
        }
    }
}

echo json_encode([
    'flow_id' => $flowId,
    'flow_name' => $flow['name'],
    'dry_run' => $dryRun,
    'migrations' => $migrations,
    'total_migrated' => $migrated,
    'message' => $dryRun
        ? 'Dry run - no changes made. Remove dry_run=1 to execute migration.'
        : "Successfully migrated $migrated users"
], JSON_PRETTY_PRINT);
