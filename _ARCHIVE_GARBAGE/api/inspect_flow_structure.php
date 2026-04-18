<?php
// inspect_flow_structure.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Path Fix
if (file_exists('db_connect.php')) {
    require 'db_connect.php';
} elseif (file_exists('api/db_connect.php')) {
    require 'api/db_connect.php';
} else {
    // Manual connection
    $host = 'localhost';
    $db = 'mailflow_new';
    $user = 'mailflow_new';
    $pass = 'E7JbXXY2rDBMa25s';
    $charset = 'utf8mb4';
    $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
    try {
        $pdo = new PDO($dsn, $user, $pass);
    } catch (\PDOException $e) {
        die("Connection failed: " . $e->getMessage());
    }
}

$flowId = 'af4895e2-ce65-4c6a-902c-229fda80b93f'; // The flow from your logs

$stmt = $pdo->prepare("SELECT name, steps FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$flow = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$flow) {
    die("Flow not found with ID: " . htmlspecialchars($flowId));
}

echo "<h1>Flow: " . htmlspecialchars($flow['name']) . "</h1>";
$steps = json_decode($flow['steps'], true);

if (!is_array($steps)) {
    die("Invalid Steps JSON format.");
}

echo "<table border='1' cellpadding='5' style='border-collapse:collapse;'>";
echo "<tr><th>Step ID</th><th>Label</th><th>Type</th><th>Next Step ID</th></tr>";

foreach ($steps as $s) {
    $next = $s['nextStepId'] ?? $s['nextStepID'] ?? '<span style="color:red">NULL</span>';
    $highlight = (isset($s['type']) && $s['type'] === 'wait') ? 'background:#fff3cd;' : '';

    echo "<tr style='$highlight'>";
    echo "<td>" . ($s['id'] ?? 'Unknown') . "</td>";
    echo "<td>" . ($s['label'] ?? 'N/A') . "</td>";
    echo "<td>" . ($s['type'] ?? 'N/A') . "</td>";
    echo "<td>" . $next . "</td>";
    echo "</tr>";
}
echo "</table>";
