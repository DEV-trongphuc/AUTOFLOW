<?php
// api/schema_validator.php - Comprehensive Backend Schema & Logic Validator
// Validates database schema, column existence, and PHP logic for campaigns, flows, automation

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
    <title>Schema & Logic Validator</title>
    <style>
        body { font-family: 'JetBrains Mono', monospace; background: #0f172a; color: #94a3b8; padding: 20px; }
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
    <h1>🔍 Schema & Logic Validator</h1>
    <div style='color: #60a5fa; margin-top: 10px;'>Comprehensive validation for Campaigns, Flows, and Automation</div>
</div>";

// ============================================================================
// 1. TABLE EXISTENCE CHECK
// ============================================================================
echo "<div class='section'><div class='section-title'>📋 Table Existence Check</div>";

$requiredTables = [
    'campaigns',
    'flows',
    'subscriber_flow_states',
    'subscribers',
    'subscriber_activity',
    'mail_delivery_logs',
    'queue_jobs',
    'tags',
    'subscriber_tags',
    'segments',
    'lists',
    'subscriber_lists',
    'templates',
    'system_settings'
];

foreach ($requiredTables as $table) {
    try {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() > 0) {
            $passed[] = "Table `$table` exists";
            echo "<div class='success'>✅ Table `$table` exists</div>";
        } else {
            $errors[] = "Table `$table` is missing";
            echo "<div class='error'>❌ Table `$table` is MISSING</div>";
        }
    } catch (Exception $e) {
        $errors[] = "Error checking table `$table`: " . $e->getMessage();
        echo "<div class='error'>❌ Error checking `$table`: {$e->getMessage()}</div>";
    }
}
echo "</div>";

// ============================================================================
// 2. CAMPAIGNS TABLE VALIDATION
// ============================================================================
echo "<div class='section'><div class='section-title'>📧 Campaigns Table Validation</div>";

$campaignColumns = [
    'id' => 'char(36)',
    'name' => 'varchar',
    'subject' => 'varchar',
    'status' => 'enum',
    'type' => 'enum',
    'template_id' => 'char(36)',
    'content_body' => 'longtext',
    'target_config' => 'longtext',
    'scheduled_at' => 'datetime',
    'sent_at' => 'datetime',
    'count_sent' => 'int',
    'count_opened' => 'int',
    'count_clicked' => 'int',
    'total_target_audience' => 'int',
    'created_at' => 'timestamp',
    'updated_at' => 'timestamp'
];

try {
    $stmt = $pdo->query("DESCRIBE campaigns");
    $existingColumns = [];
    while ($row = $stmt->fetch()) {
        $existingColumns[$row['Field']] = $row['Type'];
    }

    foreach ($campaignColumns as $col => $expectedType) {
        if (isset($existingColumns[$col])) {
            $actualType = $existingColumns[$col];
            if (strpos($actualType, $expectedType) !== false || strpos($expectedType, 'enum') !== false) {
                $passed[] = "campaigns.$col exists ($actualType)";
                echo "<div class='success'>✅ Column `$col` exists: $actualType</div>";
            } else {
                $warnings[] = "campaigns.$col type mismatch: expected $expectedType, got $actualType";
                echo "<div class='warning'>⚠️ Column `$col` type mismatch: expected $expectedType, got $actualType</div>";
            }
        } else {
            $errors[] = "campaigns.$col is missing";
            echo "<div class='error'>❌ Column `$col` is MISSING</div>";
        }
    }
} catch (Exception $e) {
    $errors[] = "Error validating campaigns table: " . $e->getMessage();
    echo "<div class='error'>❌ Error: {$e->getMessage()}</div>";
}
echo "</div>";

// ============================================================================
// 3. FLOWS TABLE VALIDATION
// ============================================================================
echo "<div class='section'><div class='section-title'>🔄 Flows Table Validation</div>";

$flowColumns = [
    'id' => 'char(36)',
    'name' => 'varchar',
    'status' => 'enum',
    'steps' => 'longtext',
    'config' => 'longtext',
    'stat_enrolled' => 'int',
    'stat_completed' => 'int',
    'created_at' => 'timestamp',
    'updated_at' => 'timestamp'
];

try {
    $stmt = $pdo->query("DESCRIBE flows");
    $existingColumns = [];
    while ($row = $stmt->fetch()) {
        $existingColumns[$row['Field']] = $row['Type'];
    }

    foreach ($flowColumns as $col => $expectedType) {
        if (isset($existingColumns[$col])) {
            $actualType = $existingColumns[$col];
            if (strpos($actualType, $expectedType) !== false || strpos($expectedType, 'enum') !== false) {
                $passed[] = "flows.$col exists ($actualType)";
                echo "<div class='success'>✅ Column `$col` exists: $actualType</div>";
            } else {
                $warnings[] = "flows.$col type mismatch";
                echo "<div class='warning'>⚠️ Column `$col` type mismatch: expected $expectedType, got $actualType</div>";
            }
        } else {
            $errors[] = "flows.$col is missing";
            echo "<div class='error'>❌ Column `$col` is MISSING</div>";
        }
    }
} catch (Exception $e) {
    $errors[] = "Error validating flows table: " . $e->getMessage();
    echo "<div class='error'>❌ Error: {$e->getMessage()}</div>";
}
echo "</div>";

// ============================================================================
// 4. SUBSCRIBER_FLOW_STATES TABLE VALIDATION
// ============================================================================
echo "<div class='section'><div class='section-title'>👤 Subscriber Flow States Validation</div>";

$flowStateColumns = [
    'id' => 'char(36)',
    'subscriber_id' => 'char(36)',
    'flow_id' => 'char(36)',
    'step_id' => 'char(36)',
    'status' => 'enum',
    'scheduled_at' => 'datetime',
    'created_at' => 'timestamp',
    'updated_at' => 'timestamp'
];

try {
    $stmt = $pdo->query("DESCRIBE subscriber_flow_states");
    $existingColumns = [];
    while ($row = $stmt->fetch()) {
        $existingColumns[$row['Field']] = $row['Type'];
    }

    foreach ($flowStateColumns as $col => $expectedType) {
        if (isset($existingColumns[$col])) {
            $passed[] = "subscriber_flow_states.$col exists";
            echo "<div class='success'>✅ Column `$col` exists</div>";
        } else {
            $errors[] = "subscriber_flow_states.$col is missing";
            echo "<div class='error'>❌ Column `$col` is MISSING</div>";
        }
    }
} catch (Exception $e) {
    $errors[] = "Error validating subscriber_flow_states: " . $e->getMessage();
    echo "<div class='error'>❌ Error: {$e->getMessage()}</div>";
}
echo "</div>";

// ============================================================================
// 5. STEP TYPES VALIDATION (Check if all step types are handled)
// ============================================================================
echo "<div class='section'><div class='section-title'>🔧 Flow Step Types Validation</div>";

$supportedStepTypes = ['trigger', 'action', 'wait', 'condition', 'tag', 'segment', 'webhook', 'ab_test'];

try {
    $stmt = $pdo->query("SELECT id, name, steps FROM flows WHERE status = 'active' LIMIT 10");
    $flows = $stmt->fetchAll();

    $foundStepTypes = [];
    foreach ($flows as $flow) {
        $steps = json_decode($flow['steps'], true);
        if ($steps) {
            foreach ($steps as $step) {
                $type = $step['type'] ?? 'unknown';
                $foundStepTypes[$type] = ($foundStepTypes[$type] ?? 0) + 1;
            }
        }
    }

    if (empty($foundStepTypes)) {
        $warnings[] = "No active flows found to validate step types";
        echo "<div class='warning'>⚠️ No active flows found</div>";
    } else {
        foreach ($foundStepTypes as $type => $count) {
            if (in_array($type, $supportedStepTypes)) {
                $passed[] = "Step type '$type' is supported ($count occurrences)";
                echo "<div class='success'>✅ Step type `$type` is supported ($count occurrences)</div>";
            } else {
                $warnings[] = "Unknown step type '$type' found ($count occurrences)";
                echo "<div class='warning'>⚠️ Unknown step type `$type` ($count occurrences)</div>";
            }
        }
    }
} catch (Exception $e) {
    $errors[] = "Error validating step types: " . $e->getMessage();
    echo "<div class='error'>❌ Error: {$e->getMessage()}</div>";
}
echo "</div>";

// ============================================================================
// 6. INDEX VALIDATION
// ============================================================================
echo "<div class='section'><div class='section-title'>🔑 Critical Indexes Validation</div>";

$criticalIndexes = [
    'campaigns' => ['id', 'status'],
    'flows' => ['id', 'status'],
    'subscriber_flow_states' => ['subscriber_id', 'flow_id', 'status', 'scheduled_at'],
    'subscriber_activity' => ['subscriber_id', 'campaign_id', 'type', 'created_at'],
    'queue_jobs' => ['queue', 'status', 'scheduled_at']
];

foreach ($criticalIndexes as $table => $columns) {
    try {
        $stmt = $pdo->query("SHOW INDEX FROM $table");
        $indexes = $stmt->fetchAll();
        $indexedColumns = array_unique(array_column($indexes, 'Column_name'));

        foreach ($columns as $col) {
            if (in_array($col, $indexedColumns)) {
                $passed[] = "$table.$col is indexed";
                echo "<div class='success'>✅ $table.$col is indexed</div>";
            } else {
                $warnings[] = "$table.$col is NOT indexed (may impact performance)";
                echo "<div class='warning'>⚠️ $table.$col is NOT indexed</div>";
            }
        }
    } catch (Exception $e) {
        $errors[] = "Error checking indexes for $table: " . $e->getMessage();
        echo "<div class='error'>❌ Error checking $table: {$e->getMessage()}</div>";
    }
}
echo "</div>";

// ============================================================================
// 7. PHP FILE SYNTAX CHECK
// ============================================================================
echo "<div class='section'><div class='section-title'>🐘 PHP Files Syntax Check</div>";

$phpFiles = [
    'worker_campaign.php',
    'worker_flow.php',
    'FlowExecutor.php',
    'Mailer.php',
    'webhook.php',
    'worker_tracking_aggregator.php'
];

foreach ($phpFiles as $file) {
    $filePath = __DIR__ . '/' . $file;
    if (file_exists($filePath)) {
        $output = [];
        $returnVar = 0;
        exec("php -l \"$filePath\" 2>&1", $output, $returnVar);

        if ($returnVar === 0) {
            $passed[] = "$file syntax OK";
            echo "<div class='success'>✅ $file syntax OK</div>";
        } else {
            $errors[] = "$file has syntax errors: " . implode("\n", $output);
            echo "<div class='error'>❌ $file syntax error: " . htmlspecialchars(implode("\n", $output)) . "</div>";
        }
    } else {
        $warnings[] = "$file not found";
        echo "<div class='warning'>⚠️ $file not found</div>";
    }
}
echo "</div>";

// ============================================================================
// 8. SUMMARY
// ============================================================================
$totalChecks = count($passed) + count($warnings) + count($errors);
$successRate = $totalChecks > 0 ? round((count($passed) / $totalChecks) * 100, 1) : 0;

echo "<div class='summary'>
    <h2 style='color: #f1f5f9; margin-top: 0;'>📊 Validation Summary</h2>
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

if (count($errors) === 0 && count($warnings) === 0) {
    echo "<div style='background: #14532d; color: #4ade80; padding: 15px; border-radius: 6px; margin-top: 20px;'>
        <strong>🎉 All checks passed!</strong> Your backend is in excellent condition.
    </div>";
} elseif (count($errors) === 0) {
    echo "<div style='background: #78350f; color: #fbbf24; padding: 15px; border-radius: 6px; margin-top: 20px;'>
        <strong>⚠️ No critical errors found</strong>, but there are some warnings to review.
    </div>";
} else {
    echo "<div style='background: #7f1d1d; color: #f87171; padding: 15px; border-radius: 6px; margin-top: 20px;'>
        <strong>❌ Critical errors detected!</strong> Please fix the errors above before running campaigns.
    </div>";
}

echo "</div>";

echo "</body></html>";
