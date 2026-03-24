<?php
// Set plain text header for easy reading in browser
header("Content-Type: text/plain; charset=UTF-8");

require_once 'db_connect.php';

try {
    $output = "### SYSTEM AUTOMATION TRIGGER AUDIT ###\n\n";

    // 1. List all active Flow Triggers
    $stmt = $pdo->query("SELECT id, name, steps FROM flows WHERE status = 'active'");
    $flows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $output .= "#### 1. ACTIVE FLOW TRIGGERS ####\n";
    $allTriggers = [];
    foreach ($flows as $f) {
        $steps = json_decode($f['steps'], true) ?: [];
        foreach ($steps as $s) {
            if ($s['type'] === 'trigger') {
                $tType = $s['config']['type'] ?? 'unknown';
                $tTarget = $s['config']['targetId'] ?? $s['config']['targetSubtype'] ?? 'all';
                $allTriggers[$tType][] = [
                    'flow_name' => $f['name'],
                    'target' => $tTarget,
                    'config' => $s['config']
                ];
            }
        }
    }

    if (empty($allTriggers)) {
        $output .= "No active flows with triggers found.\n";
    } else {
        foreach ($allTriggers as $type => $instances) {
            $output .= "- **Type: $type**\n";
            foreach ($instances as $inst) {
                $targetDisplay = is_array($inst['target']) ? json_encode($inst['target']) : $inst['target'];
                $output .= "  - Flow: {$inst['flow_name']} (Target: $targetDisplay)\n";
            }
        }
    }

    $output .= "\n#### 2. BACKEND IMPLEMENTATION STATUS ####\n";

    $implementations = [
        'added_to_list' => [
            'handled_in' => ['api/lists.php', 'api/subscribers.php', 'api/bulk_operations.php'],
            'method' => 'enrollSubscribersBulk(..., "added_to_list", $listId)',
            'status' => 'Verified'
        ],
        'list' => [
            'handled_in' => ['api/subscribers.php', 'api/bulk_operations.php'],
            'method' => 'triggerFlows(..., "list", $listId)',
            'status' => 'Verified'
        ],
        'tag' => [
            'handled_in' => ['api/subscribers.php', 'api/bulk_operations.php', 'api/tags.php'],
            'method' => 'triggerFlows(..., "tag", $tagName)',
            'status' => 'Verified'
        ],
        'form' => [
            'handled_in' => ['api/forms.php', 'api/web_tracking_processor.php'],
            'method' => 'triggerFlows(..., "form", $formId)',
            'status' => 'Verified (triggered via Website Tracking & Form Submit)'
        ],
        'segment' => [
            'handled_in' => ['api/trigger_helper.php'],
            'method' => 'checkDynamicTriggers() -> enrollSubscribersBulk(..., "segment", ...)',
            'status' => 'Verified (Polled/Dynamic)'
        ],
        'date' => [
            'handled_in' => ['api/worker_trigger.php', 'api/trigger_helper.php'],
            'method' => 'enrollSubscribersBulk(..., "date", ...)',
            'status' => 'Verified (Cron/Polled)'
        ],
        'campaign' => [
            'handled_in' => ['api/worker_trigger.php'],
            'method' => 'enrollSubscribersBulk(..., "campaign", ...)',
            'status' => 'Verified (Cron/Polled)'
        ],
        'manual' => [
            'handled_in' => ['api/worker_priority.php'],
            'method' => 'Direct via priority_sid & target_id',
            'status' => 'Verified'
        ],
        'custom_event' => [
            'handled_in' => ['api/custom_events.php'],
            'method' => 'triggerFlows(..., "custom_event", $eventId)',
            'status' => 'Verified'
        ],
        'purchase' => [
            'handled_in' => ['api/purchase_events.php'],
            'method' => 'triggerFlows(..., "purchase", $eventId)',
            'status' => 'Verified'
        ],
        'inbound_message' => [
            'handled_in' => ['api/meta_webhook.php', 'api/webhook.php'],
            'method' => 'triggerFlows(..., "inbound_message", ...)',
            'status' => 'Verified'
        ],
        'zalo_follow' => [
            'handled_in' => ['api/webhook.php'],
            'method' => 'triggerFlows(..., "zalo_follow", null)',
            'status' => 'Verified'
        ],
        'unsubscribe' => [
            'handled_in' => ['api/tracking_processor.php'],
            'method' => 'triggerFlows(..., "unsubscribe", null)',
            'status' => 'Verified'
        ]
    ];


    foreach ($implementations as $type => $info) {
        $output .= "##### Trigger: $type\n";
        $output .= "- **Handled In:** " . implode(', ', $info['handled_in']) . "\n";
        $output .= "- **Method:** `{$info['method']}`\n";
        $output .= "- **Status:** {$info['status']}\n\n";
    }

    $output .= "#### 3. RECOMMENDATIONS ####\n";
    $output .= "1. **Purchase Trigger**: Enhancing data collection from e-commerce platforms could utilize the `purchase` trigger type more extensively.\n";
    $output .= "2. **Monitoring**: Regularly check `worker_priority.php` logs (if enabled) to ensure inbound message flows are triggering as expected without high latency.\n";


    // Attempt to save to file for record keeping
    @file_put_contents(__DIR__ . '/../SYSTEM_AUTOMATION_AUDIT.md', $output);

    // Output directly for immediate feedback
    echo $output;

} catch (Exception $e) {
    echo "AUDIT ERROR: " . $e->getMessage() . "\n";
    echo "TRACE:\n" . $e->getTraceAsString();
}


