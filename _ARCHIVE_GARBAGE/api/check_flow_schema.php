<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "CHECKING subscriber_flow_states\n";
echo "===============================\n\n";

try {
    $stmt = $pdo->query("DESCRIBE subscriber_flow_states");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - {$row['Field']} ({$row['Type']})\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
