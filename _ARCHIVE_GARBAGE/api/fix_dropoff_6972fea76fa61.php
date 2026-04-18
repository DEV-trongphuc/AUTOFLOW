<?php
// fix_dropoff_6972fea76fa61.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Path Detection
if (file_exists('db_connect.php')) {
    require 'db_connect.php';
} elseif (file_exists('api/db_connect.php')) {
    require 'api/db_connect.php';
} else {
    die("Error: Could not find db_connect.php");
}

// Clear any buffers or JSON headers from db_connect.php
if (ob_get_length())
    ob_clean();
header('Content-Type: text/html; charset=UTF-8');

$flowId = '6972fea76fa61';

try {
    // 1. Get Flow Steps
    $stmt = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
    $stmt->execute([$flowId]);
    $stepsJson = $stmt->fetchColumn();
    $steps = json_decode($stepsJson, true) ?: [];

    echo "<h2>Flow Reconstruction for $flowId</h2>";

    // Find Step 3.IF.12
    $step12Id = null;

    foreach ($steps as $s) {
        if (strpos($s['label'] ?? '', '3.IF.12') !== false) {
            $step12Id = $s['id'];
        }
    }

    if (!$step12Id) {
        // Based on user's manual list, Step 12 (last email) is likely 6bf86c26-83b4-4c41-b822-1ff0c00a61c9
        $step12Id = '6bf86c26-83b4-4c41-b822-1ff0c00a61c9';
    }

    echo "Target Step 12 (Last Email): <b>" . htmlspecialchars($step12Id) . "</b><br>";

    // 2. Count "Completed" users
    $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'completed'");
    $stmtCount->execute([$flowId]);
    $completedCount = $stmtCount->fetchColumn();

    echo "Current Completed Subscribers (Dropped off): <b>$completedCount</b><br>";

    if ($completedCount > 0) {
        echo "<h4>Action:</h4>";
        echo "<form method='POST'>
                <input type='hidden' name='target_step' value='$step12Id'>
                <input type='submit' value='REVIVE $completedCount USERS TO LAST EMAIL STEP' style='padding:15px; background:green; color:white; border:none; border-radius:5px; cursor:pointer;'>
              </form>";
    } else {
        echo "<p style='color:orange;'>No completed users to revive.</p>";
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $target = $_POST['target_step'] ?? $_POST['force_target'] ?? null;
        if ($target) {
            $pdo->beginTransaction();

            // Move users
            $stmtMove = $pdo->prepare("UPDATE subscriber_flow_states 
                                       SET step_id = ?, status = 'waiting', scheduled_at = NOW(), updated_at = NOW() 
                                       WHERE flow_id = ? AND status = 'completed'");
            $stmtMove->execute([$target, $flowId]);
            $moved = $stmtMove->rowCount();

            // Fix stats - Correct SQL syntax
            $stmtUpdate = $pdo->prepare("UPDATE flows SET stat_completed = IF(stat_completed > ?, stat_completed - ?, 0) WHERE id = ?");
            $stmtUpdate->execute([$moved, $moved, $flowId]);

            $pdo->commit();
            echo "<div style='padding:20px; background:#dcfce7; border:1px solid #22c55e; margin-top:20px;'>
                    <h3 style='color:#166534;'>DONE!</h3>
                    <p>Moved <b>$moved</b> users back into the flow at step <b>$target</b>.</p>
                    <p><a href='check_campaign_6972fea76fa61.php'>Check Diagnostic Tool</a></p>
                  </div>";
        }
    }

} catch (Exception $e) {
    echo "<h3 style='color:red;'>Error: " . $e->getMessage() . "</h3>";
}
