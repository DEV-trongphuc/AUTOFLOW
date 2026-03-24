<?php
// api/audit_tracking_system.php - Comprehensive tracking system audit
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

echo "<pre style='font-family: monospace; font-size: 12px;'>";
echo "================================================================================\n";
echo "COMPREHENSIVE TRACKING SYSTEM AUDIT\n";
echo "================================================================================\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n\n";

$issues = [];
$warnings = [];
$passed = [];

// ============================================================================
// 1. DATABASE SCHEMA CHECK
// ============================================================================
echo "1. DATABASE SCHEMA CHECK\n";
echo "--------------------------------------------------------------------------------\n";

$requiredTables = [
    'subscriber_activity' => ['id', 'subscriber_id', 'type', 'reference_id', 'flow_id', 'campaign_id', 'reference_name', 'details', 'ip_address', 'device_type', 'os', 'browser', 'location', 'created_at'],
    'queue_jobs' => ['id', 'queue', 'payload', 'status', 'error_message', 'available_at', 'reserved_at', 'finished_at', 'created_at'],
    'flows' => ['id', 'name', 'status', 'steps', 'stat_total_clicked', 'stat_unique_clicked'],
    'campaigns' => ['id', 'name', 'status', 'count_clicked', 'count_unique_clicked']
];

foreach ($requiredTables as $table => $columns) {
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `$table`");
        $existingColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $missing = array_diff($columns, $existingColumns);
        if (empty($missing)) {
            $passed[] = "✓ Table `$table`: All required columns exist";
        } else {
            $issues[] = "✗ Table `$table`: Missing columns: " . implode(', ', $missing);
        }
    } catch (Exception $e) {
        $issues[] = "✗ Table `$table`: Does not exist or cannot be accessed";
    }
}

echo implode("\n", $passed) . "\n";
if (!empty($issues)) {
    echo "\n" . implode("\n", $issues) . "\n";
}
echo "\n";

// ============================================================================
// 2. TRACKING EVENT TYPES CHECK
// ============================================================================
echo "2. TRACKING EVENT TYPES IN DATABASE\n";
echo "--------------------------------------------------------------------------------\n";

try {
    $stmt = $pdo->query("
        SELECT type, COUNT(*) as count, 
               COUNT(DISTINCT subscriber_id) as unique_users,
               MIN(created_at) as first_event,
               MAX(created_at) as last_event
        FROM subscriber_activity
        GROUP BY type
        ORDER BY count DESC
    ");
    $eventTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($eventTypes)) {
        $warnings[] = "⚠ No tracking events found in database";
    } else {
        echo "Event Type              Count    Unique   First Event          Last Event\n";
        echo "--------------------------------------------------------------------------------\n";
        foreach ($eventTypes as $event) {
            printf(
                "%-20s %8d %8d   %s   %s\n",
                $event['type'],
                $event['count'],
                $event['unique_users'],
                substr($event['first_event'], 0, 19),
                substr($event['last_event'], 0, 19)
            );
        }
    }
} catch (Exception $e) {
    $issues[] = "✗ Cannot query event types: " . $e->getMessage();
}
echo "\n";

// ============================================================================
// 3. FLOW TRACKING CHECK
// ============================================================================
echo "3. FLOW TRACKING VERIFICATION\n";
echo "--------------------------------------------------------------------------------\n";

try {
    $stmt = $pdo->query("
        SELECT f.id, f.name, f.status,
               (SELECT COUNT(*) FROM subscriber_activity WHERE flow_id = f.id AND type = 'click_link') as click_events,
               (SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE flow_id = f.id AND type = 'click_link') as unique_clickers,
               f.stat_total_clicked, f.stat_unique_clicked
        FROM flows f
        WHERE f.status = 'active'
        ORDER BY click_events DESC
        LIMIT 10
    ");
    $flows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($flows)) {
        echo "No active flows found\n";
    } else {
        foreach ($flows as $flow) {
            echo "Flow: {$flow['name']} (ID: {$flow['id']})\n";
            echo "  Events in DB: {$flow['click_events']} clicks ({$flow['unique_clickers']} unique)\n";
            echo "  Stats column: {$flow['stat_total_clicked']} total, {$flow['stat_unique_clicked']} unique\n";

            if ($flow['click_events'] != $flow['stat_total_clicked']) {
                $warnings[] = "⚠ Flow '{$flow['name']}': Mismatch between events ({$flow['click_events']}) and stats ({$flow['stat_total_clicked']})";
            }
            echo "\n";
        }
    }
} catch (Exception $e) {
    $issues[] = "✗ Cannot check flow tracking: " . $e->getMessage();
}

// ============================================================================
// 4. CAMPAIGN TRACKING CHECK
// ============================================================================
echo "4. CAMPAIGN TRACKING VERIFICATION\n";
echo "--------------------------------------------------------------------------------\n";

try {
    $stmt = $pdo->query("
        SELECT c.id, c.name, c.status,
               (SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = c.id AND type = 'click_link') as click_events,
               (SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = c.id AND type = 'click_link') as unique_clickers,
               c.count_clicked, c.count_unique_clicked
        FROM campaigns c
        WHERE c.status IN ('sent', 'sending')
        ORDER BY click_events DESC
        LIMIT 10
    ");
    $campaigns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($campaigns)) {
        echo "No sent campaigns found\n";
    } else {
        foreach ($campaigns as $campaign) {
            echo "Campaign: {$campaign['name']} (ID: {$campaign['id']})\n";
            echo "  Events in DB: {$campaign['click_events']} clicks ({$campaign['unique_clickers']} unique)\n";
            echo "  Stats column: {$campaign['count_clicked']} total, {$campaign['count_unique_clicked']} unique\n";

            if ($campaign['click_events'] > 0 && $campaign['count_clicked'] == 0) {
                $warnings[] = "⚠ Campaign '{$campaign['name']}': Has events but stats not updated";
            }
            echo "\n";
        }
    }
} catch (Exception $e) {
    $issues[] = "✗ Cannot check campaign tracking: " . $e->getMessage();
}

// ============================================================================
// 5. QUEUE SYSTEM CHECK
// ============================================================================
echo "5. QUEUE SYSTEM STATUS\n";
echo "--------------------------------------------------------------------------------\n";

try {
    $stmt = $pdo->query("
        SELECT status, COUNT(*) as count
        FROM queue_jobs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY status
    ");
    $queueStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Queue Status (Last 24 hours):\n";
    foreach ($queueStats as $stat) {
        echo "  {$stat['status']}: {$stat['count']}\n";
        if ($stat['status'] === 'failed' && $stat['count'] > 0) {
            $warnings[] = "⚠ {$stat['count']} failed queue jobs in last 24 hours";
        }
    }

    // Check recent failed jobs
    $stmt = $pdo->query("
        SELECT queue, error_message, COUNT(*) as count
        FROM queue_jobs
        WHERE status = 'failed' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY queue, error_message
    ");
    $failedJobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($failedJobs)) {
        echo "\nFailed Job Details:\n";
        foreach ($failedJobs as $job) {
            echo "  {$job['queue']}: {$job['error_message']} ({$job['count']} times)\n";
        }
    }
} catch (Exception $e) {
    $issues[] = "✗ Cannot check queue system: " . $e->getMessage();
}
echo "\n";

// ============================================================================
// 6. API ENDPOINT TESTS
// ============================================================================
echo "6. API ENDPOINT TESTS\n";
echo "--------------------------------------------------------------------------------\n";

// Test click_summary for campaigns
try {
    $stmt = $pdo->query("SELECT id FROM campaigns WHERE status = 'sent' LIMIT 1");
    $campaignId = $stmt->fetchColumn();

    if ($campaignId) {
        $stmt = $pdo->prepare("
            SELECT details, COUNT(*) as total_clicks, COUNT(DISTINCT subscriber_id) as unique_clicks 
            FROM subscriber_activity 
            WHERE campaign_id = ? AND type = 'click_link'
            GROUP BY details
        ");
        $stmt->execute([$campaignId]);
        $links = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo "✓ Campaign click_summary endpoint: Working (" . count($links) . " unique links)\n";
    } else {
        echo "⚠ No sent campaigns to test\n";
    }
} catch (Exception $e) {
    $issues[] = "✗ Campaign click_summary test failed: " . $e->getMessage();
}

// Test click_summary for flows
try {
    $stmt = $pdo->query("SELECT id FROM flows WHERE status = 'active' LIMIT 1");
    $flowId = $stmt->fetchColumn();

    if ($flowId) {
        $stmt = $pdo->prepare("
            SELECT details, COUNT(*) as total_clicks, COUNT(DISTINCT subscriber_id) as unique_clicks 
            FROM subscriber_activity 
            WHERE flow_id = ? AND type = 'click_link'
            GROUP BY details
        ");
        $stmt->execute([$flowId]);
        $links = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo "✓ Flow click_summary endpoint: Working (" . count($links) . " unique links)\n";
    } else {
        echo "⚠ No active flows to test\n";
    }
} catch (Exception $e) {
    $issues[] = "✗ Flow click_summary test failed: " . $e->getMessage();
}
echo "\n";

// ============================================================================
// 7. GEO DATA CHECK
// ============================================================================
echo "7. GEO/TECH DATA AVAILABILITY\n";
echo "--------------------------------------------------------------------------------\n";

try {
    $stmt = $pdo->query("
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN ip_address IS NOT NULL AND ip_address != '' THEN 1 END) as with_ip,
            COUNT(CASE WHEN device_type IS NOT NULL AND device_type != '' THEN 1 END) as with_device,
            COUNT(CASE WHEN os IS NOT NULL AND os != '' THEN 1 END) as with_os,
            COUNT(CASE WHEN location IS NOT NULL AND location != '' THEN 1 END) as with_location
        FROM subscriber_activity
        WHERE type = 'click_link'
    ");
    $geoData = $stmt->fetch(PDO::FETCH_ASSOC);

    echo "Click Events with Geo/Tech Data:\n";
    echo "  Total clicks: {$geoData['total']}\n";
    echo "  With IP: {$geoData['with_ip']} (" . round($geoData['with_ip'] / $geoData['total'] * 100, 1) . "%)\n";
    echo "  With Device: {$geoData['with_device']} (" . round($geoData['with_device'] / $geoData['total'] * 100, 1) . "%)\n";
    echo "  With OS: {$geoData['with_os']} (" . round($geoData['with_os'] / $geoData['total'] * 100, 1) . "%)\n";
    echo "  With Location: {$geoData['with_location']} (" . round($geoData['with_location'] / $geoData['total'] * 100, 1) . "%)\n";

    if ($geoData['with_device'] < $geoData['total'] * 0.5) {
        $warnings[] = "⚠ Less than 50% of clicks have device data";
    }
} catch (Exception $e) {
    $issues[] = "✗ Cannot check geo data: " . $e->getMessage();
}
echo "\n";

// ============================================================================
// 8. FRONTEND PROP CHECKS
// ============================================================================
echo "8. FRONTEND COMPONENT PROP VERIFICATION\n";
echo "--------------------------------------------------------------------------------\n";

$frontendChecks = [
    'LinkClicksTab.tsx' => [
        'props' => ['type', 'id', 'stepId', 'initialHtml'],
        'file' => 'components/common/LinkClicksTab.tsx'
    ],
    'TechStatsTab.tsx' => [
        'props' => ['type', 'id', 'stepId'],
        'file' => 'components/campaigns/TechStatsTab.tsx'
    ],
    'ClickHeatmap.tsx' => [
        'props' => ['html', 'clickData', 'deviceFilter', 'onDeviceFilterChange'],
        'file' => 'components/common/ClickHeatmap.tsx'
    ]
];

foreach ($frontendChecks as $component => $check) {
    $filePath = __DIR__ . '/../' . $check['file'];
    if (file_exists($filePath)) {
        $content = file_get_contents($filePath);
        $allPropsFound = true;
        foreach ($check['props'] as $prop) {
            if (strpos($content, $prop) === false) {
                $warnings[] = "⚠ $component: Prop '$prop' not found in file";
                $allPropsFound = false;
            }
        }
        if ($allPropsFound) {
            echo "✓ $component: All props verified\n";
        }
    } else {
        $warnings[] = "⚠ $component: File not found at {$check['file']}";
    }
}
echo "\n";

// ============================================================================
// SUMMARY
// ============================================================================
echo "================================================================================\n";
echo "AUDIT SUMMARY\n";
echo "================================================================================\n\n";

if (empty($issues) && empty($warnings)) {
    echo "✅ ALL CHECKS PASSED!\n";
    echo "The tracking system is fully operational.\n\n";
} else {
    if (!empty($issues)) {
        echo "❌ CRITICAL ISSUES (" . count($issues) . "):\n";
        foreach ($issues as $issue) {
            echo "  $issue\n";
        }
        echo "\n";
    }

    if (!empty($warnings)) {
        echo "⚠️  WARNINGS (" . count($warnings) . "):\n";
        foreach ($warnings as $warning) {
            echo "  $warning\n";
        }
        echo "\n";
    }
}

echo "Audit completed at: " . date('Y-m-d H:i:s') . "\n";
echo "================================================================================\n";
echo "</pre>";
?>