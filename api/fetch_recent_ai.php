<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$dbPath = __DIR__ . '/api/db_connect.php';
if (!file_exists($dbPath)) {
    // Try without /api/ if already in api folder or web root matches
    $dbPath = __DIR__ . '/db_connect.php';
}

if (!file_exists($dbPath)) {
    die("Error: db_connect.php not found at " . __DIR__ . '/api/db_connect.php');
}

require_once $dbPath;

header('Content-Type: text/plain; charset=utf-8');

try {
    $stmt = $pdo->query("SELECT message, created_at, model, conversation_id FROM ai_org_messages WHERE sender = 'ai' ORDER BY created_at DESC LIMIT 5");
    $msgs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($msgs)) {
        echo "No AI messages found in 'ai_org_messages' table.\n";
    } else {
        foreach ($msgs as $idx => $m) {
            echo "--- Message " . ($idx + 1) . " ---\n";
            echo "Date: " . $m['created_at'] . "\n";
            echo "Model: " . ($m['model'] ?? 'N/A') . "\n";
            echo "Conv ID: " . $m['conversation_id'] . "\n";
            echo "Content: " . $m['message'] . "\n\n";
        }
    }
} catch (Exception $e) {
    echo "Error executing query: " . $e->getMessage() . "\n";

    // Check if table exists
    try {
        $check = $pdo->query("SHOW TABLES LIKE 'ai_org_messages'");
        if ($check->rowCount() == 0) {
            echo "Table 'ai_org_messages' does NOT exist.\n";
        } else {
            echo "Table 'ai_org_messages' exists but query failed.\n";
        }
    } catch (Exception $e2) {
        echo "Could not even check for table existence: " . $e2->getMessage() . "\n";
    }
}
?>