<?php
// api/force_run_user_v2.php
// FORCE RUN V2: Direct Database Manipulation to Unstick Subscriber

require_once 'db_connect.php';

// EMAIL TARGET
$targetEmail = 'marketing@ideas.edu.vn';

header('Content-Type: text/html; charset=utf-8');
echo "<h1>FORCE RUN V2: Unsticking $targetEmail</h1>";

// 1. Get Waiting Record
$stmt = $pdo->prepare("
    SELECT sfs.*, f.name as flow_name, f.steps 
    FROM subscriber_flow_states sfs
    JOIN subscribers s ON sfs.subscriber_id = s.id
    JOIN flows f ON sfs.flow_id = f.id
    WHERE s.email = ? AND sfs.status = 'waiting'
");
$stmt->execute([$targetEmail]);
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($items)) {
    // DIAGNOSTIC: Check if they are completed
    $stmtComp = $pdo->prepare("SELECT status, updated_at, flow_id FROM subscriber_flow_states sfs JOIN subscribers s ON sfs.subscriber_id = s.id WHERE s.email = ?");
    $stmtComp->execute([$targetEmail]);
    $allStates = $stmtComp->fetchAll(PDO::FETCH_ASSOC);

    echo "<h2 style='color:red;'>User is NOT waiting in any flow!</h2>";
    if ($allStates) {
        echo "<h3>Current States Found:</h3><ul>";
        foreach ($allStates as $st) {
            echo "<li>Flow {$st['flow_id']}: <strong>{$st['status']}</strong> (Last Update: {$st['updated_at']})</li>";
        }
        echo "</ul>";
        echo "<p>If status is <strong>completed</strong>, this tool will NOT run. This is correct behavior.</p>";
    }
    die();
}

foreach ($items as $item) {
    echo "<div style='border:1px solid #ccc; padding:20px; margin-bottom:20px;'>";
    echo "<h3>Flow: {$item['flow_name']} (Step ID: {$item['step_id']})</h3>";

    // 2. Find Current Step Config
    $flowSteps = json_decode($item['steps'], true);
    $currentStep = null;
    foreach ($flowSteps as $s) {
        if ($s['id'] === $item['step_id']) {
            $currentStep = $s;
            break;
        }
    }

    if (!$currentStep) {
        echo "Step definition not found.";
        continue;
    }

    echo "Type: " . $currentStep['type'] . "<br>";

    if ($currentStep['type'] === 'condition') {
        echo "Checking CLICK Condition...<br>";

        // 3. FORCE CHECK CLICK (DEBUG MODE)

        $condRefId = $currentStep['config']['targetStepId'] ?? null;

        // Check ALL clicks since entry
        $sql = "SELECT * FROM subscriber_activity 
                WHERE subscriber_id = ? 
                AND type = 'click_link' 
                AND flow_id = ? 
                AND created_at >= '{$item['created_at']}'";

        $params = [$item['subscriber_id'], $item['flow_id']];

        if ($condRefId) {
            $sql .= " AND reference_id = ?";
            $params[] = $condRefId;
            $sql .= " ORDER BY created_at DESC"; // All clicks for this email
        } else {
            $sql .= " ORDER BY created_at DESC LIMIT 50";
        }

        $stmtCheck = $pdo->prepare($sql);
        $stmtCheck->execute($params);
        $activities = $stmtCheck->fetchAll(PDO::FETCH_ASSOC);

        $validActivity = null;

        $linkTargets = $currentStep['config']['linkTargets'] ?? [];
        if (!is_array($linkTargets) && !empty($currentStep['config']['linkTarget'])) {
            $linkTargets = [$currentStep['config']['linkTarget']];
        }

        echo "Checking against " . count($activities) . " recent clicks...<br>";
        if (!empty($linkTargets)) {
            echo "Targets: " . implode(", ", $linkTargets) . "<br>";
        } else {
            echo "Targets: ANY (No specific link configured)<br>";
        }

        foreach ($activities as $act) {
            $rawDetail = $act['details'];
            $clickedUrl = str_replace(["Click link: ", "Clicked link: "], "", $rawDetail);
            echo " - Found Click: $clickedUrl <br>";

            if (empty($linkTargets)) {
                $validActivity = $act;
                break;
            }

            // URL Match Logic
            $compareUrls = function ($target, $candidate) {
                $target = html_entity_decode($target);
                $candidate = html_entity_decode($candidate);
                $tParts = parse_url($target);
                $cParts = parse_url($candidate);

                $tHost = str_replace('www.', '', trim($tParts['host'] ?? ''));
                $cHost = str_replace('www.', '', trim($cParts['host'] ?? ''));
                if ($tHost !== $cHost)
                    return false;

                $tPath = rtrim($tParts['path'] ?? '', '/');
                $cPath = rtrim($cParts['path'] ?? '', '/');
                if ($tPath !== $cPath)
                    return false;

                $tQuery = [];
                if (isset($tParts['query']))
                    parse_str($tParts['query'], $tQuery);
                $cQuery = [];
                if (isset($cParts['query']))
                    parse_str($cParts['query'], $cQuery);
                foreach ($tQuery as $k => $v) {
                    if (!isset($cQuery[$k]) || $cQuery[$k] != $v)
                        return false;
                }
                return true;
            };

            foreach ($linkTargets as $target) {
                if ($compareUrls($target, $clickedUrl)) {
                    $validActivity = $act;
                    echo "   -> MATCHED! <br>";
                    break 2;
                } else {
                    echo "   -> No match with target<br>";
                }
            }
        }

        if ($validActivity) {
            echo "<strong style='color:green'>FOUND VALID MATCHING CLICK!</strong><br>";
            echo "Details: " . $validActivity['details'] . "<br>";

            // 4. FORCE MOVE
            $nextStepId = $currentStep['yesStepId'] ?? null;
            if ($nextStepId) {
                echo "Attempting to move to YES Step: $nextStepId ...<br>";

                $stmtUpdate = $pdo->prepare("
                    UPDATE subscriber_flow_states 
                    SET step_id = ?, status = 'waiting', scheduled_at = NOW(), updated_at = NOW() 
                    WHERE id = ?
                ");
                $stmtUpdate->execute([$nextStepId, $item['id']]);

                echo "<h2 style='color:blue'>SUCCESS: User MOVED manually to next step!</h2>";

                // Add Log
                $pdo->prepare("INSERT INTO subscriber_activity (subscriber_id, type, details, created_at) VALUES (?, 'system_log', 'Manually forced by V2 script', NOW())")->execute([$item['subscriber_id']]);

                // [FIX] Add 'condition_true' Log so Analytics count this user!
                $pdo->prepare("INSERT INTO subscriber_activity (subscriber_id, type, reference_id, flow_id, details, created_at) VALUES (?, 'condition_true', ?, ?, 'Manually matched via Force Run', NOW())")
                    ->execute([$item['subscriber_id'], $item['step_id'], $item['flow_id']]);

            } else {
                echo "<strong style='color:orange'>WARNING: 'Yes' Step is empty (End of Flow Check?)</strong>";
                // Complete user
                $pdo->prepare("UPDATE subscriber_flow_states SET status = 'completed' WHERE id = ?")->execute([$item['id']]);
                echo "User marked as COMPLETED.";
            }

        } else {
            echo "<strong style='color:red'>NO CLICK FOUND since {$item['created_at']}</strong>.<br>";
            echo "To fix manually, click this link now via your email!";
        }
    } else {
        echo "Not a condition step. Skipping force check.";
    }
    echo "</div>";
}
?>