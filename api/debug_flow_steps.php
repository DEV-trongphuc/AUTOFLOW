<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$flowId = '6200f46f-7349-4fa2-a65d-889abe63c25d';

echo "=== FLOW STEPS DEBUG ===\n\n";

$stmt = $pdo->prepare("SELECT id, name, steps FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$flow = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$flow) {
    echo "Flow not found!\n";
    exit;
}

echo "Flow: {$flow['name']}\n";
echo "ID: {$flow['id']}\n\n";

$steps = json_decode($flow['steps'], true);

echo "Total Steps: " . count($steps) . "\n\n";
echo "--- STEP DETAILS ---\n\n";

foreach ($steps as $idx => $step) {
    echo "Step #" . ($idx + 1) . ":\n";
    echo "  ID: [{$step['id']}]" . (trim($step['id']) !== $step['id'] ? " ⚠️ HAS WHITESPACE!" : "") . "\n";
    echo "  Type: {$step['type']}\n";
    echo "  Label: {$step['label']}\n";

    if (isset($step['nextStepId'])) {
        $hasWhitespace = trim($step['nextStepId']) !== $step['nextStepId'];
        echo "  Next Step ID: [{$step['nextStepId']}]" . ($hasWhitespace ? " ⚠️ HAS WHITESPACE!" : "") . "\n";
        echo "  Trimmed: [" . trim($step['nextStepId']) . "]\n";
    } else {
        echo "  Next Step ID: NULL\n";
    }

    if ($step['type'] === 'condition') {
        echo "  YES Branch: [{$step['yesStepId']}]\n";
        echo "  NO Branch: [{$step['noStepId']}]\n";
    }

    if ($step['type'] === 'split_test') {
        echo "  Path A: [{$step['pathAStepId']}]\n";
        echo "  Path B: [{$step['pathBStepId']}]\n";
    }

    echo "\n";
}

echo "\n--- CONNECTIVITY CHECK ---\n\n";

// Build step map
$stepMap = [];
foreach ($steps as $step) {
    $stepMap[$step['id']] = $step;
}

// Check each nextStepId
foreach ($steps as $step) {
    if (isset($step['nextStepId'])) {
        $nextId = $step['nextStepId'];
        $trimmedNextId = trim($nextId);

        echo "Step '{$step['label']}' -> Next: '$nextId'\n";

        if (isset($stepMap[$nextId])) {
            echo "  ✅ Found (exact match)\n";
        } elseif (isset($stepMap[$trimmedNextId])) {
            echo "  ⚠️ Found (after trim) - WHITESPACE ISSUE!\n";
        } else {
            echo "  ❌ NOT FOUND - BROKEN LINK!\n";
        }
    }
}

echo "\n--- RAW JSON ---\n\n";
echo $flow['steps'];
