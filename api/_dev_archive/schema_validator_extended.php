<?php
// api/schema_validator_extended.php - Extended Backend Validation
// Comprehensive validation for all backend modules (FINAL PRECISION VERSION)

error_reporting(E_ALL);
ini_set('display_errors', 1);
set_time_limit(300);

require_once 'db_connect.php';

header('Content-Type: text/html; charset=utf-8');

$errors = [];
$warnings = [];
$passed = [];

echo "<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Extended Schema Validator</title>
    <style>
        body { font-family: 'JetBrains Mono', monospace; background: #0f172a; color: #94a3b8; padding: 20px; margin: 0; }
        .header { background: #1e293b; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6; }
        h1 { color: #f1f5f9; margin: 0; }
        .section { background: #1e293b; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .section-title { color: #60a5fa; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .error { color: #f87171; padding: 8px; background: #7f1d1d; border-radius: 4px; margin: 5px 0; }
        .warning { color: #fbbf24; padding: 8px; background: #78350f; border-radius: 4px; margin: 5px 0; }
        .success { color: #4ade80; padding: 8px; background: #14532d; border-radius: 4px; margin: 5px 0; }
        .summary { background: #1e293b; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .stat { display: inline-block; margin: 0 15px; }
        .stat-value { font-size: 24px; font-weight: bold; }
        .stat-label { font-size: 12px; color: #64748b; }
    </style>
</head>
<body>
<div class='header'>
    <h1>🔍 Extended Schema Validator</h1>
    <div style='color: #60a5fa; margin-top: 10px;'>Comprehensive validation for ALL backend modules (v3.0 - Precision Mode)</div>
</div>";

// ============================================================================
// 1. MODULES EXISTENCE CHECK (Based on Actual Table List)
// ============================================================================
echo "<div class='section'><div class='section-title'>📱 Module Integrity Check</div>";

$modules = [
    'AI Chatbot' => ['ai_chatbots', 'ai_messages', 'ai_training_chunks', 'ai_settings'],
    'Zalo OA' => ['zalo_oa_configs', 'zalo_subscribers', 'zalo_templates', 'zalo_broadcasts'],
    'Meta/Facebook' => ['meta_app_configs', 'meta_subscribers', 'meta_conversations'],
    'Web Tracking' => ['web_visitors', 'web_sessions', 'web_page_views', 'web_events'],
    'Automation' => ['flows', 'subscriber_flow_states', 'queue_jobs'],
    'Campaigns' => ['campaigns', 'mail_delivery_logs', 'templates'],
    'CDP' => ['subscribers', 'lists', 'tags', 'segments']
];

foreach ($modules as $moduleName => $tables) {
    $allExist = true;
    foreach ($tables as $table) {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() === 0) {
            $allExist = false;
            $warnings[] = "Table `$table` is missing from $moduleName module";
        }
    }

    if ($allExist) {
        $passed[] = "$moduleName module tables verified";
        echo "<div class='success'>✅ $moduleName: All " . count($tables) . " tables verified</div>";
    } else {
        echo "<div class='warning'>⚠️ $moduleName: Some tables missing (Check detailed log)</div>";
    }
}
echo "</div>";

// ============================================================================
// 2. COLUMN PRECISION VALIDATION
// ============================================================================
echo "<div class='section'><div class='section-title'>🎯 Column Precision Validation</div>";

$precisionCols = [
    'zalo_subscribers' => ['id', 'oa_id', 'zalo_user_id', 'is_follower'],
    'meta_subscribers' => ['id', 'psid', 'first_name', 'last_name'],
    'raw_event_buffer' => ['id', 'type', 'payload', 'processed'],
    'stats_update_buffer' => ['id', 'target_table', 'target_id', 'column_name'],
    'subscribers' => ['id', 'email', 'stats_sent', 'stats_opened', 'stats_clicked']
];

foreach ($precisionCols as $table => $columns) {
    try {
        $stmtDesc = $pdo->query("DESCRIBE $table");
        $existingCols = [];
        while ($row = $stmtDesc->fetch()) {
            $existingCols[] = $row['Field'];
        }

        $missingCount = 0;
        foreach ($columns as $col) {
            if (in_array($col, $existingCols)) {
                $passed[] = "$table.$col exists";
            } else {
                $missingCount++;
                $errors[] = "$table.$col is MISSING (Critical)";
                echo "<div class='error'>❌ $table.$col is MISSING</div>";
            }
        }

        if ($missingCount === 0) {
            echo "<div class='success'>✅ Table `$table` schema verified</div>";
        }
    } catch (Exception $e) {
        $errors[] = "Error describing table `$table`";
    }
}
echo "</div>";

// ============================================================================
// 3. COMMON SQL ERRORS CHECK
// ============================================================================
echo "<div class='section'><div class='section-title'>🔍 Common SQL Errors Check</div>";

$sqlChecks = [
    'campaigns.count_sent' => 'SELECT COUNT(*) FROM campaigns WHERE count_sent IS NOT NULL',
    'flows.stat_enrolled' => 'SELECT COUNT(*) FROM flows WHERE stat_enrolled IS NOT NULL',
    'subscriber_flow_states.step_id' => 'SELECT COUNT(*) FROM subscriber_flow_states WHERE step_id IS NOT NULL',
    'subscriber_activity.type' => 'SELECT COUNT(*) FROM subscriber_activity WHERE type IN ("receive_email", "open_email", "click_link")'
];

foreach ($sqlChecks as $description => $sql) {
    try {
        $stmt = $pdo->query($sql);
        $count = $stmt->fetchColumn();
        $passed[] = $description;
        echo "<div class='success'>✅ $description accessible ($count rows)</div>";
    } catch (Exception $e) {
        $errors[] = "$description FAILED: " . $e->getMessage();
        echo "<div class='error'>❌ $description FAILED: {$e->getMessage()}</div>";
    }
}
echo "</div>";

// ============================================================================
// 4. API & WORKER HEALTH
// ============================================================================
echo "<div class='section'><div class='section-title'>🐘 API & Worker Health Check</div>";

$files = [
    'campaigns.php',
    'flows.php',
    'subscribers.php',
    'webhook.php',
    'track.php',
    'worker_campaign.php',
    'worker_flow.php',
    'worker_tracking_aggregator.php',
    'FlowExecutor.php',
    'Mailer.php'
];

foreach ($files as $file) {
    $filePath = __DIR__ . '/' . $file;
    if (file_exists($filePath)) {
        exec("php -l \"$filePath\" 2>&1", $output, $returnVar);
        if ($returnVar === 0) {
            $passed[] = "$file syntax OK";
            echo "<div class='success'>✅ $file syntax OK</div>";
        } else {
            $errors[] = "$file syntax error";
            echo "<div class='error'>❌ $file syntax error detected</div>";
        }
    } else {
        $warnings[] = "$file not found";
        echo "<div class='warning'>⚠️ $file not found</div>";
    }
}
echo "</div>";

// ============================================================================
// SUMMARY
// ============================================================================
$totalChecks = count($passed) + count($warnings) + count($errors);
$successRate = $totalChecks > 0 ? round((count($passed) / $totalChecks) * 100, 1) : 0;

echo "<div class='summary'>
    <h2 style='color: #f1f5f9; margin-top: 0;'>📊 Final Validation Summary</h2>
    <div style='margin: 20px 0;'>
        <div class='stat'>
            <div class='stat-value' style='color: #4ade80;'>" . count($passed) . "</div>
            <div class='stat-label'>Passed</div>
        </div>
        <div class='stat'>
            <div class='stat-value' style='color: #fbbf24;'>" . count($warnings) . "</div>
            <div class='stat-label'>Warnings</div>
        </div>
        <div class='stat'>
            <div class='stat-value' style='color: #f87171;'>" . count($errors) . "</div>
            <div class='stat-label'>Errors</div>
        </div>
        <div class='stat'>
            <div class='stat-value' style='color: #60a5fa;'>{$successRate}%</div>
            <div class='stat-label'>Success Rate</div>
        </div>
    </div>";

if (count($errors) === 0) {
    echo "<div style='background: #14532d; color: #4ade80; padding: 15px; border-radius: 6px; margin-top: 20px;'>
        <strong>🎉 OMNI-ENGINE VERIFIED!</strong> Your backend is 100% compatible with all modules.
    </div>";
} else {
    echo "<div style='background: #7f1d1d; color: #f87171; padding: 15px; border-radius: 6px; margin-top: 20px;'>
        <strong>❌ Critical errors detected!</strong> Please fix schema issues before proceeding.
    </div>";
}

echo "</div>";
echo "</body></html>";
