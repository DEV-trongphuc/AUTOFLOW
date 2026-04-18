<?php
// api/debug_history.php
require_once 'db_connect.php';

header('Content-Type: text/html; charset=utf-8');

$userId = $_GET['user_id'] ?? '';
$visitorId = $_GET['visitor_id'] ?? '';
$limit = $_GET['limit'] ?? 50;

echo "<h1>Debug Conversation History</h1>";
echo "<form method='GET'>";
echo "User ID: <input type='text' name='user_id' value='$userId'> ";
echo "Visitor ID: <input type='text' name='visitor_id' value='$visitorId'> ";
echo "<button type='submit'>Search</button>";
echo "</form>";

try {
    // 1. Check Connection
    if (!isset($pdo)) {
        die("<h3 style='color:red'>Database Connection Failed</h3>");
    }
    echo "<p style='color:green'>Database Connected successfully.</p>";

    // 2. Build Query
    $where = ["1=1"];
    $params = [];

    if ($userId && $visitorId) {
        $where[] = "(user_id = ? OR visitor_id = ?)";
        $params[] = $userId;
        $params[] = $visitorId;
    } elseif ($userId) {
        $where[] = "user_id = ?";
        $params[] = $userId;
    } elseif ($visitorId) {
        $where[] = "visitor_id = ?";
        $params[] = $visitorId;
    }

    $whereStr = implode(" AND ", $where);
    $sql = "SELECT * FROM ai_org_conversations WHERE $whereStr ORDER BY created_at DESC LIMIT $limit";

    echo "<h3>Query Executed:</h3>";
    echo "<pre>$sql</pre>";
    echo "<h3>Params:</h3>";
    echo "<pre>" . json_encode($params) . "</pre>";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "<h3>Results Found: " . count($rows) . "</h3>";

    if (count($rows) > 0) {
        echo "<table border='1' cellpadding='5' style='border-collapse: collapse; width: 100%;'>";
        echo "<tr style='background: #f0f0f0;'><th>ID</th><th>Title</th><th>User ID</th><th>Visitor ID</th><th>Property ID</th><th>Status</th><th>Created At</th></tr>";
        foreach ($rows as $row) {
            echo "<tr>";
            echo "<td>{$row['id']}</td>";
            echo "<td>{$row['title']}</td>";
            echo "<td>{$row['user_id']}</td>";
            echo "<td>{$row['visitor_id']}</td>";
            echo "<td>{$row['property_id']}</td>";
            echo "<td>{$row['status']}</td>";
            echo "<td>{$row['created_at']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p>No conversations found matching these criteria.</p>";
    }

    // 3. Show All Recent (if no filter)
    if (empty($userId) && empty($visitorId)) {
        echo "<hr>";
        echo "<h3>Recent 20 Conversations (System-wide)</h3>";
        $stmtAll = $pdo->query("SELECT * FROM ai_org_conversations ORDER BY created_at DESC LIMIT 20");
        $all = $stmtAll->fetchAll(PDO::FETCH_ASSOC);

        echo "<table border='1' cellpadding='5' style='border-collapse: collapse; width: 100%; font-size: 0.9em; color: #555;'>";
        echo "<tr style='background: #eee;'><th>ID</th><th>Title</th><th>User ID</th><th>Visitor ID</th><th>Date</th></tr>";
        foreach ($all as $r) {
            echo "<tr>";
            echo "<td>{$r['id']}</td>";
            echo "<td>{$r['title']}</td>";
            echo "<td>{$r['user_id']}</td>";
            echo "<td>{$r['visitor_id']}</td>";
            echo "<td>{$r['created_at']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }

} catch (Exception $e) {
    echo "<h3 style='color:red'>Error: " . $e->getMessage() . "</h3>";
}
?>