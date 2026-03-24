<?php
// check_env.php
header('Content-Type: text/plain');
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "--- PHP Environment Check ---\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Server Software: " . $_SERVER['SERVER_SOFTWARE'] . "\n";

echo "\n--- Database Connection Check ---\n";
require_once 'db_connect.php';

try {
    if (isset($pdo)) {
        echo "Database Connected Successfully!\n";
        echo "PDO Persistent: " . ($pdo->getAttribute(PDO::ATTR_PERSISTENT) ? 'Yes' : 'No') . "\n";
    } else {
        echo "Database object \$pdo not found.\n";
    }
} catch (Exception $e) {
    echo "Connection Error: " . $e->getMessage() . "\n";
}

echo "\n--- Queue Jobs Status ---\n";
try {
    $stmt = $pdo->query("SELECT status, COUNT(*) as count FROM queue_jobs GROUP BY status");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (empty($rows)) {
        echo "Table 'queue_jobs' is valid but empty.\n";
    } else {
        foreach ($rows as $r) {
            echo "Status [{$r['status']}]: {$r['count']}\n";
        }
    }
} catch (Exception $e) {
    echo "Error checking queue_jobs: " . $e->getMessage() . "\n";
}

echo "\n--- Recent Failed Jobs ---\n";
try {
    $stmt = $pdo->query("SELECT id, type, error_message, created_at FROM queue_jobs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 3");
    $fails = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (empty($fails)) {
        echo "No recent failed jobs.\n";
    } else {
        foreach ($fails as $f) {
            echo "ID: {$f['id']} | Type: {$f['type']} | Error: {$f['error_message']} | Time: {$f['created_at']}\n";
        }
    }
} catch (Exception $e) {
    echo "Error checking failed jobs: " . $e->getMessage() . "\n";
}
?>