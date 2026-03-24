<?php
// api/debug_org_chat.php
require_once 'db_connect.php';

header('Content-Type: text/html; charset=utf-8');

echo "<h1>Debug AI Org Chat History</h1>";

try {
    // 1. Check Conversations
    echo "<h2>1. Recent Conversations (ai_org_conversations)</h2>";
    $stmt = $pdo->query("SELECT * FROM ai_org_conversations ORDER BY created_at DESC LIMIT 20");
    $convs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($convs)) {
        echo "<p style='color:red'>No conversations found in table 'ai_org_conversations'.</p>";
    } else {
        echo "<table border='1' cellpadding='5' style='border-collapse: collapse; width: 100%;'>";
        echo "<tr style='background: #f0f0f0;'><th>ID</th><th>User ID</th><th>Visitor ID</th><th>Property ID</th><th>Title</th><th>Last Msg</th><th>Status</th><th>Created</th></tr>";
        foreach ($convs as $c) {
            echo "<tr>";
            echo "<td>{$c['id']}</td>";
            echo "<td>" . ($c['user_id'] ?? 'NULL') . "</td>";
            echo "<td>{$c['visitor_id']}</td>";
            echo "<td>{$c['property_id']}</td>";
            echo "<td>{$c['title']}</td>";
            echo "<td>" . htmlspecialchars(substr($c['last_message'] ?? '', 0, 50)) . "...</td>";
            echo "<td>{$c['status']}</td>";
            echo "<td>{$c['created_at']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }

    // 2. Check Messages
    echo "<h2>2. Recent Messages (ai_org_messages)</h2>";
    $stmt = $pdo->query("SELECT * FROM ai_org_messages ORDER BY created_at DESC LIMIT 20");
    $msgs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($msgs)) {
        echo "<p style='color:red'>No messages found in table 'ai_org_messages'.</p>";
    } else {
        echo "<table border='1' cellpadding='5' style='border-collapse: collapse; width: 100%;'>";
        echo "<tr style='background: #f0f0f0;'><th>ID</th><th>Conv ID</th><th>Sender</th><th>Message</th><th>Model</th><th>Created</th></tr>";
        foreach ($msgs as $m) {
            echo "<tr>";
            echo "<td>{$m['id']}</td>";
            echo "<td>{$m['conversation_id']}</td>";
            echo "<td>{$m['sender']}</td>";
            echo "<td>" . htmlspecialchars(substr($m['message'] ?? '', 0, 50)) . "...</td>";
            echo "<td>" . ($m['model'] ?? '-') . "</td>";
            echo "<td>{$m['created_at']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }

    // 3. API Simulation
    echo "<h2>3. API API Simulation (action=list_conversations)</h2>";
    $apiUrl = "http://" . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . "/ai_chatbot.php?action=list_conversations&source=org&limit=5";
    echo "<p>Testing API URL: <a href='$apiUrl' target='_blank'>$apiUrl</a></p>";

    // Attempt internal curl if possible, or just link
    echo "<pre>Check the link above to see the JSON response used by the frontend.</pre>";


} catch (Exception $e) {
    echo "<h2 style='color:red'>Error: " . $e->getMessage() . "</h2>";
}
?>