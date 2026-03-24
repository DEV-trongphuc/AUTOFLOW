<?php
// api/debug_ultimate_flow.php - ULTIMATE FLOW DEBUGGER V1.0
// Usage: debug_ultimate_flow.php?email=...&flow_id=...

require_once 'db_connect.php';
require_once 'flow_helpers.php';

header('Content-Type: text/plain; charset=utf-8');

$email = $_GET['email'] ?? null;
$flowId = $_GET['flow_id'] ?? null;

if (!$email || !$flowId) {
    die("Usage: ?email=test@example.com&flow_id=YOUR_FLOW_UUID");
}

echo "================================================================================\n";
echo "ULTIMATE FLOW DEBUGGER - TRACING JOURNEY FOR: $email\n";
echo "================================================================================\n\n";

// 1. Fetch Subscriber
$stmtSub = $pdo->prepare("SELECT * FROM subscribers WHERE email = ?");
$stmtSub->execute([$email]);
$subscriber = $stmtSub->fetch(PDO::FETCH_ASSOC);

if (!$subscriber) {
    die("ERROR: Subscriber not found: $email\n");
}

$subId = $subscriber['id'];
echo "[SUBSCRIBER INFO]\n";
echo "ID: $subId\n";
echo "Email: {$subscriber['email']}\n";
echo "Status: {$subscriber['status']}\n";
echo "Lead Score: {$subscriber['lead_score']}\n";
echo "Tags (DB): {$subscriber['tags']}\n";

// Fetch actual relational tags
$stmtT = $pdo->prepare("SELECT t.name FROM subscriber_tags st JOIN tags t ON st.tag_id = t.id WHERE st.subscriber_id = ?");
$stmtT->execute([$subId]);
$relTags = $stmtT->fetchAll(PDO::FETCH_COLUMN);
echo "Relational Tags: " . implode(', ', $relTags) . "\n\n";

// 2. Fetch Flow Meta
$stmtFlow = $pdo->prepare("SELECT id, name, status, steps, config FROM flows WHERE id = ?");
$stmtFlow->execute([$flowId]);
$flow = $stmtFlow->fetch(PDO::FETCH_ASSOC);

if (!$flow) {
    die("ERROR: Flow not found: $flowId\n");
}

echo "[FLOW INFO]\n";
echo "ID: {$flow['id']}\n";
echo "Name: {$flow['name']}\n";
echo "Status: {$flow['status']}\n";
$flowSteps = json_decode($flow['steps'], true);
$flowConfig = json_decode($flow['config'], true) ?: [];
echo "Steps Count: " . count($flowSteps) . "\n\n";

// 3. Current Flow State (Queue)
$stmtState = $pdo->prepare("SELECT * FROM subscriber_flow_states WHERE subscriber_id = ? AND flow_id = ?");
$stmtState->execute([$subId, $flowId]);
$state = $stmtState->fetch(PDO::FETCH_ASSOC);

echo "[CURRENT FLOW STATE]\n";
if (!$state) {
    echo "NO ACTIVE STATE (Subscriber is not currently in this flow queue).\n\n";
} else {
    echo "Queue ID: {$state['id']}\n";
    echo "Status: {$state['status']}\n";
    echo "Current Step ID: {$state['step_id']}\n";
    echo "Scheduled At: {$state['scheduled_at']}\n";
    echo "Last Step At: {$state['last_step_at']}\n";
    echo "Updated At: {$state['updated_at']}\n";
    if (!empty($state['last_error'])) {
        echo "LAST ERROR: {$state['last_error']}\n";
    }

    // Identify current step label
    $currentStepLabel = "Unknown";
    foreach ($flowSteps as $s) {
        if ($s['id'] === $state['step_id']) {
            $currentStepLabel = $s['label'] ?? $s['type'];
            break;
        }
    }
    echo "Current Step Label: $currentStepLabel\n\n";
}

// 4. Activity History (Last 20 relevant to this flow)
echo "[RECENT ACTIVITY (relevant to flow/campaigns)]\n";
$stmtAct = $pdo->prepare("SELECT type, reference_name, details, reference_id, created_at, campaign_id, flow_id 
                         FROM subscriber_activity 
                         WHERE subscriber_id = ? 
                         ORDER BY created_at DESC LIMIT 20");
$stmtAct->execute([$subId]);
$activities = $stmtAct->fetchAll(PDO::FETCH_ASSOC);

if (empty($activities)) {
    echo "No recent activity found.\n\n";
} else {
    echo str_pad("TIME", 20) . " | " . str_pad("TYPE", 25) . " | " . str_pad("REF", 20) . " | DETAILS\n";
    echo str_repeat("-", 100) . "\n";
    foreach ($activities as $act) {
        $time = $act['created_at'];
        $type = $act['type'];
        $ref = $act['reference_name'] ?: ($act['reference_id'] ?: 'N/A');
        $details = $act['details'];
        echo str_pad($time, 20) . " | " . str_pad($type, 25) . " | " . str_pad($ref, 20) . " | $details\n";
    }
    echo "\n";
}

// 5. Condition Analysis (If currently waiting)
if ($state && $state['status'] === 'waiting') {
    $currentStep = null;
    foreach ($flowSteps as $s) {
        if ($s['id'] === $state['step_id']) {
            $currentStep = $s;
            break;
        }
    }

    if ($currentStep && $currentStep['type'] === 'condition') {
        echo "[CONDITION ANALYSIS: '{$currentStep['label']}']\n";
        $condType = $currentStep['config']['conditionType'] ?? 'opened';
        $waitDur = (int) ($currentStep['config']['waitDuration'] ?? 1);
        $waitUnit = $currentStep['config']['waitUnit'] ?? 'hours';

        echo "Type: $condType | Wait: $waitDur $waitUnit\n";

        // Timeout check
        $startTime = $state['last_step_at'] ?: $state['created_at'];
        $timeout = new DateTime($startTime);
        $timeout->modify("+$waitDur $waitUnit");
        $now = new DateTime();
        $isTimedOut = $now > $timeout;

        echo "Start Time: $startTime\n";
        echo "Timeout At: " . $timeout->format('Y-m-d H:i:s') . "\n";
        echo "Is Timed Out? " . ($isTimedOut ? "YES" : "NO") . "\n";

        // Activity Check Simulation
        $types = [];
        if ($condType === 'opened')
            $types = ['open_email', 'open_zns'];
        elseif ($condType === 'clicked')
            $types = ['click_link', 'click_zns'];
        elseif ($condType === 'replied')
            $types = ['reply_email'];

        $foundMatch = false;
        foreach ($activities as $act) {
            if (in_array($act['type'], $types)) {
                // Simplified matching logic for debug
                $foundMatch = true;
                echo "MATCH FOUND: Activity '{$act['type']}' at {$act['created_at']}\n";
                break;
            }
        }

        if (!$foundMatch) {
            echo "MATCH status: NOT MET YET.\n";
        }
        echo "\n";
    }
}

// 6. Next Flow Prediction
if ($state && $state['status'] === 'processing') {
    echo "[NEXT STEP PREDICTION]\n";
    // Find current step
    $curr = null;
    foreach ($flowSteps as $s) {
        if ($s['id'] === $state['step_id']) {
            $curr = $s;
            break;
        }
    }
    if ($curr) {
        echo "Current Action: {$curr['type']} ({$curr['label']})\n";
        $next = $curr['nextStepId'] ?? $curr['nextStepID'] ?? null;
        if ($next) {
            echo "Direct Next Step ID: $next\n";
        } elseif ($curr['type'] === 'condition') {
            echo "Decision: IF YES -> {$curr['yesStepId']}, IF NO -> {$curr['noStepId']}\n";
        }
    }
    echo "\n";
}

// 7. System Health Check for this Flow
echo "[SYSTEM HEALTH]\n";
$stmtJobs = $pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'processing' AND updated_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)");
$stmtJobs->execute([$flowId]);
$stuckJobs = $stmtJobs->fetchColumn();
echo "Stuck Jobs (>10m processing): $stuckJobs\n";

$stmtQueue = $pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'waiting' AND scheduled_at <= NOW()");
$stmtQueue->execute([$flowId]);
$dueQueue = $stmtQueue->fetchColumn();
echo "Jobs Due/Overdue: $dueQueue\n";

echo "\n================================================================================\n";
echo "DEBUG COMPLETE\n";
echo "================================================================================\n";
