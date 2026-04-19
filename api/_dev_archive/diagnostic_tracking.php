<?php
// api/diagnostic_tracking.php - COMPREHENSIVE TRACKING DIAGNOSTIC
header('Content-Type: text/html; charset=utf-8');
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'db_connect.php';

echo "<!DOCTYPE html><html><head><title>Tracking Diagnostic Report</title>";
echo "<style>
body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #00ff00; }
h1, h2 { color: #00ffff; border-bottom: 2px solid #00ffff; padding-bottom: 5px; }
.section { margin: 20px 0; padding: 15px; background: #2a2a2a; border-left: 4px solid #00ff00; }
.error { color: #ff4444; font-weight: bold; }
.success { color: #00ff00; font-weight: bold; }
.warning { color: #ffaa00; font-weight: bold; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; }
th, td { border: 1px solid #444; padding: 8px; text-align: left; }
th { background: #333; color: #00ffff; }
pre { background: #000; padding: 10px; overflow-x: auto; border: 1px solid #444; }
.test-btn { background: #00ff00; color: #000; padding: 10px 20px; border: none; cursor: pointer; margin: 5px; }
.test-btn:hover { background: #00ffff; }
</style></head><body>";

echo "<h1>🔍 MAILFLOW PRO - TRACKING DIAGNOSTIC REPORT</h1>";
echo "<p>Generated: " . date('Y-m-d H:i:s') . "</p>";

// ============================================
// 1. DATABASE SCHEMA CHECK
// ============================================
echo "<div class='section'>";
echo "<h2>1. Database Schema Verification</h2>";

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

        echo "<strong>Table: $table</strong> - <span class='success'>✓ EXISTS</span><br>";

        $missingCols = array_diff($columns, $existingCols);
        if (!empty($missingCols)) {
            echo "<span class='error'>Missing columns: " . implode(', ', $missingCols) . "</span><br>";
            $schemaIssues[] = "$table: missing " . implode(', ', $missingCols);
        } else {
            echo "<span class='success'>All required columns present</span><br>";
        }
    } catch (Exception $e) {
        echo "<span class='error'>Table: $table - ✗ NOT FOUND</span><br>";
        $schemaIssues[] = "$table: table missing";
    }
}

if (empty($schemaIssues)) {
    echo "<p class='success'>✓ All schema requirements met</p>";
} else {
    echo "<p class='error'>✗ Schema issues found: " . count($schemaIssues) . "</p>";
}
echo "</div>";

// ============================================
// 2. WEBHOOK CONFIGURATION CHECK
// ============================================
echo "<div class='section'>";
echo "<h2>2. Webhook Configuration</h2>";

$webhookUrl = "https://automation.ideas.edu.vn/mail_api/webhook.php";
echo "<strong>Webhook URL:</strong> <a href='$webhookUrl' target='_blank' style='color: #00ffff;'>$webhookUrl</a><br>";

// Test webhook accessibility
$testUrls = [
    'Open Tracking' => $webhookUrl . "?type=open&sid=test&fid=test",
    'Click Tracking' => $webhookUrl . "?type=click&sid=test&fid=test&url=" . base64_encode("https://example.com"),
    'Unsubscribe' => $webhookUrl . "?type=unsubscribe&sid=test"
];

echo "<table><tr><th>Endpoint</th><th>Status</th></tr>";
foreach ($testUrls as $name => $url) {
    echo "<tr><td>$name</td><td>";
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode == 200) {
            echo "<span class='success'>✓ OK (HTTP $httpCode)</span>";
        } else {
            echo "<span class='warning'>⚠ HTTP $httpCode</span>";
        }
    } else {
        echo "<span class='warning'>⚠ cURL not available</span>";
    }
    echo "</td></tr>";
}
echo "</table>";
echo "</div>";

// ============================================
// 3. RECENT TRACKING ACTIVITY
// ============================================
echo "<div class='section'>";
echo "<h2>3. Recent Tracking Activity (Last 24 Hours)</h2>";

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
        echo "<p class='error'>✗ NO TRACKING EVENTS in last 24 hours!</p>";
        echo "<p class='warning'>This indicates tracking is NOT working.</p>";
    } else {
        echo "<table><tr><th>Event Type</th><th>Count</th><th>Last Event</th></tr>";
        foreach ($activities as $act) {
            echo "<tr><td>{$act['type']}</td><td>{$act['count']}</td><td>{$act['last_event']}</td></tr>";
        }
        echo "</table>";
    }
} catch (Exception $e) {
    echo "<p class='error'>Error: " . $e->getMessage() . "</p>";
}

// Check for specific tracking types
echo "<h3>Critical Tracking Types Status:</h3>";
$criticalTypes = ['open_email', 'click_link', 'unsubscribe'];
foreach ($criticalTypes as $type) {
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE type = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)");
        $stmt->execute([$type]);
        $count = $stmt->fetchColumn();

        if ($count > 0) {
            echo "<span class='success'>✓ $type: $count events</span><br>";
        } else {
            echo "<span class='error'>✗ $type: 0 events (NOT TRACKING)</span><br>";
        }
    } catch (Exception $e) {
        echo "<span class='error'>✗ $type: Error checking</span><br>";
    }
}
echo "</div>";

// ============================================
// 4. QUEUE SYSTEM STATUS
// ============================================
echo "<div class='section'>";
echo "<h2>4. Queue System Status</h2>";

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

    echo "<table><tr><th>Status</th><th>Count</th></tr>";
    foreach ($queueStats as $stat) {
        $class = ($stat['status'] == 'failed') ? 'error' : (($stat['status'] == 'completed') ? 'success' : 'warning');
        echo "<tr><td class='$class'>{$stat['status']}</td><td>{$stat['count']}</td></tr>";
    }
    echo "</table>";

    // Check for failed jobs
    $stmt = $pdo->query("SELECT * FROM queue_jobs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 5");
    $failedJobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($failedJobs)) {
        echo "<h3 class='error'>Recent Failed Jobs:</h3>";
        echo "<table><tr><th>ID</th><th>Queue</th><th>Error</th><th>Created</th></tr>";
        foreach ($failedJobs as $job) {
            echo "<tr><td>{$job['id']}</td><td>{$job['queue']}</td><td>" . htmlspecialchars($job['error_message'] ?? 'N/A') . "</td><td>{$job['created_at']}</td></tr>";
        }
        echo "</table>";
    }
} catch (Exception $e) {
    echo "<p class='error'>Error: " . $e->getMessage() . "</p>";
}
echo "</div>";

// ============================================
// 5. LOG FILES CHECK
// ============================================
echo "<div class='section'>";
echo "<h2>5. Log Files Analysis</h2>";

$logFiles = [
    'webhook_debug.log' => 'Webhook Debug Log',
    'worker_debug.log' => 'Worker Debug Log',
    'worker_error.log' => 'Worker Error Log',
    'zalo_debug.log' => 'Zalo Debug Log'
];

foreach ($logFiles as $file => $name) {
    $path = __DIR__ . '/' . $file;
    echo "<h3>$name</h3>";

    if (file_exists($path)) {
        $size = filesize($path);
        $modified = date('Y-m-d H:i:s', filemtime($path));
        echo "<p>Size: " . number_format($size) . " bytes | Last Modified: $modified</p>";

        if ($size > 0) {
            $content = file_get_contents($path);
            $lines = explode("\n", $content);
            $recentLines = array_slice($lines, -20); // Last 20 lines

            echo "<pre>" . htmlspecialchars(implode("\n", $recentLines)) . "</pre>";
        } else {
            echo "<p class='warning'>⚠ File is empty</p>";
        }
    } else {
        echo "<p class='warning'>⚠ File does not exist</p>";
    }
}
echo "</div>";

// ============================================
// 6. TRACKING HELPER FUNCTIONS TEST
// ============================================
echo "<div class='section'>";
echo "<h2>6. Tracking Functions Test</h2>";

// Test if tracking_helper.php exists and functions are available
if (file_exists(__DIR__ . '/tracking_helper.php')) {
    echo "<p class='success'>✓ tracking_helper.php exists</p>";
    require_once 'tracking_helper.php';

    // Test functions
    $functions = ['getDeviceDetails', 'getLocationFromIP'];
    foreach ($functions as $func) {
        if (function_exists($func)) {
            echo "<span class='success'>✓ Function $func() available</span><br>";
        } else {
            echo "<span class='error'>✗ Function $func() NOT FOUND</span><br>";
        }
    }
} else {
    echo "<p class='error'>✗ tracking_helper.php NOT FOUND</p>";
}

// Test tracking_processor.php
if (file_exists(__DIR__ . '/tracking_processor.php')) {
    echo "<p class='success'>✓ tracking_processor.php exists</p>";
    require_once 'tracking_processor.php';

    if (function_exists('processTrackingEvent')) {
        echo "<span class='success'>✓ Function processTrackingEvent() available</span><br>";
    } else {
        echo "<span class='error'>✗ Function processTrackingEvent() NOT FOUND</span><br>";
    }
} else {
    echo "<p class='error'>✗ tracking_processor.php NOT FOUND</p>";
}

// Test flow_helpers.php
if (file_exists(__DIR__ . '/flow_helpers.php')) {
    echo "<p class='success'>✓ flow_helpers.php exists</p>";
    require_once 'flow_helpers.php';

    if (function_exists('logActivity')) {
        echo "<span class='success'>✓ Function logActivity() available</span><br>";
    } else {
        echo "<span class='error'>✗ Function logActivity() NOT FOUND</span><br>";
    }
} else {
    echo "<p class='error'>✗ flow_helpers.php NOT FOUND</p>";
}
echo "</div>";

// ============================================
// 7. LIVE TRACKING TEST
// ============================================
echo "<div class='section'>";
echo "<h2>7. Live Tracking Test</h2>";

echo "<p>Click the buttons below to test tracking endpoints:</p>";

// Generate test subscriber
try {
    $stmt = $pdo->query("SELECT id FROM subscribers WHERE status IN ('active', 'lead', 'customer') LIMIT 1");
    $testSub = $stmt->fetchColumn();

    if ($testSub) {
        $testOpenUrl = "https://automation.ideas.edu.vn/mail_api/webhook.php?type=open&sid=$testSub&fid=test_flow&cid=test_campaign";
        $testClickUrl = "https://automation.ideas.edu.vn/mail_api/webhook.php?type=click&sid=$testSub&fid=test_flow&url=" . base64_encode("https://example.com");

        echo "<button class='test-btn' onclick=\"window.open('$testOpenUrl', '_blank')\">Test Open Tracking</button>";
        echo "<button class='test-btn' onclick=\"window.open('$testClickUrl', '_blank')\">Test Click Tracking</button>";
        echo "<p class='warning'>Note: These will create test tracking events in your database.</p>";
    } else {
        echo "<p class='error'>No active subscribers found for testing</p>";
    }
} catch (Exception $e) {
    echo "<p class='error'>Error: " . $e->getMessage() . "</p>";
}

echo "</div>";

// ============================================
// 8. RECOMMENDATIONS
// ============================================
echo "<div class='section'>";
echo "<h2>8. Diagnostic Summary & Recommendations</h2>";

$issues = [];
$warnings = [];

// Check for tracking activity
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM subscriber_activity WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)");
    $recentActivity = $stmt->fetchColumn();

    if ($recentActivity == 0) {
        $issues[] = "NO tracking events in last 24 hours - Tracking system is NOT working";
    }
} catch (Exception $e) {
    $issues[] = "Cannot query subscriber_activity table";
}

// Check schema issues
if (!empty($schemaIssues)) {
    $issues[] = "Database schema issues detected: " . implode(', ', $schemaIssues);
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
    echo "<h3 class='error'>🚨 CRITICAL ISSUES:</h3><ul>";
    foreach ($issues as $issue) {
        echo "<li class='error'>$issue</li>";
    }
    echo "</ul>";
} else {
    echo "<p class='success'>✓ No critical issues detected</p>";
}

if (!empty($warnings)) {
    echo "<h3 class='warning'>⚠ WARNINGS:</h3><ul>";
    foreach ($warnings as $warning) {
        echo "<li class='warning'>$warning</li>";
    }
    echo "</ul>";
}

echo "<h3>Recommended Actions:</h3>";
echo "<ol>";
echo "<li>Check if webhook.php is accessible from external sources</li>";
echo "<li>Verify that email templates include proper tracking pixels and links</li>";
echo "<li>Ensure worker_queue.php is running (cron job or background process)</li>";
echo "<li>Check server error logs for PHP errors</li>";
echo "<li>Test tracking with a real email send</li>";
echo "</ol>";

echo "</div>";

echo "<p style='text-align: center; margin-top: 40px; color: #666;'>End of Diagnostic Report</p>";
echo "</body></html>";
?>