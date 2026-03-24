<?php
// api/test_flow_single.php
require_once 'db_connect.php';
require_once 'Mailer.php';
require_once 'FlowExecutor.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<pre>--- TESTING SPECIFIC FLOW FOR turniodev ---\n";

try {
    $email = 'turniodev@gmail.com';
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

    $stmt = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
    $stmt->execute([$email]);
    $subId = $stmt->fetchColumn();

    if (!$subId)
        die("Subscriber not found.");

    // Fetch the flow state for THIS specific flow
    $stmt = $pdo->prepare("
        SELECT q.*, f.steps as flow_steps, f.config as flow_config, f.name as flow_name, s.email as sub_email
        FROM subscriber_flow_states q
        JOIN flows f ON q.flow_id = f.id
        JOIN subscribers s ON q.subscriber_id = s.id
        WHERE q.subscriber_id = ? AND q.flow_id = ?
        LIMIT 1
    ");
    $stmt->execute([$subId, $fid]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$item)
        die("No flow state found for this user in Flow: $fid.");

    echo "Sub ID: $subId | Flow: {$item['flow_name']} (ID: $fid)\n";
    echo "Current Step ID: {$item['step_id']} | Status: {$item['status']}\n";

    $mailer = new Mailer($pdo, API_BASE_URL, "marketing@ka-en.com.vn");
    $executor = new FlowExecutor($pdo, $mailer, API_BASE_URL);

    $flowSteps = json_decode($item['flow_steps'], true);
    $fConfig = json_decode($item['flow_config'], true) ?: [];

    // Find current step
    $currentStep = null;
    foreach ($flowSteps as $s) {
        if (trim($s['id']) === trim($item['step_id'])) {
            $currentStep = $s;
            break;
        }
    }

    if (!$currentStep)
        die("Step {$item['step_id']} not found in flow definition.");

    echo "Executing Step: {$currentStep['label']} (type: {$currentStep['type']})\n";

    // We pass null for activity cache to force DB fetch in Executor
    $res = $executor->executeStep($currentStep, $item, $item['flow_id'], $item['step_id'], null, $fConfig, ['flow_steps' => $flowSteps]);

    echo "\n--- EXECUTION RESULT ---\n";
    print_r($res);

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
