<?php
// api/generate_diagnostic_log.php - Generate text log for tracking diagnostic
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

$logOutput = "";
$logOutput .= "========================================\n";
$logOutput .= "MAILFLOW PRO - TRACKING DIAGNOSTIC LOG\n";
$logOutput .= "========================================\n";
$logOutput .= "Generated: " . date('Y-m-d H:i:s') . "\n\n";

// ============================================
// 1. DATABASE SCHEMA CHECK
// ============================================
$logOutput .= "1. DATABASE SCHEMA VERIFICATION\n";
$logOutput .= "================================\n";

$requiredTables = [
    'subscriber_activity' => [
        'id',
        'subscriber_id',
        'type',
        'reference_id',
        'flow_id',
        'campaign_id',
        'reference_name',
        'details',
        'ip_address',
        'user_agent',
        'device_type',
        'os',
        'browser',
        'location',
        'created_at'
    ],
    'queue_jobs' => ['id', 'queue', 'payload', 'status', 'available_at', 'created_at'],
    'subscribers' => ['id', 'email', 'stats_opened', 'stats_clicked', 'last_activity_at'],
    'flows' => ['id', 'stat_total_opened', 'stat_total_clicked', 'stat_unique_opened', 'stat_unique_clicked'],
    'campaigns' => ['id', 'count_opened', 'count_clicked', 'count_unique_opened', 'count_unique_clicked']
];

$schemaIssues = [];
foreach ($requiredTables as $table => $columns) {
    try {
        $stmt = $pdo->query("DESCRIBE `$table`");
        $existingCols = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $logOutput .= "\nTable: $table - EXISTS ✓\n";

        $missingCols = array_diff($columns, $existingCols);
        if (!empty($missingCols)) {
            $logOutput .= "  [ERROR] Missing columns: " . implode(', ', $missingCols) . "\n";
            $schemaIssues[] = "$table: missing " . implode(', ', $missingCols);
        } else {
            $logOutput .= "  All required columns present ✓\n";
        }

        // Show actual columns
        $logOutput .= "  Columns: " . implode(', ', $existingCols) . "\n";
    } catch (Exception $e) {
        $logOutput .= "\nTable: $table - NOT FOUND ✗\n";
        $logOutput .= "  Error: " . $e->getMessage() . "\n";
        $schemaIssues[] = "$table: table missing";
    }
}

if (empty($schemaIssues)) {
    $logOutput .= "\n[SUCCESS] All schema requirements met ✓\n";
} else {
    $logOutput .= "\n[ERROR] Schema issues found: " . count($schemaIssues) . "\n";
    foreach ($schemaIssues as $issue) {
        $logOutput .= "  - $issue\n";
    }
}

// ============================================
// 2. RECENT TRACKING ACTIVITY
// ============================================
$logOutput .= "\n\n2. RECENT TRACKING ACTIVITY (Last 24 Hours)\n";
$logOutput .= "============================================\n";

try {
    $stmt = $pdo->query("
        SELECT 
            type,
            COUNT(*) as count,
            MAX(created_at) as last_event
        FROM subscriber_activity 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY type
        ORDER BY count DESC
    ");
    $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($activities)) {
        $logOutput .= "\n[CRITICAL ERROR] NO TRACKING EVENTS in last 24 hours!\n";
        $logOutput .= "This indicates tracking is NOT working.\n";
    } else {
        $logOutput .= "\nEvent Type                Count    Last Event\n";
        $logOutput .= "------------------------------------------------\n";
        foreach ($activities as $act) {
            $logOutput .= sprintf("%-25s %-8s %s\n", $act['type'], $act['count'], $act['last_event']);
        }
    }
} catch (Exception $e) {
    $logOutput .= "\n[ERROR] " . $e->getMessage() . "\n";
}

// Check for specific tracking types
$logOutput .= "\nCritical Tracking Types Status:\n";
$criticalTypes = ['open_email', 'click_link', 'unsubscribe'];
foreach ($criticalTypes as $type) {
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE type = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)");
        $stmt->execute([$type]);
        $count = $stmt->fetchColumn();

        if ($count > 0) {
            $logOutput .= "  ✓ $type: $count events\n";
        } else {
            $logOutput .= "  ✗ $type: 0 events (NOT TRACKING)\n";
        }
    } catch (Exception $e) {
        $logOutput .= "  ✗ $type: Error checking - " . $e->getMessage() . "\n";
    }
}

// ============================================
// 3. ALL TRACKING ACTIVITY (Last 7 Days)
// ============================================
$logOutput .= "\n\n3. ALL TRACKING ACTIVITY (Last 7 Days)\n";
$logOutput .= "=======================================\n";

try {
    $stmt = $pdo->query("
        SELECT 
            DATE(created_at) as date,
            type,
            COUNT(*) as count
        FROM subscriber_activity 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at), type
        ORDER BY date DESC, count DESC
    ");
    $weeklyActivities = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($weeklyActivities)) {
        $logOutput .= "\n[CRITICAL ERROR] NO TRACKING EVENTS in last 7 days!\n";
    } else {
        $logOutput .= "\nDate         Type                      Count\n";
        $logOutput .= "------------------------------------------------\n";
        foreach ($weeklyActivities as $act) {
            $logOutput .= sprintf("%-12s %-25s %s\n", $act['date'], $act['type'], $act['count']);
        }
    }
} catch (Exception $e) {
    $logOutput .= "\n[ERROR] " . $e->getMessage() . "\n";
}

// ============================================
// 4. QUEUE SYSTEM STATUS
// ============================================
$logOutput .= "\n\n4. QUEUE SYSTEM STATUS\n";
$logOutput .= "======================\n";

try {
    $stmt = $pdo->query("
        SELECT 
            status,
            COUNT(*) as count
        FROM queue_jobs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY status
    ");
    $queueStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $logOutput .= "\nStatus       Count\n";
    $logOutput .= "-------------------\n";
    foreach ($queueStats as $stat) {
        $logOutput .= sprintf("%-12s %s\n", $stat['status'], $stat['count']);
    }

    // Check for failed jobs
    $stmt = $pdo->query("SELECT * FROM queue_jobs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10");
    $failedJobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($failedJobs)) {
        $logOutput .= "\nRecent Failed Jobs:\n";
        $logOutput .= "-------------------\n";
        foreach ($failedJobs as $job) {
            $logOutput .= "ID: {$job['id']}\n";
            $logOutput .= "Queue: {$job['queue']}\n";
            $logOutput .= "Error: " . ($job['error_message'] ?? 'N/A') . "\n";
            $logOutput .= "Created: {$job['created_at']}\n";
            $logOutput .= "Payload: " . substr($job['payload'], 0, 200) . "...\n";
            $logOutput .= "---\n";
        }
    }
} catch (Exception $e) {
    $logOutput .= "\n[ERROR] " . $e->getMessage() . "\n";
}

// ============================================
// 5. SUBSCRIBER STATS CHECK
// ============================================
$logOutput .= "\n\n5. SUBSCRIBER STATS CHECK\n";
$logOutput .= "=========================\n";

try {
    $stmt = $pdo->query("
        SELECT 
            COUNT(*) as total_subscribers,
            SUM(stats_opened) as total_opens,
            SUM(stats_clicked) as total_clicks,
            COUNT(CASE WHEN last_activity_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as active_24h
        FROM subscribers
    ");
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);

    $logOutput .= "\nTotal Subscribers: {$stats['total_subscribers']}\n";
    $logOutput .= "Total Opens (stats_opened): {$stats['total_opens']}\n";
    $logOutput .= "Total Clicks (stats_clicked): {$stats['total_clicks']}\n";
    $logOutput .= "Active in last 24h: {$stats['active_24h']}\n";

    // Check if stats match activity log
    $stmt = $pdo->query("SELECT COUNT(*) FROM subscriber_activity WHERE type = 'open_email'");
    $activityOpens = $stmt->fetchColumn();

    $stmt = $pdo->query("SELECT COUNT(*) FROM subscriber_activity WHERE type = 'click_link'");
    $activityClicks = $stmt->fetchColumn();

    $logOutput .= "\nActivity Log Verification:\n";
    $logOutput .= "Opens in subscriber_activity: $activityOpens\n";
    $logOutput .= "Clicks in subscriber_activity: $activityClicks\n";

    if ($activityOpens == 0 && $activityClicks == 0) {
        $logOutput .= "\n[CRITICAL ERROR] No tracking events in subscriber_activity table!\n";
    }
} catch (Exception $e) {
    $logOutput .= "\n[ERROR] " . $e->getMessage() . "\n";
}

// ============================================
// 6. FLOW & CAMPAIGN STATS
// ============================================
$logOutput .= "\n\n6. FLOW & CAMPAIGN STATS\n";
$logOutput .= "========================\n";

try {
    $stmt = $pdo->query("
        SELECT 
            id,
            name,
            stat_total_opened,
            stat_total_clicked,
            stat_unique_opened,
            stat_unique_clicked
        FROM flows
        WHERE status = 'active'
        ORDER BY stat_total_opened DESC
        LIMIT 5
    ");
    $flows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($flows)) {
        $logOutput .= "\nTop Active Flows:\n";
        foreach ($flows as $flow) {
            $logOutput .= "\nFlow: {$flow['name']}\n";
            $logOutput .= "  Total Opens: {$flow['stat_total_opened']}\n";
            $logOutput .= "  Unique Opens: {$flow['stat_unique_opened']}\n";
            $logOutput .= "  Total Clicks: {$flow['stat_total_clicked']}\n";
            $logOutput .= "  Unique Clicks: {$flow['stat_unique_clicked']}\n";
        }
    } else {
        $logOutput .= "\nNo active flows found.\n";
    }
} catch (Exception $e) {
    $logOutput .= "\n[ERROR] " . $e->getMessage() . "\n";
}

try {
    $stmt = $pdo->query("
        SELECT 
            id,
            name,
            count_opened,
            count_clicked,
            count_unique_opened,
            count_unique_clicked
        FROM campaigns
        WHERE status IN ('sent', 'sending')
        ORDER BY count_opened DESC
        LIMIT 5
    ");
    $campaigns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($campaigns)) {
        $logOutput .= "\nTop Campaigns:\n";
        foreach ($campaigns as $campaign) {
            $logOutput .= "\nCampaign: {$campaign['name']}\n";
            $logOutput .= "  Total Opens: {$campaign['count_opened']}\n";
            $logOutput .= "  Unique Opens: {$campaign['count_unique_opened']}\n";
            $logOutput .= "  Total Clicks: {$campaign['count_clicked']}\n";
            $logOutput .= "  Unique Clicks: {$campaign['count_unique_clicked']}\n";
        }
    } else {
        $logOutput .= "\nNo sent campaigns found.\n";
    }
} catch (Exception $e) {
    $logOutput .= "\n[ERROR] " . $e->getMessage() . "\n";
}

// ============================================
// 7. LOG FILES CHECK
// ============================================
$logOutput .= "\n\n7. LOG FILES CHECK\n";
$logOutput .= "==================\n";

$logFiles = [
    'webhook_debug.log' => 'Webhook Debug Log',
    'worker_debug.log' => 'Worker Debug Log',
    'worker_error.log' => 'Worker Error Log',
    'zalo_debug.log' => 'Zalo Debug Log'
];

foreach ($logFiles as $file => $name) {
    $path = __DIR__ . '/' . $file;
    $logOutput .= "\n$name ($file):\n";

    if (file_exists($path)) {
        $size = filesize($path);
        $modified = date('Y-m-d H:i:s', filemtime($path));
        $logOutput .= "  Size: " . number_format($size) . " bytes\n";
        $logOutput .= "  Last Modified: $modified\n";

        if ($size > 0) {
            $content = file_get_contents($path);
            $lines = explode("\n", $content);
            $recentLines = array_slice($lines, -30); // Last 30 lines

            $logOutput .= "  Last 30 lines:\n";
            $logOutput .= "  " . str_repeat("-", 70) . "\n";
            foreach ($recentLines as $line) {
                if (trim($line)) {
                    $logOutput .= "  " . $line . "\n";
                }
            }
            $logOutput .= "  " . str_repeat("-", 70) . "\n";
        } else {
            $logOutput .= "  [WARNING] File is empty\n";
        }
    } else {
        $logOutput .= "  [WARNING] File does not exist\n";
    }
}

// ============================================
// 8. WEBHOOK ENDPOINT TEST
// ============================================
$logOutput .= "\n\n8. WEBHOOK ENDPOINT TEST\n";
$logOutput .= "========================\n";

$webhookUrl = "https://automation.ideas.edu.vn/mail_api/webhook.php";
$logOutput .= "\nWebhook URL: $webhookUrl\n";

// Test if webhook.php file exists
if (file_exists(__DIR__ . '/webhook.php')) {
    $logOutput .= "✓ webhook.php file exists\n";
    $size = filesize(__DIR__ . '/webhook.php');
    $logOutput .= "  File size: " . number_format($size) . " bytes\n";
} else {
    $logOutput .= "✗ webhook.php file NOT FOUND\n";
}

// Test tracking_processor.php
if (file_exists(__DIR__ . '/tracking_processor.php')) {
    $logOutput .= "✓ tracking_processor.php exists\n";
} else {
    $logOutput .= "✗ tracking_processor.php NOT FOUND\n";
}

// Test flow_helpers.php
if (file_exists(__DIR__ . '/flow_helpers.php')) {
    $logOutput .= "✓ flow_helpers.php exists\n";
} else {
    $logOutput .= "✗ flow_helpers.php NOT FOUND\n";
}

// ============================================
// 9. DIAGNOSTIC SUMMARY
// ============================================
$logOutput .= "\n\n9. DIAGNOSTIC SUMMARY\n";
$logOutput .= "=====================\n";

$issues = [];
$warnings = [];

// Check for tracking activity
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM subscriber_activity WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)");
    $recentActivity = $stmt->fetchColumn();

    if ($recentActivity == 0) {
        $issues[] = "NO tracking events in last 24 hours - Tracking system is NOT working";
    } else {
        $logOutput .= "\n✓ Found $recentActivity tracking events in last 24 hours\n";
    }
} catch (Exception $e) {
    $issues[] = "Cannot query subscriber_activity table: " . $e->getMessage();
}

// Check schema issues
if (!empty($schemaIssues)) {
    $issues[] = "Database schema issues detected";
}

// Check for failed queue jobs
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM queue_jobs WHERE status = 'failed' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)");
    $failedCount = $stmt->fetchColumn();

    if ($failedCount > 0) {
        $warnings[] = "$failedCount failed queue jobs in last 24 hours";
    }
} catch (Exception $e) {
    $warnings[] = "Cannot check queue_jobs status";
}

if (!empty($issues)) {
    $logOutput .= "\n🚨 CRITICAL ISSUES:\n";
    foreach ($issues as $issue) {
        $logOutput .= "  ✗ $issue\n";
    }
} else {
    $logOutput .= "\n✓ No critical issues detected\n";
}

if (!empty($warnings)) {
    $logOutput .= "\n⚠ WARNINGS:\n";
    foreach ($warnings as $warning) {
        $logOutput .= "  ⚠ $warning\n";
    }
}

$logOutput .= "\n\nRECOMMENDED ACTIONS:\n";
$logOutput .= "1. Check if webhook.php is accessible from external sources\n";
$logOutput .= "2. Verify that email templates include proper tracking pixels and links\n";
$logOutput .= "3. Ensure worker_queue.php is running (cron job or background process)\n";
$logOutput .= "4. Check server error logs for PHP errors\n";
$logOutput .= "5. Test tracking with a real email send\n";

$logOutput .= "\n========================================\n";
$logOutput .= "END OF DIAGNOSTIC REPORT\n";
$logOutput .= "========================================\n";

// Save to file
$logFile = __DIR__ . '/tracking_diagnostic_' . date('Y-m-d_H-i-s') . '.log';
file_put_contents($logFile, $logOutput);

echo "Diagnostic log saved to: $logFile\n";
echo "File size: " . number_format(filesize($logFile)) . " bytes\n";
echo "\n" . $logOutput;
?>