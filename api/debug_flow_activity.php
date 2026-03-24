<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once 'db_connect.php';

$email = 'thucle75@gmail.com';
echo "<pre>";
echo "--- Debug Info for $email ---\n";

// 1. Get Subscriber
$stmt = $pdo->prepare("SELECT * FROM subscribers WHERE email = ?");
$stmt->execute([$email]);
$sub = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$sub) {
    echo "Subscriber not found.\n";
    exit;
}

echo "Subscriber ID: " . $sub['id'] . "\n";

// 2. Find the Flow
$flowName = "Chăm sóc sau Chiến dịch";
$stmtF = $pdo->prepare("SELECT * FROM flows WHERE name = ?");
$stmtF->execute([$flowName]);
$flow = $stmtF->fetch(PDO::FETCH_ASSOC);

if (!$flow) {
    echo "Flow '$flowName' not found. Listing active flows:\n";
    $stmtAll = $pdo->query("SELECT id, name FROM flows WHERE status='active' LIMIT 10");
    print_r($stmtAll->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

echo "Flow ID: " . $flow['id'] . " (UUID: " . $flow['uuid'] . ")\n";

// 3. Check Flow State
$stmtState = $pdo->prepare("SELECT * FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ?");
$stmtState->execute([$sub['id'], $flow['id']]);
$state = $stmtState->fetch(PDO::FETCH_ASSOC);

if (!$state) {
    echo "Subscriber not in flow state table.\n";
} else {
    echo "\nFlow State:\n";
    print_r($state);
}

// 4. Check Activities
echo "\nRecent Activities (Last 20):\n";
$stmtAct = $pdo->prepare("SELECT id, type, campaign_id, flow_id, created_at, details, reference_id FROM subscriber_activity WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 20");
$stmtAct->execute([$sub['id']]);
$acts = $stmtAct->fetchAll(PDO::FETCH_ASSOC);
print_r($acts);

// 5. Check Campaign Info
// The target trigger campaign ID from JSON is 6985cffc6c490
$targetCampaignId = '6985cffc6c490';
echo "\nChecking Campaign Target ID: $targetCampaignId\n";
$stmtC = $pdo->prepare("SELECT id, name, campaign_uuid FROM campaigns WHERE id = ? OR campaign_uuid = ?");
$stmtC->execute([$targetCampaignId, $targetCampaignId]);
$camp = $stmtC->fetch(PDO::FETCH_ASSOC);
if ($camp) {
    echo "Found Campaign:\n";
    print_r($camp);
} else {
    echo "Campaign $targetCampaignId not found.\n";
}

// 6. Manual Check Logic Simulation
echo "\n--- Simulation ---\n";
if ($state && $state['status'] === 'waiting') {
    echo "Flow is waiting. Step ID: " . $state['step_id'] . "\n";
    // Check if this matches the Condition step
    // We assume the Condition Step is the one passing.
    // Let's decode flow steps
    $steps = json_decode($flow['steps'], true);
    $conditionStep = null;
    foreach ($steps as $s) {
        if ($s['id'] === $state['step_id']) {
            $conditionStep = $s;
            break;
        }
    }

    if ($conditionStep && $conditionStep['type'] === 'condition') {
        echo "Current step IS Condition.\n";
        $condType = $conditionStep['config']['conditionType'] ?? 'opened';
        echo "Condition Type: $condType\n";

        // Logic
        $isMatched = false;
        foreach ($acts as $act) {
            // Only checking open_email for now
            if ($act['type'] === 'open_email') {
                // Check Campaign Match
                $actCampId = $act['campaign_id'];
                echo "Tracking Event ID {$act['id']} - Campaign ID: '$actCampId' vs Target '$targetCampaignId'\n";

                // Loose comparison
                if ((string) $actCampId === (string) $targetCampaignId) {
                    echo "MATCH FOUND!\n";
                    $isMatched = true;
                } else {
                    echo "No match.\n";
                }
            }
        }

        if ($isMatched)
            echo "CONCLUSION: Should have matched.\n";
        else
            echo "CONCLUSION: No matching activity found.\n";
    } else {
        echo "Current step is NOT condition (Type: " . ($conditionStep['type'] ?? 'unknown') . ")\n";
    }
} else {
    echo "Status is not waiting (or no state). Status: " . ($state['status'] ?? 'null') . "\n";
}

echo "</pre>";
?>