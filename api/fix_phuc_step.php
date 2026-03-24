<?php
// api/fix_phuc_step.php
require_once 'db_connect.php';

try {
    $email = 'phucht@ideas.edu.vn';
    $tagStepId = 'd327fe62-c975-4bbe-bb3a-a352c409de86';

    $stmt = $pdo->prepare("UPDATE subscriber_flow_states q 
                           JOIN subscribers s ON q.subscriber_id = s.id 
                           SET q.step_id = ? 
                           WHERE s.email = ? AND q.status = 'completed'");
    $stmt->execute([$tagStepId, $email]);

    echo "Fixed Phuc's last step to: Gắn Tag khách. Please refresh dashboard.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
