<?php
// Auto-migration helper for stuck completed users at condition steps
// Called from flows.php PUT method when flow is updated

function autoMigrateStuckUsers($pdo, $flowId, $stepsArr)
{
    $migratedCount = 0;

    foreach ($stepsArr as $step) {
        if ($step['type'] === 'condition') {
            // Check if this condition has paths (either old or new naming)
            $yesPath = $step['config']['yesPath'] ?? $step['yesStepId'] ?? null;
            $noPath = $step['config']['noPath'] ?? $step['noStepId'] ?? null;

            if ($yesPath || $noPath) {
                // Find completed users at this step with activity
                $stmt = $pdo->prepare("
                    SELECT sfs.subscriber_id, sa.type
                    FROM subscriber_flow_states sfs
                    LEFT JOIN subscriber_activity sa ON sa.subscriber_id = sfs.subscriber_id 
                        AND sa.reference_id = sfs.step_id 
                        AND sa.type IN ('condition_true', 'condition_false')
                    WHERE sfs.flow_id = ? AND sfs.step_id = ? AND sfs.status = 'completed'
                ");
                $stmt->execute([$flowId, $step['id']]);
                $stuckUsers = $stmt->fetchAll();

                foreach ($stuckUsers as $user) {
                    $targetStep = null;
                    if ($user['type'] === 'condition_true' && $yesPath) {
                        $targetStep = $yesPath;
                    } elseif ($user['type'] === 'condition_false' && $noPath) {
                        $targetStep = $noPath;
                    }

                    if ($targetStep) {
                        $pdo->prepare("
                            UPDATE subscriber_flow_states 
                            SET status = 'waiting', step_id = ?, scheduled_at = NOW(), updated_at = NOW()
                            WHERE flow_id = ? AND subscriber_id = ? AND step_id = ? AND status = 'completed'
                        ")->execute([$targetStep, $flowId, $user['subscriber_id'], $step['id']]);
                        $migratedCount++;
                    }
                }
            }
        }
    }

    return $migratedCount;
}
