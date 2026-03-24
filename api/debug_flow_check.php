<?php
// api/debug_flow_check.php
// Tool to debug why subscribers are stuck in 'waiting' state

require_once 'db_connect.php';
require_once 'flow_helpers.php';

header('Content-Type: text/html; charset=utf-8');
echo "<h1>Flow Condition Debugger</h1>";
echo "<style>body{font-family:sans-serif; padding:20px;} hr{margin:20px 0;} .pass{color:green;font-weight:bold;} .fail{color:red;font-weight:bold;} pre{background:#f4f4f4;padding:10px;overflow-x:auto;}</style>";

// 1. Fetch Waiting Subscribers
echo "<h2>1. Waiting Subscribers (Top 10)</h2>";
$stmt = $pdo->query("
    SELECT q.*, s.email, f.name as flow_name, f.steps 
    FROM subscriber_flow_states q
    JOIN subscribers s ON q.subscriber_id = s.id
    JOIN flows f ON q.flow_id = f.id
    WHERE q.status = 'waiting'
    ORDER BY q.updated_at DESC
    LIMIT 10
");
$queue = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($queue)) {
    echo "<p>No subscribers currently waiting.</p>";
    exit;
}

foreach ($queue as $item) {
    echo "<div style='border:1px solid #ddd; padding:15px; margin-bottom:15px;'>";
    echo "<h3>User: {$item['email']} | Flow: {$item['flow_name']}</h3>";
    echo "<p><strong>Step ID:</strong> {$item['step_id']}</p>";
    echo "<p><strong>Status:</strong> {$item['status']}</p>";
    echo "<p><strong>Scheduled At:</strong> {$item['scheduled_at']}</p>";
    echo "<p><strong>Entry Time (Created At):</strong> {$item['created_at']}</p>";
    echo "<p><strong>System Time Now:</strong> " . date('Y-m-d H:i:s') . "</p>";

    // Find Step Config
    $steps = json_decode($item['steps'], true);
    $currentStep = null;
    foreach ($steps as $s) {
        if ($s['id'] === $item['step_id']) {
            $currentStep = $s;
            break;
        }
    }

    if (!$currentStep) {
        echo "<p class='fail'>Error: Step ID not found in Flow definition.</p>";
        continue;
    }

    echo "<p><strong>Current Step Type:</strong> {$currentStep['type']}</p>";
    echo "<strong>Step Config:</strong> <pre>" . json_encode($currentStep['config'], JSON_PRETTY_PRINT) . "</pre>";

    // Logic Check
    if ($currentStep['type'] === 'condition') {
        $config = $currentStep['config'];
        $conditions = $config['conditions'] ?? [];

        echo "<h4>Checking Conditions:</h4>";

        foreach ($conditions as $idx => $cond) {
            echo "<ul><li><strong>Condition #$idx:</strong> " . json_encode($cond) . "</li>";

            $condType = $cond['type'] ?? '';

            if ($condType === 'clicked' || $condType === 'zns_clicked') {
                $actType = ($condType === 'zns_clicked') ? 'click_zns' : 'click_link';
                $flowId = $item['flow_id'];
                $subId = $item['subscriber_id'];
                $queueCreatedAt = $item['created_at'];

                // THE QUERY
                $sql = "SELECT * FROM subscriber_activity 
                        WHERE subscriber_id = ? 
                        AND type = ? 
                        AND flow_id = ? 
                        AND created_at >= (SELECT created_at FROM subscriber_flow_states WHERE id = ?)";

                echo "<div>Querying Activity: <code>$sql</code></div>";
                echo "<div>Params: SubID=$subId, Type=$actType, FlowID=$flowId, QueueID={$item['id']}</div>";

                $stmtAct = $pdo->prepare($sql);
                $stmtAct->execute([$subId, $actType, $flowId, $item['id']]);
                $activities = $stmtAct->fetchAll(PDO::FETCH_ASSOC);

                if (!empty($activities)) {
                    echo "<p class='pass'>FOUND " . count($activities) . " matching activities!</p>";
                    echo "<pre>" . json_encode($activities, JSON_PRETTY_PRINT) . "</pre>";

                    // Specific URL Check
                    $targets = $config['linkTargets'] ?? [];
                    if (!empty($config['linkTarget']))
                        $targets[] = $config['linkTarget'];

                    if (empty($targets)) {
                        echo "<p class='pass'>-> Result: MATCHED (Any Link)</p>";
                    } else {
                        $matchedUrl = false;
                        foreach ($activities as $act) {
                            $rawDetail = $act['details'];
                            $clickedUrl = str_replace(["Click link: ", "Clicked link: "], "", $rawDetail);
                            echo "<div>Comparing Clicked: <code>$clickedUrl</code></div>";

                            // Simulate Helper Logic
                            foreach ($targets as $t) {
                                echo "<div>.. against Target: <code>$t</code></div>";
                                if (compareUrlSim($t, $clickedUrl)) {
                                    $matchedUrl = true;
                                    echo "<span class='pass'>MATCHED!</span>";
                                    break 2;
                                }
                            }
                        }
                        if (!$matchedUrl)
                            echo "<p class='fail'>-> Result: URL MISMATCH</p>";
                        else
                            echo "<p class='pass'>-> Result: MATCHED SPECIFIC URL</p>";
                    }

                }

                // FORCE SHOW DEEP DIVE LOG ALWAYS
                echo "<div style='background:#f0fbff; padding:10px; margin-top:10px; border:1px solid #cce5ff;'><strong>DEEP DIVE: All Activity for this User:</strong>";
                $stmtAll = $pdo->prepare("SELECT id, type, created_at, details, flow_id, reference_id FROM subscriber_activity WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 100");
                $stmtAll->execute([$subId]);
                $recent = $stmtAll->fetchAll(PDO::FETCH_ASSOC);

                if (empty($recent)) {
                    echo "<p style='color:red;'>No activity found at all in subscriber_activity table.</p>";
                } else {
                    echo "<table border='1' cellpadding='5' style='border-collapse:collapse; width:100%; font-size:11px;'>";
                    echo "<tr><th>ID</th><th>Type</th><th>Time</th><th>Flow ID</th><th>Step ID</th><th>Details</th></tr>";
                    foreach ($recent as $r) {
                        $matchFlow = ($r['flow_id'] == $flowId) ? "style='background:#d4edda'" : "";
                        $matchType = ($r['type'] == $actType) ? "font-weight:bold;" : "";
                        $isAfter = ($r['created_at'] >= $queueCreatedAt) ? "<span style='color:green'>[NEW]</span>" : "<span style='color:gray'>[OLD]</span>";

                        echo "<tr $matchFlow>
                            <td>{$r['id']}</td>
                            <td style='$matchType'>{$r['type']}</td>
                            <td>{$r['created_at']} $isAfter</td>
                            <td>{$r['flow_id']}</td>
                            <td>{$r['reference_id']}</td>
                            <td style='max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' title='" . htmlspecialchars($r['details']) . "'>" . htmlspecialchars($r['details']) . "</td>
                            </tr>";
                    }
                    echo "</table>";
                }
                echo "</div>";
            }
            echo "</ul>";
        }
    }

    echo "</div>";
}

// Logic Copy for Simulation
function compareUrlSim($target, $candidate)
{
    $target = html_entity_decode($target);
    $candidate = html_entity_decode($candidate);

    $tParts = parse_url($target);
    $cParts = parse_url($candidate);

    $tHost = trim($tParts['host'] ?? '');
    $cHost = trim($cParts['host'] ?? '');
    $tHost = str_replace('www.', '', $tHost);
    $cHost = str_replace('www.', '', $cHost);

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
        if (!isset($cQuery[$k]) || $cQuery[$k] !== $v)
            return false;
    }
    return true;
}
?>