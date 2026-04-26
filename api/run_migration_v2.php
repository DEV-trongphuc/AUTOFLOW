<?php
/**
 * Advanced SQL Migration Runner
 * Trigger this via browser to execute hardening_core_indexes.sql
 */
require_once __DIR__ . '/db_connect.php';

// Simple security check
if (($_GET['token'] ?? '') !== 'hardening_2026_04_26') {
    die('Unauthorized');
}

$sqlFile = __DIR__ . '/../database/migrations/hardening_core_indexes.sql';
if (!file_exists($sqlFile)) {
    die('Migration file not found at: ' . $sqlFile);
}

$sql = file_get_contents($sqlFile);

// Split by semicolon (crude but usually works for simple migrations)
$commands = explode(';', $sql);

echo "Starting migration...\n";
$success = 0;
$errors = 0;

foreach ($commands as $cmd) {
    $cmd = trim($cmd);
    if (empty($cmd) || strpos($cmd, '--') === 0) continue;
    
    try {
        $pdo->exec($cmd);
        echo "[OK] " . substr($cmd, 0, 50) . "...\n";
        $success++;
    } catch (Exception $e) {
        echo "[ERROR] " . $e->getMessage() . "\n";
        $errors++;
    }
}

echo "\nFinished. Success: $success, Errors: $errors\n";
