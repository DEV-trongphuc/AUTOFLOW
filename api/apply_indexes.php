<?php
// api/apply_indexes.php

require_once 'db_connect.php';

header('Content-Type: application/json');

$sqlFile = __DIR__ . '/../database_indexes_performance.sql';

if (!file_exists($sqlFile)) {
    echo json_encode(['status' => 'error', 'message' => 'SQL file not found']);
    exit;
}

$sqlContent = file_get_contents($sqlFile);

// Remove comments to verify commands cleaner (optional, but good for parsing)
$sqlContent = preg_replace('/--.*$/m', '', $sqlContent);

// Split by semicolon
$commands = explode(';', $sqlContent);
$results = [];
$errors = [];

foreach ($commands as $cmd) {
    $cmd = trim($cmd);
    if (!empty($cmd)) {
        try {
            $pdo->exec($cmd);
            $results[] = "Executed: " . substr($cmd, 0, 50) . "...";
        } catch (PDOException $e) {
            // Ignore "Duplicate key name" errors if "IF NOT EXISTS" wasn't supported or worked weirdly
            if (strpos($e->getMessage(), 'Duplicate key name') !== false) {
                $results[] = "Skipped (Exists): " . substr($cmd, 0, 50) . "...";
            } else {
                $errors[] = "Error on command: " . substr($cmd, 0, 50) . "... -> " . $e->getMessage();
            }
        }
    }
}

echo json_encode([
    'status' => empty($errors) ? 'success' : 'partial_success',
    'executed_count' => count($results),
    'error_count' => count($errors),
    'errors' => $errors,
    'logs' => $results
], JSON_PRETTY_PRINT);
